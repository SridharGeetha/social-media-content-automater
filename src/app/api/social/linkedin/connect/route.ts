import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import WorkspaceMember from '@/models/WorkspaceMember';
import { buildLinkedInAuthorizationUrl } from '@/lib/linkedin';
import { canManageSocialAccounts, createOAuthState, STATE_COOKIE_NAME } from '@/lib/social';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  await connectToDatabase();
  const membership = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
  if (!membership) {
    return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
  }
  if (!canManageSocialAccounts(membership.role)) {
    return NextResponse.json({ error: 'Forbidden. Only Workspace Admins can manage social accounts.' }, { status: 403 });
  }

  try {
    const state = createOAuthState(session.user.id, membership.workspaceId.toString());
    const response = NextResponse.redirect(buildLinkedInAuthorizationUrl(state));
    response.cookies.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'LinkedIn integration is not configured.' }, { status: 500 });
  }
}