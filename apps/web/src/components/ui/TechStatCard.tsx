import clsx from "clsx";
import { motion } from "framer-motion";
import { TechPanel } from "./TechPanel";

interface TechStatCardProps {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "orange" | "red" | "white";
  className?: string;
  valueTestId?: string;
}

const VALUE_COLOR: Record<NonNullable<TechStatCardProps["color"]>, string> = {
  blue: "text-tech-blue",
  green: "text-tech-green",
  orange: "text-tech-orange",
  red: "text-tech-red",
  white: "text-white"
};

export function TechStatCard({ label, value, color = "white", className, valueTestId }: TechStatCardProps) {
  return (
    <motion.div key={String(value)} initial={{ opacity: 0.7, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <TechPanel className={clsx("p-3", className)}>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">{label}</p>
        <p data-testid={valueTestId} className={clsx("mt-1 text-2xl font-bold", VALUE_COLOR[color])}>
          {value}
        </p>
      </TechPanel>
    </motion.div>
  );
}
