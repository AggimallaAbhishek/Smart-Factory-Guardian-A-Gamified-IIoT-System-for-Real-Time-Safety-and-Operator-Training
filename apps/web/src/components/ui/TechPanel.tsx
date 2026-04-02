import clsx from "clsx";

interface TechPanelProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  cut?: "normal" | "reverse";
}

export function TechPanel({ children, className, cut = "reverse", ...props }: TechPanelProps) {
  return (
    <section
      className={clsx(
        cut === "reverse" ? "tech-cut-reverse" : "tech-cut",
        "border border-white/10 bg-base-800/60 p-4 backdrop-blur-md",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
