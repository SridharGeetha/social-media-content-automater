import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';
import { scheduleLinkedInPost } from '@/lib/qstash';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    await connectToDatabase();
    const membership = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
    if (!membership) return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    if (membership.role !== 'MANAGER' && membership.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers can review posts.' }, { status: 403 });
    }

    const { id } = await params;
    const { action, feedback, scheduledAt } = await req.json();
    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Review action must be APPROVE or REJECT.' }, { status: 400 });
    }
    if (action === 'REJECT' && (!feedback || typeof feedback !== 'string' || !feedback.trim())) {
      return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
    }

    const post = await Post.findOne({ _id: id, workspaceId: membership.workspaceId });
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    if (post.status !== 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Only posts pending review can be reviewed.' }, { status: 409 });
    }

    let parsedScheduledAt: Date | null = null;
    const requestedSchedule = action === 'APPROVE' && scheduledAt ? scheduledAt : post.scheduledAt;
    if (action === 'APPROVE' && requestedSchedule) {
      const candidate = new Date(requestedSchedule);
      if (Number.isNaN(candidate.getTime()) || candidate.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Scheduled time must be in the future.' }, { status: 400 });
      }
      parsedScheduledAt = candidate;
    }

    post.status = action === 'APPROVE' ? (parsedScheduledAt ? 'SCHEDULED' : 'APPROVED') : 'REJECTED';
    post.scheduledAt = parsedScheduledAt;
    post.rejectionFeedback = action === 'REJECT' ? feedback.trim() : null;
    post.reviewedBy = session.user.id;
    post.reviewedAt = new Date();
    await post.save();

    if (post.status === 'SCHEDULED' && post.scheduledAt) {
      try {
        await scheduleLinkedInPost(post._id.toString(), post.scheduledAt);
      } catch (error) {
        post.status = 'FAILED';
        post.publishing = {
          platform: 'LINKEDIN',
          error: error instanceof Error ? error.message : 'Failed to schedule approved post.',
        };
        await post.save();
        return NextResponse.json({ error: 'Post was approved but could not be scheduled.' }, { status: 502 });
      }
    }

    return NextResponse.json({ message: `Post ${action === 'APPROVE' ? 'approved' : 'rejected'}.`, status: post.status, feedback: post.rejectionFeedback });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to review post.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}