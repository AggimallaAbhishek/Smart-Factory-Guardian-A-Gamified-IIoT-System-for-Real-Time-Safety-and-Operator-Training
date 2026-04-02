import clsx from "clsx";
import type { RoomPlayerDoc } from "../../features/rooms/types";
import { TechPanel } from "../ui/TechPanel";

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
      <TechPanel>
        <p className="text-sm text-white/70">You are not part of this room.</p>
      </TechPanel>
    );
  }

  return (
    <TechPanel
      className={clsx(
        "p-4",
        isActivePlayer
          ? "border-tech-green/80 bg-tech-green/12 shadow-[0_0_24px_rgba(0,255,157,0.2)]"
          : "border-white/10 bg-base-800/70"
      )}
      data-testid="player-card"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/55">Player</p>
      <p className="mt-1 text-lg font-semibold uppercase tracking-[0.08em] text-white">{player.displayName}</p>
      <p className="text-sm text-white/70">{isActivePlayer ? "Your turn" : "Waiting in queue"}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="tech-cut-reverse border border-white/10 bg-base-700/70 px-2 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">Score</p>
          <p className="font-semibold text-tech-green">{player.totalScore}</p>
        </div>
        <div className="tech-cut-reverse border border-white/10 bg-base-700/70 px-2 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">Accuracy</p>
          <p className="font-semibold text-tech-blue">{player.accuracy.toFixed(1)}%</p>
        </div>
        <div className="tech-cut-reverse border border-white/10 bg-base-700/70 px-2 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">Avg Response</p>
          <p className="font-semibold text-tech-orange">{formatMs(player.avgResponseMs)}</p>
        </div>
        <div className="tech-cut-reverse border border-white/10 bg-base-700/70 px-2 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">Turns</p>
          <p className="font-semibold text-white">{player.turnsPlayed}</p>
        </div>
      </div>
    </TechPanel>
  );
}
