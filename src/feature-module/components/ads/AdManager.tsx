import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Advertisement } from '../../../types/advertisement-types';
import AdBanner from './AdBanner';
import './AdManager.css';

interface AdManagerProps {
  placement?: 'sidebar' | 'header' | 'footer' | 'inline' | 'popup' | 'topbar';
  pageSlug?: string;
  showMinimized?: boolean;
  className?: string;
  maxAds?: number;
}

const CLOSED_AD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SIDEBAR_DISMISSED_TTL_MS = 45 * 24 * 60 * 60 * 1000;
const SIDEBAR_DISMISSED_KEY = 'ads_sidebar_dismissed_at';

type ClosedEntry = { closedAt: number };

const getStorageKey = (placement: string, suffix: string) =>
  `ads_${placement}_${suffix}`;

const isSidebarDismissed = (): boolean => {
  try {
    const raw = localStorage.getItem(SIDEBAR_DISMISSED_KEY);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    return Date.now() - dismissedAt < SIDEBAR_DISMISSED_TTL_MS;
  } catch {
    return false;
  }
};

const dismissSidebar = () => {
  try {
    const timestamp = Date.now();
    console.log('Dismissing sidebar, saving timestamp:', timestamp);
    localStorage.setItem(SIDEBAR_DISMISSED_KEY, timestamp.toString());
    const saved = localStorage.getItem(SIDEBAR_DISMISSED_KEY);
    console.log('Verified saved timestamp:', saved);
  } catch (error) {
    console.error('Failed to save dismissal:', error);
  }
};

const loadClosedAds = (placement: string): Record<string, ClosedEntry> => {
  try {
    const raw = localStorage.getItem(getStorageKey(placement, 'closed'));
    if (!raw) return {};
    const parsed: Record<string, ClosedEntry> = JSON.parse(raw);
    const now = Date.now();
    const active: Record<string, ClosedEntry> = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (now - entry.closedAt < CLOSED_AD_TTL_MS) active[id] = entry;
    }
    return active;
  } catch {
    return {};
  }
};

const loadMinimizedAds = (placement: string): Set<string> => {
  try {
    const raw = localStorage.getItem(getStorageKey(placement, 'minimized'));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const AdManager: React.FC<AdManagerProps> = ({
  placement = 'sidebar',
  pageSlug = 'all',
  showMinimized = true,
  className = '',
  maxAds = 3,
}) => {
  const { user, isAuthenticated, getAuthToken } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [closedAds, setClosedAds] = useState<Record<string, ClosedEntry>>({});
  const [minimizedAds, setMinimizedAds] = useState<Set<string>>(new Set());
  const [authToken, setAuthToken] = useState<string | undefined>();
  const [showPopup, setShowPopup] = useState(false);

  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    if (placement === 'sidebar') {
      return isSidebarDismissed();
    }
    return false;
  });

  const [isMobile, setIsMobile] = useState(false);
  const [mobileMinimized, setMobileMinimized] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const popupTimerRef = useRef<NodeJS.Timeout>();

  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const previewMode = isLocalDev;

  // --- Calculate displayAds BEFORE using it in callbacks ---
  const displayAds = previewMode ? ads : ads.filter((ad) => !closedAds[ad._id]);

  useEffect(() => {
    if (placement === 'sidebar') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === SIDEBAR_DISMISSED_KEY) {
          console.log('Storage changed, re-checking dismissal');
          setIsSidebarHidden(isSidebarDismissed());
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [placement]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile && placement === 'sidebar') {
      setMobileMinimized(true);
      setActiveIndex(0);
    }
  }, [isMobile, placement, ads]);

  useEffect(() => {
    if (isAuthenticated) {
      getAuthToken()
        .then((token) => setAuthToken(token ?? undefined))
        .catch(() => setAuthToken(undefined));
    }
  }, [isAuthenticated, getAuthToken]);

  useEffect(() => {
    setClosedAds(loadClosedAds(placement));
    setMinimizedAds(loadMinimizedAds(placement));
  }, [placement]);

  const fetchAds = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      try {
        const userRole = user?.role || 'guest';
        const params = new URLSearchParams({
          placement,
          role: userRole,
          pageSlug,
        });
        if (isLocalDev || userRole === 'admin')
          params.append('preview', 'true');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const url = `${process.env.REACT_APP_API_BASE_URL}/ads/active?${params}`;
        const response = await fetch(url, { headers, signal });
        if (!response.ok) {
          setError(true);
          return;
        }

        const data = await response.json();
        const fetched: Advertisement[] = data.ads || [];
        setAds(fetched.slice(0, maxAds));
      } catch (err: any) {
        if (err.name !== 'AbortError') setError(true);
      } finally {
        setLoading(false);
      }
    },
    [placement, pageSlug, user?.role, authToken, maxAds, isLocalDev],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAds(controller.signal);
    return () => controller.abort();
  }, [fetchAds]);

  useEffect(() => {
    if (placement !== 'popup') return;
    const displayAdsList = previewMode
      ? ads
      : ads.filter((ad) => !closedAds[ad._id]);
    if (displayAdsList.length > 0 && !loading && !showPopup) {
      popupTimerRef.current = setTimeout(() => setShowPopup(true), 2000);
    }
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, [placement, ads, closedAds, loading, previewMode, showPopup]);

  const handlePopupBackdropClick = useCallback(() => {
    if (placement === 'popup') setShowPopup(false);
  }, [placement]);

  const handleClose = useCallback(
    (adId: string) => {
      if (placement === 'popup') setShowPopup(false);
      if (previewMode) return;
      const updated = { ...closedAds, [adId]: { closedAt: Date.now() } };
      setClosedAds(updated);
      try {
        localStorage.setItem(
          getStorageKey(placement, 'closed'),
          JSON.stringify(updated),
        );
      } catch {}
    },
    [placement, previewMode, closedAds],
  );

  // Master minimize all ads
  const handleMasterMinimize = useCallback(() => {
    const allAdIds = displayAds.map((ad) => ad._id);
    const updated = new Set(minimizedAds);
    // Add all current ads to minimized set
    allAdIds.forEach((id) => updated.add(id));
    setMinimizedAds(updated);
    if (previewMode) return;
    try {
      localStorage.setItem(
        getStorageKey(placement, 'minimized'),
        JSON.stringify([...updated]),
      );
    } catch {}
  }, [displayAds, minimizedAds, previewMode, placement]);

  const handleExpandAd = useCallback(
    (adId: string) => {
      const updated = new Set(minimizedAds);
      updated.delete(adId);
      setMinimizedAds(updated);
      if (previewMode) return;
      try {
        localStorage.setItem(
          getStorageKey(placement, 'minimized'),
          JSON.stringify([...updated]),
        );
      } catch {}
    },
    [minimizedAds, previewMode, placement],
  );

  // Master close all ads
  const handleMasterClose = useCallback(() => {
    if (previewMode) return;
    const now = Date.now();
    const updated = { ...closedAds };
    displayAds.forEach((ad) => {
      updated[ad._id] = { closedAt: now };
    });
    setClosedAds(updated);
    try {
      localStorage.setItem(
        getStorageKey(placement, 'closed'),
        JSON.stringify(updated),
      );
    } catch {}
  }, [displayAds, closedAds, previewMode, placement]);

  const handleSidebarDismiss = useCallback(() => {
    console.log('Dismiss button clicked!');
    dismissSidebar();
    setIsSidebarHidden(true);
    console.log('Sidebar should now be hidden - state updated to true');
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > dy && dx > 6) {
      isDragging.current = true;
      e.stopPropagation();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, adCount: number) => {
    if (!isDragging.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setActiveIndex((i) => Math.min(i + 1, adCount - 1));
    else setActiveIndex((i) => Math.max(i - 1, 0));
    isDragging.current = false;
  }, []);

  if (placement === 'sidebar' && isSidebarHidden && !previewMode) {
    console.log('Sidebar is hidden - returning null');
    return null;
  }

  if (loading || error || displayAds.length === 0) return null;

  const adCount = displayAds.length;
  const countClass =
    adCount === 1
      ? 'ads-count-1'
      : adCount === 2
        ? 'ads-count-2'
        : adCount === 3
          ? 'ads-count-3'
          : 'ads-count-many';

  const adSize: 'normal' | 'small' | 'mini' =
    placement === 'sidebar' && adCount >= 3
      ? 'mini'
      : placement === 'sidebar' && adCount === 2
        ? 'small'
        : 'normal';

  const allMinimized =
    adCount > 0 && displayAds.every((ad) => minimizedAds.has(ad._id));

  // ─── POPUP PLACEMENT ───────────────────────────────────────────
  if (placement === 'popup') {
    if (!showPopup) return null;
    return (
      <div
        className={`ad-manager ad-manager--popup ${className}`}
        onClick={handlePopupBackdropClick}
        role='dialog'
        aria-modal='true'
        aria-label='Advertisement'
      >
        {displayAds.slice(0, 1).map((ad) => (
          <AdBanner
            key={ad._id}
            ad={ad}
            authToken={authToken}
            minimized={false}
            onClose={() => handleClose(ad._id)}
          />
        ))}
      </div>
    );
  }

  // ─── TOPBAR PLACEMENT ──────────────────────────────────────────
  if (placement === 'topbar') {
    if (allMinimized && showMinimized) {
      return (
        <div
          className={`ad-manager ad-manager--topbar ad-manager--topbar-minimized ${className}`}
        >
          <div className='ad-topbar__minimized'>
            <span className='ad-topbar__label'>Sponsored</span>
            <div className='ad-topbar__pills'>
              {displayAds.map((ad) => (
                <button
                  key={ad._id}
                  className='ad-topbar__pill'
                  onClick={() => {
                    const updated = new Set(minimizedAds);
                    updated.delete(ad._id);
                    setMinimizedAds(updated);
                    localStorage.setItem(
                      getStorageKey(placement, 'minimized'),
                      JSON.stringify([...updated]),
                    );
                  }}
                >
                  {ad.desktopImage?.url && (
                    <img
                      src={ad.desktopImage.url}
                      alt={ad.businessName}
                      className='ad-topbar__pill-img'
                    />
                  )}
                  <span className='ad-topbar__pill-name'>
                    {ad.businessName}
                  </span>
                </button>
              ))}
            </div>
            {/* Master controls for topbar */}
            <div className='ad-topbar__master-controls'>
              <button
                className='ad-topbar__master-btn'
                onClick={handleMasterMinimize}
                aria-label='Minimize all ads'
                title='Minimize all'
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <polyline points='18 15 12 9 6 15' />
                </svg>
              </button>
              <button
                className='ad-topbar__master-btn ad-topbar__master-btn--close'
                onClick={handleMasterClose}
                aria-label='Close all ads'
                title='Close all'
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`ad-manager ad-manager--topbar ${className}`}>
        <div className='ad-topbar__container'>
          <span className='ad-topbar__label'>Sponsored</span>
          <div className='ad-topbar__scroll-wrapper'>
            <div className='ad-topbar__track'>
              {displayAds.map((ad) => (
                <div key={ad._id} className='ad-topbar__slide'>
                  <AdBanner
                    ad={ad}
                    authToken={authToken}
                    size='small'
                    minimized={false}
                    onClose={() => handleClose(ad._id)}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Master controls for topbar */}
          {displayAds.length > 0 && (
            <div className='ad-topbar__master-controls'>
              <button
                className='ad-topbar__master-btn'
                onClick={handleMasterMinimize}
                aria-label='Minimize all ads'
                title='Minimize all'
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <polyline points='18 15 12 9 6 15' />
                </svg>
              </button>
              <button
                className='ad-topbar__master-btn ad-topbar__master-btn--close'
                onClick={handleMasterClose}
                aria-label='Close all ads'
                title='Close all'
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── MOBILE SIDEBAR ────────────────────────────────────────────
  if (placement === 'sidebar' && isMobile) {
    if (mobileMinimized) {
      return (
        <div className='ad-manager ad-manager--sidebar ad-manager--mobile-minimized'>
          <div className='ad-mobile-dock'>
            <span className='ad-mobile-dock__label'>Sponsors</span>
            <div className='ad-mobile-dock__pills'>
              {displayAds.map((ad, i) => {
                const imageUrl =
                  ad.mobileImage?.url || ad.desktopImage?.url || null;
                return (
                  <button
                    key={ad._id}
                    className='ad-mobile-pill'
                    onClick={() => {
                      setActiveIndex(i);
                      setMobileMinimized(false);
                    }}
                    aria-label={`View ${ad.businessName} ad`}
                  >
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={ad.businessName}
                        className='ad-mobile-pill__img'
                      />
                    )}
                    <span className='ad-mobile-pill__name'>
                      {ad.businessName}
                    </span>
                    <svg
                      width='10'
                      height='10'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                      aria-hidden='true'
                    >
                      <polyline points='18 15 12 9 6 15' />
                    </svg>
                  </button>
                );
              })}
            </div>
            {/* Master controls for mobile */}
            <div className='ad-mobile-dock__master-controls'>
              <button
                className='ad-mobile-dock__master-btn'
                onClick={handleMasterMinimize}
                aria-label='Minimize all ads'
                title='Minimize all'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                >
                  <polyline points='18 15 12 9 6 15' />
                </svg>
              </button>
              <button
                className='ad-mobile-dock__master-btn ad-mobile-dock__master-btn--close'
                onClick={handleMasterClose}
                aria-label='Close all ads'
                title='Close all'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>
            <button
              className='ad-mobile-dock__close'
              onClick={handleSidebarDismiss}
              aria-label='Close sponsor bar'
              title='Hide for 45 days'
            >
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                aria-hidden='true'
              >
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>
        </div>
      );
    }

    const clampedIndex = Math.min(activeIndex, adCount - 1);
    return (
      <div className='ad-manager ad-manager--sidebar ad-manager--mobile-expanded'>
        <div className='ad-carousel__header'>
          <span className='ad-carousel__title'>
            Sponsors
            {adCount > 1 && (
              <span className='ad-carousel__count'>
                {clampedIndex + 1} / {adCount}
              </span>
            )}
          </span>
          <div className='ad-carousel__header-actions'>
            <button
              className='ad-carousel__collapse'
              onClick={() => setMobileMinimized(true)}
              aria-label='Collapse ads'
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                aria-hidden='true'
              >
                <polyline points='18 15 12 21 6 15' />
              </svg>
              Collapse
            </button>
            {/* Master controls for mobile expanded */}
            <button
              className='ad-carousel__master-minimize'
              onClick={handleMasterMinimize}
              aria-label='Minimize all ads'
              title='Minimize all'
            >
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                aria-hidden='true'
              >
                <polyline points='18 15 12 9 6 15' />
              </svg>
            </button>
            <button
              className='ad-carousel__dismiss'
              onClick={handleSidebarDismiss}
              aria-label='Close sponsor ads for 45 days'
              title='Hide for 45 days'
            >
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                aria-hidden='true'
              >
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className='ad-carousel__track-wrap'
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e, adCount)}
        >
          <div
            className='ad-carousel__track'
            style={{ transform: `translateX(${-clampedIndex * 100}%)` }}
          >
            {displayAds.map((ad) => (
              <div key={ad._id} className='ad-carousel__slide'>
                <AdBanner
                  ad={ad}
                  authToken={authToken}
                  size='normal'
                  minimized={false}
                  onClose={() => handleClose(ad._id)}
                />
              </div>
            ))}
          </div>
        </div>

        {adCount > 1 && (
          <div className='ad-carousel__dots'>
            {displayAds.map((_, i) => (
              <button
                key={i}
                className={`ad-carousel__dot ${i === clampedIndex ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`Go to ad ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── DESKTOP SIDEBAR ───────────────────────────────────────────
  if (placement === 'sidebar') {
    return (
      <div
        className={`ad-manager ad-manager--sidebar ${countClass} ${allMinimized ? 'is-minimized' : ''} ${className}`}
        aria-label='Advertisements'
      >
        {/* Master controls at top-right of sidebar */}
        <div className='ad-sidebar__master-controls'>
          <button
            className='ad-sidebar__master-btn'
            onClick={handleMasterMinimize}
            aria-label='Minimize all ads'
            title='Minimize all'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <polyline points='18 15 12 9 6 15' />
            </svg>
          </button>
          <button
            className='ad-sidebar__master-btn ad-sidebar__master-btn--close'
            onClick={handleMasterClose}
            aria-label='Close all ads'
            title='Close all'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        {displayAds.map((ad) => (
          <AdBanner
            key={ad._id}
            ad={ad}
            authToken={authToken}
            size={adSize}
            minimized={showMinimized && minimizedAds.has(ad._id)}
            onClose={() => handleClose(ad._id)}
            onExpand={() => handleExpandAd(ad._id)}
          />
        ))}
      </div>
    );
  }

  // ─── FOOTER PLACEMENT (Skinny horizontal scrollable ads) ──────
  if (placement === 'footer') {
    if (allMinimized && showMinimized) {
      return (
        <div
          className={`ad-manager ad-manager--footer ad-manager--footer-minimized ${className}`}
        >
          <div className='ad-footer__minimized'>
            <div className='ad-footer__pills'>
              {displayAds.map((ad) => (
                <button
                  key={ad._id}
                  className='ad-footer__pill'
                  onClick={() => {
                    const updated = new Set(minimizedAds);
                    updated.delete(ad._id);
                    setMinimizedAds(updated);
                    localStorage.setItem(
                      getStorageKey(placement, 'minimized'),
                      JSON.stringify([...updated]),
                    );
                  }}
                >
                  {ad.desktopImage?.url && (
                    <img
                      src={ad.desktopImage.url}
                      alt={ad.businessName}
                      className='ad-footer__pill-img'
                    />
                  )}
                  <span className='ad-footer__pill-name'>
                    {ad.businessName}
                  </span>
                </button>
              ))}
            </div>
            {/* Master controls for footer minimized */}
            <div className='ad-footer__master-controls'>
              <button
                className='ad-footer__master-btn'
                onClick={handleMasterMinimize}
                aria-label='Minimize all ads'
                title='Minimize all'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <polyline points='18 15 12 9 6 15' />
                </svg>
              </button>
              <button
                className='ad-footer__master-btn ad-footer__master-btn--close'
                onClick={handleMasterClose}
                aria-label='Close all ads'
                title='Close all'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`ad-manager ad-manager--footer ${className}`}>
        <div className='ad-footer__container'>
          <div className='ad-footer__scroll-wrapper'>
            <div className='ad-footer__track'>
              {displayAds.map((ad) => (
                <div key={ad._id} className='ad-footer__slide'>
                  <AdBanner
                    ad={ad}
                    authToken={authToken}
                    size='normal'
                    minimized={false}
                    onClose={() => handleClose(ad._id)}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Master controls for footer */}
          {displayAds.length > 0 && (
            <div className='ad-footer__master-controls'>
              <button
                className='ad-footer__master-btn'
                onClick={handleMasterMinimize}
                aria-label='Minimize all ads'
                title='Minimize all'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <polyline points='18 15 12 9 6 15' />
                </svg>
              </button>
              <button
                className='ad-footer__master-btn ad-footer__master-btn--close'
                onClick={handleMasterClose}
                aria-label='Close all ads'
                title='Close all'
              >
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <line x1='18' y1='6' x2='6' y2='18' />
                  <line x1='6' y1='6' x2='18' y2='18' />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ALL OTHER PLACEMENTS (header, inline) ────────────────────
  return (
    <div
      className={`ad-manager ad-manager--${placement} ${countClass} ${className}`}
      aria-label='Advertisements'
    >
      {/* Master controls for header/inline */}
      {displayAds.length > 0 && (
        <div className='ad-manager__master-controls'>
          <button
            className='ad-manager__master-btn'
            onClick={handleMasterMinimize}
            aria-label='Minimize all ads'
            title='Minimize all'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <polyline points='18 15 12 9 6 15' />
            </svg>
          </button>
          <button
            className='ad-manager__master-btn ad-manager__master-btn--close'
            onClick={handleMasterClose}
            aria-label='Close all ads'
            title='Close all'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>
      )}
      {displayAds.map((ad) => (
        <AdBanner
          key={ad._id}
          ad={ad}
          authToken={authToken}
          size={adSize}
          minimized={showMinimized && minimizedAds.has(ad._id)}
          onClose={() => handleClose(ad._id)}
        />
      ))}
    </div>
  );
};

export default AdManager;
