import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { z } from "zod";

const firebaseSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
  measurementId: z.string().optional()
});

const parsed = firebaseSchema.safeParse({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
});

export const isFirebaseConfigured = parsed.success;
const firebaseConfig = parsed.success ? parsed.data : null;

export const firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firestoreDb = firebaseApp ? getFirestore(firebaseApp) : null;

// Configure timeouts and settings for better reliability
if (firebaseAuth) {
  // Set auth timeout to 30 seconds
  firebaseAuth.settings = {
    appVerificationDisabledForTesting: false
  };
}

export const backendMode = import.meta.env.VITE_BACKEND_MODE ?? (isFirebaseConfigured ? "firebase" : "demo");
