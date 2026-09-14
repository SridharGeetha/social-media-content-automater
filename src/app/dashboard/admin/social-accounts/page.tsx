'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { AlertCircle, FileText, Film, Globe2, Layers, Loader2, LogOut, PanelLeftOpen, Settings, UserCircle, Users } from 'lucide-react';

interface LinkedInAccount {
  accountId: string;
  accountName: string;
  expiresAt: string;
  connectedAt: string;
  status: 'CONNECTED' | 'DISCONNECTED';
}

function LinkedInBrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="LinkedIn"
      style={{ display: 'block' }}
    >
      <rect x="0" y="0" width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        d="M6.94 8.5a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12ZM5.5 9.75h2.88v7.75H5.5V9.75Zm4.68 0h2.77v1.06h.04c.39-.73 1.33-1.5 2.74-1.5 2.94 0 3.48 1.93 3.48 4.44v3.75h-2.88v-3.5c0-1.02-.02-2.34-1.42-2.34-1.43 0-1.65 1.11-1.65 2.26v3.58H10.18V9.75Z"
        fill="#fff"
      />
    </svg>
  );
}

function InstagramBrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Instagram" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="instagram-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFDC80" />
          <stop offset="0.35" stopColor="#FCaf45" />
          <stop offset="0.65" stopColor="#E1306C" />
          <stop offset="1" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#instagram-gradient)" />
      <rect x="6.4" y="6.4" width="11.2" height="11.2" rx="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.65" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16.45" cy="7.65" r="1.1" fill="#fff" />
    </svg>
  );
}

function FacebookBrandMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Facebook" style={{ display: 'block' }}>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path d="M13.35 20v-7h2.35l.35-2.72h-2.7V8.54c0-.79.22-1.33 1.36-1.33h1.45V4.78c-.25-.03-1.1-.1-2.09-.1-2.07 0-3.49 1.26-3.49 3.57v2.03H8.25V13h2.33v7h2.77Z" fill="#fff" />
    </svg>
  );
}

function SocialAccountRow({
  name,
  icon,
  connected,
  loading,
  accountName,
  onConnect,
  onDisconnect,
  disconnecting,
  connecting,
  available = true,
}: {
  name: string;
  icon: ReactNode;
  connected: boolean;
  loading?: boolean;
  accountName?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  disconnecting?: boolean;
  connecting?: boolean;
  available?: boolean;
}) {
  return (
    <article className="social-account-row">
      <div className="social-account-identity">
        <div className="social-account-icon">{icon}</div>
        <div>
          <h2>{name}</h2>
          {loading ? (
            <p className="social-account-status status-checking"><Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> Checking connection</p>
          ) : connected ? (
            <p className="social-account-status status-connected">Connected{accountName ? ` as ${accountName}` : ''}</p>
          ) : (
            <p className="social-account-status status-disconnected">Disconnected</p>
          )}
        </div>
      </div>

      {connected ? (
        <button type="button" onClick={onDisconnect} disabled={disconnecting} aria-busy={disconnecting} className="social-account-action" aria-label={`Disconnect ${name}`} title={`Disconnect ${name}`}>
          {disconnecting ? <Loader2 className="animate-spin" /> : (
            <img
              src="https://img.icons8.com/?size=50&id=35634&format=png"
              alt=""
              width="18"
              height="18"
              className="social-account-disconnect-icon"
            />
          )}
        </button>
      ) : (
        <button type="button" onClick={onConnect} disabled={!available || loading || connecting} aria-busy={connecting} className="social-account-action" aria-label={`Connect ${name}`} title={available ? `Connect ${name}` : `${name} integration coming soon`}>
          {connecting ? <Loader2 className="animate-spin" /> : <img
            src="https://img.icons8.com/windows/96/NOMBEuDJxrui/connected.png"
            alt=""
            width="18"
            height="18"
            className="social-account-connect-icon"
          />}
        </button>
      )}
    </article>
  );
}

export default function SocialAccountsPage() {
  const [account, setAccount] = useState<LinkedInAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get('error');
    const callbackReason = params.get('reason');
    const errorUpdate = callbackError
      ? window.setTimeout(() => {
          if (active) setError(callbackReason || 'LinkedIn connection failed. Check the server configuration and try again.');
        }, 0)
      : undefined;

    fetch('/api/social/linkedin')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load social accounts.');
        if (active) setAccount(data.account || null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load social accounts.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (errorUpdate) window.clearTimeout(errorUpdate);
    };
  }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/social/linkedin', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to disconnect LinkedIn.');
      setAccount(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Unable to disconnect LinkedIn.');
    } finally {
      setDisconnecting(false);
    }
  };

  const connected = account?.status === 'CONNECTED';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#090d16' }}>
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
              Workspace Admin
            </div>
            <span className="role-badge role-admin" style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: '2px' }}>
              ADMIN DASHBOARD
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <Link href="/dashboard/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', color: '#e6f8e2', fontWeight: 500, fontSize: '0.92rem', textDecoration: 'none' }}>
            <Layers style={{ width: '18px', height: '18px' }} />
            Workspace Overview
          </Link>

          <Link href="/dashboard/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', color: '#e6f8e2', fontWeight: 500, fontSize: '0.92rem', textDecoration: 'none' }}>
            <Users style={{ width: '18px', height: '18px' }} />
            Team Members
          </Link>

          <Link href="/dashboard/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', color: '#e6f8e2', fontWeight: 500, fontSize: '0.92rem', textDecoration: 'none' }}>
            <FileText style={{ width: '18px', height: '18px' }} />
            Content Pipeline
          </Link>

          <Link href="/dashboard/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', color: '#e6f8e2', fontWeight: 500, fontSize: '0.92rem', textDecoration: 'none' }}>
            <Film style={{ width: '18px', height: '18px' }} />
            Media Library
          </Link>

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Globe2 style={{ width: '18px', height: '18px' }} />
            Social Accounts
          </button>

          <Link href="/dashboard/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', color: '#e6f8e2', fontWeight: 500, fontSize: '0.92rem', textDecoration: 'none' }}>
            <Settings style={{ width: '18px', height: '18px' }} />
            Settings
          </Link>
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px 14px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', flexShrink: 0 }}>
              <UserCircle style={{ width: '21px', height: '21px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Workspace Admin</div>
              <div style={{ fontSize: '0.72rem', color: '#e6f8e2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>admin@workspace.com</div>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', color: '#fecaca', borderColor: 'rgba(248, 113, 113, 0.5)' }}
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="dashboard-main-content" style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        <div className="dashboard-top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0D530E', margin: 0 }}>Social Accounts</h1>
          </div>

          <Link href="/dashboard/admin" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.3)' }}>
            <PanelLeftOpen style={{ width: '16px', height: '16px' }} />
            Back to Dashboard
          </Link>
        </div>

        <div style={{ maxWidth: '1200px' }}>
          <div style={{ marginBottom: '28px' }}>
            <p style={{ color: '#C9C19A', marginTop: '6px', fontSize: '0.95rem' }}>Connect workspace publishing accounts securely. Tokens are encrypted and never shown here.</p>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '14px 16px', marginBottom: '20px', borderRadius: '12px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <AlertCircle style={{ width: '18px', height: '18px' }} />
              {error}
            </div>
          )}

          <div className="social-account-list">
            <SocialAccountRow
              name="LinkedIn"
              icon={<LinkedInBrandMark size={40} />}
              connected={connected}
              loading={loading}
              accountName={account?.accountName ? `Connected as ${account.accountName}` : undefined}
              onConnect={() => {
                setConnecting(true);
                window.location.href = '/api/social/linkedin/connect';
              }}
              onDisconnect={disconnect}
              disconnecting={disconnecting}
              connecting={connecting}
            />
            <SocialAccountRow name="Instagram" icon={<InstagramBrandMark size={40} />} connected={false} available={false} />
            <SocialAccountRow name="Facebook" icon={<FacebookBrandMark size={40} />} connected={false} available={false} />
          </div>
        </div>
      </main>
    </div>
  );
}