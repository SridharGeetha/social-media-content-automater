'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  Eye,
  Check,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Copy,
  Info,
  Maximize2,
  Filter,
} from 'lucide-react';

export interface MediaItem {
  id: string;
  workspaceId: string;
  uploadedBy: {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
  } | string;
  type: 'image' | 'video';
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  secureUrl: string;
  format?: string;
  width?: number;
  height?: number;
  duration?: number | null;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

interface MediaLibraryProps {
  userRole?: 'ADMIN' | 'MANAGER' | 'CREATOR';
  currentUserId?: string;
  selectable?: boolean;
  selectedMediaIds?: string[];
  onSelectMedia?: (selectedItems: MediaItem[]) => void;
}

export default function MediaLibrary({
  userRole = 'CREATOR',
  currentUserId,
  selectable = false,
  selectedMediaIds = [],
  onSelectMedia,
}: MediaLibraryProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal / Preview state
  const [activePreviewMedia, setActivePreviewMedia] = useState<MediaItem | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected media state for picker mode
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedMediaIds);

  useEffect(() => {
    setLocalSelectedIds(selectedMediaIds);
  }, [selectedMediaIds]);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const url = filterType === 'all' ? '/api/media' : `/api/media?type=${filterType}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch media assets.');
      }
      const data = await res.json();
      setMediaList(data.media || []);
    } catch (err: unknown) {
      console.error('Fetch Media Error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Error loading media assets.');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Client-Side File Validation
  const validateAndUploadFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const mimeType = file.type.toLowerCase();
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'].includes(mimeType);
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'].includes(mimeType);

    if (!isImage && !isVideo) {
      setErrorMsg('Invalid file format. Only images (JPG, PNG, GIF, WEBP) and videos (MP4, WebM, MOV, AVI) are supported.');
      return;
    }

    const maxLimit = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxLimit) {
      const limitMb = isImage ? 10 : 50;
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${limitMb}MB for ${isImage ? 'images' : 'videos'}.`);
      return;
    }

    // Perform Upload
    setUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(50);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed.');
      }

      setUploadProgress(100);
      setSuccessMsg(`File "${file.name}" uploaded successfully!`);
      fetchMedia();

      if (selectable && onSelectMedia && data.media) {
        const updatedSelected = [...localSelectedIds, data.media.id];
        setLocalSelectedIds(updatedSelected);
        const selectedObjects = [...mediaList, data.media].filter((m) => updatedSelected.includes(m.id));
        onSelectMedia(selectedObjects);
      }
    } catch (err: unknown) {
      console.error('Upload Error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Media upload failed.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUploadFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async () => {
    if (!deletingMedia) return;

    setDeleteLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/media/${deletingMedia.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete media asset.');
      }

      setSuccessMsg('Media asset deleted successfully from Cloudinary and database.');
      setMediaList((prev) => prev.filter((m) => m.id !== deletingMedia.id));

      if (localSelectedIds.includes(deletingMedia.id)) {
        const updated = localSelectedIds.filter((id) => id !== deletingMedia.id);
        setLocalSelectedIds(updated);
        if (onSelectMedia) {
          onSelectMedia(mediaList.filter((m) => updated.includes(m.id)));
        }
      }

      setDeletingMedia(null);
    } catch (err: unknown) {
      console.error('Delete Media Error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete media asset.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSelectMedia = (item: MediaItem) => {
    if (!selectable) return;

    let updated: string[];
    if (localSelectedIds.includes(item.id)) {
      updated = localSelectedIds.filter((id) => id !== item.id);
    } else {
      updated = [...localSelectedIds, item.id];
    }
    setLocalSelectedIds(updated);

    if (onSelectMedia) {
      const selectedObjects = mediaList.filter((m) => updated.includes(m.id));
      onSelectMedia(selectedObjects);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getUploaderName = (uploader: MediaItem['uploadedBy']) => {
    if (typeof uploader === 'object' && uploader !== null) {
      return uploader.name || uploader.email || 'Workspace Member';
    }
    return 'Workspace Member';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header Banner */}
      {!selectable && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Film style={{ color: '#818cf8', width: '24px', height: '24px' }} />
              Workspace Media Library
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              Securely store and manage Cloudinary media assets isolated for your workspace.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
          >
            {uploading ? (
              <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
            ) : (
              <Upload style={{ width: '18px', height: '18px' }} />
            )}
            Upload Media
          </button>
        </div>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#86efac',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Check style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#86efac', cursor: 'pointer' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      )}

      {/* Drop Zone / Upload Box */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/x-msvideo"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: isDragOver
            ? '2px dashed #818cf8'
            : '2px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '14px',
          padding: '28px',
          textAlign: 'center',
          background: isDragOver ? 'rgba(99, 102, 241, 0.1)' : 'rgba(15, 23, 42, 0.4)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#818cf8' }} />
            <p style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem' }}>Uploading to Cloudinary...</p>
            <div style={{ width: '200px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Upload style={{ width: '28px', height: '28px', color: '#818cf8', marginBottom: '4px' }} />
            <p style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem' }}>
              Drag & drop images or videos here, or <span style={{ color: '#818cf8', textDecoration: 'underline' }}>browse</span>
            </p>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Supported: JPG, PNG, GIF, WEBP (Max 10MB) &bull; MP4, WebM, MOV, AVI (Max 50MB)
            </p>
          </div>
        )}
      </div>

      {/* Filter Tabs & Media Grid */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filterType === 'all' ? '#6366f1' : 'transparent',
              color: filterType === 'all' ? '#fff' : '#94a3b8',
            }}
          >
            All Media
          </button>
          <button
            onClick={() => setFilterType('image')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: filterType === 'image' ? '#6366f1' : 'transparent',
              color: filterType === 'image' ? '#fff' : '#94a3b8',
            }}
          >
            <ImageIcon style={{ width: '14px', height: '14px' }} />
            Images
          </button>
          <button
            onClick={() => setFilterType('video')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: filterType === 'video' ? '#6366f1' : 'transparent',
              color: filterType === 'video' ? '#fff' : '#94a3b8',
            }}
          >
            <Film style={{ width: '14px', height: '14px' }} />
            Videos
          </button>
        </div>

        <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
          {mediaList.length} asset{mediaList.length === 1 ? '' : 's'} total
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '16px' }}>
          <Loader2 className="animate-spin" style={{ width: '32px', height: '32px', color: '#818cf8', margin: '0 auto 16px auto' }} />
          <p style={{ color: '#94a3b8' }}>Loading workspace media library...</p>
        </div>
      ) : mediaList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '16px' }}>
          <ImageIcon style={{ width: '48px', height: '48px', color: '#475569', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>No media assets found</h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '6px', maxWidth: '400px', margin: '6px auto 0 auto' }}>
            Upload images or videos to your workspace library to attach them to your social media posts.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {mediaList.map((item) => {
            const isSelected = localSelectedIds.includes(item.id);
            const isOwner = typeof item.uploadedBy === 'object' && item.uploadedBy?.id === currentUserId;
            const canDelete = userRole === 'ADMIN' || userRole === 'MANAGER' || (userRole === 'CREATOR' && isOwner);

            return (
              <div
                key={item.id}
                onClick={() => selectable && toggleSelectMedia(item)}
                style={{
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: isSelected
                    ? '2px solid #818cf8'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.4)' : 'none',
                  cursor: selectable ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Media Preview Box */}
                <div style={{ position: 'relative', width: '100%', height: '150px', background: '#020617', overflow: 'hidden' }}>
                  {item.type === 'image' ? (
                    <img
                      src={item.secureUrl || item.cloudinaryUrl}
                      alt={item.cloudinaryPublicId}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video
                        src={item.secureUrl || item.cloudinaryUrl}
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Film style={{ width: '32px', height: '32px', color: '#fff', opacity: 0.9 }} />
                      </div>
                    </div>
                  )}

                  {/* Type & Format Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#f8fafc',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {item.type === 'video' ? <Film style={{ width: '12px', height: '12px', color: '#818cf8' }} /> : <ImageIcon style={{ width: '12px', height: '12px', color: '#818cf8' }} />}
                    {item.format || item.type}
                  </span>

                  {/* Duration Badge for Videos */}
                  {item.type === 'video' && item.duration && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: '#f8fafc',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    >
                      {formatDuration(item.duration)}
                    </span>
                  )}

                  {/* Select Checkbox (if in picker mode) */}
                  {selectable && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isSelected ? '#6366f1' : 'rgba(0,0,0,0.6)',
                        border: '2px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      {isSelected && <Check style={{ width: '14px', height: '14px' }} />}
                    </div>
                  )}
                </div>

                {/* Info Bar */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>
                      {formatBytes(item.fileSize)}
                    </span>
                    {item.width && item.height && (
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                        {item.width}x{item.height}
                      </span>
                    )}
                  </div>

                  <div style={{ color: '#e2e8f0', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    By {getUploaderName(item.uploadedBy)}
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePreviewMedia(item);
                      }}
                      title="View Details"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#818cf8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      <Eye style={{ width: '14px', height: '14px' }} />
                      Details
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(item.secureUrl, item.id);
                      }}
                      title="Copy Direct URL"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedId === item.id ? '#4ade80' : '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {copiedId === item.id ? <Check style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                    </button>

                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingMedia(item);
                        }}
                        title="Delete Media"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW / DETAILS MODAL */}
      {activePreviewMedia && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setActivePreviewMedia(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '750px',
              width: '100%',
              borderRadius: '20px',
              padding: '24px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info style={{ color: '#818cf8', width: '20px', height: '20px' }} />
                Media Asset Details
              </h3>
              <button
                onClick={() => setActivePreviewMedia(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X style={{ width: '22px', height: '22px' }} />
              </button>
            </div>

            {/* Media Player / Image Display */}
            <div style={{ width: '100%', maxHeight: '350px', background: '#020617', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activePreviewMedia.type === 'image' ? (
                <img
                  src={activePreviewMedia.secureUrl || activePreviewMedia.cloudinaryUrl}
                  alt={activePreviewMedia.cloudinaryPublicId}
                  style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain' }}
                />
              ) : (
                <video
                  src={activePreviewMedia.secureUrl || activePreviewMedia.cloudinaryUrl}
                  controls
                  autoPlay
                  style={{ maxWidth: '100%', maxHeight: '350px' }}
                />
              )}
            </div>

            {/* Metadata Table */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Type</span>
                <span style={{ color: '#f8fafc', fontWeight: 600, textTransform: 'capitalize' }}>{activePreviewMedia.type}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Format</span>
                <span style={{ color: '#f8fafc', fontWeight: 600, textTransform: 'uppercase' }}>{activePreviewMedia.format || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>File Size</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatBytes(activePreviewMedia.fileSize)}</span>
              </div>
              {activePreviewMedia.width && (
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Dimensions</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{activePreviewMedia.width} x {activePreviewMedia.height} px</span>
                </div>
              )}
              {activePreviewMedia.duration && (
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Duration</span>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatDuration(activePreviewMedia.duration)}</span>
                </div>
              )}
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Uploaded By</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{getUploaderName(activePreviewMedia.uploadedBy)}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block' }}>Upload Date</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{new Date(activePreviewMedia.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Cloudinary Public ID</span>
                <code style={{ background: 'rgba(0,0,0,0.4)', color: '#818cf8', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                  {activePreviewMedia.cloudinaryPublicId}
                </code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => copyToClipboard(activePreviewMedia.secureUrl, activePreviewMedia.id)}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                {copiedId === activePreviewMedia.id ? 'URL Copied!' : 'Copy Secure URL'}
              </button>
              <button onClick={() => setActivePreviewMedia(null)} className="btn-primary" style={{ fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMedia && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => !deleteLoading && setDeletingMedia(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '460px',
              width: '100%',
              borderRadius: '16px',
              padding: '24px',
              background: '#0f172a',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171' }}>
              <AlertCircle style={{ width: '24px', height: '24px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>Delete Media Asset?</h3>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Are you sure you want to delete this media asset? This action will permanently remove the asset from Cloudinary and database references.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setDeletingMedia(null)}
                disabled={deleteLoading}
                className="btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {deleteLoading && <Loader2 className="animate-spin" style={{ width: '16px', height: '16px' }} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
