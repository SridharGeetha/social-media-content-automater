import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postFind: vi.fn(),
  invitationFind: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: { find: mocks.postFind } }));
vi.mock('@/models/Invitation', () => ({ default: { find: mocks.invitationFind } }));

import { GET } from '@/app/api/notifications/route';

describe('Notifications API route', () => {
  const workspaceId = { toString: () => 'workspace-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectToDatabase.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated requests with 401', async () => {
    mocks.auth.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('allows Admin to view all workspace post notifications and invitations', async () => {
    mocks.auth.mockResolvedValue({
      user: { id: 'admin-user-id', role: 'ADMIN', workspaceId: 'workspace-123' },
    });

    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        workspaceId,
        role: 'ADMIN',
      }),
    });

    const mockPosts = [
      {
        _id: { toString: () => 'post-1' },
        content: 'Scheduled announcement',
        targetPlatform: 'LINKEDIN',
        status: 'SCHEDULED',
        scheduledAt: new Date('2026-10-01T12:00:00Z'),
        createdAt: new Date('2026-09-30T10:00:00Z'),
        updatedAt: new Date('2026-09-30T10:00:00Z'),
        createdBy: { _id: { toString: () => 'creator-1' }, name: 'Creator One', email: 'c1@test.com' },
      },
      {
        _id: { toString: () => 'post-2' },
        content: 'Published post content',
        targetPlatform: 'INSTAGRAM',
        status: 'PUBLISHED',
        publishedAt: new Date('2026-09-30T09:00:00Z'),
        createdAt: new Date('2026-09-30T08:00:00Z'),
        updatedAt: new Date('2026-09-30T09:00:00Z'),
        createdBy: { _id: { toString: () => 'creator-2' }, name: 'Creator Two', email: 'c2@test.com' },
      },
      {
        _id: { toString: () => 'post-3' },
        content: 'Failed post attempt',
        targetPlatform: 'LINKEDIN',
        status: 'FAILED',
        publishing: { error: 'Invalid access token' },
        createdAt: new Date('2026-09-30T07:00:00Z'),
        updatedAt: new Date('2026-09-30T07:30:00Z'),
        createdBy: { _id: { toString: () => 'creator-1' }, name: 'Creator One', email: 'c1@test.com' },
      },
    ];

    mocks.postFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockPosts),
        }),
      }),
    });

    const mockInvitations = [
      {
        _id: { toString: () => 'inv-1' },
        email: 'newuser@example.com',
        role: 'CREATOR',
        status: 'PENDING',
        expiresAt: new Date('2026-10-07T00:00:00Z'),
        createdAt: new Date('2026-09-30T06:00:00Z'),
      },
      {
        _id: { toString: () => 'inv-2' },
        email: 'joined@example.com',
        role: 'MANAGER',
        status: 'ACCEPTED',
        expiresAt: new Date('2026-10-07T00:00:00Z'),
        createdAt: new Date('2026-09-29T06:00:00Z'),
        updatedAt: new Date('2026-09-29T08:00:00Z'),
      },
    ];

    mocks.invitationFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(mockInvitations),
      }),
    });

    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.role).toBe('ADMIN');
    expect(data.canViewInvitations).toBe(true);
    expect(data.postNotifications).toHaveLength(3);
    expect(data.invitationNotifications).toHaveLength(2);

    // Verify post filter for Admin includes all statuses in workspace
    expect(mocks.postFind).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        status: { $in: ['SCHEDULED', 'PUBLISHED', 'FAILED'] },
      })
    );
    expect(mocks.postFind.mock.calls[0][0].createdBy).toBeUndefined();
    expect(mocks.invitationFind).toHaveBeenCalled();
  });

  it('filters post notifications for Managers to own/reviewed posts and completely excludes invitations', async () => {
    const managerId = 'manager-user-id';
    mocks.auth.mockResolvedValue({
      user: { id: managerId, role: 'MANAGER', workspaceId: 'workspace-123' },
    });

    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        workspaceId,
        role: 'MANAGER',
      }),
    });

    mocks.postFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([
            {
              _id: { toString: () => 'post-mgr-1' },
              content: 'Manager post',
              targetPlatform: 'LINKEDIN',
              status: 'PUBLISHED',
              publishedAt: new Date('2026-09-30T09:00:00Z'),
              createdAt: new Date('2026-09-30T08:00:00Z'),
              updatedAt: new Date('2026-09-30T09:00:00Z'),
              createdBy: { _id: { toString: () => managerId }, name: 'Manager User' },
            },
          ]),
        }),
      }),
    });

    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.role).toBe('MANAGER');
    expect(data.canViewInvitations).toBe(false);
    expect(data.invitationNotifications).toEqual([]);
    expect(mocks.invitationFind).not.toHaveBeenCalled();

    // Verify Manager filter includes $or for createdBy and reviewedBy
    expect(mocks.postFind).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        status: { $in: ['SCHEDULED', 'PUBLISHED', 'FAILED'] },
        $or: [{ createdBy: managerId }, { reviewedBy: managerId }],
      })
    );
  });

  it('filters post notifications for Creators to only their own posts and completely excludes invitations', async () => {
    const creatorId = 'creator-user-id';
    mocks.auth.mockResolvedValue({
      user: { id: creatorId, role: 'CREATOR', workspaceId: 'workspace-123' },
    });

    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        workspaceId,
        role: 'CREATOR',
      }),
    });

    mocks.postFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([
            {
              _id: { toString: () => 'post-cr-1' },
              content: 'Creator post',
              targetPlatform: 'INSTAGRAM',
              status: 'SCHEDULED',
              scheduledAt: new Date('2026-10-01T12:00:00Z'),
              createdAt: new Date('2026-09-30T08:00:00Z'),
              updatedAt: new Date('2026-09-30T09:00:00Z'),
              createdBy: { _id: { toString: () => creatorId }, name: 'Creator User' },
            },
          ]),
        }),
      }),
    });

    const req = new NextRequest('http://localhost/api/notifications');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.role).toBe('CREATOR');
    expect(data.canViewInvitations).toBe(false);
    expect(data.invitationNotifications).toEqual([]);
    expect(mocks.invitationFind).not.toHaveBeenCalled();

    // Verify Creator filter is strictly createdBy === creatorId
    expect(mocks.postFind).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        status: { $in: ['SCHEDULED', 'PUBLISHED', 'FAILED'] },
        createdBy: creatorId,
      })
    );
  });
});
