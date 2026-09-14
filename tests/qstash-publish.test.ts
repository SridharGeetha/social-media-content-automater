import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  receiverVerify: vi.fn(),
  postFindOne: vi.fn(),
  socialAccountFindOne: vi.fn(),
  mediaFind: vi.fn(),
  publishLinkedInTextPost: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/Post', () => ({ default: { findOne: mocks.postFindOne } }));
vi.mock('@/models/SocialAccount', () => ({ default: { findOne: mocks.socialAccountFindOne } }));
vi.mock('@/models/Media', () => ({ default: { find: mocks.mediaFind } }));
vi.mock('@/lib/linkedin', () => ({ publishLinkedInTextPost: mocks.publishLinkedInTextPost }));
vi.mock('@upstash/qstash', () => ({
  Receiver: vi.fn(function Receiver() {
    return { verify: mocks.receiverVerify };
  }),
}));

import { POST } from '@/app/api/publish/route';

describe('QStash publish route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-key';
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-key';
    mocks.receiverVerify.mockResolvedValue(true);
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.socialAccountFindOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      workspaceId: 'workspace-1',
      platform: 'LINKEDIN',
      status: 'CONNECTED',
      accountId: 'workspace-account-id',
      encryptedAccessToken: 'linkedin-token',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mocks.mediaFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ secureUrl: 'https://cdn.example.com/image.png' }]),
    });
  });

  it('rejects requests with an invalid Upstash signature', async () => {
    mocks.receiverVerify.mockResolvedValue(false);

    const response = await POST(
      new NextRequest('http://localhost:3000/api/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'upstash-signature': 'bad-signature' },
        body: JSON.stringify({ postId: 'post-1' }),
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.publishLinkedInTextPost).not.toHaveBeenCalled();
  });

  it('publishes only scheduled posts once and updates the lifecycle', async () => {
    const save = vi.fn(async function save(this: { status: string; publishedAt?: Date; publishing?: unknown }) {
      this.status = 'PUBLISHED';
      this.publishedAt = new Date('2026-01-02');
      this.publishing = { platform: 'LINKEDIN', externalPostId: 'linkedin-123', publishedAt: new Date('2026-01-02') };
      return this;
    });

    const post = {
      _id: 'post-1',
      workspaceId: 'workspace-1',
      content: 'Hello world',
      mediaIds: ['media-1'],
      status: 'SCHEDULED',
      scheduledAt: new Date('2026-01-01T00:00:00Z'),
      publishing: undefined,
      save,
    };

    mocks.postFindOne.mockResolvedValue(post);
    mocks.mediaFind.mockResolvedValue([{ secureUrl: 'https://cdn.example.com/image.png' }]);
    mocks.publishLinkedInTextPost.mockResolvedValue('linkedin-123');

    const response = await POST(
      new NextRequest('http://localhost:3000/api/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'upstash-signature': 'valid-signature' },
        body: JSON.stringify({ postId: 'post-1' }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.publishLinkedInTextPost).toHaveBeenCalledWith(
      'linkedin-token',
      'workspace-account-id',
      expect.stringContaining('Hello world')
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(post.status).toBe('PUBLISHED');
  });
});
