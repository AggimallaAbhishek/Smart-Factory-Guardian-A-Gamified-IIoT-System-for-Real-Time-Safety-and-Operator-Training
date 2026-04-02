import clsx from "clsx";
import type { RoomPlayerDoc } from "../../features/rooms/types";

interface PlayerCardProps {
  player: RoomPlayerDoc | null;
  isActivePlayer: boolean;
}

function formatMs(value: number) {
  if (value <= 0) {
    return "-";
  }

  return (value / 1000).toFixed(3) + " sec";
}

export function PlayerCard({ player, isActivePlayer }: PlayerCardProps) {
  if (!player) {
    return (
      <section className="rounded-xl border border-factory-line bg-factory-panelSoft p-4">
        <p className="text-sm text-factory-muted">You are not part of this room.</p>
      </section>
    );
  }

  return (
    <section
      className={clsx(
        "rounded-xl border p-4",
        isActivePlayer
          ? "border-factory-neonGreen/80 bg-factory-neonGreen/10"
          : "border-factory-line bg-factory-panelSoft"
      )}
      data-testid="player-card"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-factory-muted">Player</p>
      <p className="mt-1 text-lg font-semibold text-factory-text">{player.displayName}</p>
      <p className="text-sm text-factory-muted">{isActivePlayer ? "Your turn" : "Waiting in queue"}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-factory-line bg-factory-panel px-2 py-2">
          <p className="text-factory-muted">Score</p>
          <p className="font-semibold text-factory-neonGreen">{player.totalScore}</p>
        </div>
        <div className="rounded-lg border border-factory-line bg-factory-panel px-2 py-2">
          <p className="text-factory-muted">Accuracy</p>
          <p className="font-semibold text-factory-neonCyan">{player.accuracy.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-factory-line bg-factory-panel px-2 py-2">
          <p className="text-factory-muted">Avg Response</p>
          <p className="font-semibold text-factory-neonOrange">{formatMs(player.avgResponseMs)}</p>
        </div>
        <div className="rounded-lg border border-factory-line bg-factory-panel px-2 py-2">
          <p className="text-factory-muted">Turns</p>
          <p className="font-semibold text-factory-text">{player.turnsPlayed}</p>
        </div>
      </div>
    </section>
  );
}
