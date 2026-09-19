import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { ROLES, ROLE_HOME, isRole, ACCESS, hasAccess } from './lib/roles';

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const activeBusinessId = req.auth?.user?.activeBusinessId;
  const pathname = nextUrl.pathname;

  // 1. Auth routes (/login, /register)
  if (pathname === '/login' || pathname === '/register') {
    if (isLoggedIn) {
      const targetHome = isRole(role) ? ROLE_HOME[role] : '/unauthorized';
      return NextResponse.redirect(new URL(targetHome, nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Allow unauthorized and public routes
  if (pathname === '/unauthorized') {
    return NextResponse.next();
  }

  // Helper for redirecting unauthenticated requests with callbackUrl
  const redirectToLogin = () => {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl)
    );
  };

  // 3. Protected Role Routes
  if (pathname.startsWith('/super-admin')) {
    if (!isLoggedIn) return redirectToLogin();
    if (!isRole(role)) return NextResponse.redirect(new URL('/unauthorized', nextUrl));
    if (!hasAccess(ACCESS.superAdmin, role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) return redirectToLogin();
    if (!isRole(role)) return NextResponse.redirect(new URL('/unauthorized', nextUrl));

    // Super Admin can view /dashboard only if they have an active business selected
    if (role === ROLES.SUPER_ADMIN) {
      if (!activeBusinessId) {
        return NextResponse.redirect(new URL(ROLE_HOME[ROLES.SUPER_ADMIN], nextUrl));
      }
      return NextResponse.next();
    }

    if (!hasAccess(ACCESS.company, role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/customer')) {
    if (!isLoggedIn) return redirectToLogin();
    if (!isRole(role)) return NextResponse.redirect(new URL('/unauthorized', nextUrl));
    if (!hasAccess(ACCESS.customer, role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], nextUrl));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)'],
};
