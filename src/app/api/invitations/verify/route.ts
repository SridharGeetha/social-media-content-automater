import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Invitation from '@/models/Invitation';
import Workspace from '@/models/Workspace';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing invitation token.' }, { status: 400 });
    }

    await connectToDatabase();

    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: `This invitation has already been ${invitation.status.toLowerCase()}.` }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'EXPIRED';
      await invitation.save();
      return NextResponse.json({ error: 'This invitation link has expired. Please ask your Admin for a new invite.' }, { status: 400 });
    }

    const workspace = await Workspace.findById(invitation.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace no longer exists.' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      email: invitation.email,
      role: invitation.role,
      workspaceName: workspace.name,
    });
  } catch (error: unknown) {
    console.error('Verify Invitation API Error:', error);
    const msg = error instanceof Error ? error.message : 'Verification failed.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
