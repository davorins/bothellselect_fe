import React, { useState, useEffect } from 'react';
import { Advertisement } from '../../../types/advertisement-types';
import './AdBanner.css';

interface AdBannerProps {
  ad: Advertisement;
  onClose?: () => void;
  minimized?: boolean;
  className?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({
  ad,
  onClose,
  minimized = false,
  className = '',
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(minimized);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = async () => {
    try {
      // Record click
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/ads/click/${ad._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      // Redirect
      if (ad.clickUrl) {
        window.open(ad.clickUrl, '_blank');
      } else if (ad.website) {
        window.open(ad.website, '_blank');
      }
    } catch (error) {
      console.error('Error recording ad click:', error);
      // Still redirect even if tracking fails
      if (ad.clickUrl) window.open(ad.clickUrl, '_blank');
      else if (ad.website) window.open(ad.website, '_blank');
    }
  };

  const getImageUrl = () => {
    if (isMobile && ad.mobileImage?.url) {
      return ad.mobileImage.url;
    }
    return ad.desktopImage?.url || ad.mobileImage?.url;
  };

  const imageUrl = getImageUrl();
  const altText = ad.desktopImage?.alt || ad.mobileImage?.alt || ad.title;

  if (isMinimized) {
    return (
      <div className={`ad-banner-minimized ${className}`}>
        <button
          className='ad-expand-btn'
          onClick={() => setIsMinimized(false)}
          aria-label='Expand ad'
        >
          <i className='ti ti-arrows-maximize' />
        </button>
        <div className='ad-minimized-content' onClick={handleClick}>
          {imageUrl && (
            <img src={imageUrl} alt={altText} className='ad-minimized-image' />
          )}
          <span className='ad-minimized-text'>{ad.businessName}</span>
        </div>
        {onClose && (
          <button className='ad-close-btn' onClick={onClose} aria-label='Close'>
            <i className='ti ti-x' />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`ad-banner ${className}`}>
      {!imageLoaded && (
        <div className='ad-banner-placeholder'>
          <i className='ti ti-ad' />
          <span>Loading advertisement...</span>
        </div>
      )}

      <div className='ad-banner-content' onClick={handleClick}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={altText}
            className='ad-banner-image'
            onLoad={() => setImageLoaded(true)}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
        )}

        <div className='ad-banner-info'>
          <h3 className='ad-title'>{ad.title || ad.businessName}</h3>
          {ad.description && <p className='ad-description'>{ad.description}</p>}
          <button className='ad-cta-btn'>
            {ad.ctaText}
            <i className='ti ti-arrow-right' />
          </button>
        </div>
      </div>

      <div className='ad-banner-footer'>
        <button
          className='ad-minimize-btn'
          onClick={() => setIsMinimized(true)}
          aria-label='Minimize'
        >
          <i className='ti ti-minus' />
        </button>
        {onClose && (
          <button className='ad-close-btn' onClick={onClose} aria-label='Close'>
            <i className='ti ti-x' />
          </button>
        )}
      </div>
    </div>
  );
};

export default AdBanner;
