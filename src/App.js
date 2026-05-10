// src/App.js
import React, { useState } from 'react';
import ALLRoutes from './feature-module/router/router';
import { useAuth } from './context/AuthContext';
import { TournamentEventProvider } from './context/TournamentEventContext';
import { RegistrationProvider } from './context/RegistrationContext';
import { PageProvider } from './context/PageContext';
import { SeasonEventsProvider } from './context/SeasonEventsContext';
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
  );
};

export default App;
