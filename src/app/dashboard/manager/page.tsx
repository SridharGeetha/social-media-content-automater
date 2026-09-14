'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { 
  Users, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  LogOut, 
  FileText, 
  Clock, 
  ThumbsUp, 
  ThumbsDown,
  Layers,
  Film,
  UserCircle
} from 'lucide-react';
import PostsManager from '@/components/PostsManager';
import MediaLibrary from '@/components/MediaLibrary';

export default function ManagerDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'posts' | 'media' | 'queue' | 'calendar' | 'activity'>('posts');

  // Simulated content review items for Manager Phase 1 UI
  const [reviewItems, setReviewItems] = useState([
    {
      id: '1',
      title: 'Q3 Product Announcement Reel & Infographic',
      creator: 'Sarah Jenkins (Creator)',
      platform: 'Instagram / LinkedIn',
      status: 'Awaiting Approval',
      submittedAt: '2 hours ago',
    },
    {
      id: '2',
      title: 'Weekly AI Innovations Thread & Carousel',
      creator: 'David Miller (Creator)',
      platform: 'Twitter / X',
      status: 'Awaiting Approval',
      submittedAt: '5 hours ago',
    },
  ]);

  const handleApprove = (id: string) => {
    setReviewItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16' }}>
      {/* Manager Sidebar Navigation */}
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
              Manager Studio
            </div>
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
            {reviewItems.length > 0 && (
              <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '9999px', color: '#ffffff', fontWeight: 700 }}>
                {reviewItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'calendar' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'calendar' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'calendar' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Calendar style={{ width: '18px', height: '18px' }} />
            Campaign Schedule
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'activity' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'activity' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'activity' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <TrendingUp style={{ width: '18px', height: '18px' }} />
            Team Performance
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
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0D530E' }}>Manager Strategy & Approvals</h1>
            <p style={{ color: '#306D29', fontSize: '0.92rem', marginTop: '4px' }}>
              Review creator submissions, organize social campaigns, and manage publishing timelines.
            </p>
          </div>
          <span className="role-badge role-manager" style={{ background: 'rgba(48, 109, 41, 0.12)', color: '#0D530E', borderColor: 'rgba(48, 109, 41, 0.3)' }}>Active Role: MANAGER</span>
        </div>

        {/* Live Posts Management Tab */}
        {activeTab === 'posts' && (
          <div className="animate-fade-in">
            <PostsManager userRole="MANAGER" />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>SUBMISSIONS TO REVIEW</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22d3ee', marginTop: '4px' }}>{reviewItems.length}</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>APPROVED THIS WEEK</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>14</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE CREATORS</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>5</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '16px' }}>Approval Queue</h3>

              {reviewItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <CheckCircle2 style={{ width: '36px', height: '36px', color: '#34d399', margin: '0 auto 12px auto' }} />
                  <p style={{ fontWeight: 600, color: '#f8fafc' }}>All clear! No pending submissions.</p>
                  <p style={{ fontSize: '0.88rem' }}>Creators will submit new draft posts here for your review.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reviewItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{item.title}</div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '16px' }}>
                          <span>Submitted by: <strong style={{ color: '#cbd5e1' }}>{item.creator}</strong></span>
                          <span>Platforms: <strong style={{ color: '#22d3ee' }}>{item.platform}</strong></span>
                          <span>Submitted: {item.submittedAt}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#f87171' }}
                        >
                          <ThumbsDown style={{ width: '16px', height: '16px' }} /> Reject
                        </button>
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                        >
                          <ThumbsUp style={{ width: '16px', height: '16px' }} /> Approve Draft
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(activeTab === 'calendar' || activeTab === 'activity') && (
          <div className="glass-panel animate-fade-in" style={{ padding: '36px', textAlign: 'center' }}>
            <Clock style={{ width: '32px', height: '32px', color: '#22d3ee', margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', marginBottom: '6px' }}>Section Ready for Phase 2</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Advanced campaign scheduling and team performance metrics will be available in future releases.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
