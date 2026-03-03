// hooks/useSeasonEvents.ts
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

export interface SeasonEvent {
  _id: string;
  eventId: string;
  season: string;
  year: number;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  registrationOpen: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  __v?: number;
}

export interface UseSeasonEventsReturn {
  seasonEvents: SeasonEvent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

export const useSeasonEvents = (): UseSeasonEventsReturn => {
  const [seasonEvents, setSeasonEvents] = useState<SeasonEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasonEvents = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get<SeasonEvent[]>(
        `${API_BASE_URL}/admin/season-events`
      );

      // Ensure dates are properly parsed
      const eventsWithParsedDates = response.data.map((event) => ({
        ...event,
        startDate: event.startDate ? new Date(event.startDate) : undefined,
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      }));

      setSeasonEvents(eventsWithParsedDates);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMessage = axiosError.response?.data?.error
        ? axiosError.response.data.error
        : 'Failed to load season events';

      console.error('Error fetching season events:', axiosError);
      setError(errorMessage);
      setSeasonEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasonEvents();
  }, []);

  const refresh = async (): Promise<void> => {
    await fetchSeasonEvents();
  };

  return {
    seasonEvents,
    isLoading,
    error,
    refresh,
  };
};

// Hook to get a specific season event by eventId
export const useSeasonEvent = (eventId?: string) => {
  const { seasonEvents, isLoading, error, refresh } = useSeasonEvents();

  const seasonEvent = eventId
    ? seasonEvents.find((event) => event.eventId === eventId)
    : undefined;

  return {
    seasonEvent,
    isLoading,
    error,
    refresh,
  };
};

// Hook to get active season events only
export const useActiveSeasonEvents = () => {
  const { seasonEvents, isLoading, error, refresh } = useSeasonEvents();

  const activeSeasonEvents = seasonEvents.filter(
    (event) => event.registrationOpen === true
  );

  return {
    activeSeasonEvents,
    isLoading,
    error,
    refresh,
  };
};
