import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post, { PostStatus } from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';
import User from '@/models/User';
import Media from '@/models/Media';
import { scheduleLinkedInPost } from '@/lib/qstash';

const VALID_STATUSES: PostStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED'];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    const { workspaceId, role } = currentMember;

    // RBAC Filter:
    // Admin & Manager -> view all posts in workspace
    // Creator -> view only own posts in workspace
    const filter: Record<string, unknown> = { workspaceId };
    if (role === 'CREATOR') {
      filter.createdBy = userId;
    }

    // Optional status filter from URL query param
    const statusParam = req.nextUrl.searchParams.get('status')?.toUpperCase();
    if (statusParam && statusParam !== 'ALL' && VALID_STATUSES.includes(statusParam as PostStatus)) {
      filter.status = statusParam;
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: 'createdBy',
        model: User,
        select: 'name email image',
      })
      .populate({
        path: 'mediaIds',
        model: Media,
      });

    const formattedPosts = posts.map((post) => {
      const author = post.createdBy as unknown as { _id: string; name: string; email: string; image?: string } | null;
      
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

      return {
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
      };
    });

    return NextResponse.json({ posts: formattedPosts, currentRole: role });
  } catch (error: unknown) {
    console.error('Fetch Posts API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch posts.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    const body = await req.json();
  const { content, mediaIds, platform, status, scheduledAt } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Post content is required.' }, { status: 400 });
    }

    // Workspace Isolation Check for Attached Media:
    // Ensure all mediaIds exist and belong strictly to current workspace
    const cleanMediaIds = Array.isArray(mediaIds) ? mediaIds.filter((id) => typeof id === 'string' && id.trim()) : [];
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

    const requestedStatus = status?.toUpperCase() as PostStatus | undefined;
    if (requestedStatus && !VALID_STATUSES.includes(requestedStatus)) {
      return NextResponse.json({ error: 'Invalid post status.' }, { status: 400 });
    }
    if (currentMember.role === 'CREATOR' && requestedStatus && !['DRAFT', 'PENDING_REVIEW'].includes(requestedStatus)) {
      return NextResponse.json({ error: 'Creators can only save drafts or submit posts for review.' }, { status: 403 });
    }

    const postStatus: PostStatus = requestedStatus
      ? (status.toUpperCase() as PostStatus)
      : 'DRAFT';

    let parsedScheduledAt: Date | null = null;
    if (scheduledAt !== undefined && scheduledAt !== null && scheduledAt !== '') {
      const d = new Date(scheduledAt);
      if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'The preferred schedule time must be a valid future date.' }, { status: 400 });
      }
      parsedScheduledAt = d;
    }

    if (postStatus === 'SCHEDULED' && (!parsedScheduledAt || parsedScheduledAt.getTime() <= Date.now())) {
      return NextResponse.json({ error: 'A scheduled post must have a future scheduledAt value.' }, { status: 400 });
    }

    let parsedPublishedAt: Date | null = null;
    if (postStatus === 'PUBLISHED') {
      parsedPublishedAt = new Date();
    }

    const newPost = await Post.create({
      workspaceId: currentMember.workspaceId,
      createdBy: userId,
      content: content.trim(),
        platform: typeof platform === 'string' ? platform.trim() : 'LINKEDIN',
      mediaIds: cleanMediaIds,
      status: postStatus,
      scheduledAt: parsedScheduledAt,
      publishedAt: parsedPublishedAt,
    });

    if (newPost.status === 'SCHEDULED' && newPost.scheduledAt) {
      try {
        await scheduleLinkedInPost(newPost._id.toString(), newPost.scheduledAt);
      } catch (error) {
        newPost.status = 'FAILED';
        newPost.publishing = {
          platform: 'LINKEDIN',
          error: error instanceof Error ? error.message : 'Failed to schedule post.',
        };
        await newPost.save();
        return NextResponse.json({ error: 'Post was created but could not be scheduled.' }, { status: 502 });
      }
    }

    const populatedPost = await Post.findById(newPost._id)
      .populate({
        path: 'createdBy',
        model: User,
        select: 'name email image',
      })
      .populate({
        path: 'mediaIds',
        model: Media,
      });

    const author = populatedPost?.createdBy as unknown as { _id: string; name: string; email: string; image?: string } | null;

    const mediaList = (populatedPost?.mediaIds || []).map((m: unknown) => {
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

    return NextResponse.json(
      {
        message: 'Post created successfully.',
        post: {
          id: newPost._id.toString(),
          workspaceId: newPost.workspaceId.toString(),
          createdBy: userId,
          author: author
            ? {
                id: author._id.toString(),
                name: author.name,
                email: author.email,
                image: author.image,
              }
            : null,
          content: newPost.content,
                    platform: newPost.platform,
          mediaIds: cleanMediaIds,
          media: mediaList,
          status: newPost.status,
          scheduledAt: newPost.scheduledAt ? newPost.scheduledAt.toISOString() : null,
          publishedAt: newPost.publishedAt ? newPost.publishedAt.toISOString() : null,
          createdAt: newPost.createdAt.toISOString(),
          updatedAt: newPost.updatedAt.toISOString(),
          rejectionFeedback: newPost.rejectionFeedback || null,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Create Post API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create post.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
