import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import WorkspaceMember from '@/models/WorkspaceMember';
import { UserRole } from '@/models/WorkspaceMember';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password.');
        }

        await connectToDatabase();

        const user = await User.findOne({ email: (credentials.email as string).toLowerCase() });
        if (!user || !user.password) {
          throw new Error('Invalid email or password.');
        }

        const isMatch = await bcrypt.compare(credentials.password as string, user.password);
        if (!isMatch) {
          throw new Error('Invalid email or password.');
        }

        // Fetch user's workspace membership and role
        const membership = await WorkspaceMember.findOne({ userId: user._id }).sort({ createdAt: -1 });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: (membership?.role as UserRole) || undefined,
          workspaceId: membership?.workspaceId ? membership.workspaceId.toString() : undefined,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
      }

      if (trigger === 'update' && session) {
        if (session.role) token.role = session.role;
        if (session.workspaceId) token.workspaceId = session.workspaceId;
      }

      // If role/workspace is missing on token, refresh from DB in Node runtime
      if (token.id && (!token.role || !token.workspaceId)) {
        await connectToDatabase();
        const membership = await WorkspaceMember.findOne({ userId: token.id }).sort({ createdAt: -1 });
        if (membership) {
          token.role = membership.role as UserRole;
          token.workspaceId = membership.workspaceId.toString();
        }
      }

      return token;
    },
  },
});
