import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { backendMode } from "../firebase/config";
import { useAuthContext } from "../features/auth/AuthContext";
import { createRoom, joinRoom } from "../features/rooms/roomService";

export function HomePage() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!auth.user) {
      setError("Sign in to create a room.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const roomId = await createRoom(auth.user);
      navigate("/room/" + roomId + "/lobby");
    } catch (caughtError) {
      setError(String(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (!auth.user) {
      setError("Sign in to join a room.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const normalized = await joinRoom(roomCode, auth.user);
      navigate("/room/" + normalized + "/lobby");
    } catch (caughtError) {
      setError(String(caughtError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:py-10"
    >
      <section className="rounded-2xl border border-factory-line bg-factory-panel p-5 shadow-neon sm:p-7">
        <p className="text-xs uppercase tracking-[0.22em] text-factory-muted">Smart Factory Guardian</p>
        <h1 className="mt-2 text-2xl font-bold text-factory-text sm:text-3xl">Multiplayer Safety Drill</h1>
        <p className="mt-2 text-sm text-factory-muted">
          Google-authenticated room gameplay with host IoT gateway. Backend mode: <strong>{backendMode}</strong>
        </p>

        <div className="mt-5 rounded-xl border border-factory-line bg-factory-panelSoft p-4">
          {auth.user ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-factory-text" data-testid="auth-user">
                Signed in as <strong>{auth.user.displayName}</strong>
              </p>
              <button
                type="button"
                className="rounded-lg border border-factory-line bg-factory-panel px-3 py-2 text-sm text-factory-text"
                onClick={() => void auth.signOut()}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-factory-muted">Sign in before creating or joining rooms.</p>
              <button
                type="button"
                onClick={() => void auth.signIn()}
                data-testid="google-login"
                className="rounded-lg border border-factory-neonCyan/70 bg-factory-neonCyan/15 px-4 py-2 text-sm font-semibold text-factory-neonCyan"
              >
                {auth.isGoogleAuth ? "Continue with Google" : "Use Demo Login"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            data-testid="create-room"
            disabled={busy || !auth.user}
            onClick={() => void create()}
            className="rounded-xl border border-factory-neonGreen/70 bg-factory-neonGreen/15 px-4 py-3 text-base font-semibold text-factory-neonGreen disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Room
          </button>

          <div className="rounded-xl border border-factory-line bg-factory-panelSoft p-3">
            <label className="text-xs uppercase tracking-[0.16em] text-factory-muted" htmlFor="room-code-input">
              Join Existing Room
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="room-code-input"
                data-testid="join-room-input"
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="ROOMCODE"
                className="w-full rounded-lg border border-factory-line bg-factory-panel px-3 py-2 text-sm uppercase text-factory-text"
              />
              <button
                type="button"
                data-testid="join-room"
                disabled={busy || !auth.user || roomCode.trim().length < 4}
                onClick={() => void join()}
                className="rounded-lg border border-factory-neonCyan/70 bg-factory-neonCyan/15 px-4 py-2 text-sm font-semibold text-factory-neonCyan disabled:cursor-not-allowed disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {auth.error ? <p className="mt-3 text-sm text-red-300">{auth.error}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
      </section>

      <footer className="mt-4 text-center text-xs text-factory-muted">
        <p>60-second turns. Score +10 correct, -5 wrong, 0 miss. Queue rotates until host ends room.</p>
        <p className="mt-1">
          Need setup help? See <Link className="text-factory-neonCyan" to="https://firebase.google.com/docs/web/setup">Firebase docs</Link>
          .
        </p>
      </footer>
    </motion.main>
  );
}
