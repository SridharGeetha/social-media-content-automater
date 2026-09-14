import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import WorkspaceMember from '@/models/WorkspaceMember';
import SocialAccount from '@/models/SocialAccount';
import { encryptSocialToken, canManageSocialAccounts, STATE_COOKIE_NAME, validateOAuthState } from '@/lib/social';
import { exchangeLinkedInCode, fetchLinkedInProfile } from '@/lib/linkedin';

function redirectToAccounts(req: NextRequest, result: 'connected' | 'error', reason?: string) {
  const url = new URL('/dashboard/admin', req.url);
  url.searchParams.set('tab', 'social');
  url.searchParams.set(result, '1');
  if (reason) url.searchParams.set('reason', reason.slice(0, 200));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const stateValue = req.nextUrl.searchParams.get('state') || undefined;
  const cookieState = req.cookies.get(STATE_COOKIE_NAME)?.value;
  const state = validateOAuthState(stateValue);
  const isMatchingState = !!state && !!cookieState && cookieState === stateValue;
  if (!isMatchingState) {
    return redirectToAccounts(req, 'error', 'OAuth state validation failed. Start the connection again.');
  }

  const providerError = req.nextUrl.searchParams.get('error');
  if (providerError) {
    const description = req.nextUrl.searchParams.get('error_description');
    return redirectToAccounts(req, 'error', `${providerError}${description ? `: ${description}` : ''}`);
  }

  const session = await auth();
  if (!session?.user?.id || session.user.id !== state.userId) {
    return redirectToAccounts(req, 'error', 'The OAuth session no longer matches the signed state.');
  }

  await connectToDatabase();
  const membership = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
  if (
    !membership ||
    membership.workspaceId.toString() !== state.workspaceId ||
    !canManageSocialAccounts(membership.role)
  ) {
    return redirectToAccounts(req, 'error', 'The current user is not an Admin of the connecting workspace.');
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return redirectToAccounts(req, 'error', 'LinkedIn did not return an authorization code.');

  try {
    const { accessToken, expiresAt } = await exchangeLinkedInCode(code);
    const profile = await fetchLinkedInProfile(accessToken);
    await SocialAccount.findOneAndUpdate(
      { workspaceId: membership.workspaceId, platform: 'LINKEDIN' },
      {
        workspaceId: membership.workspaceId,
        platform: 'LINKEDIN',
        accountId: profile.sub,
        accountName: profile.name || profile.email || 'LinkedIn account',
        encryptedAccessToken: encryptSocialToken(accessToken),
        expiresAt,
        connectedBy: session.user.id,
        status: 'CONNECTED',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const response = redirectToAccounts(req, 'connected');
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'LinkedIn connection could not be completed.';
    const response = redirectToAccounts(req, 'error', reason);
    response.cookies.delete(STATE_COOKIE_NAME);
    return response;
  }
}