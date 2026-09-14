'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
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
  AlertCircle,
  Loader2,
  Film,
  Globe2,
  UserCircle
} from 'lucide-react';
import PostsManager from '@/components/PostsManager';
import MediaLibrary from '@/components/MediaLibrary';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import SocialAccountsPanel from '@/components/SocialAccountsPanel';


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
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'content' | 'media' | 'social' | 'settings'>('overview');
  const { data: session } = useSession();
  const isSocialAccountsActive = activeTab === 'social';
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

  useEffect(() => {
    if (searchParams.get('tab') === 'social') setActiveTab('social');
  }, [searchParams]);

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
    const request = window.setTimeout(() => {
      void fetchWorkspaceData();
    }, 0);
    return () => window.clearTimeout(request);
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
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
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
              background: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'overview' ? '#ffffff' : '#e6f8e2',
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
              background: activeTab === 'members' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'members' ? '#ffffff' : '#e6f8e2',
              fontWeight: activeTab === 'members' ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users style={{ width: '18px', height: '18px' }} />
              Team Members
            </div>
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '9999px', color: '#ffffff', fontWeight: 600 }}>
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
              background: activeTab === 'content' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'content' ? '#ffffff' : '#e6f8e2',
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
              background: activeTab === 'media' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'media' ? '#ffffff' : '#e6f8e2',
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
            type="button"
            onClick={() => setActiveTab('social')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              color: isSocialAccountsActive ? '#ffffff' : '#e6f8e2',
              fontWeight: isSocialAccountsActive ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              background: isSocialAccountsActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              textAlign: 'left',
            }}
          >
            <Globe2 style={{ width: '18px', height: '18px' }} />
            Social Accounts
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
              background: activeTab === 'settings' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'settings' ? '#ffffff' : '#e6f8e2',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 14px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
              <UserCircle style={{ width: '21px', height: '21px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name || 'Admin'}</div>
              <div style={{ fontSize: '0.72rem', color: '#e6f8e2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.email || 'Workspace administrator'}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', color: '#fecaca', borderColor: 'rgba(248, 113, 113, 0.5)' }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main-content" style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        {/* Top Header */}
        <div className="dashboard-top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>
              {activeTab === 'overview' && 'Workspace Overview'}
              {activeTab === 'members' && 'Team Members & Role Invitations'}
              {activeTab === 'content' && 'Content Overview'}
              {activeTab === 'media' && 'Media Assets Library'}
              {activeTab === 'social' && 'Social Accounts'}
              {activeTab === 'settings' && 'Workspace Settings'}
            </h1>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary"
            style={{
              background: 'rgba(48, 109, 41, 0.18)',
              color: '#E7E1B1',
              border: '1px solid rgba(185, 231, 105, 0.38)',
              boxShadow: 'none',
            }}
          >
            <Plus style={{ width: '18px', height: '18px', color: '#B9E769' }} />
            Invite Team Member
          </button>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#E7E1B1', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em' }}>TOTAL TEAM MEMBERS</span>
                      <Users style={{ color: '#B9E769' }} />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FBF5DD' }}>{members.length}</div>
                    <span style={{ fontSize: '0.78rem', color: '#8BD48A', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                      <Check style={{ width: '14px', height: '14px' }} /> Active workspace seats
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#E7E1B1', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em' }}>PENDING INVITATIONS</span>
                      <Clock style={{ color: '#E7E1B1' }} />
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#FBF5DD' }}>
                      {invitations.filter((i) => i.status === 'PENDING').length}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#C9C19A', marginTop: '8px', display: 'block' }}>
                      Awaiting user registration
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: '#E7E1B1', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em' }}>YOUR ROLE</span>
                      <ShieldCheck style={{ color: '#B9E769' }} />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B9E769' }}>ADMIN</div>
                    <span style={{ fontSize: '0.78rem', color: '#C9C19A', marginTop: '8px', display: 'block' }}>
                      Full administrative access
                    </span>
                  </div>
                </div>

                {/* Quick Invite & Recent Members */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                  {/* Recent Members Panel */}
                  <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.1rem', color: '#FBF5DD', margin: 0 }}>Active Team Members</h3>
                      <button onClick={() => setActiveTab('members')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.2)', borderColor: 'rgba(185, 231, 105, 0.35)' }}>
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
                            background: 'rgba(48, 109, 41, 0.12)',
                            border: '1px solid rgba(185, 231, 105, 0.18)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: '#FBF5DD', fontSize: '0.92rem' }}>{m.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#C9C19A' }}>{m.email}</div>
                          </div>
                          <span className={`role-badge role-${m.role.toLowerCase()}`}>{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pending Invites List */}
                  <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.1rem', color: '#FBF5DD', margin: 0 }}>Pending Invitations</h3>
                      <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                        + Send Invite
                      </button>
                    </div>

                    {invitations.filter((i) => i.status === 'PENDING').length === 0 ? (
                      <p style={{ color: '#C9C19A', fontSize: '0.88rem', padding: '20px 0', textAlign: 'center' }}>
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
                                background: 'rgba(48, 109, 41, 0.12)',
                                border: '1px solid rgba(185, 231, 105, 0.12)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#FBF5DD', fontSize: '0.9rem' }}>{inv.email}</div>
                                  <span className={`role-badge role-${inv.role.toLowerCase()}`} style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                                    Role: {inv.role}
                                  </span>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(inv.invitationUrl, inv.id)}
                                  className="btn-secondary"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(185, 231, 105, 0.28)' }}
                                >
                                  {copiedId === inv.id ? (
                                    <>
                                      <Check style={{ width: '12px', height: '12px', color: '#8BD48A' }} />
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
                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', color: '#FBF5DD', marginBottom: '4px' }}>Workspace Members</h3>
                      <p style={{ fontSize: '0.82rem', color: '#C9C19A', margin: 0 }}>People currently assigned to this workspace.</p>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(185, 231, 105, 0.16)', color: '#B9E769', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          <th style={{ padding: '12px 14px' }}>Member Name</th>
                          <th style={{ padding: '12px 14px' }}>Email Address</th>
                          <th style={{ padding: '12px 14px' }}>Assigned Role</th>
                          <th style={{ padding: '12px 14px' }}>Joined Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '15px 14px', fontWeight: 700, color: '#FBF5DD' }}>{m.name}</td>
                            <td style={{ padding: '15px 14px', color: '#D7D1AD' }}>{m.email}</td>
                            <td style={{ padding: '15px 14px' }}>
                              <span className={`role-badge role-${m.role.toLowerCase()}`}>{m.role}</span>
                            </td>
                            <td style={{ padding: '15px 14px', color: '#C9C19A', fontSize: '0.86rem' }}>
                              {new Date(m.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invitations Table */}
                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', color: '#FBF5DD', marginBottom: '4px' }}>Team Invitations</h3>
                      <p style={{ fontSize: '0.82rem', color: '#C9C19A', margin: 0 }}>Invite links for pending teammates and workspace access.</p>
                    </div>
                    <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      <Send style={{ width: '14px', height: '14px' }} />
                      Send New Invitation
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(185, 231, 105, 0.16)', color: '#B9E769', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          <th style={{ padding: '12px 14px' }}>Invited Email</th>
                          <th style={{ padding: '12px 14px' }}>Assigned Role</th>
                          <th style={{ padding: '12px 14px' }}>Status</th>
                          <th style={{ padding: '12px 14px' }}>Invitation Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((inv) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '15px 14px', fontWeight: 700, color: '#FBF5DD' }}>{inv.email}</td>
                            <td style={{ padding: '15px 14px' }}>
                              <span className={`role-badge role-${inv.role.toLowerCase()}`}>{inv.role}</span>
                            </td>
                            <td style={{ padding: '15px 14px' }}>
                              <span className={`role-badge status-${inv.status.toLowerCase()}`}>{inv.status}</span>
                            </td>
                            <td style={{ padding: '15px 14px' }}>
                              <button
                                onClick={() => copyToClipboard(inv.invitationUrl, `table-${inv.id}`)}
                                className="btn-secondary"
                                style={{ padding: '7px 12px', fontSize: '0.8rem', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.32)' }}
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

            {/* SOCIAL ACCOUNTS TAB */}
            {activeTab === 'social' && (
              <div className="animate-fade-in">
                <SocialAccountsPanel />
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '28px', background: 'linear-gradient(135deg, rgba(10, 30, 14, 0.9) 0%, rgba(16, 45, 22, 0.92) 100%)', border: '1px solid rgba(185, 231, 105, 0.2)', boxShadow: '0 14px 35px rgba(17, 40, 21, 0.2)' }}>
                  <h3 style={{ fontSize: '1.45rem', color: '#F9F2DA', marginBottom: '8px', fontWeight: 800 }}>Workspace Settings</h3>
                  <p style={{ color: '#C9C19A', fontSize: '0.92rem', marginBottom: '24px' }}>
                    Manage workspace details, authentication policies, and team permissions.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                    <div style={{ padding: '18px', borderRadius: '14px', background: 'rgba(11, 28, 16, 0.75)', border: '1px solid rgba(185, 231, 105, 0.14)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#C9C19A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Workspace</div>
                      <div style={{ fontSize: '1.2rem', color: '#F9F2DA', fontWeight: 800 }}>{workspace?.name || 'Workspace'}</div>
                    </div>
                    <div style={{ padding: '18px', borderRadius: '14px', background: 'rgba(11, 28, 16, 0.75)', border: '1px solid rgba(185, 231, 105, 0.14)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#C9C19A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Slug</div>
                      <div style={{ fontSize: '1.1rem', color: '#F9F2DA', fontWeight: 700 }}>{workspace?.slug || 'workspace'}</div>
                    </div>
                  </div>

                  <div style={{ maxWidth: '560px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Workspace Name</label>
                      <input type="text" readOnly value={workspace?.name || ''} className="input-field" style={{ opacity: 0.8, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Slug</label>
                      <input type="text" readOnly value={workspace?.slug || ''} className="input-field" style={{ opacity: 0.8, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }} />
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(8, 17, 12, 0.72)', border: '1px solid rgba(185, 231, 105, 0.14)' }}>
                  <h4 style={{ fontSize: '1rem', color: '#F9F2DA', marginBottom: '14px', fontWeight: 800 }}>Access Overview</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(17, 41, 22, 0.7)', border: '1px solid rgba(185, 231, 105, 0.12)' }}>
                      <div style={{ color: '#C9C19A', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admins</div>
                      <div style={{ color: '#F9F2DA', fontWeight: 800, fontSize: '1.25rem', marginTop: '6px' }}>1</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(17, 41, 22, 0.7)', border: '1px solid rgba(185, 231, 105, 0.12)' }}>
                      <div style={{ color: '#C9C19A', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Managers</div>
                      <div style={{ color: '#F9F2DA', fontWeight: 800, fontSize: '1.25rem', marginTop: '6px' }}>2</div>
                    </div>
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(17, 41, 22, 0.7)', border: '1px solid rgba(185, 231, 105, 0.12)' }}>
                      <div style={{ color: '#C9C19A', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Creators</div>
                      <div style={{ color: '#F9F2DA', fontWeight: 800, fontSize: '1.25rem', marginTop: '6px' }}>4</div>
                    </div>
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
                <Send style={{ color: '#B9E769', width: '22px', height: '22px' }} />
                <h3 style={{ fontSize: '1.3rem', color: '#B9E769' }}>Invite Team Member</h3>
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
              <div style={{ background: 'rgba(48, 109, 41, 0.12)', border: '1px solid rgba(185, 231, 105, 0.28)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.78rem', color: '#B9E769', fontWeight: 700, marginBottom: '8px' }}>
                  Invitation Link
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" readOnly value={lastSentUrl} className="input-field" style={{ fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(255,255,255,0.03)' }} />
                  <button onClick={() => copyToClipboard(lastSentUrl, 'modal-link')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    {copiedId === 'modal-link' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Teammate Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="input-field"
                  style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                />
              </div>

              <div>
                <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'MANAGER' | 'CREATOR')}
                  className="input-field invite-role-select"
                  style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                >
                  <option value="MANAGER">Manager (Content Approvals & Strategy)</option>
                  <option value="CREATOR">Creator (Drafting & Content Creation)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary" style={{ flex: 1, color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.16)', borderColor: 'rgba(185, 231, 105, 0.32)' }}>
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
