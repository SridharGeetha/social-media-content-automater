'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Share2, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered') === 'true';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || 'Invalid email or password.');
        setLoading(false);
      } else {
        // Fetch session to determine proper role-based redirection
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;
        const workspaceId = sessionData?.user?.workspaceId;

        if (!workspaceId) {
          router.push('/create-workspace');
        } else if (role === 'ADMIN') {
          router.push('/dashboard/admin');
        } else if (role === 'MANAGER') {
          router.push('/dashboard/manager');
        } else if (role === 'CREATOR') {
          router.push('/dashboard/creator');
        } else {
          router.push('/dashboard/admin');
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', width: '100%' }} className="glass-panel animate-fade-in">
      <div style={{ padding: '36px' }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
            Sign in to access your Social Automater workspace
          </p>
        </div>

        {/* Success Alert if just registered */}
        {isRegistered && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.88rem',
              marginBottom: '20px',
            }}
          >
            <CheckCircle2 style={{ width: '18px', height: '18px', flexShrink: 0 }} />
            <span>Account created successfully! Please sign in below.</span>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '14px', top: '14px', width: '18px', height: '18px', color: '#64748b' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input-field"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: '14px', top: '14px', width: '18px', height: '18px', color: '#64748b' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary" style={{ width: '100%', marginTop: '6px' }}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              <>
                Sign In to Workspace
                <ArrowRight style={{ width: '18px', height: '18px' }} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            Don&apos;t have an account yet?{' '}
            <Link href="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Register as Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
      <Suspense fallback={<div style={{ color: '#94a3b8' }}>Loading login...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
