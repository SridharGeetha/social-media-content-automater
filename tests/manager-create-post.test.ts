import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postCreate: vi.fn(),
  postFindById: vi.fn(),
  mediaFind: vi.fn(),
  schedulePost: vi.fn(),
  publishPostImmediately: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: { create: mocks.postCreate, findById: mocks.postFindById } }));
vi.mock('@/models/User', () => ({ default: {} }));
vi.mock('@/models/Media', () => ({ default: { find: mocks.mediaFind } }));
vi.mock('@/models/SocialAccount', () => ({ default: { findOne: vi.fn() } }));
vi.mock('@/lib/qstash', () => ({
  schedulePost: mocks.schedulePost,
  publishPostImmediately: mocks.publishPostImmediately,
}));

import { POST } from '@/app/api/posts/route';

function makePost(status: string) {
  return {
    _id: { toString: () => 'post-manager-a' },
    workspaceId: { toString: () => 'workspace-a' },
    createdBy: { toString: () => 'manager-a' },
    content: 'Manager post',
    platform: 'LINKEDIN',
    targetPlatform: 'LINKEDIN',
    mediaIds: [],
    status,
    scheduledAt: null as Date | null,
    publishedAt: null as Date | null,
    publishing: undefined as { platform: string; error?: string } | undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Manager post creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'manager-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: 'workspace-a', role: 'MANAGER' }),
    });
    mocks.mediaFind.mockResolvedValue([]);
    mocks.schedulePost.mockResolvedValue('scheduled-message');
    mocks.publishPostImmediately.mockResolvedValue('immediate-message');
    mocks.postFindById.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      then: (resolve: (post: null) => void) => resolve(null),
    });
  });

  it('queues a direct Manager publish through the immediate worker', async () => {
    const post = makePost('APPROVED');
    mocks.postCreate.mockResolvedValue(post);

    const response = await POST(new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Manager post',
        targetPlatform: 'LINKEDIN',
        status: 'APPROVED',
        publishImmediately: true,
      }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.publishPostImmediately).toHaveBeenCalledWith('post-manager-a', 'LINKEDIN');
    expect(mocks.schedulePost).not.toHaveBeenCalled();
  });

  it('schedules a Manager post at the selected future time', async () => {
    const post = makePost('SCHEDULED');
    const scheduledAt = new Date(Date.now() + 60_000);
    post.scheduledAt = scheduledAt;
    mocks.postCreate.mockResolvedValue(post);

    const response = await POST(new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Manager post',
        targetPlatform: 'LINKEDIN',
        status: 'SCHEDULED',
        scheduledAt: scheduledAt.toISOString(),
      }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.schedulePost).toHaveBeenCalledWith('post-manager-a', scheduledAt, 'LINKEDIN');
    expect(mocks.publishPostImmediately).not.toHaveBeenCalled();
  });
});