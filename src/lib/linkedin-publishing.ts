import Post, { IPost } from '@/models/Post';
import SocialAccount from '@/models/SocialAccount';
import { decryptSocialToken } from '@/lib/social';
import { publishLinkedInTextPost } from '@/lib/linkedin';

export async function publishPostToLinkedIn(post: IPost): Promise<string> {
  const account = await SocialAccount.findOne({ workspaceId: post.workspaceId, platform: 'LINKEDIN' })
    .select('+encryptedAccessToken');
  if (!account || account.status !== 'CONNECTED') {
    throw new Error('No connected LinkedIn account was found for this workspace.');
  }
  if (account.expiresAt <= new Date()) {
    throw new Error('The LinkedIn access token has expired. Reconnect LinkedIn first.');
  }

  const externalPostId = await publishLinkedInTextPost(
    decryptSocialToken(account.encryptedAccessToken),
    account.accountId,
    post.content
  );
  const publishedAt = new Date();
  post.status = 'PUBLISHED';
  post.publishedAt = publishedAt;
  post.publishing = { platform: 'LINKEDIN', externalPostId, publishedAt };
  await post.save();
  return externalPostId;
}

export async function markPostPublishFailed(post: IPost, reason: string): Promise<void> {
  post.status = 'FAILED';
  post.publishing = { platform: 'LINKEDIN', error: reason.slice(0, 500) };
  await post.save();
}