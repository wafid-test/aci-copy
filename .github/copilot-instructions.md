# SVP Fullstack App - AI Coding Instructions

## Architecture Overview
This is a fullstack exam booking application with Next.js frontend, Express backend, and PostgreSQL database via Prisma ORM. The backend acts as a proxy to the SVP API (`https://svp-international-api.pacc.sa`), handling authentication and session management.

- **Frontend** (`/frontend`): Next.js app calling backend APIs via `lib/api.js`
- **Backend** (`/backend`): Express server with routes for auth, user, admin, and SVP proxy
- **Database**: Prisma models for `User` and `Session` (stores encrypted SVP tokens)
- **Auth Flow**: SVP login → OTP → JWT access (localStorage) + refresh cookie (HttpOnly)

## Key Patterns
- **API Calls**: Use `api()` from `frontend/lib/api.js` for auto-token refresh on 401
- **SVP Proxy**: Backend routes under `/api/svp/*` forward authenticated requests to SVP API
- **Data Normalization**: SVP responses are nested; use `pickArray()` in `frontend/pages/exam/booking.js` to extract arrays
- **Environment**: Copy `.env.example` to `.env` (backend) or `.env.local` (frontend)
- **Modules**: Backend uses ES modules (`"type": "module"` in `package.json`)

## Development Workflow
- **Start DB**: `cd backend && docker compose up -d`
- **Setup Backend**: `cd backend && npm i && npx prisma generate && npx prisma migrate dev --name init && npm run dev`
- **Setup Frontend**: `cd frontend && npm i && npm run dev`
- **From Root**: `npm run install:all && npm run backend:dev & npm run frontend:dev`
- **Build Frontend**: `npm run frontend:build` (deploys to Vercel)
- **DB Commands**: Run `npx prisma <command>` in `/backend` directory

## Conventions
- **Error Handling**: Backend throws errors with `statusCode`; frontend catches and handles
- **CORS**: Configured for Vercel previews; update `CORS_ORIGINS` for production
- **Security**: SVP tokens encrypted in DB; refresh tokens as HttpOnly cookies
- **Admin Seeding**: Set `ADMIN_SEED_*` env vars to create admin user on startup
- **Rate Limiting**: Applied to `/api/auth` endpoints (30 req/min)

## Integration Points
- **SVP API**: Proxied via `lib/svpClient.js`; token from session `svpAccessEnc`
- **Deployment**: Backend on Railway, frontend on Vercel; shared Railway Postgres
- **Postman Collections**: Use provided `.postman_collection.json` files for API testing

Reference: `backend/README.md`, `frontend/README.md`, `prisma/schema.prisma`</content>
<parameter name="filePath">c:\Users\User\Desktop\SVP-MAIN\pci-svi\aci-api\.github\copilot-instructions.md