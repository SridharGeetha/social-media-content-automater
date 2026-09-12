'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Globe2, Loader2, Unplug } from 'lucide-react';

interface LinkedInAccount {
  accountId: string;
  accountName: string;
  expiresAt: string;
  connectedAt: string;
  status: 'CONNECTED' | 'DISCONNECTED';
}

export default function SocialAccountsPage() {
  const [account, setAccount] = useState<LinkedInAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
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
    <main style={{ minHeight: '100vh', padding: '36px', backgroundColor: '#090d16' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <Link href="/dashboard/admin" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', marginBottom: '28px' }}>
          <ArrowLeft style={{ width: '16px', height: '16px' }} />
          Back to Admin Dashboard
        </Link>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f8fafc' }}>Social Accounts</h1>
          <p style={{ color: '#94a3b8', marginTop: '6px' }}>Connect workspace publishing accounts securely. Tokens are encrypted and never shown here.</p>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '14px 16px', marginBottom: '20px', borderRadius: '10px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle style={{ width: '18px', height: '18px' }} />
            {error}
          </div>
        )}

        <section className="glass-panel" style={{ padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', display: 'grid', placeItems: 'center', borderRadius: '12px', background: '#0a66c2' }}>
              <Globe2 style={{ color: '#fff', width: '25px', height: '25px' }} />
            </div>
            <div>
              <h2 style={{ color: '#f8fafc', fontSize: '1.2rem' }}>LinkedIn</h2>
              {loading ? (
                <p style={{ color: '#94a3b8', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}><Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> Checking connection</p>
              ) : connected ? (
                <p style={{ color: '#34d399', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}><CheckCircle2 style={{ width: '16px', height: '16px' }} /> Connected as {account.accountName}</p>
              ) : (
                <p style={{ color: '#94a3b8', marginTop: '4px' }}>Not connected</p>
              )}
            </div>
          </div>

          {connected ? (
            <button type="button" onClick={disconnect} disabled={disconnecting} className="btn-secondary">
              {disconnecting ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : <Unplug style={{ width: '16px', height: '16px' }} />}
              Disconnect
            </button>
          ) : (
            <a href="/api/social/linkedin/connect" className="btn-primary">
              <Globe2 style={{ width: '16px', height: '16px' }} />
              Connect LinkedIn
            </a>
          )}
        </section>
      </div>
    </main>
  );
}