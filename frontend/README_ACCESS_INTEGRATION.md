# Frontend Integration (Next.js)

This frontend is wired to the Access Backend.

## Setup

1. Copy env and configure backend URL:
   - `NEXT_PUBLIC_ACCESS_BACKEND_URL=http://localhost:4000`
2. Start access backend on port 4000.
3. Run frontend and use `/login`, `/admin/login`, `/agency/login`, `/user/login`.
4. Live old-backend login route: `https://svp-book.vercel.app/auth/login`.

## Route Protection

- `middleware.ts` protects dashboard/exam routes with `access_token` cookie.
- `AuthGate` verifies active account.
- `RoleGuard` enforces role-level access in pages.
