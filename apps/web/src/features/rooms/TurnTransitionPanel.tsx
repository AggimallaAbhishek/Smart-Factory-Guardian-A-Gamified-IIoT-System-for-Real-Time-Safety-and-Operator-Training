import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { RoomDoc, RoomPlayerDoc } from "./types";

interface TurnTransitionPanelProps {
  room: RoomDoc;
  players: RoomPlayerDoc[];
}

export function TurnTransitionPanel({ room, players }: TurnTransitionPanelProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const nextPlayer = players.find((p) => p.uid === room.nextPlayerUid);

  useEffect(() => {
    if (!room.turnTransitionEndsAtMs) {
      return;
    }

    const updateCountdown = () => {
      const nowMs = Date.now();
      const remainingMs = Math.max(0, room.turnTransitionEndsAtMs! - nowMs);
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 100);

    return () => {
      window.clearInterval(timerId);
    };
  }, [room.turnTransitionEndsAtMs]);

  if (!room.turnTransitionEndsAtMs || !nextPlayer) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl shadow-2xl"
    >
      <div className="text-center space-y-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-6xl font-bold text-indigo-400"
        >
          {secondsLeft}
        </motion.div>
        
        <div className="space-y-2">
          <p className="text-xl font-semibold text-gray-300">
            Next Player
          </p>
          <p className="text-2xl font-bold text-white">
            {nextPlayer.displayName}
          </p>
          <p className="text-sm text-gray-400">
            ID: {nextPlayer.uid.slice(0, 8)}
          </p>
        </div>

        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-lg text-indigo-300"
        >
          Get ready...
        </motion.div>
      </div>
    </motion.div>
  );
}
