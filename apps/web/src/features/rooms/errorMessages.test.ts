import { FirebaseError } from "firebase/app";
import { describe, expect, test } from "vitest";
import { toRoomErrorMessage } from "./errorMessages";

describe("toRoomErrorMessage", () => {
  test("returns actionable deploy command for Firestore permission errors", () => {
    const error = new FirebaseError("permission-denied", "Missing or insufficient permissions.");
    const message = toRoomErrorMessage(error, "Create room");

    expect(message).toContain("Create room failed");
    expect(message).toContain("firebase deploy --only firestore:rules");
    expect(message).toContain("Project Owner/Firebase Admin");
  });
});
