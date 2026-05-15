import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import axios from 'axios';
import dayjs from 'dayjs';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface EventDetails {
  _id?: string;
  title: string;
  caption?: string;
  price?: number;
  start: string;
  end: string;
  description?: string;
  category?: string;
  school?: {
    name: string;
    address: string;
    website: string;
  };
  backgroundColor?: string;
  allDay?: boolean;
}

const categoryColorMap: Record<string, string> = {
  training: '#1abe17',
  game: '#dc3545',
  holidays: '#0f65cd',
  celebration: '#eab300',
  camp: '#ff00d2',
  tryout: '#0d6efd',
};

const Calendar = () => {
  const routes = all_routes;
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [weekendsVisible, setWeekendsVisible] = useState(true);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<EventDetails>>({
    title: '',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    category: 'camp',
  });
  const [schools, setSchools] = useState<
    { name: string; address: string; website: string }[]
  >([]);
  const [showNewSchoolForm, setShowNewSchoolForm] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE_URL });
    instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error),
    );
    return instance;
  }, []);

  // Fetch events
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

  // Fetch schools
  const fetchSchools = useCallback(async () => {
    try {
      const response = await api.get('/schools');
      if (response.data && Array.isArray(response.data)) {
        setSchools(response.data);
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
    fetchSchools();
  }, [fetchEvents, fetchSchools]);

  const formatEventsForCalendar = (events: EventDetails[]) => {
    return events.map((event) => ({
      id: event._id,
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor:
        event.backgroundColor ||
        (event.category ? categoryColorMap[event.category] : '#adb5bd'),
      extendedProps: {
        caption: event.caption,
        price: event.price,
        description: event.description,
        category: event.category,
        school: event.school,
      },
    }));
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent({
      _id: clickInfo.event.id,
      title: clickInfo.event.title,
      caption: clickInfo.event.extendedProps.caption,
      price: clickInfo.event.extendedProps.price,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      description: clickInfo.event.extendedProps.description,
      category: clickInfo.event.extendedProps.category,
      school: clickInfo.event.extendedProps.school,
      backgroundColor: clickInfo.event.backgroundColor,
    });
    setShowEventModal(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    setNewEvent({
      title: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      category: 'camp',
    });
    setShowAddEventModal(true);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title) {
      alert('Please enter an event title');
      return;
    }

    try {
      const eventToSave = {
        title: newEvent.title,
        caption: newEvent.caption || '',
        price: newEvent.price || 0,
        description: newEvent.description || '',
        start: newEvent.start,
        end: newEvent.end,
        category: newEvent.category || 'camp',
        backgroundColor: categoryColorMap[newEvent.category || 'camp'],
        school: newEvent.school,
      };

      await api.post('/events', eventToSave);
      await fetchEvents();
      setShowAddEventModal(false);
      setNewEvent({
        title: '',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        category: 'camp',
      });
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?._id) return;
    try {
      await api.delete(`/events/${selectedEvent._id}`);
      await fetchEvents();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const handleAddSchool = async () => {
    if (!newSchoolName.trim()) {
      alert('Please enter a school name');
      return;
    }

    try {
      const response = await api.post('/schools/addIfMissing', {
        schoolName: newSchoolName,
      });
      if (response.data.success) {
        await fetchSchools();
        setShowNewSchoolForm(false);
        setNewSchoolName('');
        alert('School added successfully!');
      }
    } catch (error) {
      console.error('Error adding school:', error);
      alert('Failed to add school');
    }
  };

  const categoryOptions = [
    { value: 'camp', label: 'Camp', color: '#ff00d2' },
    { value: 'training', label: 'Training', color: '#1abe17' },
    { value: 'game', label: 'Game', color: '#dc3545' },
    { value: 'tryout', label: 'Tryout', color: '#0d6efd' },
    { value: 'celebration', label: 'Celebration', color: '#eab300' },
    { value: 'holidays', label: 'Holidays', color: '#0f65cd' },
  ];

  if (isLoading) {
    return (
      <div className='page-wrapper'>
        <div
          className='content d-flex justify-content-center align-items-center'
          style={{ height: '100vh' }}
        >
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
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
            <h3 className='page-title mb-1'>Calendar</h3>
            <nav>
              <ol className='breadcrumb mb-0'>
                <li className='breadcrumb-item'>
                  <Link to={routes.adminDashboard}>Dashboard</Link>
                </li>
                <li className='breadcrumb-item active' aria-current='page'>
                  Calendar
                </li>
              </ol>
            </nav>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='mb-2'>
              <button
                className='btn btn-primary'
                onClick={() => setShowAddEventModal(true)}
              >
                <i className='ti ti-plus me-1' /> Create Event
              </button>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-lg-9 col-md-8'>
            <div className='card bg-white'>
              <div className='card-body'>
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                  }}
                  initialView='dayGridMonth'
                  editable={true}
                  selectable={true}
                  selectMirror={true}
                  dayMaxEvents={true}
                  weekends={weekendsVisible}
                  events={formatEventsForCalendar(events)}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  height='auto'
                />
              </div>
            </div>
          </div>

          {/* Sidebar - Category Legend */}
          <div className='col-lg-3 col-md-4'>
            <div className='card'>
              <div className='card-header'>
                <h4 className='card-title'>Categories</h4>
              </div>
              <div className='card-body'>
                {categoryOptions.map((cat) => (
                  <div
                    key={cat.value}
                    className='mb-2 d-flex align-items-center'
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: cat.color,
                        display: 'inline-block',
                        marginRight: 8,
                      }}
                    />
                    <span>{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal
        show={showAddEventModal}
        onHide={() => setShowAddEventModal(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Add New Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='row'>
            <div className='col-md-12 mb-3'>
              <label className='form-label'>Event Title *</label>
              <input
                type='text'
                className='form-control'
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, title: e.target.value })
                }
                placeholder='Enter event title'
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>Start Date & Time</label>
              <input
                type='datetime-local'
                className='form-control'
                value={
                  newEvent.start
                    ? dayjs(newEvent.start).format('YYYY-MM-DDTHH:mm')
                    : ''
                }
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    start: new Date(e.target.value).toISOString(),
                  })
                }
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>End Date & Time</label>
              <input
                type='datetime-local'
                className='form-control'
                value={
                  newEvent.end
                    ? dayjs(newEvent.end).format('YYYY-MM-DDTHH:mm')
                    : ''
                }
                onChange={(e) =>
                  setNewEvent({
                    ...newEvent,
                    end: new Date(e.target.value).toISOString(),
                  })
                }
              />
            </div>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>Category</label>
              <select
                className='form-select'
                value={newEvent.category}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, category: e.target.value })
                }
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='col-md-6 mb-3'>
              <label className='form-label'>School / Location</label>
              <select
                className='form-select'
                value={newEvent.school?.name || ''}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setShowNewSchoolForm(true);
                  } else {
                    const selected = schools.find(
                      (s) => s.name === e.target.value,
                    );
                    setNewEvent({ ...newEvent, school: selected || undefined });
                  }
                }}
              >
                <option value=''>Select a school</option>
                {schools.map((school) => (
                  <option key={school.name} value={school.name}>
                    {school.name}
                  </option>
                ))}
                <option value='__add_new__'>+ Add new school</option>
              </select>
            </div>
            {showNewSchoolForm && (
              <div className='col-md-12 mb-3 p-3 border rounded bg-light'>
                <div className='d-flex justify-content-between align-items-center mb-2'>
                  <label className='form-label fw-semibold mb-0'>
                    New School
                  </label>
                  <button
                    type='button'
                    className='btn-close btn-sm'
                    onClick={() => setShowNewSchoolForm(false)}
                  />
                </div>
                <input
                  type='text'
                  className='form-control mb-2'
                  placeholder='School name'
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                />
                <button
                  className='btn btn-sm btn-primary w-100'
                  onClick={handleAddSchool}
                >
                  Add School
                </button>
              </div>
            )}
            <div className='col-md-12 mb-3'>
              <label className='form-label'>Caption</label>
              <input
                type='text'
                className='form-control'
                value={newEvent.caption || ''}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, caption: e.target.value })
                }
                placeholder='Short caption'
              />
            </div>
            <div className='col-md-12 mb-3'>
              <label className='form-label'>Description</label>
              <textarea
                className='form-control'
                rows={3}
                value={newEvent.description || ''}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, description: e.target.value })
                }
                placeholder='Event description'
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            className='btn btn-light'
            onClick={() => setShowAddEventModal(false)}
          >
            Cancel
          </button>
          <button className='btn btn-primary' onClick={handleAddEvent}>
            Create Event
          </button>
        </Modal.Footer>
      </Modal>

      {/* Event Details Modal */}
      <Modal
        show={showEventModal}
        onHide={() => setShowEventModal(false)}
        size='lg'
      >
        <Modal.Header closeButton>
          <Modal.Title>Event Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div>
              <div className='d-flex align-items-center mb-4'>
                <div
                  className='me-3'
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor:
                      selectedEvent.backgroundColor ||
                      categoryColorMap[selectedEvent.category || 'camp'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i className='ti ti-calendar-event text-white' />
                </div>
                <div>
                  <h3 className='mb-1'>{selectedEvent.title}</h3>
                  {selectedEvent.caption && (
                    <h5 className='text-muted mb-0'>{selectedEvent.caption}</h5>
                  )}
                </div>
              </div>

              <div className='row mb-3'>
                <div className='col-md-6'>
                  <div className='d-flex align-items-center mb-3'>
                    <i className='ti ti-calendar me-3 fs-4 text-primary' />
                    <div>
                      <h6 className='mb-0'>Date</h6>
                      <p className='mb-0'>
                        {dayjs(selectedEvent.start).format(
                          'dddd, MMMM D, YYYY',
                        )}
                        {selectedEvent.end &&
                          !dayjs(selectedEvent.start).isSame(
                            dayjs(selectedEvent.end),
                            'day',
                          ) &&
                          ` - ${dayjs(selectedEvent.end).format('dddd, MMMM D, YYYY')}`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='d-flex align-items-center mb-3'>
                    <i className='ti ti-clock me-3 fs-4 text-primary' />
                    <div>
                      <h6 className='mb-0'>Time</h6>
                      <p className='mb-0'>
                        {dayjs(selectedEvent.start).format('h:mm A')} -{' '}
                        {dayjs(selectedEvent.end || selectedEvent.start).format(
                          'h:mm A',
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedEvent.school && (
                <div className='mb-4'>
                  <h6 className='mb-2'>
                    <i className='ti ti-map-pin me-2' /> Location
                  </h6>
                  <div className='bg-light p-3 rounded'>
                    <p className='mb-1'>
                      <strong>School:</strong> {selectedEvent.school.name}
                    </p>
                    {selectedEvent.school.address && (
                      <p className='mb-1'>
                        <strong>Address:</strong> {selectedEvent.school.address}
                      </p>
                    )}
                    {selectedEvent.school.website && (
                      <p className='mb-0'>
                        <strong>Website:</strong>{' '}
                        <a
                          href={selectedEvent.school.website}
                          target='_blank'
                          rel='noreferrer'
                        >
                          {selectedEvent.school.website}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedEvent.price && selectedEvent.price > 0 && (
                <div className='mb-3'>
                  <h6>Price</h6>
                  <p className='text-primary fw-bold'>
                    ${selectedEvent.price.toFixed(2)} per person
                  </p>
                </div>
              )}

              {selectedEvent.description && (
                <div className='mb-3'>
                  <h6>Description</h6>
                  <p className='text-muted'>{selectedEvent.description}</p>
                </div>
              )}

              <div className='mt-3 pt-3 border-top'>
                <span
                  className='badge'
                  style={{
                    backgroundColor:
                      selectedEvent.backgroundColor ||
                      categoryColorMap[selectedEvent.category || 'camp'],
                  }}
                >
                  {selectedEvent.category?.toUpperCase() || 'EVENT'}
                </span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className='btn btn-danger' onClick={handleDeleteEvent}>
            Delete Event
          </button>
          <button
            className='btn btn-light'
            onClick={() => setShowEventModal(false)}
          >
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Calendar;
