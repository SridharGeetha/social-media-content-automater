import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';
import { publishPostToLinkedIn } from '@/lib/linkedin-publishing';

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
    if (membership.role !== 'ADMIN' && membership.role !== 'CREATOR') {
      return NextResponse.json({ error: 'Forbidden. Only Admins and Creators can publish to LinkedIn.' }, { status: 403 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: membership.workspaceId });
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    if (membership.role === 'CREATOR' && post.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: Creators can only publish their own posts.' }, { status: 403 });
    }
    if (post.status === 'PUBLISHED' && post.publishing?.externalPostId) {
      return NextResponse.json({ error: 'This post has already been published to LinkedIn.' }, { status: 409 });
    }

    const postId = await publishPostToLinkedIn(post);
    const publishedAt = post.publishedAt || new Date();

    return NextResponse.json({ message: 'Post published to LinkedIn.', postId, publishedAt: publishedAt.toISOString() });
  } catch (error: unknown) {
    console.error('Publish LinkedIn Post API Error:', error);
    const reason = error instanceof Error ? error.message : 'Failed to publish post to LinkedIn.';
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}