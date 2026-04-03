import type { AlertType } from "@guardian/protocol";
import { logger } from "../../lib/logger";
import {
  advanceTurnState,
  completeTurnTransition as completeTurnTransitionState,
  publishAlertState,
  submitResponseState,
  transferHostIfStaleState,
  type EngineEvent
} from "./roomEngine";
import { createPlayerDocument, chooseNextTurnOwner, sortPlayersByQueue, startTurn } from "./roomLogic";
import { MAX_PLAYERS, ROOM_STORAGE_KEY, TURN_DURATION_SEC } from "./constants";
import type { RoomRepository } from "./repositoryTypes";
import type { AuthUser, HardwareSource, RoomDoc, RoomEventDoc, RoomPlayerDoc } from "./types";

interface DemoRoomRecord {
  room: RoomDoc;
  players: Record<string, RoomPlayerDoc>;
  events: Record<string, RoomEventDoc>;
}

interface DemoState {
  rooms: Record<string, DemoRoomRecord>;
}

const CHANNEL_NAME = "guardian.demo.rooms.channel";

function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function readState(): DemoState {
  const raw = localStorage.getItem(ROOM_STORAGE_KEY);
  if (!raw) {
    return { rooms: {} };
  }

  try {
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.rooms) {
      return { rooms: {} };
    }

    return parsed;
  } catch (error) {
    logger.warn("Failed to parse demo room state", {
      error: String(error)
    });
    return { rooms: {} };
  }
}

function writeState(state: DemoState) {
  localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(state));
}

export class DemoRoomRepository implements RoomRepository {
  private readonly roomListeners = new Map<string, Set<(room: RoomDoc | null) => void>>();
  private readonly playerListeners = new Map<string, Set<(players: RoomPlayerDoc[]) => void>>();
  private readonly channel = new BroadcastChannel(CHANNEL_NAME);
  private readonly storageHandler: (event: StorageEvent) => void;

  constructor() {
    this.channel.onmessage = () => {
      this.emitAll();
    };

    this.storageHandler = (event: StorageEvent) => {
      if (event.key === ROOM_STORAGE_KEY) {
        this.emitAll();
      }
    };

    window.addEventListener("storage", this.storageHandler);
  }

  dispose() {
    window.removeEventListener("storage", this.storageHandler);
    this.channel.close();
  }

  subscribeRoom(roomId: string, callback: (room: RoomDoc | null) => void) {
    const listeners = this.roomListeners.get(roomId) ?? new Set();
    listeners.add(callback);
    this.roomListeners.set(roomId, listeners);

    callback(this.getRoom(roomId)?.room ?? null);

    return () => {
      listeners.delete(callback);
    };
  }

  subscribePlayers(roomId: string, callback: (players: RoomPlayerDoc[]) => void) {
    const listeners = this.playerListeners.get(roomId) ?? new Set();
    listeners.add(callback);
    this.playerListeners.set(roomId, listeners);

    callback(this.getPlayers(roomId));

    return () => {
      listeners.delete(callback);
    };
  }

  async createRoom(user: AuthUser) {
    const state = readState();
    let selectedCode = "";

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = roomCode();
      if (!state.rooms[candidate]) {
        selectedCode = candidate;
        break;
      }
    }

    if (!selectedCode) {
      throw new Error("Unable to generate a unique room code.");
    }

    const nowMs = Date.now();
    const hostPlayer = createPlayerDocument(user.uid, user.displayName, 0, nowMs);

    state.rooms[selectedCode] = {
      room: {
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
        playerQueue: [user.uid],
        nextPlayerUid: null,
        turnTransitionEndsAtMs: null,
        playersCompletedTurn: []
      },
      players: {
        [user.uid]: hostPlayer
      },
      events: {}
    };

    this.commitState(state, "create_room", selectedCode);

    logger.info("Demo room created", {
      roomId: selectedCode,
      hostUid: user.uid
    });

    return selectedCode;
  }

  async joinRoom(roomId: string, user: AuthUser) {
    this.mutateRoom(roomId, (record) => {
      if (record.room.status === "ended") {
        throw new Error("Room has already ended.");
      }

      const existing = record.players[user.uid];
      
      if (!existing) {
        // New player joining - check max player limit
        const currentPlayerCount = Object.keys(record.players).length;
        if (currentPlayerCount >= MAX_PLAYERS) {
          throw new Error(`Room is full. Maximum ${MAX_PLAYERS} players allowed.`);
        }
      }

      if (existing) {
        record.players[user.uid] = {
          ...existing,
          displayName: user.displayName,
          isConnected: true
        };
      } else {
        const queueOrder = Object.keys(record.players).length;
        record.players[user.uid] = createPlayerDocument(user.uid, user.displayName, queueOrder, Date.now());
        record.room.playerQueue = [...record.room.playerQueue, user.uid];
      }
    }, "join_room");
  }

  async setPlayerConnection(roomId: string, uid: string, connected: boolean) {
    this.mutateRoom(roomId, (record) => {
      const player = record.players[uid];
      if (!player) {
        return;
      }

      record.players[uid] = {
        ...player,
        isConnected: connected
      };

      if (!connected && record.room.activePlayerUid === uid && record.room.status === "running") {
        const advanced = advanceTurnState({ room: record.room, players: record.players }, uid, Date.now(), "disconnect");
        record.room = advanced.room;
        record.players = advanced.players;
        this.persistEvents(record, roomId, advanced.events);
      }

      if (!connected && record.room.hostUid === uid) {
        const transfer = transferHostIfStaleState(
          { room: record.room, players: record.players },
          uid,
          Date.now(),
          0
        );

        record.room = transfer.room;
        if (transfer.event) {
          this.persistEvents(record, roomId, [transfer.event]);
        }
      }
    }, connected ? "player_connected" : "player_disconnected");
  }

  async startRoom(roomId: string, actorUid: string) {
    this.mutateRoom(roomId, (record) => {
      if (record.room.hostUid !== actorUid) {
        throw new Error("Only host can start this room.");
      }

      const nextUid = chooseNextTurnOwner(Object.values(record.players), null);
      if (!nextUid) {
        throw new Error("Cannot start room without at least one connected player.");
      }

      record.room = startTurn(
        {
          ...record.room,
          status: "running"
        },
        nextUid,
        Date.now()
      );

      const player = record.players[nextUid];
      if (player) {
        record.players[nextUid] = {
          ...player,
          turnsPlayed: player.turnsPlayed + 1
        };
      }

      this.persistEvents(record, roomId, [
        {
          type: "room_started",
          actorUid,
          timestampMs: Date.now(),
          payload: {
            turnDurationSec: record.room.turnDurationSec
          }
        },
        {
          type: "turn_started",
          actorUid,
          timestampMs: Date.now(),
          payload: {
            activePlayerUid: nextUid,
            turnNumber: record.room.turnNumber
          }
        }
      ]);
    }, "start_room");
  }

  async endRoom(roomId: string, actorUid: string) {
    this.mutateRoom(roomId, (record) => {
      if (record.room.hostUid !== actorUid) {
        throw new Error("Only host can end room.");
      }

      record.room = {
        ...record.room,
        status: "ended",
        endedAtMs: Date.now(),
        activePlayerUid: null,
        activeAlert: null,
        turnStartedAtMs: null,
        turnEndsAtMs: null
      };

      this.persistEvents(record, roomId, [
        {
          type: "room_ended",
          actorUid,
          timestampMs: Date.now(),
          payload: {}
        }
      ]);
    }, "end_room");
  }

  async advanceTurn(roomId: string, actorUid: string, reason: "force" | "timeout" | "disconnect") {
    this.mutateRoom(roomId, (record) => {
      if (record.room.hostUid !== actorUid && reason !== "disconnect") {
        throw new Error("Only host can rotate turn.");
      }

      const advanced = advanceTurnState({ room: record.room, players: record.players }, actorUid, Date.now(), reason);
      record.room = advanced.room;
      record.players = advanced.players;

      this.persistEvents(record, roomId, advanced.events);

      // Turn transition started - don't immediately start turn
      // Host will need to call completeTurnTransition after countdown
    }, "advance_turn");
  }

  async completeTurnTransition(roomId: string, actorUid: string) {
    this.mutateRoom(roomId, (record) => {
      if (record.room.hostUid !== actorUid) {
        throw new Error("Only host can complete turn transition.");
      }

      if (!record.room.nextPlayerUid || !record.room.turnTransitionEndsAtMs) {
        // No transition in progress
        return;
      }

      const transitioned = completeTurnTransitionState(
        { room: record.room, players: record.players },
        actorUid,
        Date.now()
      );

      record.room = transitioned.room;
      record.players = transitioned.players;

      this.persistEvents(record, roomId, transitioned.events);
    }, "complete_turn_transition");
  }

  async publishAlert(roomId: string, actorUid: string, alertType: AlertType, source: HardwareSource, timestampMs: number) {
    this.mutateRoom(roomId, (record) => {
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
      this.persistEvents(record, roomId, published.events);
    }, "publish_alert");
  }

  async submitResponse(roomId: string, actorUid: string, responseType: AlertType, timestampMs: number) {
    this.mutateRoom(roomId, (record) => {
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
      this.persistEvents(record, roomId, responded.events);
    }, "submit_response");
  }

  async heartbeat(roomId: string, actorUid: string, timestampMs: number) {
    this.mutateRoom(roomId, (record) => {
      if (record.room.hostUid !== actorUid) {
        return;
      }

      record.room = {
        ...record.room,
        lastHostHeartbeatMs: timestampMs
      };
    }, "host_heartbeat");
  }

  async transferHostIfStale(roomId: string, actorUid: string, timestampMs: number, staleThresholdMs: number) {
    this.mutateRoom(roomId, (record) => {
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
        this.persistEvents(record, roomId, [transfer.event]);
      }
    }, "transfer_host");
  }

  private mutateRoom(roomId: string, mutator: (record: DemoRoomRecord) => void, reason: string) {
    const state = readState();
    const record = state.rooms[roomId];
    if (!record) {
      throw new Error("Room not found. In demo mode, rooms are only visible in the browser where they were created.");
    }

    mutator(record);
    state.rooms[roomId] = record;

    this.commitState(state, reason, roomId);
  }

  private persistEvents(record: DemoRoomRecord, roomId: string, events: EngineEvent[]) {
    for (const event of events) {
      const eventId = randomId("evt");
      record.events[eventId] = {
        eventId,
        roomId,
        actorUid: event.actorUid,
        type: event.type,
        timestampMs: event.timestampMs,
        payload: event.payload
      };
    }
  }

  private commitState(state: DemoState, reason: string, roomId: string) {
    writeState(state);
    this.channel.postMessage({ reason, roomId, timestampMs: Date.now() });
    this.emitRoom(roomId);
    this.emitPlayers(roomId);

    logger.debug("Demo room state committed", {
      reason,
      roomId
    });
  }

  private emitAll() {
    for (const roomId of this.roomListeners.keys()) {
      this.emitRoom(roomId);
    }

    for (const roomId of this.playerListeners.keys()) {
      this.emitPlayers(roomId);
    }
  }

  private emitRoom(roomId: string) {
    const listeners = this.roomListeners.get(roomId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const room = this.getRoom(roomId)?.room ?? null;
    for (const listener of listeners) {
      listener(room);
    }
  }

  private emitPlayers(roomId: string) {
    const listeners = this.playerListeners.get(roomId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const players = this.getPlayers(roomId);
    for (const listener of listeners) {
      listener(players);
    }
  }

  private getRoom(roomId: string) {
    return readState().rooms[roomId] ?? null;
  }

  private getPlayers(roomId: string) {
    const room = readState().rooms[roomId];
    if (!room) {
      return [];
    }

    return sortPlayersByQueue(Object.values(room.players));
  }
}
