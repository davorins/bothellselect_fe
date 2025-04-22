import React from 'react';
import ALLRoutes from './feature-module/router/router';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';

const App = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <ALLRoutes />;
};

export default App;
