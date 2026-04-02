import type { PlayerSession } from "@guardian/protocol";
import { STORAGE_KEY } from "./constants";

export function loadSessionHistory(): PlayerSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as { sessions: PlayerSession[] };
    if (!Array.isArray(parsed.sessions)) {
      return [];
    }

    return parsed.sessions;
  } catch (error) {
    console.warn("Failed to parse session history", error);
    return [];
  }
}

export function persistSessionHistory(sessions: PlayerSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions }));
}

export function appendSession(session: PlayerSession, maxItems = 50) {
  const existing = loadSessionHistory();
  const next = [session, ...existing].slice(0, maxItems);
  persistSessionHistory(next);
  return next;
}
