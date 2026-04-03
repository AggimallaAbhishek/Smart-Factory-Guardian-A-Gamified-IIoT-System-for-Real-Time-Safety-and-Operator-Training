import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RoomPlayerDoc } from "../../features/rooms/types";

interface PlayerJoinNotificationProps {
  players: RoomPlayerDoc[];
  isHost: boolean;
}

interface JoinNotification {
  id: string;
  playerName: string;
  playerUid: string;
  timestamp: number;
}

function shortenUid(uid: string) {
  if (uid.length <= 10) return uid;
  return uid.slice(0, 5) + "..." + uid.slice(-3);
}

export function PlayerJoinNotification({ players, isHost }: PlayerJoinNotificationProps) {
  const [notifications, setNotifications] = useState<JoinNotification[]>([]);
  const [knownPlayers, setKnownPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isHost) return;

    const currentPlayerUids = new Set(players.map((p) => p.uid));

    // Find new players
    for (const player of players) {
      if (!knownPlayers.has(player.uid)) {
        // Skip if this is the initial load (first player is usually the host)
        if (knownPlayers.size > 0) {
          const notification: JoinNotification = {
            id: `${player.uid}-${Date.now()}`,
            playerName: player.displayName,
            playerUid: player.uid,
            timestamp: Date.now()
          };

          setNotifications((prev) => [...prev, notification]);

          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          }, 5000);
        }
      }
    }

    setKnownPlayers(currentPlayerUids);
  }, [players, isHost, knownPlayers]);

  if (!isHost || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="tech-cut border border-tech-green/60 bg-base-900/95 px-4 py-3 shadow-[0_0_20px_rgba(0,255,157,0.3)] backdrop-blur-md"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-tech-green">
              Player Joined
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{notification.playerName}</p>
            <p className="font-mono text-[10px] text-white/50" title={notification.playerUid}>
              ID: {shortenUid(notification.playerUid)}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
