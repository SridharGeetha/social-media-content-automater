import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createOAuthState, decryptSocialToken, INSTAGRAM_STATE_COOKIE_NAME } from '@/lib/social';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  socialFindOne: vi.fn(),
  socialFindOneAndUpdate: vi.fn(),
  socialDeleteOne: vi.fn(),
  buildAuthorizationUrl: vi.fn(() => 'https://www.instagram.com/oauth/authorize?state=test'),
  exchangeCode: vi.fn(),
  fetchProfile: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/SocialAccount', () => ({
  default: {
    findOne: mocks.socialFindOne,
    findOneAndUpdate: mocks.socialFindOneAndUpdate,
    deleteOne: mocks.socialDeleteOne,
  },
}));
vi.mock('@/lib/instagram', () => ({
  buildInstagramAuthorizationUrl: mocks.buildAuthorizationUrl,
  exchangeInstagramCode: mocks.exchangeCode,
  fetchInstagramProfile: mocks.fetchProfile,
}));

import { GET as getAccount, DELETE as disconnect } from '@/app/api/social/instagram/route';
import { GET as connect } from '@/app/api/social/instagram/connect/route';
import { GET as callback } from '@/app/api/social/instagram/callback/route';

const workspace = { toString: () => 'workspace-a' };
const adminMember = { workspaceId: workspace, role: 'ADMIN' as const };

describe('Instagram social routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'instagram-test-auth-secret';
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({ sort: vi.fn().mockResolvedValue(adminMember) });
    mocks.socialFindOneAndUpdate.mockResolvedValue({});
    mocks.socialDeleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it('redirects an Admin to Instagram and sets an independent OAuth state cookie', async () => {
    const response = await connect();

    expect(response.status).toBe(307);
    expect(mocks.buildAuthorizationUrl).toHaveBeenCalledWith(expect.any(String));
    expect(response.headers.get('set-cookie')).toContain(INSTAGRAM_STATE_COOKIE_NAME);
  });

  it('rejects a callback with a mismatched state cookie', async () => {
    const state = createOAuthState('user-a', 'workspace-a');
    const request = new NextRequest(
      `http://localhost:3000/api/social/instagram/callback?code=code&state=${state}`,
      { headers: { cookie: `${INSTAGRAM_STATE_COOKIE_NAME}=different-state` } }
    );

    const response = await callback(request);

    expect(response.status).toBe(307);
    expect(mocks.exchangeCode).not.toHaveBeenCalled();
  });

  it('stores a successful Instagram connection encrypted and workspace-scoped', async () => {
    const state = createOAuthState('user-a', 'workspace-a');
    mocks.exchangeCode.mockResolvedValue({ accessToken: 'instagram-secret', expiresAt: new Date('2030-01-01') });
    mocks.fetchProfile.mockResolvedValue({ user_id: 'instagram-user', username: 'studio' });
    const request = new NextRequest(
      `http://localhost:3000/api/social/instagram/callback?code=code&state=${state}`,
      { headers: { cookie: `${INSTAGRAM_STATE_COOKIE_NAME}=${state}` } }
    );

    const response = await callback(request);

    expect(response.status).toBe(307);
    expect(mocks.socialFindOneAndUpdate).toHaveBeenCalledWith(
      { workspaceId: workspace, platform: 'INSTAGRAM' },
      expect.objectContaining({
        workspaceId: workspace,
        platform: 'INSTAGRAM',
        accountId: 'instagram-user',
        accountName: 'studio',
      }),
      expect.objectContaining({ upsert: true })
    );
    const saved = mocks.socialFindOneAndUpdate.mock.calls[0][1];
    expect(saved.encryptedAccessToken).not.toContain('instagram-secret');
    expect(decryptSocialToken(saved.encryptedAccessToken)).toBe('instagram-secret');
  });

  it('returns Instagram status without token data and disconnects only Instagram', async () => {
    mocks.socialFindOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          platform: 'INSTAGRAM',
          accountId: 'instagram-user',
          accountName: 'studio',
          expiresAt: new Date('2030-01-01'),
          status: 'CONNECTED',
          createdAt: new Date('2026-01-01'),
        }),
      }),
    });

    const statusResponse = await getAccount();
    const statusBody = await statusResponse.json();
    const disconnectResponse = await disconnect();

    expect(statusBody.connected).toBe(true);
    expect(statusBody.account.accountName).toBe('studio');
    expect(JSON.stringify(statusBody)).not.toContain('encryptedAccessToken');
    expect(disconnectResponse.status).toBe(200);
    expect(mocks.socialDeleteOne).toHaveBeenCalledWith({ workspaceId: workspace, platform: 'INSTAGRAM' });
  });

  it('lets Creators read connection status without exposing account details', async () => {
    mocks.memberFindOne.mockReturnValue({ sort: vi.fn().mockResolvedValue({ workspaceId: workspace, role: 'CREATOR' }) });
    mocks.socialFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ status: 'CONNECTED' }) });

    const response = await getAccount();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ connected: true });
  });
});