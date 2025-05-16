import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Modal } from 'react-bootstrap';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import { Link } from 'react-router-dom';
import { eventCategory } from '../../core/common/selectoption/selectoption';
import CommonSelect, { Option } from '../../core/common/commonSelect';
import { DatePicker } from 'antd';
import { all_routes } from '../router/all_routes';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { TimePicker } from 'antd';
import axios from 'axios';

interface EventDetails {
  _id?: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  description?: string;
  category?: string;
  attendees?: string[];
  allDay?: boolean;
  attachment?: string;
}

const categoryColorMap: Record<string, string> = {
  training: 'success',
  game: 'danger',
  holidays: 'info',
  celebration: 'warning',
  camp: 'secondary',
  tryout: 'primary',
};

const calendarCategoryColorMap: Record<string, string> = {
  training: '#1abe17',
  game: '#dc3545',
  holidays: '#0dcaf0',
  celebration: '#ffc107',
  camp: '#6c757d',
  tryout: '#0d6efd',
};

const Events = () => {
  const routes = all_routes;
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    start: new Date().toISOString(),
  });
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const calendarRef = useRef<FullCalendar>(null);
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
    return events.filter((event) => {
      if (selectedCategory === 'all') return true;
      if (!event.category) return false;
      return event.category.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [events, selectedCategory]);

  const handleDateClick = () => {
    setEventDetails({
      title: '',
      start: new Date().toISOString(),
    });
    setShowAddEventModal(true);
  };

  const handleEventClick = (info: any) => {
    setEventDetails({
      _id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      backgroundColor: info.event.backgroundColor,
      description: info.event.extendedProps.description,
      category: info.event.extendedProps.category,
    });
    setShowEventDetailsModal(true);
  };

  const handleAddEventClose = () => setShowAddEventModal(false);
  const handleEventDetailsClose = () => setShowEventDetailsModal(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const category = eventDetails.category || 'training';
      const eventToSave = {
        ...eventDetails,
        backgroundColor: calendarCategoryColorMap[category] || '#adb5bd',
      };

      if (eventDetails._id) {
        await api.put(`/events/${eventDetails._id}`, eventToSave);
      } else {
        await api.post('/events', eventToSave);
      }

      await fetchEvents();
      setShowAddEventModal(false);
    } catch (error) {
      console.error('Error saving event:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Please login again');
        localStorage.removeItem('token');
      }
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventDetails._id) return;
    try {
      await api.delete(`/events/${eventDetails._id}`);
      await fetchEvents();
      setShowEventDetailsModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Please login again');
        localStorage.removeItem('token');
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEventDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date: Dayjs | null, field: 'start' | 'end') => {
    if (date) {
      setEventDetails((prev) => ({
        ...prev,
        [field]: date.toISOString(),
      }));
    }
  };

  const handleTimeChange = (time: Dayjs | null, field: 'start' | 'end') => {
    if (time) {
      const currentDate = dayjs(eventDetails[field]);
      const newDateTime = currentDate
        .hour(time.hour())
        .minute(time.minute())
        .toISOString();

      setEventDetails((prev) => ({
        ...prev,
        [field]: newDateTime,
      }));
    }
  };

  const formatEventsForCalendar = (events: EventDetails[]) => {
    return events.map((event) => ({
      id: event._id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor:
        event.backgroundColor ||
        (event.category ? calendarCategoryColorMap[event.category] : '#adb5bd'),
      extendedProps: {
        description: event.description,
        category: event.category,
      },
    }));
  };

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
    <div className='page-wrapper'>
      <div className='content'>
        {/* Page Header */}
        <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
          <div className='my-auto mb-2'>
            <h3 className='mb-1'>Events</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item'>Announcement</li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Events
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
              <button
                type='button'
                className='btn btn-outline-light bg-white btn-icon me-1'
                onClick={() => window.location.reload()}
                title='Refresh'
              >
                <i className='ti ti-refresh' />
              </button>
            </div>
            <div className='pe-1 mb-2'>
              <button
                type='button'
                className='btn btn-outline-light bg-white btn-icon me-1'
                onClick={() => window.print()}
                title='Print'
              >
                <i className='ti ti-printer' />
              </button>
            </div>
            <div className='mb-2'>
              <button className='btn btn-light d-flex align-items-center'>
                <i className='ti ti-calendar-up me-2' />
                Sync with Google Calendar
              </button>
            </div>
          </div>
        </div>
        {/* /Page Header */}

        <div className='row'>
          {/* Event Calendar */}
          <div className='col-xl-8 col-xxl-9 theiaStickySidebar'>
            <div className='stickybar'>
              <div className='card'>
                <div className='card-body'>
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView='dayGridMonth'
                    events={formatEventsForCalendar(filteredEvents)}
                    headerToolbar={{
                      start: 'title',
                      center: 'dayGridMonth,dayGridWeek,dayGridDay',
                      end: 'custombtn',
                    }}
                    customButtons={{
                      custombtn: {
                        text: 'Add New Event',
                        click: handleDateClick,
                      },
                    }}
                    eventClick={handleEventClick}
                    ref={calendarRef}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Event List */}
          <div className='col-xl-4 col-xxl-3 theiaStickySidebar'>
            <div className='stickybar'>
              <div className='d-flex align-items-center justify-content-between'>
                <h5 className='mb-3'>Upcoming Events</h5>
                <div className='dropdown mb-3'>
                  <button
                    className='btn btn-outline-light dropdown-toggle'
                    data-bs-toggle='dropdown'
                  >
                    {selectedCategory === 'all'
                      ? 'All Categories'
                      : eventCategory.find((c) => c.value === selectedCategory)
                          ?.label || 'Selected Category'}
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
                    {eventCategory.map((category) => (
                      <li key={category.value}>
                        <button
                          className='dropdown-item rounded-1 d-flex align-items-center'
                          onClick={() => setSelectedCategory(category.value)}
                        >
                          <i
                            className={`ti ti-circle-filled fs-8 text-${getCategoryColor(
                              category.value
                            )} me-2`}
                          />
                          {category.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className='text-center py-4'>
                  <i className='ti ti-calendar-off fs-20 text-muted mb-2' />
                  <p className='text-muted'>
                    {selectedCategory === 'all'
                      ? 'No upcoming events found'
                      : `No ${selectedCategory} events found`}
                  </p>
                  <button
                    className='btn btn-primary btn-sm'
                    onClick={handleDateClick}
                  >
                    <i className='ti ti-plus me-1' />
                    Add New Event
                  </button>
                </div>
              ) : (
                filteredEvents.slice(0, 5).map((event, index) => {
                  const categoryColor = getCategoryColor(event.category);
                  return (
                    <div
                      key={index}
                      className={`border-start border-${categoryColor} border-3 shadow-sm p-3 mb-3 bg-white cursor-pointer`}
                      onClick={() => {
                        setEventDetails({
                          _id: event._id,
                          title: event.title,
                          start: event.start,
                          end: event.end,
                          backgroundColor:
                            event.backgroundColor ||
                            (event.category
                              ? calendarCategoryColorMap[event.category]
                              : '#adb5bd'),
                          description: event.description,
                          category: event.category,
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
                            className={`ti ti-users-group text-${categoryColor} fs-20`}
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
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal show={showAddEventModal} onHide={handleAddEventClose} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>
            {eventDetails._id ? 'Edit Event' : 'New Event'}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className='row'>
              <div className='mb-3'>
                <label className='form-label'>Event Title</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Enter Title'
                  name='title'
                  value={eventDetails.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className='mb-3'>
                <label className='form-label'>Event Category</label>
                <CommonSelect<Option>
                  className='select'
                  options={eventCategory}
                  defaultValue={
                    eventCategory.find(
                      (opt) => opt.value.toLowerCase() === eventDetails.category
                    ) || eventCategory[0]
                  }
                  onChange={(selectedOption) => {
                    if (!selectedOption || Array.isArray(selectedOption))
                      return;

                    const singleOption = selectedOption as Option;

                    setEventDetails((prev) => ({
                      ...prev,
                      category:
                        singleOption.value.toLowerCase() as EventDetails['category'],
                    }));
                  }}
                />
              </div>

              <div className='col-md-6'>
                <div className='mb-3'>
                  <label className='form-label'>Start Date</label>
                  <div className='date-pic'>
                    <DatePicker
                      className='form-control datetimepicker'
                      placeholder='Select Date'
                      value={dayjs(eventDetails.start)}
                      onChange={(date) => handleDateChange(date, 'start')}
                    />
                    <span className='cal-icon'>
                      <i className='ti ti-calendar' />
                    </span>
                  </div>
                </div>
              </div>

              <div className='col-md-6'>
                <div className='mb-3'>
                  <label className='form-label'>End Date</label>
                  <div className='date-pic'>
                    <DatePicker
                      className='form-control datetimepicker'
                      placeholder='Select Date'
                      value={eventDetails.end ? dayjs(eventDetails.end) : null}
                      onChange={(date) => handleDateChange(date, 'end')}
                    />
                    <span className='cal-icon'>
                      <i className='ti ti-calendar' />
                    </span>
                  </div>
                </div>
              </div>

              <div className='col-md-6'>
                <div className='mb-3'>
                  <label className='form-label'>Start Time</label>
                  <div className='date-pic'>
                    <TimePicker
                      placeholder='11:00 AM'
                      className='form-control timepicker'
                      value={dayjs(eventDetails.start)}
                      onChange={(time) => handleTimeChange(time, 'start')}
                    />
                    <span className='cal-icon'>
                      <i className='ti ti-clock' />
                    </span>
                  </div>
                </div>
              </div>

              <div className='col-md-6'>
                <div className='mb-3'>
                  <label className='form-label'>End Time</label>
                  <div className='date-pic'>
                    <TimePicker
                      placeholder='11:00 AM'
                      className='form-control timepicker'
                      value={
                        eventDetails.end
                          ? dayjs(eventDetails.end)
                          : dayjs(eventDetails.start)
                      }
                      onChange={(time) => handleTimeChange(time, 'end')}
                    />
                    <span className='cal-icon'>
                      <i className='ti ti-clock' />
                    </span>
                  </div>
                </div>
              </div>

              <div className='col-md-12'>
                <div className='mb-3'>
                  <div className='bg-light p-3 pb-2 rounded'>
                    <div className='mb-3'>
                      <label className='form-label'>Attachment</label>
                      <p>Upload size of 4MB, Accepted Format PDF</p>
                    </div>
                    <div className='d-flex align-items-center flex-wrap'>
                      <div className='btn btn-primary drag-upload-btn mb-2 me-2'>
                        <i className='ti ti-file-upload me-1' />
                        Upload
                        <input
                          type='file'
                          className='form-control image_sign'
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setEventDetails((prev) => ({
                                ...prev,
                                attachment: URL.createObjectURL(file),
                              }));
                            }
                          }}
                        />
                      </div>
                      {eventDetails.attachment && (
                        <p className='mb-2'>Attachment.pdf</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className='mb-0'>
                  <label className='form-label'>Description</label>
                  <textarea
                    className='form-control'
                    rows={4}
                    name='description'
                    value={eventDetails.description || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type='button'
              className='btn btn-light me-2'
              onClick={handleAddEventClose}
            >
              Cancel
            </button>
            <button type='submit' className='btn btn-primary'>
              {eventDetails._id ? 'Update Event' : 'Create Event'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>

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
            <div>
              <button
                className='btn btn-link me-1'
                onClick={() => {
                  setShowEventDetailsModal(false);
                  setShowAddEventModal(true);
                }}
                title='Edit'
              >
                <i className='ti ti-edit-circle' />
              </button>
              <button
                className='btn btn-link me-1 text-danger'
                onClick={handleDeleteEvent}
                title='Delete'
              >
                <i className='ti ti-trash-x' />
              </button>
            </div>
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
              <div className='d-flex align-items-center flex-wrap'>
                <p className='me-3 mb-0'>
                  <i className='ti ti-calendar me-1' />
                  {dayjs(eventDetails.start).format('DD MMM YYYY')}
                  {eventDetails.end &&
                    ` - ${dayjs(eventDetails.end).format('DD MMM YYYY')}`}
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
    </div>
  );
};

export default Events;
