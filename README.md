# Kaari 3

Real-time multiplayer Kaari 3 card game, built with React, Socket.IO, and an
Express backend.

## Run locally

Install and start each app in a separate terminal:

```powershell
npm.cmd install --prefix backend
npm.cmd start --prefix backend

npm.cmd install --prefix frontend
npm.cmd run dev --prefix frontend
```

The frontend uses `http://localhost:3000` while running in development.

## Persistent rooms (PostgreSQL)

Room and game state persist through backend restarts only when the backend has a
PostgreSQL `DATABASE_URL`. Without it, the backend deliberately uses temporary
in-memory rooms. The health endpoint reports the active mode:

```text
GET /health  ->  { "ok": true, "persistentRooms": true }
```

1. Create a managed PostgreSQL database (for example, Render PostgreSQL).
2. Copy its **external** connection string into the backend service as
   `DATABASE_URL`. Do not commit it to Git.
3. If frontend and backend are deployed separately, set `CLIENT_URL` on the
   backend and `VITE_SOCKET_URL` on the frontend to their exact HTTPS URLs.
4. Redeploy, then open `<backend-url>/health` and confirm
   `persistentRooms` is `true`.

The `game_rooms` table is created automatically on the backend's first successful
database connection. Players can resume a saved room from the same browser. An
in-progress game pauses after a backend restart until each player reconnects.

Templates are available at `backend/.env.example` and `frontend/.env.example`.

### Render deployment (recommended)

This repository includes a [`render.yaml`](render.yaml) Blueprint that deploys
the whole app as one Render web service plus PostgreSQL. Render builds the React
frontend and the Express/Socket.IO backend serves it, so no public API URL or
CORS variable is needed.

- Build command: `npm ci --prefix backend && npm ci --prefix frontend && npm run build --prefix frontend`
- Start command: `npm start --prefix backend`
- Health check: `/health`
- Region: Singapore

Import the Blueprint from this repository in Render. It creates and wires
`DATABASE_URL` automatically; after deploy, open `/health` and ensure it reports
`"persistentRooms": true`.

### Separate frontend/backend deployment

Deploy the backend as a Render **Web Service**:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Environment variables: `DATABASE_URL`, `CLIENT_URL`

Deploy the frontend as a separate Render **Static Site** (or Vercel project):

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_SOCKET_URL`

For Render PostgreSQL, copy the database's external URL into the backend's
`DATABASE_URL` setting. The value must include SSL (normally
`?sslmode=require`).
