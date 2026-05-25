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
  maxAds?: number; // cap ads rendered per placement
}

// How long (ms) a "closed" ad stays suppressed before showing again (default 7 days)
const CLOSED_AD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type ClosedEntry = { closedAt: number };

const getStorageKey = (placement: string, suffix: string) =>
  `ads_${placement}_${suffix}`;

const loadClosedAds = (placement: string): Record<string, ClosedEntry> => {
  try {
    const raw = localStorage.getItem(getStorageKey(placement, 'closed'));
    if (!raw) return {};
    const parsed: Record<string, ClosedEntry> = JSON.parse(raw);
    // Purge expired entries
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
  const fetchedRef = useRef(false);

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

  const fetchAds = useCallback(async () => {
    // Guard: don't double-fetch on StrictMode double-invoke
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    setError(false);

    try {
      const userRole = user?.role || 'guest';
      const params = new URLSearchParams({
        placement,
        role: userRole,
        pageSlug,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/ads/active?${params}`,
        { headers },
      );

      if (!response.ok) {
        console.error(`Ad fetch failed: ${response.status}`);
        setError(true);
        return;
      }

      const data = await response.json();
      const fetched: Advertisement[] = data.ads || [];
      setAds(fetched.slice(0, maxAds));
    } catch (err) {
      console.error('Error fetching ads:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [placement, pageSlug, user?.role, authToken, maxAds]);

  // Re-fetch when auth token resolves (isAuthenticated changes)
  useEffect(() => {
    fetchedRef.current = false;
    fetchAds();
  }, [fetchAds]);

  const handleClose = (adId: string) => {
    const updated = { ...closedAds, [adId]: { closedAt: Date.now() } };
    setClosedAds(updated);
    try {
      localStorage.setItem(
        getStorageKey(placement, 'closed'),
        JSON.stringify(updated),
      );
    } catch {
      // localStorage unavailable (private browsing, etc.)
    }
  };

  const handleMinimize = (adId: string, minimized: boolean) => {
    const updated = new Set(minimizedAds);
    if (minimized) updated.add(adId);
    else updated.delete(adId);
    setMinimizedAds(updated);
    try {
      localStorage.setItem(
        getStorageKey(placement, 'minimized'),
        JSON.stringify([...updated]),
      );
    } catch {}
  };

  // Filter out permanently closed ads
  const displayAds = ads.filter((ad) => !closedAds[ad._id]);

  // Popup: lock body scroll while visible
  useEffect(() => {
    if (placement !== 'popup') return;
    if (displayAds.length > 0 && !loading) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [placement, displayAds.length, loading]);

  // Don't render placeholder space while loading or if nothing to show
  if (loading || error || displayAds.length === 0) return null;

  return (
    <div
      className={`ad-manager ad-manager--${placement} ${className}`}
      aria-label='Advertisements'
    >
      {displayAds.map((ad) => (
        <AdBanner
          key={ad._id}
          ad={ad}
          authToken={authToken}
          minimized={showMinimized && minimizedAds.has(ad._id)}
          onClose={() => handleClose(ad._id)}
        />
      ))}
    </div>
  );
};

export default AdManager;
