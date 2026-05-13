import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import { EventDetails } from '../../types/types';
import axios from 'axios';

const categoryColorMap: Record<string, string> = {
  training: '#4c9aff',
  game: '#ff6b6b',
  holidays: '#4ade80',
  celebration: '#fbbf24',
  camp: '#a855f7',
  tryout: '#f97316',
};

interface EventCardsProps {
  API_BASE_URL?: string;
}

const EventCards: React.FC<EventCardsProps> = ({
  API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '',
}) => {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'future'>(
    'upcoming',
  );
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
    });

    instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return instance;
  }, [API_BASE_URL]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getCategoryColor = (category?: string): string => {
    if (!category) return '#6c757d';
    return categoryColorMap[category.toLowerCase()] || '#6c757d';
  };

  const filteredEvents = useMemo(() => {
    const startOfToday = dayjs().startOf('day').toDate();
    const oneWeekFromNow = dayjs().add(7, 'day').toDate();

    return events
      .filter((event) => {
        if (
          selectedCategory !== 'all' &&
          event.category?.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }

        const eventDate = new Date(event.start);
        if (timeFilter === 'upcoming') {
          return (
            dayjs(eventDate).isSame(dayjs(), 'day') ||
            (eventDate >= startOfToday && eventDate <= oneWeekFromNow)
          );
        } else {
          return eventDate > oneWeekFromNow;
        }
      })
      .sort((a, b) => {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
  }, [events, selectedCategory, timeFilter]);

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  const formatTime = (dateString: string) => {
    return dayjs(dateString).format('h:mm A');
  };

  const handleEventClick = (event: EventDetails) => {
    setSelectedEvent(event);
    setShowEventDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowEventDetailsModal(false);
    setSelectedEvent(null);
  };

  if (isLoading) {
    return (
      <div className='events-glass-container'>
        <div className='events-glass-card'>
          <div className='spinner-wrapper'>
            <div className='spinner' />
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='events-glass-container'>
      {/* Background gradient */}
      <div className='events-bg-gradient' />

      {/* Animated gradient orbs */}
      <div className='events-orb events-orb-1' />
      <div className='events-orb events-orb-2' />
      <div className='events-orb events-orb-3' />

      <div className='events-content-wrapper'>
        <div className='events-glass-card'>
          <div className='events-header'>
            <div className='events-header-icon'>
              <i className='ti ti-calendar-stats' />
            </div>
            <h1>Events & Schedule</h1>
            <p>
              Stay updated with all upcoming games, training sessions, and
              special events
            </p>
          </div>

          {/* Filters */}
          <div className='events-filters'>
            <div className='filter-buttons'>
              <button
                className={`filter-btn ${timeFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setTimeFilter('upcoming')}
              >
                <i className='ti ti-clock' />
                Upcoming (7 days)
              </button>
              <button
                className={`filter-btn ${timeFilter === 'future' ? 'active' : ''}`}
                onClick={() => setTimeFilter('future')}
              >
                <i className='ti ti-calendar-week' />
                Future Events
              </button>
            </div>

            <div className='dropdown-wrapper'>
              <button
                className='category-dropdown-btn'
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <i className='ti ti-category' />
                {selectedCategory === 'all'
                  ? 'All Categories'
                  : selectedCategory.charAt(0).toUpperCase() +
                    selectedCategory.slice(1)}
                <i
                  className={`ti ti-chevron-down ${dropdownOpen ? 'rotate' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className='category-dropdown-menu'>
                  <button
                    className='dropdown-item'
                    onClick={() => {
                      setSelectedCategory('all');
                      setDropdownOpen(false);
                    }}
                  >
                    <span
                      className='category-dot'
                      style={{ background: '#6c757d' }}
                    />
                    All Categories
                  </button>
                  {Object.keys(categoryColorMap).map((category) => (
                    <button
                      key={category}
                      className='dropdown-item'
                      onClick={() => {
                        setSelectedCategory(category);
                        setDropdownOpen(false);
                      }}
                    >
                      <span
                        className='category-dot'
                        style={{ background: getCategoryColor(category) }}
                      />
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Events List */}
          <div className='events-list'>
            {filteredEvents.length === 0 ? (
              <div className='empty-state'>
                <div className='empty-state-icon'>
                  <i className='ti ti-calendar-off' />
                </div>
                <h3>No Events Found</h3>
                <p>
                  {selectedCategory === 'all'
                    ? `No ${timeFilter} events available at the moment`
                    : `No ${selectedCategory} ${timeFilter} events found`}
                </p>
              </div>
            ) : (
              filteredEvents.map((event, index) => {
                const categoryColor = getCategoryColor(event.category);
                return (
                  <div
                    key={index}
                    className='event-card'
                    onClick={() => handleEventClick(event)}
                  >
                    <div className='event-card-left'>
                      <div className='event-date'>
                        <span className='event-month'>
                          {dayjs(event.start).format('MMM')}
                        </span>
                        <span className='event-day'>
                          {dayjs(event.start).format('D')}
                        </span>
                      </div>
                    </div>
                    <div className='event-card-middle'>
                      <div
                        className='event-category'
                        style={{ color: categoryColor }}
                      >
                        <i className='ti ti-circle-filled' />
                        {event.category?.toUpperCase() || 'EVENT'}
                      </div>
                      <h3 className='event-title'>{event.title}</h3>
                      <div className='event-meta'>
                        <span>
                          <i className='ti ti-clock' />
                          {formatTime(event.start)} -{' '}
                          {formatTime(event.end || event.start)}
                        </span>
                        {event.school && (
                          <span>
                            <i className='ti ti-map-pin' />
                            {event.school.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='event-card-right'>
                      <i className='ti ti-chevron-right' />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal
        show={showEventDetailsModal}
        onHide={handleCloseModal}
        centered
        className='event-modal'
      >
        <div className='modal-glass'>
          <Modal.Header closeButton>
            <div className='modal-header-content'>
              <span
                className='modal-category-badge'
                style={{
                  background: getCategoryColor(selectedEvent?.category),
                }}
              >
                {selectedEvent?.category?.toUpperCase() || 'EVENT'}
              </span>
            </div>
          </Modal.Header>
          <Modal.Body>
            {selectedEvent && (
              <>
                <div className='modal-event-header'>
                  <div className='modal-event-icon'>
                    <i className='ti ti-calendar-event' />
                  </div>
                  <div>
                    <h2>{selectedEvent.title}</h2>
                    {selectedEvent.caption && (
                      <p className='modal-event-caption'>
                        {selectedEvent.caption}
                      </p>
                    )}
                  </div>
                </div>

                <div className='modal-event-details'>
                  <div className='detail-item'>
                    <i className='ti ti-calendar' />
                    <div>
                      <label>Date</label>
                      <p>
                        {dayjs(selectedEvent.start).format('MMMM D, YYYY')}
                        {selectedEvent.end &&
                          !dayjs(selectedEvent.start).isSame(
                            dayjs(selectedEvent.end),
                            'day',
                          ) &&
                          ` - ${dayjs(selectedEvent.end).format('MMMM D, YYYY')}`}
                      </p>
                    </div>
                  </div>
                  <div className='detail-item'>
                    <i className='ti ti-clock' />
                    <div>
                      <label>Time</label>
                      <p>
                        {dayjs(selectedEvent.start).format('h:mm A')} -{' '}
                        {dayjs(selectedEvent.end || selectedEvent.start).format(
                          'h:mm A',
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedEvent?.price !== undefined &&
                    selectedEvent.price > 0 && (
                      <div className='detail-item'>
                        <i className='ti ti-currency-dollar' />
                        <div>
                          <label>Price</label>
                          <p>
                            ${selectedEvent.price.toFixed(2)}{' '}
                            <span>per person</span>
                          </p>
                        </div>
                      </div>
                    )}
                </div>

                {selectedEvent.school && (
                  <div className='modal-location'>
                    <h4>
                      <i className='ti ti-map-pin' />
                      Location
                    </h4>
                    <div className='location-card'>
                      <p>
                        <strong>{selectedEvent.school.name}</strong>
                      </p>
                      <p>{selectedEvent.school.address}</p>
                      {selectedEvent.school.website && (
                        <a
                          href={selectedEvent.school.website}
                          target='_blank'
                          rel='noreferrer'
                        >
                          {selectedEvent.school.website}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className='modal-description'>
                    <h4>
                      <i className='ti ti-notes' />
                      Description
                    </h4>
                    <div className='description-card'>
                      <p>{selectedEvent.description}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button className='modal-close-btn' onClick={handleCloseModal}>
              Close
            </button>
          </Modal.Footer>
        </div>
      </Modal>

      <style>{`
        .events-glass-container {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Background gradient */
        .events-bg-gradient {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(80, 110, 228, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(120, 140, 255, 0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Animated orbs */
        .events-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: float 20s ease-in-out infinite;
        }

        .events-orb-1 {
          width: 400px;
          height: 400px;
          background: rgba(80, 110, 228, 0.2);
          top: -100px;
          left: -100px;
        }

        .events-orb-2 {
          width: 500px;
          height: 500px;
          background: rgba(120, 140, 255, 0.15);
          bottom: -150px;
          right: -150px;
          animation-delay: 5s;
        }

        .events-orb-3 {
          width: 300px;
          height: 300px;
          background: rgba(80, 110, 228, 0.15);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }

        /* Content wrapper */
        .events-content-wrapper {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }

        /* Main glass card */
        .events-glass-card {
          max-width: 1000px;
          width: 100%;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-radius: 44px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 48px 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .events-glass-card:hover {
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
        }

        /* Header */
        .events-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .events-header-icon {
          width: 64px;
          height: 64px;
          background: rgba(80, 110, 228, 0.2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 1px solid rgba(80, 110, 228, 0.3);
        }

        .events-header-icon i {
          font-size: 32px;
          color: #506ee4;
        }

        .events-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #506ee4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .events-header p {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        /* Filters */
        .events-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .filter-buttons {
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 6px;
          border-radius: 60px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .filter-btn {
          padding: 8px 20px;
          border-radius: 40px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-btn i {
          font-size: 16px;
        }

        .filter-btn.active {
          background: #506ee4;
          color: #fff;
          box-shadow: 0 4px 12px rgba(80, 110, 228, 0.3);
        }

        .filter-btn:hover:not(.active) {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.1);
        }

        /* Category Dropdown */
        .dropdown-wrapper {
          position: relative;
        }

        .category-dropdown-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 40px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .category-dropdown-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .category-dropdown-btn i:first-child {
          font-size: 16px;
        }

        .category-dropdown-btn i:last-child {
          font-size: 14px;
          transition: transform 0.2s ease;
        }

        .category-dropdown-btn i:last-child.rotate {
          transform: rotate(180deg);
        }

        .category-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 8px;
          z-index: 10;
          animation: dropdownFade 0.2s ease;
        }

        @keyframes dropdownFade {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dropdown-item {
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8) !important;
          font-size: 0.85rem;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.15s ease;
          text-align: left;
        }

        .dropdown-item:hover {
          background: rgba(80, 110, 228, 0.2);
          color: #fff;
        }

        .category-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        /* Events List */
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .event-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 20px;
          display: flex;
          gap: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .event-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateX(4px);
        }

        .event-card-left {
          flex-shrink: 0;
        }

        .event-date {
          width: 70px;
          height: 70px;
          background: rgba(80, 110, 228, 0.15);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(80, 110, 228, 0.3);
        }

        .event-month {
          font-size: 0.75rem;
          font-weight: 600;
          color: #506ee4;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .event-day {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
        }

        .event-card-middle {
          flex: 1;
        }

        .event-category {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .event-category i {
          font-size: 6px;
        }

        .event-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin: 0 0 8px 0;
        }

        .event-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .event-meta span {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .event-meta i {
          font-size: 14px;
        }

        .event-card-right {
          display: flex;
          align-items: center;
        }

        .event-card-right i {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.3);
          transition: transform 0.2s ease;
        }

        .event-card:hover .event-card-right i {
          transform: translateX(4px);
          color: rgba(255, 255, 255, 0.6);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-state-icon {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .empty-state-icon i {
          font-size: 48px;
          color: rgba(255, 255, 255, 0.4);
        }

        .empty-state h3 {
          font-size: 1.3rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
        }

        /* Spinner */
        .spinner-wrapper {
          text-align: center;
          padding: 60px 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #506ee4;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner-wrapper p {
          color: rgba(255, 255, 255, 0.7);
        }

        /* Modal Styles */
        .event-modal .modal-content {
          background: transparent;
          border: none;
        }

        .modal-glass {
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          overflow: hidden;
        }

        .modal-glass .modal-header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px 24px 16px;
        }

        .modal-header-content {
          width: 100%;
        }

        .modal-category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #fff;
        }

        .modal-glass .modal-body {
          padding: 24px;
        }

        .modal-glass .modal-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px 24px;
        }

        .modal-event-header {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .modal-event-icon {
          width: 56px;
          height: 56px;
          background: rgba(80, 110, 228, 0.15);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(80, 110, 228, 0.3);
        }

        .modal-event-icon i {
          font-size: 28px;
          color: #506ee4;
        }

        .modal-event-header h2 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px 0;
        }

        .modal-event-caption {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .modal-event-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .detail-item {
          display: flex;
          gap: 12px;
        }

        .detail-item i {
          font-size: 20px;
          color: #506ee4;
        }

        .detail-item label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(255, 255, 255, 0.5);
          display: block;
          margin-bottom: 4px;
        }

        .detail-item p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .detail-item p span {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .modal-location h4,
        .modal-description h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .location-card,
        .description-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .location-card p {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 4px 0;
        }

        .location-card a {
          font-size: 0.8rem;
          color: #506ee4;
          text-decoration: none;
        }

        .location-card a:hover {
          text-decoration: underline;
        }

        .description-card p {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }

        .modal-close-btn {
          padding: 8px 24px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 40px;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .events-glass-card {
            padding: 32px 24px;
          }

          .events-header h1 {
            font-size: 1.8rem;
          }

          .events-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-buttons {
            justify-content: center;
          }

          .event-card {
            flex-direction: column;
            gap: 12px;
          }

          .event-card-left {
            align-self: flex-start;
          }

          .event-date {
            width: 60px;
            height: 60px;
          }

          .event-day {
            font-size: 1.2rem;
          }
        }

        @media (max-width: 480px) {
          .events-glass-card {
            padding: 24px 16px;
          }

          .events-header h1 {
            font-size: 1.5rem;
          }

          .filter-buttons {
            flex-direction: column;
          }

          .filter-btn {
            justify-content: center;
          }

          .modal-event-details {
            grid-template-columns: 1fr;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .events-orb,
          .event-card,
          .filter-btn,
          .category-dropdown-btn,
          .dropdown-item {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default EventCards;
