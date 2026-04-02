import { createContext, useContext } from "react";
import { useAuthSession } from "./useAuthSession";

export type AuthContextValue = ReturnType<typeof useAuthSession>;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthSession();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthContext must be used inside AuthProvider.");
  }

  return value;
}
