import clsx from "clsx";

interface TechPanelProps {
  children: React.ReactNode;
  className?: string;
  cut?: "normal" | "reverse";
}

export function TechPanel({ children, className, cut = "reverse" }: TechPanelProps) {
  return (
    <section
      className={clsx(
        cut === "reverse" ? "tech-cut-reverse" : "tech-cut",
        "border border-white/10 bg-base-800/60 p-4 backdrop-blur-md",
        className
      )}
    >
      {children}
    </section>
  );
}
