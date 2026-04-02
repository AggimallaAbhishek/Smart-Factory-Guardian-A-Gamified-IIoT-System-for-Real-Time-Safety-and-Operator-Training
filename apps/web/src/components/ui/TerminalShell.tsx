import clsx from "clsx";

interface TerminalShellProps {
  children: React.ReactNode;
  frameClassName?: string;
  contentClassName?: string;
}

export function TerminalShell({ children, frameClassName, contentClassName }: TerminalShellProps) {
  return (
    <div className="terminal-bg">
      <div className="vignette" />
      <div className="crt-lines" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full items-center justify-center p-3 sm:p-5">
        <section
          className={clsx(
            "tech-cut relative flex w-full min-h-[92vh] max-h-[96vh] flex-col overflow-hidden border border-white/10 bg-base-900/80 shadow-[0_0_100px_rgba(0,240,255,0.1)] backdrop-blur-xl",
            frameClassName
          )}
        >
          <div className={clsx("relative flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6", contentClassName)}>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
