import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postFindOne: vi.fn(),
  postFindById: vi.fn(),
  mediaFind: vi.fn(),
  socialAccountFindOne: vi.fn(),
  schedulePost: vi.fn(),
  publishPostImmediately: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: { findOne: mocks.postFindOne, findById: mocks.postFindById } }));
vi.mock('@/models/User', () => ({ default: {} }));
vi.mock('@/models/Media', () => ({ default: { find: mocks.mediaFind } }));
vi.mock('@/models/SocialAccount', () => ({ default: { findOne: mocks.socialAccountFindOne } }));
vi.mock('@/lib/qstash', () => ({ schedulePost: mocks.schedulePost, publishPostImmediately: mocks.publishPostImmediately }));

import { PATCH } from '@/app/api/posts/[id]/route';

describe('Post update publishing data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: 'workspace-a', role: 'ADMIN' }),
    });
    mocks.mediaFind.mockResolvedValue([{ _id: 'media-new' }]);
    mocks.socialAccountFindOne.mockReturnValue({ select: vi.fn().mockResolvedValue({ status: 'CONNECTED' }) });
    mocks.schedulePost.mockResolvedValue('scheduled-message');
    mocks.publishPostImmediately.mockResolvedValue('immediate-message');
    mocks.postFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      then: (resolve: (post: null) => void) => resolve(null),
    });
  });

  it('saves edited content, media, platform, and schedule and queues the updated destination', async () => {
    const originalSchedule = new Date(Date.now() + 5 * 60_000);
    const updatedSchedule = new Date(Date.now() + 10 * 60_000);
    const media = {
      _id: 'media-new',
      type: 'image',
      secureUrl: 'https://cdn.example.com/new-image.png',
      cloudinaryUrl: 'https://cdn.example.com/new-image.png',
    };
    const post = {
      _id: { toString: () => 'post-a' },
      workspaceId: { toString: () => 'workspace-a' },
      createdBy: { toString: () => 'user-a' },
      content: 'Original content',
      targetPlatform: 'LINKEDIN',
      mediaIds: [],
      status: 'SCHEDULED',
      scheduledAt: originalSchedule,
      publishedAt: null,
      publishing: undefined,
      rejectionFeedback: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.postFindOne.mockResolvedValue(post);
    mocks.postFindById.mockImplementation(() => {
      const populatedPost = {
        ...post,
        createdBy: { _id: { toString: () => 'user-a' }, name: 'Admin', email: 'admin@example.com' },
        mediaIds: [media],
      };
      const query = Promise.resolve(populatedPost);
      return { populate: vi.fn().mockReturnThis(), then: query.then.bind(query) };
    });

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: 'Updated content',
          mediaIds: ['media-new'],
          targetPlatform: 'INSTAGRAM',
          status: 'SCHEDULED',
          scheduledAt: updatedSchedule.toISOString(),
        }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(post.content).toBe('Updated content');
    expect(post.mediaIds).toEqual(['media-new']);
    expect(post.targetPlatform).toBe('INSTAGRAM');
    expect(post.scheduledAt).toEqual(updatedSchedule);
    expect(body.post).toMatchObject({
      content: 'Updated content',
      mediaIds: ['media-new'],
      targetPlatform: 'INSTAGRAM',
      scheduledAt: updatedSchedule.toISOString(),
    });
    expect(mocks.schedulePost).toHaveBeenCalledWith('post-a', updatedSchedule, 'INSTAGRAM');
  });

  it('allows Creators to edit an existing submission while it remains in review', async () => {
    const post = {
      _id: { toString: () => 'post-a' },
      workspaceId: { toString: () => 'workspace-a' },
      createdBy: { toString: () => 'user-a' },
      content: 'Original content',
      targetPlatform: 'LINKEDIN',
      mediaIds: [],
      status: 'PENDING_REVIEW',
      scheduledAt: null as Date | null,
      publishedAt: null as Date | null,
      publishing: undefined as { platform: string; error?: string } | undefined,
      rejectionFeedback: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: 'workspace-a', role: 'CREATOR' }),
    });
    mocks.postFindOne.mockResolvedValue(post);

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Creator edit', status: 'PENDING_REVIEW' }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(200);
    expect(post.content).toBe('Creator edit');
    expect(post.status).toBe('PENDING_REVIEW');
    expect(post.save).toHaveBeenCalledOnce();
  });

  it('does not mutate a post while its publishing process is active', async () => {
    const post = {
      _id: { toString: () => 'post-a' },
      workspaceId: { toString: () => 'workspace-a' },
      createdBy: { toString: () => 'user-a' },
      content: 'Original content',
      targetPlatform: 'INSTAGRAM',
      mediaIds: ['media-old'],
      status: 'PROCESSING',
      scheduledAt: null,
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.postFindOne.mockResolvedValue(post);

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Updated content' }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(409);
    expect(post.content).toBe('Original content');
    expect(post.save).not.toHaveBeenCalled();
  });

  it('queues an approved post on its new platform after a destination edit', async () => {
    const post = {
      _id: { toString: () => 'post-a' },
      workspaceId: { toString: () => 'workspace-a' },
      createdBy: { toString: () => 'user-a' },
      content: 'Approved content',
      targetPlatform: 'LINKEDIN',
      mediaIds: [],
      status: 'APPROVED',
      scheduledAt: null as Date | null,
      publishedAt: null as Date | null,
      publishing: undefined as { platform: string; error?: string } | undefined,
      rejectionFeedback: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mocks.postFindOne.mockResolvedValue(post);

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetPlatform: 'INSTAGRAM' }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(200);
    expect(post.targetPlatform).toBe('INSTAGRAM');
    expect(mocks.publishPostImmediately).toHaveBeenCalledWith('post-a', 'INSTAGRAM');
  });
});