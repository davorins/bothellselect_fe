// context/SeasonEventsContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import axios from 'axios';

export interface SeasonEvent {
  _id: string;
  eventId: string;
  season: string;
  year: number;
  registrationOpen: boolean;
}

interface SeasonEventsContextValue {
  activeEvents: SeasonEvent[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const SeasonEventsContext = createContext<SeasonEventsContextValue>({
  activeEvents: [],
  loading: true,
  refresh: async () => {},
});

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const SeasonEventsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeEvents, setActiveEvents] = useState<SeasonEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/admin/season-events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const events: SeasonEvent[] = (res.data || []).filter(
        (e: SeasonEvent) => e.registrationOpen === true,
      );
      setActiveEvents(events);
    } catch (err) {
      console.error('Failed to fetch season events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <SeasonEventsContext.Provider
      value={{ activeEvents, loading, refresh: fetchEvents }}
    >
      {children}
    </SeasonEventsContext.Provider>
  );
};

export const useActiveSeasonEvents = () => useContext(SeasonEventsContext);
