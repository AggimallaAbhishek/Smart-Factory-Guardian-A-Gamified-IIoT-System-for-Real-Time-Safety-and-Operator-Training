import { useCallback, useEffect, useState } from "react";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";
import {
  getAuthErrorMessage,
  isGoogleAuthActive,
  registerWithCredentials,
  signInWithCredentials,
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

  const signInWithOperatorCredentials = useCallback(async (operatorId: string, passcode: string) => {
    try {
      setError(null);
      logger.info("Credential sign-in requested");
      const signedInUser = await signInWithCredentials(operatorId, passcode);
      setUser(signedInUser);
      return signedInUser;
    } catch (caughtError) {
      logger.error("Credential sign-in failed", {
        error: String(caughtError)
      });
      const message = getAuthErrorMessage(caughtError);
      setError(message);
      throw caughtError;
    }
  }, []);

  const registerOperator = useCallback(async (operatorId: string, passcode: string) => {
    try {
      setError(null);
      logger.info("Credential registration requested");
      const signedInUser = await registerWithCredentials(operatorId, passcode);
      setUser(signedInUser);
      return signedInUser;
    } catch (caughtError) {
      logger.error("Credential registration failed", {
        error: String(caughtError)
      });
      const message = getAuthErrorMessage(caughtError);
      setError(message);
      throw caughtError;
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
    signInWithCredentials: signInWithOperatorCredentials,
    registerWithCredentials: registerOperator,
    signOut,
    isGoogleAuth: isGoogleAuthActive()
  };
}
