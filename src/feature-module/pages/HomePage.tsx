import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import HomeModals from './homeModals';
import HomeTileRenderer from './HomeTileRenderer';
import FormEmbed from '../../components/FormEmbed';
import './HomePage.css';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

interface HomePageProps {
  onSplashClose: () => void;
}

// ─── Arc animation (unchanged) ───────────────────────────────────────────────
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function runArcAnimation(canvas: HTMLCanvasElement): () => void {
  const canvasContext = canvas.getContext('2d');
  if (!canvasContext) return () => {};
  const ctx: CanvasRenderingContext2D = canvasContext;

  const DURATION = 2200;
  let startTime: number | null = null;
  let animId: number;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();

  const offscreen = document.createElement('canvas');
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const octx = offscreen.getContext('2d')!;

  function draw(ts: number) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const prog = easeOutQuart(t);

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    if (prog > 0) {
      const CX = W / 2;
      const CY = H * 1.1;
      const R = W * 0.52;
      const SWEEP = Math.PI * 1.22;
      const startAngle = Math.PI + (Math.PI - SWEEP) / 2;
      const endAngle = startAngle + SWEEP * prog;

      offscreen.width = W;
      offscreen.height = H;
      octx.clearRect(0, 0, W, H);
      octx.strokeStyle = 'rgba(232, 98, 26, 0.18)';
      octx.lineWidth = 32;
      octx.beginPath();
      octx.arc(CX, CY, R, startAngle, endAngle);
      octx.stroke();
      ctx.filter = 'blur(14px)';
      ctx.drawImage(offscreen, 0, 0);
      ctx.filter = 'none';

      ctx.strokeStyle = 'rgba(232, 98, 26, 0.28)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(CX, CY, R, startAngle, endAngle);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 210, 160, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CX, CY, R, startAngle, endAngle);
      ctx.stroke();

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

      ctx.beginPath();
      ctx.arc(tipX, tipY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }

    if (t < 1) {
      animId = requestAnimationFrame(draw);
    }
  }

  animId = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(animId);
}

interface VideoControlsState {
  isPlaying: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSplashClose }) => {
  const { isLoading, parent } = useAuth();
  const navigate = useNavigate();
  const isAdmin = parent?.role === 'admin';
  const token = localStorage.getItem('token');

  // ── State ──────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [arcDone, setArcDone] = useState(false);
  const [tilesVisible, setTilesVisible] = useState(false);

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

  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  const [videoControls, setVideoControls] = useState<VideoControlsState>({
    isPlaying: false,
    isFullscreen: false,
    isMuted: true,
  });
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showVideoPopup, setShowVideoPopup] = useState(false);

  // ── Scroll to registration tile ──────────────────────────────────────────
  const [scrollToTileIndex, setScrollToTileIndex] = useState<number | null>(
    null,
  );
  const tileWrapperRef = useRef<HTMLDivElement>(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const sectionVideoRef = useRef<HTMLVideoElement | null>(null);
  const popupVideoRef = useRef<HTMLVideoElement | null>(null);

  const backgroundVideoCurrentTime = useRef<number>(0);
  const wasBackgroundPlaying = useRef<boolean>(false);
  const isBackgroundVideoPausedRef = useRef<boolean>(false);
  const userPausedSectionVideoRef = useRef<boolean>(false);
  const isHeroVideoPausedByUserRef = useRef<boolean>(false);

  const animationFrameId = useRef<number | null>(null);
  const lastRoundedProgress = useRef<number>(0);
  const timeUpdateThrottle = useRef<number>(0);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const videoSectionRef = useRef<HTMLDivElement | null>(null);
  const valueSectionRef = useRef<HTMLDivElement | null>(null);

  const setSectionRef0 = useCallback((el: HTMLDivElement | null) => {
    sectionsRef.current[0] = el;
    videoSectionRef.current = el;
  }, []);
  const setSectionRef1 = useCallback((el: HTMLDivElement | null) => {
    sectionsRef.current[1] = el;
  }, []);
  const setSectionRef2 = useCallback((el: HTMLDivElement | null) => {
    sectionsRef.current[2] = el;
  }, []);
  const setValueSectionRef = useCallback((el: HTMLDivElement | null) => {
    valueSectionRef.current = el;
  }, []);

  // ── Effects ──────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!arcDone) return;
    const timer = setTimeout(() => setTilesVisible(true), 400);
    return () => clearTimeout(timer);
  }, [arcDone]);

  // ── FIXED: scroll to tile AND open it (simulate click) ──────────────────
  useEffect(() => {
    if (
      scrollToTileIndex === null ||
      !tilesVisible ||
      !tileWrapperRef.current
    ) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    const interval = 500;

    const tryScrollAndClick = () => {
      const container = tileWrapperRef.current;
      if (!container) {
        setScrollToTileIndex(null);
        return;
      }

      const tiles = container.querySelectorAll('.htr-tile');
      const targetTile = tiles[scrollToTileIndex] as HTMLElement;

      if (targetTile) {
        // Scroll to the tile
        targetTile.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // After a short delay (to let the scroll begin), click the tile to open it
        setTimeout(() => {
          targetTile.click();
        }, 400);

        setScrollToTileIndex(null);
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(tryScrollAndClick, interval);
        } else {
          setScrollToTileIndex(null);
        }
      }
    };

    // Start the first attempt after a tiny delay
    const timer = setTimeout(tryScrollAndClick, 100);
    return () => clearTimeout(timer);
  }, [scrollToTileIndex, tilesVisible]);

  const checkIfMobile = useCallback(() => {
    const mobileWidth = window.innerWidth <= 768;
    const mobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const next = mobileWidth || mobileUA;
    setIsMobile((prev) => (prev === next ? prev : next));
    return next;
  }, []);

  const preloadBackgroundImage = useCallback(() => {
    const img = new Image();
    img.src = '/assets/img/bg/bg_main.png';
  }, []);

  useEffect(() => {
    const fetchPromoVideo = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/upload/promo-video`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (data.videoUrl) {
          setPromoVideoUrl(`${data.videoUrl}?t=${Date.now()}`);
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

  // ── Intersection Observer for Hero Video ──────────────────────────────────
  useEffect(() => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          const heroVideo = heroVideoRef.current;
          if (!heroVideo) return;

          if (isVisible) {
            isHeroVideoPausedByUserRef.current = false;
            if (heroVideo.paused && heroVideo.src) {
              heroVideo.play().catch(() => {});
            }
          } else {
            if (!heroVideo.paused) {
              heroVideo.pause();
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(heroElement);
    return () => observer.disconnect();
  }, [promoVideoUrl, videoLoaded, videoError, isMobile, arcDone]);

  // ── Intersection Observer for Section Video ──────────────────────────────
  useEffect(() => {
    const sectionElement = videoSectionRef.current;
    if (!sectionElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          const sectionVideo = sectionVideoRef.current;
          if (!sectionVideo) return;

          if (!userPausedSectionVideoRef.current) {
            if (isVisible) {
              if (sectionVideo.paused && sectionVideo.src) {
                sectionVideo
                  .play()
                  .then(() => {
                    setVideoControls((prev) => ({ ...prev, isPlaying: true }));
                  })
                  .catch(() => {});
              }
            } else {
              if (!sectionVideo.paused) {
                sectionVideo.pause();
                setVideoControls((prev) => ({ ...prev, isPlaying: false }));
              }
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(sectionElement);
    return () => observer.disconnect();
  }, [promoVideoUrl, videoLoaded, videoError, isMobile, arcDone]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleContactChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setContactFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleContactSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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
          setTimeout(() => setShowContactSuccess(false), 5000);
        } else {
          alert('Failed to send message. Please try again.');
        }
      } catch {
        alert('Something went wrong. Please try again later.');
      } finally {
        setIsSubmittingContact(false);
      }
    },
    [contactFormData],
  );

  const openFormModal = useCallback((formId: string) => {
    setSelectedFormId(formId);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeFormModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedFormId(null);
    document.body.style.overflow = '';
  }, []);

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

      if (sectionVideoRef.current && !sectionVideoRef.current.paused) {
        sectionVideoRef.current.pause();
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }

      try {
        const formData = new FormData();
        formData.append('video', file);
        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<{
          videoUrl: string;
          success: boolean;
        }>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable)
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.error || err.message || 'Upload failed'));
              } catch {
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

        const data = await uploadPromise;
        if (data.videoUrl) {
          setPromoVideoUrl(`${data.videoUrl}?t=${Date.now()}`);
          setUploadSuccess(true);
          setVideoLoaded(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } else {
          throw new Error('No video URL returned from server');
        }
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload video');
      } finally {
        setVideoUploading(false);
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      }
    },
    [token],
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
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
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

  const resumeSectionVideo = useCallback(() => {
    if (
      wasBackgroundPlaying.current &&
      sectionVideoRef.current &&
      isBackgroundVideoPausedRef.current &&
      !userPausedSectionVideoRef.current
    ) {
      sectionVideoRef.current.currentTime = backgroundVideoCurrentTime.current;
      sectionVideoRef.current
        .play()
        .then(() => {
          setVideoControls((prev) => ({ ...prev, isPlaying: true }));
          isBackgroundVideoPausedRef.current = false;
          wasBackgroundPlaying.current = false;
        })
        .catch(() =>
          setVideoControls((prev) => ({ ...prev, isPlaying: false })),
        );
    }
  }, []);

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
        if (sectionVideoRef.current && !sectionVideoRef.current.paused) {
          wasBackgroundPlaying.current = true;
          backgroundVideoCurrentTime.current =
            sectionVideoRef.current.currentTime;
          sectionVideoRef.current.pause();
          isBackgroundVideoPausedRef.current = true;
          setVideoControls((prev) => ({ ...prev, isPlaying: false }));
        }
      } else {
        resumeSectionVideo();
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
  }, [resumeSectionVideo]);

  useEffect(() => {
    if (showVideoPopup && !isMobile) {
      if (sectionVideoRef.current && !sectionVideoRef.current.paused) {
        wasBackgroundPlaying.current = true;
        backgroundVideoCurrentTime.current =
          sectionVideoRef.current.currentTime;
        sectionVideoRef.current.pause();
        isBackgroundVideoPausedRef.current = true;
        setVideoControls((prev) => ({ ...prev, isPlaying: false }));
      }
    } else {
      resumeSectionVideo();
    }
  }, [showVideoPopup, isMobile, resumeSectionVideo]);

  // ── Tile interaction: pause hero video ─────────────────────────────────────
  const handleTileInteraction = useCallback(() => {
    const heroVideo = heroVideoRef.current;
    if (heroVideo && !heroVideo.paused) {
      heroVideo.pause();
      isHeroVideoPausedByUserRef.current = true;
    }
  }, []);

  // ── Video controls ──────────────────────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    if (!sectionVideoRef.current || isMobile) return;
    const video = sectionVideoRef.current;
    if (video.paused) {
      userPausedSectionVideoRef.current = false;
      video
        .play()
        .then(() => setVideoControls((prev) => ({ ...prev, isPlaying: true })))
        .catch((err) => console.log('Play failed:', err));
    } else {
      userPausedSectionVideoRef.current = true;
      video.pause();
      setVideoControls((prev) => ({ ...prev, isPlaying: false }));
    }
  }, [isMobile]);

  const toggleMute = useCallback(() => {
    if (!sectionVideoRef.current || isMobile) return;
    const newMuted = !sectionVideoRef.current.muted;
    sectionVideoRef.current.muted = newMuted;
    setVideoControls((prev) => ({ ...prev, isMuted: newMuted }));
  }, [isMobile]);

  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isMobile) return;
      const rounded = Math.round(parseFloat(e.target.value));
      setVideoProgress(rounded);
      if (sectionVideoRef.current && videoDuration > 0) {
        sectionVideoRef.current.currentTime = (rounded / 100) * videoDuration;
        lastRoundedProgress.current = rounded;
      }
    },
    [videoDuration, isMobile],
  );

  const handleTimeUpdate = useCallback(() => {
    if (!sectionVideoRef.current || !videoDuration || isMobile) return;
    const now = Date.now();
    if (now - timeUpdateThrottle.current < 250) return;
    timeUpdateThrottle.current = now;
    if (animationFrameId.current !== null)
      cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(() => {
      animationFrameId.current = null;
      if (!sectionVideoRef.current) return;
      const rounded = Math.round(
        (sectionVideoRef.current.currentTime / videoDuration) * 100,
      );
      if (Math.abs(rounded - lastRoundedProgress.current) >= 1) {
        setVideoProgress(rounded);
        lastRoundedProgress.current = rounded;
      }
    });
  }, [videoDuration, isMobile]);

  const handleLoadedMetadata = useCallback(() => {
    if (sectionVideoRef.current) {
      setVideoDuration(sectionVideoRef.current.duration);
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

  const closeControlsPanel = useCallback(() => setShowControlsPanel(false), []);
  const openVideoPopup = useCallback(() => {
    setShowVideoPopup(true);
    setShowControlsPanel(false);
  }, []);
  const closeVideoPopup = useCallback(() => {
    setShowVideoPopup(false);
    if (document.fullscreenElement) document.exitFullscreen();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!sectionVideoRef.current || isMobile) return;
    const container = sectionVideoRef.current.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isMobile]);

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        if (showVideoPopup) closeVideoPopup();
        else if (showControlsPanel) closeControlsPanel();
        else if (isModalOpen) closeFormModal();
      }
    },
    [
      showVideoPopup,
      closeVideoPopup,
      showControlsPanel,
      closeControlsPanel,
      isModalOpen,
      closeFormModal,
    ],
  );

  useEffect(() => {
    return () => {
      if (animationFrameId.current !== null)
        cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('hp-visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );
    sectionsRef.current.forEach((s) => {
      if (s) observer.observe(s);
    });
    return () => observer.disconnect();
  }, []);

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

  const showVideoSection = promoVideoUrl && !videoError && videoLoaded;

  return (
    <div
      className='hp-root'
      onDragEnter={isAdmin ? handleDrag : undefined}
      onDragLeave={isAdmin ? handleDrag : undefined}
      onDragOver={isAdmin ? handleDrag : undefined}
      onDrop={isAdmin ? handleDrop : undefined}
    >
      {/* ─── HERO SECTION ────────────────────────────────────────────────────── */}
      <section
        className={`hp-hero ${arcDone && isMobile ? 'hp-hero--hidden' : ''}`}
        ref={heroRef}
      >
        <div className='hp-hero__bg-wrapper'>
          <img
            src='/assets/img/theme/bg-main.png'
            alt='Basketball court background'
            className='hp-hero__bg'
          />
        </div>
        <div className='hp-hero__overlay' />

        <canvas
          ref={canvasRef}
          className={`hp-arc-canvas${arcDone ? ' hp-arc-canvas--done' : ''}`}
        />

        {/* Hero video only appears after arcDone and on non‑mobile */}
        {!isMobile &&
          promoVideoUrl &&
          videoLoaded &&
          !videoError &&
          arcDone && (
            <video
              ref={heroVideoRef}
              className='hp-stage__video'
              src={promoVideoUrl}
              muted
              loop
              playsInline
              preload='metadata'
            />
          )}

        <div
          className={`hp-hero__background-image${arcDone ? ' hp-hero__background-image--visible' : ''}`}
        />
        <div className={`hp-spark${arcDone ? ' hp-spark--active' : ''}`} />

        <div className='hp-hero__inner'>
          <div className='hp-hero__content'>
            <div className='hp-hero__eyebrow'>
              <span className='hp-hero__eyebrow-dot' />
              Elite Basketball Training
            </div>
            <h1 className='hp-hero__title'>
              <span className='hp-hero__word'>Help</span>{' '}
              <span className='hp-hero__word'>Your</span>{' '}
              <span className='hp-hero__word'>Child</span>{' '}
              <span className='hp-hero__word'>Excel</span>{' '}
              <span className='hp-hero__word'>On &amp;</span>{' '}
              <span className='hp-hero__word'>Off</span>{' '}
              <span className='hp-hero__word'>The Court</span>
            </h1>
            <p className='hp-hero__body'>
              Join Bothell Select Basketball—where passion meets purpose. Elite
              coaching, character development, and a community that champions
              every young athlete's journey.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TILES SECTION ───────────────────────────────────────────────────── */}
      <section className='hp-tiles-section'>
        <div className={`hp-tiles-container${tilesVisible ? ' slide-up' : ''}`}>
          <div
            ref={tileWrapperRef}
            onClick={handleTileInteraction}
            onTouchStart={handleTileInteraction}
          >
            <HomeTileRenderer pageSlug='home' />
          </div>
        </div>
      </section>
      <div className='hp-cut-light-2 hero' aria-hidden='true' />

      {/* ─── WHY BOTHELL SELECT ────────────────────────────────────────────── */}
      <section className='hp-value-section' ref={setValueSectionRef}>
        <div className='hp-value__inner'>
          {/* Left: Player image */}
          <div className='hp-value__media'>
            <div className='hp-value__player'>
              <img
                src='/assets/img/players.png'
                alt='Bothell Select Basketball'
                className='hp-about'
              />
            </div>
          </div>

          {/* Right: Copy */}
          <div className='hp-value__copy'>
            <span className='hp-value__tag'>More Than Basketball</span>
            <h2 className='hp-value__title'>A Foundation for Life</h2>
            <p className='hp-value__lead'>
              Every practice is an opportunity for your child to grow—not just
              as an athlete, but as a confident, disciplined, and resilient
              individual.
            </p>
            <p className='hp-value__text'>
              At Bothell Select Basketball, we believe basketball is more than a
              game. It's a powerful tool for teaching life skills that extend
              far beyond the court. Our experienced coaches create a positive,
              encouraging environment where young athletes build confidence,
              develop strong fundamentals, learn the value of teamwork, and
              discover what they're capable of through hard work and
              perseverance.
            </p>
            <p className='hp-value__text'>
              Whether your child is picking up a basketball for the first time
              or preparing for competitive play, every athlete is challenged,
              supported, and celebrated along their journey.
            </p>
            <div className='hp-value__cta-row'>
              <button
                className='hp-btn-primary'
                onClick={() => setScrollToTileIndex(1)}
              >
                Join Bothell Select Today
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
            </div>
          </div>
        </div>

        {/* Glassmorphism Cards */}
        <div className='hp-value__cards'>
          <div className='hp-value-card'>
            <i className='ti ti-ball-basketball fs-2'></i>
            <h4>Elite Skill Development</h4>
            <p>
              Professional coaching focused on building strong fundamentals,
              game IQ, and confidence.
            </p>
          </div>
          <div className='hp-value-card'>
            <i className='ti ti-heart fs-2'></i>
            <h4>Positive Coaching Philosophy</h4>
            <p>
              Every player is encouraged, challenged, and supported—effort
              matters as much as results.
            </p>
          </div>
          <div className='hp-value-card'>
            <i className='ti ti-heart-handshake fs-2'></i>
            <h4>Character Comes First</h4>
            <p>
              Respect, leadership, accountability, teamwork, and sportsmanship
              are woven into everything.
            </p>
          </div>
          <div className='hp-value-card'>
            <i className='ti ti-growth fs-2'></i>
            <h4>Growth for Every Athlete</h4>
            <p>
              From beginners to experienced players, every child receives
              age‑appropriate instruction.
            </p>
          </div>
          <div className='hp-value-card'>
            <i className='ti ti-users fs-2'></i>
            <h4>A Community That Feels Like Family</h4>
            <p>
              Families become part of a welcoming community that celebrates
              growth on and off the court.
            </p>
          </div>
          <div className='hp-value-card'>
            <i className='ti ti-trophy fs-2'></i>
            <h4>Preparing Players for the Next Level</h4>
            <p>
              We help every athlete become the best version of
              themselves—whether that means making a school team or building
              confidence.
            </p>
          </div>
        </div>
        <div className='hp-cut-reverse' aria-hidden='true' />

        {/* ── Full‑width CTA Banner ── */}
        <div className='hp-value__banner'>
          <div className='hp-value__banner-content'>
            <h3>Help Your Child Reach Their Full Potential</h3>
            <p>Join the Bothell Select Family Today</p>
            <button
              className='hp-btn-primary-blue'
              onClick={() => setScrollToTileIndex(1)}
            >
              Get Started
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
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className='hp-main'>
        <div className='hp-cut-dark' aria-hidden='false' />
        <div className='hp-main__content'>
          {showVideoSection && (
            <section
              className='hp-section hp-section--video hp-visible'
              ref={setSectionRef0}
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
                    ref={sectionVideoRef}
                    className={`hp-video__player${videoLoaded ? ' hp-video__player--loaded' : ''}`}
                    src={promoVideoUrl}
                    muted
                    loop
                    playsInline
                    preload='metadata'
                    onLoadedMetadata={handleLoadedMetadata}
                    onError={handleVideoError}
                    onTimeUpdate={handleTimeUpdate}
                  />

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
                    className={`hp-controls${showControlsPanel ? ' hp-controls--visible' : ''}`}
                  >
                    <div className='hp-controls__panel'>
                      <div className='hp-controls__progress'>
                        <input
                          type='range'
                          min='0'
                          max='100'
                          value={videoProgress}
                          onChange={handleProgressChange}
                          className='hp-controls__slider'
                          style={{
                            background: `linear-gradient(to right, rgba(255,255,255,0.95) ${videoProgress}%, rgba(255,255,255,0.2) ${videoProgress}%)`,
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
                            {formatTime((videoProgress / 100) * videoDuration)}
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

          {/* ─── ABOUT SECTION ──────────────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--about'
            ref={setSectionRef1}
          >
            <div className='hp-cut' aria-hidden='true' />
            <div className='hp-section__inner'>
              <div className='hp-about-wrapper'>
                <div className='hp-about-image'>
                  <img
                    src='/assets/img/aboutus-state.png'
                    alt='Bothell Select Basketball Coaches'
                    className='hp-about'
                  />
                </div>
                <div className='hp-about-content'>
                  <header className='hp-section__head'>
                    <span className='hp-section__label'>
                      Where Elite Experience Meets a Passion for Youth
                      Development
                    </span>
                    <h2 className='hp-section__title'>About Bothell Select</h2>
                  </header>
                  <div className='hp-about-text'>
                    <p className='hp-about-paragraph'>
                      Bothell Select Basketball is built on a foundation of
                      <strong>
                        {' '}
                        decades of high‑level basketball experience
                      </strong>
                      . Our program is guided by coaches who have competed at
                      the highest levels and now dedicate themselves to
                      developing young athletes with the same discipline,
                      creativity, and love for the game.
                    </p>

                    <p className='hp-about-paragraph'>
                      Our coaches bring a rare combination of
                      <strong> international playing experience</strong>,
                      <strong> elite coaching knowledge</strong>, and a genuine
                      commitment to each player’s growth. They create an
                      environment where young athletes learn the game the right
                      way — with respect, hustle, and the freedom to express
                      themselves.
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
                        <span>European &amp; American Fusion</span>
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
                        <span>D1 &amp; Pro Experience</span>
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
                        <span>Character‑First Coaching</span>
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
                        <span>Creative &amp; Disciplined Play</span>
                      </div>
                    </div>

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

          {/* ─── CONTACT SECTION ────────────────────────────────────────────── */}
          <section
            className='hp-section hp-section--contact'
            ref={setSectionRef2}
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
                      out through any of the channels below or fill out the
                      contact form.
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
                            Thank you for reaching out. We'll get back to you
                            shortly!
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
                              />
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
                            matters, please call us.
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

      {/* ─── MODALS & POPUPS ────────────────────────────────────────────────── */}
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
            className={`hp-admin-toggle${showAdminPanel ? ' is-active' : ''}`}
            onClick={() => setShowAdminPanel((v) => !v)}
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
                  className={`hp-admin-panel__dropzone${dragActive ? ' is-drag-active' : ''}`}
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
