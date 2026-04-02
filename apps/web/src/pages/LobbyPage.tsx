import { motion } from "framer-motion";
import { HostControls } from "../components/multiplayer/HostControls";
import { LeaderboardTable } from "../components/multiplayer/LeaderboardTable";
import { PlayerCard } from "../components/multiplayer/PlayerCard";
import { QueueList } from "../components/multiplayer/QueueList";
import { TechPanel } from "../components/ui/TechPanel";
import { useRoomContext } from "../features/rooms/RoomContext";

export function LobbyPage() {
  const room = useRoomContext();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="grid gap-3"
    >
      <TechPanel>
        <h1 className="text-2xl font-bold uppercase tracking-[0.16em] text-white">Lobby</h1>
        <p className="mt-1 text-sm text-white/70">Player queue is live. Host starts the room when all operators are ready.</p>
      </TechPanel>

      <div className="grid gap-3 xl:grid-cols-[1.3fr,1fr]">
        <QueueList players={room.players} activePlayerUid={room.room?.activePlayerUid ?? null} hostUid={room.room?.hostUid ?? null} />
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
