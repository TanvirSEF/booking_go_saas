import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const pathname = nextUrl.pathname;

  // 1. Auth routes (/login, /register)
  if (pathname === '/login' || pathname === '/register') {
    if (isLoggedIn) {
      if (role === 'super admin') {
        return NextResponse.redirect(new URL('/super-admin', nextUrl));
      }
      if (role === 'company') {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
      }
      if (role === 'staff') {
        return NextResponse.redirect(new URL('/staff', nextUrl));
      }
      return NextResponse.redirect(new URL('/customer', nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Protected Role Routes
  if (pathname.startsWith('/super-admin')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl)
      );
    }
    if (role !== 'super admin') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl)
      );
    }
    if (role !== 'company' && role !== 'super admin') {
      return NextResponse.redirect(
        new URL(role === 'staff' ? '/staff' : '/customer', nextUrl)
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/staff')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl)
      );
    }
    if (role !== 'staff' && role !== 'company' && role !== 'super admin') {
      return NextResponse.redirect(new URL('/customer', nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/customer')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, nextUrl)
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)'],
};
