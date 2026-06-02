import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Advertisement } from '../../../types/advertisement-types';
import AdBanner from './AdBanner';
import './AdManager.css';

interface AdManagerProps {
  placement?: 'sidebar' | 'header' | 'footer' | 'inline' | 'popup';
  pageSlug?: string;
  showMinimized?: boolean;
  className?: string;
  maxAds?: number;
}

const CLOSED_AD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type ClosedEntry = { closedAt: number };

const getStorageKey = (placement: string, suffix: string) =>
  `ads_${placement}_${suffix}`;

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

  // Mobile carousel state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMinimized, setMobileMinimized] = useState(true); // always start minimized on mobile
  const [activeIndex, setActiveIndex] = useState(0);

  // Touch/swipe state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const popupTimerRef = useRef<NodeJS.Timeout>();

  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const previewMode = isLocalDev;

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile, reset to minimized whenever ads change
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

  // Popup timer
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

  const handleClose = (adId: string) => {
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
  };

  const handleMinimize = (adId: string, minimized: boolean) => {
    const updated = new Set(minimizedAds);
    if (minimized) updated.add(adId);
    else updated.delete(adId);
    setMinimizedAds(updated);
    if (previewMode) return;
    try {
      localStorage.setItem(
        getStorageKey(placement, 'minimized'),
        JSON.stringify([...updated]),
      );
    } catch {}
  };

  // ── Swipe handlers ────────────────────────────────────────────
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
    if (dx < 0) {
      setActiveIndex((i) => Math.min(i + 1, adCount - 1));
    } else {
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    isDragging.current = false;
  }, []);

  const displayAds = previewMode ? ads : ads.filter((ad) => !closedAds[ad._id]);

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
    placement === 'sidebar' &&
    adCount > 0 &&
    displayAds.every((ad) => minimizedAds.has(ad._id));

  // ── Popup ──────────────────────────────────────────────────────
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
            onMinimize={(m) => handleMinimize(ad._id, m)}
          />
        ))}
      </div>
    );
  }

  // ── Mobile sidebar: minimized dock + swipeable carousel ────────
  if (placement === 'sidebar' && isMobile) {
    // Minimized state: horizontal pill row
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
          </div>
        </div>
      );
    }

    // Expanded state: full carousel
    const clampedIndex = Math.min(activeIndex, adCount - 1);

    return (
      <div className='ad-manager ad-manager--sidebar ad-manager--mobile-expanded'>
        {/* Header row: "Sponsors" label + collapse button */}
        <div className='ad-carousel__header'>
          <span className='ad-carousel__title'>
            Sponsors
            {adCount > 1 && (
              <span className='ad-carousel__count'>
                {clampedIndex + 1} / {adCount}
              </span>
            )}
          </span>
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
        </div>

        {/* Swipeable card area */}
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
                  onMinimize={() => setMobileMinimized(true)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
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

  // ── Desktop sidebar + all other placements ─────────────────────
  return (
    <div
      className={`ad-manager ad-manager--${placement} ${countClass} ${allMinimized ? 'is-minimized' : ''} ${className}`}
      aria-label='Advertisements'
    >
      {displayAds.map((ad) => (
        <AdBanner
          key={ad._id}
          ad={ad}
          authToken={authToken}
          size={adSize}
          minimized={showMinimized && minimizedAds.has(ad._id)}
          onClose={() => handleClose(ad._id)}
          onMinimize={(m) => handleMinimize(ad._id, m)}
        />
      ))}
    </div>
  );
};

export default AdManager;
