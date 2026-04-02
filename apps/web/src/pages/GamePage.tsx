import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ALERT_TYPES, type AlertType } from "@guardian/protocol";
import { AlertButton } from "../components/multiplayer/AlertButton";
import { HardwarePanel } from "../components/multiplayer/HardwarePanel";
import { PlayerCard } from "../components/multiplayer/PlayerCard";
import { QueueList } from "../components/multiplayer/QueueList";
import { ScoreBoard } from "../components/multiplayer/ScoreBoard";
import { Timer } from "../components/multiplayer/Timer";
import { TechActionButton } from "../components/ui/TechActionButton";
import { TechPanel } from "../components/ui/TechPanel";
import { useRoomContext } from "../features/rooms/RoomContext";

function alertLabel(alertType: AlertType) {
  if (alertType === "gas") {
    return "Gas";
  }

  if (alertType === "temperature") {
    return "Temperature";
  }

  return "Maintenance";
}

function alertToneClass(alertType: AlertType | null) {
  if (alertType === "gas") {
    return "border-tech-red/70 bg-tech-red/10 shadow-alertRed animate-pulseAlert";
  }

  if (alertType === "temperature") {
    return "border-tech-orange/70 bg-tech-orange/10 shadow-alertOrange animate-pulseAlert";
  }

  if (alertType === "maintenance") {
    return "border-tech-blue/70 bg-tech-blue/10 shadow-alertBlue animate-pulseAlert";
  }

  return "border-white/10 bg-base-800/50";
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
      return room.isActivePlayer ? "Awaiting next hardware alert..." : "Waiting for active operator response...";
    }

    return "Active alert: " + alertLabel(activeAlert.type);
  }, [activeAlert, room.isActivePlayer, room.room]);

  const onResponse = async (responseType: AlertType) => {
    if (!canRespond) {
      return;
    }

    setPendingResponse(responseType);
    await room.submitResponse(responseType, Date.now());
    window.setTimeout(() => {
      setPendingResponse(null);
    }, 140);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="grid gap-3"
    >
      <div className="grid gap-3 xl:grid-cols-[1.2fr,1fr]">
        <ScoreBoard
          score={room.myPlayer?.totalScore ?? 0}
          accuracy={room.myPlayer?.accuracy ?? 0}
          avgResponseMs={room.myPlayer?.avgResponseMs ?? 0}
        />
        <Timer turnEndsAtMs={room.room?.turnEndsAtMs ?? null} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.25fr,1fr]">
        <TechPanel className={alertToneClass(activeAlert?.type ?? null)} cut="normal">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/55">Active Alert Signal</p>
          <p className="mt-1 text-3xl font-bold uppercase tracking-[0.1em] text-white" data-testid="active-alert-label">
            {activeAlert ? alertLabel(activeAlert.type) : "Standby"}
          </p>
          <p className="mt-1 text-sm text-white/75" data-testid="active-alert-panel">
            {statusText}
          </p>

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
        </TechPanel>

        <PlayerCard player={room.myPlayer} isActivePlayer={room.isActivePlayer} />
      </div>

      {room.isHost ? (
        <div className="grid gap-3 xl:grid-cols-[1.25fr,1fr]">
          <HardwarePanel
            roomRunning={roomRunning}
            onAlert={async (alertType, source, timestampMs) => {
              await room.publishAlert(alertType, source, timestampMs);
            }}
          />
          <TechPanel>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/55">Host Actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <TechActionButton tone="orange" onClick={() => void room.forceNextTurn()} data-testid="host-force-next">
                Force Next
              </TechActionButton>
              <TechActionButton tone="red" onClick={() => void room.endRoom()} data-testid="host-end">
                End Room
              </TechActionButton>
            </div>
          </TechPanel>
        </div>
      ) : (
        <TechPanel>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/60">Host Gateway</p>
          <p className="mt-2 text-sm text-white/75">Waiting for host-generated hardware alerts.</p>
        </TechPanel>
      )}

      <QueueList players={room.players} activePlayerUid={room.room?.activePlayerUid ?? null} hostUid={room.room?.hostUid ?? null} />
    </motion.section>
  );
}
