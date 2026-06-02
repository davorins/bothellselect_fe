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

// Viewport breakpoints at which each placement is actually visible
const PLACEMENT_MIN_WIDTH: Partial<Record<string, number>> = {
  sidebar: 0, // sidebar handles its own responsive layout via CSS
  header: 0,
  footer: 0,
  inline: 0,
  popup: 0,
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
  const fetchedRef = useRef(false);
  const popupTimerRef = useRef<NodeJS.Timeout>();

  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const previewMode = isLocalDev;

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

  // Close backdrop click for popup
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
    } catch {
      /* storage unavailable */
    }
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
    } catch {
      /* storage unavailable */
    }
  };

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

  // ── Popup ─────────────────────────────────────────────────────
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

  // ── All other placements ──────────────────────────────────────
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
