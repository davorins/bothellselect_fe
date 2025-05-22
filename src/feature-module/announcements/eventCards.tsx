import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import { EventDetails } from '../../types/types';
import axios from 'axios';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const categoryColorMap: Record<string, string> = {
  training: 'success',
  game: 'danger',
  holidays: 'info',
  celebration: 'warning',
  camp: 'secondary',
  tryout: 'primary',
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
    'upcoming'
  );
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);

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
    if (!category) return 'secondary';
    return categoryColorMap[category.toLowerCase()] || 'secondary';
  };

  const filteredEvents = useMemo(() => {
    const startOfToday = dayjs().startOf('day').toDate();
    const oneWeekFromNow = dayjs().add(7, 'day').toDate();

    return events
      .filter((event) => {
        // Filter by category (case-insensitive)
        if (
          selectedCategory !== 'all' &&
          event.category?.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }

        // Filter by time
        const eventDate = new Date(event.start);
        if (timeFilter === 'upcoming') {
          // Include events that are either:
          // 1. Happening today (all day events)
          // 2. Happening between today and one week from now
          return (
            dayjs(eventDate).isSame(dayjs(), 'day') ||
            (eventDate >= startOfToday && eventDate <= oneWeekFromNow)
          );
        } else {
          return eventDate > oneWeekFromNow;
        }
      })
      .sort((a, b) => {
        // Sort by date (nearest first)
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
      <div
        className='d-flex justify-content-center align-items-center'
        style={{ minHeight: '200px' }}
      >
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading events...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div>
                <ImageWithBasePath
                  src='assets/img/authentication/authentication.png'
                  alt='Img'
                />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='events-page'>
                {/* Event List */}
                <div className='col-12'>
                  <div className='d-flex align-items-center justify-content-between mb-3'>
                    <h5 className='mb-0'>
                      {timeFilter === 'upcoming'
                        ? 'Upcoming Events (Today + Next 7 Days)'
                        : 'Future Events'}
                    </h5>
                    <div className='d-flex'>
                      <div className='btn-group me-3' role='group'>
                        <button
                          type='button'
                          className={`btn ${
                            timeFilter === 'upcoming'
                              ? 'btn-primary'
                              : 'btn-outline-primary'
                          }`}
                          onClick={() => setTimeFilter('upcoming')}
                        >
                          Upcoming
                        </button>
                        <button
                          type='button'
                          className={`btn ${
                            timeFilter === 'future'
                              ? 'btn-primary'
                              : 'btn-outline-primary'
                          }`}
                          onClick={() => setTimeFilter('future')}
                        >
                          Future
                        </button>
                      </div>
                      <div className='dropdown'>
                        <button
                          className='btn btn-outline-light dropdown-toggle'
                          data-bs-toggle='dropdown'
                        >
                          {selectedCategory === 'all'
                            ? 'All Categories'
                            : selectedCategory.charAt(0).toUpperCase() +
                              selectedCategory.slice(1)}
                        </button>
                        <ul className='dropdown-menu p-3'>
                          <li>
                            <button
                              className='dropdown-item rounded-1 d-flex align-items-center'
                              onClick={() => setSelectedCategory('all')}
                            >
                              <i className='ti ti-circle-filled fs-8 text-secondary me-2' />
                              All Categories
                            </button>
                          </li>
                          {Object.keys(categoryColorMap).map((category) => (
                            <li key={category}>
                              <button
                                className='dropdown-item rounded-1 d-flex align-items-center'
                                onClick={() => setSelectedCategory(category)}
                              >
                                <i
                                  className={`ti ti-circle-filled fs-8 text-${getCategoryColor(
                                    category
                                  )} me-2`}
                                />
                                {category.charAt(0).toUpperCase() +
                                  category.slice(1)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className='text-center py-4'>
                      <i className='ti ti-calendar-off fs-20 text-muted mb-2' />
                      <p className='text-muted'>
                        {selectedCategory === 'all'
                          ? `No ${timeFilter} events found`
                          : `No ${selectedCategory} ${timeFilter} events found`}
                      </p>
                    </div>
                  ) : (
                    <div className='row'>
                      {filteredEvents.map((event, index) => {
                        const categoryColor = getCategoryColor(event.category);
                        return (
                          <div className='col-md-6 mb-3' key={index}>
                            <div
                              className={`border-start border-${categoryColor} border-3 shadow-sm p-3 bg-white cursor-pointer h-100`}
                              onClick={() => handleEventClick(event)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className='d-flex align-items-center mb-3 pb-3 border-bottom'>
                                <span
                                  className={`avatar p-1 me-3 bg-${categoryColor}-transparent flex-shrink-0`}
                                >
                                  <i
                                    className={`ti ti-calendar-event text-${categoryColor} fs-20`}
                                  />
                                </span>
                                <div className='flex-fill'>
                                  <h6 className='mb-1'>{event.title}</h6>
                                  <p className='fs-12'>
                                    <i className='ti ti-calendar me-1' />
                                    {formatDate(event.start)}
                                    {event.end && ` - ${formatDate(event.end)}`}
                                  </p>
                                </div>
                              </div>
                              <div className='d-flex align-items-center justify-content-between'>
                                <p className='fs-12 mb-0'>
                                  <i className='ti ti-clock me-1' />
                                  {formatTime(event.start)} -{' '}
                                  {formatTime(event.end || event.start)}
                                </p>
                                {event.attendees &&
                                  event.attendees.length > 0 && (
                                    <div className='avatar-list-stacked avatar-group-sm'>
                                      {event.attendees
                                        .slice(0, 3)
                                        .map((attendee, i) => (
                                          <span
                                            key={i}
                                            className='avatar border-0'
                                          >
                                            <img
                                              src={`assets/img/${attendee}`}
                                              className='rounded'
                                              alt='attendee'
                                            />
                                          </span>
                                        ))}
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal show={showEventDetailsModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <div className='d-flex justify-content-between w-100'>
            <span className='d-inline-flex align-items-center'>
              <i
                className={`ti ti-circle-filled fs-8 me-1 text-${getCategoryColor(
                  selectedEvent?.category
                )}`}
              />
              {selectedEvent?.category?.toUpperCase() || 'EVENT'}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <>
              <div className='d-flex align-items-center mb-4'>
                <span
                  className={`avatar avatar-xl bg-${getCategoryColor(
                    selectedEvent.category
                  )}-transparent me-3 flex-shrink-0`}
                >
                  <i className='ti ti-calendar-event fs-30' />
                </span>
                <div>
                  <h3 className='mb-1'>{selectedEvent.title}</h3>
                  {selectedEvent.caption && (
                    <h5 className='text-muted mb-2'>{selectedEvent.caption}</h5>
                  )}
                </div>
              </div>

              <div className='row mb-4'>
                <div className='col-md-6'>
                  <div className='d-flex align-items-center mb-3'>
                    <i className='ti ti-calendar me-3 fs-4' />
                    <div>
                      <h6 className='mb-0'>Date</h6>
                      <p className='mb-0'>
                        {dayjs(selectedEvent.start).format('MM/DD/YYYY')}
                        {selectedEvent.end &&
                          !dayjs(selectedEvent.start).isSame(
                            dayjs(selectedEvent.end),
                            'day'
                          ) &&
                          ` - ${dayjs(selectedEvent.end).format('MM/DD/YYYY')}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='d-flex align-items-center mb-3 '>
                    <i className='ti ti-clock me-3 fs-4' />
                    <div>
                      <h6 className='mb-0'>Time</h6>
                      <p className='mb-0'>
                        {dayjs(selectedEvent.start).format('hh:mm A')} -{' '}
                        {dayjs(selectedEvent.end || selectedEvent.start).format(
                          'hh:mm A'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedEvent?.price !== undefined &&
                  selectedEvent.price > 0 && (
                    <div className='col-md-6'>
                      <div className='d-flex align-items-center mb-3'>
                        <i className='ti ti-currency-dollar me-3 fs-4' />
                        <div>
                          <h6 className='mb-0'>Price</h6>
                          <p className='mb-0'>
                            ${selectedEvent.price.toFixed(2)}{' '}
                            <span className='text-muted'>per person</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {selectedEvent.school && (
                <div className='mb-4'>
                  <h5 className='mb-3'>
                    <i className='ti ti-map-pin me-2 fs-4' /> Location
                  </h5>
                  <div className='bg-light p-3 rounded'>
                    <p className='mb-1'>
                      <strong>Name:</strong> {selectedEvent.school.name}
                    </p>
                    <p className='mb-1'>
                      <strong>Address:</strong> {selectedEvent.school.address}
                    </p>
                    {selectedEvent.school.website && (
                      <p className='mb-0'>
                        <strong>Website:</strong>{' '}
                        <a
                          href={selectedEvent.school.website}
                          target='_blank'
                          rel='noreferrer'
                          className='ms-1'
                        >
                          {selectedEvent.school.website}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedEvent.description && (
                <div className='mb-4'>
                  <h5 className='mb-3'>Description</h5>
                  <div className='bg-light p-3 rounded'>
                    <p className='mb-0'>{selectedEvent.description}</p>
                  </div>
                </div>
              )}

              {selectedEvent.attendees &&
                selectedEvent.attendees.length > 0 && (
                  <div className='mb-4'>
                    <h5 className='mb-3'>Attendees</h5>
                    <div className='avatar-list-stacked avatar-group-sm'>
                      {selectedEvent.attendees
                        .slice(0, 5)
                        .map((attendee, i) => (
                          <span key={i} className='avatar border-0'>
                            <img
                              src={`assets/img/${attendee}`}
                              className='rounded'
                              alt='attendee'
                            />
                          </span>
                        ))}
                      {selectedEvent.attendees.length > 5 && (
                        <span className='avatar bg-white text-default'>
                          +{selectedEvent.attendees.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className='btn btn-primary' onClick={handleCloseModal}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EventCards;
