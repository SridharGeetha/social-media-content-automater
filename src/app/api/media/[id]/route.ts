import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Media from '@/models/Media';
import WorkspaceMember from '@/models/WorkspaceMember';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    // Workspace isolation check: ensure media belongs to current workspace
    const mediaItem = await Media.findOne({
      _id: id,
      workspaceId: currentMember.workspaceId,
    });

    if (!mediaItem) {
      return NextResponse.json({ error: 'Media not found or does not belong to your workspace.' }, { status: 404 });
    }

    // RBAC permission check for deletion:
    // Admin and Manager can delete any workspace media.
    // Creator can only delete media they uploaded.
    if (currentMember.role === 'CREATOR' && mediaItem.uploadedBy.toString() !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Creators can only delete media they uploaded.' },
        { status: 403 }
      );
    }

    // Delete asset from Cloudinary
    try {
      await deleteFromCloudinary(mediaItem.cloudinaryPublicId, mediaItem.type);
    } catch (cloudinaryErr: unknown) {
      console.warn('Cloudinary deletion warning (proceeding with DB delete):', cloudinaryErr);
    }

    // Remove document from MongoDB
    await Media.deleteOne({ _id: id });

    return NextResponse.json({
      message: 'Media asset deleted successfully from Cloudinary and database.',
      id,
    });
  } catch (error: unknown) {
    console.error('Delete Media API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to delete media asset.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
