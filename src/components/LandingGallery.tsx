'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  BarChart3,
  FolderOpen,
  MessageCircle,
  MousePointer2,
  PenLine,
  Plus,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import styles from '@/app/landing-gallery.module.css';

const slideCount = 4;

function LinkedInMark() {
  return <span className={styles.linkedinGlyph} aria-hidden="true">in</span>;
}

function LinkedInBrandIcon() {
  return (
    <svg className={styles.linkedinBrandIcon} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M6.2 9.2h2.7v8.6H6.2V9.2Zm1.35-4.1a1.57 1.57 0 1 1-.02 3.14 1.57 1.57 0 0 1 .02-3.14ZM10.6 9.2h2.6v1.18h.04c.36-.68 1.25-1.4 2.58-1.4 2.76 0 3.27 1.81 3.27 4.16v4.66h-2.72v-4.13c0-.99-.02-2.27-1.38-2.27-1.38 0-1.59 1.08-1.59 2.2v4.2H10.7V9.2h-.1Z"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg className={styles.instagramBrandIcon} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="instagram-brand-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD776" />
          <stop offset=".52" stopColor="#F56040" />
          <stop offset="1" stopColor="#C13584" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#instagram-brand-gradient)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.1" stroke="url(#instagram-brand-gradient)" strokeWidth="2" />
      <circle cx="17.5" cy="6.8" r="1.2" fill="#F56040" />
    </svg>
  );
}

type LandingGalleryProps = {
  dashboardHref: string;
  userRole: string | null;
};

export default function LandingGallery({ dashboardHref, userRole }: LandingGalleryProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') {
        setActiveSlide((current) => Math.min(current + 1, slideCount - 1));
      } else if (event.key === 'ArrowLeft') {
        setActiveSlide((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSlide = () => setActiveSlide((current) => Math.min(current + 1, slideCount - 1));
  const previousSlide = () => setActiveSlide((current) => Math.max(current - 1, 0));

  return (
    <main className={styles.gallery} aria-label="Social Automater product tour">
      <header className={styles.navbar}>
        <Link href="/" className={styles.brand} aria-label="Social Automater home">
          <span>Social<span className={styles.brandAccent}>Automater</span></span>
        </Link>

        <div className={styles.navActions}>
          {userRole ? (
            <Link href={dashboardHref} className={styles.navCta}>
              Dashboard <ArrowUpRight aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link href="/login" className={styles.navSignIn}>Sign in</Link>
              <Link href="/register" className={styles.navCta}>
                Get started <ArrowUpRight aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </header>

      <div className={styles.viewport}>
        <div
          className={styles.track}
          style={{ transform: `translate3d(-${activeSlide * 100}%, 0, 0)` }}
        >
          <section className={`${styles.slide} ${styles.heroSlide}`} aria-label="Welcome">
            <div className={styles.heroContent}>
              <div className={styles.eyebrow}>ONE WORKSPACE. ALL YOUR SOCIAL.</div>
              <h1 className={styles.heroTitle}>
                <span className={styles.heroTitleLead}>Plan, create, and publish</span>
                <span> social content together.</span>
              </h1>
              <p className={styles.heroDescription}>
                Bring your team into one workspace to draft posts, review content, and schedule publishing across Instagram and LinkedIn.
              </p>
              <div className={styles.heroActions}>
                <Link href={userRole ? dashboardHref : '/register'} className={styles.primaryButton}>
                  {userRole ? 'Go to your workspace' : 'Create your workspace'}
                  <ArrowRight aria-hidden="true" />
                </Link>
                <button className={styles.textButton} onClick={nextSlide}>
                  <CirclePlay aria-hidden="true" /> See how it works
                </button>
              </div>
              <div className={styles.heroProof}>
                <div className={styles.avatarStack} aria-hidden="true">
                  <span>J</span><span>M</span><span>A</span><span>+</span>
                </div>
                <span>A shared workflow for creators, managers, and admins</span>
              </div>
              <div className={styles.platforms}>
                <span>MADE FOR YOUR CHANNELS</span>
                <div><InstagramMark /> Instagram <i /> <LinkedInBrandIcon /> LinkedIn</div>
              </div>
            </div>
          </section>

          <section className={`${styles.slide} ${styles.workflowSlide}`} aria-label="How it works">
            <div className={styles.slideCopy}>
              <div className={styles.eyebrow}>HOW IT WORKS</div>
              <h2 className={styles.slideTitle}>From first thought<br />to <span>ready to publish.</span></h2>
              <p className={styles.slideDescription}>
                A clear, connected workflow keeps every post moving. Create a draft, get the right eyes on it, then schedule with confidence.
              </p>
              <div className={styles.steps}>
                <div className={styles.step}><span>01</span><div><strong>Create together</strong><small>Start with an idea, draft, or asset.</small></div><PenLine aria-hidden="true" /></div>
                <div className={styles.step}><span>02</span><div><strong>Review in context</strong><small>Keep feedback beside the post.</small></div><CheckCircle2 aria-hidden="true" /></div>
                <div className={styles.step}><span>03</span><div><strong>Schedule the moment</strong><small>Publish when your audience is ready.</small></div><CalendarDays aria-hidden="true" /></div>
              </div>
            </div>
            <div className={styles.visualStage}>
              <div className={styles.workflowGlow} />
              <div className={styles.workflowCard}>
                <div className={styles.mockHeader}><span className={styles.mockWindowDots}><i /><i /><i /></span><span>Content workflow</span><span className={styles.mockHeaderIcon}><ArrowUpRight /></span></div>
                <div className={styles.workflowMeta}><div><small>WEDNESDAY, OCTOBER 14</small><strong>Launch week content</strong></div><span className={styles.weekPill}>This week <ChevronRight /></span></div>
                <div className={styles.workflowTimeline}>
                  <div className={styles.timelineLabel}><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
                  <div className={styles.timelineRow}><span className={styles.timelineDay}>MON <b>12</b></span><div className={styles.timelineTrack}><div className={`${styles.timelineEvent} ${styles.eventDraft}`}><Camera /><span>Behind the scenes<small>Draft · Jamie</small></span><span className={styles.statusDot} /></div><div className={`${styles.timelineEvent} ${styles.eventScheduled}`}><LinkedInMark /><span>Product story<small>Scheduled · 3:15 PM</small></span><Check /></div></div></div>
                  <div className={styles.timelineRow}><span className={styles.timelineDay}>TUE <b>13</b></span><div className={styles.timelineTrack}><div className={`${styles.timelineEvent} ${styles.eventReview}`}><Camera /><span>Customer spotlight<small>In review · Alex</small></span><MessageCircle /></div></div></div>
                  <div className={styles.timelineRow}><span className={styles.timelineDay}>WED <b>14</b></span><div className={styles.timelineTrack}><div className={`${styles.timelineEvent} ${styles.eventDraft}`}><PenLine /><span>Meet the makers<small>Draft · Morgan</small></span><ArrowUpRight /></div></div></div>
                </div>
                <div className={styles.workflowFooter}><span><span className={styles.footerAvatar}>M</span> Your team is in sync</span><button aria-label="Add a post"><Plus /></button></div>
              </div>
              <div className={styles.floatingNote}><span className={styles.noteCheck}><Check /></span><span><strong>One smooth workflow</strong><small>Draft · Review · Publish</small></span></div>
            </div>
          </section>

          <section className={`${styles.slide} ${styles.teamSlide}`} aria-label="Team collaboration">
            <div className={styles.slideCopy}>
              <div className={styles.eyebrow}>BETTER, TOGETHER</div>
              <h2 className={styles.slideTitle}>Great content is<br /><span>a team sport.</span></h2>
              <p className={styles.slideDescription}>
                Bring creators and managers into the same conversation. Share drafts, leave clear feedback, and know exactly what needs attention.
              </p>
              <div className={styles.featureList}>
                <div><span className={styles.featureIcon}><UsersRound /></span><span><strong>Everyone in their lane</strong><small>Role-based workspaces keep work clear and focused.</small></span></div>
                <div><span className={styles.featureIcon}><MessageCircle /></span><span><strong>Feedback with context</strong><small>Comments stay with the post, not in another inbox.</small></span></div>
                <div><span className={styles.featureIcon}><CheckCircle2 /></span><span><strong>Approvals without the chase</strong><small>See what is ready, and what still needs a look.</small></span></div>
              </div>
            </div>
            <div className={`${styles.visualStage} ${styles.collaborationStage}`}>
              <div className={styles.teamOrb} />
              <div className={styles.reviewCard}>
                <div className={styles.reviewTop}><span>POST REVIEW</span><span className={styles.reviewStatus}><i /> IN REVIEW</span></div>
                <div className={styles.postArtwork}><span>MAKE<br />SPACE FOR<br /><b>GOOD IDEAS.</b></span><span className={styles.artworkSun} /></div>
                <div className={styles.reviewCaption}><span className={styles.platformBadge}><Camera /></span><span><strong>A little room to think.</strong><small>Instagram · Today at 10:42 AM</small></span><ArrowUpRight /></div>
                <div className={styles.comment}><span className={styles.commentAvatar}>J</span><span><strong>Jamie <small>2 min ago</small></strong><span>Love this direction. Can we make the first line pop a little more?</span></span><span className={styles.commentReaction}>✦</span></div>
                <div className={styles.commentReply}><span className={styles.replyAvatar}>M</span><span>Absolutely — updated the opening line ✨</span></div>
                <div className={styles.reviewActions}><button><MessageCircle /> Reply</button><button><CheckCircle2 /> Approve post</button></div>
              </div>
              <div className={styles.collabBadge}><span className={styles.collabAvatars}><i>J</i><i>M</i><i>A</i></span><span><strong>In good company</strong><small>3 teammates on this post</small></span></div>
              <div className={styles.pointerDecoration}><MousePointer2 /><span>Jamie</span></div>
            </div>
          </section>

          <section className={`${styles.slide} ${styles.publishSlide}`} aria-label="Product features">
            <div className={styles.slideCopy}>
              <div className={styles.eyebrow}>THE WHOLE WORKFLOW</div>
              <h2 className={styles.slideTitle}>Your complete<br /><span>social toolkit.</span></h2>
              <p className={styles.slideDescription}>
                Create, organize, review, and publish social content together—all from one shared workspace.
              </p>
              <div className={styles.productFeatureList}>
                <div><CheckCircle2 /><span>Drafts, reviews, and approvals</span></div>
                <div><CheckCircle2 /><span>Instagram and LinkedIn publishing</span></div>
                <div><CheckCircle2 /><span>Workspace roles and post analytics</span></div>
              </div>
              <Link href={userRole ? dashboardHref : '/register'} className={styles.primaryButton}>
                {userRole ? 'Open your workspace' : 'Create your workspace'} <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div className={`${styles.visualStage} ${styles.productFeatureStage}`}>
              <div className={styles.productFeaturePanel}>
                <div className={styles.productFeatureHeader}>
                  <span><Sparkles /></span>
                  <div><small>YOUR SOCIAL WORKSPACE</small><strong>Everything, in sync.</strong></div>
                  <span className={styles.workspaceStatus}><i /> LIVE</span>
                </div>
                <div className={styles.productFeatureGrid}>
                  <div className={styles.productFeatureTile}>
                    <span className={styles.productFeatureIcon}><PenLine /></span>
                    <strong>Create &amp; review</strong>
                    <small>Draft posts, share feedback, and keep approvals moving.</small>
                    <span className={styles.tileFoot}><i /> Team workflow</span>
                  </div>
                  <div className={styles.productFeatureTile}>
                    <span className={styles.productFeatureIcon}><CalendarDays /></span>
                    <strong>Plan &amp; publish</strong>
                    <small>Schedule content across Instagram and LinkedIn.</small>
                    <span className={styles.channelMarks}><Camera /><LinkedInMark /></span>
                  </div>
                  <div className={styles.productFeatureTile}>
                    <span className={styles.productFeatureIcon}><FolderOpen /></span>
                    <strong>Shared media library</strong>
                    <small>Keep your team’s content assets together.</small>
                    <span className={styles.assetPreview}><i /><i /><i /></span>
                  </div>
                  <div className={styles.productFeatureTile}>
                    <span className={styles.productFeatureIcon}><UsersRound /></span>
                    <strong>Roles &amp; workspace</strong>
                    <small>Give creators, managers, and admins clear roles.</small>
                    <span className={styles.roleMarks}><i>C</i><i>M</i><i>A</i><span>3 roles</span></span>
                  </div>
                  <div className={`${styles.productFeatureTile} ${styles.productFeatureTileWide}`}>
                    <span className={styles.productFeatureIcon}><BarChart3 /></span>
                    <span><strong>Post analytics</strong><small>Track performance and understand what’s working.</small></span>
                    <span className={styles.analyticsMini} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></span>
                  </div>
                </div>
                <div className={styles.productFeatureFooter}><span><i /> ONE WORKSPACE</span><span>Instagram <i /> LinkedIn</span></div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <nav className={styles.slideNavigation} aria-label="Slide navigation">
        <button className={styles.arrowButton} onClick={previousSlide} disabled={activeSlide === 0} aria-label="Previous slide">
          <ArrowLeft aria-hidden="true" />
        </button>
        <button className={`${styles.arrowButton} ${styles.nextButton}`} onClick={nextSlide} disabled={activeSlide === slideCount - 1} aria-label="Next slide">
          <ArrowRight aria-hidden="true" />
        </button>
      </nav>

      <div className={styles.slideFooter}>
        <div className={styles.indicators} aria-label="Choose a slide">
          {['Welcome', 'How it works', 'Collaboration', 'Product features'].map((label, index) => (
            <button
              key={label}
              className={`${styles.indicator} ${index === activeSlide ? styles.indicatorActive : ''}`}
              onClick={() => setActiveSlide(index)}
              aria-label={`Go to slide ${index + 1}: ${label}`}
              aria-current={index === activeSlide ? 'step' : undefined}
            />
          ))}
        </div>
        <span className={styles.slideCounter}><strong>0{activeSlide + 1}</strong><i />0{slideCount}</span>
        <span className={styles.copyright}>© 2026 Social Media Content Automater</span>
      </div>
      <span className={styles.visuallyHidden} aria-live="polite">Slide {activeSlide + 1} of {slideCount}</span>
    </main>
  );
}
