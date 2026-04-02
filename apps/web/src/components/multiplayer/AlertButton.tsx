import { motion } from "framer-motion";
import type { AlertType } from "@guardian/protocol";
import clsx from "clsx";

const LABELS: Record<AlertType, string> = {
  gas: "Gas",
  temperature: "Temperature",
  maintenance: "Maintenance"
};

const BASE_STYLE: Record<AlertType, string> = {
  gas: "border-tech-red/80 bg-tech-red/15 text-tech-red shadow-alertRed",
  temperature: "border-tech-orange/80 bg-tech-orange/15 text-tech-orange shadow-alertOrange",
  maintenance: "border-tech-blue/80 bg-tech-blue/15 text-tech-blue shadow-alertBlue"
};

interface AlertButtonProps {
  type: AlertType;
  active: boolean;
  disabled?: boolean;
  onClick: (alertType: AlertType) => void;
}

export function AlertButton({ type, active, disabled, onClick }: AlertButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      transition={{ duration: 0.12 }}
      data-testid={`alert-${type}`}
      className={clsx(
        "tech-cut relative flex min-h-[86px] w-full items-center justify-center border px-3 py-4 text-base font-bold uppercase tracking-[0.2em] transition-all sm:min-h-[96px] sm:text-lg",
        BASE_STYLE[type],
        active ? "animate-pulseAlert brightness-110" : "opacity-80",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      )}
      disabled={disabled}
      onClick={() => onClick(type)}
    >
      <span className="pointer-events-none z-10">{LABELS[type]}</span>
      {active ? <span className="absolute inset-0 border border-white/40" /> : null}
    </motion.button>
  );
}
