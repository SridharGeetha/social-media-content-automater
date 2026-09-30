import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  workspaceFindById: vi.fn(),
  workspaceSave: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Workspace', () => ({ default: { findById: mocks.workspaceFindById } }));

import { PATCH } from '@/app/api/workspace/route';

describe('workspace settings', () => {
  const workspace = {
    _id: { toString: () => 'workspace-a' },
    name: 'Old name',
    slug: 'original-slug',
    save: mocks.workspaceSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: 'workspace-a', role: 'ADMIN' }),
    });
    mocks.workspaceFindById.mockResolvedValue(workspace);
    mocks.workspaceSave.mockResolvedValue(undefined);
  });

  it('updates the workspace name without changing its slug', async () => {
    const response = await PATCH(new Request('http://localhost/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Updated workspace  ' }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(workspace.name).toBe('Updated workspace');
    expect(workspace.slug).toBe('original-slug');
    expect(mocks.workspaceSave).toHaveBeenCalledOnce();
    expect(body.workspace).toEqual({ id: 'workspace-a', name: 'Updated workspace', slug: 'original-slug' });
  });

  it('does not allow non-admin members to change the workspace name', async () => {
    mocks.memberFindOne.mockReturnValue({
      sort: vi.fn().mockResolvedValue({ workspaceId: 'workspace-a', role: 'MANAGER' }),
    });

    const response = await PATCH(new Request('http://localhost/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated workspace' }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.workspaceSave).not.toHaveBeenCalled();
  });
});