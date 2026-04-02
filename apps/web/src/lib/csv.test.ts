import { describe, expect, it } from "vitest";
import type { PlayerSession } from "@guardian/protocol";
import { serializeSessionsToCsv } from "./csv";

describe("serializeSessionsToCsv", () => {
  it("creates CSV content with expected headers and values", () => {
    const sessions: PlayerSession[] = [
      {
        id: "session-1",
        name: "Asha",
        durationSec: 60,
        startedAtMs: Date.UTC(2026, 0, 1, 10, 0, 0),
        endedAtMs: Date.UTC(2026, 0, 1, 10, 1, 0),
        score: 20,
        accuracy: 66.67,
        avgResponseMs: 410,
        events: [
          {
            eventId: "evt-1",
            alertType: "gas",
            outcome: "correct",
            responseTimeMs: 350
          }
        ]
      }
    ];

    const csv = serializeSessionsToCsv(sessions);

    expect(csv).toContain("session_id,player_name,score,accuracy_percent");
    expect(csv).toContain("session-1,Asha,20,66.67,410,60");
  });
});
