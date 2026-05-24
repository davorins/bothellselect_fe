import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import AdManager from './ads/AdManager';
import FloatingAd from './ads/FloatingAd';
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
        {/* Left sidebar ad */}
        <aside className='sidebar-left'>
          <AdManager
            placement='sidebar'
            pageSlug={pageSlug}
            showMinimized={true}
            className='sidebar-ad'
          />
        </aside>

        {/* Main content */}
        <main className='main-content'>{children}</main>

        {/* Right sidebar ad */}
        <aside className='sidebar-right'>
          <AdManager
            placement='sidebar'
            pageSlug={pageSlug}
            showMinimized={true}
            className='sidebar-ad'
          />
        </aside>
      </div>

      <Footer />

      {/* Footer ad banner */}
      <AdManager
        placement='footer'
        pageSlug={pageSlug}
        className='footer-ad-container'
      />

      <FloatingAd />
    </div>
  );
};

export default MainLayout;
