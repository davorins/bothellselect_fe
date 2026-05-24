import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AdManager from './AdManager';

const FloatingAd: React.FC = () => {
  const [showFloating, setShowFloating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Show floating ad after scrolling
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setShowFloating(scrollPosition > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showFloating) return null;

  return (
    <div className='floating-ad-container'>
      <AdManager
        placement='popup'
        pageSlug={location.pathname.replace(/^\//, '') || 'home'}
        showMinimized={true}
      />
    </div>
  );
};

export default FloatingAd;
