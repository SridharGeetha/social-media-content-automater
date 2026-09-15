'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { 
  Zap, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  LogOut, 
  Send, 
  Clock, 
  CheckCircle2,
  Sparkles,
  Film,
  UserCircle
} from 'lucide-react';
import PostsManager from '@/components/PostsManager';
import MediaLibrary, { MediaItem } from '@/components/MediaLibrary';

export default function CreatorDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'drafts' | 'new' | 'assets'>('drafts');

  // Drafts state for Creator Studio
  const [drafts, setDrafts] = useState([
    {
      id: '1',
      title: 'Top 5 AI Automation Hacks for Marketers',
      platform: 'LinkedIn Article',
      status: 'UNDER_REVIEW',
      updatedAt: 'Today at 10:30 AM',
    },
    {
      id: '2',
      title: 'Behind the Scenes: Social Media Content Workflow',
      platform: 'Instagram Reel',
      status: 'DRAFT',
      updatedAt: 'Yesterday',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('Instagram Post');
  const [newBody, setNewBody] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);

  const handleCreateDraft = async (e: React.FormEvent, status: 'DRAFT' | 'PENDING_REVIEW' = 'PENDING_REVIEW') => {
    e.preventDefault();
    if (!newBody.trim() && !newTitle.trim()) return;

    setSavingPost(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `${newTitle.trim()}\n\n${newBody.trim()}`.trim(),
          mediaIds: selectedMedia.map((media) => media.id),
          platform: newPlatform,
          scheduledAt: newScheduledAt ? new Date(newScheduledAt).toISOString() : null,
          status,
        }),
      });
      if (!response.ok) throw new Error('Failed to save post.');
      setNewTitle('');
      setNewBody('');
      setNewScheduledAt('');
      setSelectedMedia([]);
      setSubmittedMessage(true);
      setTimeout(() => {
        setSubmittedMessage(false);
        setActiveTab('drafts');
      }, 1500);
    } catch (error) {
      console.error(error);
    } finally {
      setSavingPost(false);
    }
  };

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
            <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.25)', padding: '2px 8px', borderRadius: '9999px', color: '#ffffff', fontWeight: 700 }}>
              {drafts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'new' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: activeTab === 'new' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'new' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Draft New Post
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
        <div className="dashboard-top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0D530E' }}>Creator Content Studio</h1>
            <p style={{ color: '#306D29', fontSize: '0.92rem', marginTop: '4px' }}>
              Draft engaging social posts, submit for Manager approval, and upload media assets.
            </p>
          </div>
          <button onClick={() => setActiveTab('new')} className="btn-primary" style={{ background: 'linear-gradient(135deg, #A5D86A 0%, #4F912A 100%)', color: '#10210d' }}>
            <Sparkles style={{ width: '18px', height: '18px' }} />
            + New Post Draft
          </button>
        </div>

        {/* MY DRAFTS & POSTS TAB */}
        {activeTab === 'drafts' && (
          <div className="animate-fade-in">
            <PostsManager userRole="CREATOR" currentUserId={session?.user?.id} />
          </div>
        )}

        {/* DRAFT NEW POST TAB */}
        {activeTab === 'new' && (
          <div className="glass-panel animate-fade-in" style={{ padding: '36px', maxWidth: '700px' }}>
            <h3 style={{ fontSize: '1.3rem', color: '#f8fafc', marginBottom: '8px' }}>Draft & Submit Social Media Post</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>
              Create your content draft below. Upon submission, it will be placed in the Manager review queue.
            </p>

            {submittedMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  marginBottom: '20px',
                }}
              >
                <CheckCircle2 style={{ width: '20px', height: '20px' }} />
                <span>Submitted to Manager review queue!</span>
              </div>
            )}

            <form onSubmit={(event) => handleCreateDraft(event)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="input-label">Content Title / Topic</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 5 Trends Shaping Content Automation in 2026"
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Target Social Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  className="input-field"
                  style={{ backgroundColor: '#0f172a' }}
                >
                  <option value="Instagram Post">Instagram Post / Carousel</option>
                  <option value="LinkedIn Article">LinkedIn Article / Post</option>
                  <option value="Twitter Thread">Twitter / X Thread</option>
                  <option value="YouTube Shorts">YouTube Shorts Script</option>
                </select>
              </div>

              <div>
                <label className="input-label">Post Copy / Caption</label>
                <textarea
                  rows={5}
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Write your engaging post copy here..."
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="input-label">Image or Video</label>
                <MediaLibrary
                  selectable
                  selectedMediaIds={selectedMedia.map((media) => media.id)}
                  onSelectMedia={setSelectedMedia}
                  userRole="CREATOR"
                  currentUserId={session?.user?.id}
                />
              </div>

              <div>
                <label className="input-label">Preferred Schedule (Optional)</label>
                <input
                  type="datetime-local"
                  value={newScheduledAt}
                  onChange={(e) => setNewScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  className="input-field"
                />
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '6px' }}>
                  The manager can change this time during approval.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setActiveTab('drafts')} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={(event) => handleCreateDraft(event, 'DRAFT')} disabled={savingPost} className="btn-secondary">
                  Save Draft
                </button>
                <button type="submit" disabled={savingPost} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <Send style={{ width: '16px', height: '16px' }} />
                  Submit for Manager Approval
                </button>
              </div>
            </form>
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
