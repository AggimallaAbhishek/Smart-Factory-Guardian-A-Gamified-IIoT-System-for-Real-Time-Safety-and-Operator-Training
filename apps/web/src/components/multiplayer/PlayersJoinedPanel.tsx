import { motion, AnimatePresence } from "framer-motion";
import type { RoomPlayerDoc } from "../../features/rooms/types";
import { TechPanel } from "../ui/TechPanel";

interface PlayersJoinedPanelProps {
  players: RoomPlayerDoc[];
  hostUid: string | null;
}

function shortenUid(uid: string) {
  if (uid.length <= 12) return uid;
  return uid.slice(0, 6) + "..." + uid.slice(-4);
}

export function PlayersJoinedPanel({ players, hostUid }: PlayersJoinedPanelProps) {
  return (
    <TechPanel className="border-tech-green/30 bg-base-900/90" data-testid="players-joined-panel">
      <header className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-tech-green">
          Players Joined
        </h2>
        <span className="rounded border border-tech-green/50 bg-tech-green/10 px-2 py-0.5 font-mono text-xs font-semibold text-tech-green">
          {players.length}
        </span>
      </header>

      {players.length === 0 ? (
        <p className="text-sm text-white/50">No players have joined yet.</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          <AnimatePresence initial={false}>
            {players.map((player, index) => (
              <motion.li
                key={player.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center gap-3 rounded border border-white/10 bg-base-800/60 px-3 py-2"
              >
                {/* Player number badge */}
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-tech-blue/20 font-mono text-xs font-bold text-tech-blue">
                  {index + 1}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {player.displayName}
                    {player.uid === hostUid && (
                      <span className="ml-2 text-[9px] uppercase tracking-wider text-tech-orange">
                        (Host)
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-white/50" title={player.uid}>
                    ID: {shortenUid(player.uid)}
                  </p>
                </div>

                {/* Connection status */}
                <div className="flex-shrink-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      player.isConnected ? "bg-tech-green" : "bg-tech-red"
                    }`}
                    title={player.isConnected ? "Connected" : "Disconnected"}
                  />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </TechPanel>
  );
}
