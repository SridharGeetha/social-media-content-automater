import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const userId = session.user.id;

    // Generate unique slug
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug) slug = 'workspace';

    const existingSlug = await Workspace.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Create Workspace
    const workspace = await Workspace.create({
      name: name.trim(),
      slug,
      ownerId: userId,
    });

    // Create WorkspaceMember with ADMIN role for creator
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: userId,
      role: 'ADMIN',
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        slug: workspace.slug,
        role: 'ADMIN',
      },
      redirectUrl: '/dashboard/admin',
    });
  } catch (error: unknown) {
    console.error('Create Workspace API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create workspace.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
