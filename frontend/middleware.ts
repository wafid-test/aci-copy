import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/auth/login', '/dashboard', '/exam/booking'];
const roleRules: Record<string, string[]> = {
  '/auth/login': ['USER'],
  '/dashboard': ['USER'],
  '/exam/booking': ['USER']
};

function requiredRolesFor(pathname: string): string[] {
  for (const path of Object.keys(roleRules)) {
    if (pathname.startsWith(path)) return roleRules[path];
  }
  return [];
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('access_token')?.value;
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const accessBase = (process.env.NEXT_PUBLIC_ACCESS_BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');

  try {
    const meRes = await fetch(`${accessBase}/api/auth/me`, {
      method: 'GET',
      headers: {
        cookie: req.headers.get('cookie') || ''
      },
      cache: 'no-store'
    });

    if (!meRes.ok) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const payload = await meRes.json();
    const user = payload?.user;
    const requiredRoles = requiredRolesFor(pathname);
    const roleAllowed = requiredRoles.length === 0 || requiredRoles.includes(user?.role);

    if (!user || user.status !== 'ACTIVE' || !roleAllowed) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/login/:path*', '/dashboard/:path*', '/exam/booking/:path*']
};
