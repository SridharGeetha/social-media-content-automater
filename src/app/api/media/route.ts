import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Media from '@/models/Media';
import WorkspaceMember from '@/models/WorkspaceMember';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = session.user.id;
    const currentMember = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });

    if (!currentMember) {
      return NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 });
    }

    // Workspace isolation filter: strictly lock to workspaceId
    const filter: Record<string, unknown> = {
      workspaceId: currentMember.workspaceId,
    };

    const typeParam = req.nextUrl.searchParams.get('type')?.toLowerCase();
    if (typeParam === 'image' || typeParam === 'video') {
      filter.type = typeParam;
    }

    const mediaItems = await Media.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: 'uploadedBy',
        model: User,
        select: 'name email image',
      });

    const formattedMedia = mediaItems.map((item) => {
      const uploader = item.uploadedBy as unknown as { _id: { toString(): string }; name: string; email: string; image?: string } | null;
      return {
        id: item._id.toString(),
        workspaceId: item.workspaceId.toString(),
        uploadedBy: uploader
          ? {
              id: uploader._id.toString(),
              name: uploader.name,
              email: uploader.email,
              image: uploader.image,
            }
          : { id: item.uploadedBy.toString(), name: 'Unknown', email: '' },
        type: item.type,
        cloudinaryPublicId: item.cloudinaryPublicId,
        cloudinaryUrl: item.cloudinaryUrl,
        secureUrl: item.secureUrl,
        format: item.format,
        width: item.width,
        height: item.height,
        duration: item.duration,
        fileSize: item.fileSize,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      media: formattedMedia,
      workspaceId: currentMember.workspaceId.toString(),
      currentRole: currentMember.role,
    });
  } catch (error: unknown) {
    console.error('Fetch Media API Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch media library.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
