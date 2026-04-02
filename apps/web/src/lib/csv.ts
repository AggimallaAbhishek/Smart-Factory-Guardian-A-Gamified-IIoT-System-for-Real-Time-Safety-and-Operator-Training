import type { PlayerSession } from "@guardian/protocol";

const HEADER = [
  "session_id",
  "player_name",
  "score",
  "accuracy_percent",
  "avg_response_ms",
  "duration_sec",
  "started_at",
  "ended_at",
  "event_count"
];

function escapeCsv(value: string | number) {
  const serialized = String(value);
  if (serialized.includes(",") || serialized.includes("\"") || serialized.includes("\n")) {
    return `\"${serialized.replaceAll("\"", "\"\"")}\"`;
  }

  return serialized;
}

export function serializeSessionsToCsv(sessions: PlayerSession[]) {
  const rows = sessions.map((session) => [
    session.id,
    session.name,
    session.score,
    session.accuracy,
    session.avgResponseMs,
    session.durationSec,
    new Date(session.startedAtMs).toISOString(),
    new Date(session.endedAtMs).toISOString(),
    session.events.length
  ]);

  return [HEADER, ...rows]
    .map((row) => row.map((column) => escapeCsv(column)).join(","))
    .join("\n");
}

export function downloadSessionsCsv(sessions: PlayerSession[]) {
  const content = serializeSessionsToCsv(sessions);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `guardian-sessions-${Date.now()}.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
}
