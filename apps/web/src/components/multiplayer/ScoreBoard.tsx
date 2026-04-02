import { TechStatCard } from "../ui/TechStatCard";

interface ScoreBoardProps {
  score: number;
  accuracy: number;
  avgResponseMs: number;
}

function formatMs(value: number) {
  if (value <= 0) {
    return "-";
  }

  return (value / 1000).toFixed(3) + " sec";
}

export function ScoreBoard({ score, accuracy, avgResponseMs }: ScoreBoardProps) {
  return (
    <section className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="score-board">
      <TechStatCard label="Score" value={score} color="green" className="text-3xl" valueTestId="score-value" />
      <TechStatCard label="Accuracy" value={`${accuracy.toFixed(1)}%`} color="blue" valueTestId="accuracy-value" />
      <TechStatCard label="Avg Response" value={formatMs(avgResponseMs)} color="orange" valueTestId="avg-response-value" />
    </section>
  );
}
