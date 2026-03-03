import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  redirectPath?: string;
}

const ProtectedRoute = ({
  children,
  allowedRoles,
  fallback = <div>Loading...</div>,
  redirectPath = '/',
}: ProtectedRouteProps) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  console.log('isAuthenticated:', isAuthenticated); // Debugging
  console.log('role:', role); // Debugging
  console.log('isLoading:', isLoading); // Debugging
  console.log('allowedRoles:', allowedRoles); // Debugging

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  if (!allowedRoles.includes(role)) {
    console.log('User role not allowed. Redirecting to:', redirectPath); // Debugging
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
