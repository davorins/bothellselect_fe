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
      {/* Top header ad banner */}
      <AdManager
        placement='header'
        pageSlug={pageSlug}
        className='header-ad-container'
      />

      <Header showSponsorLogo={showSponsorLogo || false} />

      <div className='main-content-wrapper'>
        {/* Main content — full width, sidebar ad is fixed-positioned so no aside needed */}
        <main className='main-content'>{children}</main>
      </div>

      <Footer />

      {/* Footer ad banner */}
      <AdManager
        placement='footer'
        pageSlug={pageSlug}
        className='footer-ad-container'
      />

      {/*
        Sidebar ad — fixed-positioned via CSS.
        On desktop (>1100px): floats on the right edge.
        On mobile (≤768px): becomes a horizontal bottom dock.
        FloatingAd removed — it was duplicating this placement.
      */}
      <AdManager
        placement='sidebar'
        pageSlug={pageSlug}
        showMinimized={true}
        maxAds={3}
      />

      {/* Popup ad — modal overlay, appears after 2s */}
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
