import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import HomeModals from './homeModals';
import PageRenderer from '../../components/page-builder/PageRenderer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface HomePageProps {
  onSplashClose: () => void;
}

interface VideoControls {
  isPlaying: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSplashClose }) => {
  const { isLoading, parent } = useAuth();
  const isAdmin = parent?.role === 'admin';
  const token = localStorage.getItem('token');

  // ── Promo video URL (fetched from DB; admin can replace) ──────────────────
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Video state and refs
  const [videoControls, setVideoControls] = useState<VideoControls>({
    isPlaying: false,
    isFullscreen: false,
    isMuted: true,
  });
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showWelcomeHint, setShowWelcomeHint] = useState(true);
  const [showControlsHighlight, setShowControlsHighlight] = useState(true);
  const [showClickHint, setShowClickHint] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const popupVideoRef = useRef<HTMLVideoElement>(null);
  const videoControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastRoundedProgress = useRef<number>(0);

  // ── Fetch promo video URL on mount ───────────────────────────────────────
  useEffect(() => {
    const fetchPromoVideo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/upload/promo-video`);
        if (!res.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await res.json();
        if (data.videoUrl) {
          setPromoVideoUrl(data.videoUrl);
        }
      } catch (err) {
        console.error('Could not fetch promo video URL:', err);
      }
    };
    fetchPromoVideo();
  }, []);

  // ── Admin: handle video file selection and upload ─────────────────────────
  const uploadVideo = useCallback(
    async (file: File) => {
      if (!file || !token) {
        setUploadError('Authentication required');
        return;
      }

      // Validate file type
      const validTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
      ];
      if (!validTypes.includes(file.type)) {
        setUploadError(
          'Please upload a valid video file (MP4, WebM, OGG, or MOV)',
        );
        return;
      }

      // Validate file size (max 80MB)
      if (file.size > 80 * 1024 * 1024) {
        setUploadError('Video file must be less than 80MB');
        return;
      }

      setVideoUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadSuccess(false);
      setDebugInfo(null);
      setShowAdminPanel(false);

      // Pause the current video while uploading
      if (videoRef.current && videoControls.isPlaying) {
        videoRef.current.pause();
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }

      try {
        const formData = new FormData();
        formData.append('video', file);

        // Log what we're uploading
        console.log('Uploading video:', {
          name: file.name,
          type: file.type,
          size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        });

        // Use fetch with progress tracking via XMLHttpRequest
        const xhr = new XMLHttpRequest();

        const uploadPromise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(progress);
            }
          });

          xhr.addEventListener('load', () => {
            console.log('Upload response status:', xhr.status);
            console.log('Upload response text:', xhr.responseText);

            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(
                  new Error(
                    errorResponse.error ||
                      errorResponse.message ||
                      'Upload failed',
                  ),
                );
              } catch (e) {
                reject(
                  new Error(
                    `Upload failed with status ${xhr.status}: ${xhr.responseText}`,
                  ),
                );
              }
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error - please check your connection'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
          });

          xhr.open('PUT', `${API_BASE_URL}/upload/promo-video`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          // Don't set Content-Type header, let the browser set it with the boundary
          xhr.send(formData);
        });

        const data = (await uploadPromise) as {
          videoUrl: string;
          success: boolean;
        };

        if (data.videoUrl) {
          setPromoVideoUrl(data.videoUrl);
          setUploadSuccess(true);

          // Reset success message after 3 seconds
          setTimeout(() => {
            setUploadSuccess(false);
          }, 3000);
        } else {
          throw new Error('No video URL returned from server');
        }
      } catch (err: any) {
        console.error('Video upload error:', err);
        setUploadError(err.message || 'Failed to upload video');
        setDebugInfo(JSON.stringify(err, null, 2));
      } finally {
        setVideoUploading(false);
        // Clear input so same file can be re-selected
        if (videoFileInputRef.current) {
          videoFileInputRef.current.value = '';
        }
      }
    },
    [token, videoControls.isPlaying],
  );

  const handleVideoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await uploadVideo(file);
      }
    },
    [uploadVideo],
  );

  // ── Drag and drop handlers ──────────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        await uploadVideo(file);
      }
    },
    [uploadVideo],
  );

  // ── Admin: delete promo video ─────────────────────────────────────────────
  const handleDeletePromoVideo = useCallback(async () => {
    if (!token) return;

    // Show confirmation
    const confirmed = window.confirm(
      'Remove the promo video? This cannot be undone.',
    );
    if (!confirmed) return;

    setVideoUploading(true);
    setUploadError(null);
    setDebugInfo(null);

    try {
      const res = await fetch(`${API_BASE_URL}/upload/promo-video`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      setPromoVideoUrl('');
      setShowAdminPanel(false);
      setUploadSuccess(true);

      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Video delete error:', err);
      setUploadError(`Failed to remove video: ${err.message}`);
    } finally {
      setVideoUploading(false);
    }
  }, [token]);

  // ... (rest of your video control functions remain the same)
  const checkIfMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.muted = true;
        videoRef.current
          .play()
          .then(() =>
            setVideoControls((prev) => ({ ...prev, isPlaying: true })),
          )
          .catch((err) => console.log('Play failed:', err));
      } else {
        videoRef.current.pause();
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !videoControls.isMuted;
      videoRef.current.muted = newMuted;
      setVideoControls((prev) => ({ ...prev, isMuted: newMuted }));
      highlightControls();
    }
  }, [videoControls.isMuted]);

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const progress = parseFloat(e.target.value);
      const roundedProgress = Math.round(progress);
      setVideoProgress(roundedProgress);
      if (videoRef.current && videoDuration > 0) {
        videoRef.current.currentTime = (roundedProgress / 100) * videoDuration;
        lastRoundedProgress.current = roundedProgress;
      }
    },
    [videoDuration],
  );

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    const container = videoRef.current.parentElement;
    if (!container) return;
    if (!videoControls.isFullscreen) {
      container.requestFullscreen?.();
      setVideoControls((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen?.();
      setVideoControls((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, [videoControls.isFullscreen]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !videoDuration) return;
    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(() => {
      const rawProgress = (videoRef.current!.currentTime / videoDuration) * 100;
      const roundedProgress = Math.round(rawProgress);
      if (Math.abs(roundedProgress - lastRoundedProgress.current) >= 1) {
        setVideoProgress(roundedProgress);
        lastRoundedProgress.current = roundedProgress;
      }
    });
  }, [videoDuration]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVideoLoaded(true);
      if (!videoControls.isPlaying) {
        videoRef.current.muted = true;
        videoRef.current
          .play()
          .then(() =>
            setVideoControls((prev) => ({ ...prev, isPlaying: true })),
          )
          .catch((err) => console.log('Autoplay prevented:', err));
      }
    }
  }, [videoControls.isPlaying]);

  const showControlsTemporarily = useCallback(() => {
    setShowVideoControls(true);
    if (videoControlsTimeout.current)
      clearTimeout(videoControlsTimeout.current);
    videoControlsTimeout.current = setTimeout(
      () => setShowVideoControls(false),
      3000,
    );
  }, []);

  const handleVideoClick = useCallback(() => {
    togglePlayPause();
    showControlsTemporarily();
    setShowClickHint(false);
  }, [togglePlayPause, showControlsTemporarily]);

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const stableVideoProgress = useMemo(
    () => Math.round(videoProgress),
    [videoProgress],
  );

  const highlightControls = useCallback(() => {
    setShowControlsHighlight(true);
    setTimeout(() => setShowControlsHighlight(false), 1000);
  }, []);

  const openVideoPopup = useCallback(() => {
    setShowVideoPopup(true);
    if (videoRef.current && videoControls.isPlaying) {
      videoRef.current.pause();
      setVideoControls((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [videoControls.isPlaying]);

  const closeVideoPopup = useCallback(() => {
    setShowVideoPopup(false);
    if (videoRef.current && !videoControls.isPlaying) {
      videoRef.current.play().catch(console.error);
      setVideoControls((prev) => ({ ...prev, isPlaying: true }));
    }
  }, [videoControls.isPlaying]);

  const dismissHint = useCallback(() => setShowWelcomeHint(false), []);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.code === 'Space' &&
        !(event.target as HTMLElement).closest('input, textarea')
      ) {
        event.preventDefault();
        togglePlayPause();
        highlightControls();
      }
      if (
        event.code === 'KeyM' &&
        !(event.target as HTMLElement).closest('input, textarea')
      ) {
        event.preventDefault();
        toggleMute();
        highlightControls();
      }
      if (event.code === 'Escape' && showVideoPopup) closeVideoPopup();
    },
    [
      togglePlayPause,
      toggleMute,
      showVideoPopup,
      closeVideoPopup,
      highlightControls,
    ],
  );

  // ============ EFFECTS ============
  useEffect(() => {
    const handleFullscreenChange = () => {
      setVideoControls((prev) => ({
        ...prev,
        isFullscreen: !!document.fullscreenElement,
      }));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', checkIfMobile);

    const welcomeHintTimer = setTimeout(() => setShowWelcomeHint(false), 5000);
    const controlsHighlightTimer = setTimeout(
      () => setShowControlsHighlight(false),
      3000,
    );
    const clickHintTimer = setTimeout(() => setShowClickHint(false), 4000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', checkIfMobile);
      if (videoControlsTimeout.current)
        clearTimeout(videoControlsTimeout.current);
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
      clearTimeout(welcomeHintTimer);
      clearTimeout(controlsHighlightTimer);
      clearTimeout(clickHintTimer);
      document.body.style.overflow = '';
    };
  }, [handleKeyPress, checkIfMobile]);

  useEffect(() => {
    checkIfMobile();
  }, [checkIfMobile]);

  useEffect(() => {
    document.body.style.overflow = showVideoPopup ? 'hidden' : '';
  }, [showVideoPopup]);

  // ============ RENDER ============
  if (isLoading) {
    return (
      <div className='container-fluid'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row justify-content-center align-items-center vh-100'>
            <div className='text-center'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
              <p className='mt-3'>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container-fluid homepage-container'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          {/* Left Column - Video with Full Controls */}
          <div className='col-lg-6 position-relative overflow-hidden'>
            <div
              className='video-background-container position-relative w-100 h-100 d-flex align-items-center justify-content-center striped-bg'
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setShowVideoControls(true)}
              onMouseLeave={() => {
                if (!videoControls.isPlaying) return;
                setShowVideoControls(false);
              }}
              onDragEnter={isAdmin ? handleDrag : undefined}
              onDragLeave={isAdmin ? handleDrag : undefined}
              onDragOver={isAdmin ? handleDrag : undefined}
              onDrop={isAdmin ? handleDrop : undefined}
            >
              {/* Background Video */}
              {promoVideoUrl ? (
                <video
                  ref={videoRef}
                  className='video-background'
                  src={promoVideoUrl}
                  autoPlay
                  muted={videoControls.isMuted}
                  loop
                  playsInline
                  preload='auto'
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={handleVideoClick}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 1,
                    backgroundColor: '#000',
                    filter: 'brightness(0.6)',
                  }}
                />
              ) : (
                /* Placeholder when no video is set */
                <div
                  className={`video-placeholder ${dragActive ? 'drag-active' : ''}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: dragActive
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.3s ease',
                  }}
                >
                  {isAdmin && (
                    <div className='text-center text-white-50 placeholder-content'>
                      <i
                        className='ti ti-video-off'
                        style={{ fontSize: '3rem' }}
                      />
                      <p className='mt-2 mb-1'>No promo video set</p>
                      <small className='d-block'>
                        {dragActive
                          ? 'Drop video to upload'
                          : 'Click the admin panel button to upload'}
                      </small>
                    </div>
                  )}
                </div>
              )}

              {/* ── Admin video management panel ─────────────────────────── */}
              {isAdmin && (
                <>
                  {/* Hidden file input */}
                  <input
                    ref={videoFileInputRef}
                    type='file'
                    accept='video/mp4,video/webm,video/ogg,video/quicktime'
                    style={{ display: 'none' }}
                    onChange={handleVideoFileChange}
                  />

                  {/* Admin panel toggle button */}
                  <button
                    className={`admin-panel-toggle ${showAdminPanel ? 'active' : ''}`}
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    title='Video Management'
                  >
                    <i
                      className={`ti ${promoVideoUrl ? 'ti-video' : 'ti-video-plus'}`}
                    />
                  </button>

                  {/* Admin management panel */}
                  {showAdminPanel && (
                    <div className='admin-video-panel'>
                      <div className='admin-panel-header'>
                        <h4>Video Management</h4>
                        <button
                          className='admin-panel-close'
                          onClick={() => setShowAdminPanel(false)}
                        >
                          <i className='ti ti-x' />
                        </button>
                      </div>

                      <div className='admin-panel-content'>
                        {/* Current video status */}
                        <div className='video-status'>
                          <span className='status-label'>Status:</span>
                          <span
                            className={`status-value ${promoVideoUrl ? 'active' : 'inactive'}`}
                          >
                            {promoVideoUrl ? 'Video Active' : 'No Video'}
                          </span>
                        </div>

                        {/* Success message */}
                        {uploadSuccess && (
                          <div className='success-message'>
                            <i className='ti ti-check-circle' />
                            <span>Operation completed successfully!</span>
                          </div>
                        )}

                        {/* Upload area */}
                        <div
                          className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                          onClick={() => videoFileInputRef.current?.click()}
                        >
                          <i className='ti ti-upload' />
                          <p>Click to upload or drag and drop</p>
                          <small>MP4, WebM, OGG, MOV (max 80MB)</small>
                        </div>

                        {/* Upload progress */}
                        {videoUploading && (
                          <div className='upload-progress'>
                            <div className='progress-bar'>
                              <div
                                className='progress-fill'
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <span className='progress-text'>
                              {uploadProgress < 100
                                ? `Uploading... ${uploadProgress}%`
                                : 'Processing...'}
                            </span>
                          </div>
                        )}

                        {/* Error message */}
                        {uploadError && (
                          <div className='upload-error'>
                            <i className='ti ti-alert-circle' />
                            <span>{uploadError}</span>
                            <button onClick={() => setUploadError(null)}>
                              ×
                            </button>
                          </div>
                        )}

                        {/* Debug info (only shown in development) */}
                        {debugInfo &&
                          process.env.NODE_ENV === 'development' && (
                            <div className='debug-info'>
                              <strong>Debug Info:</strong>
                              <pre>{debugInfo}</pre>
                            </div>
                          )}

                        {/* Action buttons */}
                        {promoVideoUrl && (
                          <div className='action-buttons'>
                            <button
                              className='action-btn replace-btn'
                              onClick={() => videoFileInputRef.current?.click()}
                              disabled={videoUploading}
                            >
                              <i className='ti ti-refresh' />
                              Replace Video
                            </button>
                            <button
                              className='action-btn delete-btn'
                              onClick={handleDeletePromoVideo}
                              disabled={videoUploading}
                            >
                              <i className='ti ti-trash' />
                              Remove Video
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Drag and drop overlay */}
                  {dragActive && (
                    <div className='drag-overlay'>
                      <div className='drag-overlay-content'>
                        <i className='ti ti-cloud-upload' />
                        <p>Drop your video here</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Welcome Hint */}
              {/* {showWelcomeHint && promoVideoUrl && (
                <div className='welcome-hint'>
                  <div className='hint-content'>
                    <div className='hint-icons'>
                      <svg
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                        className='hint-icon'
                      >
                        <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' />
                      </svg>
                      <svg
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                        className='hint-icon'
                      >
                        <path d='M8 5v14l11-7z' />
                      </svg>
                    </div>
                    <p className='hint-text'>
                      You can control the video & sound
                    </p>
                    <button className='hint-close' onClick={dismissHint}>
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                      >
                        <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
                      </svg>
                    </button>
                  </div>
                </div>
              )} */}

              {/* Overlay Logo */}
              <div
                className='position-absolute d-flex align-items-center justify-content-center w-100 h-100'
                style={{ zIndex: 2 }}
              >
                <div
                  style={{
                    maxWidth: '40%',
                    maxHeight: '40%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageWithBasePath
                    src='assets/img/watermark-logo.png'
                    alt='Partizan AAU Basketball'
                    className='img-fluid hover-zoom'
                  />
                </div>
              </div>

              {/* Enhanced Minimal Video Controls with Progress Slider */}
              {promoVideoUrl && (
                <div
                  className={`enhanced-video-controls ${showControlsHighlight ? 'controls-highlighted' : ''} ${showVideoControls ? 'show' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className='progress-bar-container'>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={stableVideoProgress}
                      onChange={handleProgressChange}
                      className='video-progress-slider'
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.9) ${stableVideoProgress}%, rgba(255,255,255,0.2) ${stableVideoProgress}%)`,
                      }}
                    />
                  </div>
                  <div className='controls-row'>
                    <div className='left-controls'>
                      <button
                        className='enhanced-control-btn play-btn'
                        onClick={togglePlayPause}
                        aria-label={
                          videoControls.isPlaying ? 'Pause video' : 'Play video'
                        }
                      >
                        {videoControls.isPlaying ? (
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                          >
                            <rect x='6' y='5' width='4' height='14' rx='1' />
                            <rect x='14' y='5' width='4' height='14' rx='1' />
                          </svg>
                        ) : (
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                          >
                            <path d='M8 5v14l11-7z' />
                          </svg>
                        )}
                      </button>
                      <button
                        className='enhanced-control-btn mute-btn'
                        onClick={toggleMute}
                        aria-label={
                          videoControls.isMuted ? 'Unmute video' : 'Mute video'
                        }
                      >
                        {videoControls.isMuted ? (
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                          >
                            <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' />
                          </svg>
                        ) : (
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                          >
                            <path d='M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z' />
                          </svg>
                        )}
                      </button>
                      <div className='time-display'>
                        <span className='current-time'>
                          {formatTime(
                            (stableVideoProgress / 100) * videoDuration,
                          )}
                        </span>
                        <span className='time-separator'>/</span>
                        <span className='total-time'>
                          {formatTime(videoDuration)}
                        </span>
                      </div>
                    </div>
                    <div className='right-controls'>
                      <button
                        className='enhanced-control-btn popup-btn'
                        onClick={openVideoPopup}
                        aria-label='Open video in popup'
                      >
                        <svg
                          width='18'
                          height='18'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <path d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' />
                        </svg>
                      </button>
                      <button
                        className='enhanced-control-btn fullscreen-btn'
                        onClick={toggleFullscreen}
                        aria-label={
                          videoControls.isFullscreen
                            ? 'Exit fullscreen'
                            : 'Enter fullscreen'
                        }
                      >
                        {videoControls.isFullscreen ? (
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                          >
                            <path d='M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z' />
                          </svg>
                        ) : (
                          <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='currentColor'
                          >
                            <path d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Play button overlay when paused */}
              {!videoControls.isPlaying && promoVideoUrl && (
                <button
                  onClick={togglePlayPause}
                  className='btn btn-transparent btn-lg rounded-circle position-absolute d-flex align-items-center justify-content-center'
                  style={{
                    width: '60px',
                    height: '60px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    opacity: showVideoControls ? 1 : 0.7,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <svg
                    width='28'
                    height='28'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path d='M8 5v14l11-7z' />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Dynamic Content via PageRenderer */}
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='home-page'>
                <div className='mx-auto'>
                  <PageRenderer pageSlug='home' isEditing={false} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Popup Modal */}
      {showVideoPopup && promoVideoUrl && (
        <div className='video-popup-overlay' onClick={closeVideoPopup}>
          <div className='video-popup' onClick={(e) => e.stopPropagation()}>
            <div className='popup-header'>
              <h4 className='popup-title'>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                  className='me-2'
                >
                  <path d='M8 5v14l11-7z' />
                </svg>
                Video Player
              </h4>
              <button className='popup-close' onClick={closeVideoPopup}>
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
            <div className='popup-content'>
              <video
                ref={popupVideoRef}
                muted={videoControls.isMuted}
                autoPlay
                loop
                controls
                className='popup-video'
                src={promoVideoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className='popup-footer'>
              <button className='popup-close-btn' onClick={closeVideoPopup}>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                  className='me-2'
                >
                  <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
                </svg>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sponsor Banner */}
      <div className='footer-container'>
        <div
          className='mobile-ad-banner bg-white shadow-lg p-2 md:hidden'
          style={{
            position: 'relative',
            width: '100%',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {/* Sponsor content here if needed */}
        </div>
      </div>

      <HomeModals />

      <style>{`
        .striped-bg {
          position: relative;
        }
        .striped-bg::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background-image: 
            linear-gradient(90deg, rgba(89, 66, 48, .035) 0%, rgba(89, 66, 48, .035) 14.2857%, transparent 14.2857%),
            linear-gradient(90deg, #ffffff 14.2857%, #ffffff 28.5714%, transparent 28.5714%),
            linear-gradient(90deg, rgba(89, 66, 48, .035) 28.5714%, rgba(89, 66, 48, .035) 42.8571%, transparent 42.8571%),
            linear-gradient(90deg, #ffffff 42.8571%, #ffffff 57.1428%, transparent 57.1428%),
            linear-gradient(90deg, rgba(89, 66, 48, .035) 57.1428%, rgba(89, 66, 48, .035) 71.4285%, transparent 71.4285%),
            linear-gradient(90deg, #ffffff 71.4285%, #ffffff 85.7142%, transparent 85.7142%),
            linear-gradient(90deg, rgba(89, 66, 48, .035) 85.7142%, rgba(89, 66, 48, .035) 100%);
          background-size: 100% 100%;
          background-repeat: no-repeat;
          z-index: 1;
        }
        .striped-bg img { position: relative; z-index: 2; max-width: 80%; max-height: 80%; object-fit: contain; }
        .hover-zoom { transition: transform 0.3s ease; }
        .hover-zoom:hover { transform: scale(1.05); }

        /* ── Admin video management panel ───────────────────────────────── */
        .admin-panel-toggle {
          position: absolute;
          top: 10%;
          right: 38px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(0,0,0,0.8);
          border: 2px solid rgba(102, 126, 234, 0.5);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.3rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
          z-index: 100;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .admin-panel-toggle:hover,
        .admin-panel-toggle.active {
          background: #667eea;
          border-color: #667eea;
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .admin-video-panel {
          position: absolute;
          top: 80px;
          right: 20px;
          width: 320px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          z-index: 100;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: slideDown 0.3s ease;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .admin-panel-header {
          padding: 16px 20px;
          background: rgba(102, 126, 234, 0.2);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .admin-panel-header h4 {
          margin: 0;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .admin-panel-close {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .admin-panel-close:hover {
          background: rgba(255,255,255,0.2);
          transform: rotate(90deg);
        }
        
        .admin-panel-content {
          padding: 20px;
        }
        
        .video-status {
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .status-label {
          color: rgba(255,255,255,0.5);
          font-size: 0.9rem;
        }
        
        .status-value {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .status-value.active {
          color: #4caf50;
          background: rgba(76, 175, 80, 0.1);
        }
        
        .status-value.inactive {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.1);
        }
        
        .success-message {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4caf50;
          font-size: 0.9rem;
          animation: fadeIn 0.3s ease;
        }
        
        .upload-area {
          background: rgba(255,255,255,0.05);
          border: 2px dashed rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 16px;
        }
        
        .upload-area:hover,
        .upload-area.drag-active {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
          transform: scale(1.02);
        }
        
        .upload-area i {
          font-size: 2rem;
          color: #667eea;
          margin-bottom: 8px;
        }
        
        .upload-area p {
          color: white;
          margin: 8px 0 4px;
          font-size: 0.95rem;
        }
        
        .upload-area small {
          color: rgba(255,255,255,0.5);
          font-size: 0.8rem;
        }
        
        .upload-progress {
          margin-bottom: 16px;
        }
        
        .progress-bar {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
        }
        
        .progress-text {
          color: rgba(255,255,255,0.7);
          font-size: 0.85rem;
        }
        
        .upload-error {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ff6b6b;
          font-size: 0.9rem;
        }
        
        .upload-error button {
          margin-left: auto;
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 1.2rem;
          cursor: pointer;
        }
        
        .debug-info {
          background: rgba(0,0,0,0.5);
          border: 1px solid #667eea;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          color: #ffd700;
          font-size: 0.8rem;
          overflow-x: auto;
        }
        
        .debug-info pre {
          margin: 8px 0 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #00ff00;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: none;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .replace-btn {
          background: #667eea;
          color: white;
        }
        
        .replace-btn:hover:not(:disabled) {
          background: #5a67d8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .delete-btn {
          background: rgba(220, 53, 69, 0.8);
          color: white;
        }
        
        .delete-btn:hover:not(:disabled) {
          background: rgb(220, 53, 69);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }
        
        .drag-overlay {
          position: absolute;
          inset: 0;
          background: rgba(102, 126, 234, 0.9);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.3s ease;
        }
        
        .drag-overlay-content {
          text-align: center;
          color: white;
        }
        
        .drag-overlay-content i {
          font-size: 4rem;
          margin-bottom: 16px;
          animation: bounce 2s infinite;
        }
        
        .drag-overlay-content p {
          font-size: 1.2rem;
          font-weight: 600;
        }
        
        .placeholder-content {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        /* ── Video player controls ──────────────────────────────────────── */
        .enhanced-video-controls {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
          backdrop-filter: blur(10px);
          padding: 15px 20px;
          z-index: 3;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.3s ease;
          pointer-events: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .enhanced-video-controls.show { opacity: 1; transform: translateY(0); pointer-events: all; }
        .enhanced-video-controls.controls-highlighted {
          background: linear-gradient(transparent, rgba(102, 126, 234, 0.3));
          border-top-color: rgba(102, 126, 234, 0.5);
          animation: pulse-highlight 1s ease-in-out;
        }
        @keyframes pulse-highlight {
          0%, 100% { background: linear-gradient(transparent, rgba(0,0,0,0.8)); border-top-color: rgba(255,255,255,0.1); }
          50% { background: linear-gradient(transparent, rgba(102,126,234,0.3)); border-top-color: rgba(102,126,234,0.7); }
        }
        .progress-bar-container { margin-bottom: 12px; padding: 0 10px; }
        .video-progress-slider {
          width: 100%; height: 4px; border-radius: 2px;
          -webkit-appearance: none; appearance: none;
          outline: none; cursor: pointer;
        }
        .video-progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: white; cursor: pointer;
          border: 2px solid #667eea;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        .video-progress-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .video-progress-slider::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: white; cursor: pointer;
          border: 2px solid #667eea;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .controls-row { display: flex; align-items: center; justify-content: space-between; }
        .left-controls, .right-controls { display: flex; align-items: center; gap: 10px; }
        .enhanced-control-btn {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s ease;
        }
        .enhanced-control-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }
        .time-display {
          display: flex; align-items: center; gap: 4px;
          margin-left: 10px;
          color: rgba(255,255,255,0.8);
          font-size: 0.85rem; font-family: monospace;
        }
        .time-separator { opacity: 0.6; }

        /* Welcome Hint */
        .welcome-hint {
          position: absolute; top: 80px; right: 20px; z-index: 4;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);
          border-radius: 15px; padding: 12px;
          border: 1px solid rgba(102,126,234,0.3);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          max-width: 220px;
          animation: slideInRight 0.5s ease-out;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .hint-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .hint-icons { display: flex; gap: 12px; }
        .hint-icon { animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .hint-text { color: white; font-size: 0.85rem; text-align: center; margin: 0; line-height: 1.4; }
        .hint-close {
          position: absolute; top: 6px; right: 6px;
          background: none; border: none;
          color: rgba(255,255,255,0.5); cursor: pointer;
          width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.3s ease;
        }
        .hint-close:hover { color: white; }

        /* Video Popup */
        .video-popup-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.9); backdrop-filter: blur(5px);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px; animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .video-popup {
          background: #1a1a1a; border-radius: 15px;
          width: 100%; max-width: 800px; max-height: 90vh;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden; animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .popup-header {
          padding: 15px 20px;
          background: rgba(0,0,0,0.5);
          border-bottom: 1px solid rgba(255,255,255,0.1);
          display: flex; justify-content: space-between; align-items: center;
        }
        .popup-title { color: white; margin: 0; font-size: 1.2rem; font-weight: 600; display: flex; align-items: center; }
        .popup-close {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: white; width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s ease;
        }
        .popup-close:hover { background: rgba(255,255,255,0.2); transform: rotate(90deg); }
        .popup-content { flex: 1; padding: 20px; display: flex; align-items: center; justify-content: center; background: #000; }
        .popup-video { width: 100%; height: auto; max-height: 70vh; border-radius: 8px; background: #000; }
        .popup-footer { padding: 15px 20px; background: rgba(0,0,0,0.5); border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: center; }
        .popup-close-btn {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: white; padding: 10px 20px; border-radius: 8px;
          cursor: pointer; transition: all 0.3s ease;
          font-size: 0.95rem; display: flex; align-items: center;
        }
        .popup-close-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }

        /* Responsive */
        @media (max-width: 991.98px) {
          .col-lg-6:first-child { display: none !important; }
          .welcome-hint, .click-hint, .enhanced-video-controls { display: none !important; }
        }
        @media (max-width: 768px) {
          .video-popup { max-width: 95%; max-height: 85vh; }
          .popup-video { max-height: 60vh; }
          .enhanced-video-controls { padding: 12px 15px; }
          .enhanced-control-btn { width: 36px; height: 36px; }
          .time-display { font-size: 0.8rem; margin-left: 8px; }
          .admin-video-panel {
            width: 280px;
            right: 10px;
          }
        }
        @media (max-width: 576px) {
          .video-popup { max-height: 80vh; }
          .popup-video { max-height: 50vh; }
          .enhanced-video-controls { padding: 10px 12px; }
          .enhanced-control-btn { width: 32px; height: 32px; }
          .time-display { font-size: 0.75rem; margin-left: 6px; }
          .controls-row { flex-direction: column; gap: 8px; }
          .left-controls, .right-controls { width: 100%; justify-content: space-between; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
