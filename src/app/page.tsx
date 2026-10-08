import Link from 'next/link';
import { 
  Sparkles, 
  ArrowRight, 
  Camera,
} from 'lucide-react';
import { auth } from '@/auth';
import styles from './page.module.css';

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
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Social<span style={{ color: '#22c55e' }}>Automater</span>
            </span>
          </Link>

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
      <section className={`${styles.heroSection} animate-fade-in`}>
        <div className={styles.heroIntro}>
          <h1 className={styles.heroTitle}>
            Plan, create, and publish <span>social content together.</span>
          </h1>

          <p className={styles.heroDescription}>
            Bring your team into one workspace to draft posts, review content, and schedule publishing across Instagram and LinkedIn.
          </p>

          <div className={styles.heroActions}>
            <Link href="/register" className={styles.heroPrimaryAction}>
              Create your workspace
              <ArrowRight aria-hidden="true" style={{ width: '18px', height: '18px' }} />
            </Link>
            <Link href="/login" className={styles.heroSecondaryAction}>
              Sign in
            </Link>
          </div>

          <p className={styles.heroAssurance}>A shared workflow for creators, managers, and admins</p>

          <div className={styles.platforms}>
            <p className={styles.platformsLabel}>Supported platforms</p>
            <div className={styles.platformList}>
              <div className={styles.platformItem}>
                <span className={styles.platformIcon}><Camera aria-hidden="true" /></span>
                <span>Instagram</span>
              </div>
              <div className={styles.platformItem}>
                <span className={`${styles.platformIcon} ${styles.linkedinIcon}`} aria-hidden="true">in</span>
                <span>LinkedIn</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
