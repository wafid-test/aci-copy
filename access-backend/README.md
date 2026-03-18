# Access Backend

A standalone access-control backend for your existing system.

## Features

- Admin / Agency / User roles
- Login / Logout / Current user
- Admin can create agency accounts
- Admin can create direct users
- Agency can create users under its own agency
- Admin can approve, block, or pend accounts
- HttpOnly JWT cookie auth
- Prisma + PostgreSQL

## Quick Start

1. Copy environment file:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
npm install
```

3. Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. Bootstrap default admin:
```bash
npm run bootstrap:admin
```

5. Run server:
```bash
npm run dev
```

Server runs on `http://localhost:4000` by default.

## API Overview

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/admin/agencies` (admin)
- `POST /api/admin/users` (admin)
- `PATCH /api/admin/accounts/:id/status` (admin)
- `GET /api/admin/accounts` (admin)
- `POST /api/agency/users` (agency)
- `GET /api/agency/users` (agency)