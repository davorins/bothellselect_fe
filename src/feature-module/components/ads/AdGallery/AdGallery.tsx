import React, { useEffect, useState, useRef } from 'react';
import { Advertisement } from '../../../../types/advertisement-types';
import AdBanner from '../AdBanner';
import './AdGallery.css';

interface AdGalleryProps {
  ads: Advertisement[];
  authToken?: string;
  onCloseAd: (id: string) => void;
  onExpandAd: (id: string) => void;
  minimizedAds: Set<string>;
  isPreviewMode?: boolean;
  /** Force horizontal layout (for use above/below other content) */
  horizontal?: boolean;
}

const AdGallery: React.FC<AdGalleryProps> = ({
  ads,
  authToken,
  onCloseAd,
  onExpandAd,
  minimizedAds,
  isPreviewMode = false,
  horizontal = true, // default to horizontal as requested
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Layout class based on ad count
  const getLayoutClass = () => {
    if (ads.length === 1) return 'ad-gallery--single';
    if (ads.length === 2) return 'ad-gallery--double';
    if (ads.length === 3) return 'ad-gallery--triple';
    return 'ad-gallery--scroll'; // 4 or more
  };

  // Size prop passed to AdBanner
  const getAdSize = (): 'normal' | 'small' | 'mini' => {
    if (ads.length <= 2) return 'normal';
    if (ads.length === 3) return 'small';
    return 'mini';
  };

  // If a single ad and horizontal, keep it centered & landscape
  const containerClass = [
    'ad-gallery',
    getLayoutClass(),
    horizontal ? 'ad-gallery--horizontal' : 'ad-gallery--vertical',
  ].join(' ');

  if (ads.length === 0 && !isPreviewMode) return null;

  return (
    <section className='ad-gallery-section'>
      <div className='ad-gallery-section__inner'>
        <div className='ad-gallery-section__header'>
          <span className='ad-gallery-section__label'>Sponsored</span>
          <h2 className='ad-gallery-section__title'>Our Partners</h2>
        </div>

        <div ref={scrollRef} className={containerClass}>
          {ads.map((ad) => (
            <div key={ad._id} className='ad-gallery__item'>
              <div className='ad-gallery__card'>
                <AdBanner
                  ad={ad}
                  authToken={authToken}
                  size={getAdSize()}
                  minimized={minimizedAds.has(ad._id)}
                  onClose={() => onCloseAd(ad._id)}
                  onExpand={() => onExpandAd(ad._id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AdGallery;
