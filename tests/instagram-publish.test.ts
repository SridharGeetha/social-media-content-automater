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
  createInstagramContainerForPost: vi.fn(),
  getInstagramContainerStatusForPost: vi.fn(),
  publishInstagramContainerForPost: vi.fn(),
  scheduleInstagramContainerRetry: vi.fn(),
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
vi.mock('@/lib/publish-instagram-post', () => ({
  publishPostToInstagram: mocks.publishPostToInstagram,
  createInstagramContainerForPost: mocks.createInstagramContainerForPost,
  getInstagramContainerStatusForPost: mocks.getInstagramContainerStatusForPost,
  publishInstagramContainerForPost: mocks.publishInstagramContainerForPost,
}));
vi.mock('@/lib/qstash', () => ({
  getQStashReceiver: () => ({ verify: mocks.receiverVerify }),
  scheduleInstagramContainerRetry: mocks.scheduleInstagramContainerRetry,
  INSTAGRAM_CONTAINER_RETRY_LIMIT: 5,
}));

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
    scheduledAt: null as Date | null,
    updatedAt: new Date(),
    publishing: undefined as { platform: string; externalPostId?: string; containerId?: string; publishedAt?: Date; startedAt?: Date } | undefined,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

let scheduledPost: ReturnType<typeof makePost> | undefined;

describe('Instagram publishing routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduledPost = undefined;
    mocks.auth.mockResolvedValue({ user: { id: 'user-a' } });
    mocks.connectToDatabase.mockResolvedValue(undefined);
    mocks.memberFindOne.mockReturnValue({ sort: vi.fn().mockResolvedValue(adminMembership) });
    mocks.publishPostToInstagram.mockResolvedValue('instagram-media-a');
    mocks.createInstagramContainerForPost.mockResolvedValue('instagram-container-a');
    mocks.getInstagramContainerStatusForPost.mockResolvedValue({ statusCode: 'FINISHED', status: 'Finished' });
    mocks.publishInstagramContainerForPost.mockResolvedValue('instagram-media-a');
    mocks.scheduleInstagramContainerRetry.mockResolvedValue('qstash-retry-a');
    mocks.postFindOneAndUpdate.mockImplementation(async (_filter, update) => ({
      ...(scheduledPost || makePost('PROCESSING')),
      status: 'PROCESSING',
      publishing: {
        platform: 'INSTAGRAM',
        startedAt: update.$set['publishing.startedAt'],
        containerId: scheduledPost?.publishing?.containerId,
      },
    }));
    mocks.postUpdateOne.mockImplementation(async (_filter, update) => {
      if (scheduledPost) {
        if (update.$set.status) scheduledPost.status = update.$set.status;
        if (update.$set['publishing.containerId']) {
          scheduledPost.publishing = { ...scheduledPost.publishing, platform: 'INSTAGRAM', containerId: update.$set['publishing.containerId'] };
        }
        if (update.$set['publishing.externalPostId']) {
          scheduledPost.publishing = {
            platform: 'INSTAGRAM',
            externalPostId: update.$set['publishing.externalPostId'],
            publishedAt: update.$set['publishing.publishedAt'],
          };
        }
      }
      return { matchedCount: 1 };
    });
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
    scheduledPost = post;
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
    expect(mocks.publishInstagramContainerForPost).toHaveBeenCalledTimes(1);
  });

  it('publishes an approved unscheduled Instagram post from the immediate queue', async () => {
    const post = makePost('APPROVED');
    scheduledPost = post;
    mocks.postFindOne.mockResolvedValue(post);
    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a' }),
    });

    const response = await publishScheduled(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.postId).toBe('instagram-media-a');
    expect(mocks.postFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED', targetPlatform: 'INSTAGRAM' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'PROCESSING' }) }),
      { new: true }
    );
    expect(post.status).toBe('PUBLISHED');
  });

  it('ignores an old QStash delivery after the schedule was changed', async () => {
    const post = makePost('SCHEDULED');
    post.scheduledAt = new Date('2026-10-01T12:00:00.000Z');
    mocks.postFindOne.mockResolvedValue(post);

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a', scheduledAt: '2026-10-01T11:00:00.000Z' }),
    });
    const response = await publishScheduled(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('outdated');
    expect(mocks.postFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.publishPostToInstagram).not.toHaveBeenCalled();
  });

  it('ignores an old container retry after an edit invalidates that container', async () => {
    const post = makePost('SCHEDULED');
    post.scheduledAt = new Date(Date.now() + 60_000);
    post.publishing = { platform: 'INSTAGRAM', containerId: 'new-container' };
    mocks.postFindOne.mockResolvedValue(post);

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({
        postId: 'post-a',
        scheduledAt: post.scheduledAt.toISOString(),
        containerId: 'old-container',
        retryAttempt: 1,
      }),
    });
    const response = await publishScheduled(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toContain('outdated Instagram container');
    expect(mocks.postFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.publishPostToInstagram).not.toHaveBeenCalled();
  });

  it('defers the same container when Instagram reports IN_PROGRESS', async () => {
    const post = makePost('SCHEDULED');
    scheduledPost = post;
    mocks.postFindOne.mockResolvedValue(post);
    mocks.getInstagramContainerStatusForPost.mockResolvedValue({ statusCode: 'IN_PROGRESS', status: 'IN_PROGRESS' });

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a' }),
    });
    const response = await publishScheduled(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('SCHEDULED');
    expect(body.message).toContain('follow-up check');
    expect(mocks.scheduleInstagramContainerRetry).toHaveBeenCalledWith(
      'post-a',
      expect.any(Date),
      'instagram-container-a',
      1
    );
    expect(mocks.publishInstagramContainerForPost).not.toHaveBeenCalled();
    expect(scheduledPost?.publishing?.containerId).toBe('instagram-container-a');
  });

  it('resumes a queued container status check without creating another container', async () => {
    const post = makePost('SCHEDULED');
    post.publishing = { platform: 'INSTAGRAM', containerId: 'instagram-container-existing' };
    scheduledPost = post;
    mocks.postFindOne.mockResolvedValue(post);
    mocks.getInstagramContainerStatusForPost.mockResolvedValue({ statusCode: 'FINISHED', status: 'FINISHED' });

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a', containerId: 'instagram-container-existing', retryAttempt: 1 }),
    });
    const response = await publishScheduled(request);

    expect(response.status).toBe(200);
    expect(mocks.createInstagramContainerForPost).not.toHaveBeenCalled();
    expect(mocks.getInstagramContainerStatusForPost).toHaveBeenCalledWith(expect.anything(), 'instagram-container-existing');
    expect(mocks.publishInstagramContainerForPost).toHaveBeenCalledWith(expect.anything(), 'instagram-container-existing');
  });

  it('fails with a useful status after the container retry budget is exhausted', async () => {
    const post = makePost('SCHEDULED');
    post.publishing = { platform: 'INSTAGRAM', containerId: 'instagram-container-old' };
    scheduledPost = post;
    mocks.postFindOne.mockResolvedValue(post);
    mocks.getInstagramContainerStatusForPost.mockResolvedValue({ statusCode: 'IN_PROGRESS', status: 'IN_PROGRESS' });

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a', containerId: 'instagram-container-old', retryAttempt: 5 }),
    });
    const response = await publishScheduled(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('FAILED');
    expect(body.message).toContain('remained IN_PROGRESS');
    expect(mocks.scheduleInstagramContainerRetry).not.toHaveBeenCalled();
    expect(scheduledPost?.status).toBe('FAILED');
  });

  it('asks QStash to retry while a fresh processing lease is active', async () => {
    const post = makePost('PROCESSING');
    post.updatedAt = new Date();
    post.publishing = { platform: 'INSTAGRAM', startedAt: new Date() };
    mocks.postFindOne.mockResolvedValue(post);

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a' }),
    });
    const response = await publishScheduled(request);

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(mocks.postFindOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.publishPostToInstagram).not.toHaveBeenCalled();
  });

  it('reclaims a processing post whose lease expired after an interrupted invocation', async () => {
    const post = makePost('PROCESSING');
    post.updatedAt = new Date(Date.now() - 6 * 60 * 1000);
    post.publishing = { platform: 'INSTAGRAM', startedAt: new Date(Date.now() - 6 * 60 * 1000) };
    mocks.postFindOne.mockResolvedValue(post);

    const request = new NextRequest('http://localhost:3000/api/publish/instagram', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'upstash-signature': 'valid' },
      body: JSON.stringify({ postId: 'post-a' }),
    });
    const response = await publishScheduled(request);

    expect(response.status).toBe(200);
    expect(mocks.postFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PROCESSING',
        updatedAt: expect.objectContaining({ $lte: expect.any(Date) }),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'PROCESSING', 'publishing.startedAt': expect.any(Date) }),
      }),
      { new: true }
    );
    expect(mocks.publishInstagramContainerForPost).toHaveBeenCalledTimes(1);
  });
});