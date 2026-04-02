import { STORAGE_KEY } from "./constants";
export function loadSessionHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.sessions)) {
            return [];
        }
        return parsed.sessions;
    }
    catch (error) {
        console.warn("Failed to parse session history", error);
        return [];
    }
}
export function persistSessionHistory(sessions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, sessions }));
}
export function appendSession(session, maxItems = 50) {
    const existing = loadSessionHistory();
    const next = [session, ...existing].slice(0, maxItems);
    persistSessionHistory(next);
    return next;
}
