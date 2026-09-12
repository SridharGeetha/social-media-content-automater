'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import PostsManager from '@/components/PostsManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PostsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as 'ADMIN' | 'MANAGER' | 'CREATOR' | undefined;
  const userId = session?.user?.id;

  const dashboardHref =
    role === 'ADMIN'
      ? '/dashboard/admin'
      : role === 'MANAGER'
      ? '/dashboard/manager'
      : '/dashboard/creator';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', padding: '36px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <Link
            href={dashboardHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#818cf8',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: '16px',
            }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
            Back to Dashboard
          </Link>
        </div>

        <PostsManager userRole={role} currentUserId={userId} />
      </div>
    </div>
  );
}
