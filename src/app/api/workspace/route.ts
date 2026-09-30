import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { name } = await request.json();
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const member = await WorkspaceMember.findOne({ userId: session.user.id }).sort({ createdAt: -1 });
    if (!member) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }
    if (member.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only workspace admins can update the workspace name.' }, { status: 403 });
    }

    const workspace = await Workspace.findById(member.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    workspace.name = name.trim();
    await workspace.save();

    return NextResponse.json({
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
      },
    });
  } catch (error: unknown) {
    console.error('Update Workspace API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update workspace name.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}