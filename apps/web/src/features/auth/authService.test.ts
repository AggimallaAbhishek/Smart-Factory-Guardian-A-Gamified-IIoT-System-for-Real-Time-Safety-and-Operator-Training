import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setPersistence: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const firebaseAuthMock = { name: "auth" };
const firestoreMock = { name: "firestore" };

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: { kind: "local" },
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  onAuthStateChanged: mocks.onAuthStateChanged,
  setPersistence: mocks.setPersistence,
  signInWithPopup: mocks.signInWithPopup,
  signOut: mocks.signOut
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  setDoc: mocks.setDoc
}));

vi.mock("../../firebase/config", () => ({
  firebaseAuth: firebaseAuthMock,
  firestoreDb: firestoreMock,
  isFirebaseConfigured: true
}));

vi.mock("../../lib/logger", () => ({
  logger: mocks.logger
}));

async function loadAuthService() {
  return import("./authService");
}

describe("authService", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.setPersistence.mockReset().mockResolvedValue(undefined);
    mocks.onAuthStateChanged.mockReset().mockReturnValue(() => {});
    mocks.signInWithPopup.mockReset();
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.doc.mockReset().mockImplementation((_db, collectionName: string, docId: string) => ({
      path: `${collectionName}/${docId}`
    }));
    mocks.setDoc.mockReset().mockResolvedValue(undefined);
    mocks.logger.debug.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  it("maps missing display names from email local part", async () => {
    const service = await loadAuthService();
    const mapped = service.mapFirebaseUser({
      uid: "operator-1",
      displayName: null,
      email: "line.operator@example.com",
      photoURL: null
    } as never);

    expect(mapped.displayName).toBe("Line Operator");
    expect(mapped.uid).toBe("operator-1");
  });

  it("signInWithGoogle configures persistence and upserts user profile", async () => {
    const service = await loadAuthService();
    mocks.signInWithPopup.mockResolvedValue({
      user: {
        uid: "operator-2",
        displayName: null,
        email: "test.user@example.com",
        photoURL: null
      }
    });

    const user = await service.signInWithGoogle();

    expect(user.uid).toBe("operator-2");
    expect(user.displayName).toBe("Test User");
    expect(mocks.setPersistence).toHaveBeenCalledTimes(1);
    expect(mocks.doc).toHaveBeenCalledWith(firestoreMock, "users", "operator-2");
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "users/operator-2" },
      expect.objectContaining({
        uid: "operator-2",
        name: "Test User",
        email: "test.user@example.com"
      }),
      { merge: true }
    );
  });

  it("does not block sign-in when Firestore profile sync fails", async () => {
    const service = await loadAuthService();
    mocks.signInWithPopup.mockResolvedValue({
      user: {
        uid: "operator-4",
        displayName: "Operator Four",
        email: "operator4@example.com",
        photoURL: null
      }
    });
    mocks.setDoc.mockRejectedValueOnce(new Error("permission-denied"));

    const user = await service.signInWithGoogle();

    expect(user).toEqual(
      expect.objectContaining({
        uid: "operator-4",
        displayName: "Operator Four"
      })
    );
    expect(mocks.logger.warn).toHaveBeenCalled();
  });

  it("subscribeAuthState persists profile on restored session", async () => {
    const service = await loadAuthService();
    const listener = vi.fn();

    mocks.onAuthStateChanged.mockImplementation((_auth, callback: (value: unknown) => void) => {
      callback({
        uid: "operator-3",
        displayName: "Operator Three",
        email: "operator3@example.com",
        photoURL: null
      });
      return () => {};
    });

    service.subscribeAuthState(listener);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "operator-3",
        displayName: "Operator Three"
      })
    );
    expect(mocks.setDoc).toHaveBeenCalledWith(
      { path: "users/operator-3" },
      expect.objectContaining({
        uid: "operator-3",
        name: "Operator Three"
      }),
      { merge: true }
    );
  });
});
