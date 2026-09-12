import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import WorkspaceMember from '@/models/WorkspaceMember';
import Workspace from '@/models/Workspace';
import Invitation from '@/models/Invitation';
import { sendInvitationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required.' }, { status: 400 });
    }

    if (role !== 'MANAGER' && role !== 'CREATOR') {
      return NextResponse.json({ error: 'Role must be either Manager or Creator.' }, { status: 400 });
    }

    await connectToDatabase();

    const userId = session.user.id;

    // Verify caller's membership & ADMIN role
    const membership = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });
    if (!membership || membership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Only Workspace Admins can send invitations.' },
        { status: 403 }
      );
    }

    const workspaceId = membership.workspaceId;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    const targetEmail = email.toLowerCase().trim();

    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    // Save or update existing pending invitation for this email & workspace
    const invitation = await Invitation.findOneAndUpdate(
      { workspaceId, email: targetEmail },
      {
        workspaceId,
        email: targetEmail,
        role,
        token,
        status: 'PENDING',
        invitedBy: userId,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // Build URL
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const invitationUrl = `${origin}/register?token=${token}`;

    // Send email / log email
    await sendInvitationEmail({
      toEmail: targetEmail,
      role,
      workspaceName: workspace.name,
      invitationUrl,
      inviterName: session.user.name || 'Workspace Admin',
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully sent to ${targetEmail} as ${role}!`,
      invitation: {
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        invitationUrl,
      },
    });
  } catch (error: unknown) {
    console.error('Create Invitation API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send invitation.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
