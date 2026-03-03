// src/context/RegistrationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AdminRegistrationConfig,
  RegistrationContextType,
} from '../types/registration-types';

const RegistrationContext = createContext<RegistrationContextType | undefined>(
  undefined
);

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeRegistrations, setActiveRegistrations] = useState<
    AdminRegistrationConfig[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRegistrations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/admin/active-forms`
      );
      if (response.ok) {
        const data = await response.json();
        setActiveRegistrations(data);
      }
    } catch (error) {
      console.error('Error fetching active registrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshRegistrations();
  }, []);

  return (
    <RegistrationContext.Provider
      value={{
        activeRegistrations,
        isLoading,
        refreshRegistrations,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error(
      'useRegistration must be used within a RegistrationProvider'
    );
  }
  return context;
};
