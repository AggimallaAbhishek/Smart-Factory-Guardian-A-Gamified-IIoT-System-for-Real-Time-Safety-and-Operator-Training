import { motion } from "framer-motion";

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
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="score-board">
      <motion.article
        key={score}
        initial={{ scale: 0.95, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-factory-line bg-factory-panelSoft p-4"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-factory-muted">Score</p>
        <p className="mt-2 text-3xl font-bold text-factory-neonGreen" data-testid="score-value">
          {score}
        </p>
      </motion.article>

      <article className="rounded-xl border border-factory-line bg-factory-panelSoft p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-factory-muted">Accuracy</p>
        <p className="mt-2 text-3xl font-bold text-factory-neonCyan" data-testid="accuracy-value">
          {accuracy.toFixed(1)}%
        </p>
      </article>

      <article className="rounded-xl border border-factory-line bg-factory-panelSoft p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-factory-muted">Avg Response</p>
        <p className="mt-2 text-2xl font-bold text-factory-neonOrange" data-testid="avg-response-value">
          {formatMs(avgResponseMs)}
        </p>
      </article>
    </section>
  );
}
