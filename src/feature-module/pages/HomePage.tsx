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
  const [videoError, setVideoError] = useState(false);

  const [videoControls, setVideoControls] = useState<VideoControls>({
    isPlaying: false,
    isFullscreen: false,
    isMuted: true,
  });
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  // Track if background video should be paused
  const [isBackgroundVideoPaused, setIsBackgroundVideoPaused] = useState(false);
  const backgroundVideoCurrentTime = useRef<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const popupVideoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastRoundedProgress = useRef<number>(0);
  const timeUpdateThrottle = useRef<number>(0);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Check mobile
  const checkIfMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  // Fetch promo video
  useEffect(() => {
    const fetchPromoVideo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/upload/promo-video`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.videoUrl) {
          setPromoVideoUrl(`${data.videoUrl}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error('Failed to fetch promo video:', err);
      }
    };
    fetchPromoVideo();
  }, []);

  // Mobile detection
  useEffect(() => {
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [checkIfMobile]);

  // Handle fullscreen change events
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
          backgroundVideoCurrentTime.current = videoRef.current.currentTime;
          videoRef.current.pause();
          setIsBackgroundVideoPaused(true);
          setVideoControls((prev) => ({ ...prev, isPlaying: false }));
        }
      } else {
        // Resume background video when exiting fullscreen if it was playing before
        if (isBackgroundVideoPaused && videoRef.current) {
          videoRef.current.currentTime = backgroundVideoCurrentTime.current;
          videoRef.current
            .play()
            .then(() => {
              setVideoControls((prev) => ({ ...prev, isPlaying: true }));
              setIsBackgroundVideoPaused(false);
            })
            .catch(() => {
              // Autoplay might be blocked, set playing state to false
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

  // Handle popup video open/close
  useEffect(() => {
    if (showVideoPopup) {
      // Pause background video when popup opens
      if (videoRef.current && !videoRef.current.paused) {
        backgroundVideoCurrentTime.current = videoRef.current.currentTime;
        videoRef.current.pause();
        setIsBackgroundVideoPaused(true);
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
    } else {
      // Resume background video when popup closes if it was playing before
      if (isBackgroundVideoPaused && videoRef.current) {
        videoRef.current.currentTime = backgroundVideoCurrentTime.current;
        videoRef.current
          .play()
          .then(() => {
            setVideoControls((prev) => ({ ...prev, isPlaying: true }));
            setIsBackgroundVideoPaused(false);
          })
          .catch(() => {
            // Autoplay might be blocked
            setVideoControls((prev) => ({ ...prev, isPlaying: false }));
          });
      }
    }
  }, [showVideoPopup, isBackgroundVideoPaused]);

  // Video handlers
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setVideoControls((prev) => ({ ...prev, isPlaying: true }));
      });
    } else {
      videoRef.current.pause();
      setVideoControls((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !videoControls.isMuted;
    videoRef.current.muted = newMuted;
    setVideoControls((prev) => ({ ...prev, isMuted: newMuted }));
  }, [videoControls.isMuted]);

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const progress = parseFloat(e.target.value);
      setVideoProgress(progress);
      if (videoRef.current && videoDuration > 0) {
        videoRef.current.currentTime = (progress / 100) * videoDuration;
      }
    },
    [videoDuration],
  );

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !videoDuration) return;
    const now = Date.now();
    if (now - timeUpdateThrottle.current < 250) return;
    timeUpdateThrottle.current = now;

    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);

    animationFrameId.current = requestAnimationFrame(() => {
      if (!videoRef.current) return;
      const progress = (videoRef.current.currentTime / videoDuration) * 100;
      const rounded = Math.round(progress);
      if (Math.abs(rounded - lastRoundedProgress.current) >= 1) {
        setVideoProgress(rounded);
        lastRoundedProgress.current = rounded;
      }
    });
  }, [videoDuration]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  const openControlsPanel = () => setShowControlsPanel(true);
  const closeControlsPanel = () => setShowControlsPanel(false);

  const openVideoPopup = useCallback(() => {
    setShowVideoPopup(true);
  }, []);

  const closeVideoPopup = useCallback(() => {
    setShowVideoPopup(false);
    // Also exit fullscreen if it was active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    const container = document.querySelector('.hp-stage');
    if (container) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      }
    }
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
      <div className='hp-stage'>
        {/* Video - Only on Desktop */}
        {!isMobile && promoVideoUrl && !videoError && (
          <video
            ref={videoRef}
            className='hp-stage__video'
            src={promoVideoUrl}
            autoPlay
            muted={videoControls.isMuted}
            loop
            playsInline
            preload='metadata'
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setVideoError(true)}
          />
        )}

        {/* Tiles Overlay */}
        <div className='hp-overlay'>
          <HomeTileRenderer pageSlug='home' />
        </div>

        <div className='hp-stage__top-stripe-enhanced' />
        <div className='hp-stage__bottom-stripe-enhanced' />

        <div className='hp-stage__logo'>
          <ImageWithBasePath
            src='assets/img/watermark-logo.png'
            alt='Bothell Select AAU Basketball'
            className='hp-stage__logo-img'
          />
        </div>

        {/* Video Controls - Only Desktop */}
        {!isMobile && promoVideoUrl && !videoError && (
          <>
            <button
              className='hp-controls-open'
              onClick={openControlsPanel}
              aria-label='Open Video Controls'
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

            <div
              className={`hp-controls ${showControlsPanel ? 'hp-controls--visible' : ''}`}
            >
              <div className='hp-controls__panel'>
                <div className='hp-controls__progress'>
                  <input
                    type='range'
                    min='0'
                    max='100'
                    value={Math.round(videoProgress)}
                    onChange={handleProgressChange}
                    className='hp-controls__slider'
                  />
                </div>
                <div className='hp-controls__row'>
                  <div className='hp-controls__left'>
                    <button className='hp-ctrl-btn' onClick={togglePlayPause}>
                      {videoControls.isPlaying ? '❚❚' : '▶'}
                    </button>
                    <button className='hp-ctrl-btn' onClick={toggleMute}>
                      {videoControls.isMuted ? '🔇' : '🔊'}
                    </button>
                    <span className='hp-controls__time'>
                      {formatTime(
                        (Math.round(videoProgress) / 100) * videoDuration,
                      )}{' '}
                      / {formatTime(videoDuration)}
                    </span>
                  </div>
                  <div className='hp-controls__right'>
                    <button className='hp-ctrl-btn' onClick={openVideoPopup}>
                      ⤢
                    </button>
                    <button className='hp-ctrl-btn' onClick={enterFullscreen}>
                      ⛶
                    </button>
                    <button
                      className='hp-ctrl-btn hp-ctrl-btn--close'
                      onClick={closeControlsPanel}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Admin Panel */}
        {isAdmin && (
          /* ... keep your existing admin panel code ... */
          <div>Your admin panel code here...</div>
        )}
      </div>

      {/* Video Popup */}
      {showVideoPopup && promoVideoUrl && (
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
