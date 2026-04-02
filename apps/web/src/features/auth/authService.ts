import {
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { firebaseAuth, firestoreDb, isFirebaseConfigured } from "../../firebase/config";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";

const SESSION_AUTH_USER_KEY = "guardian.demo.authUser";
const authListeners = new Set<(user: AuthUser | null) => void>();

const authPersistence = {
  initialized: false,
  pending: null as Promise<void> | null
};

const isTestAuthEnabled = import.meta.env.VITE_E2E_AUTH_MOCK === "true";
const isFirebaseMode = isFirebaseConfigured && Boolean(firebaseAuth);

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

function createDemoUser(): AuthUser {
  return {
    uid: "demo-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
    displayName: "Demo Operator " + Math.floor(Math.random() * 90 + 10),
    email: null,
    photoURL: null
  };
}

function readSessionUser() {
  const raw = sessionStorage.getItem(SESSION_AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch (error) {
    logger.warn("Unable to parse demo auth user", {
      error: String(error)
    });
    return null;
  }
}

function writeSessionUser(user: AuthUser | null) {
  if (!user) {
    sessionStorage.removeItem(SESSION_AUTH_USER_KEY);
  } else {
    sessionStorage.setItem(SESSION_AUTH_USER_KEY, JSON.stringify(user));
  }

  for (const listener of authListeners) {
    listener(user);
  }
}

function getFirebaseAuth() {
  if (!firebaseAuth) {
    return null;
  }

  return firebaseAuth;
}

async function ensureLocalPersistence() {
  if (!isFirebaseMode || authPersistence.initialized) {
    return;
  }

  if (authPersistence.pending) {
    return authPersistence.pending;
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    return;
  }

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
  if (!firestoreDb) {
    return;
  }

  const nowMs = Date.now();
  await setDoc(
    doc(firestoreDb, "users", user.uid),
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
}

export function subscribeAuthState(listener: (user: AuthUser | null) => void) {
  if (!isFirebaseMode || isTestAuthEnabled) {
    authListeners.add(listener);
    listener(readSessionUser());
    return () => {
      authListeners.delete(listener);
    };
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    authListeners.add(listener);
    listener(readSessionUser());
    return () => {
      authListeners.delete(listener);
    };
  }

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
  if (!isFirebaseMode || isTestAuthEnabled) {
    const demoUser = createDemoUser();
    writeSessionUser(demoUser);
    return demoUser;
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    const demoUser = createDemoUser();
    writeSessionUser(demoUser);
    return demoUser;
  }

  await ensureLocalPersistence();

  logger.info("Starting Firebase Google auth flow");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  const result = await signInWithPopup(auth, provider);
  const mapped = mapFirebaseUser(result.user);
  await upsertUserProfile(mapped);
  return mapped;
}

export async function signOutUser() {
  if (!isFirebaseMode || isTestAuthEnabled) {
    writeSessionUser(null);
    return;
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    writeSessionUser(null);
    return;
  }

  await signOut(auth);
}

export function isGoogleAuthActive() {
  return isFirebaseMode && !isTestAuthEnabled;
}
