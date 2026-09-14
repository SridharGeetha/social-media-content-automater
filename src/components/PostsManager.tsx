'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit3,
  Trash2,
  Eye,
  Calendar,
  Layers,
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

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';

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
  mediaIds: string[];
  media?: MediaItem[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PostsManagerProps {
  userRole?: 'ADMIN' | 'MANAGER' | 'CREATOR';
  currentUserId?: string;
}

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Queued', value: 'QUEUED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Failed', value: 'FAILED' },
];

export default function PostsManager({ userRole, currentUserId }: PostsManagerProps) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [viewingPost, setViewingPost] = useState<PostItem | null>(null);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showMediaSelectorModal, setShowMediaSelectorModal] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    content: '',
    status: 'DRAFT' as PostStatus,
    scheduledAt: '',
  });
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

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
  const openCreateModal = (defaultStatus: PostStatus = 'DRAFT') => {
    setFormData({
      content: '',
      status: defaultStatus,
      scheduledAt: '',
    });
    setAttachedMedia([]);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = (post: PostItem) => {
    let schedDate = '';
    if (post.scheduledAt) {
      try {
        const d = new Date(post.scheduledAt);
        schedDate = d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      } catch (e) {
        console.error(e);
      }
    }

    setFormData({
      content: post.content,
      status: post.status,
      scheduledAt: schedDate,
    });
    setAttachedMedia(post.media || []);
    setEditingPost(post);
  };

  // Handle Submit (Create / Edit)
  const handleSubmitPost = async (e: React.FormEvent, forceStatus?: PostStatus, publishToLinkedIn = false) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    const targetStatus = forceStatus || formData.status;
    const mediaIdsArray = attachedMedia.map((m) => m.id);

    const payload = {
      content: formData.content.trim(),
      mediaIds: mediaIdsArray,
      status: targetStatus,
      scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
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
        if (publishToLinkedIn) {
          const publishResponse = await fetch(`/api/posts/${data.post.id}/linkedin`, { method: 'POST' });
          const publishData = await publishResponse.json();
          if (!publishResponse.ok) throw new Error(publishData.error || 'Failed to publish post to LinkedIn.');
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

  const handlePublishToLinkedIn = async (post: PostItem) => {
    setPublishingPostId(post.id);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/posts/${post.id}/linkedin`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to publish post to LinkedIn.');
      await fetchPosts();
    } catch (reason: unknown) {
      setErrorMsg(reason instanceof Error ? reason.message : 'Failed to publish post to LinkedIn.');
    } finally {
      setPublishingPostId(null);
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)' }}>
            <FileText style={{ width: '12px', height: '12px' }} /> DRAFT
          </span>
        );
      case 'SCHEDULED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Clock style={{ width: '12px', height: '12px' }} /> SCHEDULED
          </span>
        );
      case 'QUEUED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
            <Layers style={{ width: '12px', height: '12px' }} /> QUEUED
          </span>
        );
      case 'PROCESSING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" /> PROCESSING
          </span>
        );
      case 'PUBLISHED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 style={{ width: '12px', height: '12px' }} /> PUBLISHED
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle style={{ width: '12px', height: '12px' }} /> FAILED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action & Summary Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBF5DD', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText style={{ color: '#B9E769', width: '26px', height: '26px' }} />
            Posts Management
          </h2>
          <p style={{ color: '#C9C19A', fontSize: '0.88rem', marginTop: '4px' }}>
            Create, view, schedule, and attach media to social posts for your workspace.
            {userRole === 'CREATOR' && <span style={{ color: '#8BD48A', marginLeft: '6px', fontWeight: 600 }}>(Viewing & managing your posts)</span>}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => openCreateModal('DRAFT')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.35)', color: '#E7E1B1' }}>
            <Save style={{ width: '16px', height: '16px' }} /> Save Draft
          </button>

          <button onClick={() => openCreateModal('SCHEDULED')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}>
            <Plus style={{ width: '18px', height: '18px' }} /> Create Post
          </button>
        </div>
      </div>

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px', borderBottom: '1px solid rgba(185, 231, 105, 0.14)' }}>
        <span style={{ color: '#B9E769', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <Filter style={{ width: '14px', height: '14px' }} /> Filter:
        </span>
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(48, 109, 41, 0.95) 0%, rgba(13, 83, 14, 0.95) 100%)' : 'rgba(15, 23, 42, 0.38)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: isActive ? 'rgba(185, 231, 105, 0.4)' : 'rgba(185, 231, 105, 0.12)',
                color: isActive ? '#FBF5DD' : '#C9C19A',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
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
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
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
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', background: 'rgba(16, 24, 12, 0.82)', border: '1px solid rgba(185, 231, 105, 0.18)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(185, 231, 105, 0.16)', backgroundColor: 'rgba(48, 109, 41, 0.12)', color: '#B9E769', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th style={{ padding: '16px 20px' }}>Post Content & Media</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Author</th>
                  <th style={{ padding: '16px 20px' }}>Schedule / Created</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const isOwnerOrManage = userRole === 'ADMIN' || userRole === 'MANAGER' || (currentUserId && post.createdBy === currentUserId);
                  const mediaCount = (post.media && post.media.length) || (post.mediaIds && post.mediaIds.length) || 0;

                  return (
                    <tr
                      key={post.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '16px 20px', maxWidth: '360px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>
                          {post.content}
                        </div>
                        {mediaCount > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {post.media && post.media.length > 0 ? (
                              post.media.slice(0, 3).map((mItem, idx) => (
                                <div key={idx} style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                                  {mItem.type === 'image' ? (
                                    <img src={mItem.secureUrl || mItem.cloudinaryUrl} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                                      <Film style={{ width: '18px', height: '18px' }} />
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontSize: '0.78rem' }}>
                                <ImageIcon style={{ width: '13px', height: '13px' }} />
                                <span>{mediaCount} media attachment{mediaCount > 1 ? 's' : ''}</span>
                              </div>
                            )}
                            {post.media && post.media.length > 3 && (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>+{post.media.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px' }}>{renderStatusBadge(post.status)}</td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontSize: '0.75rem', fontWeight: 700 }}>
                            {post.author?.name ? post.author.name.charAt(0).toUpperCase() : <UserIcon style={{ width: '14px', height: '14px' }} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>{post.author?.name || 'Unknown User'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{post.author?.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.82rem' }}>
                        {post.status === 'SCHEDULED' && post.scheduledAt ? (
                          <div style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock style={{ width: '13px', height: '13px' }} />
                            {new Date(post.scheduledAt).toLocaleString()}
                          </div>
                        ) : post.status === 'PUBLISHED' && post.publishedAt ? (
                          <div style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 style={{ width: '13px', height: '13px' }} />
                            {new Date(post.publishedAt).toLocaleString()}
                          </div>
                        ) : (
                          <div>{new Date(post.createdAt).toLocaleDateString()}</div>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setViewingPost(post)}
                            title="View Details"
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)', color: '#E7E1B1' }}
                          >
                            <Eye style={{ width: '14px', height: '14px' }} />
                          </button>

                          {isOwnerOrManage && (
                            <>
                              {post.status !== 'PUBLISHED' && (userRole === 'ADMIN' || userRole === 'CREATOR') && (
                                <button
                                  onClick={() => handlePublishToLinkedIn(post)}
                                  disabled={publishingPostId === post.id}
                                  title="Publish to LinkedIn"
                                  className="btn-primary"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #306D29 0%, #0D530E 100%)' }}
                                >
                                  {publishingPostId === post.id ? <Loader2 className="animate-spin" style={{ width: '14px', height: '14px' }} /> : <Send style={{ width: '14px', height: '14px' }} />}
                                  Publish to LinkedIn
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(post)}
                                title="Edit Post"
                                className="btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'rgba(48, 109, 41, 0.12)', borderColor: 'rgba(185, 231, 105, 0.28)', color: '#E7E1B1' }}
                              >
                                <Edit3 style={{ width: '14px', height: '14px' }} />
                              </button>

                              <button
                                onClick={() => setDeletingPostId(post.id)}
                                title="Delete Post"
                                className="btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#fca5a5', background: 'rgba(127, 29, 29, 0.18)', borderColor: 'rgba(248, 113, 113, 0.3)' }}
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
      {(showCreateModal || editingPost) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-panel animate-fade-in" style={{ maxWidth: '680px', width: '100%', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
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
              Draft a post, attach media, set its status, and schedule it for the right publishing moment.
            </p>

            <form onSubmit={(e) => handleSubmitPost(e)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Post Copy / Content</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your social post content..."
                  className="input-field"
                  style={{ resize: 'vertical', background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                />
              </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Post Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as PostStatus })}
                    className="input-field invite-role-select"
                    style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD' }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="QUEUED">QUEUED</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                <div>
                  <label className="input-label" style={{ color: '#B9E769', fontWeight: 700 }}>Scheduled Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="input-field"
                    style={{ background: 'rgba(255, 255, 255, 0.035)', borderColor: 'rgba(231, 225, 177, 0.3)', color: '#FBF5DD', colorScheme: 'dark' }}
                  />
                </div>
              </div>

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
                  onClick={(e) => handleSubmitPost(e, 'DRAFT')}
                  disabled={submitting}
                  className="btn-secondary"
                  style={{ borderColor: 'rgba(185, 231, 105, 0.35)', color: '#E7E1B1', background: 'rgba(48, 109, 41, 0.12)' }}
                >
                  <Save style={{ width: '16px', height: '16px' }} /> Save as Draft
                </button>

                <button
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
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmitPost(e, editingPost ? formData.status : 'DRAFT', true)}
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} /> : <Send style={{ width: '16px', height: '16px' }} />}
                  Publish to LinkedIn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA SELECTOR MODAL */}
      {showMediaSelectorModal && (
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
      )}

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
