import { backendMode, firebaseAuth } from "../../firebase/config";
import { logger } from "../../lib/logger";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureFirebaseSessionReady(action: string, retryCount = 0) {
  if (import.meta.env.MODE === "test") {
    return;
  }

  if (backendMode !== "firebase" || !firebaseAuth) {
    return;
  }

  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    if (retryCount < MAX_RETRIES) {
      logger.debug(`Firebase session missing for ${action}, retrying...`, {
        action,
        retryCount
      });
      await delay(RETRY_DELAY_MS * (retryCount + 1));
      return ensureFirebaseSessionReady(action, retryCount + 1);
    }
    
    logger.warn("Room operation blocked; Firebase session missing after retries", {
      action,
      retryCount
    });
    throw new Error("Firebase authentication required. Please sign in and try again.");
  }

  try {
    // Force refresh token to ensure it's valid
    await currentUser.getIdToken(true);
    logger.debug("Firebase session ready for room operation", {
      action,
      uid: currentUser.uid
    });
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      logger.debug(`Firebase token refresh failed for ${action}, retrying...`, {
        action,
        retryCount,
        error: String(error)
      });
      await delay(RETRY_DELAY_MS * (retryCount + 1));
      return ensureFirebaseSessionReady(action, retryCount + 1);
    }

    logger.error("Unable to refresh Firebase auth token after retries", {
      action,
      uid: currentUser.uid,
      retryCount,
      error: String(error)
    });
    throw new Error("Authentication token refresh failed. Please sign in again.");
  }
}
