import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  connectToDatabase: vi.fn(),
  memberFindOne: vi.fn(),
  postFindOne: vi.fn(),
  postFindOneAndUpdate: vi.fn(),
  postUpdateOne: vi.fn(),
  publishPostToInstagram: vi.fn(),
  receiverVerify: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/db', () => ({ default: mocks.connectToDatabase }));
vi.mock('@/models/WorkspaceMember', () => ({ default: { findOne: mocks.memberFindOne } }));
vi.mock('@/models/Post', () => ({ default: {
  findOne: mocks.postFindOne,
  findOneAndUpdate: mocks.postFindOneAndUpdate,
  updateOne: mocks.postUpdateOne,
} }));
vi.mock('@/lib/publish-instagram-post', () => ({ publishPostToInstagram: mocks.publishPostToInstagram }));
vi.mock('@/lib/qstash', () => ({ getQStashReceiver: () => ({ verify: mocks.receiverVerify }) }));

import { POST as publishNow } from '@/app/api/posts/[id]/instagram/route';
import { POST as publishScheduled } from '@/app/api/publish/instagram/route';

const adminMembership = { workspaceId: 'workspace-a', role: 'ADMIN' };

function makePost(status: string) {
  return {
    _id: 'post-a',
    workspaceId: 'workspace-a',
    targetPlatform: 'INSTAGRAM',
    content: 'Caption',
    mediaIds: ['media-a'],
    status,
    publishing: undefined as { platform: string; externalPostId?: string; publishedAt?: Date } | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Instagram publishing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({ sort: vi.fn().mockResolvedValue(adminMembership) });
    mocks.publishPostToInstagram.mockResolvedValue('instagram-media-a');
    mocks.postFindOneAndUpdate.mockImplementation(async (_filter, update) => ({
      ...makePost('PROCESSING'),
      ...update.$set,
    }));
    mocks.postUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mocks.receiverVerify.mockResolvedValue(true);
  });

  it('publishes an approved Instagram post immediately and records its destination', async () => {
    const post = makePost('APPROVED');
    mocks.postFindOne.mockResolvedValue(post);

    const response = await publishNow(new Request('http://localhost:3000'), { params: Promise.resolve({ id: 'post-a' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.postId).toBe('instagram-media-a');
    expect(mocks.postFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED', targetPlatform: 'INSTAGRAM' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'PROCESSING' }) }),
      { new: true }
    );
    expect(mocks.postUpdateOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'PUBLISHED', 'publishing.externalPostId': 'instagram-media-a' }) })
    );
    expect(mocks.publishPostToInstagram).toHaveBeenCalledWith(expect.objectContaining({ status: 'PROCESSING' }));
  });

  it('does not call Instagram if another request has already claimed the post', async () => {
    mocks.postFindOne.mockResolvedValue(makePost('APPROVED'));
    mocks.postFindOneAndUpdate.mockResolvedValue(null);

    const response = await publishNow(new Request('http://localhost:3000'), { params: Promise.resolve({ id: 'post-a' }) });

    expect(response.status).toBe(409);
    expect(mocks.publishPostToInstagram).not.toHaveBeenCalled();
  });

  it('does not immediately publish a scheduled post through the manual endpoint', async () => {
    mocks.postFindOne.mockResolvedValue(makePost('SCHEDULED'));

    const response = await publishNow(new Request('http://localhost:3000'), { params: Promise.resolve({ id: 'post-a' }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('approved Instagram posts');
    expect(mocks.postFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.publishPostToInstagram).not.toHaveBeenCalled();
  });

  it('restores the prior status and records a useful error after a Meta failure', async () => {
    mocks.postFindOne.mockResolvedValue(makePost('APPROVED'));
    mocks.publishPostToInstagram.mockRejectedValue(new Error('Instagram rejected this image.'));

    const response = await publishNow(new Request('http://localhost:3000'), { params: Promise.resolve({ id: 'post-a' }) });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe('Instagram rejected this image.');
    expect(mocks.postUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSING' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'APPROVED', 'publishing.error': 'Instagram rejected this image.' }) })
    );
  });

  it('requires a valid QStash signature before scheduled publishing', async () => {
    mocks.receiverVerify.mockResolvedValue(false);
    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'invalid' },
      body: JSON.stringify({ postId: 'post-a' }),
    });

    const response = await publishScheduled(request);

    expect(response.status).toBe(401);
    expect(mocks.postFindOne).not.toHaveBeenCalled();
  });

  it('publishes a scheduled Instagram post and is idempotent after success', async () => {
    const post = makePost('SCHEDULED');
    mocks.postFindOne.mockResolvedValue(post);
    const makeRequest = () => new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a' }),
    });

    const response = await publishScheduled(makeRequest());
    const body = await response.json();
    const repeatedResponse = await publishScheduled(makeRequest());

    expect(response.status).toBe(200);
    expect(repeatedResponse.status).toBe(200);
    expect(body.postId).toBe('instagram-media-a');
    expect(post.status).toBe('PUBLISHED');
    expect(post.publishing).toMatchObject({ platform: 'INSTAGRAM', externalPostId: 'instagram-media-a' });
    expect(mocks.publishPostToInstagram).toHaveBeenCalledTimes(1);
  });
});