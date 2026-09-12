import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createOAuthState, decryptSocialToken, STATE_COOKIE_NAME } from '@/lib/social';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  socialFindOne: vi.fn(),
  socialFindOneAndUpdate: vi.fn(),
  socialDeleteOne: vi.fn(),
  buildAuthorizationUrl: vi.fn(() => 'https://www.linkedin.com/oauth/v2/authorization?state=test'),
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
vi.mock('@/lib/linkedin', () => ({
  buildLinkedInAuthorizationUrl: mocks.buildAuthorizationUrl,
  exchangeLinkedInCode: mocks.exchangeCode,
  fetchLinkedInProfile: mocks.fetchProfile,
}));

import { GET as connect } from '@/app/api/social/linkedin/connect/route';
import { GET as callback } from '@/app/api/social/linkedin/callback/route';
import { DELETE as disconnect } from '@/app/api/social/linkedin/route';

const workspace = { toString: () => 'workspace-a' };
const adminMember = { workspaceId: workspace, role: 'ADMIN' as const };

describe('LinkedIn social routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = 'test-auth-secret';
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    process.env.LINKEDIN_CLIENT_ID = 'client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'client-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3000/api/social/linkedin/callback';
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.memberFindOne.mockReturnValue({ sort: vi.fn().mockResolvedValue(adminMember) });
    mocks.socialFindOneAndUpdate.mockResolvedValue({});
    mocks.socialDeleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it.each(['MANAGER', 'CREATOR'] as const)('returns 403 for %s on connect', async (role) => {
    mocks.memberFindOne.mockReturnValue({ sort: vi.fn().mockResolvedValue({ workspaceId: workspace, role }) });
    const response = await connect();
    expect(response.status).toBe(403);
  });

  it('redirects an Admin to LinkedIn and sets OAuth state', async () => {
    const response = await connect();
    expect(response.status).toBe(307);
    expect(mocks.buildAuthorizationUrl).toHaveBeenCalledWith(expect.any(String));
    expect(response.headers.get('set-cookie')).toContain(STATE_COOKIE_NAME);
  });

  it('rejects a callback with invalid OAuth state', async () => {
    const request = new NextRequest('http://localhost:3000/api/social/linkedin/callback?code=code&state=invalid');
    const response = await callback(request);
    expect(response.status).toBe(307);
    expect(mocks.exchangeCode).not.toHaveBeenCalled();
  });

  it('stores a successful LinkedIn connection encrypted and workspace-scoped', async () => {
    const state = createOAuthState('user-a', 'workspace-a');
    mocks.exchangeCode.mockResolvedValue({ accessToken: 'linkedin-secret', expiresAt: new Date('2030-01-01') });
    mocks.fetchProfile.mockResolvedValue({ sub: 'linkedin-user', name: 'LinkedIn User' });
    const request = new NextRequest(
      `http://localhost:3000/api/social/linkedin/callback?code=code&state=${state}`,
      { headers: { cookie: `${STATE_COOKIE_NAME}=${state}` } }
    );

    const response = await callback(request);
    expect(response.status).toBe(307);
    expect(mocks.socialFindOneAndUpdate).toHaveBeenCalledWith(
      { workspaceId: workspace, platform: 'LINKEDIN' },
      expect.objectContaining({ workspaceId: workspace, accountId: 'linkedin-user', platform: 'LINKEDIN' }),
      expect.objectContaining({ upsert: true })
    );
    const saved = mocks.socialFindOneAndUpdate.mock.calls[0][1];
    expect(saved.encryptedAccessToken).not.toContain('linkedin-secret');
    expect(decryptSocialToken(saved.encryptedAccessToken)).toBe('linkedin-secret');
  });

  it('disconnects only the current workspace LinkedIn connection', async () => {
    const response = await disconnect();
    expect(response.status).toBe(200);
    expect(mocks.socialDeleteOne).toHaveBeenCalledWith({ workspaceId: workspace, platform: 'LINKEDIN' });
  });
});