import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary securely on the server side
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  resourceType: 'image' | 'video';
}

/**
 * Uploads a file buffer to Cloudinary.
 * Supports both images and videos.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  options: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'auto';
    filename?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.MOCK_CLOUDINARY === 'true';

  // If in mock/test mode without active credentials, return a simulated Cloudinary response
  if (isTest && (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'mock')) {
    const isVideo = options.resourceType === 'video';
    const fakeId = `mock_folder/mock_${Date.now()}`;
    return {
      publicId: fakeId,
      url: `http://res.cloudinary.com/demo/${isVideo ? 'video' : 'image'}/upload/${fakeId}.${isVideo ? 'mp4' : 'png'}`,
      secureUrl: `https://res.cloudinary.com/demo/${isVideo ? 'video' : 'image'}/upload/${fakeId}.${isVideo ? 'mp4' : 'png'}`,
      format: isVideo ? 'mp4' : 'png',
      width: 1200,
      height: 630,
      duration: isVideo ? 15 : undefined,
      fileSize: fileBuffer.length,
      resourceType: isVideo ? 'video' : 'image',
    };
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'social_automater',
        resource_type: options.resourceType || 'auto',
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(error?.message || 'Failed to upload media to Cloudinary.'));
        }

        const resType: 'image' | 'video' = result.resource_type === 'video' ? 'video' : 'image';

        resolve({
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          format: result.format || '',
          width: result.width,
          height: result.height,
          duration: result.duration ? Math.round(result.duration * 100) / 100 : undefined,
          fileSize: result.bytes || fileBuffer.length,
          resourceType: resType,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Deletes an asset from Cloudinary by publicId and resourceType.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ result: string }> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.MOCK_CLOUDINARY === 'true';

  if (isTest && (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'mock')) {
    return { result: 'ok' };
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  return await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

export default cloudinary;
