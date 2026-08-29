// TopBarAds.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import AdManager from './AdManager';

const TopBarAds: React.FC = () => {
  const location = useLocation();
  const pageSlug = location.pathname.replace(/^\//, '') || 'home';

  return (
    <AdManager
      placement='topbar'
      pageSlug={pageSlug}
      showMinimized={true}
      maxAds={5}
    />
  );
};

export default TopBarAds;
