'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { 
  Users, 
  ShieldCheck, 
  Send, 
  Layers, 
  LogOut, 
  Copy, 
  Check, 
  Plus, 
  Clock, 
  UserCheck, 
  FileText, 
  Settings as SettingsIcon, 
  ExternalLink,
  Sparkles,
  AlertCircle,
  Loader2,
  Share2,
  Film
} from 'lucide-react';
import PostsManager from '@/components/PostsManager';
import MediaLibrary from '@/components/MediaLibrary';


interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CREATOR';
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'MANAGER' | 'CREATOR';
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  invitationUrl: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'content' | 'media' | 'settings'>('overview');
  const [workspace, setWorkspace] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal & Form State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MANAGER' | 'CREATOR'>('MANAGER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSentUrl, setLastSentUrl] = useState<string | null>(null);

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setWorkspace(data.workspace);
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching workspace data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteMessage(null);
    setLastSentUrl(null);

    try {
      const res = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}!` });
        setLastSentUrl(data.invitation.invitationUrl);
        setInviteEmail('');
        fetchWorkspaceData();
      } else {
        setInviteMessage({ type: 'error', text: data.error || 'Failed to send invitation.' });
      }
    } catch (err) {
      console.error(err);
      setInviteMessage({ type: 'error', text: 'An error occurred while sending the invitation.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16' }}>
      {/* Sidebar Navigation */}
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
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Share2 style={{ width: '20px', height: '20px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {workspace?.name || 'Loading Workspace...'}
            </div>
            <span className="role-badge role-admin" style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: '2px' }}>
              ADMIN DASHBOARD
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'overview' ? '#818cf8' : '#94a3b8',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Layers style={{ width: '18px', height: '18px' }} />
            Workspace Overview
          </button>

          <button
            onClick={() => setActiveTab('members')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'members' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'members' ? '#818cf8' : '#94a3b8',
              fontWeight: activeTab === 'members' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users style={{ width: '18px', height: '18px' }} />
              Team Members
            </div>
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '9999px', color: '#f8fafc' }}>
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'content' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'content' ? '#818cf8' : '#94a3b8',
              fontWeight: activeTab === 'content' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <FileText style={{ width: '18px', height: '18px' }} />
            Content Pipeline
          </button>

          <button
            onClick={() => setActiveTab('media')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'media' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'media' ? '#818cf8' : '#94a3b8',
              fontWeight: activeTab === 'media' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Film style={{ width: '18px', height: '18px' }} />
            Media Library
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'settings' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? '#818cf8' : '#94a3b8',
              fontWeight: activeTab === 'settings' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <SettingsIcon style={{ width: '18px', height: '18px' }} />
            Settings
          </button>
        </nav>

        {/* User Info & Logout */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
              {activeTab === 'overview' && 'Workspace Overview'}
              {activeTab === 'members' && 'Team Members & Role Invitations'}
              {activeTab === 'content' && 'Content Overview'}
              {activeTab === 'media' && 'Media Assets Library'}
              {activeTab === 'settings' && 'Workspace Settings'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
              Workspace ID: <code style={{ color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{workspace?.id}</code>
            </p>
          </div>

          <button onClick={() => setShowInviteModal(true)} className="btn-primary">
            <Plus style={{ width: '18px', height: '18px' }} />
            Invite Team Member
          </button>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#818cf8', margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8' }}>Loading workspace details...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL TEAM MEMBERS</span>
                      <Users style={{ color: '#818cf8' }} />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>{members.length}</div>
                    <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                      <Check style={{ width: '14px', height: '14px' }} /> Active workspace seats
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>PENDING INVITATIONS</span>
                      <Clock style={{ color: '#fbbf24' }} />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f8fafc' }}>
                      {invitations.filter((i) => i.status === 'PENDING').length}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                      Awaiting user registration
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>YOUR ROLE</span>
                      <ShieldCheck style={{ color: '#c084fc' }} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc' }}>ADMIN</div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                      Full administrative access
                    </span>
                  </div>
                </div>

                {/* Quick Invite & Recent Members */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                  {/* Recent Members Panel */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>Active Team Members</h3>
                      <button onClick={() => setActiveTab('members')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        View All
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {members.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem' }}>{m.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{m.email}</div>
                          </div>
                          <span className={`role-badge role-${m.role.toLowerCase()}`}>{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Invites List */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>Pending Invitations</h3>
                      <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        + Send Invite
                      </button>
                    </div>

                    {invitations.filter((i) => i.status === 'PENDING').length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '20px 0', textAlign: 'center' }}>
                        No pending invitations. Click &quot;Invite Team Member&quot; to add teammates!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {invitations
                          .filter((i) => i.status === 'PENDING')
                          .slice(0, 4)
                          .map((inv) => (
                            <div
                              key={inv.id}
                              style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{inv.email}</div>
                                  <span className={`role-badge role-${inv.role.toLowerCase()}`} style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                                    Role: {inv.role}
                                  </span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(inv.invitationUrl, inv.id)}
                                  className="btn-secondary"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                >
                                  {copiedId === inv.id ? (
                                    <>
                                      <Check style={{ width: '12px', height: '12px', color: '#34d399' }} />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy style={{ width: '12px', height: '12px' }} />
                                      Copy Link
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TEAM MEMBERS TAB */}
            {activeTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                {/* Active Members Table */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '16px' }}>Active Workspace Members</h3>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px' }}>Member Name</th>
                          <th style={{ padding: '12px' }}>Email Address</th>
                          <th style={{ padding: '12px' }}>Assigned Role</th>
                          <th style={{ padding: '12px' }}>Joined Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: 600, color: '#f8fafc' }}>{m.name}</td>
                            <td style={{ padding: '14px 12px', color: '#94a3b8' }}>{m.email}</td>
                            <td style={{ padding: '14px 12px' }}>
                              <span className={`role-badge role-${m.role.toLowerCase()}`}>{m.role}</span>
                            </td>
                            <td style={{ padding: '14px 12px', color: '#64748b', fontSize: '0.85rem' }}>
                              {new Date(m.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invitations Table */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#f8fafc' }}>Sent Invitations & Tokens</h3>
                    <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      <Send style={{ width: '14px', height: '14px' }} />
                      Send New Invitation
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px' }}>Invited Email</th>
                          <th style={{ padding: '12px' }}>Assigned Role</th>
                          <th style={{ padding: '12px' }}>Status</th>
                          <th style={{ padding: '12px' }}>Invitation Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '14px 12px', fontWeight: 600, color: '#f8fafc' }}>{inv.email}</td>
                            <td style={{ padding: '14px 12px' }}>
                              <span className={`role-badge role-${inv.role.toLowerCase()}`}>{inv.role}</span>
                            </td>
                            <td style={{ padding: '14px 12px' }}>
                              <span className={`role-badge status-${inv.status.toLowerCase()}`}>{inv.status}</span>
                            </td>
                            <td style={{ padding: '14px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  onClick={() => copyToClipboard(inv.invitationUrl, `table-${inv.id}`)}
                                  className="btn-secondary"
                                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                >
                                  {copiedId === `table-${inv.id}` ? (
                                    <>
                                      <Check style={{ width: '14px', height: '14px', color: '#34d399' }} /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy style={{ width: '14px', height: '14px' }} /> Copy Invite Link
                                    </>
                                  )}
                                </button>
                                <a
                                  href={inv.invitationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', textDecoration: 'none' }}
                                >
                                  Test Registration <ExternalLink style={{ width: '12px', height: '12px' }} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CONTENT TAB */}
            {activeTab === 'content' && (
              <div className="animate-fade-in">
                <PostsManager userRole="ADMIN" />
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <div className="animate-fade-in">
                <MediaLibrary userRole="ADMIN" />
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="glass-panel animate-fade-in" style={{ padding: '36px' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#f8fafc', marginBottom: '12px' }}>Workspace Settings</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: '24px' }}>
                  Manage workspace details, authentication policies, and team permissions.
                </p>

                <div style={{ maxWidth: '500px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="input-label">Workspace Name</label>
                    <input type="text" readOnly value={workspace?.name || ''} className="input-field" style={{ opacity: 0.8 }} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="input-label">Slug</label>
                    <input type="text" readOnly value={workspace?.slug || ''} className="input-field" style={{ opacity: 0.8 }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* INVITE TEAM MEMBER MODAL */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Send style={{ color: '#818cf8', width: '22px', height: '22px' }} />
                <h3 style={{ fontSize: '1.3rem', color: '#f8fafc' }}>Invite Team Member</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '20px' }}>
              Enter your teammate&apos;s email address and select their assigned role. The role will be locked and automatically assigned during registration.
            </p>

            {inviteMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: inviteMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: inviteMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: inviteMessage.type === 'success' ? '#34d399' : '#f87171',
                  fontSize: '0.88rem',
                  marginBottom: '20px',
                }}
              >
                {inviteMessage.type === 'success' ? <UserCheck style={{ width: '18px', height: '18px' }} /> : <AlertCircle style={{ width: '18px', height: '18px' }} />}
                <span>{inviteMessage.text}</span>
              </div>
            )}

            {lastSentUrl && (
              <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 700, marginBottom: '6px' }}>
                  TEST INVITATION LINK (DEV MODE)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" readOnly value={lastSentUrl} className="input-field" style={{ fontSize: '0.78rem', padding: '6px 10px' }} />
                  <button onClick={() => copyToClipboard(lastSentUrl, 'modal-link')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    {copiedId === 'modal-link' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="input-label">Teammate Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'MANAGER' | 'CREATOR')}
                  className="input-field"
                  style={{ backgroundColor: '#0f172a' }}
                >
                  <option value="MANAGER">Manager (Content Approvals & Strategy)</option>
                  <option value="CREATOR">Creator (Drafting & Content Creation)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={inviteLoading} className="btn-primary" style={{ flex: 1 }}>
                  {inviteLoading ? (
                    <>
                      <Loader2 className="animate-spin" style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
