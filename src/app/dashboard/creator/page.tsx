'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { 
  Plus, 
  FileText, 
  LogOut, 
  Film,
  UserCircle
} from 'lucide-react';
import PostsManager from '@/components/PostsManager';
import MediaLibrary from '@/components/MediaLibrary';
import NotificationDropdown from '@/components/NotificationDropdown';

export default function CreatorDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'drafts' | 'new' | 'assets'>('drafts');
  const [createPostTrigger, setCreatePostTrigger] = useState(0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16' }}>
      {/* Creator Sidebar Navigation */}
      <aside className="dashboard-sidebar"
        style={{
          width: '260px',
          borderRight: '1px solid rgba(231, 225, 177, 0.42)',
          background: 'linear-gradient(180deg, #041A05 0%, #08310C 25%, #0B3D12 100%)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Creator Studio
            </div>
            <span className="role-badge role-creator" style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: '2px' }}>
              CREATOR DASHBOARD
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('drafts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'drafts' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'drafts' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'drafts' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText style={{ width: '18px', height: '18px' }} />
              My Content Drafts
            </div>
          </button>


          <button
            onClick={() => setActiveTab('assets')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'assets' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'assets' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'assets' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Film style={{ width: '18px', height: '18px' }} />
            Media Library
          </button>
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 14px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
              <UserCircle style={{ width: '21px', height: '21px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name || 'Creator'}</div>
              <div style={{ fontSize: '0.72rem', color: '#e6f8e2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.email || 'Creator account'}</div>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem', color: '#fecaca', borderColor: 'rgba(248, 113, 113, 0.5)' }}>
            <LogOut style={{ width: '16px', height: '16px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Studio Area */}
      <main className="dashboard-main-content" style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        <div className="dashboard-top-header admin-dashboard-top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 400, color: '#ffffff' }}>Creator Content Studio</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('new');
                setCreatePostTrigger((value) => value + 1);
              }}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              Create Post
            </button>
            <NotificationDropdown
              userRole="CREATOR"
              currentUserId={session?.user?.id}
              onNavigateToTab={(tab) => {
                if (tab === 'drafts' || tab === 'new' || tab === 'assets') setActiveTab(tab);
              }}
            />
          </div>
        </div>

        {/* MY DRAFTS & POSTS TAB */}
        {activeTab === 'drafts' && (
          <div className="animate-fade-in">
            <PostsManager userRole="CREATOR" currentUserId={session?.user?.id} />
          </div>
        )}

        {/* CREATE NEW POST TAB */}
        {activeTab === 'new' && (
          <div className="animate-fade-in">
            <PostsManager key={createPostTrigger} userRole="CREATOR" currentUserId={session?.user?.id} openCreateOnMount />
          </div>
        )}

        {/* ASSET LIBRARY TAB */}
        {activeTab === 'assets' && (
          <div className="animate-fade-in">
            <MediaLibrary userRole="CREATOR" currentUserId={session?.user?.id} />
          </div>
        )}
      </main>
    </div>
  );
}
