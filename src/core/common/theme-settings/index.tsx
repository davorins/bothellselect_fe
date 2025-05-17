import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import dayjs from 'dayjs';
import axios from 'axios';
import { EventDetails } from '../../../types/types';

const categoryColorMap: Record<string, string> = {
  training: 'success',
  game: 'danger',
  holidays: 'info',
  celebration: 'warning',
  camp: 'secondary',
  tryout: 'primary',
};

const ThemeSettings = () => {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    caption: '',
    price: 0,
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    school: { name: '', address: '', website: '' },
  });
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
    });

    instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

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

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Please login again');
        localStorage.removeItem('token');
      }
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (selectedCategory === 'all') return true;
      if (!event.category) return false;
      return event.category.toLowerCase() === selectedCategory.toLowerCase();
    });

    // Sort events by start date (ascending)
    return filtered.sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [events, selectedCategory]);

  const handleEventDetailsClose = () => setShowEventDetailsModal(false);

  const getCategoryColor = (category?: string): string => {
    if (!category) return 'secondary';
    return categoryColorMap[category.toLowerCase()] || 'secondary';
  };

  if (isLoading) {
    return (
      <div
        className='d-flex justify-content-center align-items-center'
        style={{ height: '100vh' }}
      >
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading events...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='sidebar-contact '>
        <div
          className='toggle-theme'
          data-bs-toggle='offcanvas'
          data-bs-target='#theme-setting'
        >
          <i className='fa fa-calendar fa-w-16' />
        </div>
      </div>
      <div
        className='sidebar-themesettings offcanvas offcanvas-end'
        id='theme-setting'
      >
        <div className='offcanvas-header d-flex align-items-center justify-content-between bg-light-500'>
          <h5 className='offcanvas-title'>Upcoming Events</h5>
          <div className='dropdown'>
            <button
              className='btn btn-outline-light dropdown-toggle btn-sm'
              data-bs-toggle='dropdown'
            >
              {selectedCategory === 'all'
                ? 'All Categories'
                : selectedCategory.charAt(0).toUpperCase() +
                  selectedCategory.slice(1)}
            </button>
            <ul className='dropdown-menu p-2'>
              <li>
                <button
                  className='dropdown-item rounded-1 d-flex align-items-center'
                  onClick={() => setSelectedCategory('all')}
                >
                  <i className='ti ti-circle-filled fs-8 text-secondary me-2' />
                  All Categories
                </button>
              </li>
              <li>
                <button
                  className='dropdown-item rounded-1 d-flex align-items-center'
                  onClick={() => setSelectedCategory('training')}
                >
                  <i className='ti ti-circle-filled fs-8 text-success me-2' />
                  Training
                </button>
              </li>
              <li>
                <button
                  className='dropdown-item rounded-1 d-flex align-items-center'
                  onClick={() => setSelectedCategory('game')}
                >
                  <i className='ti ti-circle-filled fs-8 text-danger me-2' />
                  Game
                </button>
              </li>
              <li>
                <button
                  className='dropdown-item rounded-1 d-flex align-items-center'
                  onClick={() => setSelectedCategory('holidays')}
                >
                  <i className='ti ti-circle-filled fs-8 text-info me-2' />
                  Holidays
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className='offcanvas-body p-3'>
          {filteredEvents.length === 0 ? (
            <div className='text-center py-4'>
              <i className='ti ti-calendar-off fs-20 text-muted mb-2' />
              <p className='text-muted'>
                {selectedCategory === 'all'
                  ? 'No upcoming events found'
                  : `No ${selectedCategory} events found`}
              </p>
            </div>
          ) : (
            <div className='event-list'>
              {filteredEvents.slice(0, 5).map((event, index) => {
                const categoryColor = getCategoryColor(event.category);
                return (
                  <div
                    key={index}
                    className={`border-start border-${categoryColor} border-3 shadow-sm p-3 mb-3 bg-white cursor-pointer`}
                    onClick={() => {
                      setEventDetails({
                        _id: event._id,
                        title: event.title,
                        caption: event.caption,
                        price: event.price,
                        start: event.start,
                        end: event.end,
                        backgroundColor: event.backgroundColor,
                        description: event.description,
                        category: event.category,
                        school: event.school,
                        attendees: event.attendees,
                        attachment: event.attachment,
                      });
                      setShowEventDetailsModal(true);
                    }}
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
                          {dayjs(event.start).format('DD MMM YYYY')}
                          {event.end &&
                            ` - ${dayjs(event.end).format('DD MMM YYYY')}`}
                        </p>
                      </div>
                    </div>
                    <div className='d-flex align-items-center justify-content-between'>
                      <p className='fs-12 mb-0'>
                        <i className='ti ti-clock me-1' />
                        {dayjs(event.start).format('hh:mm A')} -{' '}
                        {dayjs(event.end || event.start).format('hh:mm A')}
                      </p>
                      {event.attendees && event.attendees.length > 0 && (
                        <div className='avatar-list-stacked avatar-group-sm'>
                          {event.attendees.slice(0, 3).map((attendee, i) => (
                            <span key={i} className='avatar border-0'>
                              <ImageWithBasePath
                                src={`assets/img/${attendee}`}
                                className='rounded'
                                alt='img'
                              />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      <Modal show={showEventDetailsModal} onHide={handleEventDetailsClose}>
        <Modal.Header closeButton>
          <div className='d-flex justify-content-between w-100'>
            <span className='d-inline-flex align-items-center'>
              <i
                className={`ti ti-circle-filled fs-8 me-1 text-${getCategoryColor(
                  eventDetails.category
                )}`}
              />
              {eventDetails.category || 'Event'}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className='d-flex align-items-center mb-3'>
            <span
              className={`avatar avatar-xl bg-${getCategoryColor(
                eventDetails.category
              )}-transparent me-3 flex-shrink-0`}
            >
              <i className='ti ti-users-group fs-30' />
            </span>
            <div>
              <h3 className='mb-1'>{eventDetails.title}</h3>
              {eventDetails.caption && (
                <h5 className='text-muted mb-2'>{eventDetails.caption}</h5>
              )}
              <div className='d-flex align-items-center flex-wrap'>
                <p className='me-3 mb-0'>
                  <i className='ti ti-calendar me-1' />
                  {dayjs(eventDetails.start).format('MM/DD/YYYY')}
                  {eventDetails.end &&
                    ` - ${dayjs(eventDetails.end).format('MM/DD/YYYY')}`}
                </p>
                <p>
                  <i className='ti ti-clock me-1' />
                  {dayjs(eventDetails.start).format('hh:mm A')} -{' '}
                  {dayjs(eventDetails.end || eventDetails.start).format(
                    'hh:mm A'
                  )}
                </p>
              </div>
            </div>
          </div>

          {eventDetails.price > 0 && (
            <div className='d-flex align-items-center flex-wrap mb-4'>
              <span className='fw-bold me-1'>Price:</span>{' '}
              <span className='text-primary me-1'>
                ${eventDetails.price.toFixed(2)}
              </span>{' '}
              <span className='text-muted'>per person</span>
            </div>
          )}

          {eventDetails.category === 'game' && eventDetails.school && (
            <div className='mb-3'>
              <h6 className='mb-2'>
                <i className='ti ti-map-pin' /> Event Location
              </h6>
              <div className='bg-light p-3 rounded'>
                <p className='mb-1'>
                  <strong>Name:</strong> {eventDetails.school.name}
                </p>
                <p className='mb-1'>
                  <strong>Address:</strong> {eventDetails.school.address}
                </p>
                {eventDetails.school.website && (
                  <p className='mb-0'>
                    <strong>Website:</strong>
                    <a
                      href={eventDetails.school.website}
                      target='_blank'
                      rel='noreferrer'
                      className='ms-1'
                    >
                      {eventDetails.school.website}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {eventDetails.description && (
            <div className='bg-light-400 p-3 rounded mb-3'>
              <p>{eventDetails.description}</p>
            </div>
          )}

          <div className='d-flex align-items-center justify-content-between flex-wrap'>
            {eventDetails.attendees && eventDetails.attendees.length > 0 && (
              <div className='avatar-list-stacked avatar-group-sm mb-3'>
                {eventDetails.attendees.slice(0, 3).map((attendee, i) => (
                  <span key={i} className='avatar border-0'>
                    <ImageWithBasePath
                      src={`assets/img/${attendee}`}
                      className='rounded'
                      alt='img'
                    />
                  </span>
                ))}
                {eventDetails.attendees.length > 3 && (
                  <span className='avatar bg-white text-default'>
                    +{eventDetails.attendees.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ThemeSettings;
