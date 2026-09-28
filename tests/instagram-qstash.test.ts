import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ publishJSON: vi.fn() }));

vi.mock('@upstash/qstash', () => ({
  Client: vi.fn(function Client() {
    return { publishJSON: mocks.publishJSON };
  }),
}));

import { scheduleInstagramPost, schedulePost } from '@/lib/qstash';

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
      body: { postId: 'post-a' },
      deduplicationId: 'instagram-post-post-a',
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
});