# AI Receptionist

This repository is a pnpm monorepo containing the frontend and backend applications.

## Requirements

- Node.js
- pnpm 11.27.1

## Install

From the repository root:

```sh
pnpm install
```

## Run

Start both applications:

```sh
pnpm dev
```

Or run one application:

```sh
pnpm dev:frontend
pnpm dev:backend
```

## Build and lint

```sh
pnpm build
pnpm lint
```

The frontend lives in [`frontend/`](./frontend/), and the backend lives in [`backend/`](./backend/). The backend accepts browser origins listed in its comma-separated `CORS_ORIGINS` environment variable. By default, it allows `http://localhost:5173` and `http://127.0.0.1:5173` for local development. Configure each application's local environment as needed; do not commit credentials or `.env` files.

## Google sign-in

Configure a Google OAuth 2.0 **Web application** client in Google Cloud. Add the exact value of `GOOGLE_REDIRECT_URI` to its authorized redirect URIs. For local development, use:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:2000/user/google/callback
FRONTEND_URL=http://localhost:5173
```

Set these values in `backend/.env` and restart the backend. The OAuth consent screen must allow the `openid`, `email`, and `profile` scopes. New Google accounts are saved in `Users` and signed in; verified Google emails matching an existing account are linked to that account.

For an existing database, apply [`backend/migrations/20261009_google_oauth.sql`](./backend/migrations/20261009_google_oauth.sql) once before using Google sign-in. It makes phone/password optional for provider-based accounts and adds the unique Google subject column. New databases get the matching columns from [`backend/DB-Tables.sql`](./backend/DB-Tables.sql).
