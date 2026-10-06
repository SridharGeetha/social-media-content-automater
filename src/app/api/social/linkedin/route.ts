import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import WorkspaceMember from '@/models/WorkspaceMember';
import SocialAccount from '@/models/SocialAccount';
import { canManageSocialAccounts } from '@/lib/social';

async function getAdminMembership(userId: string) {
  const result = await getWorkspaceMembership(userId);
  if (result.error) return result;
  if (!canManageSocialAccounts(result.membership.role)) {
    return { error: NextResponse.json({ error: 'Forbidden. Only Workspace Admins can manage social accounts.' }, { status: 403 }) };
  }
  return result;
}

async function getWorkspaceMembership(userId: string) {
  await connectToDatabase();
  const membership = await WorkspaceMember.findOne({ userId }).sort({ createdAt: -1 });
  if (!membership) return { error: NextResponse.json({ error: 'Workspace membership not found.' }, { status: 404 }) };
  return { membership };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const result = await getWorkspaceMembership(session.user.id);
  if (result.error) return result.error;

  if (result.membership.role !== 'ADMIN') {
    const account = await SocialAccount.findOne({ workspaceId: result.membership.workspaceId, platform: 'LINKEDIN' }).select('status');
    return NextResponse.json({ connected: account?.status === 'CONNECTED' });
  }

  const account = await SocialAccount.findOne({ workspaceId: result.membership.workspaceId, platform: 'LINKEDIN' })
    .select('platform accountId accountName expiresAt status createdAt updatedAt')
    .lean();

  return NextResponse.json({
    connected: account?.status === 'CONNECTED',
    account: account
      ? {
          platform: account.platform,
          accountId: account.accountId,
          accountName: account.accountName,
          expiresAt: account.expiresAt.toISOString(),
          status: account.status,
          connectedAt: account.createdAt.toISOString(),
        }
      : null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const result = await getAdminMembership(session.user.id);
  if (result.error) return result.error;

  await SocialAccount.deleteOne({ workspaceId: result.membership.workspaceId, platform: 'LINKEDIN' });
  return NextResponse.json({ message: 'LinkedIn account disconnected.' });
}