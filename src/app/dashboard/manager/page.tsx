'use client';

import React, { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  LogOut,
  FileText,
  Layers,
  Film,
  UserCircle,
  Plus,
  Save,
} from 'lucide-react';
import PostsManager, { PostStatus } from '@/components/PostsManager';
import MediaLibrary from '@/components/MediaLibrary';
import NotificationDropdown from '@/components/NotificationDropdown';

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'queue'>('posts');
  const [createPostTrigger, setCreatePostTrigger] = useState(0);
  const [createPostStatus, setCreatePostStatus] = useState<PostStatus>('DRAFT');

  const openPostComposer = (status: PostStatus) => {
    setCreatePostStatus(status);
    setCreatePostTrigger((value) => value + 1);
    setActiveTab('posts');
  };

  useEffect(() => {
    fetch('/api/members')
      .then((response) => response.json())
      .then((data) => {
        if (data.workspace?.name) setWorkspaceName(data.workspace.name);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16' }}>
      <aside className="dashboard-sidebar" style={{ width: '260px', borderRight: '1px solid rgba(231, 225, 177, 0.42)', background: 'linear-gradient(180deg, #041A05 0%, #08310C 25%, #0B3D12 100%)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#B9E769', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{workspaceName}</div>
            <span className="role-badge role-manager" style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: '2px' }}>
              MANAGER DASHBOARD
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('posts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'posts' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'posts' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'posts' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText style={{ width: '18px', height: '18px' }} />
              All Workspace Posts
            </div>
          </button>

          <button
            onClick={() => setActiveTab('media')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'media' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'media' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'media' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Film style={{ width: '18px', height: '18px' }} />
              Media Library
            </div>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'queue' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'queue' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'queue' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers style={{ width: '18px', height: '18px' }} />
              Content Review Queue
            </div>
          </button>

        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 14px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
              <UserCircle style={{ width: '21px', height: '21px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name || 'Manager'}</div>
              <div style={{ fontSize: '0.72rem', color: '#e6f8e2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.email || 'Manager account'}</div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', color: '#fecaca', borderColor: 'rgba(248, 113, 113, 0.5)' }}>
            <LogOut style={{ width: '16px', height: '16px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="dashboard-main-content" style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        <div className="dashboard-top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 400, color: '#B9E769' }}>
              {activeTab === 'posts' ? 'All Workspace Posts' : activeTab === 'media' ? 'Media Library' : 'Content Review Queue'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button type="button" onClick={() => openPostComposer('DRAFT')} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.35)', color: '#E7E1B1' }}>
              <Save style={{ width: '14px', height: '14px' }} />
              Save Draft
            </button>
            <button type="button" onClick={() => openPostComposer('SCHEDULED')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}>
              <Plus style={{ width: '16px', height: '16px' }} />
              Create Post
            </button>
            <NotificationDropdown
              userRole="MANAGER"
              currentUserId={session?.user?.id}
              onNavigateToTab={(tab) => {
                if (tab === 'posts' || tab === 'media' || tab === 'queue') setActiveTab(tab);
              }}
            />
          </div>
        </div>

        {/* Live Posts Management Tab */}
        {activeTab === 'posts' && (
          <div className="animate-fade-in">
            <PostsManager key={createPostTrigger} userRole="MANAGER" createPostTrigger={createPostTrigger} createPostStatus={createPostStatus} openCreateOnMount={createPostTrigger > 0} hideManagementHeader />
          </div>
        )}

        {/* Media Library Tab */}
        {activeTab === 'media' && (
          <div className="animate-fade-in">
            <MediaLibrary userRole="MANAGER" />
          </div>
        )}

        {/* Content Review Queue */}
        {activeTab === 'queue' && (
          <div className="animate-fade-in">
            <PostsManager userRole="MANAGER" initialStatus="PENDING_REVIEW" hideManagementHeader />
          </div>
        )}
      </main>
    </div>
  );
}
