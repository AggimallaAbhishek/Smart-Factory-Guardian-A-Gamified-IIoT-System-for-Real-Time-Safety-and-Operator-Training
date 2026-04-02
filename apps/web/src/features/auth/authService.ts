import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { backendMode, firebaseAuth } from "../../firebase/config";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../rooms/types";

const DEMO_USER_KEY = "guardian.demo.authUser";
const demoListeners = new Set<(user: AuthUser | null) => void>();

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? "Factory Operator",
    email: user.email,
    photoURL: user.photoURL
  };
}

function readDemoUser() {
  const raw = sessionStorage.getItem(DEMO_USER_KEY);
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

function writeDemoUser(user: AuthUser | null) {
  if (!user) {
    sessionStorage.removeItem(DEMO_USER_KEY);
  } else {
    sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
  }

  for (const listener of demoListeners) {
    listener(user);
  }
}

export function subscribeAuthState(listener: (user: AuthUser | null) => void) {
  if (backendMode === "firebase" && firebaseAuth) {
    return onAuthStateChanged(firebaseAuth, (user) => {
      listener(user ? mapFirebaseUser(user) : null);
    });
  }

  demoListeners.add(listener);
  listener(readDemoUser());
  return () => {
    demoListeners.delete(listener);
  };
}

export async function signInWithGoogle() {
  if (backendMode === "firebase" && firebaseAuth) {
    logger.info("Starting Firebase Google auth flow");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return mapFirebaseUser(result.user);
  }

  logger.info("Using demo auth mode");
  const demoUser: AuthUser = {
    uid: `demo-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    displayName: `Demo Operator ${Math.floor(Math.random() * 90 + 10)}`,
    email: null,
    photoURL: null
  };

  writeDemoUser(demoUser);
  return demoUser;
}

export async function signOutUser() {
  if (backendMode === "firebase" && firebaseAuth) {
    await signOut(firebaseAuth);
    return;
  }

  writeDemoUser(null);
}

export function isGoogleAuthActive() {
  return backendMode === "firebase";
}
