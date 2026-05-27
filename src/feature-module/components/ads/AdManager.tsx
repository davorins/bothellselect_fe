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
      if (now - entry.closedAt < CLOSED_AD_TTL_MS) {
        active[id] = entry;
      }
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
  const fetchedRef = useRef(false);
  const popupTimerRef = useRef<NodeJS.Timeout>();

  // FORCE preview mode ON in local development
  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  const previewMode = isLocalDev; // Always true in development!

  console.log(
    `🔍 AdManager - placement: ${placement}, previewMode: ${previewMode}, isLocalDev: ${isLocalDev}`,
  );

  // Resolve token once on mount
  useEffect(() => {
    if (isAuthenticated) {
      getAuthToken()
        .then((token) => setAuthToken(token ?? undefined))
        .catch(() => setAuthToken(undefined));
    }
  }, [isAuthenticated, getAuthToken]);

  // Load persisted UI state
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

        if (isLocalDev || userRole === 'admin') {
          params.append('preview', 'true');
        }

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
        if (err.name !== 'AbortError') {
          setError(true);
        }
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

  // Handle popup display logic
  useEffect(() => {
    if (placement === 'popup') {
      const displayAdsList = previewMode
        ? ads
        : ads.filter((ad) => !closedAds[ad._id]);

      console.log(
        `🎬 Popup check - ads: ${ads.length}, displayAdsList: ${displayAdsList.length}, loading: ${loading}, showPopup: ${showPopup}`,
      );

      if (displayAdsList.length > 0 && !loading && !showPopup) {
        // Show popup after 2 seconds
        popupTimerRef.current = setTimeout(() => {
          console.log('🎯 Showing popup ad with', displayAdsList.length, 'ads');
          setShowPopup(true);
        }, 2000);
      }

      return () => {
        if (popupTimerRef.current) {
          clearTimeout(popupTimerRef.current);
        }
      };
    }
  }, [placement, ads, closedAds, loading, previewMode, showPopup]);

  const handleClose = (adId: string) => {
    console.log(`Closing ad: ${adId} for placement: ${placement}`);

    if (placement === 'popup') {
      setShowPopup(false);
    }

    if (previewMode) {
      console.log(`Preview mode: Ad ${adId} would be closed in production`);
      return;
    }

    const updated = { ...closedAds, [adId]: { closedAt: Date.now() } };
    setClosedAds(updated);
    try {
      localStorage.setItem(
        getStorageKey(placement, 'closed'),
        JSON.stringify(updated),
      );
    } catch {
      // localStorage unavailable
    }
  };

  const handleMinimize = (adId: string, minimized: boolean) => {
    // Always update state so the UI responds
    const updated = new Set(minimizedAds);
    if (minimized) updated.add(adId);
    else updated.delete(adId);
    setMinimizedAds(updated);

    // Skip localStorage persistence in preview mode
    if (previewMode) return;

    try {
      localStorage.setItem(
        getStorageKey(placement, 'minimized'),
        JSON.stringify([...updated]),
      );
    } catch {}
  };

  // Filter out permanently closed ads
  const displayAds = previewMode ? ads : ads.filter((ad) => !closedAds[ad._id]);

  const adCount = displayAds.length;
  const countClass =
    adCount === 1
      ? 'ads-count-1'
      : adCount === 2
        ? 'ads-count-2'
        : adCount === 3
          ? 'ads-count-3'
          : 'ads-count-many';

  // Compute per-ad size hint for AdBanner based on count + placement
  const adSize: 'normal' | 'small' | 'mini' =
    placement === 'sidebar' && adCount >= 3
      ? 'mini'
      : placement === 'sidebar' && adCount === 2
        ? 'small'
        : 'normal';

  // Check if all sidebar ads are minimized (to add is-minimized class)
  const allMinimized =
    placement === 'sidebar' &&
    adCount > 0 &&
    displayAds.every((ad) => minimizedAds.has(ad._id));

  console.log(
    `🎨 Rendering - placement: ${placement}, displayAds: ${displayAds.length}, showPopup: ${showPopup}`,
  );

  // Don't render anything if no ads
  if (loading || error || displayAds.length === 0) {
    return null;
  }

  // For popup placement
  if (placement === 'popup') {
    if (!showPopup) return null;

    return (
      <div className={`ad-manager ad-manager--popup ${className}`}>
        {displayAds.slice(0, 1).map((ad) => (
          <AdBanner
            key={ad._id}
            ad={ad}
            authToken={authToken}
            minimized={false}
            onClose={() => handleClose(ad._id)}
            onMinimize={(minimized) => handleMinimize(ad._id, minimized)}
          />
        ))}
      </div>
    );
  }

  // Regular placement rendering
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
          onMinimize={(minimized) => handleMinimize(ad._id, minimized)}
        />
      ))}
    </div>
  );
};

export default AdManager;
