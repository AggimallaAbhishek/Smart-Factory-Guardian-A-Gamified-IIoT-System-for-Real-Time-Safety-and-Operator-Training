export function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function createEntityId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
