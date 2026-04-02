import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { computeLeaderboardEntries } from "../features/rooms/roomLogic";
import { RoomContext } from "../features/rooms/RoomContext";
import { publishAlert } from "../features/rooms/alertService";
import { useAuthContext } from "../features/auth/AuthContext";
import { logger } from "../lib/logger";
import { advanceTurn, heartbeat, transferHostIfStale } from "../features/rooms/queueService";
import { submitResponse } from "../features/rooms/responseService";
import {
  endRoom,
  setPlayerConnection,
  startRoom,
  subscribePlayers,
  subscribeRoom
} from "../features/rooms/roomService";
import { HOST_HEARTBEAT_INTERVAL_MS, HOST_STALE_THRESHOLD_MS } from "../features/rooms/constants";
import type { RoomDoc, RoomPlayerDoc } from "../features/rooms/types";

const STATUS_ROUTE: Record<RoomDoc["status"], string> = {
  lobby: "lobby",
  running: "game",
  ended: "result"
};

export function RoomLayout() {
  const params = useParams();
  const roomId = String(params.roomId ?? "").toUpperCase();
  const auth = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [players, setPlayers] = useState<RoomPlayerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const joinedRef = useRef(false);
  const timeoutLockRef = useRef(false);

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      navigate("/", { replace: true });
    }
  }, [auth.loading, auth.user, navigate]);

  useEffect(() => {
    const user = auth.user;
    if (!user || roomId.length < 4) {
      return;
    }

    let alive = true;
    const unsubscribeRoom = subscribeRoom(roomId, (nextRoom) => {
      if (!alive) {
        return;
      }

      setRoom(nextRoom);
      setLoading(false);
    });

    const unsubscribePlayers = subscribePlayers(roomId, (nextPlayers) => {
      if (!alive) {
        return;
      }

      setPlayers(nextPlayers);
    });

    if (!joinedRef.current) {
      joinedRef.current = true;
      void setPlayerConnection(roomId, user.uid, true).catch((caughtError) => {
        logger.warn("setPlayerConnection failed on mount", {
          roomId,
          error: String(caughtError)
        });
      });
    }

    return () => {
      alive = false;
      unsubscribeRoom();
      unsubscribePlayers();
      void setPlayerConnection(roomId, user.uid, false).catch((caughtError) => {
        logger.warn("Unable to mark player disconnected on unmount", {
          roomId,
          error: String(caughtError)
        });
      });
    };
  }, [auth.user, roomId]);

  useEffect(() => {
    if (!room) {
      return;
    }

    const expected = STATUS_ROUTE[room.status];
    if (!location.pathname.endsWith("/" + expected)) {
      navigate(expected, { replace: true });
    }
  }, [location.pathname, navigate, room]);

  useEffect(() => {
    const user = auth.user;
    if (!user || !room) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!room) {
        return;
      }

      const nowMs = Date.now();
      if (room.hostUid === user.uid) {
        void heartbeat(roomId, user.uid, nowMs).catch((caughtError) => {
          logger.warn("Host heartbeat failed", {
            roomId,
            error: String(caughtError)
          });
        });
      } else {
        void transferHostIfStale(roomId, user.uid, nowMs, HOST_STALE_THRESHOLD_MS).catch((caughtError) => {
          logger.warn("Host transfer probe failed", {
            roomId,
            error: String(caughtError)
          });
        });
      }
    }, HOST_HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [auth.user, room, roomId]);

  useEffect(() => {
    const user = auth.user;
    if (!user || !room || room.status !== "running" || room.hostUid !== user.uid || !room.turnEndsAtMs) {
      return;
    }

    const timer = window.setInterval(() => {
      if (timeoutLockRef.current) {
        return;
      }

      const nowMs = Date.now();
      if (!room.turnEndsAtMs || nowMs < room.turnEndsAtMs) {
        return;
      }

      timeoutLockRef.current = true;
      void advanceTurn(roomId, user.uid, "timeout")
        .catch((caughtError) => {
          logger.warn("Timeout turn advance failed", {
            roomId,
            error: String(caughtError)
          });
        })
        .finally(() => {
          window.setTimeout(() => {
            timeoutLockRef.current = false;
          }, 350);
        });
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [auth.user, room, roomId]);

  const myPlayer = useMemo(() => {
    if (!auth.user) {
      return null;
    }

    return players.find((player) => player.uid === auth.user?.uid) ?? null;
  }, [auth.user, players]);

  const leaderboard = useMemo(() => computeLeaderboardEntries(players), [players]);
  const isHost = Boolean(auth.user && room && room.hostUid === auth.user.uid);
  const isActivePlayer = Boolean(auth.user && room && room.activePlayerUid === auth.user.uid);

  const start = useCallback(async () => {
    if (!auth.user) {
      return;
    }

    try {
      setError(null);
      await startRoom(roomId, auth.user.uid);
    } catch (caughtError) {
      setError(String(caughtError));
    }
  }, [auth.user, roomId]);

  const end = useCallback(async () => {
    if (!auth.user) {
      return;
    }

    try {
      setError(null);
      await endRoom(roomId, auth.user.uid);
    } catch (caughtError) {
      setError(String(caughtError));
    }
  }, [auth.user, roomId]);

  const forceNext = useCallback(async () => {
    if (!auth.user) {
      return;
    }

    try {
      setError(null);
      await advanceTurn(roomId, auth.user.uid, "force");
    } catch (caughtError) {
      setError(String(caughtError));
    }
  }, [auth.user, roomId]);

  const publish = useCallback(
    async (alertType: "gas" | "temperature" | "maintenance", source: "bridge" | "mock", timestampMs: number) => {
      if (!auth.user) {
        return;
      }

      try {
        setError(null);
        await publishAlert(roomId, auth.user.uid, alertType, source, timestampMs);
      } catch (caughtError) {
        setError(String(caughtError));
      }
    },
    [auth.user, roomId]
  );

  const respond = useCallback(
    async (responseType: "gas" | "temperature" | "maintenance", timestampMs: number) => {
      if (!auth.user || !room) {
        return {
          accepted: false,
          reason: "unauthorized"
        };
      }

      try {
        setError(null);
        return await submitResponse(roomId, auth.user.uid, room, responseType, timestampMs);
      } catch (caughtError) {
        setError(String(caughtError));
        return {
          accepted: false,
          reason: "error"
        };
      }
    },
    [auth.user, room, roomId]
  );

  const contextValue = useMemo(
    () => ({
      roomId,
      room,
      players,
      leaderboard,
      myPlayer,
      loading,
      error,
      isHost,
      isActivePlayer,
      startRoom: start,
      endRoom: end,
      forceNextTurn: forceNext,
      publishAlert: publish,
      submitResponse: respond
    }),
    [
      end,
      error,
      forceNext,
      isActivePlayer,
      isHost,
      leaderboard,
      loading,
      myPlayer,
      players,
      publish,
      respond,
      room,
      roomId,
      start
    ]
  );

  if (auth.loading || loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 text-factory-muted">
        Connecting to room...
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-2xl font-bold text-factory-text">Room not found</h1>
        <p className="text-sm text-factory-muted">Check the room code and try again.</p>
        <Link to="/" className="rounded-lg border border-factory-line bg-factory-panel px-4 py-2 text-sm text-factory-text">
          Go Home
        </Link>
      </main>
    );
  }

  return (
    <RoomContext.Provider value={contextValue}>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-4 sm:py-6">
        <header className="mb-3 rounded-xl border border-factory-line bg-factory-panel p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-factory-muted">Room</p>
              <p className="text-lg font-bold text-factory-text" data-testid="room-id">
                {roomId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-factory-muted">Host</p>
              <p className="text-sm text-factory-neonCyan">{room.hostUid === auth.user?.uid ? "You" : room.hostUid}</p>
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        </header>

        <Outlet />
      </main>
    </RoomContext.Provider>
  );
}
