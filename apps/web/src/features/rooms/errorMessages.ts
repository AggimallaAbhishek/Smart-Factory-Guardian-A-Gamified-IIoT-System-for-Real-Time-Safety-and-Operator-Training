import { FirebaseError } from "firebase/app";

export function toRoomErrorMessage(error: unknown, actionLabel: string) {
  if (!(error instanceof FirebaseError)) {
    return `${actionLabel} failed: ${String(error)}`;
  }

  switch (error.code) {
    case "permission-denied":
      return `${actionLabel} failed: Firestore denied access. Deploy firestore rules and verify your authenticated user has room permissions.`;
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
