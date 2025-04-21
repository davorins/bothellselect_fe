import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { publicRoutes, authRoutes } from './router.link';
import Feature from '../feature';
import AuthFeature from '../authFeature';
import MainLayout from '../components/MainLayout';
import HomePage from '../pages/HomePage';
import ContactUsPage from '../pages/ContactUsPage';
import AboutUsPage from '../pages/AboutUsPage';
import OurTeamPage from '../pages/OurTeamPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PlayerRegistrationForm from '../components/PlayerRegistrationForm';

const ALLRoutes = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Fetch parentId from the authenticated user
  const parentId = user?._id || 'defaultParentId'; // Use parentId instead of playerId

  return (
    <Routes>
      {/* Home Page (Public) */}
      <Route
        path='/'
        element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        }
      />

      {/* Contact Us Page (Public) */}
      <Route
        path='/contact-us'
        element={
          <MainLayout>
            <ContactUsPage />
          </MainLayout>
        }
      />

      {/* About Us Page (Public) */}
      <Route
        path='/about-us'
        element={
          <MainLayout>
            <AboutUsPage />
          </MainLayout>
        }
      />

      {/* Our Team Page (Public) */}
      <Route
        path='/our-team'
        element={
          <MainLayout>
            <OurTeamPage />
          </MainLayout>
        }
      />

      {/* Public routes */}
      <Route element={<Feature />}>
        {publicRoutes.map((route, idx) => (
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

      {/* Player Registration Route (Protected) */}
      <Route
        path='/player-registration'
        element={
          <ProtectedRoute allowedRoles={['user', 'admin', 'coach']}>
            <Feature>
              <PlayerRegistrationForm playerId={parentId} />{' '}
              {/* Use parentId */}
            </Feature>
          </ProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
};

export default ALLRoutes;
