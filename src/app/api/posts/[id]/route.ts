import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post, { PostStatus } from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';
import User from '@/models/User';
import Media from '@/models/Media';
import { scheduleLinkedInPost } from '@/lib/qstash';

const VALID_STATUSES: PostStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: currentMember.workspaceId })
      .populate({
        path: 'createdBy',
        model: User,
        select: 'name email image',
      })
      .populate({
        path: 'mediaIds',
        model: Media,
      });

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const author = post.createdBy as unknown as { _id: { toString(): string }; name: string; email: string; image?: string } | null;

    // RBAC check: Creator can only view their own post
    if (currentMember.role === 'CREATOR' && author && author._id.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden: Creators can only view their own posts.' }, { status: 403 });
    }

    const mediaList = (post.mediaIds || []).map((m: unknown) => {
      if (typeof m === 'object' && m !== null && '_id' in m) {
        const mediaObj = m as Record<string, unknown>;
        return {
          id: mediaObj._id?.toString(),
          type: mediaObj.type,
          cloudinaryUrl: mediaObj.cloudinaryUrl,
          secureUrl: mediaObj.secureUrl,
          cloudinaryPublicId: mediaObj.cloudinaryPublicId,
          format: mediaObj.format,
          width: mediaObj.width,
          height: mediaObj.height,
          duration: mediaObj.duration,
          fileSize: mediaObj.fileSize,
        };
      }
      return m ? m.toString() : '';
    }).filter(Boolean);

    const rawMediaIds = (post.mediaIds || []).map((m: unknown) => {
      if (typeof m === 'object' && m !== null && '_id' in m) {
        return (m as Record<string, unknown>)._id?.toString() || '';
      }
      return m ? m.toString() : '';
    }).filter(Boolean);

    return NextResponse.json({
      post: {
        id: post._id.toString(),
        workspaceId: post.workspaceId.toString(),
        createdBy: author ? author._id.toString() : '',
        author: author
          ? {
              id: author._id.toString(),
              name: author.name,
              email: author.email,
              image: author.image,
            }
          : null,
        content: post.content,
        mediaIds: rawMediaIds,
        media: mediaList,
        status: post.status,
        scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        rejectionFeedback: post.rejectionFeedback || null,
      },
    });
  } catch (error: unknown) {
    console.error('Get Post API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch post.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: currentMember.workspaceId });

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // RBAC check: Creator can only edit their own post
    if (currentMember.role === 'CREATOR' && post.createdBy.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden: Creators can only edit their own posts.' }, { status: 403 });
    }

    const body = await req.json();
    const { content, mediaIds, platform, status, scheduledAt, publishedAt } = body;
    const shouldSchedule = status?.toUpperCase() === 'SCHEDULED' || scheduledAt !== undefined;

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: 'Content cannot be empty.' }, { status: 400 });
      }
      post.content = content.trim();
    }

    if (platform !== undefined && typeof platform === 'string' && platform.trim()) {
      post.platform = platform.trim();
    }
    if (Array.isArray(mediaIds)) {
      const cleanMediaIds = mediaIds.filter((mId) => typeof mId === 'string' && mId.trim());
      if (cleanMediaIds.length > 0) {
        const validMediaItems = await Media.find({
          _id: { $in: cleanMediaIds },
          workspaceId: currentMember.workspaceId,
        });

        if (validMediaItems.length !== cleanMediaIds.length) {
          return NextResponse.json(
            { error: 'One or more attached media items do not exist or do not belong to your workspace.' },
            { status: 400 }
          );
        }
      }
      post.mediaIds = cleanMediaIds as unknown as typeof post.mediaIds;
    }

    if (status !== undefined) {
      const upperStatus = status.toUpperCase() as PostStatus;
      if (!VALID_STATUSES.includes(upperStatus)) {
        return NextResponse.json({ error: 'Invalid post status.' }, { status: 400 });
      }
      if (currentMember.role === 'CREATOR' && !['DRAFT', 'PENDING_REVIEW'].includes(upperStatus)) {
        return NextResponse.json({ error: 'Creators can only save drafts or submit posts for review.' }, { status: 403 });
      }
      if (currentMember.role === 'CREATOR' && upperStatus === 'PENDING_REVIEW' && !['DRAFT', 'REJECTED'].includes(post.status)) {
        return NextResponse.json({ error: 'Only drafts and rejected posts can be submitted for review.' }, { status: 409 });
      }
      if (currentMember.role === 'MANAGER' && ['PUBLISHED', 'PROCESSING', 'FAILED'].includes(upperStatus)) {
        return NextResponse.json({ error: 'Managers cannot set publishing lifecycle states directly.' }, { status: 403 });
      }
      if ((currentMember.role === 'MANAGER' || currentMember.role === 'ADMIN') && upperStatus === 'SCHEDULED' && post.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Only approved posts can be scheduled.' }, { status: 409 });
      }
      post.status = upperStatus;

      if (upperStatus === 'PUBLISHED' && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    if (scheduledAt !== undefined) {
      if (scheduledAt === null || scheduledAt === '') {
        post.scheduledAt = null;
      } else {
        const d = new Date(scheduledAt);
        if (!isNaN(d.getTime())) {
          post.scheduledAt = d;
        }
      }
    }

    if (post.status === 'SCHEDULED' && (!post.scheduledAt || post.scheduledAt.getTime() <= Date.now())) {
      return NextResponse.json({ error: 'A scheduled post must have a future scheduledAt value.' }, { status: 400 });
    }

    if (publishedAt !== undefined) {
      if (publishedAt === null) {
        post.publishedAt = null;
      } else {
        const d = new Date(publishedAt);
        if (!isNaN(d.getTime())) {
          post.publishedAt = d;
        }
      }
    }

    await post.save();

    if (shouldSchedule && post.status === 'SCHEDULED' && post.scheduledAt) {
      try {
        await scheduleLinkedInPost(post._id.toString(), post.scheduledAt);
      } catch (error) {
        post.status = 'FAILED';
        post.publishing = {
          platform: 'LINKEDIN',
          error: error instanceof Error ? error.message : 'Failed to schedule post.',
        };
        await post.save();
        return NextResponse.json({ error: 'Post was updated but could not be scheduled.' }, { status: 502 });
      }
    }

    const updatedPost = await Post.findById(post._id)
      .populate({
        path: 'createdBy',
        model: User,
        select: 'name email image',
      })
      .populate({
        path: 'mediaIds',
        model: Media,
      });

    const author = updatedPost?.createdBy as unknown as { _id: string; name: string; email: string; image?: string } | null;

    const mediaList = (updatedPost?.mediaIds || []).map((m: unknown) => {
      if (typeof m === 'object' && m !== null && '_id' in m) {
        const mediaObj = m as Record<string, unknown>;
        return {
          id: mediaObj._id?.toString(),
          type: mediaObj.type,
          cloudinaryUrl: mediaObj.cloudinaryUrl,
          secureUrl: mediaObj.secureUrl,
          cloudinaryPublicId: mediaObj.cloudinaryPublicId,
          format: mediaObj.format,
          width: mediaObj.width,
          height: mediaObj.height,
          duration: mediaObj.duration,
          fileSize: mediaObj.fileSize,
        };
      }
      return m ? m.toString() : '';
    }).filter(Boolean);

    const rawMediaIds = (updatedPost?.mediaIds || []).map((m: unknown) => {
      if (typeof m === 'object' && m !== null && '_id' in m) {
        return (m as Record<string, unknown>)._id?.toString() || '';
      }
      return m ? m.toString() : '';
    }).filter(Boolean);

    return NextResponse.json({
      message: 'Post updated successfully.',
      post: {
        id: post._id.toString(),
        workspaceId: post.workspaceId.toString(),
        createdBy: post.createdBy.toString(),
        author: author
          ? {
              id: author._id.toString(),
              name: author.name,
              email: author.email,
              image: author.image,
            }
          : null,
        content: post.content,
        mediaIds: rawMediaIds,
        media: mediaList,
        status: post.status,
        scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        rejectionFeedback: post.rejectionFeedback || null,
      },
    });
  } catch (error: unknown) {
    console.error('Update Post API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update post.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: currentMember.workspaceId });

    if (!post) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    // RBAC check: Creator can only delete their own post
    if (currentMember.role === 'CREATOR' && post.createdBy.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden: Creators can only delete their own posts.' }, { status: 403 });
    }

    await Post.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Post deleted successfully.' });
  } catch (error: unknown) {
    console.error('Delete Post API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to delete post.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
