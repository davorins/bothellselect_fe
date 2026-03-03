import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface TournamentEvent {
  tournament: string;
  year: number;
  tournamentId?: string;
}

interface TournamentEventContextType {
  tournamentEvent: TournamentEvent;
  setTournamentEvent: (tournamentEvent: TournamentEvent) => void;
}

const TournamentEventContext = createContext<
  TournamentEventContextType | undefined
>(undefined);

export const TournamentEventProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [tournamentEvent, setTournamentEvent] = useState<TournamentEvent>({
    tournament: 'Winter Classic Tournament',
    year: 2025,
    tournamentId: 'winter-classic-2025',
  });

  // Fetch tournament event from API
  useEffect(() => {
    const fetchTournamentEvent = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/tournaments/current`
        );
        if (response.data) {
          setTournamentEvent({
            tournament: response.data.tournament || 'Winter Classic Tournament',
            year: response.data.year || 2025,
            tournamentId: response.data.tournamentId || 'winter-classic-2025',
          });
        }
      } catch (error: unknown) {
        // Properly type the error
        console.error('Error fetching tournament event:', error);
        // Use default values if API fails
      }
    };

    fetchTournamentEvent();
  }, []);

  return (
    <TournamentEventContext.Provider
      value={{ tournamentEvent, setTournamentEvent }}
    >
      {children}
    </TournamentEventContext.Provider>
  );
};

export const useTournamentEvent = () => {
  const context = useContext(TournamentEventContext);
  if (!context) {
    throw new Error(
      'useTournamentEvent must be used within a TournamentEventProvider'
    );
  }
  return context;
};
