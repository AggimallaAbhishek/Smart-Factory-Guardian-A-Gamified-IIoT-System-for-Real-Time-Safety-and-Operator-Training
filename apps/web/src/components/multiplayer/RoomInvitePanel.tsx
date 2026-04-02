import { useMemo, useState } from "react";
import { buildRoomLobbyUrl, buildRoomQrCodeUrl, buildWhatsAppShareUrl } from "../../features/rooms/share";
import { logger } from "../../lib/logger";
import { TechActionButton } from "../ui/TechActionButton";
import { TechPanel } from "../ui/TechPanel";

interface RoomInvitePanelProps {
  roomId: string;
}

type CopyState = "idle" | "copied" | "failed";

export function RoomInvitePanel({ roomId }: RoomInvitePanelProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const roomLink = useMemo(() => buildRoomLobbyUrl(appOrigin, roomId), [appOrigin, roomId]);
  const qrCodeUrl = useMemo(() => buildRoomQrCodeUrl(roomLink), [roomLink]);
  const whatsappUrl = useMemo(() => buildWhatsAppShareUrl(roomLink, roomId), [roomId, roomLink]);

  const onCopyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(roomLink);
      setCopyState("copied");
      logger.info("Room invite link copied", {
        roomId
      });
    } catch (error) {
      setCopyState("failed");
      logger.warn("Unable to copy room invite link", {
        roomId,
        error: String(error)
      });
    }
  };

  const onShareWhatsApp = () => {
    logger.info("Opening WhatsApp room share", {
      roomId
    });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <TechPanel data-testid="room-invite-panel">
      <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/55">Room Access</h2>
      <p className="mt-1 text-sm text-white/70">Players can scan this QR code or use the WhatsApp link to join this lobby.</p>

      <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <img
          src={qrCodeUrl}
          alt={`QR code for room ${roomId}`}
          className="tech-cut h-40 w-40 border border-tech-blue/45 bg-base-900/80 p-2"
          data-testid="room-qr-image"
          loading="lazy"
        />
        <div className="w-full min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-tech-blue/70">Room Link</p>
          <p className="mt-1 break-all font-mono text-xs text-tech-blue" data-testid="room-share-link">
            {roomLink}
          </p>
          <div className="mt-3 grid gap-2">
            <TechActionButton tone="blue" onClick={() => void onCopyLink()} data-testid="copy-room-link">
              Copy Link
            </TechActionButton>
            <TechActionButton tone="green" onClick={onShareWhatsApp} data-testid="share-whatsapp">
              Share on WhatsApp
            </TechActionButton>
          </div>
        </div>
      </div>

      {copyState === "copied" ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-tech-green">Room link copied.</p>
      ) : null}
      {copyState === "failed" ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-tech-red">Copy failed. Share via WhatsApp button.</p>
      ) : null}
    </TechPanel>
  );
}
