import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import WorkspaceMember from '@/models/WorkspaceMember';
import Invitation from '@/models/Invitation';
import User from '@/models/User';
import Workspace from '@/models/Workspace';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = session.user.id;

    // Get active workspace for user
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });
    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    const workspaceId = currentMember.workspaceId;
    const workspace = await Workspace.findById(workspaceId);

    // Fetch members with user details
    const members = await WorkspaceMember.find({ workspaceId }).sort({ createdAt: 1 }).populate({
      path: 'userId',
      model: User,
      select: 'name email image',
    });

    // Fetch invitations
    const invitations = await Invitation.find({ workspaceId }).sort({ createdAt: -1 });

    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const formattedInvitations = invitations.map((inv) => ({
      id: inv._id.toString(),
      email: inv.email,
      role: inv.role,
      token: inv.token,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      invitationUrl: `${origin}/register?token=${inv.token}`,
    }));

    const formattedMembers = members.map((m) => {
      const userObj = m.userId as unknown as { _id: string; name: string; email: string };
      return {
        id: m._id.toString(),
        userId: userObj ? userObj._id.toString() : 'unknown',
        name: userObj ? userObj.name : 'Unknown User',
        email: userObj ? userObj.email : 'Unknown Email',
        role: m.role,
        joinedAt: m.createdAt,
      };
    });

    return NextResponse.json({
      workspace: {
        id: workspaceId.toString(),
        name: workspace ? workspace.name : 'Workspace',
        slug: workspace ? workspace.slug : '',
      },
      currentRole: currentMember.role,
      members: formattedMembers,
      invitations: formattedInvitations,
    });
  } catch (error: unknown) {
    console.error('Fetch Members API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch members.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
