import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postFindOne: vi.fn(),
  postFindById: vi.fn(),
  schedulePost: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: {
  findOne: mocks.postFindOne,
  findById: mocks.postFindById,
} }));
vi.mock('@/models/Media', () => ({ default: {} }));
vi.mock('@/models/User', () => ({ default: {} }));
vi.mock('@/lib/qstash', () => ({ schedulePost: mocks.schedulePost }));

import { PATCH } from '@/app/api/posts/[id]/route';

function makePost(targetPlatform: 'INSTAGRAM' | 'LINKEDIN') {
  return {
    _id: { toString: () => 'post-a' },
    workspaceId: { toString: () => 'workspace-a' },
    createdBy: { toString: () => 'user-a' },
    content: 'Caption',
    targetPlatform,
    mediaIds: [],
    status: 'FAILED',
    scheduledAt: null as Date | null,
    publishedAt: null as Date | null,
    publishing: undefined as { platform: string; error?: string } | undefined,
    rejectionFeedback: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Instagram failed schedule recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: 'workspace-a', role: 'ADMIN' }),
    });
    mocks.schedulePost.mockResolvedValue('qstash-message-a');
    mocks.postFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      then: (resolve: (value: null) => void) => resolve(null),
    });
  });

  it('allows Admins to reschedule a failed Instagram post', async () => {
    const post = makePost('INSTAGRAM');
    mocks.postFindOne.mockResolvedValue(post);
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'SCHEDULED', scheduledAt }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(200);
    expect(post.status).toBe('SCHEDULED');
    expect(post.publishing).toEqual({ platform: 'INSTAGRAM' });
    expect(mocks.schedulePost).toHaveBeenCalledWith('post-a', post.scheduledAt, 'INSTAGRAM');
  });

  it('does not relax the existing LinkedIn failed-post scheduling rule', async () => {
    const post = makePost('LINKEDIN');
    mocks.postFindOne.mockResolvedValue(post);

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 60_000).toISOString() }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(409);
    expect(mocks.schedulePost).not.toHaveBeenCalled();
  });

  it('returns the actual QStash enqueue error when a reschedule fails', async () => {
    const post = makePost('INSTAGRAM');
    mocks.postFindOne.mockResolvedValue(post);
    mocks.schedulePost.mockRejectedValue(new Error('QSTASH_TOKEN is missing.'));
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/posts/post-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'SCHEDULED', scheduledAt }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.details).toBe('QSTASH_TOKEN is missing.');
    expect(body.error).toContain('QSTASH_TOKEN is missing.');
    expect(post.status).toBe('FAILED');
    expect(post.publishing).toEqual({ platform: 'INSTAGRAM', error: 'QSTASH_TOKEN is missing.' });
  });
});