'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Link2, Loader2 } from 'lucide-react';

interface LinkedInAccount {
  accountName: string;
  status: 'CONNECTED' | 'DISCONNECTED';
}

function LinkedInBrandMark({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="LinkedIn" style={{ display: 'block' }}><rect width="24" height="24" rx="5" fill="#0A66C2" /><path d="M6.94 8.5a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12ZM5.5 9.75h2.88v7.75H5.5V9.75Zm4.68 0h2.77v1.06h.04c.39-.73 1.33-1.5 2.74-1.5 2.94 0 3.48 1.93 3.48 4.44v3.75h-2.88v-3.5c0-1.02-.02-2.34-1.42-2.34-1.43 0-1.65 1.11-1.65 2.26v3.58H10.18V9.75Z" fill="#fff" /></svg>;
}

function InstagramBrandMark({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Instagram" style={{ display: 'block' }}><defs><linearGradient id="instagram-panel-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#FFDC80" /><stop offset="0.35" stopColor="#FCAF45" /><stop offset="0.65" stopColor="#E1306C" /><stop offset="1" stopColor="#833AB4" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#instagram-panel-gradient)" /><rect x="6.4" y="6.4" width="11.2" height="11.2" rx="3.2" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.65" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="16.45" cy="7.65" r="1.1" fill="#fff" /></svg>;
}

function FacebookBrandMark({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Facebook" style={{ display: 'block' }}><circle cx="12" cy="12" r="10" fill="#1877F2" /><path d="M13.35 20v-7h2.35l.35-2.72h-2.7V8.54c0-.79.22-1.33 1.36-1.33h1.45V4.78c-.25-.03-1.1-.1-2.09-.1-2.07 0-3.49 1.26-3.49 3.57v2.03H8.25V13h2.33v7h2.77Z" fill="#fff" /></svg>;
}

function AccountRow({ name, icon, connected, accountName, loading, connecting, disconnecting, available, onConnect, onDisconnect }: { name: string; icon: ReactNode; connected: boolean; accountName?: string; loading?: boolean; connecting?: boolean; disconnecting?: boolean; available?: boolean; onConnect?: () => void; onDisconnect?: () => void }) {
  return <article className="social-account-row"><div className="social-account-identity"><div className="social-account-icon">{icon}</div><div><h2>{name}</h2>{loading ? <p className="social-account-status status-checking"><Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> Checking connection</p> : connected ? <p className="social-account-status status-connected"><CheckCircle2 style={{ width: '14px', height: '14px' }} />Connected{accountName ? ` as ${accountName}` : ''}</p> : <p className="social-account-status status-disconnected">Disconnected</p>}</div></div><button type="button" onClick={connected ? onDisconnect : onConnect} disabled={loading || connecting || disconnecting || !available} aria-busy={connecting || disconnecting} className="social-account-action" aria-label={`${connected ? 'Disconnect' : 'Connect'} ${name}`} title={available ? `${connected ? 'Disconnect' : 'Connect'} ${name}` : `${name} integration coming soon`}>{connecting || disconnecting ? <Loader2 className="animate-spin" /> : <img src={connected ? 'https://img.icons8.com/?size=50&id=35634&format=png' : 'https://img.icons8.com/windows/96/NOMBEuDJxrui/connected.png'} alt="" width="24" height="24" className={connected ? 'social-account-disconnect-icon' : 'social-account-connect-icon'} />}</button></article>;
}

export default function SocialAccountsPanel() {
  const [account, setAccount] = useState<LinkedInAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/social/linkedin').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load social accounts.'); if (active) setAccount(data.account || null); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load social accounts.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const disconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try { const response = await fetch('/api/social/linkedin', { method: 'DELETE' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to disconnect LinkedIn.'); setAccount(null); } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Unable to disconnect LinkedIn.'); } finally { setDisconnecting(false); }
  };

  const connected = account?.status === 'CONNECTED';
  return <div className="social-account-panel"><p style={{ color: '#C9C19A', margin: '0 0 24px', fontSize: '0.95rem' }}>Connect workspace publishing accounts securely. Tokens are encrypted and never shown here.</p>{error && <div className="social-account-error" role="alert"><AlertCircle style={{ width: '18px', height: '18px' }} />{error}</div>}<div className="social-account-list"><AccountRow name="LinkedIn" icon={<LinkedInBrandMark />} connected={connected} accountName={account?.accountName} loading={loading} connecting={connecting} disconnecting={disconnecting} available onConnect={() => { setConnecting(true); window.location.href = '/api/social/linkedin/connect'; }} onDisconnect={disconnect} /><AccountRow name="Instagram" icon={<InstagramBrandMark />} connected={false} available={false} /><AccountRow name="Facebook" icon={<FacebookBrandMark />} connected={false} available={false} /></div></div>;
}
