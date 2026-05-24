import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Advertisement } from '../../../types/advertisement-types';
import AdBanner from './AdBanner';
import './AdManager.css';

interface AdManagerProps {
  placement?: 'sidebar' | 'header' | 'footer' | 'inline' | 'popup';
  pageSlug?: string;
  showMinimized?: boolean;
  className?: string;
}

const AdManager: React.FC<AdManagerProps> = ({
  placement = 'sidebar',
  pageSlug = 'all',
  showMinimized = true,
  className = '',
}) => {
  const { user, isAuthenticated } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [minimizedAds, setMinimizedAds] = useState<Set<string>>(new Set());
  const [closedAds, setClosedAds] = useState<Set<string>>(new Set());

  const fetchAds = useCallback(async () => {
    try {
      const userRole = user?.role || 'guest';
      const queryParams = new URLSearchParams({
        placement,
        role: userRole,
        pageSlug,
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/ads/active?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(isAuthenticated && {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            }),
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setAds(data.ads || []);
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  }, [placement, pageSlug, user, isAuthenticated]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Load closed/minimized state from localStorage
  useEffect(() => {
    const savedClosed = localStorage.getItem(`closed_ads_${placement}`);
    if (savedClosed) {
      setClosedAds(new Set(JSON.parse(savedClosed)));
    }

    const savedMinimized = localStorage.getItem(`minimized_ads_${placement}`);
    if (savedMinimized) {
      setMinimizedAds(new Set(JSON.parse(savedMinimized)));
    }
  }, [placement]);

  const handleClose = (adId: string) => {
    const newClosed = new Set(closedAds);
    newClosed.add(adId);
    setClosedAds(newClosed);
    localStorage.setItem(
      `closed_ads_${placement}`,
      JSON.stringify([...newClosed]),
    );
  };

  const getDisplayAds = () => {
    return ads.filter((ad) => !closedAds.has(ad._id));
  };

  const displayAds = getDisplayAds();

  if (loading || displayAds.length === 0) {
    return null;
  }

  return (
    <div className={`ad-manager ad-manager-${placement} ${className}`}>
      {displayAds.map((ad) => (
        <AdBanner
          key={ad._id}
          ad={ad}
          minimized={minimizedAds.has(ad._id) && showMinimized}
          onClose={() => handleClose(ad._id)}
        />
      ))}
    </div>
  );
};

export default AdManager;
