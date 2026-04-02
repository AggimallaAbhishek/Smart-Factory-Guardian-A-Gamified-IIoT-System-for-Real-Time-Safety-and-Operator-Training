import { motion, type HTMLMotionProps } from "framer-motion";
import clsx from "clsx";

type Tone = "blue" | "green" | "red" | "orange" | "neutral";

interface TechActionButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  tone?: Tone;
  techCut?: "normal" | "reverse";
}

const TONE_STYLES: Record<Tone, string> = {
  blue: "border-tech-blue text-tech-blue bg-tech-blue/10 hover:bg-tech-blue hover:text-base-900",
  green: "border-tech-green text-tech-green bg-tech-green/10 hover:bg-tech-green hover:text-base-900",
  red: "border-tech-red text-tech-red bg-tech-red/10 hover:bg-tech-red hover:text-base-900",
  orange: "border-tech-orange text-tech-orange bg-tech-orange/10 hover:bg-tech-orange hover:text-base-900",
  neutral: "border-white/20 text-white bg-white/5 hover:bg-white hover:text-base-900"
};

export function TechActionButton({
  children,
  className,
  tone = "blue",
  techCut = "normal",
  disabled,
  ...props
}: TechActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      type={props.type ?? "button"}
      className={clsx(
        techCut === "reverse" ? "tech-cut-reverse" : "tech-cut",
        "relative border px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45",
        TONE_STYLES[tone],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
