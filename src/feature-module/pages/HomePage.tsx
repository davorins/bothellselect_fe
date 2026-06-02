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
import HomeTileRenderer from './HomeTileRenderer';
import './HomePage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface HomePageProps {
  onSplashClose: () => void;
}

interface VideoControls {
  isPlaying: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
}

// ─── Tile grid layout logic ───────────────────────────────────────────────────
function getTileLayout(count: number): {
  gridCols: string;
  tileClass: string;
} {
  switch (count) {
    case 1:
      return { gridCols: '1fr', tileClass: 'tile-single' };
    case 2:
      return { gridCols: '1fr 1fr', tileClass: 'tile-half' };
    case 3:
      return { gridCols: '1fr 1fr 1fr', tileClass: 'tile-third' };
    case 4:
      return { gridCols: '1fr 1fr', tileClass: 'tile-quarter' };
    case 5:
    case 6:
      return { gridCols: '1fr 1fr 1fr', tileClass: 'tile-sixth' };
    default:
      return { gridCols: '1fr 1fr 1fr', tileClass: 'tile-sixth' };
  }
}

const HomePage: React.FC<HomePageProps> = ({ onSplashClose }) => {
  const { isLoading, parent } = useAuth();
  const isAdmin = parent?.role === 'admin';
  const token = localStorage.getItem('token');

  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showVideoElement, setShowVideoElement] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // Default to true for safety

  const [videoControls, setVideoControls] = useState<VideoControls>({
    isPlaying: false,
    isFullscreen: false,
    isMuted: true,
  });
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  // Track if background video should be paused
  const [isBackgroundVideoPaused, setIsBackgroundVideoPaused] = useState(false);
  const backgroundVideoCurrentTime = useRef<number>(0);
  const wasBackgroundPlaying = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const popupVideoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastRoundedProgress = useRef<number>(0);
  const timeUpdateThrottle = useRef<number>(0);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Check mobile - more aggressive detection
  const checkIfMobile = useCallback(() => {
    const mobileWidth = window.innerWidth <= 768;
    const mobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const isMobileDevice = mobileWidth || mobileUA;
    setIsMobile(isMobileDevice);

    // If mobile, force hide video element
    if (isMobileDevice && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.style.display = 'none';
    }

    return isMobileDevice;
  }, []);

  // Preload background image
  const preloadBackgroundImage = useCallback(() => {
    const img = new Image();
    img.src = '/assets/img/bg/main.png';
    img.onload = () => {
      console.log('Background image loaded');
    };
    img.onerror = () => {
      console.log('Background image failed to load');
    };
  }, []);

  // ── Fetch promo video URL ───────────────────────────────────────────────
  useEffect(() => {
    const fetchPromoVideo = async () => {
      const isMobileDevice = checkIfMobile();

      try {
        const res = await fetch(`${API_BASE_URL}/upload/promo-video`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.videoUrl) {
          const urlWithCache = `${data.videoUrl}?t=${Date.now()}`;
          setPromoVideoUrl(urlWithCache);

          // Only preload video on desktop
          if (!isMobileDevice) {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.src = urlWithCache;
            video.oncanplaythrough = () => {
              console.log('Video preloaded, ready to show');
              setShowVideoElement(true);
            };
            video.onerror = () => {
              console.log('Video failed to preload, showing background image');
              setShowVideoElement(false);
            };
          }
        } else {
          setShowVideoElement(false);
        }
      } catch (err) {
        console.error('Could not fetch promo video URL:', err);
        setShowVideoElement(false);
      }
    };

    preloadBackgroundImage();
    fetchPromoVideo();
  }, [preloadBackgroundImage, checkIfMobile]);

  // ── Admin video upload ─────────────────────────────────────────────────
  const uploadVideo = useCallback(
    async (file: File) => {
      if (!file || !token) {
        setUploadError('Authentication required');
        return;
      }
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
      if (file.size > 200 * 1024 * 1024) {
        setUploadError('Video file must be less than 200MB');
        return;
      }
      setVideoUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadSuccess(false);
      setDebugInfo(null);
      setShowAdminPanel(false);
      if (videoRef.current && videoControls.isPlaying) {
        videoRef.current.pause();
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
      try {
        const formData = new FormData();
        formData.append('video', file);
        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable)
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error || err.message || 'Upload failed'));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });
          xhr.addEventListener('error', () =>
            reject(new Error('Network error')),
          );
          xhr.addEventListener('abort', () =>
            reject(new Error('Upload aborted')),
          );
          xhr.open('PUT', `${API_BASE_URL}/upload/promo-video`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        });
        const data = (await uploadPromise) as {
          videoUrl: string;
          success: boolean;
        };
        if (data.videoUrl) {
          const urlWithCache = `${data.videoUrl}?t=${Date.now()}`;
          setPromoVideoUrl(urlWithCache);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);

          // Only preload on desktop
          if (!isMobile) {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.src = urlWithCache;
            video.oncanplaythrough = () => {
              setShowVideoElement(true);
            };
          }
        } else throw new Error('No video URL returned from server');
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload video');
        setDebugInfo(JSON.stringify(err, null, 2));
      } finally {
        setVideoUploading(false);
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      }
    },
    [token, videoControls.isPlaying, isMobile],
  );

  const handleVideoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) await uploadVideo(file);
    },
    [uploadVideo],
  );

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
      if (file) await uploadVideo(file);
    },
    [uploadVideo],
  );

  const handleDeletePromoVideo = useCallback(async () => {
    if (!token) return;
    if (!window.confirm('Remove the promo video? This cannot be undone.'))
      return;
    setVideoUploading(true);
    setUploadError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/upload/promo-video`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setPromoVideoUrl('');
      setShowAdminPanel(false);
      setUploadSuccess(true);
      setShowVideoElement(false);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(`Failed to remove video: ${err.message}`);
    } finally {
      setVideoUploading(false);
    }
  }, [token]);

  // Handle fullscreen change events - PAUSE BACKGROUND VIDEO
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setVideoControls((prev) => ({ ...prev, isFullscreen: isFullscreen }));

      if (isFullscreen) {
        // Pause background video when entering fullscreen
        if (videoRef.current && !videoRef.current.paused) {
          wasBackgroundPlaying.current = true;
          backgroundVideoCurrentTime.current = videoRef.current.currentTime;
          videoRef.current.pause();
          setIsBackgroundVideoPaused(true);
          setVideoControls((prev) => ({ ...prev, isPlaying: false }));
        }
      } else {
        // Resume background video when exiting fullscreen if it was playing before
        if (
          wasBackgroundPlaying.current &&
          videoRef.current &&
          isBackgroundVideoPaused
        ) {
          videoRef.current.currentTime = backgroundVideoCurrentTime.current;
          videoRef.current
            .play()
            .then(() => {
              setVideoControls((prev) => ({ ...prev, isPlaying: true }));
              setIsBackgroundVideoPaused(false);
              wasBackgroundPlaying.current = false;
            })
            .catch(() => {
              setVideoControls((prev) => ({ ...prev, isPlaying: false }));
            });
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange,
      );
      document.removeEventListener(
        'mozfullscreenchange',
        handleFullscreenChange,
      );
      document.removeEventListener(
        'MSFullscreenChange',
        handleFullscreenChange,
      );
    };
  }, [isBackgroundVideoPaused]);

  // Handle popup video open/close - PAUSE BACKGROUND VIDEO
  useEffect(() => {
    if (showVideoPopup && !isMobile) {
      // Pause background video when popup opens
      if (videoRef.current && !videoRef.current.paused) {
        wasBackgroundPlaying.current = true;
        backgroundVideoCurrentTime.current = videoRef.current.currentTime;
        videoRef.current.pause();
        setIsBackgroundVideoPaused(true);
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
    } else {
      // Resume background video when popup closes if it was playing before
      if (
        wasBackgroundPlaying.current &&
        videoRef.current &&
        isBackgroundVideoPaused
      ) {
        videoRef.current.currentTime = backgroundVideoCurrentTime.current;
        videoRef.current
          .play()
          .then(() => {
            setVideoControls((prev) => ({ ...prev, isPlaying: true }));
            setIsBackgroundVideoPaused(false);
            wasBackgroundPlaying.current = false;
          })
          .catch(() => {
            setVideoControls((prev) => ({ ...prev, isPlaying: false }));
          });
      }
    }
  }, [showVideoPopup, isBackgroundVideoPaused, isMobile]);

  // Video handlers
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current || isMobile) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setVideoControls((prev) => ({ ...prev, isPlaying: true })))
        .catch((err) => console.log('Play failed:', err));
    } else {
      videoRef.current.pause();
      setVideoControls((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [isMobile]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current || isMobile) return;
    const newMuted = !videoControls.isMuted;
    videoRef.current.muted = newMuted;
    setVideoControls((prev) => ({ ...prev, isMuted: newMuted }));
  }, [videoControls.isMuted, isMobile]);

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isMobile) return;
      const progress = parseFloat(e.target.value);
      const rounded = Math.round(progress);
      setVideoProgress(rounded);
      if (videoRef.current && videoDuration > 0) {
        videoRef.current.currentTime = (rounded / 100) * videoDuration;
        lastRoundedProgress.current = rounded;
      }
    },
    [videoDuration, isMobile],
  );

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !videoDuration || isMobile) return;

    const now = Date.now();
    if (now - timeUpdateThrottle.current < 250) return;
    timeUpdateThrottle.current = now;

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    animationFrameId.current = requestAnimationFrame(() => {
      if (!videoRef.current) return;
      const raw = (videoRef.current.currentTime / videoDuration) * 100;
      const rounded = Math.round(raw);
      if (Math.abs(rounded - lastRoundedProgress.current) >= 1) {
        setVideoProgress(rounded);
        lastRoundedProgress.current = rounded;
      }
    });
  }, [videoDuration, isMobile]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current && !isMobile) {
      setVideoDuration(videoRef.current.duration);
      setVideoLoaded(true);
      setVideoError(false);
    }
  }, [isMobile]);

  const handleVideoError = useCallback(() => {
    console.error('Video failed to load');
    setVideoError(true);
    setShowVideoElement(false);
  }, []);

  const openControlsPanel = useCallback(() => {
    if (!isMobile) setShowControlsPanel(true);
  }, [isMobile]);

  const closeControlsPanel = useCallback(() => {
    setShowControlsPanel(false);
  }, []);

  const openVideoPopup = useCallback(() => {
    setShowVideoPopup(true);
    closeControlsPanel();
  }, [closeControlsPanel]);

  const closeVideoPopup = useCallback(() => {
    setShowVideoPopup(false);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current || isMobile) return;
    const container = videoRef.current.parentElement;
    if (!container) return;
    if (!videoControls.isFullscreen) {
      container.requestFullscreen?.();
      setVideoControls((prev) => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen?.();
      setVideoControls((prev) => ({ ...prev, isFullscreen: false }));
    }
  }, [videoControls.isFullscreen, isMobile]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        if (showVideoPopup) closeVideoPopup();
        if (showControlsPanel) closeControlsPanel();
      }
    },
    [showVideoPopup, closeVideoPopup, showControlsPanel, closeControlsPanel],
  );

  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const stableVideoProgress = useMemo(
    () => Math.round(videoProgress),
    [videoProgress],
  );

  // Force remove video on mobile - mutation observer for safety
  useEffect(() => {
    const forceRemoveVideoOnMobile = () => {
      if (isMobile) {
        const videos = document.querySelectorAll('.hp-stage__video');
        videos.forEach((video) => {
          if (video && video.parentNode) {
            video.remove();
          }
        });
      }
    };

    forceRemoveVideoOnMobile();

    const observer = new MutationObserver(() => {
      forceRemoveVideoOnMobile();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [isMobile]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', checkIfMobile);
    window.addEventListener('orientationchange', checkIfMobile);

    // Initial check
    checkIfMobile();

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', checkIfMobile);
      window.removeEventListener('orientationchange', checkIfMobile);
    };
  }, [handleKeyPress, checkIfMobile]);

  useEffect(() => {
    document.body.style.overflow = showVideoPopup ? 'hidden' : '';
  }, [showVideoPopup]);

  if (isLoading) {
    return (
      <div className='hp-loading'>
        <div className='hp-loading__spinner' />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className='hp-root'>
      <div
        className='hp-stage'
        onDragEnter={isAdmin ? handleDrag : undefined}
        onDragLeave={isAdmin ? handleDrag : undefined}
        onDragOver={isAdmin ? handleDrag : undefined}
        onDrop={isAdmin ? handleDrop : undefined}
      >
        {/* Background Image - ALWAYS RENDERED - never conditionally hidden */}
        <div className='hp-stage__background-image' />

        {/* Video - ONLY on desktop, NEVER on mobile */}
        {!isMobile && promoVideoUrl && !videoError && showVideoElement && (
          <video
            ref={videoRef}
            className='hp-stage__video'
            src={promoVideoUrl}
            autoPlay
            muted={videoControls.isMuted}
            loop
            playsInline
            preload='auto'
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleVideoError}
          />
        )}

        <div className='hp-overlay'>
          <HomeTileRenderer pageSlug='home' />
        </div>

        {/* Video Controls - ONLY on desktop */}
        {!isMobile && promoVideoUrl && !videoError && showVideoElement && (
          <>
            {!showControlsPanel && (
              <button
                className='hp-controls-open'
                onClick={openControlsPanel}
                aria-label='Open Video Controls'
                title='Video Controls'
              >
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                >
                  <path d='M8 5v14l11-7z' />
                </svg>
              </button>
            )}

            <div
              className={`hp-controls ${showControlsPanel ? 'hp-controls--visible' : ''}`}
            >
              <div className='hp-controls__panel'>
                <div className='hp-controls__progress'>
                  <input
                    type='range'
                    min='0'
                    max='100'
                    value={stableVideoProgress}
                    onChange={handleProgressChange}
                    className='hp-controls__slider'
                    style={{
                      background: `linear-gradient(to right, rgba(255,255,255,0.95) ${stableVideoProgress}%, rgba(255,255,255,0.2) ${stableVideoProgress}%)`,
                    }}
                  />
                </div>
                <div className='hp-controls__row'>
                  <div className='hp-controls__left'>
                    <button
                      className='hp-ctrl-btn'
                      onClick={togglePlayPause}
                      aria-label={videoControls.isPlaying ? 'Pause' : 'Play'}
                    >
                      {videoControls.isPlaying ? (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <rect x='6' y='5' width='4' height='14' rx='1' />
                          <rect x='14' y='5' width='4' height='14' rx='1' />
                        </svg>
                      ) : (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <path d='M8 5v14l11-7z' />
                        </svg>
                      )}
                    </button>
                    <button
                      className='hp-ctrl-btn'
                      onClick={toggleMute}
                      aria-label={videoControls.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {videoControls.isMuted ? (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <path d='M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zM3 9v6h4l5 5V4L7 9H3z' />
                        </svg>
                      ) : (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' />
                        </svg>
                      )}
                    </button>
                    <span className='hp-controls__time'>
                      {formatTime((stableVideoProgress / 100) * videoDuration)}
                      <span className='hp-controls__sep'>/</span>
                      {formatTime(videoDuration)}
                    </span>
                  </div>
                  <div className='hp-controls__right'>
                    <button
                      className='hp-ctrl-btn'
                      onClick={openVideoPopup}
                      aria-label='Open in popup'
                      title='Expand'
                    >
                      <svg
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='currentColor'
                      >
                        <path d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' />
                      </svg>
                    </button>
                    <button
                      className='hp-ctrl-btn'
                      onClick={toggleFullscreen}
                      aria-label={
                        videoControls.isFullscreen
                          ? 'Exit fullscreen'
                          : 'Fullscreen'
                      }
                      title={
                        videoControls.isFullscreen
                          ? 'Exit Fullscreen'
                          : 'Fullscreen'
                      }
                    >
                      {videoControls.isFullscreen ? (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <path d='M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z' />
                        </svg>
                      ) : (
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='currentColor'
                        >
                          <path d='M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z' />
                        </svg>
                      )}
                    </button>
                    <button
                      className='hp-ctrl-btn hp-ctrl-btn--close'
                      onClick={closeControlsPanel}
                      aria-label='Close controls'
                      title='Close'
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
                </div>
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <input
              ref={videoFileInputRef}
              type='file'
              accept='video/mp4,video/webm,video/ogg,video/quicktime'
              style={{ display: 'none' }}
              onChange={handleVideoFileChange}
            />
            <button
              className={`hp-admin-toggle ${showAdminPanel ? 'is-active' : ''}`}
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              title='Video Management'
            >
              <i
                className={`ti ${promoVideoUrl ? 'ti-video' : 'ti-video-plus'}`}
              />
            </button>
            {showAdminPanel && (
              <div className='hp-admin-panel'>
                <div className='hp-admin-panel__header'>
                  <h4>Video Management</h4>
                </div>
                <div className='hp-admin-panel__body'>
                  <div className='hp-admin-panel__status'>
                    <span>Status</span>
                    <span
                      className={promoVideoUrl ? 'is-active' : 'is-inactive'}
                    >
                      {promoVideoUrl ? 'Video Active' : 'No Video'}
                    </span>
                  </div>
                  {uploadSuccess && (
                    <div className='hp-admin-panel__success'>
                      <i className='ti ti-check-circle' /> Operation completed!
                    </div>
                  )}
                  <div
                    className={`hp-admin-panel__dropzone ${dragActive ? 'is-drag-active' : ''}`}
                    onClick={() => videoFileInputRef.current?.click()}
                  >
                    <i className='ti ti-upload' />
                    <p>Click to upload or drag & drop</p>
                    <small>MP4, WebM, OGG, MOV — max 200 MB</small>
                  </div>
                  {videoUploading && (
                    <div className='hp-admin-panel__progress'>
                      <div className='hp-admin-panel__progress-track'>
                        <div
                          className='hp-admin-panel__progress-fill'
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span>
                        {uploadProgress < 100
                          ? `Uploading… ${uploadProgress}%`
                          : 'Processing…'}
                      </span>
                    </div>
                  )}
                  {uploadError && (
                    <div className='hp-admin-panel__error'>
                      <i className='ti ti-alert-circle' />
                      <span>{uploadError}</span>
                      <button onClick={() => setUploadError(null)}>×</button>
                    </div>
                  )}
                  {promoVideoUrl && (
                    <div className='hp-admin-panel__actions'>
                      <button
                        className='hp-admin-btn hp-admin-btn--replace'
                        onClick={() => videoFileInputRef.current?.click()}
                        disabled={videoUploading}
                      >
                        <i className='ti ti-refresh' /> Replace
                      </button>
                      <button
                        className='hp-admin-btn hp-admin-btn--delete'
                        onClick={handleDeletePromoVideo}
                        disabled={videoUploading}
                      >
                        <i className='ti ti-trash' /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {dragActive && (
              <div className='hp-drag-overlay'>
                <i className='ti ti-cloud-upload' />
                <p>Drop your video here</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Video Popup - ONLY on desktop */}
      {!isMobile && showVideoPopup && promoVideoUrl && (
        <div className='hp-popup' onClick={closeVideoPopup}>
          <div className='hp-popup__box' onClick={(e) => e.stopPropagation()}>
            <video
              ref={popupVideoRef}
              src={promoVideoUrl}
              autoPlay
              controls
              playsInline
              className='hp-popup__video'
            />
            <button onClick={closeVideoPopup} className='hp-popup__close-btn'>
              Close
            </button>
          </div>
        </div>
      )}

      <HomeModals />
    </div>
  );
};

export default HomePage;
