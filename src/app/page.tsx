import Link from 'next/link';
import { 
  Sparkles, 
  Users, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Share2, 
  CheckCircle2, 
  Layers, 
  Send
} from 'lucide-react';
import { auth } from '@/auth';

export default async function LandingPage() {
  const session = await auth();
  const user = session?.user;

  let dashboardHref = '/login';
  if (user?.role === 'ADMIN') dashboardHref = '/dashboard/admin';
  else if (user?.role === 'MANAGER') dashboardHref = '/dashboard/manager';
  else if (user?.role === 'CREATOR') dashboardHref = '/dashboard/creator';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(9, 13, 22, 0.8)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Share2 style={{ width: '22px', height: '22px', color: '#fff' }} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Social<span style={{ color: '#818cf8' }}>Automater</span>
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
              Features
            </a>
            <a href="#workflow" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
              Workflow
            </a>
            <a href="#roles" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}>
              Role Hierarchy
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <Link href={dashboardHref} className="btn-primary">
                Go to Dashboard ({user.role || 'User'})
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
                  Get Started
                  <Sparkles style={{ width: '16px', height: '16px' }} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '80px 24px 60px 24px',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}
        className="animate-fade-in"
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          <Sparkles style={{ width: '15px', height: '15px', color: '#818cf8' }} />
          Phase 1 Release: Next.js + Auth.js Multi-Role Workspace Platform
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '20px',
            color: '#f8fafc',
          }}
        >
          Automate Social Media Operations with <br />
          <span className="gradient-text">Role-Based Team Workspaces</span>
        </h1>

        <p
          style={{
            maxWidth: '750px',
            margin: '0 auto 36px auto',
            fontSize: '1.15rem',
            color: '#94a3b8',
            lineHeight: 1.6,
          }}
        >
          Streamline content creation, approval pipelines, and publishing workflows across your team. 
          Seamlessly invite <strong>Managers</strong> and <strong>Creators</strong> with zero role-tampering security.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn-primary" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
            Start Workspace as Admin
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </Link>
          <Link href="/login" className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1.05rem' }}>
            Existing User Login
          </Link>
        </div>

        {/* Dynamic Feature Preview Graphic */}
        <div
          className="glass-panel"
          style={{
            marginTop: '60px',
            padding: '32px',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>
                https://socialplatform.app/dashboard/admin
              </span>
            </div>
            <span className="role-badge role-admin">Live System Simulation</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <ShieldCheck style={{ color: '#c084fc' }} />
                <h4 style={{ color: '#f8fafc', fontSize: '1rem' }}>Admin Control Hub</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                Create workspaces, monitor member seats, manage invitations, and control permissions.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Users style={{ color: '#22d3ee' }} />
                <h4 style={{ color: '#f8fafc', fontSize: '1rem' }}>Manager Strategy</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                Review draft posts, schedule content queues, and track team content output.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Zap style={{ color: '#34d399' }} />
                <h4 style={{ color: '#f8fafc', fontSize: '1rem' }}>Creator Studio</h4>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                Draft engaging social media posts, submit for approval, and upload media assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" style={{ padding: '60px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '12px', color: '#f8fafc' }}>
          Platform Architecture & Capabilities
        </h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '48px' }}>
          Built for high-scale content operations with security and seamless onboarding at its core.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div className="glass-panel glass-panel-hover" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <ShieldCheck style={{ color: '#818cf8', width: '24px', height: '24px' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#f8fafc' }}>Strict Auth.js RBAC</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Protected Next.js middleware and server-side session injection. Roles are stored in MongoDB and verified on every server navigation.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Send style={{ color: '#c084fc', width: '24px', height: '24px' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#f8fafc' }}>Token-Based Email Invites</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Admins generate cryptographically signed invitation tokens with immutable roles. Invited users are assigned their role automatically.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Layers style={{ color: '#22d3ee', width: '24px', height: '24px' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#f8fafc' }}>Multi-Tenant Workspaces</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Isolates data per workspace. Admins own their workspace and manage membership lists seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Complete Workflow Section */}
      <section id="workflow" style={{ padding: '60px 24px', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '40px' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', color: '#f8fafc', textAlign: 'center' }}>
            Phase 1 Execution Workflow
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { step: '01', title: 'Admin Sign Up & Workspace Setup', desc: 'First user registers and creates their organization workspace, automatically receiving the ADMIN role.' },
              { step: '02', title: 'Team Member Invitation', desc: 'Admin opens Team Members panel, enters teammate email, selects MANAGER or CREATOR role, and sends the secure invite link.' },
              { step: '03', title: 'Role-Locked Invitation Registration', desc: 'Teammate opens invitation link. Role is locked to the Admin decision. Upon registration, user is linked to workspace.' },
              { step: '04', title: 'Automated Role Dashboard Routing', desc: 'Auth.js evaluates user role and redirects Admin to /dashboard/admin, Manager to /dashboard/manager, and Creator to /dashboard/creator.' },
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.step}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '4px' }}>{item.title}</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
        <p>&copy; {new Date().getFullYear()} Social Media Content Automater. Auth.js + Next.js App Router Architecture.</p>
      </footer>
    </div>
  );
}
