import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TechActionButton } from "../components/ui/TechActionButton";
import { TechInput } from "../components/ui/TechInput";
import { TechPanel } from "../components/ui/TechPanel";
import { TerminalShell } from "../components/ui/TerminalShell";
import { useAuthContext } from "../features/auth/AuthContext";
import { createRoom, joinRoom } from "../features/rooms/roomService";
import { logger } from "../lib/logger";

function CrosshairIcon() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreateRoom = async () => {
    if (!auth.user) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const roomId = await createRoom(auth.user);
      logger.info("Landing create room succeeded", {
        uid: auth.user.uid,
        roomId
      });
      navigate(`/room/${roomId}/lobby`);
    } catch (caughtError) {
      logger.error("Landing create room failed", {
        error: String(caughtError)
      });
      setError(String(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const onJoinRoom = async () => {
    if (!auth.user) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const normalizedRoom = await joinRoom(roomCode, auth.user);
      logger.info("Landing join room succeeded", {
        uid: auth.user.uid,
        roomId: normalizedRoom
      });
      navigate(`/room/${normalizedRoom}/lobby`);
    } catch (caughtError) {
      logger.error("Landing join room failed", {
        error: String(caughtError)
      });
      setError(String(caughtError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TerminalShell frameClassName="max-w-xl">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="my-auto flex flex-col gap-4"
      >
        <div className="text-center">
          <motion.div
            className="mx-auto mb-5 inline-flex text-tech-blue/60"
            animate={{ rotate: 360 }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          >
            <CrosshairIcon />
          </motion.div>
          <h1 className="text-5xl font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">
            Guardian
          </h1>
          <p className="mx-auto mt-2 max-w-lg border-b border-tech-blue/35 pb-3 font-mono text-xs uppercase tracking-[0.36em] text-tech-blue/75">
            Smart Factory Terminal
          </p>
          <p className="mt-3 text-sm text-white/70">
            Real-time IIoT multiplayer drill with role queueing, host signal control, and live safety scoring.
          </p>
        </div>

        <TechPanel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-white/55">Logged in as</p>
            <p data-testid="auth-user" className="font-mono text-sm tracking-[0.12em] text-tech-blue">
              {auth.user?.displayName}
            </p>
          </div>
          <div className="mt-3">
            <TechActionButton tone="neutral" onClick={() => void auth.signOut()} className="w-full text-xs tracking-[0.2em]">
              Sign Out
            </TechActionButton>
          </div>
        </TechPanel>

        <div className="grid gap-3">
          <TechActionButton
            tone="green"
            className="w-full py-4 text-lg tracking-[0.26em]"
            onClick={() => void onCreateRoom()}
            disabled={busy || !auth.user}
            data-testid="create-room"
          >
            Create Room
          </TechActionButton>

          <TechPanel>
            <TechInput
              id="room-code-input"
              label="Join Room"
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ROOMCODE"
              mono
              maxLength={8}
              data-testid="join-room-input"
            />
            <TechActionButton
              tone="blue"
              className="mt-3 w-full"
              onClick={() => void onJoinRoom()}
              disabled={busy || roomCode.trim().length < 4}
              data-testid="join-room"
            >
              Join Room
            </TechActionButton>
          </TechPanel>
        </div>

        {error ? <p className="text-center font-mono text-xs tracking-[0.1em] text-tech-red">{error}</p> : null}
      </motion.section>
    </TerminalShell>
  );
}
