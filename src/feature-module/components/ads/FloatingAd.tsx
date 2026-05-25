import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdManager from './AdManager';
import './FloatingAd.css';

interface FloatingAdProps {
  scrollThreshold?: number; // px scrolled before showing (default 400)
}

const FloatingAd: React.FC<FloatingAdProps> = ({ scrollThreshold = 400 }) => {
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Reset on route change
    setShow(false);

    const handleScroll = () => {
      setShow(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, scrollThreshold]);

  if (!show) return null;

  const pageSlug = location.pathname.replace(/^\//, '') || 'home';

  return (
    <div className='floating-ad'>
      {/*
        NOTE: FloatingAd uses placement="sidebar" so it doesn't conflict
        with the popup AdManager already in MainLayout. The popup placement
        should only exist in ONE place. FloatingAd is a floating sidebar-style
        unit that appears after scrolling.
      */}
      <AdManager
        placement='sidebar'
        pageSlug={pageSlug}
        showMinimized={true}
        maxAds={1}
        className='floating-ad__manager'
      />
    </div>
  );
};

export default FloatingAd;
