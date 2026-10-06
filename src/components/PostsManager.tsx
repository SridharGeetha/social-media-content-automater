'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  FileText,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  Layers,
  Link2,
  Send,
  Save,
  X,
  Filter,
  Image as ImageIcon,
  User as UserIcon,
  Film,
  Paperclip,
} from 'lucide-react';
import MediaLibrary, { MediaItem } from '@/components/MediaLibrary';
import { CollectionSkeleton } from '@/components/LoadingSkeleton';

export type PostStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';

export interface PostItem {
  id: string;
  workspaceId: string;
  createdBy: string;
  author?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
  content: string;
  platform?: string;
  targetPlatform?: 'LINKEDIN' | 'INSTAGRAM';
  mediaIds: string[];
  media?: MediaItem[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishingError?: string | null;
  createdAt: string;
  updatedAt: string;
  rejectionFeedback?: string | null;
}

type ComposerPlatformId = string;
type PlatformConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'unavailable';
type PlatformOption = {
  id: ComposerPlatformId;
  name: string;
  icon: React.ReactNode;
  statusUrl: string | null;
  connectUrl: string | null;
  targetPlatform: string | null;
  publishRoute: string | null;
};

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    icon: <span className="composer-platform-icon composer-platform-icon-linkedin">in</span>,
    statusUrl: '/api/social/linkedin',
    connectUrl: '/api/social/linkedin/connect',
    targetPlatform: 'LINKEDIN',
    publishRoute: 'linkedin',
  },
  {
    id: 'INSTAGRAM',
    name: 'Instagram',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="composer-platform-icon composer-platform-icon-instagram">
        <defs>
          <linearGradient id="composer-instagram-gradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFDC80" />
            <stop offset="0.5" stopColor="#E1306C" />
            <stop offset="1" stopColor="#833AB4" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#composer-instagram-gradient)" />
        <rect x="6.4" y="6.4" width="11.2" height="11.2" rx="3.2" fill="none" stroke="#ffffff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.6" fill="none" stroke="#ffffff" strokeWidth="1.7" />
        <circle cx="16.5" cy="7.6" r="1" fill="#ffffff" />
      </svg>
    ),
    statusUrl: '/api/social/instagram',
    connectUrl: '/api/social/instagram/connect',
    targetPlatform: 'INSTAGRAM',
    publishRoute: 'instagram',
  },
  {
    id: 'FACEBOOK',
    name: 'Facebook',
    icon: <span className="composer-platform-icon composer-platform-icon-facebook">f</span>,
    statusUrl: null,
    connectUrl: null,
    targetPlatform: null,
    publishRoute: null,
  },
];

const INITIAL_PLATFORM_CONNECTIONS = PLATFORM_OPTIONS.reduce<Record<ComposerPlatformId, PlatformConnectionStatus>>((connections, platform) => {
  connections[platform.id] = platform.statusUrl ? 'checking' : 'unavailable';
  return connections;
}, {});

function toLocalDateTimeInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface PostsManagerProps {
  userRole?: 'ADMIN' | 'MANAGER' | 'CREATOR';
  currentUserId?: string;
  initialStatus?: string;
  createPostTrigger?: number;
  createPostStatus?: PostStatus;
  openCreateOnMount?: boolean;
  hideManagementHeader?: boolean;
}

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Failed', value: 'FAILED' },
];

export default function PostsManager({ userRole, currentUserId, initialStatus = 'ALL', createPostTrigger, createPostStatus, openCreateOnMount, hideManagementHeader }: PostsManagerProps) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>(initialStatus);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const handledCreatePostTrigger = useRef(createPostTrigger);
  const [viewingPost, setViewingPost] = useState<PostItem | null>(null);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showMediaSelectorModal, setShowMediaSelectorModal] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    content: '',
    status: 'DRAFT' as PostStatus,
    scheduledAt: '',
    targetPlatform: 'LINKEDIN' as 'LINKEDIN' | 'INSTAGRAM',
  });
  const [selectedComposerPlatforms, setSelectedComposerPlatforms] = useState<ComposerPlatformId[]>(userRole === 'ADMIN' ? ['LINKEDIN'] : []);
  const [platformConnections, setPlatformConnections] = useState<Record<ComposerPlatformId, PlatformConnectionStatus>>(INITIAL_PLATFORM_CONNECTIONS);
  const platformConnectionsRef = useRef(INITIAL_PLATFORM_CONNECTIONS);
  const [schedulePost, setSchedulePost] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [directPublishStatus, setDirectPublishStatus] = useState<'publishing' | 'success' | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'CREATOR') return;
    let active = true;

    const checkConnections = async () => {
      const results = await Promise.all(PLATFORM_OPTIONS.map(async (platform) => {
        if (!platform.statusUrl) return { id: platform.id, status: 'unavailable' as const };
        try {
          const response = await fetch(platform.statusUrl);
          const data = await response.json();
          return { id: platform.id, status: response.ok && data.connected ? 'connected' as const : 'disconnected' as const };
        } catch {
          return { id: platform.id, status: 'disconnected' as const };
        }
      }));

      if (!active) return;
      const nextConnections = { ...INITIAL_PLATFORM_CONNECTIONS };
      for (const result of results) nextConnections[result.id] = result.status;
      platformConnectionsRef.current = nextConnections;
      setPlatformConnections(nextConnections);
      if (userRole === 'CREATOR' || userRole === 'MANAGER') {
        setSelectedComposerPlatforms((current) => {
          const connected = current.filter((id) => nextConnections[id] === 'connected');
          return connected.length ? connected : PLATFORM_OPTIONS.filter((platform) => nextConnections[platform.id] === 'connected').slice(0, 1).map((platform) => platform.id);
        });
      }
    };

    void checkConnections();
    return () => { active = false; };
  }, [userRole]);

  // Fetch Posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = activeTab === 'ALL' ? '/api/posts' : `/api/posts?status=${activeTab}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setPosts(data.posts || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch posts.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred while fetching posts.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const request = window.setTimeout(() => {
      void fetchPosts();
    }, 0);
    return () => window.clearTimeout(request);
  }, [fetchPosts]);

  // Open Create Modal
  const openCreateModal = useCallback((defaultStatus: PostStatus = 'DRAFT') => {
    setFormData({
      content: '',
      status: defaultStatus,
      scheduledAt: '',
      targetPlatform: 'LINKEDIN',
    });
    const firstConnectedPlatform = PLATFORM_OPTIONS
      .filter((platform) => platformConnectionsRef.current[platform.id] === 'connected')
      .slice(0, 1)
      .map((platform) => platform.id);
    setSelectedComposerPlatforms(userRole === 'ADMIN' ? ['LINKEDIN'] : firstConnectedPlatform);
    setSchedulePost(defaultStatus === 'SCHEDULED');
    setAttachedMedia([]);
    setShowCreateModal(true);
  }, [userRole]);

  useEffect(() => {
    if (!openCreateOnMount) return;
    const request = window.setTimeout(() => openCreateModal(createPostStatus ?? 'DRAFT'), 0);
    return () => window.clearTimeout(request);
  }, [openCreateOnMount, createPostStatus, openCreateModal]);

  useEffect(() => {
    if (createPostTrigger === undefined || createPostTrigger === handledCreatePostTrigger.current) return;
    handledCreatePostTrigger.current = createPostTrigger;
    const request = window.setTimeout(() => openCreateModal(createPostStatus ?? 'SCHEDULED'), 0);
    return () => window.clearTimeout(request);
  }, [createPostTrigger, createPostStatus, openCreateModal]);

  // Open Edit Modal
  const openEditModal = (post: PostItem) => {
    let schedDate = '';
    if (post.scheduledAt) {
      try {
        schedDate = toLocalDateTimeInput(new Date(post.scheduledAt));
      } catch (e) {
        console.error(e);
      }
    }

    setFormData({
      content: post.content,
      status: post.status,
      scheduledAt: schedDate,
      targetPlatform: post.targetPlatform || 'LINKEDIN',
    });
    setAttachedMedia(post.media || []);
    setEditingPost(post);
  };

  // Handle Submit (Create / Edit)
  const handleSubmitPost = async (e: React.FormEvent, forceStatus?: PostStatus, publishImmediately = false) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    const requestedStatus = forceStatus || formData.status;
    const targetStatus = publishImmediately && formData.targetPlatform === 'INSTAGRAM' && requestedStatus !== 'SCHEDULED'
      ? 'APPROVED'
      : requestedStatus;
    const mediaIdsArray = attachedMedia.map((m) => m.id);

    const payload = {
      content: formData.content.trim(),
      mediaIds: mediaIdsArray,
      targetPlatform: formData.targetPlatform,
      status: targetStatus,
      scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
      ...(publishImmediately ? { publishImmediately: true } : {}),
    };

    try {
      let res;
      if (editingPost) {
        res = await fetch(`/api/posts/${editingPost.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (res.ok) {
        if (publishImmediately) {
          const route = formData.targetPlatform === 'INSTAGRAM' ? 'instagram' : 'linkedin';
          const publishResponse = await fetch(`/api/posts/${data.post.id}/${route}`, { method: 'POST' });
          const publishData = await publishResponse.json();
          if (!publishResponse.ok) throw new Error(publishData.error || `Failed to publish post to ${formData.targetPlatform === 'INSTAGRAM' ? 'Instagram' : 'LinkedIn'}.`);
        }
        setShowCreateModal(false);
        setEditingPost(null);
        setAttachedMedia([]);
        fetchPosts();
      } else {
        setErrorMsg(data.error || 'Failed to save post.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while saving post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminComposerSubmit = async (e: React.FormEvent, action: 'DRAFT' | 'PUBLISH' | 'SCHEDULE') => {
    e.preventDefault();
    if (!formData.content.trim()) {
      setErrorMsg('Post content is required.');
      return;
    }

    const selectedPlatforms = PLATFORM_OPTIONS.filter((platform) => selectedComposerPlatforms.includes(platform.id));
    if (selectedPlatforms.length === 0) {
      setErrorMsg('Select at least one platform.');
      return;
    }

    const unsupportedPlatform = selectedPlatforms.find((platform) => !platform.targetPlatform || !platform.publishRoute);
    if (unsupportedPlatform) {
      setErrorMsg(`${unsupportedPlatform.name} publishing is not available yet. Deselect it to continue.`);
      return;
    }

    if (action !== 'DRAFT') {
      const disconnectedPlatform = selectedPlatforms.find((platform) => platformConnections[platform.id] !== 'connected');
      if (disconnectedPlatform) {
        setErrorMsg(userRole === 'MANAGER'
          ? `Ask a Workspace Admin to connect the ${disconnectedPlatform.name} account before publishing.`
          : `Connect your ${disconnectedPlatform.name} account before publishing.`);
        return;
      }
    }

    if (action === 'SCHEDULE' && !formData.scheduledAt) {
      setErrorMsg('Choose a date and time to schedule this post.');
      return;
    }

    setSubmitting(true);
    if (action === 'PUBLISH') setDirectPublishStatus('publishing');
    setErrorMsg(null);
    const mediaIdsArray = attachedMedia.map((media) => media.id);

    try {
      for (const platform of selectedPlatforms) {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: formData.content.trim(),
            mediaIds: mediaIdsArray,
            targetPlatform: platform.targetPlatform,
            status: action === 'DRAFT' ? 'DRAFT' : action === 'SCHEDULE' ? 'SCHEDULED' : 'APPROVED',
            scheduledAt: action === 'SCHEDULE' ? new Date(formData.scheduledAt).toISOString() : null,
            ...(action === 'PUBLISH' && userRole === 'MANAGER' ? { publishImmediately: true } : {}),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Failed to create the ${platform.name} post.`);

        if (action === 'PUBLISH' && userRole !== 'MANAGER' && platform.publishRoute) {
          const publishResponse = await fetch(`/api/posts/${data.post.id}/${platform.publishRoute}`, { method: 'POST' });
          const publishData = await publishResponse.json();
          if (!publishResponse.ok) throw new Error(publishData.error || `Failed to publish to ${platform.name}.`);
        }
      }

      if (action === 'PUBLISH') {
        setDirectPublishStatus('success');
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1400));
      }
      setShowCreateModal(false);
      setEditingPost(null);
      setAttachedMedia([]);
      await fetchPosts();
    } catch (reason: unknown) {
      if (action === 'PUBLISH') setDirectPublishStatus(null);
      setErrorMsg(reason instanceof Error ? reason.message : 'An error occurred while saving the post.');
    } finally {
      setSubmitting(false);
      if (action === 'PUBLISH') setDirectPublishStatus(null);
    }
  };

  const handleCreatorComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      setErrorMsg('Post content is required.');
      return;
    }

    const selectedPlatforms = PLATFORM_OPTIONS.filter((platform) => selectedComposerPlatforms.includes(platform.id));
    if (selectedPlatforms.length === 0) {
      setErrorMsg('Select at least one connected platform.');
      return;
    }
    if (selectedPlatforms.some((platform) => platformConnections[platform.id] !== 'connected')) {
      setErrorMsg('Only connected platforms can be selected.');
      return;
    }
    if (schedulePost && !formData.scheduledAt) {
      setErrorMsg('Choose a date and time to schedule this post.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const mediaIds = attachedMedia.map((media) => media.id);
    try {
      for (const platform of selectedPlatforms) {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: formData.content.trim(),
            mediaIds,
            targetPlatform: platform.targetPlatform,
            status: 'PENDING_REVIEW',
            scheduledAt: schedulePost ? new Date(formData.scheduledAt).toISOString() : null,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Failed to submit the ${platform.name} post for review.`);
      }

      setShowCreateModal(false);
      setEditingPost(null);
      setAttachedMedia([]);
      await fetchPosts();
    } catch (reason: unknown) {
      setErrorMsg(reason instanceof Error ? reason.message : 'An error occurred while submitting the post for review.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Post
  const handleDeletePost = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setDeletingPostId(null);
        fetchPosts();
      } else {
        setErrorMsg(data.error || 'Failed to delete post.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error deleting post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishPost = async (post: PostItem) => {
    setPublishingPostId(post.id);
    setErrorMsg(null);
    try {
      const targetPlatform = post.targetPlatform || 'LINKEDIN';
      const response = await fetch(`/api/posts/${post.id}/${targetPlatform === 'INSTAGRAM' ? 'instagram' : 'linkedin'}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to publish post to ${targetPlatform === 'INSTAGRAM' ? 'Instagram' : 'LinkedIn'}.`);
      await fetchPosts();
    } catch (reason: unknown) {
      setErrorMsg(reason instanceof Error ? reason.message : 'Failed to publish post.');
    } finally {
      setPublishingPostId(null);
    }
  };

  const handleReview = async (action: 'APPROVE' | 'REJECT', post: PostItem) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          feedback: action === 'REJECT' ? 'Rejected by Manager.' : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to review post.');
      await fetchPosts();
    } catch (reason: unknown) {
      setErrorMsg(reason instanceof Error ? reason.message : 'Failed to review post.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(201, 193, 154, 0.12)', color: '#C9C19A', border: '1px solid rgba(201, 193, 154, 0.24)' }}>
            <FileText style={{ width: '12px', height: '12px' }} /> DRAFT
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', backgroundColor: 'rgba(255, 198, 109, 0.12)', color: '#FFC66D', border: '1px solid rgba(255, 198, 109, 0.24)' }}>
            <Clock style={{ width: '12px', height: '12px' }} /> PENDING REVIEW
          </span>
        );
      case 'APPROVED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(139, 212, 138, 0.12)', color: '#8BD48A', border: '1px solid rgba(139, 212, 138, 0.24)' }}>
            <CheckCircle2 style={{ width: '12px', height: '12px' }} /> APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(252, 165, 165, 0.12)', color: '#FCA5A5', border: '1px solid rgba(252, 165, 165, 0.24)' }}>
            <AlertCircle style={{ width: '12px', height: '12px' }} /> REJECTED
          </span>
        );
      case 'SCHEDULED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(120, 200, 255, 0.12)', color: '#78C8FF', border: '1px solid rgba(120, 200, 255, 0.24)' }}>
            <Clock style={{ width: '12px', height: '12px' }} /> SCHEDULED
          </span>
        );
      case 'QUEUED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(255, 198, 109, 0.12)', color: '#FFC66D', border: '1px solid rgba(255, 198, 109, 0.24)' }}>
            <Layers style={{ width: '12px', height: '12px' }} /> QUEUED
          </span>
        );
      case 'PROCESSING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(185, 231, 105, 0.12)', color: '#B9E769', border: '1px solid rgba(185, 231, 105, 0.24)' }}>
            <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" /> PROCESSING
          </span>
        );
      case 'PUBLISHED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(139, 212, 138, 0.12)', color: '#8BD48A', border: '1px solid rgba(139, 212, 138, 0.24)' }}>
            <CheckCircle2 style={{ width: '12px', height: '12px' }} /> PUBLISHED
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(252, 165, 165, 0.12)', color: '#FCA5A5', border: '1px solid rgba(252, 165, 165, 0.24)' }}>
            <AlertCircle style={{ width: '12px', height: '12px' }} /> FAILED
          </span>
        );
      default:
        return null;
    }
  };

  const isAdminCreate = userRole === 'ADMIN' && !editingPost;
  const isCreatorCreate = userRole === 'CREATOR' && !editingPost;
  const isManagerCreate = userRole === 'MANAGER' && !editingPost;
  const isMultiPlatformCreate = isAdminCreate || isCreatorCreate || isManagerCreate;
  const selectedPlatformOptions = PLATFORM_OPTIONS.filter((platform) => selectedComposerPlatforms.includes(platform.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action & Summary Bar */}
      {userRole !== 'CREATOR' && !hideManagementHeader && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBF5DD', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText style={{ color: '#B9E769', width: '26px', height: '26px' }} />
            Posts Management
          </h2>
          <p style={{ color: '#C9C19A', fontSize: '0.88rem', marginTop: '4px' }}>
            Create, view, schedule, and attach media to social posts for your workspace.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {createPostTrigger === undefined && (
            <>
              <button onClick={() => openCreateModal('DRAFT')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.35)', color: '#E7E1B1' }}>
                <Save style={{ width: '16px', height: '16px' }} /> Save Draft
              </button>

              <button onClick={() => openCreateModal('SCHEDULED')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}>
                <Plus style={{ width: '18px', height: '18px' }} /> Create Post
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle style={{ width: '18px', height: '18px' }} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="post-status-filter">
        <span className="post-status-filter-label">
          <Filter style={{ width: '14px', height: '14px' }} /> Filter:
        </span>
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`post-status-tab${isActive ? ' post-status-tab-active' : ''}`}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Posts Table View */}
      {loading ? (
        <CollectionSkeleton rows={5} />
      ) : posts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.035)', border: '1px solid rgba(231, 225, 177, 0.16)' }}>
          <FileText style={{ width: '40px', height: '40px', color: '#B9E769', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#FBF5DD', marginBottom: '8px' }}>No Posts Found</h3>
          <p style={{ color: '#C9C19A', fontSize: '0.88rem', maxWidth: '400px', margin: '0 auto 20px auto' }}>
            {activeTab === 'ALL'
              ? 'You have not created any social media posts yet. Click "+ Create Post" to start!'
              : `There are currently no posts with status "${activeTab}".`}
          </p>
          <button onClick={() => openCreateModal('DRAFT')} className="btn-primary" style={{ margin: '0 auto' }}>
            <Plus style={{ width: '16px', height: '16px' }} /> Draft First Post
          </button>
        </div>
      ) : (
        <div className="glass-panel post-management-table-shell" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(231, 225, 177, 0.16)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="post-management-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr className="post-management-table-heading">
                  <th>Image</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Scheduled</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isOwnerOrManage = userRole === 'ADMIN' || userRole === 'MANAGER' || (currentUserId && post.createdBy === currentUserId);
                  const mediaCount = (post.media && post.media.length) || (post.mediaIds && post.mediaIds.length) || 0;
                  const previewMedia = post.media?.[0];

                  return (
                    <tr
                      key={post.id}
                      className="post-management-row"
                    >
                      <td className="post-management-image-cell">
                        <div className="post-management-image">
                          {previewMedia?.type === 'image' ? (
                            <img src={previewMedia.secureUrl || previewMedia.cloudinaryUrl} alt="Post attachment" />
                          ) : previewMedia ? (
                            <Film aria-label="Video attachment" style={{ width: '22px', height: '22px' }} />
                          ) : mediaCount > 0 ? (
                            <ImageIcon aria-label="Post attachments" style={{ width: '22px', height: '22px' }} />
                          ) : (
                            <span aria-label="No image attached">—</span>
                          )}
                          {mediaCount > 1 && <span className="post-management-image-count">+{mediaCount - 1}</span>}
                        </div>
                      </td>

                      <td className="post-management-description-cell">
                        <div className="post-management-description">{post.content}</div>
                        {post.content.length > 140 && (
                          <button type="button" className="post-management-more" onClick={() => setViewingPost(post)} aria-label={`Read full post by ${post.author?.name || 'Unknown User'}`}>
                            More
                          </button>
                        )}
                      </td>

                      <td className="post-management-status-cell">
                        {renderStatusBadge(post.status)}
                        {post.status === 'FAILED' && post.publishingError && (
                          <div
                            title={post.publishingError}
                            style={{ color: '#fca5a5', fontSize: '0.75rem', lineHeight: 1.4, marginTop: '6px', maxWidth: '260px', overflowWrap: 'anywhere' }}
                            role="alert"
                          >
                            {post.publishingError}
                          </div>
                        )}
                      </td>

                      <td className="post-management-author-cell">
                        <div className="post-management-author">
                          <div className="post-management-author-avatar">
                            {post.author?.name ? post.author.name.charAt(0).toUpperCase() : <UserIcon style={{ width: '14px', height: '14px' }} />}
                          </div>
                          <span className="post-management-author-copy">
                            <span>{post.author?.name || 'Unknown User'}</span>
                            <span className="post-management-created-date">Created {new Date(post.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </td>

                      <td className="post-management-date-cell">
                        {post.scheduledAt || (post.status === 'PUBLISHED' ? post.publishedAt : null) ? (
                          <div className="post-management-scheduled-date">
                            {post.status === 'PUBLISHED' && !post.scheduledAt ? <CheckCircle2 style={{ width: '13px', height: '13px' }} /> : <Clock style={{ width: '13px', height: '13px' }} />}
                            {new Date(post.scheduledAt || post.publishedAt || post.createdAt).toLocaleString()}
                          </div>
                        ) : (
                          <span className="post-management-empty-date">—</span>
                        )}
                      </td>

                      <td className="post-management-actions-cell">
                        <div className="post-management-actions">
                          <button
                            onClick={() => setViewingPost(post)}
                            title="View Details"
                            aria-label="View post details"
                            className="btn-secondary post-management-icon-action"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'transparent', borderColor: 'transparent', color: '#E7E1B1' }}
                          >
                            <Eye style={{ width: '14px', height: '14px' }} />
                          </button>

                          {isOwnerOrManage && (
                            <>
                              {post.status === 'PENDING_REVIEW' && (userRole === 'MANAGER' || userRole === 'ADMIN') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleReview('APPROVE', post)}
                                    disabled={submitting}
                                    title="Approve post"
                                    aria-label="Approve post"
                                    className="btn-secondary post-management-icon-action"
                                    style={{ padding: '6px 8px', background: 'transparent', borderColor: 'transparent', color: '#8BD48A' }}
                                  >
                                    <Check aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleReview('REJECT', post)}
                                    disabled={submitting}
                                    title="Reject post"
                                    aria-label="Reject post"
                                    className="btn-secondary post-management-icon-action"
                                    style={{ padding: '6px 8px', background: 'transparent', borderColor: 'transparent', color: '#FCA5A5' }}
                                  >
                                    <X aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                                  </button>
                                </>
                              )}
                              {post.status !== 'PUBLISHED' && post.status !== 'SCHEDULED' && userRole === 'ADMIN' &&
                                ((post.targetPlatform || 'LINKEDIN') !== 'INSTAGRAM' || post.status === 'APPROVED') && (
                                <button
                                  onClick={() => handlePublishPost(post)}
                                  disabled={publishingPostId === post.id}
                                  title="Publish post"
                                  className="btn-primary post-management-publish-action"
                                  aria-label="Publish post"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}
                                >
                                  {publishingPostId === post.id ? <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> : <Send style={{ width: '14px', height: '14px' }} />}
                                  Publish
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(post)}
                                title="Edit Post"
                                aria-label="Edit post"
                                className="btn-secondary post-management-icon-action"
                                style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'transparent', borderColor: 'transparent', color: '#E7E1B1' }}
                              >
                                <Edit3 style={{ width: '14px', height: '14px' }} />
                              </button>

                              <button
                                onClick={() => setDeletingPostId(post.id)}
                                title="Delete Post"
                                aria-label="Delete post"
                                className="btn-secondary post-management-icon-action"
                                style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#fca5a5', background: 'transparent', borderColor: 'transparent' }}
                              >
                                <Trash2 style={{ width: '14px', height: '14px' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT POST MODAL */}
      {typeof document !== 'undefined' && (showCreateModal || editingPost) && createPortal(
        <div className={isMultiPlatformCreate ? 'post-composer-overlay' : undefined} style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className={`glass-panel animate-fade-in${isMultiPlatformCreate ? ' admin-post-composer-dialog' : ''}`} style={{ maxWidth: isMultiPlatformCreate ? '760px' : '680px', width: '100%', padding: isMultiPlatformCreate ? '24px' : '32px', maxHeight: 'calc(100dvh - 48px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText style={{ color: '#B9E769', width: '22px', height: '22px' }} />
                <h3 style={{ fontSize: '1.3rem', color: '#B9E769', fontWeight: 800, margin: 0 }}>
                  {editingPost ? 'Edit Post' : 'Create New Post'}
                </h3>
              </div>
              <button onClick={() => { setShowCreateModal(false); setEditingPost(null); setAttachedMedia([]); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#C9C19A', marginBottom: '20px' }}>
              {isAdminCreate || isManagerCreate ? 'Create and publish content across your connected social platforms.' : isCreatorCreate ? 'Create content for connected social platforms and submit it for review.' : 'Draft a post, attach media, set its status, and schedule it for the right publishing moment.'}
            </p>

            <form onSubmit={(event) => isAdminCreate || isManagerCreate ? handleAdminComposerSubmit(event, schedulePost ? 'SCHEDULE' : 'PUBLISH') : isCreatorCreate ? handleCreatorComposerSubmit(event) : handleSubmitPost(event)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {isMultiPlatformCreate ? (
                <>
                  <section>
                    <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Publish to</label>
                    <div className="composer-platform-grid">
                      {PLATFORM_OPTIONS.map((platform) => {
                        const selected = selectedComposerPlatforms.includes(platform.id);
                        const connection = platformConnections[platform.id];
                        const connectionLabel = connection === 'checking' ? 'Checking' : connection === 'connected' ? 'Connected' : connection === 'unavailable' ? 'Coming soon' : 'Not connected';
                        const connectionColor = connection === 'connected' ? '#8BD48A' : connection === 'disconnected' ? '#E7A4A4' : '#C9C19A';
                        const disabled = (isCreatorCreate || isManagerCreate) && connection !== 'connected';
                        return (
                          <label key={platform.id} className={`composer-platform-option${selected ? ' composer-platform-option-selected' : ''}`} style={disabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>
                            {platform.icon}
                            <span className="composer-platform-copy">
                              <span className={`composer-platform-name${selected ? ' composer-platform-name-selected' : ''}`}>{platform.name}</span>
                              <span className="composer-platform-status" style={{ color: connectionColor }}>{connectionLabel}</span>
                            </span>
                            <input
                              type="checkbox"
                              className="composer-platform-checkbox"
                              aria-label={`Select ${platform.name}`}
                              checked={selected}
                              disabled={disabled}
                              onChange={() => setSelectedComposerPlatforms((current) => selected ? current.filter((id) => id !== platform.id) : [...current, platform.id])}
                            />
                          </label>
                        );
                      })}
                    </div>
                    {isAdminCreate && selectedPlatformOptions.filter((platform) => ['disconnected', 'unavailable'].includes(platformConnections[platform.id])).map((platform) => (
                      <div key={platform.id} role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', marginTop: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#E7E1B1', fontSize: '0.84rem' }}>
                          <AlertCircle aria-hidden="true" style={{ width: '15px', height: '15px', flex: '0 0 15px', color: '#E7A4A4' }} />
                          Your {platform.name} account is not connected.{platform.id === 'FACEBOOK' ? ' Facebook connection is not available yet.' : ''}
                        </span>
                        <button type="button" onClick={() => { window.location.href = platform.connectUrl || '/dashboard/admin?tab=social'; }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: 0, border: 'none', background: 'transparent', color: '#B9E769', font: 'inherit', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                          <Link2 aria-hidden="true" style={{ width: '14px', height: '14px' }} />
                          Try to Connect
                        </button>
                      </div>
                    ))}
                  </section>

                  <div style={{ overflow: 'hidden', border: '1px solid rgba(185, 231, 105, 0.22)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.025)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid rgba(185, 231, 105, 0.16)' }}>
                      <label htmlFor="admin-post-content" style={{ color: '#B9E769', fontSize: '0.86rem', fontWeight: 700 }}>Content</label>
                      <span style={{ color: '#C9C19A', fontSize: '0.76rem' }}>{formData.content.length} characters</span>
                    </div>
                    <textarea
                      id="admin-post-content"
                      rows={5}
                      required
                      value={formData.content}
                      onChange={(event) => setFormData((current) => ({ ...current, content: event.target.value }))}
                      placeholder="What would you like to share?"
                      style={{ display: 'block', width: '100%', minHeight: '150px', padding: '16px', resize: 'vertical', border: 'none', outline: 'none', background: 'transparent', color: '#FBF5DD', font: 'inherit', fontSize: '0.95rem', lineHeight: 1.6 }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Publishing Destination</label>
                    <select
                      value={formData.targetPlatform}
                      onChange={(event) => setFormData({ ...formData, targetPlatform: event.target.value as 'LINKEDIN' | 'INSTAGRAM' })}
                      className="input-field invite-role-select"
                      style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                    >
                      <option value="LINKEDIN">LinkedIn</option>
                      <option value="INSTAGRAM">Instagram</option>
                    </select>
                  </div>

                  <div>
                    <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Content</label>
                    <textarea
                      rows={4}
                      required
                      value={formData.content}
                      onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                      placeholder="Write your social post content..."
                      className="input-field"
                      style={{ resize: 'vertical', background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                    />
                  </div>
                </>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0, color: '#B9E769', fontWeight: 700 }}>Attached Media ({attachedMedia.length})</label>
                  <button
                    type="button"
                    onClick={() => setShowMediaSelectorModal(true)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)' }}
                  >
                    <Paperclip style={{ width: '14px', height: '14px' }} /> Select or Upload Media
                  </button>
                </div>

                {attachedMedia.length === 0 ? (
                  <div
                    onClick={() => setShowMediaSelectorModal(true)}
                    style={{
                      border: '1px dashed rgba(185, 231, 105, 0.28)',
                      borderRadius: '10px',
                      padding: '16px',
                      textAlign: 'center',
                      color: '#C9C19A',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      background: 'rgba(48, 109, 41, 0.08)',
                    }}
                  >
                    No media attached yet. Click to attach images or videos from Cloudinary.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '8px' }}>
                    {attachedMedia.map((media) => (
                      <div key={media.id} style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#020617', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
                        {media.type === 'image' ? (
                          <img src={media.secureUrl || media.cloudinaryUrl} alt="media preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(48, 109, 41, 0.18)', color: '#B9E769' }}>
                            <Film style={{ width: '24px', height: '24px' }} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachedMedia(attachedMedia.filter((m) => m.id !== media.id))}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.75)',
                            border: 'none',
                            color: '#fca5a5',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isMultiPlatformCreate ? (
                <div className="composer-schedule-row">
                  <label className="composer-schedule-toggle">
                    <input type="checkbox" checked={schedulePost} onChange={(event) => setSchedulePost(event.target.checked)} style={{ width: '17px', height: '17px', accentColor: '#B9E769' }} />
                    Schedule Post
                  </label>
                  {schedulePost && (
                    <div className="composer-schedule-field">
                      <label className="input-label composer-schedule-label" style={{ color: '#B9E769', fontWeight: 700 }}>
                        <Calendar aria-hidden="true" style={{ width: '16px', height: '16px' }} />
                        Scheduled Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.scheduledAt}
                        onChange={(event) => setFormData((current) => ({ ...current, scheduledAt: event.target.value }))}
                        className="input-field composer-schedule-datetime"
                        style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD', colorScheme: 'dark' }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Post Status</label>
                    <select
                      value={formData.status}
                      onChange={(event) => setFormData({ ...formData, status: event.target.value as PostStatus })}
                      className="input-field invite-role-select"
                      style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                    >
                      <option value="DRAFT">DRAFT</option>
                      {userRole !== 'CREATOR' && <option value="APPROVED">APPROVED</option>}
                      {userRole !== 'CREATOR' && <option value="SCHEDULED">SCHEDULED</option>}
                      {userRole !== 'CREATOR' && <option value="QUEUED">QUEUED</option>}
                      {userRole !== 'CREATOR' && <option value="PROCESSING">PROCESSING</option>}
                      {userRole !== 'CREATOR' && <option value="PUBLISHED">PUBLISHED</option>}
                      {userRole !== 'CREATOR' && <option value="FAILED">FAILED</option>}
                    </select>
                  </div>

                  <div>
                    <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Scheduled Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(event) => setFormData({ ...formData, scheduledAt: event.target.value })}
                      className="input-field"
                      style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD', colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              )}

              {isMultiPlatformCreate && errorMsg && (
                <div role="alert" style={{ padding: '10px 12px', borderRadius: '8px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.24)', fontSize: '0.84rem' }}>
                  {errorMsg}
                </div>
              )}

              {isAdminCreate || isManagerCreate ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setShowCreateModal(false); setAttachedMedia([]); setErrorMsg(null); }} className="btn-secondary" style={{ color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={(event) => handleAdminComposerSubmit(event, 'DRAFT')} disabled={submitting} className="btn-secondary" style={{ color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.35)' }}>
                    <Save style={{ width: '16px', height: '16px' }} /> Save as Draft
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}>
                    {submitting && schedulePost ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : schedulePost ? <Clock style={{ width: '16px', height: '16px' }} /> : <Send style={{ width: '16px', height: '16px' }} />}
                    {schedulePost ? 'Schedule' : 'Publish'}
                  </button>
                </div>
              ) : isManagerCreate ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setShowCreateModal(false); setAttachedMedia([]); setErrorMsg(null); }} className="btn-secondary" style={{ color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)' }}>
                    Cancel
                  </button>
                  {formData.status === 'DRAFT' && (
                    <button type="button" onClick={(event) => handleAdminComposerSubmit(event, 'DRAFT')} disabled={submitting} className="btn-secondary" style={{ color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.35)' }}>
                      <Save style={{ width: '16px', height: '16px' }} /> Save as Draft
                    </button>
                  )}
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}>
                    {submitting ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : schedulePost ? <Clock style={{ width: '16px', height: '16px' }} /> : <Send style={{ width: '16px', height: '16px' }} />}
                    {schedulePost ? 'Schedule' : 'Publish'}
                  </button>
                </div>
              ) : isCreatorCreate ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { setShowCreateModal(false); setAttachedMedia([]); setErrorMsg(null); }} className="btn-secondary" style={{ color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}>
                    {submitting ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : <Send style={{ width: '16px', height: '16px' }} />}
                    Submit for Review
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setEditingPost(null); setAttachedMedia([]); }}
                    className="btn-secondary"
                    style={{ background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)', color: '#E7E1B1' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={(event) => handleSubmitPost(event, 'DRAFT')}
                    disabled={submitting}
                    className="btn-secondary"
                    style={{ borderColor: 'rgba(185, 231, 105, 0.35)', color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)' }}
                  >
                    <Save style={{ width: '16px', height: '16px' }} /> Save as Draft
                  </button>

                  {userRole === 'CREATOR' && (
                    <button
                      type="button"
                      onClick={(event) => handleSubmitPost(event, 'PENDING_REVIEW')}
                      disabled={submitting}
                      className="btn-primary"
                      style={{ background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}
                    >
                      <Send style={{ width: '16px', height: '16px' }} /> Submit for Review
                    </button>
                  )}

                  {userRole !== 'CREATOR' && <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        Saving...
                      </>
                    ) : editingPost ? (
                      'Update Post'
                    ) : (
                      'Publish / Schedule Post'
                    )}
                  </button>}

                  {userRole === 'ADMIN' && <button
                    type="button"
                    onClick={(event) => handleSubmitPost(event, editingPost ? formData.status : 'DRAFT', true)}
                    disabled={submitting}
                    className="btn-primary"
                  >
                    {submitting ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : <Send style={{ width: '16px', height: '16px' }} />}
                    Publish to {formData.targetPlatform === 'INSTAGRAM' ? 'Instagram' : 'LinkedIn'}
                  </button>}
                </div>
              )}
            </form>
          </div>
          {(isAdminCreate || isManagerCreate) && directPublishStatus && (
            <div className="direct-publish-status-overlay" role="status" aria-live="polite">
              <div className={`direct-publish-status-content${directPublishStatus === 'success' ? ' direct-publish-status-success' : ''}`}>
                <div className="direct-publish-status-icon">
                  {directPublishStatus === 'publishing' ? (
                    <Loader2 aria-hidden="true" className="direct-publish-spinner" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="direct-publish-check" />
                  )}
                </div>
                <p className="direct-publish-status-message">
                  {directPublishStatus === 'publishing' ? 'Publishing your post...' : 'Your post uploaded successfully'}
                </p>
              </div>
            </div>
          )}
        </div>
      , document.body)}

      {/* MEDIA SELECTOR MODAL */}
      {typeof document !== 'undefined' && showMediaSelectorModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '900px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip style={{ color: '#818cf8', width: '22px', height: '22px' }} />
                Select Media from Workspace Library
              </h3>
              <button onClick={() => setShowMediaSelectorModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X style={{ width: '22px', height: '22px' }} />
              </button>
            </div>

            <MediaLibrary
              selectable={true}
              selectedMediaIds={attachedMedia.map((m) => m.id)}
              onSelectMedia={(selected) => setAttachedMedia(selected)}
              userRole={userRole}
              currentUserId={currentUserId}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setShowMediaSelectorModal(false)}
                className="btn-primary"
              >
                Done ({attachedMedia.length} Selected)
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* VIEW POST DETAILS MODAL */}
      {viewingPost && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '640px', width: '100%', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye style={{ color: '#B9E769', width: '22px', height: '22px' }} />
                <h3 style={{ fontSize: '1.3rem', color: '#F9F2DA' }}>Post Details</h3>
              </div>
              <button onClick={() => setViewingPost(null)} style={{ background: 'none', border: 'none', color: '#C9C19A', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {renderStatusBadge(viewingPost.status)}
                <span style={{ fontSize: '0.78rem', color: '#8C8A78' }}>
                  ID: <code style={{ color: '#B9E769' }}>{viewingPost.id}</code>
                </span>
              </div>

              <div style={{ background: 'rgba(11, 28, 16, 0.72)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(185, 231, 105, 0.14)', color: '#F9F2DA', fontSize: '1rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {viewingPost.content}
              </div>

              {viewingPost.status === 'REJECTED' && viewingPost.rejectionFeedback && (
                <div style={{ background: 'rgba(127, 29, 29, 0.18)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#fecaca' }}>
                  <strong>Manager feedback</strong>
                  <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{viewingPost.rejectionFeedback}</div>
                </div>
              )}

              {viewingPost.publishingError && (
                <div style={{ background: 'rgba(127, 29, 29, 0.18)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#fecaca' }} role="alert">
                  <strong>Publishing error</strong>
                  <div style={{ marginTop: '6px', whiteSpace: 'pre-wrap' }}>{viewingPost.publishingError}</div>
                </div>
              )}

              {viewingPost.media && viewingPost.media.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#C9C19A', marginBottom: '10px' }}>Attached Media Assets ({viewingPost.media.length})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                    {viewingPost.media.map((mItem, idx) => (
                      <a
                        key={idx}
                        href={mItem.secureUrl || mItem.cloudinaryUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', background: '#020A04', border: '1px solid rgba(185, 231, 105, 0.18)', height: '90px', position: 'relative' }}
                      >
                        {mItem.type === 'image' ? (
                          <img src={mItem.secureUrl || mItem.cloudinaryUrl} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(48, 109, 41, 0.2)', color: '#B9E769' }}>
                            <Film style={{ width: '28px', height: '28px' }} />
                            <span style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: 600 }}>VIDEO</span>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(11, 28, 16, 0.58)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(185, 231, 105, 0.1)' }}>
                <div>
                  <span style={{ color: '#8C8A78', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>AUTHOR</span>
                  <span style={{ color: '#F9F2DA', fontSize: '0.88rem', fontWeight: 600 }}>{viewingPost.author?.name || 'Unknown'}</span>
                  <span style={{ color: '#C9C19A', fontSize: '0.78rem', display: 'block' }}>{viewingPost.author?.email}</span>
                </div>

                <div>
                  <span style={{ color: '#8C8A78', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>CREATED AT</span>
                  <span style={{ color: '#E7E1B1', fontSize: '0.85rem' }}>{new Date(viewingPost.createdAt).toLocaleString()}</span>
                </div>

                {viewingPost.scheduledAt && (
                  <div>
                    <span style={{ color: '#8C8A78', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>SCHEDULED FOR</span>
                    <span style={{ color: '#B9E769', fontSize: '0.85rem' }}>{new Date(viewingPost.scheduledAt).toLocaleString()}</span>
                  </div>
                )}

                {viewingPost.publishedAt && (
                  <div>
                    <span style={{ color: '#8C8A78', fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>PUBLISHED AT</span>
                    <span style={{ color: '#8BD48A', fontSize: '0.85rem' }}>{new Date(viewingPost.publishedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => setViewingPost(null)}
                  className="btn-secondary"
                  style={{ background: 'rgba(48, 109, 41, 0.16)', borderColor: 'rgba(185, 231, 105, 0.32)', color: '#E7E1B1' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPostId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#f87171' }}>
              <AlertCircle style={{ width: '24px', height: '24px' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#f87171' }}>Confirm Post Deletion</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeletingPostId(null)}
                className="btn-secondary"
                style={{ background: 'rgba(48, 109, 41, 0.16)', borderColor: 'rgba(185, 231, 105, 0.32)', color: '#E7E1B1' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePost(deletingPostId)}
                disabled={submitting}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
              >
                {submitting ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
