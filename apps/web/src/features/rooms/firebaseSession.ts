import { backendMode, firebaseAuth } from "../../firebase/config";
import { logger } from "../../lib/logger";

export async function ensureFirebaseSessionReady(action: string) {
  if (import.meta.env.MODE === "test") {
    return;
  }

  if (backendMode !== "firebase" || !firebaseAuth) {
    return;
  }

  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    logger.warn("Room operation blocked; Firebase session missing", {
      action
    });
    throw new Error("Firebase session is not ready yet. Retry in a moment.");
  }

  try {
    await currentUser.getIdToken();
    logger.debug("Firebase session ready for room operation", {
      action,
      uid: currentUser.uid
    });
  } catch (error) {
    logger.error("Unable to refresh Firebase auth token before room operation", {
      action,
      uid: currentUser.uid,
      error: String(error)
    });
    throw error;
  }
}
