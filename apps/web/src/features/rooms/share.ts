import { roomCodeSchema } from "./schemas";

const QR_CODE_ENDPOINT = "https://api.qrserver.com/v1/create-qr-code/";
const DEFAULT_QR_SIZE = 240;

function normalizeOrigin(origin: string) {
  const trimmed = origin.trim();
  if (!trimmed) {
    throw new Error("App origin is required to build room share links.");
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function buildRoomLobbyUrl(origin: string, roomId: string) {
  const normalizedRoomId = roomCodeSchema.parse(roomId);
  return `${normalizeOrigin(origin)}/room/${normalizedRoomId}/lobby`;
}

export function buildRoomQrCodeUrl(roomUrl: string, size = DEFAULT_QR_SIZE) {
  const safeSize = Number.isFinite(size) && size >= 128 && size <= 1024 ? Math.round(size) : DEFAULT_QR_SIZE;
  const encodedUrl = encodeURIComponent(roomUrl);
  return `${QR_CODE_ENDPOINT}?size=${safeSize}x${safeSize}&data=${encodedUrl}`;
}

export function buildWhatsAppShareUrl(roomUrl: string, roomId: string) {
  const normalizedRoomId = roomCodeSchema.parse(roomId);
  const shareMessage = `Join my Smart Factory Guardian room ${normalizedRoomId}: ${roomUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
}
