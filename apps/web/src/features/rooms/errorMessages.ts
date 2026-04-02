import { FirebaseError } from "firebase/app";

function firestoreDeployHint() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || "<project-id>";
  return `firebase deploy --only firestore:rules --project ${projectId}`;
}

export function toRoomErrorMessage(error: unknown, actionLabel: string) {
  if (!(error instanceof FirebaseError)) {
    return `${actionLabel} failed: ${String(error)}`;
  }

  switch (error.code) {
    case "permission-denied":
      return `${actionLabel} failed: Firestore denied access. Run \`${firestoreDeployHint()}\` and ensure your account has Project Owner/Firebase Admin permissions.`;
    case "unauthenticated":
      return `${actionLabel} failed: sign in again and retry.`;
    case "not-found":
      return `${actionLabel} failed: room was not found.`;
    case "failed-precondition":
      return `${actionLabel} failed: Firestore index/rule precondition not met.`;
    case "unavailable":
      return `${actionLabel} failed: Firestore is temporarily unavailable.`;
    default:
      return `${actionLabel} failed: ${error.message}`;
  }
}

export function wrapRoomError(error: unknown, actionLabel: string): Error {
  return new Error(toRoomErrorMessage(error, actionLabel));
}
