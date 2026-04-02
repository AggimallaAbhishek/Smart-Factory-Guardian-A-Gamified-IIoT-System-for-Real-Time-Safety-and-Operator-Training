# Smart Factory Guardian

Smart Factory Guardian is a multiplayer IIoT training game with:
- React + Tailwind terminal UI (`apps/web`)
- Firebase Google Authentication + Firestore room state
- Real-time host-driven alert gameplay (mock source v1, hardware abstraction ready)
- Shared protocol/domain logic (`packages/*`)
- Optional local HC-05 bridge (`services/bridge`) for future hardware modes

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure Firebase env vars in `apps/web/.env.local`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3. Start web app:

```bash
npm run dev:web
```

4. Deploy Firestore rules (required for room create/join):

```bash
npm run firebase:deploy:rules
```

If deploy returns HTTP 403, your Firebase account is missing project permissions. Request `Project Owner` or `Firebase Admin` access on `smart-factory-guardian`.

5. Open `http://127.0.0.1:5173`, sign in with Google, create/join a room, and run the 60-second turn gameplay.

## Firebase Security Rules

Firestore rules are in:

```bash
firebase/firestore.rules
```

Deploy them with your Firebase CLI workflow for your target project.

## Optional Bridge (future source adapter)

Bridge server can still be started for future hardware source work:

```bash
npm run dev:bridge
```

## Test Commands

```bash
npm run test:unit
npm run test:e2e
```
