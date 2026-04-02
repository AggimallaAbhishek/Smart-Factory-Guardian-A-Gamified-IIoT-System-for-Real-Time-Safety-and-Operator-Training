import type { AlertType } from "@guardian/protocol";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  type Firestore,
  type Transaction
} from "firebase/firestore";
import { logger } from "../../lib/logger";
import { TURN_DURATION_SEC } from "./constants";
import { createEntityId, createRoomCode } from "./ids";
import type { RoomRepository } from "./repositoryTypes";
import {
  advanceTurnState,
  publishAlertState,
  submitResponseState,
  transferHostIfStaleState,
  type EngineEvent
} from "./roomEngine";
import { chooseNextTurnOwner, createPlayerDocument, sortPlayersByQueue, startTurn } from "./roomLogic";
import { roomDocSchema, roomPlayerDocSchema } from "./schemas";
import type {
  AuthUser,
  HardwareSource,
  RoomDoc,
  RoomEventDoc,
  RoomPlayerDoc
} from "./types";

interface TxRecord {
  room: RoomDoc;
  players: Record<string, RoomPlayerDoc>;
}

const ROOM_EXISTS_SENTINEL = "ROOM_EXISTS";

function throwIfInvalidRoom(roomId: string, raw: unknown): RoomDoc {
  const parsed = roomDocSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error("Invalid room payload from Firestore", {
      roomId,
      error: parsed.error.flatten()
    });
    throw new Error("Room payload is invalid.");
  }

  return parsed.data;
}

function parsePlayer(raw: unknown, roomId: string, uid: string): RoomPlayerDoc | null {
  const parsed = roomPlayerDocSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn("Invalid player payload from Firestore", {
      roomId,
      uid,
      error: parsed.error.flatten()
    });
    return null;
  }

  return parsed.data;
}

function clonePlayers(players: Record<string, RoomPlayerDoc>) {
  const clone: Record<string, RoomPlayerDoc> = {};

  for (const [uid, player] of Object.entries(players)) {
    clone[uid] = { ...player };
  }

  return clone;
}

function arePlayersEqual(left: RoomPlayerDoc, right: RoomPlayerDoc) {
  return (
    left.uid === right.uid &&
    left.displayName === right.displayName &&
    left.joinedAtMs === right.joinedAtMs &&
    left.queueOrder === right.queueOrder &&
    left.isConnected === right.isConnected &&
    left.totalScore === right.totalScore &&
    left.correctCount === right.correctCount &&
    left.wrongCount === right.wrongCount &&
    left.missCount === right.missCount &&
    left.responseCount === right.responseCount &&
    left.responseTimeTotalMs === right.responseTimeTotalMs &&
    left.avgResponseMs === right.avgResponseMs &&
    left.accuracy === right.accuracy &&
    left.turnsPlayed === right.turnsPlayed
  );
}

export class FirebaseRoomRepository implements RoomRepository {
  constructor(private readonly db: Firestore) {}

  subscribeRoom(roomId: string, callback: (room: RoomDoc | null) => void) {
    const roomRef = doc(this.db, "rooms", roomId);

    return onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }

        try {
          callback(throwIfInvalidRoom(roomId, snapshot.data()));
        } catch (error) {
          logger.error("Room subscription parse error", {
            roomId,
            error: String(error)
          });
          callback(null);
        }
      },
      (error) => {
        logger.error("Room subscription listener failed", {
          roomId,
          error: String(error)
        });
        callback(null);
      }
    );
  }

  subscribePlayers(roomId: string, callback: (players: RoomPlayerDoc[]) => void) {
    const playersQuery = query(
      collection(this.db, "rooms", roomId, "players"),
      orderBy("queueOrder", "asc"),
      orderBy("joinedAtMs", "asc")
    );

    return onSnapshot(
      playersQuery,
      (snapshot) => {
        const players: RoomPlayerDoc[] = [];

        snapshot.forEach((playerDoc) => {
          const parsed = parsePlayer(playerDoc.data(), roomId, playerDoc.id);
          if (parsed) {
            players.push(parsed);
          }
        });

        callback(sortPlayersByQueue(players));
      },
      (error) => {
        logger.error("Player subscription listener failed", {
          roomId,
          error: String(error)
        });
        callback([]);
      }
    );
  }

  async createRoom(user: AuthUser) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidateRoomId = createRoomCode();

      try {
        await runTransaction(this.db, async (transaction) => {
          const roomRef = doc(this.db, "rooms", candidateRoomId);
          const roomSnapshot = await transaction.get(roomRef);
          if (roomSnapshot.exists()) {
            throw new Error(ROOM_EXISTS_SENTINEL);
          }

          const nowMs = Date.now();
          const hostPlayer = createPlayerDocument(user.uid, user.displayName, 0, nowMs);
          const roomDoc: RoomDoc = {
            hostUid: user.uid,
            status: "lobby",
            turnDurationSec: TURN_DURATION_SEC,
            activePlayerUid: null,
            turnStartedAtMs: null,
            turnEndsAtMs: null,
            turnNumber: 0,
            activeAlert: null,
            lastHostHeartbeatMs: nowMs,
            createdAtMs: nowMs,
            endedAtMs: null,
            playerQueue: [user.uid]
          };

          transaction.set(roomRef, roomDoc);
          transaction.set(doc(this.db, "rooms", candidateRoomId, "players", user.uid), hostPlayer);
        });

        logger.info("Firebase room created", {
          roomId: candidateRoomId,
          hostUid: user.uid
        });

        return candidateRoomId;
      } catch (error) {
        if (String(error).includes(ROOM_EXISTS_SENTINEL)) {
          continue;
        }

        logger.error("Unable to create Firebase room", {
          error: String(error)
        });
        throw error;
      }
    }

    throw new Error("Unable to allocate a unique room code.");
  }

  async joinRoom(roomId: string, user: AuthUser) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      if (record.room.status === "ended") {
        throw new Error("Room has already ended.");
      }

      const nowMs = Date.now();
      const existing = record.players[user.uid];

      if (existing) {
        record.players[user.uid] = {
          ...existing,
          displayName: user.displayName,
          isConnected: true
        };
      } else {
        const maxQueueOrder = Math.max(-1, ...Object.values(record.players).map((player) => player.queueOrder));
        record.players[user.uid] = createPlayerDocument(user.uid, user.displayName, maxQueueOrder + 1, nowMs);
      }

      record.room.playerQueue = this.rebuildQueue(record.players);

      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });

    logger.debug("Player joined Firebase room", {
      roomId,
      uid: user.uid
    });
  }

  async setPlayerConnection(roomId: string, uid: string, connected: boolean) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      const player = record.players[uid];
      if (!player) {
        return;
      }

      record.players[uid] = {
        ...player,
        isConnected: connected
      };

      if (!connected && record.room.activePlayerUid === uid && record.room.status === "running") {
        logger.info("Active player disconnected; waiting for host-driven turn advance", {
          roomId,
          uid
        });
      }

      if (!connected && record.room.hostUid === uid) {
        const transfer = transferHostIfStaleState(
          {
            room: record.room,
            players: record.players
          },
          uid,
          Date.now(),
          0
        );

        record.room = transfer.room;
        if (transfer.event) {
          this.writeEvents(transaction, roomId, [transfer.event]);
        }
      }

      record.room.playerQueue = this.rebuildQueue(record.players);
      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async startRoom(roomId: string, actorUid: string) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      if (record.room.hostUid !== actorUid) {
        throw new Error("Only host can start this room.");
      }

      const nextUid = chooseNextTurnOwner(Object.values(record.players), null);
      if (!nextUid) {
        throw new Error("Cannot start room without connected players.");
      }

      const nowMs = Date.now();
      record.room = startTurn(
        {
          ...record.room,
          status: "running"
        },
        nextUid,
        nowMs
      );

      const nextPlayer = record.players[nextUid];
      if (nextPlayer) {
        record.players[nextUid] = {
          ...nextPlayer,
          turnsPlayed: nextPlayer.turnsPlayed + 1
        };
      }

      this.writeEvents(transaction, roomId, [
        {
          type: "room_started",
          actorUid,
          timestampMs: nowMs,
          payload: {
            turnDurationSec: record.room.turnDurationSec
          }
        },
        {
          type: "turn_started",
          actorUid,
          timestampMs: nowMs,
          payload: {
            activePlayerUid: nextUid,
            turnNumber: record.room.turnNumber
          }
        }
      ]);

      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async endRoom(roomId: string, actorUid: string) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      if (record.room.hostUid !== actorUid) {
        throw new Error("Only host can end room.");
      }

      const nowMs = Date.now();
      record.room = {
        ...record.room,
        status: "ended",
        endedAtMs: nowMs,
        activePlayerUid: null,
        activeAlert: null,
        turnStartedAtMs: null,
        turnEndsAtMs: null
      };

      this.writeEvents(transaction, roomId, [
        {
          type: "room_ended",
          actorUid,
          timestampMs: nowMs,
          payload: {}
        }
      ]);

      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async advanceTurn(roomId: string, actorUid: string, reason: "force" | "timeout" | "disconnect") {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      if (record.room.hostUid !== actorUid && reason !== "disconnect") {
        throw new Error("Only host can rotate turn.");
      }

      const advanced = advanceTurnState({ room: record.room, players: record.players }, actorUid, Date.now(), reason);
      record.room = advanced.room;
      record.players = advanced.players;

      this.writeEvents(transaction, roomId, advanced.events);

      if (record.room.activePlayerUid) {
        this.writeEvents(transaction, roomId, [
          {
            type: "turn_started",
            actorUid,
            timestampMs: Date.now(),
            payload: {
              activePlayerUid: record.room.activePlayerUid,
              turnNumber: record.room.turnNumber
            }
          }
        ]);
      }

      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async publishAlert(roomId: string, actorUid: string, alertType: AlertType, source: HardwareSource, timestampMs: number) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      if (record.room.hostUid !== actorUid) {
        throw new Error("Only host can publish alerts.");
      }

      const published = publishAlertState(
        {
          room: record.room,
          players: record.players
        },
        actorUid,
        alertType,
        source,
        timestampMs
      );

      record.room = published.room;
      record.players = published.players;

      this.writeEvents(transaction, roomId, published.events);
      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async submitResponse(roomId: string, actorUid: string, responseType: AlertType, timestampMs: number) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      const responded = submitResponseState(
        {
          room: record.room,
          players: record.players
        },
        actorUid,
        responseType,
        timestampMs
      );

      record.room = responded.room;
      record.players = responded.players;

      this.writeEvents(transaction, roomId, responded.events);
      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async heartbeat(roomId: string, actorUid: string, timestampMs: number) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      if (record.room.hostUid !== actorUid) {
        return;
      }

      record.room = {
        ...record.room,
        lastHostHeartbeatMs: timestampMs
      };

      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  async transferHostIfStale(roomId: string, actorUid: string, timestampMs: number, staleThresholdMs: number) {
    await runTransaction(this.db, async (transaction) => {
      const record = await this.readRoomRecord(transaction, roomId);
      const previousPlayers = clonePlayers(record.players);
      const transfer = transferHostIfStaleState(
        {
          room: record.room,
          players: record.players
        },
        actorUid,
        timestampMs,
        staleThresholdMs
      );

      record.room = transfer.room;
      if (transfer.event) {
        this.writeEvents(transaction, roomId, [transfer.event]);
      }

      this.writeRoomRecord(transaction, roomId, record, previousPlayers);
    });
  }

  private async readRoomRecord(transaction: Transaction, roomId: string): Promise<TxRecord> {
    const roomRef = doc(this.db, "rooms", roomId);
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error("Room was not found.");
    }

    const room = throwIfInvalidRoom(roomId, roomSnapshot.data());

    const players: Record<string, RoomPlayerDoc> = {};
    const playerIds = new Set<string>(room.playerQueue);
    playerIds.add(room.hostUid);

    for (const uid of playerIds) {
      const playerSnapshot = await transaction.get(doc(this.db, "rooms", roomId, "players", uid));
      if (!playerSnapshot.exists()) {
        continue;
      }

      const parsed = parsePlayer(playerSnapshot.data(), roomId, uid);
      if (parsed) {
        players[uid] = parsed;
      }
    }

    return {
      room,
      players
    };
  }

  private writeRoomRecord(
    transaction: Transaction,
    roomId: string,
    record: TxRecord,
    previousPlayers: Record<string, RoomPlayerDoc> | null = null
  ) {
    const roomRef = doc(this.db, "rooms", roomId);
    transaction.set(roomRef, {
      ...record.room,
      playerQueue: this.rebuildQueue(record.players)
    });

    for (const [uid, player] of Object.entries(record.players)) {
      if (previousPlayers) {
        const previous = previousPlayers[uid];
        if (previous && arePlayersEqual(previous, player)) {
          continue;
        }
      }
      transaction.set(doc(this.db, "rooms", roomId, "players", uid), player);
    }
  }

  private writeEvents(transaction: Transaction, roomId: string, events: EngineEvent[]) {
    for (const event of events) {
      const eventId = createEntityId("evt");
      const eventDoc: RoomEventDoc = {
        eventId,
        roomId,
        actorUid: event.actorUid,
        type: event.type,
        timestampMs: event.timestampMs,
        payload: event.payload
      };

      transaction.set(doc(this.db, "rooms", roomId, "events", eventId), eventDoc);
    }
  }

  private rebuildQueue(players: Record<string, RoomPlayerDoc>) {
    return sortPlayersByQueue(Object.values(players)).map((player) => player.uid);
  }
}
