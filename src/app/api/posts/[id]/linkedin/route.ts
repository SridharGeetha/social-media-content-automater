import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';
import SocialAccount from '@/models/SocialAccount';
import { decryptSocialToken } from '@/lib/social';
import { publishLinkedInTextPost } from '@/lib/linkedin';

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
      return NextResponse.json({ error: 'Forbidden. Only admins can publish directly to LinkedIn.' }, { status: 403 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: membership.workspaceId });
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    if (post.status !== 'APPROVED' && post.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Only approved or scheduled posts can be published.' }, { status: 409 });
    }
    if (post.status === 'PUBLISHED' && post.publishing?.externalPostId) {
      return NextResponse.json({ error: 'This post has already been published to LinkedIn.' }, { status: 409 });
    }

    const account = await SocialAccount.findOne({ workspaceId: membership.workspaceId, platform: 'LINKEDIN' })
      .select('+encryptedAccessToken');
    if (!account || account.status !== 'CONNECTED') {
      return NextResponse.json({ error: 'No connected LinkedIn account was found for this workspace.' }, { status: 400 });
    }
    if (account.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'The LinkedIn access token has expired. Reconnect LinkedIn first.' }, { status: 400 });
    }

    const postId = await publishLinkedInTextPost(
      decryptSocialToken(account.encryptedAccessToken),
      account.accountId,
      post.content
    );
    const publishedAt = new Date();
    post.status = 'PUBLISHED';
    post.publishedAt = publishedAt;
    post.publishing = { platform: 'LINKEDIN', externalPostId: postId, publishedAt };
    await post.save();

    return NextResponse.json({ message: 'Post published to LinkedIn.', postId, publishedAt: publishedAt.toISOString() });
  } catch (error: unknown) {
    console.error('Publish LinkedIn Post API Error:', error);
    const reason = error instanceof Error ? error.message : 'Failed to publish post to LinkedIn.';
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}