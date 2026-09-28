import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';
import { publishPostToInstagram } from '@/lib/publish-instagram-post';
import type { PostStatus } from '@/models/Post';

const PUBLISHABLE_STATUSES: PostStatus[] = ['APPROVED'];

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { id } = await params;
    await connectToDatabase();

    const membership = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
    if (!membership) return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    if (membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Only admins can publish directly to Instagram.' }, { status: 403 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: membership.workspaceId });
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    if ((post.targetPlatform || 'LINKEDIN') !== 'INSTAGRAM') {
      return NextResponse.json({ error: 'This post is not targeted to Instagram.' }, { status: 409 });
    }
    if (post.status === 'PUBLISHED' || post.publishing?.externalPostId) {
      return NextResponse.json({ error: 'This post has already been published to Instagram.' }, { status: 409 });
    }
    if (!PUBLISHABLE_STATUSES.includes(post.status)) {
      return NextResponse.json({ error: 'Only approved Instagram posts can be published immediately.' }, { status: 409 });
    }

    const previousStatus = post.status;
    const claimedPost = await Post.findOneAndUpdate(
      {
        _id: id,
        workspaceId: membership.workspaceId,
        targetPlatform: 'INSTAGRAM',
        status: previousStatus,
        'publishing.externalPostId': { $exists: false },
      },
      { $set: { status: 'PROCESSING', publishing: { platform: 'INSTAGRAM' } } },
      { new: true }
    );
    if (!claimedPost) {
      return NextResponse.json({ error: 'This post is already being published or its status has changed.' }, { status: 409 });
    }

    let externalPostId: string;
    try {
      externalPostId = await publishPostToInstagram(claimedPost);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Instagram image publishing failed.';
      await Post.updateOne(
        { _id: id, workspaceId: membership.workspaceId, status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM' },
        {
          $set: { status: previousStatus, 'publishing.platform': 'INSTAGRAM', 'publishing.error': reason },
          $unset: { 'publishing.externalPostId': 1, 'publishing.publishedAt': 1 },
        }
      );
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    const publishedAt = new Date();
    await Post.updateOne(
      { _id: id, workspaceId: membership.workspaceId, status: 'PROCESSING', 'publishing.platform': 'INSTAGRAM' },
      {
        $set: {
          status: 'PUBLISHED',
          publishedAt,
          'publishing.platform': 'INSTAGRAM',
          'publishing.externalPostId': externalPostId,
          'publishing.publishedAt': publishedAt,
        },
        $unset: { 'publishing.error': 1 },
      }
    );

    return NextResponse.json({ message: 'Post published to Instagram.', postId: externalPostId, publishedAt: publishedAt.toISOString() });
  } catch (error: unknown) {
    console.error('Publish Instagram Post API Error:', error);
    const reason = error instanceof Error ? error.message : 'Failed to publish post to Instagram.';
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}