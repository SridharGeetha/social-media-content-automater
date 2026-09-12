const LINKEDIN_AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
const LINKEDIN_SCOPE = 'openid profile email w_member_social';

interface LinkedInTokenResponse {
  access_token?: string;
  expires_in?: number;
}

export interface LinkedInProfile {
  sub: string;
  name?: string;
  email?: string;
}

function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('LinkedIn environment variables are missing.');
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildLinkedInAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getLinkedInConfig();
  const url = new URL(LINKEDIN_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', LINKEDIN_SCOPE);
  return url.toString();
}

export async function exchangeLinkedInCode(code: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig();
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { error?: string; error_description?: string } | null;
    const reason = details?.error_description || details?.error;
    throw new Error(reason ? `LinkedIn token exchange failed: ${reason}` : 'LinkedIn token exchange failed.');
  }

  const data = (await response.json()) as LinkedInTokenResponse;
  if (!data.access_token || !data.expires_in || data.expires_in <= 0) {
    throw new Error('LinkedIn token response was incomplete.');
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`LinkedIn profile request failed with status ${response.status}.`);
  }

  const profile = (await response.json()) as LinkedInProfile;
  if (!profile.sub) {
    throw new Error('LinkedIn profile response was incomplete.');
  }
  return profile;
}

export async function publishLinkedInTextPost(accessToken: string, memberId: string, commentary: string): Promise<string> {
  const response = await fetch(LINKEDIN_POSTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202601',
    },
    body: JSON.stringify({
      author: `urn:li:person:${memberId}`,
      commentary,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
    }),
  });

  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(details?.message || `LinkedIn publish failed with status ${response.status}.`);
  }

  const postId = response.headers.get('x-restli-id') || response.headers.get('x-linkedin-id');
  if (!postId) throw new Error('LinkedIn publish succeeded but returned no post ID.');
  return postId;
}