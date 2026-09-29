import { decryptSocialToken } from '@/lib/social';
import {
  createInstagramImageContainer,
  getInstagramImageContainerStatus,
  publishInstagramImageContainer,
  publishInstagramImagePost,
} from '@/lib/instagram';
import Media from '@/models/Media';
import SocialAccount from '@/models/SocialAccount';
import type { IPost } from '@/models/Post';

type InstagramPost = Pick<IPost, 'content' | 'workspaceId' | 'mediaIds'>;

async function getInstagramPostContext(post: InstagramPost) {
  if (!Array.isArray(post.mediaIds) || post.mediaIds.length !== 1) {
    throw new Error('Instagram image publishing requires exactly one attached image.');
  }

  const account = await SocialAccount.findOne({ workspaceId: post.workspaceId, platform: 'INSTAGRAM' })
    .select('+encryptedAccessToken');
  if (!account || account.status !== 'CONNECTED') {
    throw new Error('No connected Instagram account is available for this workspace.');
  }
  if (account.expiresAt <= new Date()) {
    throw new Error('The Instagram access token has expired. Reconnect Instagram first.');
  }

  const media = await Media.findOne({ _id: post.mediaIds[0], workspaceId: post.workspaceId })
    .select('type secureUrl');
  if (!media || media.type !== 'image') {
    throw new Error('Instagram image publishing requires one image attached to this workspace post.');
  }

  let mediaUrl: URL;
  try {
    mediaUrl = new URL(media.secureUrl);
  } catch {
    throw new Error('The attached media does not have a valid public URL.');
  }
  if (mediaUrl.protocol !== 'https:') {
    throw new Error('Instagram media must be available at a public HTTPS URL.');
  }

  return {
    accessToken: decryptSocialToken(account.encryptedAccessToken),
    accountId: account.accountId,
    caption: post.content.trim(),
    imageUrl: mediaUrl.toString(),
  };
}

export async function createInstagramContainerForPost(post: InstagramPost): Promise<string> {
  const context = await getInstagramPostContext(post);
  return createInstagramImageContainer(context.accessToken, context.accountId, context.caption, context.imageUrl);
}

export async function getInstagramContainerStatusForPost(
  post: InstagramPost,
  containerId: string
): Promise<{ statusCode: string; status?: string }> {
  const context = await getInstagramPostContext(post);
  return getInstagramImageContainerStatus(context.accessToken, containerId);
}

export async function publishInstagramContainerForPost(post: InstagramPost, containerId: string): Promise<string> {
  const context = await getInstagramPostContext(post);
  return publishInstagramImageContainer(context.accessToken, context.accountId, containerId);
}

export async function publishPostToInstagram(post: InstagramPost): Promise<string> {
  const context = await getInstagramPostContext(post);
  return publishInstagramImagePost(context.accessToken, context.accountId, context.caption, context.imageUrl);
}