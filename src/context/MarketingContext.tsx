import React, { createContext, useContext, ReactNode } from 'react';
import { getUTMForRegistration } from '../feature-module/hooks/useUTM';

interface MarketingContextType {
  getMarketingAttribution: () => {
    source: string;
    medium: string;
    campaign: string;
    content: string;
    term: string;
  };
}

const MarketingContext = createContext<MarketingContextType | undefined>(
  undefined,
);

export const MarketingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const getMarketingAttribution = () => {
    return getUTMForRegistration();
  };

  return (
    <MarketingContext.Provider value={{ getMarketingAttribution }}>
      {children}
    </MarketingContext.Provider>
  );
};

export const useMarketing = () => {
  const context = useContext(MarketingContext);
  if (!context) {
    throw new Error('useMarketing must be used within a MarketingProvider');
  }
  return context;
};
