import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { RoomPlayerDoc } from "../../features/rooms/types";
import { TechPanel } from "../ui/TechPanel";

interface QueueListProps {
  players: RoomPlayerDoc[];
  activePlayerUid: string | null;
  hostUid: string | null;
}

export function QueueList({ players, activePlayerUid, hostUid }: QueueListProps) {
  return (
    <TechPanel data-testid="queue-list">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/55">Queue</h2>
        <span className="font-mono text-xs text-white/55">{players.length} players</span>
      </header>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {players.map((player, index) => (
            <motion.li
              layout
              key={player.uid}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={clsx(
                "tech-cut-reverse flex items-center justify-between border px-3 py-2",
                player.uid === activePlayerUid
                  ? "border-tech-blue/80 bg-tech-blue/10 shadow-neon"
                  : "border-white/10 bg-base-700/70"
              )}
              data-testid={"queue-item-" + player.uid}
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
                  {index + 1}. {player.displayName}
                </p>
                <p className="font-mono text-xs text-white/60">
                  {player.uid === hostUid ? "Host" : "Player"}
                  {player.isConnected ? " | Connected" : " | Disconnected"}
                </p>
              </div>

              {player.uid === activePlayerUid ? (
                <span className="border border-tech-blue/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-tech-blue">
                  Active
                </span>
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </TechPanel>
  );
}
