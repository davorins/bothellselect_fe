import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface TryoutEvent {
  season: string;
  year: number;
  tryoutId?: string;
}

interface TryoutEventContextType {
  tryoutEvent: TryoutEvent;
  setTryoutEvent: (tryoutEvent: TryoutEvent) => void;
}

const TryoutEventContext = createContext<TryoutEventContextType | undefined>(
  undefined
);

export const TryoutEventProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tryoutEvent, setTryoutEvent] = useState<TryoutEvent>({
    season: 'Fall', // Default value
    year: 2025, // Default value
    tryoutId: undefined,
  });

  // Optional: Fetch tryout event dynamically from API
  useEffect(() => {
    const fetchTryoutEvent = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/tryouts/current`
        );
        setTryoutEvent({
          season: response.data.season,
          year: response.data.year,
          tryoutId: response.data.tryoutId,
        });
      } catch (error) {
        console.error('Error fetching tryout event:', error);
        // Keep default values or handle error as needed
      }
    };

    // Uncomment to enable API fetching
    // fetchTryoutEvent();
  }, []);

  return (
    <TryoutEventContext.Provider value={{ tryoutEvent, setTryoutEvent }}>
      {children}
    </TryoutEventContext.Provider>
  );
};

export const useTryoutEvent = () => {
  const context = useContext(TryoutEventContext);
  if (!context) {
    throw new Error('useTryoutEvent must be used within a TryoutEventProvider');
  }
  return context;
};
