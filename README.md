# AI Receptionist

AI Receptionist is a web app for clinics to configure a virtual receptionist and manage front-desk workflows. Users can create an account, set up a business profile with services and working hours, choose an appointment duration, timezone, and receptionist voice, and view a dashboard for calls and appointments.

## Features

- Clinic-focused landing page, signup, sign-in, and Google sign-in.
- Business onboarding with services, weekly availability, appointment settings, timezone, voice, and custom instructions.
- Optional WhatsApp credentials setup and a calendar-connection step.
- Dashboard sections for overview, calls, appointments, and settings. The dashboard currently displays demo data.
- Backend endpoints for user sessions and business profile management.

## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, and React Router.
- Backend: Node.js, TypeScript, Express, MySQL, and Redis-backed rate limiting.
- Package manager: pnpm 11.27.1.

## Requirements

- Node.js
- pnpm 11.27.1
- MySQL
- Redis (used for rate limiting)

## Getting started

Install dependencies from the repository root:

```sh
pnpm install
```

Create a MySQL database and apply the schema:

```sql
CREATE DATABASE ai_receptionist;
```

Then run `backend/DB-Tables.sql` against that database.

Create `backend/.env` with the database connection, a strong JWT signing secret, and local service URLs:

```env
PORT=2000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-database-password
DB_NAME=ai_receptionist
REDIS_URL=redis://127.0.0.1:6379
```

The frontend API URL is currently configured as `http://localhost:2000` in `frontend/src/constants/apis.ts`; keep the backend port at `2000` for local development unless you also update that frontend setting.

Start both apps from the repository root:

```sh
pnpm dev
```

The frontend is available at <http://localhost:5173> and the backend at <http://localhost:2000>. You can also start each app separately:

```sh
pnpm dev:frontend
pnpm dev:backend
```

## Google sign-in

To enable Google sign-in, create a Google OAuth 2.0 Web application client. Add this callback URL to the client's authorized redirect URIs:

```text
http://localhost:2000/user/google/callback
```

Add the client values to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:2000/user/google/callback
```

Configure the OAuth consent screen for the `openid`, `email`, and `profile` scopes. Google sign-in is unavailable until these settings are provided.

## Validation

Build the workspace:

```sh
pnpm build
```

Lint the frontend:

```sh
pnpm lint
```

## Project structure

```text
backend/
  DB-Tables.sql
  src/
    config/
    controllers/
    helpers/
    middleware/
    routes/
    validators/
frontend/
  src/
    pages/
    constants/
```

The backend exposes user routes under `/user` and business-profile routes under `/details`. The frontend includes landing, authentication, onboarding, and dashboard pages.

Do not commit `.env` files, OAuth credentials, database passwords, or other secrets.
