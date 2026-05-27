import React, { useState, useEffect } from 'react';
import { Advertisement } from '../../../types/advertisement-types';
import './AdBanner.css';

interface AdBannerProps {
  ad: Advertisement;
  onClose?: () => void;
  onMinimize?: (minimized: boolean) => void;
  minimized?: boolean;
  className?: string;
  authToken?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({
  ad,
  onClose,
  onMinimize,
  minimized = false,
  className = '',
  authToken,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync minimized prop if parent changes it
  useEffect(() => {
    setIsMinimized(minimized);
  }, [minimized]);

  const handleClick = async () => {
    const destination = ad.clickUrl || ad.website;
    if (!destination) return;

    try {
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/ads/click/${ad._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
    } catch (error) {
      console.error('Error recording ad click:', error);
      // Non-fatal: continue to redirect
    }

    window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const handleMinimizeToggle = () => {
    const newMinimizedState = !isMinimized;
    setIsMinimized(newMinimizedState);
    if (onMinimize) {
      onMinimize(newMinimizedState);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const getImageUrl = (): string | null => {
    if (isMobile && ad.mobileImage?.url) return ad.mobileImage.url;
    return ad.desktopImage?.url || ad.mobileImage?.url || null;
  };

  const imageUrl = getImageUrl();
  const altText =
    ad.desktopImage?.alt || ad.mobileImage?.alt || ad.title || ad.businessName;
  const hasImage = imageUrl && !imageError;
  const hasContent = ad.title || ad.businessName || ad.description;

  // Don't render if there's nothing to show
  if (!hasImage && !hasContent) return null;

  if (isMinimized) {
    return (
      <div
        className={`ad-banner ad-banner--minimized ${isVisible ? 'ad-banner--visible' : ''} ${className}`}
      >
        <button
          className='ad-btn ad-btn--icon'
          onClick={handleMinimizeToggle}
          aria-label='Expand advertisement'
          title='Expand'
        >
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <polyline points='15 3 21 3 21 9' />
            <polyline points='9 21 3 21 3 15' />
            <line x1='21' y1='3' x2='14' y2='10' />
            <line x1='3' y1='21' x2='10' y2='14' />
          </svg>
        </button>

        <div
          className='ad-banner__minimized-body'
          onClick={handleClick}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          {hasImage && (
            <img
              src={imageUrl!}
              alt={altText}
              className='ad-banner__minimized-img'
              onError={() => setImageError(true)}
            />
          )}
          <span className='ad-banner__minimized-label'>{ad.businessName}</span>
          <span className='ad-label'>Ad</span>
        </div>

        {onClose && (
          <button
            className='ad-btn ad-btn--icon ad-btn--close'
            onClick={handleClose}
            aria-label='Close advertisement'
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
        )}
      </div>
    );
  }

  return (
    <div
      className={`ad-banner ${isVisible ? 'ad-banner--visible' : ''} ${className}`}
      role='complementary'
      aria-label={`Advertisement: ${ad.businessName}`}
    >
      {/* Ad label */}
      <span className='ad-label'>Sponsored</span>

      {/* Controls */}
      <div className='ad-banner__controls'>
        <button
          className='ad-btn ad-btn--icon'
          onClick={handleMinimizeToggle}
          aria-label='Minimize advertisement'
          title='Minimize'
        >
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <line x1='5' y1='12' x2='19' y2='12' />
          </svg>
        </button>
        {onClose && (
          <button
            className='ad-btn ad-btn--icon ad-btn--close'
            onClick={handleClose}
            aria-label='Close advertisement'
            title='Close'
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
        )}
      </div>

      {/* Clickable content area */}
      <div
        className='ad-banner__body'
        onClick={handleClick}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label={`Visit ${ad.businessName}`}
      >
        {hasImage && (
          <div className='ad-banner__image-wrap'>
            <img
              src={imageUrl!}
              alt={altText}
              className='ad-banner__image'
              onError={() => setImageError(true)}
              loading='lazy'
            />
          </div>
        )}

        {/* Text content — always shown, even without image */}
        <div
          className={`ad-banner__info ${hasImage ? '' : 'ad-banner__info--full'}`}
        >
          <p className='ad-banner__business'>{ad.businessName}</p>
          {ad.title && ad.title !== ad.businessName && (
            <h3 className='ad-banner__title'>{ad.title}</h3>
          )}
          {ad.description && (
            <p className='ad-banner__description'>{ad.description}</p>
          )}
          {(ad.clickUrl || ad.website) && (
            <span className='ad-banner__cta'>
              {ad.ctaText || 'Learn More'}
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
              >
                <line x1='5' y1='12' x2='19' y2='12' />
                <polyline points='12 5 19 12 12 19' />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
