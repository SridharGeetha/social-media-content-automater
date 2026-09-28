import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildInstagramAuthorizationUrl,
  exchangeInstagramCode,
  fetchInstagramProfile,
  publishInstagramImagePost,
} from '@/lib/instagram';

describe('Instagram API helpers', () => {
  beforeEach(() => {
    process.env.INSTAGRAM_CLIENT_ID = 'instagram-client';
    process.env.INSTAGRAM_CLIENT_SECRET = 'instagram-secret';
    process.env.INSTAGRAM_REDIRECT_URI = 'http://localhost:3000/api/social/instagram/callback';
    process.env.INSTAGRAM_SCOPE = 'instagram_business_basic,instagram_business_content_publish';
    process.env.INSTAGRAM_GRAPH_API_VERSION = 'v23.0';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('builds the Business Login authorization URL with configured scopes and state', () => {
    const url = new URL(buildInstagramAuthorizationUrl('signed-state'));

    expect(url.origin + url.pathname).toBe('https://www.instagram.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('instagram-client');
    expect(url.searchParams.get('redirect_uri')).toBe(process.env.INSTAGRAM_REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe(process.env.INSTAGRAM_SCOPE);
    expect(url.searchParams.get('state')).toBe('signed-state');
  });

  it('exchanges the callback code for a long-lived token and expiry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'short-token', user_id: 123 }))
      .mockResolvedValueOnce(Response.json({ access_token: 'long-token', expires_in: 5_000 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await exchangeInstagramCode('auth-code');

    expect(result.accessToken).toBe('long-token');
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('grant_type=ig_exchange_token');
  });

  it('loads the professional profile using the returned user ID and username', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ user_id: 'ig-user-7', username: 'studio' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchInstagramProfile('token')).resolves.toEqual({ user_id: 'ig-user-7', username: 'studio' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v23.0/me?fields=user_id%2Cusername');
  });

  it('creates and publishes an image container', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: 'container-1' }))
      .mockResolvedValueOnce(Response.json({ status_code: 'FINISHED', status: 'Finished' }))
      .mockResolvedValueOnce(Response.json({ id: 'published-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishInstagramImagePost('token', 'ig-user-7', 'Caption', 'https://res.cloudinary.com/demo/image/upload/photo.png'))
      .resolves.toBe('published-1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/ig-user-7/media');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/container-1?fields=status_code%2Cstatus');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/ig-user-7/media_publish');
    expect(fetchMock.mock.calls[0][1]?.body).toEqual(new URLSearchParams({
      caption: 'Caption',
      image_url: 'https://res.cloudinary.com/demo/image/upload/f_jpg/photo.png',
    }));
    expect(fetchMock.mock.calls[2][1]?.body).toEqual(new URLSearchParams({ creation_id: 'container-1' }));
  });

  it('returns a clear Graph API error when container creation is rejected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(
      { error: { message: 'Image URL is not accessible.' } },
      { status: 400 }
    ));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishInstagramImagePost('token', 'ig-user-7', 'Caption', 'https://res.cloudinary.com/demo/image/upload/photo.jpg'))
      .rejects.toThrow('Image URL is not accessible.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not publish a container while Instagram reports it is still processing', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: 'container-2' }))
      .mockResolvedValueOnce(Response.json({ status_code: 'IN_PROGRESS', status: 'Processing' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishInstagramImagePost(
      'token',
      'ig-user-7',
      'Caption',
      'https://res.cloudinary.com/demo/image/upload/photo.webp'
    )).rejects.toThrow('not ready to publish (IN_PROGRESS): Processing');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('/media_publish');
  });
});