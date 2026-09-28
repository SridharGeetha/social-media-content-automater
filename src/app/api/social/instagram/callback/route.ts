import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import WorkspaceMember from '@/models/WorkspaceMember';
import SocialAccount from '@/models/SocialAccount';
import {
  canManageSocialAccounts,
  encryptSocialToken,
  INSTAGRAM_STATE_COOKIE_NAME,
  validateOAuthState,
} from '@/lib/social';
import { exchangeInstagramCode, fetchInstagramProfile } from '@/lib/instagram';

function redirectToAccounts(req: NextRequest, result: 'connected' | 'error', reason?: string) {
  const url = new URL('/dashboard/admin', req.url);
  url.searchParams.set('tab', 'social');
  url.searchParams.set(result, '1');
  if (reason) url.searchParams.set('reason', reason.slice(0, 200));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const stateValue = req.nextUrl.searchParams.get('state') || undefined;
  const cookieState = req.cookies.get(INSTAGRAM_STATE_COOKIE_NAME)?.value;
  const state = validateOAuthState(stateValue);
  if (!state || !cookieState || cookieState !== stateValue) {
    return redirectToAccounts(req, 'error', 'OAuth state validation failed. Start the connection again.');
  }

  const providerError = req.nextUrl.searchParams.get('error');
  if (providerError) {
    const description = req.nextUrl.searchParams.get('error_description');
    const response = redirectToAccounts(req, 'error', `${providerError}${description ? `: ${description}` : ''}`);
    response.cookies.delete(INSTAGRAM_STATE_COOKIE_NAME);
    return response;
  }

  const session = await auth();
  if (!session?.user?.id || session.user.id !== state.userId) {
    const response = redirectToAccounts(req, 'error', 'The OAuth session no longer matches the signed state.');
    response.cookies.delete(INSTAGRAM_STATE_COOKIE_NAME);
    return response;
  }

  await connectToDatabase();
  const membership = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
  if (
    !membership ||
    membership.workspaceId.toString() !== state.workspaceId ||
    !canManageSocialAccounts(membership.role)
  ) {
    const response = redirectToAccounts(req, 'error', 'The current user is not an Admin of the connecting workspace.');
    response.cookies.delete(INSTAGRAM_STATE_COOKIE_NAME);
    return response;
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    const response = redirectToAccounts(req, 'error', 'Instagram did not return an authorization code.');
    response.cookies.delete(INSTAGRAM_STATE_COOKIE_NAME);
    return response;
  }

  try {
    const { accessToken, expiresAt } = await exchangeInstagramCode(code);
    const profile = await fetchInstagramProfile(accessToken);
    await SocialAccount.findOneAndUpdate(
      { workspaceId: membership.workspaceId, platform: 'INSTAGRAM' },
      {
        workspaceId: membership.workspaceId,
        platform: 'INSTAGRAM',
        accountId: profile.user_id,
        accountName: profile.username || 'Instagram account',
        encryptedAccessToken: encryptSocialToken(accessToken),
        expiresAt,
        connectedBy: session.user.id,
        status: 'CONNECTED',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const response = redirectToAccounts(req, 'connected');
    response.cookies.delete(INSTAGRAM_STATE_COOKIE_NAME);
    return response;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Instagram connection could not be completed.';
    const response = redirectToAccounts(req, 'error', reason);
    response.cookies.delete(INSTAGRAM_STATE_COOKIE_NAME);
    return response;
  }
}