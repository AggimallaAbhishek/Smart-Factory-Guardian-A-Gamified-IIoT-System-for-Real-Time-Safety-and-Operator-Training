import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { computeLeaderboardEntries } from "../features/rooms/roomLogic";
import { RoomContext } from "../features/rooms/RoomContext";
import { publishAlert } from "../features/rooms/alertService";
import { useAuthContext } from "../features/auth/AuthContext";
import { logger } from "../lib/logger";
import { advanceTurn, heartbeat, transferHostIfStale, completeTurnTransition } from "../features/rooms/queueService";
import { submitResponse } from "../features/rooms/responseService";
import {
  endRoom,
  joinRoom,
  setPlayerConnection,
  startRoom,
  subscribePlayers,
  subscribeRoom
} from "../features/rooms/roomService";
import { HOST_HEARTBEAT_INTERVAL_MS, HOST_STALE_THRESHOLD_MS, ALERT_TIMEOUT_MS } from "../features/rooms/constants";
import type { RoomDoc, RoomPlayerDoc } from "../features/rooms/types";
import { TerminalShell } from "../components/ui/TerminalShell";

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

  const timeoutLockRef = useRef(false);
  const disconnectLockRef = useRef(false);
  const alertTimeoutRef = useRef(false);
  const transitionLockRef = useRef(false);

  useEffect(() => {
    const user = auth.user;
    if (!user || roomId.length < 4) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    const bootstrap = async () => {
      try {
        await joinRoom(roomId, user);
        await setPlayerConnection(roomId, user.uid, true);
        logger.info("Room bootstrap completed", {
          roomId,
          uid: user.uid
        });
      } catch (caughtError) {
        logger.error("Room bootstrap failed", {
          roomId,
          uid: user.uid,
          error: String(caughtError)
        });
        if (mounted) {
          setError(String(caughtError));
        }
      }
    };

    void bootstrap();

    const unsubscribeRoom = subscribeRoom(roomId, (nextRoom) => {
      if (!mounted) {
        return;
      }

      setRoom(nextRoom);
      setLoading(false);
    });

    const unsubscribePlayers = subscribePlayers(roomId, (nextPlayers) => {
      if (!mounted) {
        return;
      }
      setPlayers(nextPlayers);
    });

    return () => {
      mounted = false;
      unsubscribeRoom();
      unsubscribePlayers();
      void setPlayerConnection(roomId, user.uid, false).catch((caughtError) => {
        logger.warn("Unable to mark player disconnected on unmount", {
          roomId,
          uid: user.uid,
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

    const timerId = window.setInterval(() => {
      const nowMs = Date.now();
      if (room.hostUid === user.uid) {
        void heartbeat(roomId, user.uid, nowMs).catch((caughtError) => {
          logger.warn("Host heartbeat failed", {
            roomId,
            uid: user.uid,
            error: String(caughtError)
          });
        });
        return;
      }

      void transferHostIfStale(roomId, user.uid, nowMs, HOST_STALE_THRESHOLD_MS).catch((caughtError) => {
        logger.warn("Host transfer probe failed", {
          roomId,
          uid: user.uid,
          error: String(caughtError)
        });
      });
    }, HOST_HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [auth.user, room, roomId]);

  useEffect(() => {
    const user = auth.user;
    if (!user || !room || room.status !== "running" || room.hostUid !== user.uid || !room.turnEndsAtMs) {
      return;
    }

    const timerId = window.setInterval(() => {
      if (timeoutLockRef.current) {
        return;
      }

      const nowMs = Date.now();
      if (!room.turnEndsAtMs || nowMs < room.turnEndsAtMs) {
        return;
      }

      timeoutLockRef.current = true;
      logger.debug("Turn timeout reached, advancing queue", {
        roomId,
        uid: user.uid,
        turnEndsAtMs: room.turnEndsAtMs
      });

      void advanceTurn(roomId, user.uid, "timeout")
        .catch((caughtError) => {
          logger.warn("Timeout turn advance failed", {
            roomId,
            uid: user.uid,
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
      window.clearInterval(timerId);
    };
  }, [auth.user, room, roomId]);

  // Host: Auto-complete turn transition after countdown
  useEffect(() => {
    const user = auth.user;
    if (!user || !room || room.status !== "running" || room.hostUid !== user.uid || !room.turnTransitionEndsAtMs) {
      return;
    }

    const timerId = window.setInterval(() => {
      if (transitionLockRef.current) {
        return;
      }

      const nowMs = Date.now();
      if (!room.turnTransitionEndsAtMs || nowMs < room.turnTransitionEndsAtMs) {
        return;
      }

      transitionLockRef.current = true;
      logger.debug("Turn transition countdown completed, starting next turn", {
        roomId,
        uid: user.uid,
        nextPlayerUid: room.nextPlayerUid
      });

      void completeTurnTransition(roomId, user.uid)
        .catch((caughtError) => {
          logger.warn("Turn transition completion failed", {
            roomId,
            uid: user.uid,
            error: String(caughtError)
          });
        })
        .finally(() => {
          window.setTimeout(() => {
            transitionLockRef.current = false;
          }, 350);
        });
    }, 250);

    return () => {
      window.clearInterval(timerId);
    };
  }, [auth.user, room, roomId]);

  useEffect(() => {
    const user = auth.user;
    if (!user || !room || room.status !== "running" || room.hostUid !== user.uid || !room.activePlayerUid) {
      return;
    }

    const activePlayer = players.find((player) => player.uid === room.activePlayerUid);
    if (!activePlayer || activePlayer.isConnected || disconnectLockRef.current) {
      return;
    }

    disconnectLockRef.current = true;
    logger.info("Active player disconnected, rotating turn", {
      roomId,
      activePlayerUid: activePlayer.uid,
      hostUid: user.uid
    });

    void advanceTurn(roomId, user.uid, "disconnect")
      .catch((caughtError) => {
        logger.warn("Disconnect turn advance failed", {
          roomId,
          hostUid: user.uid,
          activePlayerUid: activePlayer.uid,
          error: String(caughtError)
        });
      })
      .finally(() => {
        window.setTimeout(() => {
          disconnectLockRef.current = false;
        }, 350);
      });
  }, [auth.user, players, room, roomId]);

  // Auto-dismiss alert after 6 seconds (mark as miss)
  useEffect(() => {
    const user = auth.user;
    if (!user || !room || room.status !== "running" || room.hostUid !== user.uid || !room.activeAlert) {
      alertTimeoutRef.current = false;
      return;
    }

    const alertIssuedAt = room.activeAlert.issuedAtMs;
    const timeRemaining = alertIssuedAt + ALERT_TIMEOUT_MS - Date.now();

    if (timeRemaining <= 0) {
      // Already expired, trigger new alert cycle
      return;
    }

    const timerId = window.setTimeout(() => {
      if (alertTimeoutRef.current) {
        return;
      }

      alertTimeoutRef.current = true;
      logger.debug("Alert timeout reached, marking as miss", {
        roomId,
        alertId: room.activeAlert?.alertId,
        activePlayerUid: room.activePlayerUid
      });

      // Publishing a new alert will automatically mark the current one as missed
      // The next hardware signal will handle this naturally
      alertTimeoutRef.current = false;
    }, timeRemaining);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [auth.user, room, roomId]);

  const myPlayer = useMemo(() => {
    if (!auth.user) {
      return null;
    }

    return players.find((player) => player.uid === auth.user?.uid) ?? null;
  }, [auth.user, players]);

  // Exclude host from leaderboard - they don't play
  const leaderboard = useMemo(() => computeLeaderboardEntries(players, room?.hostUid), [players, room?.hostUid]);
  const isHost = Boolean(auth.user && room && room.hostUid === auth.user.uid);
  const isActivePlayer = Boolean(auth.user && room && room.activePlayerUid === auth.user.uid);

  const start = useCallback(async () => {
    if (!auth.user) {
      return;
    }

    try {
      setError(null);
      logger.info("Host requested room start", {
        roomId,
        uid: auth.user.uid
      });
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
      logger.info("Host requested room end", {
        roomId,
        uid: auth.user.uid
      });
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
      logger.info("Host requested force-next turn", {
        roomId,
        uid: auth.user.uid
      });
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

  if (loading) {
    return (
      <TerminalShell frameClassName="max-w-2xl">
        <div className="my-auto text-center font-mono text-sm uppercase tracking-[0.22em] text-tech-blue/70">
          Connecting to room...
        </div>
      </TerminalShell>
    );
  }

  if (!room) {
    return (
      <TerminalShell frameClassName="max-w-2xl">
        <div className="my-auto text-center">
          <h1 className="text-2xl font-bold uppercase tracking-[0.2em] text-white">Room Not Found</h1>
          <p className="mt-3 text-sm text-white/70">Check the room code and try again.</p>
          <Link
            to="/"
            className="mt-5 inline-block border border-tech-blue bg-tech-blue/10 px-4 py-2 font-bold uppercase tracking-[0.2em] text-tech-blue"
          >
            Back Home
          </Link>
        </div>
      </TerminalShell>
    );
  }

  return (
    <RoomContext.Provider value={contextValue}>
      <TerminalShell frameClassName="max-w-6xl">
        <header className="tech-cut-reverse mb-3 border border-white/10 bg-base-800/60 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">Room</p>
              <p className="font-mono text-xl font-bold tracking-[0.2em] text-tech-blue" data-testid="room-id">
                {roomId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">Host</p>
              <p className="font-mono text-sm uppercase tracking-[0.18em] text-white">
                {room.hostUid === auth.user?.uid ? "You" : room.hostUid}
              </p>
            </div>
          </div>
          {error ? <p className="mt-2 text-xs font-mono tracking-[0.12em] text-tech-red">{error}</p> : null}
        </header>

        <Outlet />
      </TerminalShell>
    </RoomContext.Provider>
  );
}
