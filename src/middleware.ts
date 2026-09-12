import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const userRole = req.auth?.user?.role;
  const workspaceId = req.auth?.user?.workspaceId;

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isCreateWorkspaceRoute = pathname === '/create-workspace';
  const isAdminDashboard = pathname.startsWith('/dashboard/admin');
  const isManagerDashboard = pathname.startsWith('/dashboard/manager');
  const isCreatorDashboard = pathname.startsWith('/dashboard/creator');
  const isDashboard = pathname.startsWith('/dashboard');

  // 1. If not logged in and requesting protected dashboard/workspace pages, redirect to login
  if (!isLoggedIn && (isDashboard || isCreateWorkspaceRoute)) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. If logged in:
  if (isLoggedIn) {
    // If user has no workspace yet and is trying to access dashboard, send to create-workspace
    if (!workspaceId && isDashboard && !isCreateWorkspaceRoute) {
      return NextResponse.redirect(new URL('/create-workspace', req.nextUrl.origin));
    }

    // If visiting auth pages (/login or /register) without invitation token parameter, redirect to role dashboard
    const hasInviteToken = req.nextUrl.searchParams.get('token');
    if (isAuthRoute && !hasInviteToken) {
      if (!workspaceId) {
        return NextResponse.redirect(new URL('/create-workspace', req.nextUrl.origin));
      }
      if (userRole === 'ADMIN') return NextResponse.redirect(new URL('/dashboard/admin', req.nextUrl.origin));
      if (userRole === 'MANAGER') return NextResponse.redirect(new URL('/dashboard/manager', req.nextUrl.origin));
      if (userRole === 'CREATOR') return NextResponse.redirect(new URL('/dashboard/creator', req.nextUrl.origin));
    }

    // 3. Strict Role-Based Dashboard Protection
    if (isAdminDashboard && userRole !== 'ADMIN') {
      if (userRole === 'MANAGER') return NextResponse.redirect(new URL('/dashboard/manager', req.nextUrl.origin));
      if (userRole === 'CREATOR') return NextResponse.redirect(new URL('/dashboard/creator', req.nextUrl.origin));
      return NextResponse.redirect(new URL('/create-workspace', req.nextUrl.origin));
    }

    if (isManagerDashboard && userRole !== 'MANAGER' && userRole !== 'ADMIN') {
      if (userRole === 'CREATOR') return NextResponse.redirect(new URL('/dashboard/creator', req.nextUrl.origin));
      return NextResponse.redirect(new URL('/dashboard/admin', req.nextUrl.origin));
    }

    if (isCreatorDashboard && userRole !== 'CREATOR' && userRole !== 'ADMIN') {
      if (userRole === 'MANAGER') return NextResponse.redirect(new URL('/dashboard/manager', req.nextUrl.origin));
      return NextResponse.redirect(new URL('/dashboard/admin', req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/create-workspace',
    '/login',
    '/register',
  ],
};
