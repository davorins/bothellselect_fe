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
  size?: 'normal' | 'small' | 'mini' | 'footerbar'; // Add 'footerbar' here
}

const AdBanner: React.FC<AdBannerProps> = ({
  ad,
  onClose,
  onMinimize,
  minimized = false,
  className = '',
  authToken,
  size = 'normal',
}) => {
  const [imageError, setImageError] = useState(false);
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
      // Non-fatal
    }
    window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const handleMinimizeToggle = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    onMinimize?.(next);
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

  if (!hasImage && !hasContent) return null;

  // ── Footerbar size (skinny horizontal card) ──────────────────────────────
  if (size === 'footerbar') {
    return (
      <div
        className={`ad-banner ad-banner--footerbar ${isVisible ? 'ad-banner--visible' : ''} ${className}`}
        role='complementary'
        aria-label={`Advertisement: ${ad.businessName}`}
      >
        <div
          className='ad-banner__body ad-banner__body--horizontal'
          onClick={handleClick}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
          aria-label={`Visit ${ad.businessName}`}
        >
          {hasImage && (
            <div className='ad-banner__image-wrap--small'>
              <img
                src={imageUrl!}
                alt={altText}
                className='ad-banner__image'
                onError={() => setImageError(true)}
                loading='lazy'
              />
            </div>
          )}
          <div className='ad-banner__info--horizontal'>
            <p className='ad-banner__business'>{ad.businessName}</p>
            {ad.title && ad.title !== ad.businessName && (
              <h3 className='ad-banner__title--horizontal'>{ad.title}</h3>
            )}
          </div>
          <span className='ad-banner__cta--horizontal'>
            {ad.ctaText || 'Learn More'}
          </span>
        </div>
      </div>
    );
  }

  // ── Minimized pill ──────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div
        className={`ad-banner is-minimized-pill ${isVisible ? 'ad-banner--visible' : ''} ${className}`}
        role='complementary'
        aria-label={`Advertisement: ${ad.businessName}`}
      >
        <div
          className='ad-banner__minimized-body'
          onClick={handleClick}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
          aria-label={`Visit ${ad.businessName}`}
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

        <div className='ad-banner__controls'>
          <button
            className='ad-btn ad-btn--icon'
            onClick={handleMinimizeToggle}
            aria-label='Expand advertisement'
            title='Expand'
          >
            <svg
              width='13'
              height='13'
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
        </div>
      </div>
    );
  }

  // ── Full card ───────────────────────────────────────────────────
  return (
    <div
      className={`ad-banner ad-banner--${size} ${isVisible ? 'ad-banner--visible' : ''} ${className}`}
      role='complementary'
      aria-label={`Advertisement: ${ad.businessName}`}
    >
      <span className='ad-label'>Sponsored</span>

      <div className='ad-banner__controls'>
        <button
          className='ad-btn ad-btn--icon'
          onClick={handleMinimizeToggle}
          aria-label='Minimize advertisement'
          title='Minimize'
        >
          <svg
            width='13'
            height='13'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
          >
            <line x1='5' y1='12' x2='19' y2='12' />
          </svg>
        </button>
      </div>

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
                width='11'
                height='11'
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
