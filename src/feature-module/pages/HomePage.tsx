import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import HomeModals from './homeModals';
import HomeTileRenderer from './HomeTileRenderer';
import FormEmbed from '../../components/FormEmbed';
import './HomePage.css';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

interface HomePageProps {
  onSplashClose: () => void;
}

// ─── Arc animation ────────────────────────────────────────────────────────────
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function runArcAnimation(canvas: HTMLCanvasElement): () => void {
  const canvasContext = canvas.getContext('2d');
  if (!canvasContext) return () => {};
  const ctx: CanvasRenderingContext2D = canvasContext;

  const DURATION = 2200; // ms
  let startTime: number | null = null;
  let animId: number;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();

  function draw(ts: number) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const prog = easeOutQuart(t);

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, W, H);

    if (prog > 0) {
      const CX = W / 2;
      const CY = H * 1.1;
      const R = W * 0.52;
      const SWEEP = Math.PI * 1.22;
      const startAngle = Math.PI + (Math.PI - SWEEP) / 2;
      const endAngle = startAngle + SWEEP * prog;

      // Outer glow
      ctx.save();
      ctx.strokeStyle = 'rgba(232, 98, 26, 0.18)';
      ctx.lineWidth = 32;
      ctx.filter = 'blur(14px)';
      ctx.beginPath();
      ctx.arc(CX, CY, R, startAngle, endAngle);
      ctx.stroke();
      ctx.filter = 'none';

      // Mid glow
      ctx.strokeStyle = 'rgba(232, 98, 26, 0.28)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(CX, CY, R, startAngle, endAngle);
      ctx.stroke();

      // Core bright line
      ctx.strokeStyle = 'rgba(255, 210, 160, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CX, CY, R, startAngle, endAngle);
      ctx.stroke();

      // Tip flare
      const tipX = CX + R * Math.cos(endAngle);
      const tipY = CY + R * Math.sin(endAngle);
      const flare = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 28);
      flare.addColorStop(0, 'rgba(255, 220, 160, 0.9)');
      flare.addColorStop(0.3, 'rgba(232, 98, 26, 0.5)');
      flare.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 28, 0, Math.PI * 2);
      ctx.fill();

      // Tip dot
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.restore();
    }

    if (t < 1) {
      animId = requestAnimationFrame(draw);
    }
  }

  animId = requestAnimationFrame(draw);

  return () => cancelAnimationFrame(animId);
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

interface VideoControls {
  isPlaying: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSplashClose }) => {
  const { isLoading, parent } = useAuth();
  const navigate = useNavigate();
  const isAdmin = parent?.role === 'admin';
  const token = localStorage.getItem('token');

  // ── Arc state ───────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [arcDone, setArcDone] = useState(false);
  const [tilesVisible, setTilesVisible] = useState(false);

  // ── Video / upload state ────────────────────────────────────────────────────
  const [promoVideoUrl, setPromoVideoUrl] = useState<string>('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // ── Contact form state ──────────────────────────────────────────────────────
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  // ── Video controls state ────────────────────────────────────────────────────
  const [videoControls, setVideoControls] = useState<VideoControls>({
    isPlaying: false,
    isFullscreen: false,
    isMuted: true,
  });
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  const [isBackgroundVideoPaused, setIsBackgroundVideoPaused] = useState(false);
  const backgroundVideoCurrentTime = useRef<number>(0);
  const wasBackgroundPlaying = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const popupVideoRef = useRef<HTMLVideoElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const lastRoundedProgress = useRef<number>(0);
  const timeUpdateThrottle = useRef<number>(0);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // ── Modal state for forms ───────────────────────────────────────────────────
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Section refs for scroll animations ──────────────────────────────────────
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);

  const setSectionRef = (index: number) => (el: HTMLDivElement | null) => {
    sectionsRef.current[index] = el;
  };

  // ── Arc intro ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced) {
      setArcDone(true);
      return;
    }

    const cancel = runArcAnimation(canvas);
    const timeout = setTimeout(() => setArcDone(true), 800);

    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancel();
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ── Trigger tiles slide-up after arc completes ─────────────────────────────
  useEffect(() => {
    if (arcDone) {
      const timer = setTimeout(() => {
        setTilesVisible(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [arcDone]);

  // ── Mobile detection ────────────────────────────────────────────────────────
  const checkIfMobile = useCallback(() => {
    const mobileWidth = window.innerWidth <= 768;
    const mobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const isMobileDevice = mobileWidth || mobileUA;
    setIsMobile(isMobileDevice);
    return isMobileDevice;
  }, []);

  // ── Preload background image ────────────────────────────────────────────────
  const preloadBackgroundImage = useCallback(() => {
    const img = new Image();
    img.src = '/assets/img/bg/bg_main.png';
    img.onload = () => console.log('Background image loaded');
    img.onerror = () => console.log('Background image failed to load');
  }, []);

  // ── Fetch promo video URL ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchPromoVideo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/upload/promo-video`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.videoUrl) {
          const urlWithCache = `${data.videoUrl}?t=${Date.now()}`;
          setPromoVideoUrl(urlWithCache);
          setVideoLoaded(true);
        } else {
          setVideoLoaded(false);
        }
      } catch (err) {
        console.error('Could not fetch promo video URL:', err);
        setVideoLoaded(false);
      }
    };

    preloadBackgroundImage();
    fetchPromoVideo();
  }, [preloadBackgroundImage]);

  // ── Contact form handlers ───────────────────────────────────────────────────
  const handleContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setContactFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingContact(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactFormData),
      });

      if (response.ok) {
        setShowContactSuccess(true);
        setContactFormData({
          fullName: '',
          email: '',
          subject: '',
          message: '',
        });

        setTimeout(() => {
          setShowContactSuccess(false);
        }, 5000);
      } else {
        const errorData = await response.json();
        console.error('Error sending message:', errorData);
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Something went wrong. Please try again later.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // ── Modal handlers ──────────────────────────────────────────────────────────
  const openFormModal = (formId: string) => {
    setSelectedFormId(formId);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setSelectedFormId(null);
    document.body.style.overflow = '';
  };

  // ── Admin video upload ──────────────────────────────────────────────────────
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
          setVideoLoaded(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } else throw new Error('No video URL returned from server');
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload video');
      } finally {
        setVideoUploading(false);
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      }
    },
    [token, videoControls.isPlaying],
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
      setVideoLoaded(false);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(`Failed to remove video: ${err.message}`);
    } finally {
      setVideoUploading(false);
    }
  }, [token]);

  // ── Fullscreen change handler ───────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setVideoControls((prev) => ({ ...prev, isFullscreen }));

      if (isFullscreen) {
        if (videoRef.current && !videoRef.current.paused) {
          wasBackgroundPlaying.current = true;
          backgroundVideoCurrentTime.current = videoRef.current.currentTime;
          videoRef.current.pause();
          setIsBackgroundVideoPaused(true);
          setVideoControls((prev) => ({ ...prev, isPlaying: false }));
        }
      } else {
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

  // ── Popup video open/close — pause/resume background video ─────────────────
  useEffect(() => {
    if (showVideoPopup && !isMobile) {
      if (videoRef.current && !videoRef.current.paused) {
        wasBackgroundPlaying.current = true;
        backgroundVideoCurrentTime.current = videoRef.current.currentTime;
        videoRef.current.pause();
        setIsBackgroundVideoPaused(true);
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
    } else {
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

  // ── Video controls ──────────────────────────────────────────────────────────
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
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVideoLoaded(true);
      setVideoError(false);
    }
  }, []);

  const handleVideoError = useCallback(() => {
    console.error('Video failed to load');
    setVideoError(true);
    setVideoLoaded(false);
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
        if (isModalOpen) closeFormModal();
      }
    },
    [
      showVideoPopup,
      closeVideoPopup,
      showControlsPanel,
      closeControlsPanel,
      isModalOpen,
    ],
  );

  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds) || !seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const stableVideoProgress = useMemo(
    () => Math.round(videoProgress),
    [videoProgress],
  );

  // ── Cleanup animation frame on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // ── Intersection observer for section visibility ────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('hp-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    const currentSections = sectionsRef.current;
    currentSections.forEach((s) => {
      if (s) {
        observer.observe(s);
        const rect = s.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          s.classList.add('hp-visible');
        }
      }
    });

    return () => observer.disconnect();
  }, []);

  // ── Global event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('resize', checkIfMobile);
    window.addEventListener('orientationchange', checkIfMobile);

    checkIfMobile();

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', checkIfMobile);
      window.removeEventListener('orientationchange', checkIfMobile);
    };
  }, [handleKeyPress, checkIfMobile]);

  useEffect(() => {
    document.body.style.overflow =
      showVideoPopup || isModalOpen ? 'hidden' : '';
  }, [showVideoPopup, isModalOpen]);

  if (isLoading) {
    return (
      <div className='hp-loading'>
        <div className='hp-loading__spinner' />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div
      className='hp-root'
      onDragEnter={isAdmin ? handleDrag : undefined}
      onDragLeave={isAdmin ? handleDrag : undefined}
      onDragOver={isAdmin ? handleDrag : undefined}
      onDrop={isAdmin ? handleDrop : undefined}
    >
      {/* ─── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className='hp-hero' ref={heroRef}>
        <div className='hp-hero__bg-wrapper'>
          <img
            ref={bgRef}
            src='/assets/img/theme/bg-main.png'
            alt='Basketball court background'
            className='hp-hero__bg'
          />
        </div>
        <div className='hp-hero__overlay' />

        <canvas
          ref={canvasRef}
          className={`hp-arc-canvas ${arcDone ? 'hp-arc-canvas--done' : ''}`}
        />

        {!isMobile && promoVideoUrl && videoLoaded && !videoError && (
          <video
            ref={videoRef}
            className='hp-stage__video'
            src={promoVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload='metadata'
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleVideoError}
          />
        )}

        <div
          className={`hp-hero__background-image ${arcDone ? 'hp-hero__background-image--visible' : ''}`}
        />

        <div className={`hp-spark ${arcDone ? 'hp-spark--active' : ''}`} />

        <div className='hp-hero__inner'>
          <div className='hp-hero__content'>
            <div className='hp-hero__eyebrow'>
              <span className='hp-hero__eyebrow-dot' />
              Elite Basketball Training
            </div>
            <h1 className='hp-hero__title'>
              <span className='hp-hero__word'>Develop</span>{' '}
              <span className='hp-hero__word'>Excellence</span>{' '}
              <span className='hp-hero__word'>On &amp;</span>{' '}
              <span className='hp-hero__word'>Off</span>{' '}
              <span className='hp-hero__word'>The Court</span>
            </h1>
            <p className='hp-hero__body'>
              Join Bothell Select Basketball — where passion meets purpose.
              Elite coaching, character development, and a community that
              champions your journey.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TILES SECTION ────────────────────────────────────────────────────── */}
      <section className='hp-tiles-section'>
        <div className={`hp-tiles-container ${tilesVisible ? 'slide-up' : ''}`}>
          <HomeTileRenderer pageSlug='home' />
        </div>
      </section>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className='hp-main'>
        <div className='hp-cut-dark hero' aria-hidden='true' />

        <div className='hp-main__content'>
          {/* ─── VIDEO SECTION ────────────────────────────────────────────── */}
          {!isMobile && promoVideoUrl && !videoError && videoLoaded && (
            <section
              className='hp-section hp-section--video hp-visible'
              ref={setSectionRef(0)}
            >
              <div className='hp-section__inner'>
                <header className='hp-section__head'>
                  <span className='hp-section__label'>Watch</span>
                  <h2 className='hp-section__title'>Program Highlights</h2>
                  <p className='hp-section__sub'>
                    Experience the energy and excellence of Bothell Select
                    Basketball
                  </p>
                </header>
                <div className='hp-video-wrapper'>
                  <video
                    ref={videoRef}
                    className={`hp-video__player ${videoLoaded ? 'hp-video__player--loaded' : ''}`}
                    src={promoVideoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload='metadata'
                    onLoadedMetadata={handleLoadedMetadata}
                    onError={handleVideoError}
                    onTimeUpdate={handleTimeUpdate}
                  />

                  {!showControlsPanel && (
                    <>
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
                    </>
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
                            aria-label={
                              videoControls.isPlaying ? 'Pause' : 'Play'
                            }
                          >
                            {videoControls.isPlaying ? (
                              <svg
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='currentColor'
                              >
                                <rect
                                  x='6'
                                  y='5'
                                  width='4'
                                  height='14'
                                  rx='1'
                                />
                                <rect
                                  x='14'
                                  y='5'
                                  width='4'
                                  height='14'
                                  rx='1'
                                />
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
                            aria-label={
                              videoControls.isMuted ? 'Unmute' : 'Mute'
                            }
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
                            {formatTime(
                              (stableVideoProgress / 100) * videoDuration,
                            )}
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

                  {!videoLoaded && (
                    <div className='hp-video__shimmer'>
                      <div className='hp-video__shimmer-inner' />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ─── ABOUT SECTION ────────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--about'
            ref={setSectionRef(1)}
          >
            <div className='hp-cut' aria-hidden='true' />
            <div className='hp-section__inner'>
              <div className='hp-about-wrapper'>
                <div className='hp-about-image'>
                  <img
                    src='/assets/img/aboutus-state.png'
                    alt='Bothell Select Basketball'
                    className='hp-about'
                  />
                  {/* <div className='hp-about-stats'>
                    <div className='hp-stat-card'>
                      <div className='hp-stat-number'>10+</div>
                      <div className='hp-stat-label'>Years of Excellence</div>
                    </div>
                    <div className='hp-stat-card'>
                      <div className='hp-stat-number'>200+</div>
                      <div className='hp-stat-label'>Players Developed</div>
                    </div>
                    <div className='hp-stat-card'>
                      <div className='hp-stat-number'>15+</div>
                      <div className='hp-stat-label'>College Scholarships</div>
                    </div>
                    <div className='hp-stat-card'>
                      <div className='hp-stat-number'>100%</div>
                      <div className='hp-stat-label'>Commitment to Growth</div>
                    </div>
                  </div> */}
                </div>
                <div className='hp-about-content'>
                  <header className='hp-section__head'>
                    <span className='hp-section__label'>
                      Where Passion, Growth, and Basketball Come Together
                    </span>
                    <h2 className='hp-section__title'>About Bothell Select</h2>
                    <p className='hp-section__sub'>
                      Building Champions On and Off the Court
                    </p>
                  </header>
                  <div className='hp-about-text'>
                    <p className='hp-about-paragraph'>
                      Join a thriving basketball community where passion,
                      teamwork, and player development come together. Learn from
                      experienced coaches, build lasting friendships, and
                      elevate your game in a fun, competitive, and supportive
                      environment.
                    </p>
                    <div className='hp-about-highlights'>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
                          <polyline points='22 4 12 14.01 9 11.01' />
                        </svg>
                        <span>Elite Training Programs</span>
                      </div>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                          <circle cx='12' cy='7' r='4' />
                        </svg>
                        <span>Expert Coaching Staff</span>
                      </div>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
                          <circle cx='9' cy='7' r='4' />
                          <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
                          <path d='M16 3.13a4 4 0 0 1 0 7.75' />
                        </svg>
                        <span>Youth Development Focus</span>
                      </div>
                      <div className='hp-highlight-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M12 2L2 7l10 5 10-5-10-5z' />
                          <path d='M2 17l10 5 10-5' />
                          <path d='M2 12l10 5 10-5' />
                        </svg>
                        <span>Competitive League Play</span>
                      </div>
                    </div>
                    <p className='hp-about-paragraph'>
                      Whether you're looking for your young athlete to sharpen
                      their skills, gain confidence on the court, or simply
                      enjoy the game they love, our programs deliver an
                      experience your kids will never forget.
                    </p>
                    <div className='hp-about-cta'>
                      <button
                        className='hp-btn-primary'
                        onClick={() => navigate('/about-us')}
                      >
                        Learn More About Us
                        <svg
                          width='18'
                          height='18'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M5 12h14M12 5l7 7-7 7' />
                        </svg>
                      </button>
                      <button
                        className='hp-btn-secondary'
                        onClick={() => navigate('/contact-us')}
                      >
                        Contact Us
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── CONTACT SECTION ───────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--contact'
            ref={setSectionRef(2)}
          >
            <div className='hp-cut-reverse-dark' aria-hidden='true' />
            <div className='hp-section__inner'>
              <div className='hp-contact-wrapper'>
                <div className='hp-contact-content'>
                  <header className='hp-section__head'>
                    <span className='hp-section__label'>
                      Get in Touch With Us
                    </span>
                    <h2 className='hp-section__title'>
                      Contact Bothell Select
                    </h2>
                    <p className='hp-section__sub'>
                      We're Here to Answer Your Questions
                    </p>
                  </header>

                  <div className='hp-contact-text'>
                    <p className='hp-contact-paragraph'>
                      Have questions about our programs, registration, or
                      upcoming events? Our team is ready to assist you. Reach
                      out to us through any of the channels below or fill out
                      the contact form.
                    </p>

                    <div className='hp-contact-methods'>
                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z' />
                        </svg>
                        <div>
                          <h4>Phone</h4>
                          <p>(425) 375-5235</p>
                        </div>
                      </div>

                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
                          <polyline points='22,6 12,13 2,6' />
                        </svg>
                        <div>
                          <h4>Email</h4>
                          <p>bothellselect@proton.me</p>
                        </div>
                      </div>

                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <rect x='2' y='4' width='20' height='16' rx='2' />
                          <path d='M22 7l-10 7L2 7' />
                        </svg>
                        <div>
                          <h4>Hours</h4>
                          <p>
                            Mon-Fri: 9am - 6pm
                            <br />
                            Sat: 10am - 4pm
                          </p>
                        </div>
                      </div>

                      <div className='hp-contact-item'>
                        <svg
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' />
                          <circle cx='12' cy='10' r='3' />
                        </svg>
                        <div>
                          <h4>Location</h4>
                          <p>Bothell, WA</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='hp-contact-image'>
                  <div className='hp-contact-logo-wrapper'>
                    <div className='hp-contact-form'>
                      {showContactSuccess ? (
                        <div className='hp-contact-success-message'>
                          <div className='hp-contact-success-icon'>
                            <svg
                              width='48'
                              height='48'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                            >
                              <circle cx='12' cy='12' r='10' />
                              <path d='M8 12l3 3 6-6' />
                            </svg>
                          </div>
                          <h3>Message Sent Successfully!</h3>
                          <p>
                            Thank you for reaching out. We've received your
                            message and will get back to you shortly!
                          </p>
                        </div>
                      ) : (
                        <>
                          <h3>Send Us a Message</h3>
                          <form onSubmit={handleContactSubmit}>
                            <div className='hp-form-row'>
                              <div className='hp-form-group'>
                                <input
                                  type='text'
                                  name='fullName'
                                  value={contactFormData.fullName}
                                  onChange={handleContactChange}
                                  placeholder='Your Name'
                                  required
                                />
                              </div>
                              <div className='hp-form-group'>
                                <input
                                  type='email'
                                  name='email'
                                  value={contactFormData.email}
                                  onChange={handleContactChange}
                                  placeholder='Your Email'
                                  required
                                />
                              </div>
                            </div>
                            <div className='hp-form-group'>
                              <input
                                type='text'
                                name='subject'
                                value={contactFormData.subject}
                                onChange={handleContactChange}
                                placeholder='Subject'
                                required
                              />
                            </div>
                            <div className='hp-form-group'>
                              <textarea
                                name='message'
                                value={contactFormData.message}
                                onChange={handleContactChange}
                                rows={4}
                                placeholder='Your Message'
                                required
                              ></textarea>
                            </div>
                            <button
                              type='submit'
                              className='hp-btn-primary'
                              disabled={isSubmittingContact}
                            >
                              {isSubmittingContact
                                ? 'Sending...'
                                : 'Send Message'}
                              <svg
                                width='18'
                                height='18'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                              >
                                <path d='M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' />
                              </svg>
                            </button>
                          </form>
                          <p className='hp-contact-footer-text'>
                            We typically respond within 24-48 hours. For urgent
                            matters, please call us directly.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className='hp-footer-band'>
          <span>Bothell Select</span>
          <span className='hp-footer-band__sep'>·</span>
          <span>Developing champions on and off the court</span>
        </div>
      </main>

      {/* FORM MODAL */}
      {isModalOpen && selectedFormId && (
        <div className='hp-modal-overlay' onClick={closeFormModal}>
          <div className='hp-modal' onClick={(e) => e.stopPropagation()}>
            <div className='hp-modal__header'>
              <h3>Complete Form</h3>
              <button className='hp-modal__close' onClick={closeFormModal}>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M18 6L6 18M6 6l12 12' />
                </svg>
              </button>
            </div>
            <div className='hp-modal__body'>
              <FormEmbed
                formId={selectedFormId}
                isActive={true}
                wrapperClassName='hp-modal-form'
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── VIDEO POPUP ─────────────────────────────────────────────────────── */}
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

      {/* ─── ADMIN PANEL ────────────────────────────────────────────────────── */}
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
                  <span className={promoVideoUrl ? 'is-active' : 'is-inactive'}>
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
                  <p>Click to upload or drag &amp; drop</p>
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

      <HomeModals />
    </div>
  );
};

export default HomePage;
