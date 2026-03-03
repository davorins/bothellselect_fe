import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  showSponsorLogo?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showSponsorLogo,
}) => {
  return (
    <div className='main-layout'>
      <Header showSponsorLogo={showSponsorLogo || false} />
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default MainLayout;
