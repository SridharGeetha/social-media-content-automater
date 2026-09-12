import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Media from '@/models/Media';
import WorkspaceMember from '@/models/WorkspaceMember';
import { uploadToCloudinary } from '@/lib/cloudinary';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jpg',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
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

    // Admin, Manager, and Creator can upload media
    if (!['ADMIN', 'MANAGER', 'CREATOR'].includes(currentMember.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient workspace permissions.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in request.' }, { status: 400 });
    }

    const mimeType = file.type.toLowerCase();
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${file.type}). Allowed image formats: JPG, PNG, GIF, WEBP. Allowed video formats: MP4, WebM, MOV, AVI.`,
        },
        { status: 400 }
      );
    }

    const maxAllowedSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxAllowedSize) {
      const limitMb = maxAllowedSize / (1024 * 1024);
      return NextResponse.json(
        {
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${limitMb}MB for ${isImage ? 'images' : 'videos'}.`,
        },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(buffer, {
        folder: `workspaces/${currentMember.workspaceId.toString()}`,
        resourceType: isVideo ? 'video' : 'image',
        filename: file.name,
      });
    } catch (uploadErr: unknown) {
      console.error('Cloudinary upload execution error:', uploadErr);
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Cloudinary upload failed.';
      return NextResponse.json({ error: `Media upload failed: ${msg}` }, { status: 502 });
    }

    // Save only Cloudinary metadata reference in MongoDB
    const mediaDoc = await Media.create({
      workspaceId: currentMember.workspaceId,
      uploadedBy: userId,
      type: isVideo ? 'video' : 'image',
      cloudinaryPublicId: uploadResult.publicId,
      cloudinaryUrl: uploadResult.url,
      secureUrl: uploadResult.secureUrl,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration,
      fileSize: uploadResult.fileSize || file.size,
    });

    const populatedMedia = await Media.findById(mediaDoc._id).populate({
      path: 'uploadedBy',
      select: 'name email image',
    });

    return NextResponse.json(
      {
        message: 'Media uploaded successfully.',
        media: {
          id: mediaDoc._id.toString(),
          workspaceId: mediaDoc.workspaceId.toString(),
          uploadedBy: populatedMedia?.uploadedBy || userId,
          type: mediaDoc.type,
          cloudinaryPublicId: mediaDoc.cloudinaryPublicId,
          cloudinaryUrl: mediaDoc.cloudinaryUrl,
          secureUrl: mediaDoc.secureUrl,
          format: mediaDoc.format,
          width: mediaDoc.width,
          height: mediaDoc.height,
          duration: mediaDoc.duration,
          fileSize: mediaDoc.fileSize,
          createdAt: mediaDoc.createdAt.toISOString(),
          updatedAt: mediaDoc.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Upload Media API Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error while uploading media.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
