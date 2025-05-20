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
import { EventDetails, SchoolInfo, CalendarEvent } from '../../types/types';
import HelpModal from '../../core/common/HelpModal';
import FormTemplateSelector from '../settings/systemSettings/form/FormTemplateSelector';
import EventRegistrationForm from '../settings/systemSettings/form/EventRegistrationForm';
import { Form, PaymentFormField } from '../../types/form';

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
  holidays: '#0f65cd',
  celebration: '#eab300',
  camp: '#6c757d',
  tryout: '#0d6efd',
};

const Events = () => {
  const routes = all_routes;
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const calendarRef = useRef<FullCalendar>(null);
  const [schools, setSchools] = useState<SchoolInfo[]>([]);
  const [showSchoolFields, setShowSchoolFields] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [availableForms, setAvailableForms] = useState<Form[]>([]);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [eventDetails, setEventDetails] = useState<EventDetails>({
    title: '',
    caption: '',
    price: 0,
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later with time
    school: { name: '', address: '', website: '' },
  });

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

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      const infoButton = document.querySelector('.fc-helpbtn-button');
      if (infoButton) {
        infoButton.innerHTML = '<span class="ti ti-info-circle fs-4"></span>';
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

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

  const handleDateClick = () => {
    const now = new Date();
    setEventDetails({
      title: '',
      caption: '',
      price: 0,
      start: now.toISOString(),
      end: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      school: { name: '', address: '', website: '' },
    });
    setShowAddEventModal(true);
  };

  const handleEventClick = (info: any) => {
    setEventDetails({
      _id: info.event.id,
      title: info.event.title,
      caption: info.event.extendedProps.caption || '',
      price: info.event.extendedProps.price || 0,
      start: info.event.startStr,
      end: info.event.endStr,
      backgroundColor: info.event.backgroundColor,
      description: info.event.extendedProps.description || '',
      category: info.event.extendedProps.category || 'training',
      school: info.event.extendedProps.school || {
        name: '',
        address: '',
        website: '',
      },
      attendees: info.event.extendedProps.attendees || [],
    });
    setShowEventDetailsModal(true);
  };

  const handleAddEventClose = () => setShowAddEventModal(false);
  const handleEventDetailsClose = () => setShowEventDetailsModal(false);

  const loadSchools = useCallback(async () => {
    try {
      const response = await api.get('/events/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  }, [api]);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchEvents();
      await loadSchools();
    };

    loadInitialData();
  }, [api, fetchEvents, loadSchools]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    if (category === 'game' || category === 'training') {
      loadSchools();
      setShowSchoolFields(true);
    } else {
      setShowSchoolFields(false);
    }
  };

  useEffect(() => {
    const loadForms = async () => {
      try {
        const response = await api.get('/forms');
        setAvailableForms(response.data.data || []);
      } catch (error) {
        console.error('Error loading forms:', error);
      }
    };
    loadForms();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const category = eventDetails.category || 'training';
      const isGame = category === 'game';
      const isGameOrTraining = isGame || category === 'training';

      const price = isGame
        ? typeof eventDetails.price === 'number'
          ? eventDetails.price
          : parseFloat(eventDetails.price) || 0
        : 0;

      const selectedForm = availableForms.find(
        (f) => f._id === eventDetails.formId
      );
      const paymentField = selectedForm?.fields.find(
        (f) => f.type === 'payment'
      ) as PaymentFormField | undefined;

      const eventToSave = {
        title: eventDetails.title,
        caption: eventDetails.caption || '',
        price: Math.max(0, price),
        description: eventDetails.description,
        start: eventDetails.start,
        end: eventDetails.end,
        category: category,
        backgroundColor: calendarCategoryColorMap[category] || '#adb5bd',
        school:
          isGameOrTraining && eventDetails.school?.name
            ? eventDetails.school
            : undefined,
        ...(eventDetails._id && { _id: eventDetails._id }),
        formId: eventDetails.formId,
        paymentConfig: paymentField?.paymentConfig,
      };

      // Save new school if it doesn't exist
      if (
        isGame &&
        eventDetails.school?.name &&
        !schools.some((s) => s.name === eventDetails.school?.name)
      ) {
        setSchools((prev) => [...prev, eventDetails.school!]);
      }

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
      // Get current date value or use now if undefined
      const currentValue =
        field === 'start' || eventDetails[field]
          ? new Date(eventDetails[field]!)
          : new Date();

      const newDate = date.toDate();

      // Combine new date with existing time
      const updatedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        currentValue.getHours(),
        currentValue.getMinutes(),
        0,
        0
      );

      setEventDetails((prev) => ({
        ...prev,
        [field]: updatedDate.toISOString(),
      }));
    }
  };

  const handleTimeChange = (time: Dayjs | null, field: 'start' | 'end') => {
    if (time) {
      // Get current date value or use now if undefined
      const currentValue =
        field === 'start' || eventDetails[field]
          ? new Date(eventDetails[field]!)
          : new Date();

      // Combine existing date with new time
      const updatedDate = new Date(
        currentValue.getFullYear(),
        currentValue.getMonth(),
        currentValue.getDate(),
        time.hour(),
        time.minute(),
        0,
        0
      );

      setEventDetails((prev) => ({
        ...prev,
        [field]: updatedDate.toISOString(),
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
        caption: event.caption,
        price: event.price,
        description: event.description,
        category: event.category,
        school: event.school,
        attendees: event.attendees,
      },
    }));
  };

  const handleEventUpdate = async (calendarEvent: CalendarEvent) => {
    try {
      const eventToUpdate = {
        _id: calendarEvent.id,
        title: calendarEvent.title,
        start: calendarEvent.startStr,
        end: calendarEvent.endStr,
        ...calendarEvent.extendedProps,
      };

      await api.put(`/events/${calendarEvent.id}`, eventToUpdate);
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      calendarEvent.revert();
    }
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
                      center: 'dayGridMonth,timeGridWeek,timeGridDay',
                      end: 'custombtn helpbtn',
                    }}
                    customButtons={{
                      custombtn: {
                        text: 'Add New Event',
                        click: handleDateClick,
                      },
                      helpbtn: {
                        text: '',
                        hint: 'Calendar tips',
                        click: () => setShowHelpModal(true),
                      },
                    }}
                    eventClick={handleEventClick}
                    ref={calendarRef}
                    height='900px'
                    contentHeight='120px'
                    aspectRatio={1.7}
                    dayMaxEventRows={3}
                    views={{
                      dayGridMonth: {
                        dayMaxEventRows: 3,
                      },
                      timeGridWeek: {
                        dayMaxEventRows: 6,
                      },
                    }}
                    editable={true}
                    selectable={true}
                    eventDragStart={(info) => {
                      const originalEvent = {
                        id: info.event.id,
                        title: info.event.title,
                        start: info.event.startStr,
                        end: info.event.endStr,
                        extendedProps: {
                          caption: info.event.extendedProps.caption || '',
                          price: info.event.extendedProps.price || 0,
                          description:
                            info.event.extendedProps.description || '',
                          category:
                            info.event.extendedProps.category || 'training',
                          school: info.event.extendedProps.school || undefined,
                          attendees: info.event.extendedProps.attendees || [],
                        },
                      };
                      info.el.setAttribute(
                        'data-original-event',
                        JSON.stringify(originalEvent)
                      );
                      info.el.style.cursor = 'grabbing';
                    }}
                    eventDragStop={(info) => {
                      info.el.style.cursor = '';
                    }}
                    eventDrop={(info) => {
                      const isCopy =
                        info.jsEvent.ctrlKey || info.jsEvent.metaKey;
                      const originalEventStr = info.el.getAttribute(
                        'data-original-event'
                      );

                      if (isCopy && originalEventStr) {
                        const originalEvent = JSON.parse(originalEventStr);

                        const newEvent = {
                          ...originalEvent,
                          start: info.event.startStr,
                          end: info.event.endStr,
                          _id: undefined,
                        };

                        setEventDetails(newEvent);
                        setShowAddEventModal(true);
                        info.revert();
                      } else {
                        handleEventUpdate(
                          info.event as unknown as CalendarEvent
                        );
                      }
                    }}
                    eventResize={(info) => {
                      handleEventUpdate(info.event as unknown as CalendarEvent);
                    }}
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
                          onClick={() => handleCategorySelect(category.value)}
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
                          caption: event.caption,
                          price: event.price,
                          start: event.start,
                          end: event.end,
                          backgroundColor:
                            event.backgroundColor ||
                            (event.category
                              ? calendarCategoryColorMap[event.category]
                              : '#adb5bd'),
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

              <div className='col-md-12 mb-3'>
                <label className='form-label'>Caption</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Enter event caption'
                  name='caption'
                  value={eventDetails.caption || ''}
                  onChange={handleInputChange}
                  style={{ pointerEvents: 'auto' }}
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
                    const category = singleOption.value.toLowerCase();
                    const showFields =
                      category === 'game' || category === 'training';

                    setEventDetails((prev) => ({
                      ...prev,
                      category: category as EventDetails['category'],
                      school: showFields
                        ? prev.school || { name: '', address: '', website: '' }
                        : undefined,
                    }));

                    setShowSchoolFields(showFields);
                    if (showFields) loadSchools();
                  }}
                />
              </div>

              {/* Show school fields only for game events */}
              {showSchoolFields && (
                <>
                  {/* Show price field only for game category */}
                  {eventDetails.category === 'game' && (
                    <div className='mb-3'>
                      <label className='form-label'>Price ($)</label>
                      <input
                        type='number'
                        className='form-control'
                        placeholder='Enter price'
                        name='price'
                        value={eventDetails.price || 0}
                        onChange={(e) =>
                          setEventDetails((prev) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  )}

                  <div className='col-md-12 mb-3'>
                    <label className='form-label'>School</label>
                    <select
                      className='form-select'
                      value={eventDetails.school?.name || ''}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setEventDetails((prev) => ({
                            ...prev,
                            school: { name: '', address: '', website: '' },
                          }));
                        } else {
                          const selectedSchool = schools.find(
                            (s) => s.name === e.target.value
                          );
                          setEventDetails((prev) => ({
                            ...prev,
                            school: selectedSchool || {
                              name: '',
                              address: '',
                              website: '',
                            },
                          }));
                        }
                      }}
                    >
                      <option value=''>Select a school</option>
                      {schools.map((school, index) => (
                        <option key={index} value={school.name}>
                          {school.name}
                        </option>
                      ))}
                      <option value='__new__'>Add new school</option>
                    </select>
                  </div>

                  {/* Show these fields when a school is selected or new school is being added */}
                  {(eventDetails.school?.name ||
                    eventDetails.school?.name === '') && (
                    <>
                      <div className='col-md-12 mb-3'>
                        <label className='form-label'>School Name</label>
                        <input
                          type='text'
                          className='form-control'
                          placeholder='Enter school name'
                          value={eventDetails.school?.name || ''}
                          onChange={(e) =>
                            setEventDetails((prev) => ({
                              ...prev,
                              school: {
                                ...(prev.school || {
                                  name: '',
                                  address: '',
                                  website: '',
                                }),
                                name: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className='col-md-12 mb-3'>
                        <label className='form-label'>School Address</label>
                        <input
                          type='text'
                          className='form-control'
                          placeholder='Enter school address'
                          value={eventDetails.school?.address || ''}
                          onChange={(e) =>
                            setEventDetails((prev) => ({
                              ...prev,
                              school: {
                                ...(prev.school || {
                                  name: '',
                                  address: '',
                                  website: '',
                                }),
                                address: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className='col-md-12 mb-3'>
                        <label className='form-label'>School Website</label>
                        <input
                          type='url'
                          className='form-control'
                          placeholder='Enter school website'
                          value={eventDetails.school?.website || ''}
                          onChange={(e) =>
                            setEventDetails((prev) => ({
                              ...prev,
                              school: {
                                ...(prev.school || {
                                  name: '',
                                  address: '',
                                  website: '',
                                }),
                                website: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className='col-md-6'>
                <div className='mb-3'>
                  <label className='form-label'>Start Date</label>
                  <div className='date-pic'>
                    <DatePicker
                      className='form-control datetimepicker'
                      placeholder='Select Date'
                      value={
                        eventDetails.start ? dayjs(eventDetails.start) : null
                      }
                      format='MM/DD/YYYY'
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
                      format='MM/DD/YYYY'
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
                      use12Hours
                      format='hh:mm A'
                      showSecond={false}
                      value={
                        eventDetails.start ? dayjs(eventDetails.start) : null
                      }
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
                      use12Hours
                      format='hh:mm A'
                      showSecond={false}
                      value={eventDetails.end ? dayjs(eventDetails.end) : null}
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

                <div className='mb-3'>
                  <label className='form-label'>Description</label>
                  <textarea
                    className='form-control'
                    rows={4}
                    name='description'
                    value={eventDetails.description || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <FormTemplateSelector
                  forms={availableForms}
                  selectedFormId={eventDetails.formId}
                  onSelectForm={(formId) =>
                    setEventDetails((prev) => ({ ...prev, formId }))
                  }
                />
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
              <i className='ti ti ti-calendar-event fs-30' />
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

          {(eventDetails.category === 'game' ||
            eventDetails.category === 'training') &&
            eventDetails.school && (
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

          {eventDetails.formId && (
            <div className='mt-4'>
              <h5>Registration Form</h5>
              <EventRegistrationForm
                formFields={
                  availableForms.find((f) => f._id === eventDetails.formId)
                    ?.fields || []
                }
                eventId={eventDetails._id}
                onSubmit={async (formData: Record<string, any>) => {
                  try {
                    // Find the payment field using proper type narrowing
                    const paymentField = availableForms
                      .find((f) => f._id === eventDetails.formId)
                      ?.fields.find(
                        (f): f is PaymentFormField => f.type === 'payment'
                      );

                    if (paymentField) {
                      // Now TypeScript knows this is a PaymentFormField
                      console.log(
                        'Processing payment:',
                        paymentField.paymentConfig
                      );
                      // You can safely access paymentConfig here
                    }

                    // Save form submission
                    await api.post('/form-submissions', {
                      eventId: eventDetails._id,
                      formId: eventDetails.formId,
                      formData,
                    });

                    // Show success message
                    alert('Registration submitted successfully!');
                  } catch (error) {
                    console.error('Error submitting form:', error);
                    alert('Error submitting form. Please try again.');
                  }
                }}
              />
            </div>
          )}
        </Modal.Body>
      </Modal>
      <HelpModal show={showHelpModal} onHide={() => setShowHelpModal(false)} />
    </div>
  );
};

export default Events;
