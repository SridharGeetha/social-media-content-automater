'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Layers, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { update } = useSession();

  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create workspace.');
        setLoading(false);
        return;
      }

      // Update session to reflect new workspace & role
      await update({
        workspaceId: data.workspace.id,
        role: 'ADMIN',
      });

      router.push('/dashboard/admin');
    } catch (err: unknown) {
      console.error(err);
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }} className="glass-panel animate-fade-in">
        <div style={{ padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 6px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Layers style={{ width: '28px', height: '28px', color: '#fff' }} />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: '12px',
              }}
            >
              <Sparkles style={{ width: '14px', height: '14px' }} />
              ADMIN ONBOARDING
            </div>

            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
              Create Your Workspace
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
              Give your social media content hub a name. You will be assigned as the Workspace Admin.
            </p>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.88rem',
                marginBottom: '20px',
              }}
            >
              <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label">Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Media Agency, Global Marketing"
                className="input-field"
              />
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                As <strong style={{ color: '#c084fc' }}>Admin</strong>, you will be able to invite Managers & Creators, manage content strategies, and configure team permissions.
              </div>
            </div>

            <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Creating Workspace...
                </>
              ) : (
                <>
                  Launch Admin Dashboard
                  <ArrowRight style={{ width: '18px', height: '18px' }} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
