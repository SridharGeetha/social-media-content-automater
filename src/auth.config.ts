import type { NextAuthConfig } from 'next-auth';
import { UserRole } from '@/models/WorkspaceMember';

export const authConfig = {
  secret: process.env.AUTH_SECRET || 'super-secret-auth-key-social-media-automater-2026',
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [], // Empty providers array for Edge compatibility in Middleware
  callbacks: {
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

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.workspaceId = token.workspaceId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
