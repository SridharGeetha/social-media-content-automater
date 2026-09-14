import { NextRequest, NextResponse } from 'next/server';

import connectToDatabase from '@/lib/db';
import { decryptSocialToken } from '@/lib/social';
import Post from '@/models/Post';
import SocialAccount from '@/models/SocialAccount';
import Media from '@/models/Media';
import { publishLinkedInTextPost } from '@/lib/linkedin';
import { getQStashReceiver } from '@/lib/qstash';

async function buildLinkedInCommentary(post: { content: string; mediaIds?: string[] }): Promise<string> {
  const content = post.content?.trim() || '';
  if (!Array.isArray(post.mediaIds) || post.mediaIds.length === 0) {
    return content;
  }

  const mediaQuery = Media.find({ _id: { $in: post.mediaIds } }) as unknown as {
    lean?: () => Promise<unknown[]>;
  };
  const mediaDocs = typeof mediaQuery.lean === 'function'
    ? await mediaQuery.lean()
    : await (mediaQuery as unknown as Promise<unknown[]>);
  const urls = mediaDocs
    .map((media) => {
      if (typeof media !== 'object' || !media) return '';
      const mediaRecord = media as { secureUrl?: string; cloudinaryUrl?: string };
      return mediaRecord.secureUrl || mediaRecord.cloudinaryUrl || '';
    })
    .filter(Boolean) as string[];

  return [content, ...urls].filter(Boolean).join('\n\n');
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature') || req.headers.get('Upstash-Signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing QStash signature.' }, { status: 401 });
  }

  const body = await req.text();

  try {
    const receiver = getQStashReceiver();
    const isValid = await receiver.verify({ signature, body, url: req.url });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid QStash signature.' }, { status: 401 });
    }
  } catch (error) {
    console.error('QStash verification failed:', error);
    return NextResponse.json({ error: 'Invalid QStash signature.' }, { status: 401 });
  }

  let payload: { postId?: string };
  try {
    payload = JSON.parse(body) as { postId?: string };
  } catch {
    return NextResponse.json({ error: 'Malformed QStash payload.' }, { status: 400 });
  }

  const { postId } = payload;
  if (!postId) {
    return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    if (post.status === 'PUBLISHED' && post.publishing?.externalPostId) {
      return NextResponse.json({ message: 'Post was already published.', postId: post.publishing.externalPostId }, { status: 200 });
    }

    if (post.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Post is not in a scheduled state.' }, { status: 409 });
    }

    const account = await SocialAccount.findOne({ workspaceId: post.workspaceId, platform: 'LINKEDIN' }).select('+encryptedAccessToken');
    if (!account || account.status !== 'CONNECTED') {
      throw new Error('No connected LinkedIn account is available for this workspace.');
    }

    if (account.expiresAt <= new Date()) {
      throw new Error('The LinkedIn access token has expired. Reconnect LinkedIn first.');
    }

    const encryptedToken = account.encryptedAccessToken;
    const accessToken = encryptedToken && encryptedToken.includes('.') ? decryptSocialToken(encryptedToken) : encryptedToken;
    if (!accessToken) {
      throw new Error('The LinkedIn access token is empty.');
    }

    const commentary = await buildLinkedInCommentary(post);
    const externalPostId = await publishLinkedInTextPost(
      accessToken,
      account.accountId,
      commentary
    );

    post.status = 'PUBLISHED';
    post.publishedAt = new Date();
    post.publishing = {
      platform: 'LINKEDIN',
      externalPostId,
      publishedAt: new Date(),
    };
    await post.save();

    return NextResponse.json({ message: 'Post published to LinkedIn.', postId: externalPostId }, { status: 200 });
  } catch (error) {
    try {
      await connectToDatabase();
      const failedPost = await Post.findOne({ _id: postId });
      if (failedPost && failedPost.status !== 'PUBLISHED') {
        failedPost.status = 'FAILED';
        failedPost.publishing = {
          ...(failedPost.publishing || { platform: 'LINKEDIN' }),
          error: error instanceof Error ? error.message : 'Failed to publish scheduled post.',
        };
        await failedPost.save();
      }
    } catch (dbError) {
      console.error('Failed to persist publish error state:', dbError);
    }

    const reason = error instanceof Error ? error.message : 'Failed to publish scheduled post.';
    console.error('QStash scheduled publish failed:', reason);
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
