'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  UserCheck,
  CheckCheck,
  X,
  Layers,
  Users,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { PostNotificationItem, InvitationNotificationItem } from '@/app/api/notifications/route';

export interface NotificationDropdownProps {
  userRole?: 'ADMIN' | 'MANAGER' | 'CREATOR';
  currentUserId?: string;
  onNavigateToTab?: (tab: string) => void;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function NotificationDropdown({
  userRole,
  currentUserId,
  onNavigateToTab,
  className = '',
}: NotificationDropdownProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'invitations'>('posts');
  const [posts, setPosts] = useState<PostNotificationItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Determine effective role: passed prop has priority, then session role
  const effectiveRole = userRole || session?.user?.role || 'CREATOR';
  const effectiveUserId = currentUserId || session?.user?.id || 'guest';
  const canViewInvitations = effectiveRole === 'ADMIN';

  // Read IDs localStorage key
  const storageKey = `sm_read_notifs_${effectiveUserId}`;

  // Load read notification IDs from localStorage on client mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  // Ensure non-admins are never stuck on invitations tab
  useEffect(() => {
    if (!canViewInvitations && activeTab === 'invitations') {
      setActiveTab('posts');
    }
  }, [canViewInvitations, activeTab]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.postNotifications || []);
        if (canViewInvitations) {
          setInvitations(data.invitationNotifications || []);
        } else {
          setInvitations([]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [canViewInvitations]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Read status handlers
  const markAsRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const updated = [...prev, id];
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore storage write error
        }
        return updated;
      });
    },
    [storageKey]
  );

  const markAllAsRead = useCallback(() => {
    const allIds = [
      ...posts.map((p) => p.id),
      ...(canViewInvitations ? invitations.map((i) => i.id) : []),
    ];
    setReadIds(allIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allIds));
    } catch {
      // Ignore
    }
  }, [posts, invitations, canViewInvitations, storageKey]);

  // Unread counts
  const unreadPostsCount = useMemo(() => {
    return posts.filter((p) => !readIds.includes(p.id)).length;
  }, [posts, readIds]);

  const unreadInvitationsCount = useMemo(() => {
    if (!canViewInvitations) return 0;
    return invitations.filter((i) => !readIds.includes(i.id)).length;
  }, [invitations, readIds, canViewInvitations]);

  const totalUnreadCount = unreadPostsCount + (canViewInvitations ? unreadInvitationsCount : 0);

  const handlePostClick = (post: PostNotificationItem) => {
    markAsRead(post.id);
    if (onNavigateToTab) {
      if (effectiveRole === 'ADMIN') {
        onNavigateToTab('content');
      } else if (effectiveRole === 'MANAGER') {
        onNavigateToTab('posts');
      } else {
        onNavigateToTab('drafts');
      }
    }
    setIsOpen(false);
  };

  const handleInvitationClick = (invitation: InvitationNotificationItem) => {
    markAsRead(invitation.id);
    if (onNavigateToTab) {
      onNavigateToTab('members');
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`notification-dropdown-wrapper ${className}`}>
      {/* Trigger Button with Exact Icon & Badge */}
      <button
        type="button"
        className={`notification-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Notifications, ${totalUnreadCount} unread`}
        title={`Notifications (${totalUnreadCount} unread)`}
      >
        <svg aria-hidden="true" viewBox="0 0 512 512" style={{ width: '24px', height: '24px', display: 'block' }}>
          <path
            d="M313 42H95A53 53 0 0 0 42 95V303c0 64 32 101 96 101h43c15 0 23 7 33 21l25 34c9 13 26 13 35 0l26-34c10-14 18-21 33-21 90 0 137-45 137-123v-67"
            fill="none"
            stroke="currentColor"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="416" cy="96" r="53" fill="none" stroke="currentColor" strokeWidth="32" />
          <circle cx="170" cy="234" r="22" fill="currentColor" />
          <circle cx="256" cy="234" r="22" fill="currentColor" />
          <circle cx="342" cy="234" r="22" fill="currentColor" />
        </svg>

        {mounted && totalUnreadCount > 0 && (
          <span className="notification-badge-count" aria-hidden="true">
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="notification-dropdown-panel animate-fade-in"
          role="dialog"
          aria-label="Notifications Dropdown"
        >
          {/* Header */}
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-title-group">
              <h2 className="notification-dropdown-title">Notification</h2>
              {totalUnreadCount > 0 && (
                <span className="notification-unread-pill">
                  {totalUnreadCount} new
                </span>
              )}
            </div>

            <div className="notification-header-actions">
              {totalUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="notification-action-btn"
                  title="Mark all notifications as read"
                >
                  <CheckCheck style={{ width: '14px', height: '14px' }} />
                  <span>Mark all read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => fetchNotifications()}
                className="notification-close-btn"
                title="Refresh notifications"
                disabled={loading}
              >
                <RefreshCw
                  style={{
                    width: '13px',
                    height: '13px',
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="notification-close-btn"
                title="Close notifications"
                aria-label="Close"
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Invitations tab visible ONLY to Admins) */}
          <div className="notification-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'posts'}
              className={`notification-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              <Layers style={{ width: '14px', height: '14px' }} />
              <span>Posts</span>
              <span className="notification-tab-count">{posts.length}</span>
            </button>

            {canViewInvitations && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'invitations'}
                className={`notification-tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
                onClick={() => setActiveTab('invitations')}
              >
                <Users style={{ width: '14px', height: '14px' }} />
                <span>Invitations</span>
                <span className="notification-tab-count">{invitations.length}</span>
              </button>
            )}
          </div>

          {/* Content Scrollable List */}
          <div className="notification-items-scroll">
            {/* POSTS TAB */}
            {activeTab === 'posts' && (
              <>
                {posts.length === 0 ? (
                  <div className="notification-empty-state">
                    <div className="notification-empty-icon">
                      <Layers style={{ width: '22px', height: '22px' }} />
                    </div>
                    <div className="notification-empty-title">No post notifications</div>
                    <div className="notification-empty-text">
                      Scheduled, published, and failed post updates will show up here.
                    </div>
                  </div>
                ) : (
                  posts.map((post) => {
                    const isUnread = !readIds.includes(post.id);
                    return (
                      <div
                        key={post.id}
                        className={`notification-card ${isUnread ? 'unread' : ''}`}
                        onClick={() => handlePostClick(post)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handlePostClick(post);
                        }}
                      >
                        {/* Icon by category */}
                        <div
                          className={`notification-card-icon ${
                            post.category === 'PUBLISHED'
                              ? 'notification-icon-published'
                              : post.category === 'FAILED'
                              ? 'notification-icon-failed'
                              : 'notification-icon-scheduled'
                          }`}
                        >
                          {post.category === 'PUBLISHED' && (
                            <CheckCircle2 style={{ width: '18px', height: '18px' }} />
                          )}
                          {post.category === 'FAILED' && (
                            <AlertTriangle style={{ width: '18px', height: '18px' }} />
                          )}
                          {post.category === 'SCHEDULED' && (
                            <Clock style={{ width: '18px', height: '18px' }} />
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="notification-card-body">
                          <div className="notification-card-top">
                            <span className="notification-card-title">{post.title}</span>
                            <span className="notification-time">
                              {formatRelativeTime(post.timestamp)}
                            </span>
                          </div>

                          {post.snippet && (
                            <p className="notification-snippet">{post.snippet}</p>
                          )}

                          <div className="notification-detail">
                            <span>{post.detail}</span>
                          </div>

                          <div className="notification-meta-row">
                            <span
                              className={`notification-badge-tag ${
                                post.category === 'PUBLISHED'
                                  ? 'badge-tag-published'
                                  : post.category === 'FAILED'
                                  ? 'badge-tag-failed'
                                  : 'badge-tag-scheduled'
                              }`}
                            >
                              {post.status}
                            </span>

                            {effectiveRole !== 'CREATOR' && post.authorName && (
                              <span className="notification-author">
                                by {post.authorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* INVITATIONS TAB (ADMIN ONLY) */}
            {canViewInvitations && activeTab === 'invitations' && (
              <>
                {invitations.length === 0 ? (
                  <div className="notification-empty-state">
                    <div className="notification-empty-icon">
                      <Send style={{ width: '22px', height: '22px' }} />
                    </div>
                    <div className="notification-empty-title">No invitation updates</div>
                    <div className="notification-empty-text">
                      Workspace invitations sent, accepted, or expired will appear here.
                    </div>
                  </div>
                ) : (
                  invitations.map((inv) => {
                    const isUnread = !readIds.includes(inv.id);
                    return (
                      <div
                        key={inv.id}
                        className={`notification-card ${isUnread ? 'unread' : ''}`}
                        onClick={() => handleInvitationClick(inv)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleInvitationClick(inv);
                        }}
                      >
                        <div
                          className={`notification-card-icon ${
                            inv.category === 'INVITATION_ACCEPTED'
                              ? 'notification-icon-invitation-accepted'
                              : inv.category === 'INVITATION_EXPIRED'
                              ? 'notification-icon-invitation-expired'
                              : 'notification-icon-invitation-pending'
                          }`}
                        >
                          {inv.category === 'INVITATION_ACCEPTED' && (
                            <UserCheck style={{ width: '18px', height: '18px' }} />
                          )}
                          {inv.category === 'INVITATION_EXPIRED' && (
                            <AlertTriangle style={{ width: '18px', height: '18px' }} />
                          )}
                          {inv.category === 'INVITATION_SENT' && (
                            <Send style={{ width: '16px', height: '16px' }} />
                          )}
                        </div>

                        <div className="notification-card-body">
                          <div className="notification-card-top">
                            <span className="notification-card-title">{inv.title}</span>
                            <span className="notification-time">
                              {formatRelativeTime(inv.timestamp)}
                            </span>
                          </div>

                          <p className="notification-snippet">{inv.message}</p>

                          <div className="notification-detail">
                            <span>{inv.detail}</span>
                          </div>

                          <div className="notification-meta-row">
                            <span
                              className={`notification-badge-tag ${
                                inv.status === 'ACCEPTED'
                                  ? 'badge-tag-accepted'
                                  : inv.status === 'EXPIRED'
                                  ? 'badge-tag-expired'
                                  : 'badge-tag-pending'
                              }`}
                            >
                              {inv.status}
                            </span>

                            <span className="notification-author">
                              Role: {inv.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="notification-dropdown-footer">
            <span>
              Role: <strong style={{ color: '#B9E769' }}>{effectiveRole}</strong>
            </span>
            {onNavigateToTab && (
              <button
                type="button"
                className="notification-footer-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => {
                  if (activeTab === 'invitations' && canViewInvitations) {
                    onNavigateToTab('members');
                  } else if (effectiveRole === 'ADMIN') {
                    onNavigateToTab('content');
                  } else if (effectiveRole === 'MANAGER') {
                    onNavigateToTab('posts');
                  } else {
                    onNavigateToTab('drafts');
                  }
                  setIsOpen(false);
                }}
              >
                <span>View all {activeTab === 'invitations' ? 'invitations' : 'posts'}</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
