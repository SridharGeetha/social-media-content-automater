import { Client, Receiver } from '@upstash/qstash';

export const QSTASH_MAX_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export function getQStashClient(): Client {
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    throw new Error('QSTASH_TOKEN is missing.');
  }

  return new Client({ token });
}

export function getQStashReceiver(): Receiver {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    throw new Error('QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY are missing.');
  }

  return new Receiver({ currentSigningKey, nextSigningKey });
}

export function getProductionPublishUrl(): string {
  const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://social-media-content-automater.vercel.app';
  return `${baseUrl.replace(/\/$/, '')}/api/publish`;
}

export async function scheduleLinkedInPost(postId: string, scheduledAt: Date): Promise<string> {
  const scheduledUnixTime = scheduledAt.getTime();
  if (scheduledUnixTime <= Date.now()) {
    throw new Error('Scheduled time must be in the future.');
  }

  if (scheduledUnixTime - Date.now() > QSTASH_MAX_DELAY_MS) {
    throw new Error('QStash supports scheduled posts only up to 7 days in advance.');
  }

  const result = await getQStashClient().publishJSON({
    url: getProductionPublishUrl(),
    body: { postId },
    notBefore: Math.floor(scheduledUnixTime / 1000),
    deduplicationId: `linkedin-post-${postId}`,
  });

  if (!result.messageId) {
    throw new Error('QStash did not return a message ID for the scheduled LinkedIn post.');
  }

  return result.messageId;
}
