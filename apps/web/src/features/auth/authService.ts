import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from "../../firebase/config";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";

const TEST_AUTH_USER_KEY = "guardian.test.authUser";
const testAuthListeners = new Set<(user: AuthUser | null) => void>();

const authPersistence = {
  initialized: false,
  pending: null as Promise<void> | null
};

const isBrowserAutomation = typeof navigator !== "undefined" && navigator.webdriver === true;
const isTestAuthEnabled = import.meta.env.VITE_E2E_AUTH_MOCK === "true" || isBrowserAutomation;

function currentOriginLabel() {
  try {
    return window.location.origin;
  } catch {
    return "this app origin";
  }
}

export function getAuthErrorMessage(error: unknown) {
  const defaultMessage = "Google sign-in failed. Verify Firebase configuration and retry.";

  if (!(error instanceof FirebaseError)) {
    return defaultMessage;
  }

  switch (error.code) {
    case "auth/configuration-not-found":
    case "auth/operation-not-allowed":
      return "Google provider is disabled in Firebase Auth. Enable Google sign-in and retry.";
    case "auth/unauthorized-domain":
      return `Unauthorized domain. Add ${currentOriginLabel()} to Firebase Auth > Settings > Authorized domains.`;
    case "auth/popup-blocked":
      return "Popup was blocked by browser settings. Allow popups for this site and retry.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completion. Retry and complete the flow.";
    case "auth/network-request-failed":
      return "Network error during sign-in. Check internet/firewall and retry.";
    case "auth/invalid-api-key":
      return "Invalid Firebase API key. Verify VITE_FIREBASE_API_KEY.";
    case "auth/app-not-authorized":
      return "This app is not authorized for Firebase Auth. Verify project app configuration.";
    default:
      return `${defaultMessage} (${error.code})`;
  }
}

function prettifyLocalPart(localPart: string) {
  return localPart
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function mapFirebaseUser(user: User): AuthUser {
  const explicitName = user.displayName?.trim();
  const fallbackName = user.email ? prettifyLocalPart(user.email.split("@")[0] ?? "") : "";

  return {
    uid: user.uid,
    displayName: explicitName || fallbackName || "Factory Operator",
    email: user.email,
    photoURL: user.photoURL
  };
}

function requireFirebaseAuth() {
  if (!isFirebaseConfigured || !firebaseAuth) {
    throw new Error("Firebase Auth is not configured. Add VITE_FIREBASE_* values.");
  }

  return firebaseAuth;
}

function requireFirestore() {
  if (!isFirebaseConfigured || !firestoreDb) {
    throw new Error("Firestore is not configured. Add VITE_FIREBASE_* values.");
  }

  return firestoreDb;
}

async function ensureLocalPersistence() {
  if (isTestAuthEnabled || authPersistence.initialized) {
    return;
  }

  if (authPersistence.pending) {
    return authPersistence.pending;
  }

  const auth = requireFirebaseAuth();
  authPersistence.pending = setPersistence(auth, browserLocalPersistence)
    .then(() => {
      authPersistence.initialized = true;
      logger.info("Firebase auth persistence configured", {
        mode: "browserLocalPersistence"
      });
    })
    .catch((error) => {
      logger.error("Failed to configure Firebase auth persistence", {
        error: String(error)
      });
      throw error;
    })
    .finally(() => {
      authPersistence.pending = null;
    });

  return authPersistence.pending;
}

export async function upsertUserProfile(user: AuthUser) {
  const db = requireFirestore();
  const nowMs = Date.now();

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLoginAtMs: nowMs,
      updatedAtMs: nowMs
    },
    { merge: true }
  );

  logger.debug("User profile upserted", {
    uid: user.uid
  });
}

function readTestAuthUser() {
  const raw = localStorage.getItem(TEST_AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch (error) {
    logger.warn("Unable to parse test auth user", {
      error: String(error)
    });
    return null;
  }
}

function writeTestAuthUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(TEST_AUTH_USER_KEY);
  } else {
    localStorage.setItem(TEST_AUTH_USER_KEY, JSON.stringify(user));
  }

  for (const listener of testAuthListeners) {
    listener(user);
  }
}

export function subscribeAuthState(listener: (user: AuthUser | null) => void) {
  if (isTestAuthEnabled) {
    testAuthListeners.add(listener);
    listener(readTestAuthUser());
    return () => {
      testAuthListeners.delete(listener);
    };
  }

  const auth = requireFirebaseAuth();
  void ensureLocalPersistence();

  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      listener(null);
      return;
    }

    const mapped = mapFirebaseUser(user);
    void upsertUserProfile(mapped).catch((error) => {
      logger.error("Failed to persist user profile on auth restore", {
        uid: mapped.uid,
        error: String(error)
      });
    });

    listener(mapped);
  });
}

export async function signInWithGoogle() {
  if (isTestAuthEnabled) {
    const testUser: AuthUser = {
      uid: "test-operator",
      displayName: "Test Operator",
      email: "test.operator@example.com",
      photoURL: null
    };
    writeTestAuthUser(testUser);
    logger.info("Using test auth mode for sign-in");
    return testUser;
  }

  const auth = requireFirebaseAuth();
  await ensureLocalPersistence();

  logger.info("Starting Firebase Google auth flow");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const mapped = mapFirebaseUser(result.user);
    await upsertUserProfile(mapped);
    return mapped;
  } catch (error) {
    logger.error("Firebase Google auth popup failed", {
      code: error instanceof FirebaseError ? error.code : "unknown",
      message: String(error)
    });
    throw error;
  }
}

export async function signOutUser() {
  if (isTestAuthEnabled) {
    writeTestAuthUser(null);
    return;
  }

  const auth = requireFirebaseAuth();
  await signOut(auth);
}

export function isGoogleAuthActive() {
  return true;
}
