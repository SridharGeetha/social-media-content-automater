import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import { publishPostToInstagram } from '@/lib/publish-instagram-post';
import { getQStashReceiver } from '@/lib/qstash';

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

  let payload: { postId?: string };
  try {
    payload = JSON.parse(body) as { postId?: string };
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
    if (post.status === 'PUBLISHED' && post.publishing?.externalPostId) {
      return NextResponse.json({ message: 'Post was already published.', postId: post.publishing.externalPostId });
    }
    if (post.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Post is not in a scheduled state.' }, { status: 409 });
    }

    const externalPostId = await publishPostToInstagram(post);
    const publishedAt = new Date();
    post.status = 'PUBLISHED';
    post.publishedAt = publishedAt;
    post.publishing = { platform: 'INSTAGRAM', externalPostId, publishedAt };
    await post.save();

    return NextResponse.json({ message: 'Post published to Instagram.', postId: externalPostId });
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Failed to publish scheduled Instagram post.';
    try {
      await connectToDatabase();
      const failedPost = await Post.findOne({ _id: payload.postId });
      if (failedPost && failedPost.status !== 'PUBLISHED') {
        failedPost.status = 'FAILED';
        failedPost.publishing = { platform: 'INSTAGRAM', error: reason };
        await failedPost.save();
      }
    } catch (dbError) {
      console.error('Failed to persist Instagram publish error state:', dbError);
    }

    console.error('QStash scheduled Instagram publish failed:', reason);
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}