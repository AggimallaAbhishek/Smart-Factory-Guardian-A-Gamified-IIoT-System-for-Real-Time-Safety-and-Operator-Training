import { motion } from "framer-motion";
import clsx from "clsx";
import type { AlertType } from "@guardian/protocol";

interface SignalLightsProps {
  activeAlert: AlertType | null;
}

const LIGHTS: { type: AlertType; label: string; color: string; glowColor: string; bgColor: string }[] = [
  {
    type: "gas",
    label: "GAS",
    color: "bg-tech-red",
    glowColor: "shadow-[0_0_30px_rgba(255,77,77,0.8),0_0_60px_rgba(255,77,77,0.4)]",
    bgColor: "bg-tech-red/20"
  },
  {
    type: "temperature",
    label: "TEMP",
    color: "bg-tech-orange",
    glowColor: "shadow-[0_0_30px_rgba(255,170,51,0.8),0_0_60px_rgba(255,170,51,0.4)]",
    bgColor: "bg-tech-orange/20"
  },
  {
    type: "maintenance",
    label: "MAINT",
    color: "bg-tech-blue",
    glowColor: "shadow-[0_0_30px_rgba(0,240,255,0.8),0_0_60px_rgba(0,240,255,0.4)]",
    bgColor: "bg-tech-blue/20"
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
                      scale: [1, 1.1, 1],
                      opacity: [1, 0.8, 1]
                    }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                isActive
                  ? {
                      duration: 0.5,
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
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Center dot */}
              <div
                className={clsx(
                  "absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  isActive ? "bg-white/90" : "bg-white/20"
                )}
              />
            </motion.div>

            <span
              className={clsx(
                "font-mono text-[10px] font-semibold uppercase tracking-[0.15em]",
                isActive ? "text-white" : "text-white/40"
              )}
            >
              {light.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
