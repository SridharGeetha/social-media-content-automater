import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { encryptSocialToken } from '@/lib/social';

const mocks = vi.hoisted(() => ({
  socialFindOne: vi.fn(),
  mediaFindOne: vi.fn(),
  publishInstagramImagePost: vi.fn(),
}));

vi.mock('@/models/SocialAccount', () => ({ default: { findOne: mocks.socialFindOne } }));
vi.mock('@/models/Media', () => ({ default: { findOne: mocks.mediaFindOne } }));
vi.mock('@/lib/instagram', () => ({ publishInstagramImagePost: mocks.publishInstagramImagePost }));

import { publishPostToInstagram } from '@/lib/publish-instagram-post';

const workspaceId = new mongoose.Types.ObjectId('65a000000000000000000001');

describe('Instagram post publishing helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
    mocks.socialFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        status: 'CONNECTED',
        expiresAt: new Date(Date.now() + 60_000),
        encryptedAccessToken: encryptSocialToken('instagram-token'),
        accountId: 'instagram-account',
      }),
    });
    mocks.mediaFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ type: 'image', secureUrl: 'https://res.cloudinary.com/example/photo.jpg' }),
    });
    mocks.publishInstagramImagePost.mockResolvedValue('published-media');
  });

  it('uses only workspace-owned HTTPS media and decrypts the account token for publishing', async () => {
    const post = { content: 'Caption', workspaceId, mediaIds: ['media-a'] };

    await expect(publishPostToInstagram(post)).resolves.toBe('published-media');

    expect(mocks.socialFindOne).toHaveBeenCalledWith({ workspaceId, platform: 'INSTAGRAM' });
    expect(mocks.mediaFindOne).toHaveBeenCalledWith({ _id: 'media-a', workspaceId });
    expect(mocks.publishInstagramImagePost).toHaveBeenCalledWith(
      'instagram-token',
      'instagram-account',
      'Caption',
      'https://res.cloudinary.com/example/photo.jpg'
    );
  });

  it('rejects posts without exactly one attached media item', async () => {
    await expect(publishPostToInstagram({ content: 'Caption', workspaceId, mediaIds: [] }))
      .rejects.toThrow('exactly one attached image');
    expect(mocks.socialFindOne).not.toHaveBeenCalled();
  });

  it('rejects video attachments for this image-only publishing slice', async () => {
    mocks.mediaFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ type: 'video', secureUrl: 'https://example.com/reel.mp4' }),
    });

    await expect(publishPostToInstagram({ content: 'Caption', workspaceId, mediaIds: ['media-a'] }))
      .rejects.toThrow('requires one image');
    expect(mocks.publishInstagramImagePost).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS media URLs before asking Instagram to fetch them', async () => {
    mocks.mediaFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ type: 'image', secureUrl: 'http://example.com/photo.jpg' }),
    });

    await expect(publishPostToInstagram({ content: 'Caption', workspaceId, mediaIds: ['media-a'] }))
      .rejects.toThrow('public HTTPS URL');
    expect(mocks.publishInstagramImagePost).not.toHaveBeenCalled();
  });
});