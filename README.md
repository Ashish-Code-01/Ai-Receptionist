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
