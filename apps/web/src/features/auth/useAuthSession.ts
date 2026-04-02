import { useCallback, useEffect, useState } from "react";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";
import {
  getAuthErrorMessage,
  isGoogleAuthActive,
  signInWithGoogle,
  signOutUser,
  subscribeAuthState
} from "./authService";

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = subscribeAuthState((nextUser) => {
        logger.debug("Auth state changed", {
          uid: nextUser?.uid ?? null
        });
        setUser(nextUser);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (caughtError) {
      logger.error("Unable to initialize auth subscription", {
        error: String(caughtError)
      });
      setError("Firebase Auth is not configured. Set VITE_FIREBASE_* values.");
      setLoading(false);
      return;
    }
  }, []);

  const signIn = useCallback(async () => {
    try {
      setError(null);
      logger.info("Auth sign-in requested");
      const signedInUser = await signInWithGoogle();
      setUser(signedInUser);
    } catch (caughtError) {
      logger.error("Sign-in failed", {
        error: String(caughtError)
      });
      setError(getAuthErrorMessage(caughtError));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      logger.info("Auth sign-out requested");
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
