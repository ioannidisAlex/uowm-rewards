# Student QR Rewards

A mobile-first QR scanning app for student reward points. Node.js backend +
TanStack/React frontend (client-side rendered), styled with Tailwind, scanning
via `html5-qrcode`.

## What it does

1. **Gatekeeper** — student enters their ID (`mst01081`). The frontend `POST`s to
   `/api/login`; the backend validates against an in-memory roster and returns an
   un-hashed JWT-style token. The ID is saved to `localStorage`.
2. **Scanner tab** — square camera viewfinder with a dimmed overlay. On a read the
   feed freezes, the decoded text is `POST`ed to `/api/claim-reward` with
   `studentId` attached. Success shows a full-screen green modal ("+50 points");
   errors (e.g. already-used code) flash a red banner.
3. **Dashboard tab** — a scoreboard-style points balance card plus recent scan
   history.

## Run it

Two terminals. Node 18+ required.

### 1. Backend

```bash
cd server
npm install
npm start          # http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev        # http://localhost:5173  (proxies /api -> :4000)
```

Open `http://localhost:5173` on your phone (same network) or in a desktop browser.
Camera access requires `https://` or `localhost` — for phone testing use a tunnel
(e.g. ngrok) or your machine's LAN IP over HTTPS.

### Demo IDs

- `mst01081` — starts at 0 points
- `mst02042` — starts at 120 points

Each QR code can only be claimed once per student; rescanning the same code
triggers the "already used" banner.

## Project layout

```
server/
  index.js          Express API: /login, /me, /claim-reward
client/
  src/
    api.js          fetch wrappers + localStorage helpers
    App.jsx         gate + tabbed shell
    Gatekeeper.jsx  student ID entry
    Scanner.jsx     html5-qrcode viewfinder + claim flow
    Dashboard.jsx   balance card + history
    Scoreboard.jsx  rolling split-flap points counter (signature element)
```

## Notes on the build

- State is intentionally local (`useState`/`useEffect`) per the brief; TanStack
  Query handles the network calls and cache invalidation after each scan.
- The JWT is deliberately non-cryptographic — this is a demo handshake, not an
  auth system. Don't ship it as-is.
