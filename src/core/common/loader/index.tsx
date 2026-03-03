import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { all_routes } from '../../../feature-module/router/all_routes';

const Loader = () => {
  const routes = all_routes;
  const location = useLocation();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (
      location.pathname === routes.adminDashboard ||
      location.pathname === routes.coachDashboard ||
      location.pathname === routes.studentDashboard ||
      location.pathname === routes.parentDashboard ||
      location.pathname === routes.tournamentAdminPage ||
      location.pathname === routes.teams ||
      location.pathname === routes.adminRefundsPanel ||
      location.pathname === routes.activity ||
      location.pathname === routes.events
    ) {
      // Show the loader when navigating to a new route
      setShowLoader(true);

      // Hide the loader after 2 seconds
      const timeoutId = setTimeout(() => {
        setShowLoader(false);
      }, 2000);

      return () => {
        clearTimeout(timeoutId); // Clear the timeout when component unmounts
      };
    } else {
      setShowLoader(false);
    }
  }, [location.pathname]);

  return (
    <>
      {showLoader && <Preloader />}
      <div>{/* Your other content goes here */}</div>
    </>
  );
};

const Preloader = () => {
  return (
    <div id='global-loader'>
      <div className='page-loader'></div>
    </div>
  );
};

export default Loader;
