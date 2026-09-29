import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ publishJSON: vi.fn() }));

vi.mock('@upstash/qstash', () => ({
  Client: vi.fn(function Client() {
    return { publishJSON: mocks.publishJSON };
  }),
}));

import { scheduleInstagramContainerRetry, scheduleInstagramPost, schedulePost } from '@/lib/qstash';

describe('Instagram QStash scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QSTASH_TOKEN = 'test-qstash-token';
    process.env.APP_URL = 'https://app.example.com/';
    mocks.publishJSON.mockResolvedValue({ messageId: 'qstash-message-a' });
  });

  it('sends Instagram posts to their dedicated signed publish endpoint', async () => {
    const scheduledAt = new Date(Date.now() + 60_000);

    await expect(scheduleInstagramPost('post-a', scheduledAt)).resolves.toBe('qstash-message-a');

    expect(mocks.publishJSON).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://app.example.com/api/publish/instagram',
      body: { postId: 'post-a', scheduledAt: scheduledAt.toISOString() },
      deduplicationId: `instagram-post-post-a-${scheduledAt.getTime()}`,
    }));
  });

  it('keeps the LinkedIn publish endpoint as the default destination', async () => {
    const scheduledAt = new Date(Date.now() + 60_000);

    await schedulePost('legacy-post-a', scheduledAt);

    expect(mocks.publishJSON).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://app.example.com/api/publish',
      body: { postId: 'legacy-post-a' },
      deduplicationId: 'linkedin-post-legacy-post-a',
    }));
  });

  it('queues a follow-up check for the existing Instagram container', async () => {
    const scheduledAt = new Date(Date.now() + 5 * 60_000);

    await expect(scheduleInstagramContainerRetry('post-a', scheduledAt, 'container-a', 2))
      .resolves.toBe('qstash-message-a');

    expect(mocks.publishJSON).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://app.example.com/api/publish/instagram',
      body: {
        postId: 'post-a',
        scheduledAt: scheduledAt.toISOString(),
        containerId: 'container-a',
        retryAttempt: 2,
      },
      notBefore: expect.any(Number),
      deduplicationId: 'instagram-container-post-a-container-a-2',
    }));
  });

  it('rejects retries outside the configured Instagram container retry limit', async () => {
    await expect(scheduleInstagramContainerRetry('post-a', new Date(), 'container-a', 6))
      .rejects.toThrow('retry limit was exceeded');
    expect(mocks.publishJSON).not.toHaveBeenCalled();
  });
});