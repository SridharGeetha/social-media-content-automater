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
  Share2
} from 'lucide-react';

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
  const [submittedMessage, setSubmittedMessage] = useState(false);

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newDraft = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      platform: newPlatform,
      status: 'UNDER_REVIEW',
      updatedAt: 'Just now',
    };

    setDrafts([newDraft, ...drafts]);
    setNewTitle('');
    setNewBody('');
    setSubmittedMessage(true);
    setTimeout(() => {
      setSubmittedMessage(false);
      setActiveTab('drafts');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16' }}>
      {/* Creator Sidebar Navigation */}
      <aside
        style={{
          width: '260px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Share2 style={{ width: '20px', height: '20px', color: '#fff' }} />
          </div>
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
              background: activeTab === 'drafts' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'drafts' ? '#34d399' : '#94a3b8',
              fontWeight: activeTab === 'drafts' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText style={{ width: '18px', height: '18px' }} />
              My Content Drafts
            </div>
            <span style={{ fontSize: '0.75rem', background: '#10b981', padding: '2px 8px', borderRadius: '9999px', color: '#000', fontWeight: 700 }}>
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
              background: activeTab === 'new' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'new' ? '#34d399' : '#94a3b8',
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
              background: activeTab === 'assets' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeTab === 'assets' ? '#34d399' : '#94a3b8',
              fontWeight: activeTab === 'assets' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <ImageIcon style={{ width: '18px', height: '18px' }} />
            Asset Library
          </button>
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ padding: '8px 12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{session?.user?.name || 'Creator'}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{session?.user?.email}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}>
            <LogOut style={{ width: '16px', height: '16px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Studio Area */}
      <main style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>Creator Content Studio</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
              Draft engaging social posts, submit for Manager approval, and upload media assets.
            </p>
          </div>
          <button onClick={() => setActiveTab('new')} className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <Sparkles style={{ width: '18px', height: '18px' }} />
            + New Post Draft
          </button>
        </div>

        {/* MY DRAFTS TAB */}
        {activeTab === 'drafts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TOTAL DRAFTS</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{drafts.length}</div>
              </div>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>UNDER MANAGER REVIEW</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                  {drafts.filter((d) => d.status === 'UNDER_REVIEW').length}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>PUBLISHED THIS MONTH</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>8</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '16px' }}>My Content Drafts</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>{draft.title}</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '16px' }}>
                        <span>Target: <strong style={{ color: '#34d399' }}>{draft.platform}</strong></span>
                        <span>Updated: {draft.updatedAt}</span>
                      </div>
                    </div>

                    <div>
                      {draft.status === 'UNDER_REVIEW' ? (
                        <span className="role-badge status-pending" style={{ fontSize: '0.72rem' }}>
                          <Clock style={{ width: '12px', height: '12px', marginRight: '4px' }} /> Sent to Manager
                        </span>
                      ) : (
                        <span className="role-badge role-creator" style={{ fontSize: '0.72rem' }}>
                          DRAFT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

            <form onSubmit={handleCreateDraft} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setActiveTab('drafts')} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  <Send style={{ width: '16px', height: '16px' }} />
                  Submit for Manager Approval
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ASSET LIBRARY TAB */}
        {activeTab === 'assets' && (
          <div className="glass-panel animate-fade-in" style={{ padding: '36px', textAlign: 'center' }}>
            <ImageIcon style={{ width: '36px', height: '36px', color: '#34d399', margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#f8fafc', fontSize: '1.2rem', marginBottom: '6px' }}>Media Asset Library</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Upload graphics, video clips, and templates for social media campaigns.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
