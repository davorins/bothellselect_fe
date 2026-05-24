import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

interface AdContextType {
  closedAds: Set<string>;
  minimizedAds: Set<string>;
  closeAd: (adId: string, placement?: string) => void;
  minimizeAd: (adId: string, placement?: string) => void;
  restoreAd: (adId: string) => void;
  shouldShowAd: (adId: string) => boolean;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export const useAd = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
};

interface AdProviderProps {
  children: ReactNode;
}

export const AdProvider: React.FC<AdProviderProps> = ({ children }) => {
  const [closedAds, setClosedAds] = useState<Set<string>>(new Set());
  const [minimizedAds, setMinimizedAds] = useState<Set<string>>(new Set());

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedClosed = localStorage.getItem('closed_ads');
      if (savedClosed) {
        setClosedAds(new Set(JSON.parse(savedClosed)));
      }

      const savedMinimized = localStorage.getItem('minimized_ads');
      if (savedMinimized) {
        setMinimizedAds(new Set(JSON.parse(savedMinimized)));
      }
    } catch (error) {
      console.error('Error loading ad state:', error);
    }
  }, []);

  const closeAd = (adId: string, placement?: string) => {
    const newClosed = new Set(closedAds);
    newClosed.add(adId);
    setClosedAds(newClosed);

    // Save to localStorage
    localStorage.setItem('closed_ads', JSON.stringify([...newClosed]));
  };

  const minimizeAd = (adId: string, placement?: string) => {
    const newMinimized = new Set(minimizedAds);
    newMinimized.add(adId);
    setMinimizedAds(newMinimized);

    // Save to localStorage
    localStorage.setItem('minimized_ads', JSON.stringify([...newMinimized]));
  };

  const restoreAd = (adId: string) => {
    const newMinimized = new Set(minimizedAds);
    newMinimized.delete(adId);
    setMinimizedAds(newMinimized);

    localStorage.setItem('minimized_ads', JSON.stringify([...newMinimized]));
  };

  const shouldShowAd = (adId: string) => {
    return !closedAds.has(adId);
  };

  return (
    <AdContext.Provider
      value={{
        closedAds,
        minimizedAds,
        closeAd,
        minimizeAd,
        restoreAd,
        shouldShowAd,
      }}
    >
      {children}
    </AdContext.Provider>
  );
};
