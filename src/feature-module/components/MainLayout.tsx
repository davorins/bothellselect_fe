import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AdManager from './ads/AdManager';
import './MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
  showSponsorLogo?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showSponsorLogo,
}) => {
  const location = useLocation();
  const pageSlug = location.pathname.replace(/^\//, '') || 'home';

  return (
    <div className='main-layout'>
      {/* Top Bar - horizontal scrollable ads above header */}
      <AdManager
        placement='topbar'
        pageSlug={pageSlug}
        showMinimized={true}
        maxAds={5}
        className='topbar-ad-container'
      />

      <Header showSponsorLogo={showSponsorLogo || false} />

      <div className='main-content-wrapper'>
        <main className='main-content'>{children}</main>
      </div>

      {/* Footer ads - skinny horizontal scrollable ads above footer */}
      <AdManager
        placement='footer'
        pageSlug={pageSlug}
        showMinimized={true}
        maxAds={5}
        className='footer-ad-container'
      />

      <Footer />

      <AdManager
        placement='sidebar'
        pageSlug={pageSlug}
        showMinimized={true}
        maxAds={3}
      />

      <AdManager
        placement='popup'
        pageSlug={pageSlug}
        showMinimized={false}
        maxAds={1}
        className='popup-ad-container'
      />
    </div>
  );
};

export default MainLayout;
