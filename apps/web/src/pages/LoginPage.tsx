import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useLocation } from "react-router-dom";
import { TechActionButton } from "../components/ui/TechActionButton";
import { TechInput } from "../components/ui/TechInput";
import { TerminalShell } from "../components/ui/TerminalShell";
import { useAuthContext } from "../features/auth/AuthContext";

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function LoginPage() {
  const auth = useAuthContext();
  const location = useLocation();
  const [operatorId, setOperatorId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTo = useMemo(() => {
    const state = location.state as { redirectTo?: string } | null;
    return state?.redirectTo || "/";
  }, [location.state]);

  if (auth.user) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await auth.signIn();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TerminalShell frameClassName="max-w-md">
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.22 }}
        className="my-auto"
      >
        <div className="mb-10 text-center">
          <motion.div
            className="mx-auto mb-5 inline-flex rounded-full border border-tech-blue/40 p-4 text-tech-blue"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <LockIcon />
          </motion.div>
          <h1 className="text-4xl font-bold uppercase tracking-[0.28em] text-white">
            Terminal <span className="text-tech-blue">Login</span>
          </h1>
          <p className="mt-2 font-mono text-xs tracking-[0.3em] text-base-500">SECURE_AUTH_REQUIRED</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <TechInput
            id="operator-id"
            label="Operator ID"
            icon={<UserIcon />}
            mono
            value={operatorId}
            onChange={(event) => setOperatorId(event.target.value)}
            placeholder="OP-7734"
            autoComplete="username"
            data-testid="operator-id"
          />

          <TechInput
            id="passcode"
            label="Passcode"
            icon={<LockIcon />}
            mono
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            type="password"
            data-testid="passcode"
          />

          <TechActionButton
            type="submit"
            tone="blue"
            className="w-full py-4 text-lg tracking-[0.28em]"
            data-testid="google-login"
            disabled={submitting || auth.loading}
          >
            {submitting ? "Verifying..." : "Sign in with Google"}
          </TechActionButton>
        </form>

        {auth.error ? <p className="mt-4 text-center font-mono text-xs tracking-[0.12em] text-tech-red">{auth.error}</p> : null}
        <p className="mt-4 text-center font-mono text-[10px] tracking-[0.16em] text-white/45">
          OPERATOR_ID and PASSCODE fields are retained for terminal UI continuity.
        </p>
      </motion.section>
    </TerminalShell>
  );
}
