import { motion } from "framer-motion";
import type { AlertType } from "@guardian/protocol";
import clsx from "clsx";

const LABELS: Record<AlertType, string> = {
  gas: "Gas Leak",
  temperature: "Temperature",
  maintenance: "Maintenance"
};

const BASE_STYLE: Record<AlertType, string> = {
  gas: "border-red-500/70 bg-red-500/15 text-red-200 shadow-alertRed",
  temperature: "border-orange-400/70 bg-orange-400/15 text-orange-200 shadow-alertOrange",
  maintenance: "border-blue-400/70 bg-blue-400/15 text-blue-200 shadow-alertBlue"
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
        "relative flex min-h-[92px] w-full items-center justify-center rounded-xl border px-3 py-4 text-base font-semibold uppercase tracking-wide transition-colors sm:min-h-[112px] sm:text-lg",
        BASE_STYLE[type],
        active ? "animate-pulseNeon" : "opacity-85",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      )}
      disabled={disabled}
      onClick={() => onClick(type)}
    >
      <span className="pointer-events-none z-10">{LABELS[type]}</span>
      {active ? <span className="absolute inset-0 rounded-xl border border-white/40" /> : null}
    </motion.button>
  );
}
