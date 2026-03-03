//router.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { publicRoutes, authRoutes, protectedRoutes } from './router.link';
import Feature from '../feature';
import AuthFeature from '../authFeature';
import MainLayout from '../components/MainLayout';
import HomePage from '../pages/HomePage';
import ContactUsPage from '../pages/ContactUsPage';
import AboutUsPage from '../pages/AboutUsPage';
import ProgramLeadership from '../pages/ProgramLeadership';
import OurTeamPage from '../pages/OurTeamPage';
import FAQUserView from '../content/FAQUserView';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import Terms from '../pages/Terms';
import EventCards from '../announcements/eventCards';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import InTheSpotlight from '../pages/InTheSpotlight';
import PublicTicketLookup from '../../components/PublicTicketLookup';
import PublicTournamentPage from '../pages/tournament/PublicTournamentPage';
import PublicTournamentsListPage from '../pages/tournament/PublicTournamentsListPage';

interface ALLRoutesProps {
  showSponsorLogo: boolean;
  onSplashClose: () => void;
}

const ALLRoutes = ({ showSponsorLogo, onSplashClose }: ALLRoutesProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Fetch parentId from the authenticated user
  const parentId = user?._id || 'defaultParentId';

  return (
    <Routes>
      <Route
        path='/'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <HomePage onSplashClose={onSplashClose} />{' '}
            {/* Pass onSplashClose */}
          </MainLayout>
        }
      />
      <Route
        path='/contact-us'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <ContactUsPage />
          </MainLayout>
        }
      />
      <Route
        path='/about-us'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <AboutUsPage />
          </MainLayout>
        }
      />
      <Route
        path='/program-leadership'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <ProgramLeadership />
          </MainLayout>
        }
      />
      <Route
        path='/our-team'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <OurTeamPage />
          </MainLayout>
        }
      />
      <Route
        path='/in-the-spotlight'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <InTheSpotlight />
          </MainLayout>
        }
      />
      <Route
        path='/events'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <EventCards />
          </MainLayout>
        }
      />
      <Route
        path='/faq'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <FAQUserView />
          </MainLayout>
        }
      />
      <Route
        path='/privacy-policy'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <PrivacyPolicy />
          </MainLayout>
        }
      />
      <Route
        path='/terms-conditions'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <Terms />
          </MainLayout>
        }
      />
      <Route
        path='/find-tickets'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <PublicTicketLookup />
          </MainLayout>
        }
      />

      <Route
        path='/tournaments'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <PublicTournamentsListPage />
          </MainLayout>
        }
      />
      <Route
        path='/tournaments/:tournamentId'
        element={
          <MainLayout showSponsorLogo={showSponsorLogo}>
            <PublicTournamentPage />
          </MainLayout>
        }
      />

      {/* Public routes */}
      <Route element={<Feature />}>
        {publicRoutes.map((route, idx) => (
          <Route key={idx} path={route.path} element={route.element} />
        ))}
      </Route>

      {/* Protected routes (for authenticated users with specific roles) */}
      <Route element={<Feature />}>
        {protectedRoutes.map((route, idx) => (
          <Route key={idx} path={route.path} element={route.element} />
        ))}
      </Route>

      {/* Auth routes (only for unauthenticated users) */}
      <Route element={<AuthFeature />}>
        {authRoutes.map((route, idx) => (
          <Route
            key={idx}
            path={route.path}
            element={
              !isAuthenticated ? route.element : <Navigate to='/' replace />
            }
          />
        ))}
      </Route>
      {/* Fallback route */}
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
};

export default ALLRoutes;
