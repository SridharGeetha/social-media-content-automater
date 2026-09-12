import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import { markPostPublishFailed, publishPostToLinkedIn } from '@/lib/linkedin-publishing';

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  await connectToDatabase();
  const duePosts = await Post.find({
    platform: 'LINKEDIN',
    status: 'SCHEDULED',
    scheduledAt: { $ne: null, $lte: new Date() },
    'publishing.externalPostId': { $exists: false },
  }).limit(25);

  const results: Array<{ id: string; status: 'PUBLISHED' | 'FAILED'; externalPostId?: string; error?: string }> = [];
  for (const post of duePosts) {
    try {
      const externalPostId = await publishPostToLinkedIn(post);
      results.push({ id: post._id.toString(), status: 'PUBLISHED', externalPostId });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Failed to publish scheduled post.';
      await markPostPublishFailed(post, reason);
      results.push({ id: post._id.toString(), status: 'FAILED', error: reason });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}