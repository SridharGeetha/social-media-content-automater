import { decryptSocialToken } from '@/lib/social';
import { publishInstagramImagePost } from '@/lib/instagram';
import Media from '@/models/Media';
import SocialAccount from '@/models/SocialAccount';
import type { IPost } from '@/models/Post';

export async function publishPostToInstagram(post: Pick<IPost, 'content' | 'workspaceId' | 'mediaIds'>): Promise<string> {
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

  const accessToken = decryptSocialToken(account.encryptedAccessToken);
  return publishInstagramImagePost(accessToken, account.accountId, post.content.trim(), mediaUrl.toString());
}