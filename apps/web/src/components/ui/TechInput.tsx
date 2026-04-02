import clsx from "clsx";

interface TechInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  mono?: boolean;
}

export function TechInput({ label, icon, className, mono = false, id, ...props }: TechInputProps) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-tech-blue/70">{label}</span>
      <div className="relative mt-1">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tech-blue/60">{icon}</span> : null}
        <input
          id={id}
          className={clsx(
            "tech-cut-reverse w-full border border-white/20 bg-base-800/60 px-3 py-3 text-base text-tech-blue outline-none transition-all placeholder:text-base-500 focus:border-tech-blue focus:bg-tech-blue/5",
            icon ? "pl-10" : "",
            mono ? "font-mono uppercase tracking-wider" : "",
            className
          )}
          {...props}
        />
      </div>
    </label>
  );
}
