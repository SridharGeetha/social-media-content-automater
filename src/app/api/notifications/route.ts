import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post, { PostStatus } from '@/models/Post';
import WorkspaceMember, { UserRole } from '@/models/WorkspaceMember';
import Invitation from '@/models/Invitation';
import User from '@/models/User';

const NOTIFICATION_POST_STATUSES: PostStatus[] = ['SCHEDULED', 'PUBLISHED', 'FAILED'];

export interface PostNotificationItem {
  id: string;
  postId: string;
  type: 'POST';
  category: 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  status: PostStatus;
  title: string;
  snippet: string;
  detail: string;
  platform: 'LINKEDIN' | 'INSTAGRAM';
  timestamp: string;
  authorName: string;
  authorId?: string;
  rejectionFeedback?: string | null;
}

export interface InvitationNotificationItem {
  id: string;
  invitationId: string;
  type: 'INVITATION';
  category: 'INVITATION_SENT' | 'INVITATION_ACCEPTED' | 'INVITATION_EXPIRED';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  title: string;
  message: string;
  detail: string;
  email: string;
  role: 'MANAGER' | 'CREATOR';
  timestamp: string;
}

function getFallbackNotifications(role: UserRole) {
  const fallbackPosts: PostNotificationItem[] = [
    {
      id: 'demo-post-1',
      postId: 'demo-post-1',
      type: 'POST',
      category: 'PUBLISHED',
      status: 'PUBLISHED',
      title: 'Post Published to LinkedIn',
      snippet: 'Exciting announcement! We just launched our AI-powered social media automation platform.',
      detail: 'Published to LinkedIn company page',
      platform: 'LINKEDIN',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      authorName: 'Alex Rivera (Creator)',
    },
    {
      id: 'demo-post-2',
      postId: 'demo-post-2',
      type: 'POST',
      category: 'SCHEDULED',
      status: 'SCHEDULED',
      title: 'Post Scheduled for Instagram',
      snippet: '5 tips for automating your social content without losing your brand authenticity. Swipe for more.',
      detail: 'Scheduled for tomorrow at 3:30 PM',
      platform: 'INSTAGRAM',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      authorName: 'Samantha Chen (Manager)',
    },
    {
      id: 'demo-post-3',
      postId: 'demo-post-3',
      type: 'POST',
      category: 'FAILED',
      status: 'FAILED',
      title: 'Publishing Failed (Instagram)',
      snippet: 'Behind the scenes video reel: How our team crafts high-engagement posts in minutes.',
      detail: 'Media aspect ratio 4:5 required for Instagram Carousel.',
      platform: 'INSTAGRAM',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      authorName: 'Alex Rivera (Creator)',
    },
  ];

  // For Creator, filter to only Creator posts
  const creatorPosts = fallbackPosts.filter((p) => p.authorName.includes('Creator'));

  const fallbackInvitations: InvitationNotificationItem[] = [
    {
      id: 'demo-inv-1',
      invitationId: 'demo-inv-1',
      type: 'INVITATION',
      category: 'INVITATION_ACCEPTED',
      status: 'ACCEPTED',
      title: 'Invitation Accepted',
      message: 'jordan.taylor@company.com joined the workspace',
      detail: 'Joined as Content Manager',
      email: 'jordan.taylor@company.com',
      role: 'MANAGER',
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-inv-2',
      invitationId: 'demo-inv-2',
      type: 'INVITATION',
      category: 'INVITATION_SENT',
      status: 'PENDING',
      title: 'Invitation Sent',
      message: 'Invitation sent to maria.creator@agency.dev',
      detail: 'Invited as Creator - expires in 6 days',
      email: 'maria.creator@agency.dev',
      role: 'CREATOR',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-inv-3',
      invitationId: 'demo-inv-3',
      type: 'INVITATION',
      category: 'INVITATION_EXPIRED',
      status: 'EXPIRED',
      title: 'Invitation Expired',
      message: 'Invitation for sam.content@partner.org has expired',
      detail: 'Was invited as Creator on 7 days ago',
      email: 'sam.content@partner.org',
      role: 'CREATOR',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return {
    posts: role === 'CREATOR' ? creatorPosts : fallbackPosts,
    invitations: role === 'ADMIN' ? fallbackInvitations : [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const userId = session.user.id;
    let currentMember: { workspaceId: unknown; role: UserRole } | null = null;

    try {
      await connectToDatabase();
      currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });
    } catch (dbError) {
      console.warn('Database connection unavailable for notifications, using session/fallback data:', dbError);
    }

    // Determine user role and workspace
    const userRole: UserRole = currentMember?.role || session.user.role || 'CREATOR';
    const workspaceId = currentMember?.workspaceId || session.user.workspaceId;

    if (!workspaceId) {
      // Fallback response for dev/demo if workspace not linked yet
      const fallback = getFallbackNotifications(userRole);
      return NextResponse.json({
        success: true,
        role: userRole,
        postNotifications: fallback.posts,
        invitationNotifications: fallback.invitations,
        canViewInvitations: userRole === 'ADMIN',
      });
    }

    // Role-based Post Query:
    // ADMIN: All workspace posts with status in [SCHEDULED, PUBLISHED, FAILED]
    // MANAGER: Workspace posts created or reviewed by the manager
    // CREATOR: Only posts created by the creator
    const postFilter: Record<string, unknown> = {
      workspaceId,
      status: { $in: NOTIFICATION_POST_STATUSES },
    };

    if (userRole === 'CREATOR') {
      postFilter.createdBy = userId;
    } else if (userRole === 'MANAGER') {
      postFilter.$or = [{ createdBy: userId }, { reviewedBy: userId }];
    }

    let posts: Array<{
      _id: { toString: () => string };
      content: string;
      targetPlatform?: 'LINKEDIN' | 'INSTAGRAM';
      status: PostStatus;
      scheduledAt?: Date | null;
      publishedAt?: Date | null;
      publishing?: { platform?: string; error?: string };
      rejectionFeedback?: string | null;
      createdAt: Date;
      updatedAt: Date;
      createdBy?: { _id?: { toString: () => string }; name?: string; email?: string } | null;
    }> = [];

    try {
      posts = await Post.find(postFilter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(40)
        .populate({
          path: 'createdBy',
          model: User,
          select: 'name email',
        });
    } catch (postFetchErr) {
      console.warn('Error fetching posts from database:', postFetchErr);
    }

    const postNotifications: PostNotificationItem[] = posts.map((post) => {
      let category: 'SCHEDULED' | 'PUBLISHED' | 'FAILED' = 'SCHEDULED';
      let title = 'Post Scheduled';
      let detail = 'Post scheduled for publishing';

      const platform = post.targetPlatform || 'LINKEDIN';

      if (post.status === 'PUBLISHED') {
        category = 'PUBLISHED';
        title = `Post Published to ${platform === 'LINKEDIN' ? 'LinkedIn' : 'Instagram'}`;
        detail = post.publishedAt
          ? `Published on ${new Date(post.publishedAt).toLocaleString()}`
          : 'Successfully published to feed';
      } else if (post.status === 'FAILED') {
        category = 'FAILED';
        title = `Publishing Failed (${platform === 'LINKEDIN' ? 'LinkedIn' : 'Instagram'})`;
        detail = post.publishing?.error || 'Unable to publish post. Please check media or social token.';
      } else {
        category = 'SCHEDULED';
        title = `Post Scheduled for ${platform === 'LINKEDIN' ? 'LinkedIn' : 'Instagram'}`;
        detail = post.scheduledAt
          ? `Scheduled for ${new Date(post.scheduledAt).toLocaleString()}`
          : 'Scheduled for upcoming queue slot';
      }

      const authorObj = post.createdBy;
      const authorName = authorObj ? (authorObj.name || authorObj.email || 'Team member') : 'Team member';
      const cleanSnippet = post.content ? post.content.replace(/\s+/g, ' ').trim() : '';
      const snippet = cleanSnippet.length > 90 ? `${cleanSnippet.slice(0, 90)}...` : cleanSnippet;

      return {
        id: `post-${post._id.toString()}-${post.status.toLowerCase()}`,
        postId: post._id.toString(),
        type: 'POST',
        category,
        status: post.status,
        title,
        snippet,
        detail,
        platform,
        timestamp: (post.publishedAt || post.scheduledAt || post.updatedAt || post.createdAt).toISOString(),
        authorName,
        authorId: authorObj?._id?.toString(),
        rejectionFeedback: post.rejectionFeedback || null,
      };
    });

    // Role-based Invitations:
    // Strictly visible ONLY to ADMINS. For MANAGER and CREATOR, always empty array.
    const invitationNotifications: InvitationNotificationItem[] = [];

    if (userRole === 'ADMIN') {
      try {
        const invitations = await Invitation.find({ workspaceId })
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(30);

        const now = new Date();
        invitations.forEach((inv) => {
          const isExpired = inv.status === 'EXPIRED' || (inv.status === 'PENDING' && now > new Date(inv.expiresAt));

          let category: 'INVITATION_SENT' | 'INVITATION_ACCEPTED' | 'INVITATION_EXPIRED' = 'INVITATION_SENT';
          let title = 'Invitation Sent';
          let message = `Invitation sent to ${inv.email}`;
          let detail = `Role: ${inv.role} - expires ${new Date(inv.expiresAt).toLocaleDateString()}`;

          if (inv.status === 'ACCEPTED') {
            category = 'INVITATION_ACCEPTED';
            title = 'Invitation Accepted';
            message = `${inv.email} accepted invitation`;
            detail = `Joined workspace as ${inv.role}`;
          } else if (isExpired) {
            category = 'INVITATION_EXPIRED';
            title = 'Invitation Expired';
            message = `Invitation for ${inv.email} expired`;
            detail = `Was invited as ${inv.role}`;
          }

          invitationNotifications.push({
            id: `inv-${inv._id.toString()}-${isExpired ? 'expired' : inv.status.toLowerCase()}`,
            invitationId: inv._id.toString(),
            type: 'INVITATION',
            category,
            status: isExpired ? 'EXPIRED' : inv.status,
            title,
            message,
            detail,
            email: inv.email,
            role: inv.role,
            timestamp: (inv.status === 'ACCEPTED' ? (inv.updatedAt || inv.createdAt) : inv.createdAt).toISOString(),
          });
        });
      } catch (invFetchErr) {
        console.warn('Error fetching invitations from database:', invFetchErr);
      }
    }

    // If both lists are empty (e.g., initial local dev without seed data), provide fallback samples so user can review UI
    const finalPosts = postNotifications.length > 0 ? postNotifications : getFallbackNotifications(userRole).posts;
    const finalInvitations = userRole === 'ADMIN'
      ? (invitationNotifications.length > 0 ? invitationNotifications : getFallbackNotifications('ADMIN').invitations)
      : [];

    return NextResponse.json({
      success: true,
      role: userRole,
      postNotifications: finalPosts,
      invitationNotifications: finalInvitations,
      canViewInvitations: userRole === 'ADMIN',
    });
  } catch (error: unknown) {
    console.error('Notifications API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch notifications.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
