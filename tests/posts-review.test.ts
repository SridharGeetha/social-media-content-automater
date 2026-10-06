import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postFindOne: vi.fn(),
  schedulePost: vi.fn(),
  publishPostImmediately: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: { findOne: mocks.postFindOne } }));
vi.mock('@/lib/qstash', () => ({
  schedulePost: mocks.schedulePost,
  publishPostImmediately: mocks.publishPostImmediately,
}));

import { POST } from '@/app/api/posts/[id]/review/route';

const workspaceId = { toString: () => 'workspace-a' };

function makePost(scheduledAt: Date | null) {
  return {
    _id: { toString: () => 'post-a' },
    workspaceId,
    targetPlatform: 'LINKEDIN',
    scheduledAt,
    status: 'PENDING_REVIEW',
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Post review publishing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: '64b000000000000000000001' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId, role: 'MANAGER' }),
    });
    mocks.schedulePost.mockResolvedValue('scheduled-message');
    mocks.publishPostImmediately.mockResolvedValue('immediate-message');
  });

  it('preserves a requested schedule and queues it at that time after approval', async () => {
    const scheduledAt = new Date(Date.now() + 60_000);
    const post = makePost(scheduledAt);
    mocks.postFindOne.mockResolvedValue(post);

    const response = await POST(
      new Request('http://localhost:3000/api/posts/post-a/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', scheduledAt: new Date(scheduledAt.getTime() + 60_000).toISOString() }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(200);
    expect(post.status).toBe('SCHEDULED');
    expect(post.scheduledAt).toEqual(scheduledAt);
    expect(mocks.schedulePost).toHaveBeenCalledWith('post-a', scheduledAt, 'LINKEDIN');
    expect(mocks.publishPostImmediately).not.toHaveBeenCalled();
  });

  it('queues an unscheduled approval for immediate publishing', async () => {
    const post = makePost(null);
    mocks.postFindOne.mockResolvedValue(post);

    const response = await POST(
      new Request('http://localhost:3000/api/posts/post-a/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(200);
    expect(post.status).toBe('APPROVED');
    expect(post.scheduledAt).toBeNull();
    expect(mocks.publishPostImmediately).toHaveBeenCalledWith('post-a', 'LINKEDIN');
    expect(mocks.schedulePost).not.toHaveBeenCalled();
  });

  it('allows a Manager to schedule a post that the Creator submitted without a schedule', async () => {
    const post = makePost(null);
    const scheduledAt = new Date(Date.now() + 60_000);
    mocks.postFindOne.mockResolvedValue(post);

    const response = await POST(
      new Request('http://localhost:3000/api/posts/post-a/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', scheduledAt: scheduledAt.toISOString() }),
      }),
      { params: Promise.resolve({ id: 'post-a' }) }
    );

    expect(response.status).toBe(200);
    expect(post.status).toBe('SCHEDULED');
    expect(post.scheduledAt).toEqual(scheduledAt);
    expect(mocks.schedulePost).toHaveBeenCalledWith('post-a', scheduledAt, 'LINKEDIN');
    expect(mocks.publishPostImmediately).not.toHaveBeenCalled();
  });
});