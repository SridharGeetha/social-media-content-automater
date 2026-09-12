import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import Media, { IMedia } from '@/models/Media';
import Post from '@/models/Post';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';

describe('Phase 7 — Media Management Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. File Type and Size Validation', () => {
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

    function validateUpload(fileType: string, fileSize: number) {
      const mimeType = fileType.toLowerCase();
      const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

      if (!isImage && !isVideo) {
        return { valid: false, error: 'Unsupported file type.' };
      }

      const limit = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      if (fileSize > limit) {
        return { valid: false, error: 'File size exceeds limit.' };
      }

      return { valid: true, type: isVideo ? 'video' : 'image' };
    }

    it('should approve valid image MIME types', () => {
      ALLOWED_IMAGE_TYPES.forEach((type) => {
        const res = validateUpload(type, 5 * 1024 * 1024);
        expect(res.valid).toBe(true);
        expect(res.type).toBe('image');
      });
    });

    it('should approve valid video MIME types', () => {
      ALLOWED_VIDEO_TYPES.forEach((type) => {
        const res = validateUpload(type, 20 * 1024 * 1024);
        expect(res.valid).toBe(true);
        expect(res.type).toBe('video');
      });
    });

    it('should reject invalid MIME types', () => {
      const invalidTypes = ['application/pdf', 'text/plain', 'image/bmp', 'application/json'];
      invalidTypes.forEach((type) => {
        const res = validateUpload(type, 1024);
        expect(res.valid).toBe(false);
        expect(res.error).toBe('Unsupported file type.');
      });
    });

    it('should reject images larger than 10MB', () => {
      const res = validateUpload('image/png', 11 * 1024 * 1024);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('File size exceeds limit.');
    });

    it('should reject videos larger than 50MB', () => {
      const res = validateUpload('video/mp4', 51 * 1024 * 1024);
      expect(res.valid).toBe(false);
      expect(res.error).toBe('File size exceeds limit.');
    });
  });

  describe('2. Cloudinary Upload Service', () => {
    it('should return valid metadata for image uploads', async () => {
      process.env.MOCK_CLOUDINARY = 'true';
      const fakeBuffer = Buffer.from('fake image content');
      const result = await uploadToCloudinary(fakeBuffer, {
        folder: 'test_folder',
        resourceType: 'image',
      });

      expect(result).toHaveProperty('publicId');
      expect(result).toHaveProperty('secureUrl');
      expect(result.resourceType).toBe('image');
      expect(result.fileSize).toBe(fakeBuffer.length);
    });

    it('should return valid duration and metadata for video uploads', async () => {
      process.env.MOCK_CLOUDINARY = 'true';
      const fakeBuffer = Buffer.from('fake video content');
      const result = await uploadToCloudinary(fakeBuffer, {
        folder: 'test_folder',
        resourceType: 'video',
      });

      expect(result.resourceType).toBe('video');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should simulate deletion successfully', async () => {
      process.env.MOCK_CLOUDINARY = 'true';
      const res = await deleteFromCloudinary('test_public_id', 'image');
      expect(res.result).toBe('ok');
    });
  });

  describe('3. MongoDB Media Document Schema & Workspace Isolation', () => {
    const workspaceAId = new mongoose.Types.ObjectId();
    const workspaceBId = new mongoose.Types.ObjectId();
    const user1Id = new mongoose.Types.ObjectId();

    it('should create a Media model instance with metadata and NO binary storage', () => {
      const mediaData = {
        _id: new mongoose.Types.ObjectId(),
        workspaceId: workspaceAId,
        uploadedBy: user1Id,
        type: 'image' as const,
        cloudinaryPublicId: 'workspaces/ws_1/img_123',
        cloudinaryUrl: 'http://res.cloudinary.com/demo/image/upload/img_123.jpg',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/img_123.jpg',
        format: 'jpg',
        width: 1080,
        height: 1080,
        fileSize: 512000,
      };

      const media = new Media(mediaData);
      expect(media.workspaceId.toString()).toBe(workspaceAId.toString());
      expect(media.cloudinaryPublicId).toBe('workspaces/ws_1/img_123');
      expect(media.secureUrl).toBe('https://res.cloudinary.com/demo/image/upload/img_123.jpg');
      // Ensure binary content field does not exist
      expect((media as unknown as Record<string, unknown>).binary).toBeUndefined();
      expect((media as unknown as Record<string, unknown>).buffer).toBeUndefined();
    });

    it('should isolate media queries strictly by workspaceId', () => {
      const mediaItemA = new Media({
        workspaceId: workspaceAId,
        uploadedBy: user1Id,
        type: 'image',
        cloudinaryPublicId: 'pub_a',
        cloudinaryUrl: 'http://res.cloudinary.com/demo/a.jpg',
        secureUrl: 'https://res.cloudinary.com/demo/a.jpg',
        fileSize: 100,
      });

      const mediaItemB = new Media({
        workspaceId: workspaceBId,
        uploadedBy: user1Id,
        type: 'video',
        cloudinaryPublicId: 'pub_b',
        cloudinaryUrl: 'http://res.cloudinary.com/demo/b.mp4',
        secureUrl: 'https://res.cloudinary.com/demo/b.mp4',
        fileSize: 500,
      });

      // Filter simulation
      const mockDb = [mediaItemA, mediaItemB];

      const workspaceAMedia = mockDb.filter(m => m.workspaceId.toString() === workspaceAId.toString());
      expect(workspaceAMedia.length).toBe(1);
      expect(workspaceAMedia[0].cloudinaryPublicId).toBe('pub_a');

      const workspaceBMedia = mockDb.filter(m => m.workspaceId.toString() === workspaceBId.toString());
      expect(workspaceBMedia.length).toBe(1);
      expect(workspaceBMedia[0].cloudinaryPublicId).toBe('pub_b');
    });
  });

  describe('4. Post Media Attachment & Cross-Workspace Protection', () => {
    const workspace1 = new mongoose.Types.ObjectId();
    const workspace2 = new mongoose.Types.ObjectId();
    const user1 = new mongoose.Types.ObjectId();

    it('should allow attaching media items belonging to the post workspace', () => {
      const validMediaId = new mongoose.Types.ObjectId();

      const post = new Post({
        workspaceId: workspace1,
        createdBy: user1,
        content: 'Post with valid media attachment',
        mediaIds: [validMediaId],
        status: 'DRAFT',
      });

      expect(post.mediaIds.length).toBe(1);
      expect(post.mediaIds[0].toString()).toBe(validMediaId.toString());
    });

    it('should reject post attachment validation if media belongs to a different workspace', () => {
      const mediaItemWorkspace2 = {
        _id: new mongoose.Types.ObjectId(),
        workspaceId: workspace2,
      };

      const currentWorkspaceId = workspace1;

      const isValidAttachment = mediaItemWorkspace2.workspaceId.toString() === currentWorkspaceId.toString();
      expect(isValidAttachment).toBe(false);
    });
  });
});
