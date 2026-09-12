import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'Social Media Content Automater | Multi-Role Workspace Platform',
  description:
    'Scale social media operations with multi-role workspace management, AI draft automation, and role-based permissions for Admins, Managers, and Creators.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
