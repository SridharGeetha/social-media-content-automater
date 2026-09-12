import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Invitation from '@/models/Invitation';
import WorkspaceMember from '@/models/WorkspaceMember';
import Workspace from '@/models/Workspace';

export async function POST(req: Request) {
  try {
    const { name, email, password, token } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    await connectToDatabase();

    // -------------------------------------------------------------
    // FLOW A: TOKEN-BASED INVITATION REGISTRATION
    // -------------------------------------------------------------
    if (token) {
      const invitation = await Invitation.findOne({
        token,
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation token. Please request a new invitation from your Admin.' },
          { status: 400 }
        );
      }

      const invitedEmail = invitation.email.toLowerCase();

      // Check if user with this email already exists
      let user = await User.findOne({ email: invitedEmail });
      const hashedPassword = await bcrypt.hash(password, 10);

      if (user) {
        // If user already exists, update their password if not set
        if (!user.password) {
          user.password = hashedPassword;
          await user.save();
        }
      } else {
        user = await User.create({
          name: name.trim(),
          email: invitedEmail,
          password: hashedPassword,
        });
      }

      // Check workspace exists
      const workspace = await Workspace.findById(invitation.workspaceId);
      if (!workspace) {
        return NextResponse.json({ error: 'Associated workspace no longer exists.' }, { status: 404 });
      }

      // Create Workspace Member with exact assigned role from invitation (CRITICAL SECURITY RULE)
      const assignedRole = invitation.role; // MANAGER or CREATOR

      await WorkspaceMember.findOneAndUpdate(
        { workspaceId: invitation.workspaceId, userId: user._id },
        { role: assignedRole },
        { upsert: true, new: true }
      );

      // Mark invitation as ACCEPTED
      invitation.status = 'ACCEPTED';
      await invitation.save();

      const redirectPath = assignedRole === 'MANAGER' ? '/dashboard/manager' : '/dashboard/creator';

      return NextResponse.json({
        success: true,
        message: `Account created successfully and joined workspace as ${assignedRole}!`,
        role: assignedRole,
        redirectUrl: redirectPath,
      });
    }

    // -------------------------------------------------------------
    // FLOW B: STANDARD INITIAL REGISTRATION (Will become Admin)
    // -------------------------------------------------------------
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please log in to set up your workspace.',
      userId: newUser._id.toString(),
      redirectUrl: '/login?registered=true',
    });
  } catch (error: unknown) {
    console.error('Registration API Error:', error);
    const msg = error instanceof Error ? error.message : 'Registration failed. Please try again.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
