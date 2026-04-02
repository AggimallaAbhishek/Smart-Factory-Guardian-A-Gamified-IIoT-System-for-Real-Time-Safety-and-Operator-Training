import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { RoomPlayerDoc } from "../../features/rooms/types";

interface QueueListProps {
  players: RoomPlayerDoc[];
  activePlayerUid: string | null;
  hostUid: string | null;
}

export function QueueList({ players, activePlayerUid, hostUid }: QueueListProps) {
  return (
    <section className="rounded-xl border border-factory-line bg-factory-panel p-4" data-testid="queue-list">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-factory-muted">Queue</h2>
        <span className="text-xs text-factory-muted">{players.length} players</span>
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
                "flex items-center justify-between rounded-lg border px-3 py-2",
                player.uid === activePlayerUid
                  ? "border-factory-neonCyan/80 bg-factory-neonCyan/10"
                  : "border-factory-line bg-factory-panelSoft"
              )}
              data-testid={"queue-item-" + player.uid}
            >
              <div>
                <p className="text-sm font-semibold text-factory-text">
                  {index + 1}. {player.displayName}
                </p>
                <p className="text-xs text-factory-muted">
                  {player.uid === hostUid ? "Host" : "Player"}
                  {player.isConnected ? " | Connected" : " | Disconnected"}
                </p>
              </div>

              {player.uid === activePlayerUid ? (
                <span className="rounded-full border border-factory-neonCyan/70 px-2 py-1 text-xs text-factory-neonCyan">
                  Active
                </span>
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
