import { motion } from "framer-motion";
import clsx from "clsx";
import type { AlertType } from "@guardian/protocol";

interface SignalLightsProps {
  activeAlert: AlertType | null;
}

/**
 * Arduino LED Pin Mapping:
 * - Pin 2: Gas LED (Red) - Key 'G'
 * - Pin 3: Temperature LED (Orange) - Key 'T'
 * - Pin 4: Maintenance LED (Blue) - Key 'M'
 */
const LIGHTS: { type: AlertType; label: string; key: string; pin: number; color: string; glowColor: string }[] = [
  {
    type: "gas",
    label: "GAS",
    key: "G",
    pin: 2,
    color: "bg-red-500",
    glowColor: "shadow-[0_0_30px_rgba(239,68,68,0.8),0_0_60px_rgba(239,68,68,0.4)]"
  },
  {
    type: "temperature",
    label: "TEMP",
    key: "T",
    pin: 3,
    color: "bg-orange-500",
    glowColor: "shadow-[0_0_30px_rgba(249,115,22,0.8),0_0_60px_rgba(249,115,22,0.4)]"
  },
  {
    type: "maintenance",
    label: "MAINT",
    key: "M",
    pin: 4,
    color: "bg-blue-500",
    glowColor: "shadow-[0_0_30px_rgba(59,130,246,0.8),0_0_60px_rgba(59,130,246,0.4)]"
  }
];

export function SignalLights({ activeAlert }: SignalLightsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      {LIGHTS.map((light) => {
        const isActive = activeAlert === light.type;

        return (
          <div key={light.type} className="flex flex-col items-center gap-2">
            <motion.div
              className={clsx(
                "relative h-16 w-16 rounded-full border-2 transition-colors duration-200",
                isActive
                  ? `${light.color} ${light.glowColor} border-white/50`
                  : "bg-base-700 border-white/20"
              )}
              animate={
                isActive
                  ? {
                      scale: [1, 1.15, 1],
                      opacity: [1, 0.7, 1]
                    }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                isActive
                  ? {
                      duration: 0.4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }
                  : { duration: 0.2 }
              }
            >
              {/* Inner glow effect */}
              {isActive && (
                <motion.div
                  className={clsx("absolute inset-2 rounded-full", light.color)}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Center dot / key indicator */}
              <div
                className={clsx(
                  "absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-xs font-bold",
                  isActive ? "bg-white/90 text-base-900" : "bg-white/20 text-white/50"
                )}
              >
                {light.key}
              </div>
            </motion.div>

            <div className="text-center">
              <span
                className={clsx(
                  "block font-mono text-[10px] font-semibold uppercase tracking-[0.15em]",
                  isActive ? "text-white" : "text-white/40"
                )}
              >
                {light.label}
              </span>
              <span className="font-mono text-[8px] text-white/30">
                PIN {light.pin}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
