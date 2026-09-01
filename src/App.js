import React, { useState } from 'react';
import ALLRoutes from './feature-module/router/router';
import { useAuth } from './context/AuthContext';
import { TournamentEventProvider } from './context/TournamentEventContext';
import { RegistrationProvider } from './context/RegistrationContext';
import { PageProvider } from './context/PageContext';
import { SeasonEventsProvider } from './context/SeasonEventsContext';
import { AdProvider } from './context/AdContext';
import { MarketingProvider } from './context/MarketingContext';
import LoadingSpinner from './components/common/LoadingSpinner';

const App = () => {
  const { isLoading } = useAuth();
  const [showSponsorLogo, setShowSponsorLogo] = useState(false);

  const handleSplashClose = () => {
    setShowSponsorLogo(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <MarketingProvider>
      <AdProvider>
        <SeasonEventsProvider>
          <TournamentEventProvider>
            <RegistrationProvider>
              <PageProvider>
                <ALLRoutes
                  showSponsorLogo={showSponsorLogo}
                  onSplashClose={handleSplashClose}
                />
              </PageProvider>
            </RegistrationProvider>
          </TournamentEventProvider>
        </SeasonEventsProvider>
      </AdProvider>
    </MarketingProvider>
  );
};

export default App;
