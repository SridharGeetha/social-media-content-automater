const INSTAGRAM_AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const INSTAGRAM_GRAPH_URL = 'https://graph.instagram.com';

interface InstagramTokenResponse {
  access_token?: string;
  user_id?: string | number;
  expires_in?: number;
  error_message?: string;
  error_description?: string;
}

interface InstagramGraphError {
  error?: { message?: string };
  error_message?: string;
}

export interface InstagramProfile {
  user_id: string;
  username?: string;
}

function getInstagramConfig() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const graphApiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || 'v23.0';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Instagram environment variables are missing.');
  }

  return { clientId, clientSecret, redirectUri, graphApiVersion: graphApiVersion.startsWith('v') ? graphApiVersion : `v${graphApiVersion}` };
}

function getInstagramScope(): string {
  return process.env.INSTAGRAM_SCOPE || 'instagram_business_basic,instagram_business_content_publish';
}

function graphUrl(path: string): URL {
  const { graphApiVersion } = getInstagramConfig();
  return new URL(`${INSTAGRAM_GRAPH_URL}/${graphApiVersion}/${path.replace(/^\//, '')}`);
}

async function readError(response: Response, fallback: string): Promise<string> {
  const details = (await response.json().catch(() => null)) as InstagramGraphError | null;
  return details?.error?.message || details?.error_message || fallback;
}

export function buildInstagramAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getInstagramConfig();
  const url = new URL(INSTAGRAM_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', getInstagramScope());
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeInstagramCode(code: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const { clientId, clientSecret, redirectUri } = getInstagramConfig();
  const shortLivedResponse = await fetch(INSTAGRAM_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!shortLivedResponse.ok) {
    throw new Error(await readError(shortLivedResponse, `Instagram token exchange failed with status ${shortLivedResponse.status}.`));
  }

  const shortLivedToken = (await shortLivedResponse.json()) as InstagramTokenResponse;
  if (!shortLivedToken.access_token) {
    throw new Error('Instagram token response did not include an access token.');
  }

  const longLivedUrl = graphUrl('access_token');
  longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longLivedUrl.searchParams.set('client_secret', clientSecret);
  longLivedUrl.searchParams.set('access_token', shortLivedToken.access_token);

  const longLivedResponse = await fetch(longLivedUrl, { method: 'GET' });
  if (!longLivedResponse.ok) {
    throw new Error(await readError(longLivedResponse, `Instagram long-lived token exchange failed with status ${longLivedResponse.status}.`));
  }

  const longLivedToken = (await longLivedResponse.json()) as InstagramTokenResponse;
  if (!longLivedToken.access_token || !longLivedToken.expires_in || longLivedToken.expires_in <= 0) {
    throw new Error('Instagram long-lived token response was incomplete.');
  }

  return {
    accessToken: longLivedToken.access_token,
    expiresAt: new Date(Date.now() + longLivedToken.expires_in * 1000),
  };
}

export async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const url = graphUrl('me');
  url.searchParams.set('fields', 'user_id,username');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!response.ok) {
    throw new Error(await readError(response, `Instagram profile request failed with status ${response.status}.`));
  }

  const profile = (await response.json()) as InstagramProfile;
  if (!profile.user_id) throw new Error('Instagram profile response did not include a user ID.');
  return profile;
}

async function createImageMediaContainer(
  accessToken: string,
  accountId: string,
  caption: string,
  imageUrl: string
): Promise<string> {
  const url = graphUrl(`${encodeURIComponent(accountId)}/media`);
  const body = new URLSearchParams({ caption, image_url: imageUrl });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(await readError(response, `Instagram media container creation failed with status ${response.status}.`));
  }

  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error('Instagram media container response did not include an ID.');
  return result.id;
}

async function verifyImageContainerReady(accessToken: string, containerId: string): Promise<void> {
  const url = graphUrl(encodeURIComponent(containerId));
  url.searchParams.set('fields', 'status_code,status');

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(await readError(response, `Instagram image container status check failed with status ${response.status}.`));
  }

  const result = (await response.json()) as { status_code?: string; status?: string };
  if (result.status_code !== 'FINISHED') {
    const state = result.status_code || 'UNKNOWN';
    const description = result.status ? `: ${result.status}` : '';
    throw new Error(`Instagram image container is not ready to publish (${state})${description}.`);
  }
}

function asInstagramJpegUrl(imageUrl: string): string {
  const url = new URL(imageUrl);
  if (url.hostname !== 'res.cloudinary.com' || !url.pathname.includes('/image/upload/')) {
    throw new Error('Instagram publishing requires a Cloudinary-hosted image so it can be delivered as JPEG.');
  }

  url.pathname = url.pathname.replace('/image/upload/', '/image/upload/f_jpg/');
  return url.toString();
}

export async function publishInstagramImagePost(
  accessToken: string,
  accountId: string,
  caption: string,
  imageUrl: string
): Promise<string> {
  const jpegUrl = asInstagramJpegUrl(imageUrl);
  const containerId = await createImageMediaContainer(accessToken, accountId, caption, jpegUrl);
  await verifyImageContainerReady(accessToken, containerId);

  const url = graphUrl(`${encodeURIComponent(accountId)}/media_publish`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ creation_id: containerId }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, `Instagram publish failed with status ${response.status}.`));
  }

  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error('Instagram publish response did not include a media ID.');
  return result.id;
}