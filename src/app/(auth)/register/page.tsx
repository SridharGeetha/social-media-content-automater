'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Share2, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck, Users, Zap, Loader2 } from 'lucide-react';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Invitation token verification state
  const [inviteDetails, setInviteDetails] = useState<{
    valid: boolean;
    email: string;
    role: 'MANAGER' | 'CREATOR';
    workspaceName: string;
  } | null>(null);

  const [verifyingToken, setVerifyingToken] = useState(!!token);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const request = window.setTimeout(() => {
        setVerifyingToken(true);
        fetch(`/api/invitations/verify?token=${encodeURIComponent(token)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.valid) {
              setInviteDetails(data);
              setEmail(data.email);
            } else {
              setError(data.error || 'Invalid or expired invitation token.');
            }
          })
          .catch((err) => {
            console.error(err);
            setError('Failed to verify invitation token.');
          })
          .finally(() => {
            setVerifyingToken(false);
          });
      }, 0);
      return () => window.clearTimeout(request);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: token ? inviteDetails?.email : email.trim(),
          password,
          token: token || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Auto sign-in after registration
      const loginEmail = token ? inviteDetails?.email : email.trim().toLowerCase();
      const signInRes = await signIn('credentials', {
        email: loginEmail,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Fallback to login page
        router.push(`/login?registered=true`);
      } else {
        // Redirection based on role or creation
        if (token && inviteDetails) {
          if (inviteDetails.role === 'MANAGER') router.push('/dashboard/manager');
          else router.push('/dashboard/creator');
        } else {
          router.push('/create-workspace');
        }
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '440px' }}>
        <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#818cf8', margin: '0 auto 16px auto', animation: 'spin 1s linear infinite' }} />
        <h3 style={{ color: '#f8fafc', fontSize: '1.1rem' }}>Verifying Invitation Link...</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px' }}>Validating secure workspace invitation details.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '460px', width: '100%' }} className="glass-panel animate-fade-in">
      <div style={{ padding: '36px' }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Share2 style={{ width: '26px', height: '26px', color: '#fff' }} />
          </div>

          {inviteDetails ? (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                Join Workspace
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                You were invited to join <strong style={{ color: '#f8fafc' }}>{inviteDetails.workspaceName}</strong>
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                Create Admin Account
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Start a new social media automation workspace
              </p>
            </>
          )}
        </div>

        {/* Invited Role Banner (Locked) */}
        {inviteDetails && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Assigned Role (Locked)
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {inviteDetails.role === 'MANAGER' ? (
                  <>
                    <Users style={{ width: '16px', height: '16px', color: '#22d3ee' }} />
                    Workspace Manager
                  </>
                ) : (
                  <>
                    <Zap style={{ width: '16px', height: '16px', color: '#34d399' }} />
                    Content Creator
                  </>
                )}
              </div>
            </div>
            <span
              className={`role-badge ${
                inviteDetails.role === 'MANAGER' ? 'role-manager' : 'role-creator'
              }`}
            >
              {inviteDetails.role}
            </span>
          </div>
        )}

        {/* Error Alert */}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="input-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <UserIcon style={{ position: 'absolute', left: '14px', top: '14px', width: '18px', height: '18px', color: '#64748b' }} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="input-field"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '14px', top: '14px', width: '18px', height: '18px', color: '#64748b' }} />
              <input
                type="email"
                required
                disabled={!!inviteDetails}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="input-field"
                style={{
                  paddingLeft: '42px',
                  opacity: inviteDetails ? 0.7 : 1,
                  cursor: inviteDetails ? 'not-allowed' : 'text',
                }}
              />
            </div>
            {inviteDetails && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Email address is locked to the invitation.
              </span>
            )}
          </div>

          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '14px', top: '14px', width: '18px', height: '18px', color: '#64748b' }} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="input-field"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          {/* If NOT invited, show default role badge (ADMIN) */}
          {!inviteDetails && (
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck style={{ width: '16px', height: '16px', color: '#c084fc' }} />
                <span style={{ fontSize: '0.85rem', color: '#e9d5ff', fontWeight: 600 }}>Initial Role: Workspace Admin</span>
              </div>
              <span className="role-badge role-admin">ADMIN</span>
            </div>
          )}

          <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Creating Account...
              </>
            ) : (
              <>
                {inviteDetails ? 'Join Workspace' : 'Continue to Workspace Creation'}
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
      <Suspense fallback={<div style={{ color: '#94a3b8' }}>Loading registration form...</div>}>
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}
