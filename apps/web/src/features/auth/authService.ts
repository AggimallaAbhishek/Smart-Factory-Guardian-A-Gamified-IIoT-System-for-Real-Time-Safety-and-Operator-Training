import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from "../../firebase/config";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";

const TEST_AUTH_USER_KEY = "guardian.test.authUser";
const OPERATOR_EMAIL_DOMAIN = "operator.guardian.local";

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

function normalizeOperatorId(operatorId: string) {
  return operatorId.trim().toUpperCase();
}

function validateOperatorCredentials(operatorId: string, passcode: string) {
  const normalizedId = normalizeOperatorId(operatorId);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(normalizedId)) {
    throw new Error("Operator ID must be 3-32 chars using A-Z, 0-9, '_' or '-'.");
  }

  const normalizedPasscode = passcode.trim();
  if (normalizedPasscode.length < 6) {
    throw new Error("Passcode must be at least 6 characters.");
  }

  return {
    operatorId: normalizedId,
    passcode: normalizedPasscode
  };
}

export function operatorIdToEmail(operatorId: string) {
  return `${normalizeOperatorId(operatorId).toLowerCase()}@${OPERATOR_EMAIL_DOMAIN}`;
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

async function persistProfileSafely(user: AuthUser) {
  try {
    await upsertUserProfile(user);
  } catch (profileError) {
    logger.warn("Auth completed but profile sync failed", {
      uid: user.uid,
      code: profileError instanceof FirebaseError ? profileError.code : "unknown",
      error: String(profileError)
    });
  }
}

function buildTestUser(operatorId = "TEST-OPERATOR"): AuthUser {
  return {
    uid: `test-${normalizeOperatorId(operatorId).toLowerCase()}`,
    displayName: normalizeOperatorId(operatorId),
    email: operatorIdToEmail(operatorId),
    photoURL: null
  };
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
    void persistProfileSafely(mapped);
    listener(mapped);
  });
}

export async function signInWithGoogle() {
  if (isTestAuthEnabled) {
    const testUser = buildTestUser();
    writeTestAuthUser(testUser);
    logger.info("Using test auth mode for Google sign-in");
    return testUser;
  }

  const auth = requireFirebaseAuth();
  await ensureLocalPersistence();

  logger.info("Starting Firebase Google auth flow");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  const result = await signInWithPopup(auth, provider);
  const mapped = mapFirebaseUser(result.user);
  await persistProfileSafely(mapped);
  return mapped;
}

export async function registerWithCredentials(operatorId: string, passcode: string) {
  const credentials = validateOperatorCredentials(operatorId, passcode);

  if (isTestAuthEnabled) {
    const testUser = buildTestUser(credentials.operatorId);
    writeTestAuthUser(testUser);
    logger.info("Using test auth mode for credential registration", {
      operatorId: credentials.operatorId
    });
    return testUser;
  }

  const auth = requireFirebaseAuth();
  await ensureLocalPersistence();

  const email = operatorIdToEmail(credentials.operatorId);
  logger.info("Registering credential auth user", {
    operatorId: credentials.operatorId
  });
  const result = await createUserWithEmailAndPassword(auth, email, credentials.passcode);
  await updateProfile(result.user, {
    displayName: credentials.operatorId
  });

  const mapped = mapFirebaseUser(result.user);
  const enriched: AuthUser = {
    ...mapped,
    displayName: credentials.operatorId
  };
  await persistProfileSafely(enriched);
  return enriched;
}

export async function signInWithCredentials(operatorId: string, passcode: string) {
  const credentials = validateOperatorCredentials(operatorId, passcode);

  if (isTestAuthEnabled) {
    const testUser = buildTestUser(credentials.operatorId);
    writeTestAuthUser(testUser);
    logger.info("Using test auth mode for credential sign-in", {
      operatorId: credentials.operatorId
    });
    return testUser;
  }

  const auth = requireFirebaseAuth();
  await ensureLocalPersistence();

  const email = operatorIdToEmail(credentials.operatorId);
  logger.info("Credential sign-in requested", {
    operatorId: credentials.operatorId
  });
  const result = await signInWithEmailAndPassword(auth, email, credentials.passcode);

  const mapped = mapFirebaseUser(result.user);
  const enriched: AuthUser = {
    ...mapped,
    displayName: credentials.operatorId
  };
  await persistProfileSafely(enriched);
  return enriched;
}

export async function signOutUser() {
  if (isTestAuthEnabled) {
    writeTestAuthUser(null);
    return;
  }

  const auth = requireFirebaseAuth();
  await signOut(auth);
}

export function getAuthErrorMessage(error: unknown) {
  const defaultMessage = "Authentication failed. Verify Firebase configuration and retry.";

  if (!(error instanceof FirebaseError)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return defaultMessage;
  }

  switch (error.code) {
    case "auth/configuration-not-found":
    case "auth/operation-not-allowed":
      return "Enable Google and Email/Password providers in Firebase Auth and retry.";
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
    case "auth/email-already-in-use":
      return "Operator ID already registered. Use credential sign in.";
    case "auth/invalid-email":
      return "Operator ID format is invalid for registration.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid Operator ID or Passcode.";
    case "auth/weak-password":
      return "Passcode is too weak. Use at least 6 characters.";
    case "permission-denied":
      return "Authentication succeeded, but Firestore access is denied. Deploy/update Firestore rules.";
    default:
      return defaultMessage;
  }
}

export function isGoogleAuthActive() {
  return true;
}
