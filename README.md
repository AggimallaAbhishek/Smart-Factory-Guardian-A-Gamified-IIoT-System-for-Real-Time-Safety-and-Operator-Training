# Smart Factory Guardian (Phase 1)

A gamified IIoT safety training MVP with:
- Web game UI (`apps/web`)
- Local HC-05 bridge (`services/bridge`)
- Shared protocol/domain logic (`packages/*`)
- Arduino firmware (`firmware/arduino-guardian`)

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start bridge (generates a launch token if not provided):

```bash
npm run dev:bridge
```

3. Start web app:

```bash
npm run dev:web
```

4. Open `http://127.0.0.1:5173`, paste bridge token, select source, and run a 60-second session.

## Test Commands

```bash
npm run test:unit
npm run test:e2e
```

## Hardware Verification Checklist

1. Pair HC-05 with host machine.
2. Identify serial path (macOS example: `/dev/tty.HC-05-DevB`).
3. Start bridge with allowed origin and optional token:

```bash
BRIDGE_TOKEN=mytoken npm run dev:bridge
```

4. Connect from web app using source `serial` and the matching serial path.
5. Confirm alerts arrive in UI and score updates correctly.
