import React, { useState, useEffect } from 'react';
import { Advertisement } from '../../../types/advertisement-types';
import './AdBanner.css';

interface AdBannerProps {
  ad: Advertisement;
  onClose?: () => void;
  minimized?: boolean;
  className?: string;
  authToken?: string;
  size?: 'normal' | 'small' | 'mini';
}

const AdBanner: React.FC<AdBannerProps> = ({
  ad,
  onClose,
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
      <div className='ad-banner__controls'>
        {onClose && (
          <button
            className='ad-btn ad-btn--icon ad-btn--close'
            onClick={onClose}
            aria-label='Close advertisement'
            title='Close'
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        )}
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
