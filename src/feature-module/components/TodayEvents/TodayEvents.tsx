import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { EventDetails } from '../../../types/types';
import './TodayEvents.css';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

interface TodayEventsProps {
  onEventClick?: (event: EventDetails) => void;
}

const TodayEvents: React.FC<TodayEventsProps> = ({ onEventClick }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE_URL });
    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return instance;
  }, []);

  // Category color map
  const categoryColorMap: Record<string, string> = {
    training: '#4c9aff',
    game: '#ff6b6b',
    holidays: '#4ade80',
    celebration: '#fbbf24',
    camp: '#a855f7',
    tryout: '#f97316',
  };

  const getCategoryColor = (category?: string): string => {
    if (!category) return '#6c757d';
    return categoryColorMap[category.toLowerCase()] || '#6c757d';
  };

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Get events for the selected date
  const todaysEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = dayjs(event.start);
      return eventDate.isSame(selectedDate, 'day');
    });
  }, [events, selectedDate]);

  // Get events for the selected date grouped by category
  const eventsByCategory = useMemo(() => {
    const grouped: Record<string, EventDetails[]> = {};

    todaysEvents.forEach((event) => {
      const category = event.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(event);
    });

    // Sort events within each category by time
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        return dayjs(a.start).diff(dayjs(b.start));
      });
    });

    return grouped;
  }, [todaysEvents]);

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) =>
      direction === 'prev' ? prev.subtract(1, 'day') : prev.add(1, 'day'),
    );
  };

  const goToToday = () => {
    setSelectedDate(dayjs());
  };

  const formatTime = (dateString: string) => {
    return dayjs(dateString).format('h:mm A');
  };

  const isToday = selectedDate.isSame(dayjs(), 'day');

  // ─── Handle event click: navigate to calendar with event data ──────────
  const handleEventClick = useCallback(
    (event: EventDetails) => {
      // If there's an external handler, call it first
      if (onEventClick) {
        onEventClick(event);
        return;
      }

      // Navigate to calendar page with event data in state
      navigate('/events', {
        state: {
          selectedEvent: event,
          openModal: true,
          selectedDate: dayjs(event.start).format('YYYY-MM-DD'),
        },
      });
    },
    [navigate, onEventClick],
  );

  if (isLoading) {
    return (
      <div className='te-loading'>
        <div className='te-spinner' />
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='te-error'>
        <i className='ti ti-alert-circle' />
        <p>{error}</p>
        <button onClick={fetchEvents} className='te-retry-btn'>
          Retry
        </button>
      </div>
    );
  }

  const categoryNames: Record<string, string> = {
    training: 'Training',
    game: 'Game',
    holidays: 'Holidays',
    celebration: 'Celebration',
    camp: 'Camp',
    tryout: 'Tryout',
    other: 'Other Events',
  };

  return (
    <div className='te-container'>
      <div className='te-header'>
        <div className='te-header-left'>
          <i className='ti ti-calendar-event' />
          <h3>Today's Events</h3>
        </div>
        <div className='te-date-nav'>
          <button
            className='te-nav-btn'
            onClick={() => navigateDay('prev')}
            aria-label='Previous day'
          >
            <i className='ti ti-chevron-left' />
          </button>
          <span className='te-date-display'>
            {selectedDate.format('MMMM D, YYYY')}
          </span>
          <button
            className='te-nav-btn'
            onClick={() => navigateDay('next')}
            aria-label='Next day'
          >
            <i className='ti ti-chevron-right' />
          </button>
          {!isToday && (
            <button className='te-today-btn' onClick={goToToday}>
              Today
            </button>
          )}
        </div>
      </div>

      {todaysEvents.length === 0 ? (
        <div className='te-empty'>
          <i className='ti ti-calendar-off' />
          <p>No events scheduled for {selectedDate.format('MMMM D, YYYY')}</p>
          {!isToday && (
            <button
              className='te-today-btn te-today-btn-sm'
              onClick={goToToday}
            >
              Go to Today
            </button>
          )}
        </div>
      ) : (
        <div className='te-events-list'>
          {Object.keys(eventsByCategory).map((category) => (
            <div key={category} className='te-category-group'>
              <div className='te-category-header'>
                <span
                  className='te-category-dot'
                  style={{ backgroundColor: getCategoryColor(category) }}
                />
                <span className='te-category-name'>
                  {categoryNames[category] || category}
                </span>
                <span className='te-category-count'>
                  {eventsByCategory[category].length}
                </span>
              </div>
              {eventsByCategory[category].map((event) => (
                <div
                  key={event._id}
                  className='te-event-card'
                  onClick={() => handleEventClick(event)}
                  style={{
                    borderLeftColor: getCategoryColor(event.category),
                  }}
                >
                  <div className='te-event-time'>{formatTime(event.start)}</div>
                  <div className='te-event-content'>
                    <h4 className='te-event-title'>{event.title}</h4>
                    {event.school && (
                      <div className='te-event-location'>
                        <i className='ti ti-map-pin' />
                        {event.school.name}
                      </div>
                    )}
                    {event.price !== undefined && event.price > 0 && (
                      <div className='te-event-price'>
                        <i className='ti ti-currency-dollar' />$
                        {event.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className='te-event-arrow'>
                    <i className='ti ti-chevron-right' />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayEvents;
