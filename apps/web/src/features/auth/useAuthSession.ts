import { useCallback, useEffect, useState } from "react";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";
import { isGoogleAuthActive, signInWithGoogle, signOutUser, subscribeAuthState } from "./authService";

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      setError(null);
      const signedInUser = await signInWithGoogle();
      setUser(signedInUser);
    } catch (caughtError) {
      logger.error("Sign-in failed", {
        error: String(caughtError)
      });
      setError("Sign-in failed. Please retry.");
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (caughtError) {
      logger.error("Sign-out failed", {
        error: String(caughtError)
      });
      setError("Sign-out failed. Please retry.");
    }
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isGoogleAuth: isGoogleAuthActive()
  };
}
