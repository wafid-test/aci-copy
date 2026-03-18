# SVP Fullstack (Next.js + Express + Postgres)

This project uses the SVP API login + OTP flow, then issues your own access JWT + refresh cookie session,
and proxies SVP endpoints through your backend.

Live architecture:
- frontend: `https://svp-book.vercel.app`
- backend: `https://aci-api-production.up.railway.app`
- upstream SVP API: `https://svp-international-api.pacc.sa`

Important:
- the frontend should call your backend, not the upstream SVP API directly
- your backend handles auth/session logic, stores the SVP token, and then calls `https://svp-international-api.pacc.sa`

## Requirements
- Node.js 18+ (recommended Node 20)
- Docker (for Postgres)

## Start backend
```bash
cd backend
cp .env.example .env
docker compose up -d
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Start frontend
```bash
cd ../frontend
cp .env.example .env.local
npm i
npm run dev
```

Go to (local): http://localhost:3000/auth/login
Go to (live): https://svp-book.vercel.app/auth/login

## Notes
- SVP access token is extracted from `access_payload.access` (from your Postman response).
- Do NOT commit real SVP credentials/tokens.


## Exam UI
- Open (local): http://localhost:3000/exam/booking
- Open (live): https://svp-book.vercel.app/exam/booking


## Booking Modal UI
- Open Dashboard and click **Create New Booking** to use the modal UI similar to your screenshot.

## Public Repo And Fork Use
- This repository is prepared for public fork usage.
- Public runtime keys in `frontend/public/config.json` are placeholders. Set your own values before deployment.
- Do not commit private `.env` files (`backend/.env`, `frontend/.env.local`).

## Live Deploy (Railway + Vercel)

Backend on Railway:
1. Create a new Railway service from this repo and set **Root Directory** to `backend`.
2. Railway reads `backend/railway.toml` and runs `bash start.sh`.
3. Add backend env vars in Railway:
   - `NODE_ENV=production`
   - `APP_NAME=SVP Backend API`
   - `CORS_ORIGINS=https://svp-book.vercel.app,https://svp-book-abdur-razzak-s-projects.vercel.app`
   - `JWT_ACCESS_SECRET=...`
   - `JWT_REFRESH_SECRET=...`
   - `ACCESS_TOKEN_TTL_SECONDS=900`
   - `REFRESH_TOKEN_TTL_DAYS=14`
   - `COOKIE_SECURE=true`
   - `COOKIE_SAMESITE=none`
   - `DATABASE_URL=...` (Railway Postgres URL)
   - `SVP_BASE_URL=https://svp-international-api.pacc.sa`
   - `SVP_LOCALE=en`
   - `SVP_FE_APP=legislator`
   - `SESSION_ENC_KEY_BASE64=...`
4. Deploy and test:
   - `GET https://aci-api-production.up.railway.app/health`

Frontend on Vercel:
1. Import this repo into Vercel and set **Root Directory** to `frontend`.
2. Vercel uses `frontend/vercel.json` and builds Next.js.
3. Add env var in Vercel:
   - `NEXT_PUBLIC_BACKEND_URL=https://aci-api-production.up.railway.app`
4. Deploy and open your live website URL from Vercel.

Production flow:
- browser -> `https://svp-book.vercel.app`
- frontend API calls -> `https://aci-api-production.up.railway.app`
- backend proxy calls -> `https://svp-international-api.pacc.sa`

### Make GitHub Repo Public
1. Open repo settings: `https://github.com/abdurrazzak7395-rgb/pcc-app/settings`
2. Go to **General** -> **Danger Zone**.
3. Click **Change repository visibility** -> **Make public**.
4. Confirm repository name.

### Fork
1. Open `https://github.com/abdurrazzak7395-rgb/pcc-app`
2. Click **Fork** (top-right).
3. Choose your account/org and create fork.
