import { DefaultSession } from 'next-auth';
import { UserRole } from '@/models/WorkspaceMember';

declare module 'next-auth' {
  interface User {
    id: string;
    role?: UserRole;
    workspaceId?: string;
  }

  interface Session {
    user: {
      id: string;
      role?: UserRole;
      workspaceId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    workspaceId?: string;
  }
}
