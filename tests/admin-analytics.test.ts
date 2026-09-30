import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postAggregate: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: { aggregate: mocks.postAggregate } }));

import { GET } from '@/app/api/posts/analytics/route';

const workspace = { toString: () => 'workspace-a' };
const validUrl = 'http://localhost:3000/api/posts/analytics?publishedFrom=2026-09-28T00%3A00%3A00.000Z&publishedTo=2026-10-05T00%3A00%3A00.000Z&scheduledFrom=2026-09-28T00%3A00%3A00.000Z&scheduledTo=2026-10-05T00%3A00%3A00.000Z&timezone=UTC';

describe('Admin post analytics route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: workspace, role: 'ADMIN' }),
    });
    mocks.postAggregate.mockResolvedValue([{
      summary: [{ totalPosts: 10, drafts: 2, pendingReview: 1, scheduled: 3 }],
      publishedDays: [{ date: '2026-09-29', count: 4 }],
      scheduledDays: [],
    }]);
  });

  it('returns workspace-scoped summary and daily chart buckets', async () => {
    const response = await GET(new NextRequest(validUrl));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.totalPosts).toBe(10);
    expect(body.publishedDays).toEqual([{ date: '2026-09-29', count: 4 }]);
    expect(mocks.postAggregate).toHaveBeenCalledWith(expect.arrayContaining([
      { $match: { workspaceId: workspace } },
      expect.objectContaining({ $facet: expect.objectContaining({ publishedDays: expect.any(Array), scheduledDays: expect.any(Array) }) }),
    ]));
  });

  it('rejects non-admin members', async () => {
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: workspace, role: 'MANAGER' }),
    });

    const response = await GET(new NextRequest(validUrl));

    expect(response.status).toBe(403);
    expect(mocks.postAggregate).not.toHaveBeenCalled();
  });

  it('rejects invalid date ranges', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/posts/analytics'));

    expect(response.status).toBe(400);
    expect(mocks.postAggregate).not.toHaveBeenCalled();
  });
});