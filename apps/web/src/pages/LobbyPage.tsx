import { motion } from "framer-motion";
import { HostControls } from "../components/multiplayer/HostControls";
import { LeaderboardTable } from "../components/multiplayer/LeaderboardTable";
import { PlayerCard } from "../components/multiplayer/PlayerCard";
import { QueueList } from "../components/multiplayer/QueueList";
import { useRoomContext } from "../features/rooms/RoomContext";

export function LobbyPage() {
  const room = useRoomContext();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="grid gap-3"
    >
      <div className="rounded-xl border border-factory-line bg-factory-panel p-4">
        <h1 className="text-xl font-bold text-factory-text">Lobby</h1>
        <p className="mt-1 text-sm text-factory-muted">
          Queue is live. Host starts the game when everyone is ready.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
        <QueueList
          players={room.players}
          activePlayerUid={room.room?.activePlayerUid ?? null}
          hostUid={room.room?.hostUid ?? null}
        />
        <PlayerCard player={room.myPlayer} isActivePlayer={room.isActivePlayer} />
      </div>

      {room.isHost && room.room ? (
        <HostControls
          roomStatus={room.room.status}
          onStart={() => void room.startRoom()}
          onForceNext={() => void room.forceNextTurn()}
          onEnd={() => void room.endRoom()}
        />
      ) : null}

      <LeaderboardTable entries={room.leaderboard} />
    </motion.section>
  );
}
