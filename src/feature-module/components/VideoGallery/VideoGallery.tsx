import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import './VideoGallery.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
type SourceType = 'upload' | 'youtube';

interface VideoEntry {
  _id: string;
  title: string;
  description: string;
  date: string | null;
  grade: string;
  sourceType: SourceType;
  videoUrl: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  isActive: boolean;
  createdAt: string;
}

interface UploadFormState {
  title: string;
  description: string;
  date: string;
  grade: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function youtubeThumb(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`;
}

function youtubeThumbFallback(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

// ─── Single video tile ────────────────────────────────────────────────────────
interface VideoTileProps {
  video: VideoEntry;
  isExpanded: boolean;
  onExpand: (id: string) => void;
  onCollapse: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onUpdateMeta: (id: string, meta: Partial<UploadFormState>) => void;
  onDuration: (id: string, duration: number) => void;
}

const VideoTile: React.FC<VideoTileProps> = ({
  video,
  isExpanded,
  onExpand,
  onCollapse,
  isAdmin,
  onDelete,
  onUpdateMeta,
  onDuration,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(video.duration || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editForm, setEditForm] = useState<UploadFormState>({
    title: video.title,
    description: video.description,
    date: video.date ? new Date(video.date).toISOString().split('T')[0] : '',
    grade: video.grade,
  });

  const isYouTube = video.sourceType === 'youtube';

  useEffect(() => {
    const tile = tileRef.current;
    if (!tile) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.25, rootMargin: '100px' },
    );
    observer.observe(tile);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isYouTube) return;
    const vid = videoRef.current;
    if (!vid || !isLoaded) return;

    if (isVisible || isExpanded) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isVisible, isLoaded, isExpanded, isYouTube]);

  useEffect(() => {
    if (!isExpanded) setIsEditing(false);
  }, [isExpanded]);

  useEffect(() => {
    if (!isEditing) {
      setEditForm({
        title: video.title,
        description: video.description,
        date: video.date
          ? new Date(video.date).toISOString().split('T')[0]
          : '',
        grade: video.grade,
      });
    }
  }, [video.title, video.description, video.date, video.grade, isEditing]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setIsLoaded(true);
      if (dur && Math.round(dur) !== video.duration) {
        onDuration(video._id, Math.round(dur));
      }
    }
  }, [video._id, video.duration, onDuration]);

  const handleEditSave = useCallback(async () => {
    await onUpdateMeta(video._id, editForm);
    setIsEditing(false);
  }, [video._id, editForm, onUpdateMeta]);

  const hasOverlay =
    video.title || video.description || video.date || video.grade;
  const thumb = isYouTube
    ? thumbFailed
      ? youtubeThumbFallback(video.youtubeId)
      : video.thumbnailUrl || youtubeThumb(video.youtubeId)
    : '';

  return (
    <div
      ref={tileRef}
      className={`vg-tile ${isExpanded ? 'vg-tile--expanded' : ''} ${isYouTube ? 'vg-tile--youtube' : ''}`}
      data-id={video._id}
    >
      <div
        className='vg-tile__card'
        onClick={() => !isExpanded && onExpand(video._id)}
        onMouseLeave={() => confirmingDelete && setConfirmingDelete(false)}
        role='button'
        tabIndex={0}
        onKeyDown={(e) =>
          e.key === 'Enter' && !isExpanded && onExpand(video._id)
        }
        aria-expanded={isExpanded}
        aria-label={video.title || (isYouTube ? 'YouTube video' : 'Video clip')}
      >
        {!isExpanded && (
          <>
            {isYouTube ? (
              <>
                {isVisible || isExpanded ? (
                  <iframe
                    className='vg-tile__yt-bg'
                    src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${video.youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
                    title={video.title || 'YouTube video'}
                    frameBorder='0'
                    allow='autoplay; encrypted-media'
                    onLoad={() => setIsLoaded(true)}
                  />
                ) : (
                  <img
                    src={thumb}
                    alt=''
                    className='vg-tile__thumb'
                    loading='lazy'
                    onLoad={() => setIsLoaded(true)}
                    onError={() => {
                      if (!thumbFailed) setThumbFailed(true);
                      else setIsLoaded(true);
                    }}
                  />
                )}
              </>
            ) : (
              <video
                ref={videoRef}
                src={isVisible ? video.videoUrl : undefined}
                className='vg-tile__video'
                muted
                loop
                playsInline
                preload='metadata'
                onLoadedMetadata={handleLoadedMetadata}
                onError={() => setIsLoaded(false)}
              />
            )}

            {!isLoaded && (
              <div className='vg-tile__shimmer' aria-hidden='true' />
            )}

            {isYouTube && (
              <span className='vg-tile__yt-badge' aria-hidden='true'>
                <svg
                  width='14'
                  height='10'
                  viewBox='0 0 28 20'
                  fill='currentColor'
                >
                  <path d='M27.4 3.1c-.3-1.2-1.3-2.1-2.5-2.5C22.7 0 14 0 14 0S5.3 0 3.1.6C1.9 1 .9 1.9.6 3.1 0 5.3 0 10 0 10s0 4.7.6 6.9c.3 1.2 1.3 2.1 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6c1.2-.3 2.1-1.3 2.5-2.5.6-2.2.6-6.9.6-6.9s0-4.7-.6-6.9z' />
                  <path d='M11 14.5v-9l8 4.5z' fill='#fff' />
                </svg>
                YouTube
              </span>
            )}

            {hasOverlay && (
              <div className='vg-tile__overlay' aria-hidden='true'>
                {video.grade && (
                  <span className='vg-tile__grade'>{video.grade}</span>
                )}
                {video.title && <p className='vg-tile__title'>{video.title}</p>}
                <div className='vg-tile__meta-row'>
                  {video.date && (
                    <span className='vg-tile__date'>
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <rect x='3' y='4' width='18' height='18' rx='2' />
                        <line x1='16' y1='2' x2='16' y2='6' />
                        <line x1='8' y1='2' x2='8' y2='6' />
                        <line x1='3' y1='10' x2='21' y2='10' />
                      </svg>
                      {formatDate(video.date)}
                    </span>
                  )}
                  {duration > 0 && !isYouTube && (
                    <span className='vg-tile__dur'>
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>
                {video.description && (
                  <p className='vg-tile__desc'>{video.description}</p>
                )}
              </div>
            )}

            <div className='vg-tile__play-hint' aria-hidden='true'>
              <svg
                width='28'
                height='28'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M8 5v14l11-7z' />
              </svg>
            </div>

            {isAdmin && (
              <div
                className='vg-tile__admin-btns'
                role='group'
                aria-label='Video actions'
              >
                {confirmingDelete ? (
                  <div
                    className='vg-tile__confirm-del'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className='vg-tile__confirm-del-label'>Delete?</span>
                    <button
                      className='vg-tile__confirm-del-btn vg-tile__confirm-del-btn--yes'
                      onClick={() => onDelete(video._id)}
                      title='Confirm delete'
                    >
                      <svg
                        width='13'
                        height='13'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.5'
                      >
                        <polyline points='20 6 9 17 4 12' />
                      </svg>
                    </button>
                    <button
                      className='vg-tile__confirm-del-btn vg-tile__confirm-del-btn--no'
                      onClick={() => setConfirmingDelete(false)}
                      title='Cancel'
                    >
                      <svg
                        width='13'
                        height='13'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.5'
                      >
                        <path d='M18 6L6 18M6 6l12 12' />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className='vg-tile__admin-btn vg-tile__admin-btn--edit'
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                        onExpand(video._id);
                      }}
                      title='Edit metadata'
                    >
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                    </button>
                    <button
                      className='vg-tile__admin-btn vg-tile__admin-btn--del'
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingDelete(true);
                      }}
                      title='Delete video'
                    >
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <polyline points='3 6 5 6 21 6' />
                        <path d='M19 6l-1 14H6L5 6' />
                        <path d='M10 11v6M14 11v6' />
                        <path d='M9 6V4h6v2' />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {isExpanded && (
          <div className='vg-tile__expanded-inner'>
            <div className='vg-tile__player-wrap'>
              {isYouTube ? (
                <iframe
                  className='vg-tile__player vg-tile__player--yt'
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
                  title={video.title || 'YouTube video'}
                  frameBorder='0'
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                  allowFullScreen
                />
              ) : (
                <video
                  src={video.videoUrl}
                  className='vg-tile__player'
                  controls
                  autoPlay
                  playsInline
                  preload='auto'
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (dur && Math.round(dur) !== video.duration) {
                      onDuration(video._id, Math.round(dur));
                    }
                  }}
                />
              )}

              <button
                className='vg-tile__close'
                onClick={(e) => {
                  e.stopPropagation();
                  onCollapse();
                }}
                aria-label='Close video'
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                >
                  <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
                </svg>
              </button>
            </div>

            {isEditing && isAdmin ? (
              <div
                className='vg-tile__edit-form'
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className='vg-tile__edit-heading'>Edit video info</h4>
                <div className='vg-tile__edit-grid'>
                  <label className='vg-tile__edit-label'>
                    Title
                    <input
                      type='text'
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder='e.g. Playoff Highlights'
                      className='vg-tile__edit-input'
                    />
                  </label>
                  <label className='vg-tile__edit-label'>
                    Grade / Division
                    <input
                      type='text'
                      value={editForm.grade}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, grade: e.target.value }))
                      }
                      placeholder='e.g. 7th Grade'
                      className='vg-tile__edit-input'
                    />
                  </label>
                  <label className='vg-tile__edit-label'>
                    Date
                    <input
                      type='date'
                      value={editForm.date}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className='vg-tile__edit-input'
                    />
                  </label>
                  <label className='vg-tile__edit-label vg-tile__edit-label--full'>
                    Description
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder='Brief description…'
                      rows={2}
                      className='vg-tile__edit-input vg-tile__edit-textarea'
                    />
                  </label>
                </div>
                <div className='vg-tile__edit-actions'>
                  <button
                    className='vg-tile__edit-btn vg-tile__edit-btn--save'
                    onClick={handleEditSave}
                  >
                    Save
                  </button>
                  <button
                    className='vg-tile__edit-btn vg-tile__edit-btn--cancel'
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className='vg-tile__info-panel'
                onClick={(e) => e.stopPropagation()}
              >
                <div className='vg-tile__info-left'>
                  {video.grade && (
                    <span className='vg-tile__info-grade'>{video.grade}</span>
                  )}
                  {video.title && (
                    <h3 className='vg-tile__info-title'>{video.title}</h3>
                  )}
                  {video.description && (
                    <p className='vg-tile__info-desc'>{video.description}</p>
                  )}
                </div>
                <div className='vg-tile__info-right'>
                  {video.date && (
                    <span className='vg-tile__info-date'>
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <rect x='3' y='4' width='18' height='18' rx='2' />
                        <line x1='16' y1='2' x2='16' y2='6' />
                        <line x1='8' y1='2' x2='8' y2='6' />
                        <line x1='3' y1='10' x2='21' y2='10' />
                      </svg>
                      {formatDate(video.date)}
                    </span>
                  )}
                  {duration > 0 && !isYouTube && (
                    <span className='vg-tile__info-dur'>
                      {formatDuration(duration)}
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      className='vg-tile__edit-trigger'
                      onClick={() => setIsEditing(true)}
                    >
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                        <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                      </svg>
                      Edit info
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Admin upload / add panel ──────────────────────────────────────────────────
interface AdminPanelProps {
  onAdded: (video: VideoEntry) => void;
}

const AdminUploadPanel: React.FC<AdminPanelProps> = ({ onAdded }) => {
  const token = localStorage.getItem('token');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SourceType>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [form, setForm] = useState<UploadFormState>({
    title: '',
    description: '',
    date: '',
    grade: '',
  });

  const resetForm = useCallback(() => {
    setForm({ title: '', description: '', date: '', grade: '' });
    setYoutubeUrl('');
  }, []);

  const doFileUpload = useCallback(
    async (file: File) => {
      if (!file || !token) return;

      const validTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/mpeg',
      ];
      if (!validTypes.includes(file.type)) {
        setError(
          'Please upload a valid video file (MP4, WebM, OGG, MOV, AVI, MPEG)',
        );
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError('File must be under 500 MB');
        return;
      }

      setUploading(true);
      setProgress(0);
      setError(null);
      setSuccess(false);

      try {
        const formData = new FormData();
        formData.append('video', file);
        if (form.title) formData.append('title', form.title);
        if (form.description) formData.append('description', form.description);
        if (form.date) formData.append('date', form.date);
        if (form.grade) formData.append('grade', form.grade);

        const xhr = new XMLHttpRequest();
        const result = await new Promise<VideoEntry>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable)
              setProgress(Math.round((e.loaded / e.total) * 100));
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText).data);
              } catch {
                reject(new Error('Invalid server response'));
              }
            } else {
              try {
                reject(
                  new Error(
                    JSON.parse(xhr.responseText).error || 'Upload failed',
                  ),
                );
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          });
          xhr.addEventListener('error', () =>
            reject(new Error('Network error')),
          );
          xhr.open('POST', `${API_BASE_URL}/video-gallery`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        });

        setSuccess(true);
        resetForm();
        onAdded(result);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || 'Upload failed');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [token, form, onAdded, resetForm],
  );

  const doYoutubeAdd = useCallback(async () => {
    if (!token || !youtubeUrl.trim()) {
      setError('Paste a YouTube URL or video ID first');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`${API_BASE_URL}/video-gallery/youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: youtubeUrl.trim(), ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add YouTube video');

      setSuccess(true);
      resetForm();
      onAdded(data.data);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add YouTube video');
    } finally {
      setUploading(false);
    }
  }, [token, youtubeUrl, form, onAdded, resetForm]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) doFileUpload(file);
    },
    [doFileUpload],
  );

  return (
    <div className='vg-admin-panel'>
      <div className='vg-admin-panel__header'>
        <h4>Video Gallery</h4>
      </div>

      <div className='vg-admin-panel__tabs' role='tablist'>
        <button
          role='tab'
          aria-selected={mode === 'upload'}
          className={`vg-admin-panel__tab ${mode === 'upload' ? 'is-active' : ''}`}
          onClick={() => {
            setMode('upload');
            setError(null);
          }}
        >
          Upload File
        </button>
        <button
          role='tab'
          aria-selected={mode === 'youtube'}
          className={`vg-admin-panel__tab ${mode === 'youtube' ? 'is-active' : ''}`}
          onClick={() => {
            setMode('youtube');
            setError(null);
          }}
        >
          YouTube Link
        </button>
      </div>

      <div className='vg-admin-panel__body'>
        <div className='vg-admin-panel__fields'>
          <input
            type='text'
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder='Title (optional)'
            className='vg-admin-panel__input'
            disabled={uploading}
          />
          <input
            type='text'
            value={form.grade}
            onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
            placeholder='Grade / Division (optional)'
            className='vg-admin-panel__input'
            disabled={uploading}
          />
          <input
            type='date'
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className='vg-admin-panel__input'
            disabled={uploading}
          />
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder='Description (optional)'
            rows={2}
            className='vg-admin-panel__input vg-admin-panel__textarea'
            disabled={uploading}
          />
        </div>

        {mode === 'upload' ? (
          <>
            <div
              className={`vg-admin-panel__dropzone ${dragActive ? 'is-active' : ''} ${uploading ? 'is-uploading' : ''}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <i className='ti ti-video-plus' aria-hidden='true' />
              <p>{uploading ? 'Uploading…' : 'Click or drag video here'}</p>
              <small>MP4 · WebM · MOV · up to 500 MB</small>
            </div>
            <input
              ref={fileInputRef}
              type='file'
              accept='video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/mpeg'
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) doFileUpload(file);
              }}
            />
            {uploading && (
              <div className='vg-admin-panel__progress'>
                <div className='vg-admin-panel__progress-track'>
                  <div
                    className='vg-admin-panel__progress-fill'
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span>{progress < 100 ? `${progress}%` : 'Processing…'}</span>
              </div>
            )}
          </>
        ) : (
          <div className='vg-admin-panel__yt-row'>
            <input
              type='text'
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder='Paste YouTube URL or video ID'
              className='vg-admin-panel__input'
              disabled={uploading}
            />
            <button
              className='vg-admin-panel__yt-btn'
              onClick={doYoutubeAdd}
              disabled={uploading || !youtubeUrl.trim()}
            >
              {uploading ? 'Adding…' : 'Add Video'}
            </button>
          </div>
        )}

        {success && (
          <div className='vg-admin-panel__success'>
            <i className='ti ti-check' aria-hidden='true' /> Video added
            successfully
          </div>
        )}

        {error && (
          <div className='vg-admin-panel__error'>
            <i className='ti ti-alert-circle' aria-hidden='true' />
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label='Dismiss'>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main VideoGallery component ──────────────────────────────────────────────
interface VideoGalleryProps {
  initialLimit?: number;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ initialLimit = 4 }) => {
  const { parent } = useAuth();
  const isAdmin = parent?.role === 'admin';

  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Disable browser navigation gestures ────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Prevent touch-based navigation (swipe left/right)
    const preventNavigation = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.('.vg-rail')) return;

      const touch = e.touches[0];
      const rail = wrapperRef.current;
      if (!rail) return;

      const { scrollLeft, scrollWidth, clientWidth } = rail;
      const atLeft = scrollLeft <= 0;
      const atRight = scrollLeft + clientWidth >= scrollWidth - 1;

      // If at bounds and trying to swipe further, prevent navigation
      if (atLeft || atRight) {
        e.preventDefault();
      }
    };

    // Prevent wheel-based navigation
    const preventWheelNavigation = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.('.vg-rail')) return;

      const rail = wrapperRef.current;
      if (!rail) return;

      const { scrollLeft, scrollWidth, clientWidth } = rail;
      const atLeft = scrollLeft <= 0;
      const atRight = scrollLeft + clientWidth >= scrollWidth - 1;

      // If at horizontal bounds and trying to scroll vertically (which can trigger navigation)
      if ((atLeft || atRight) && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
      }

      // If trying to scroll horizontally at bounds
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if ((e.deltaX < 0 && atLeft) || (e.deltaX > 0 && atRight)) {
          e.preventDefault();
        }
      }
    };

    // Add event listeners with passive: false to allow preventDefault
    document.addEventListener('touchmove', preventNavigation, {
      passive: false,
    });
    document.addEventListener('wheel', preventWheelNavigation, {
      passive: false,
    });

    return () => {
      document.removeEventListener('touchmove', preventNavigation);
      document.removeEventListener('wheel', preventWheelNavigation);
    };
  }, []);

  // ── Drag-scroll on desktop ──────────────────────────────────────────────────
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!wrapperRef.current) return;
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = wrapperRef.current.scrollLeft;
    wrapperRef.current.style.cursor = 'grabbing';
    wrapperRef.current.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !wrapperRef.current) return;
    const dx = e.clientX - dragStartX.current;
    wrapperRef.current.scrollLeft = scrollStartX.current - dx;
    e.preventDefault();
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (wrapperRef.current) {
      wrapperRef.current.style.cursor = 'grab';
      wrapperRef.current.style.userSelect = '';
    }
  }, []);

  // ── Fetch videos ────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(
    async (page = 1, append = false) => {
      try {
        append ? setLoadingMore(true) : setLoading(true);
        const limit = page === 1 ? initialLimit : 8;
        const res = await fetch(
          `${API_BASE_URL}/video-gallery?page=${page}&limit=${limit}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setVideos((prev) => (append ? [...prev, ...data.data] : data.data));
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to fetch videos:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [initialLimit],
  );

  useEffect(() => {
    fetchVideos(1, false);
  }, [fetchVideos]);

  // ── Infinite scroll with IntersectionObserver ─────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !pagination?.hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loadingMore) {
          fetchVideos(pagination.page + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 100px 0px' },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [pagination, loadingMore, fetchVideos]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleExpand = useCallback((id: string) => {
    setExpandedId(id);
    requestAnimationFrame(() => {
      const el = wrapperRef.current?.querySelector(`[data-id="${id}"]`);
      el?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });
  }, []);

  const handleCollapse = useCallback(() => {
    setExpandedId(null);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(
          `${API_BASE_URL}/video-gallery/${id}?hard=true`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) {
          setVideos((prev) => prev.filter((v) => v._id !== id));
          if (expandedId === id) setExpandedId(null);
        }
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [expandedId],
  );

  const handleUpdateMeta = useCallback(
    async (id: string, meta: Partial<UploadFormState>) => {
      const token = localStorage.getItem('token');
      try {
        const body: Record<string, any> = {};
        if (meta.title !== undefined) body.title = meta.title;
        if (meta.description !== undefined) body.description = meta.description;
        if (meta.date !== undefined) body.date = meta.date || null;
        if (meta.grade !== undefined) body.grade = meta.grade;
        if (Object.keys(body).length === 0) return;

        const res = await fetch(`${API_BASE_URL}/video-gallery/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setVideos((prev) => prev.map((v) => (v._id === id ? data.data : v)));
        }
      } catch (err) {
        console.error('Update meta failed:', err);
      }
    },
    [],
  );

  const handleDuration = useCallback(async (id: string, duration: number) => {
    setVideos((prev) =>
      prev.map((v) => (v._id === id ? { ...v, duration } : v)),
    );
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/video-gallery/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ duration }),
      });
    } catch {
      /* best-effort */
    }
  }, []);

  const handleAdded = useCallback((video: VideoEntry) => {
    setVideos((prev) => [video, ...prev]);
    setShowAdminPanel(false);
  }, []);

  if (loading) {
    return (
      <div className='vg-root'>
        <div className='vg-spinner' aria-label='Loading videos'>
          <div className='vg-spinner__ring' />
        </div>
      </div>
    );
  }

  if (!loading && videos.length === 0 && !isAdmin) return null;

  return (
    <div ref={containerRef} className='vg-root'>
      <header className='vg-header'>
        <div className='vg-header__left'>
          <span className='vg-header__label'>Highlights</span>
          <h2 className='vg-header__title'>Program Videos</h2>
          <p className='vg-header__sub'>
            Game highlights, training sessions &amp; more
          </p>
        </div>
        {isAdmin && (
          <button
            className={`vg-admin-toggle ${showAdminPanel ? 'is-active' : ''}`}
            onClick={() => setShowAdminPanel((v) => !v)}
            title='Add new video'
            aria-expanded={showAdminPanel}
          >
            <i className='ti ti-video-plus' aria-hidden='true' />
          </button>
        )}
      </header>

      {isAdmin && showAdminPanel && <AdminUploadPanel onAdded={handleAdded} />}

      {videos.length === 0 && isAdmin && (
        <div className='vg-empty'>
          <i className='ti ti-video-off' aria-hidden='true' />
          <p>No videos yet. Upload a file or add a YouTube link above.</p>
        </div>
      )}

      {videos.length > 0 && (
        <div
          ref={wrapperRef}
          className='vg-rail'
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className='vg-rail__track'>
            {videos.map((video) => (
              <VideoTile
                key={video._id}
                video={video}
                isExpanded={expandedId === video._id}
                onExpand={handleExpand}
                onCollapse={handleCollapse}
                isAdmin={isAdmin}
                onDelete={handleDelete}
                onUpdateMeta={handleUpdateMeta}
                onDuration={handleDuration}
              />
            ))}

            {pagination?.hasMore && (
              <div
                ref={sentinelRef}
                className='vg-sentinel'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: 'var(--vg-tile-h)',
                  flexShrink: 0,
                  verticalAlign: 'top',
                }}
              >
                {loadingMore && (
                  <div
                    className='vg-spinner__ring'
                    style={{ width: '28px', height: '28px' }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGallery;
