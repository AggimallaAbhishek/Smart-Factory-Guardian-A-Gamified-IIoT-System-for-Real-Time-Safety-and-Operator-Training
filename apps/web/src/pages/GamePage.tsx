import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ALERT_TYPES, type AlertType } from "@guardian/protocol";
import { AlertButton } from "../components/multiplayer/AlertButton";
import { HardwarePanel } from "../components/multiplayer/HardwarePanel";
import { PlayerCard } from "../components/multiplayer/PlayerCard";
import { QueueList } from "../components/multiplayer/QueueList";
import { ScoreBoard } from "../components/multiplayer/ScoreBoard";
import { Timer } from "../components/multiplayer/Timer";
import { useRoomContext } from "../features/rooms/RoomContext";

function alertLabel(alertType: AlertType) {
  if (alertType === "gas") {
    return "Gas Leak";
  }

  if (alertType === "temperature") {
    return "Temperature";
  }

  return "Maintenance";
}

export function GamePage() {
  const room = useRoomContext();
  const [pendingResponse, setPendingResponse] = useState<AlertType | null>(null);

  const activeAlert = room.room?.activeAlert ?? null;
  const roomRunning = room.room?.status === "running";

  const canRespond = Boolean(roomRunning && room.isActivePlayer && activeAlert);

  const statusText = useMemo(() => {
    if (!room.room) {
      return "Room unavailable";
    }

    if (!activeAlert) {
      return room.isActivePlayer ? "Awaiting next alert..." : "Waiting for active player response...";
    }

    return "Respond to " + alertLabel(activeAlert.type);
  }, [activeAlert, room.isActivePlayer, room.room]);

  const onResponse = async (responseType: AlertType) => {
    if (!canRespond) {
      return;
    }

    setPendingResponse(responseType);
    await room.submitResponse(responseType, Date.now());
    window.setTimeout(() => {
      setPendingResponse(null);
    }, 120);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="grid gap-3"
    >
      <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
        <ScoreBoard
          score={room.myPlayer?.totalScore ?? 0}
          accuracy={room.myPlayer?.accuracy ?? 0}
          avgResponseMs={room.myPlayer?.avgResponseMs ?? 0}
        />
        <Timer turnEndsAtMs={room.room?.turnEndsAtMs ?? null} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
        <section className="rounded-xl border border-factory-line bg-factory-panel p-4" data-testid="active-alert-panel">
          <p className="text-xs uppercase tracking-[0.18em] text-factory-muted">Current Signal</p>
          <p
            className={
              "mt-2 text-xl font-semibold " +
              (activeAlert ? "text-factory-neonOrange" : "text-factory-muted")
            }
          >
            {activeAlert ? alertLabel(activeAlert.type) : "No active alert"}
          </p>
          <p className="mt-1 text-sm text-factory-muted">{statusText}</p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ALERT_TYPES.map((alertType) => (
              <AlertButton
                key={alertType}
                type={alertType}
                active={activeAlert?.type === alertType || pendingResponse === alertType}
                disabled={!canRespond}
                onClick={(type) => void onResponse(type)}
              />
            ))}
          </div>
        </section>

        <PlayerCard player={room.myPlayer} isActivePlayer={room.isActivePlayer} />
      </div>

      {room.isHost ? (
        <HardwarePanel
          roomRunning={roomRunning}
          onAlert={async (alertType, source, timestampMs) => {
            await room.publishAlert(alertType, source, timestampMs);
          }}
        />
      ) : (
        <section className="rounded-xl border border-factory-line bg-factory-panel p-4 text-sm text-factory-muted">
          Waiting for host hardware gateway events.
        </section>
      )}

      <QueueList
        players={room.players}
        activePlayerUid={room.room?.activePlayerUid ?? null}
        hostUid={room.room?.hostUid ?? null}
      />
    </motion.section>
  );
}
