import { describe, expect, test } from "vitest";
import { buildRoomLobbyUrl, buildRoomQrCodeUrl, buildWhatsAppShareUrl } from "./share";

describe("room share helpers", () => {
  test("builds room lobby url with normalized code", () => {
    const url = buildRoomLobbyUrl("https://guardian.example/", "ab12");
    expect(url).toBe("https://guardian.example/room/AB12/lobby");
  });

  test("builds qr image url with encoded payload", () => {
    const roomUrl = "https://guardian.example/room/AB12/lobby";
    const qrUrl = buildRoomQrCodeUrl(roomUrl, 300);
    expect(qrUrl).toBe(
      "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fguardian.example%2Froom%2FAB12%2Flobby"
    );
  });

  test("builds whatsapp share url with room message", () => {
    const roomUrl = "https://guardian.example/room/AB12/lobby";
    const shareUrl = buildWhatsAppShareUrl(roomUrl, "ab12");
    expect(shareUrl).toBe(
      "https://wa.me/?text=Join%20my%20Smart%20Factory%20Guardian%20room%20AB12%3A%20https%3A%2F%2Fguardian.example%2Froom%2FAB12%2Flobby"
    );
  });
});
