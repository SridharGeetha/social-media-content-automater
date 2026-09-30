import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Post from '@/models/Post';
import WorkspaceMember from '@/models/WorkspaceMember';

function parseUtcDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const publishedFrom = parseUtcDate(searchParams.get('publishedFrom'));
    const publishedTo = parseUtcDate(searchParams.get('publishedTo'));
    const scheduledFrom = parseUtcDate(searchParams.get('scheduledFrom'));
    const scheduledToValue = searchParams.get('scheduledTo');
    const scheduledTo = scheduledToValue ? parseUtcDate(scheduledToValue) : null;
    const timezone = searchParams.get('timezone') || 'UTC';

    if (
      !publishedFrom || !publishedTo || !scheduledFrom ||
      (scheduledToValue && !scheduledTo) ||
      publishedFrom >= publishedTo ||
      (scheduledTo && scheduledFrom >= scheduledTo)
    ) {
      return NextResponse.json({ error: 'A valid analytics date range is required.' }, { status: 400 });
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      return NextResponse.json({ error: 'Invalid timezone.' }, { status: 400 });
    }

    await connectToDatabase();
    const currentMember = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }
    if (currentMember.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const publishedDateFilter: Record<string, unknown> = { $type: 'date', $gte: publishedFrom, $lt: publishedTo };
    const scheduledDateFilter: Record<string, unknown> = { $type: 'date', $gte: scheduledFrom };
    if (scheduledTo) scheduledDateFilter.$lt = scheduledTo;

    const [result] = await Post.aggregate([
      { $match: { workspaceId: currentMember.workspaceId } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalPosts: { $sum: 1 },
                drafts: { $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] } },
                pendingReview: { $sum: { $cond: [{ $eq: ['$status', 'PENDING_REVIEW'] }, 1, 0] } },
                scheduled: { $sum: { $cond: [{ $eq: ['$status', 'SCHEDULED'] }, 1, 0] } },
              },
            },
          ],
          publishedDays: [
            { $match: { status: 'PUBLISHED', publishedAt: publishedDateFilter } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$publishedAt', timezone } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } },
          ],
          scheduledDays: [
            { $match: { status: 'SCHEDULED', scheduledAt: scheduledDateFilter } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$scheduledAt', timezone } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', count: 1 } },
          ],
        },
      },
    ]);

    return NextResponse.json(
      {
        summary: result?.summary?.[0] || { totalPosts: 0, drafts: 0, pendingReview: 0, scheduled: 0 },
        publishedDays: result?.publishedDays || [],
        scheduledDays: result?.scheduledDays || [],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Fetch post analytics error:', error);
    return NextResponse.json({ error: 'Unable to load post analytics.' }, { status: 500 });
  }
}