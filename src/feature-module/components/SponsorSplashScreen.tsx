import React, { useEffect, useState } from 'react';

interface Sponsor {
  id: string;
  name: string;
  logo: string;
  link: string;
  fallbackLogo: string;
}

interface SponsorSplashScreenProps {
  onClose: () => void;
}

const SponsorSplashScreen: React.FC<SponsorSplashScreenProps> = ({
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const sponsors: Sponsor[] = [
    {
      id: 'concrete_restoration',
      name: 'Concrete Restoration Inc.',
      logo: 'assets/img/sponsor_splashscreen.png',
      link: 'https://concreterestorationinc.com/',
      fallbackLogo: 'assets/img/fallback_logo.png',
    },
    {
      id: 'gr_solution',
      name: 'GR Solution',
      logo: 'assets/img/sponsor_splashscreen_2.png',
      link: 'https://www.grshsolution.com/',
      fallbackLogo: 'assets/img/fallback_logo.png',
    },
  ];

  useEffect(() => {
    // Robust mobile detection
    const isMobile =
      window.matchMedia('(max-width: 767px)').matches ||
      window.innerWidth <= 767 ||
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && window.innerWidth < 1024);
    console.log(
      'Splash screen check - isMobile:',
      isMobile,
      'window.innerWidth:',
      window.innerWidth,
      'window.innerHeight:',
      window.innerHeight,
      'userAgent:',
      navigator.userAgent,
      'touchSupport:',
      'ontouchstart' in window,
      'viewport:',
      `${window.innerWidth}x${window.innerHeight}`
    );

    if (isMobile) {
      console.log('Mobile detected, skipping splash screen');
      setIsVisible(false);
      onClose();
      return;
    }

    // Check if splash screen has been seen
    let hasSeenSplash = false;
    try {
      hasSeenSplash = localStorage.getItem('hasSeenSplash') === 'true';
    } catch (error) {
      console.error('Error accessing localStorage:', error);
    }

    if (hasSeenSplash) {
      console.log('Splash screen already seen, skipping');
      setIsVisible(false);
      onClose();
      return;
    }

    setIsVisible(true);
    console.log(
      'Showing splash screen with sponsors:',
      sponsors.map((s) => s.name)
    );

    const timer = setTimeout(() => {
      console.log('Splash screen timeout, closing');
      setIsVisible(false);
      try {
        localStorage.setItem('hasSeenSplash', 'true');
        console.log('Set hasSeenSplash to true');
      } catch (error) {
        console.error('Error updating localStorage:', error);
      }
      onClose();
    }, 7000); // Close after 7 seconds

    return () => {
      console.log('Cleaning up splash screen timer');
      clearTimeout(timer);
    };
  }, [onClose]);

  if (!isVisible) {
    console.log('Splash screen not visible, rendering null');
    return null;
  }

  return (
    <div
      className='modal fade show sponsor-splash-screen'
      style={{ display: 'block' }}
      aria-modal='true'
      role='dialog'
    >
      <div className='modal-dialog modal-dialog-centered modal-lg'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h4 className='modal-title'>Our Partners</h4>
            <button
              type='button'
              className='btn-close custom-btn-close'
              onClick={() => {
                console.log('Close button clicked');
                setIsVisible(false);
                try {
                  localStorage.setItem('hasSeenSplash', 'true');
                  console.log('Set hasSeenSplash to true');
                } catch (error) {
                  console.error('Error updating localStorage:', error);
                }
                onClose();
              }}
              aria-label='Close'
            >
              <i className='ti ti-x' />
            </button>
          </div>
          <div className='modal-body'>
            <div className='home-detail-info'>
              <div
                className='sponsor-container'
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '20px',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {sponsors.map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className='sponsor-item'
                    style={{ flex: '1', maxWidth: '45%' }}
                  >
                    <span className='d-block mb-3 layout-img'>
                      <a href={sponsor.link} target='_blank' rel='noreferrer'>
                        <img
                          src={sponsor.logo}
                          alt={sponsor.name}
                          className='sponsor-splash-logo'
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                          }}
                          onError={(e) => {
                            console.error(
                              'Splash screen image failed to load:',
                              sponsor.logo,
                              'trying fallback:',
                              sponsor.fallbackLogo
                            );
                            e.currentTarget.src = sponsor.fallbackLogo;
                          }}
                          onLoad={() =>
                            console.log(
                              'Splash screen image loaded successfully:',
                              sponsor.logo
                            )
                          }
                        />
                      </a>
                    </span>
                  </div>
                ))}
              </div>
              <p className='splash-text'>
                Proudly supporting Partizan Basketball!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorSplashScreen;
