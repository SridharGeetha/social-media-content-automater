import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import {
  createInstagramContainerForPost,
  getInstagramContainerStatusForPost,
  publishInstagramContainerForPost,
} from '@/lib/publish-instagram-post';
import {
  getQStashReceiver,
  INSTAGRAM_CONTAINER_RETRY_LIMIT,
  scheduleInstagramContainerRetry,
} from '@/lib/qstash';

const INSTAGRAM_PROCESSING_LEASE_MS = 5 * 60 * 1000;

async function releaseInstagramClaim(postId: string, status: 'SCHEDULED' | 'FAILED', error?: string) {
  const set: Record<string, unknown> = { status };
  if (error) set['publishing.error'] = error;
  else set['publishing.error'] = null;

  await Post.updateOne(
    { _id: postId, status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM' },
    {
      $set: set,
      $unset: { 'publishing.startedAt': 1 },
    }
  );
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature') || req.headers.get('Upstash-Signature');
  if (!signature) return NextResponse.json({ error: 'Missing QStash signature.' }, { status: 401 });

  const body = await req.text();
  try {
    const receiver = getQStashReceiver();
    const isValid = await receiver.verify({ signature, body, url: req.url });
    if (!isValid) return NextResponse.json({ error: 'Invalid QStash signature.' }, { status: 401 });
  } catch (error) {
    console.error('QStash Instagram verification failed:', error);
    return NextResponse.json({ error: 'Invalid QStash signature.' }, { status: 401 });
  }

  let payload: { postId?: string; scheduledAt?: string; containerId?: string; retryAttempt?: number };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Malformed QStash payload.' }, { status: 400 });
  }
  if (!payload.postId) return NextResponse.json({ error: 'postId is required.' }, { status: 400 });

  try {
    await connectToDatabase();
    const post = await Post.findOne({ _id: payload.postId });
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    if ((post.targetPlatform || 'LINKEDIN') !== 'INSTAGRAM') {
      return NextResponse.json({ error: 'This post is not targeted to Instagram.' }, { status: 409 });
    }
    if (payload.scheduledAt && post.scheduledAt) {
      const messageSchedule = new Date(payload.scheduledAt).getTime();
      if (!Number.isFinite(messageSchedule) || messageSchedule !== post.scheduledAt.getTime()) {
        return NextResponse.json({ message: 'Ignored an outdated Instagram schedule delivery.' });
      }
    }
    if (post.status === 'PUBLISHED' && post.publishing?.externalPostId) {
      return NextResponse.json({ message: 'Post was already published.', postId: post.publishing.externalPostId });
    }

    const now = new Date();
    let claimFilter: Record<string, unknown>;
    if (post.status === 'SCHEDULED') {
      claimFilter = { status: 'SCHEDULED' };
    } else if (post.status === 'PROCESSING') {
      const leaseStartedAt = post.publishing?.startedAt || post.updatedAt;
      const leaseExpiresAt = new Date(leaseStartedAt.getTime() + INSTAGRAM_PROCESSING_LEASE_MS);
      if (leaseExpiresAt > now) {
        return NextResponse.json(
          { error: 'Instagram post is already being processed. QStash should retry this delivery.' },
          { status: 503, headers: { 'Retry-After': '30' } }
        );
      }
      claimFilter = {
        status: 'PROCESSING',
        updatedAt: { $lte: new Date(now.getTime() - INSTAGRAM_PROCESSING_LEASE_MS) },
      };
    } else {
      return NextResponse.json({ error: 'Post is not in a scheduled or recoverable processing state.' }, { status: 409 });
    }

    const claimedPost = await Post.findOneAndUpdate(
      {
        _id: payload.postId,
        targetPlatform: 'INSTAGRAM',
        ...claimFilter,
        'publishing.externalPostId': { $exists: false },
      },
      {
        $set: { status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM', 'publishing.startedAt': now },
        $unset: { 'publishing.error': 1 },
      },
      { new: true }
    );
    if (!claimedPost) {
      return NextResponse.json(
        { error: 'Instagram post is already being processed. QStash may retry this delivery.' },
        { status: 503, headers: { 'Retry-After': '30' } }
      );
    }

    const scheduledAt = claimedPost.scheduledAt || new Date();
    let containerId = payload.containerId || claimedPost.publishing?.containerId;
    try {
      if (!containerId) {
        containerId = await createInstagramContainerForPost(claimedPost);
        await Post.updateOne(
          { _id: payload.postId, status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM' },
          { $set: { 'publishing.containerId': containerId } }
        );
      }

      const container = await getInstagramContainerStatusForPost(claimedPost, containerId);
      if (container.statusCode === 'IN_PROGRESS' || container.statusCode === 'UNKNOWN') {
        const retryAttempt = (payload.retryAttempt || 0) + 1;
        if (retryAttempt > INSTAGRAM_CONTAINER_RETRY_LIMIT) {
          const error = `Instagram image container remained ${container.statusCode} after ${INSTAGRAM_CONTAINER_RETRY_LIMIT} one-minute checks. Try scheduling the post again.`;
          await releaseInstagramClaim(payload.postId, 'FAILED', error);
          return NextResponse.json({ message: error, status: 'FAILED' });
        }

        await scheduleInstagramContainerRetry(payload.postId, scheduledAt, containerId, retryAttempt);
        await releaseInstagramClaim(payload.postId, 'SCHEDULED');
        return NextResponse.json({
          message: 'Instagram is still processing the image. A follow-up check was scheduled.',
          status: 'SCHEDULED',
          retryAttempt,
        });
      }

      if (container.statusCode === 'ERROR' || container.statusCode === 'EXPIRED') {
        const error = `Instagram image container cannot be published (${container.statusCode})${container.status ? `: ${container.status}` : ''}.`;
        await releaseInstagramClaim(payload.postId, 'FAILED', error);
        return NextResponse.json({ error, status: 'FAILED' });
      }

      if (container.statusCode !== 'FINISHED') {
        throw new Error(`Instagram returned an unsupported container status: ${container.statusCode}.`);
      }

      const externalPostId = await publishInstagramContainerForPost(claimedPost, containerId);
      const publishedAt = new Date();
      const updateResult = await Post.updateOne(
        { _id: payload.postId, status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM' },
        {
          $set: {
            status: 'PUBLISHED',
            publishedAt,
            'publishing.platform': 'INSTAGRAM',
            'publishing.externalPostId': externalPostId,
            'publishing.publishedAt': publishedAt,
          },
          $unset: { 'publishing.error': 1, 'publishing.startedAt': 1, 'publishing.containerId': 1 },
        }
      );
      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: 'Instagram published the post, but its status could not be saved.' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Post published to Instagram.', postId: externalPostId });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Failed to publish scheduled Instagram post.';
      await releaseInstagramClaim(payload.postId, 'SCHEDULED', reason);
      console.error('QStash scheduled Instagram publish failed:', reason);
      return NextResponse.json({ error: reason }, { status: 503, headers: { 'Retry-After': '60' } });
    }
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Failed to publish scheduled Instagram post.';
    console.error('QStash scheduled Instagram publish failed:', reason);
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
