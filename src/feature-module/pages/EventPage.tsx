import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RegistrationWizard from '../components/registration/RegistrationWizard';
import {
  TryoutSpecificConfig,
  RegistrationFormConfig,
} from '../../types/registration-types';
import { formatDate } from '../../utils/dateFormatter';
import ReactPixel from 'react-facebook-pixel';
import './EventPage.css';

interface EventConfig {
  _id: string;
  eventType: 'tryout' | 'training' | 'tournament';
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  gender: string;
  grades: string;
  ageGroups: string[];
  price: number;
  registrationOpen: boolean;
  isActive: boolean;
  whatToBring: string[];
  whatToExpect: string;
  importantNotes: string[];
  imageUrl: string;
  formConfigId?: string;
  registrationDeadline?: string;
  insuranceRequired?: boolean;
  refundPolicy?: string;
  tryoutFee?: number;
  tryoutName?: string;
  tryoutYear?: number;
  displayName?: string;
  // Store full tryoutDetails for better data access
  tryoutDetails?: any;
  // Store sessions for display
  tryoutSessions?: any[];
}

interface EventPageProps {
  eventType: 'tryout' | 'training' | 'tournament';
  title: string;
  icon: string;
  color: string;
  registrationWizardType: 'tryout' | 'training' | 'tournament';
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const EventPage: React.FC<EventPageProps> = ({
  eventType,
  title,
  icon,
  color,
  registrationWizardType,
}) => {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailForNotification, setEmailForNotification] = useState('');
  const [notificationSubmitted, setNotificationSubmitted] = useState(false);
  const [eventConfig, setEventConfig] = useState<TryoutSpecificConfig | null>(
    null,
  );
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const { getMarketingAttribution } = useMarketing();

  // Helper function to safely get location name
  const getLocationName = (location: any): string => {
    if (!location) return 'TBD';
    if (typeof location === 'string') return location;
    return location.name || 'TBD';
  };

  // Helper function to safely get location display string
  const getLocationDisplay = (location: any): string => {
    if (!location) return '';
    if (typeof location === 'string') return location;

    const parts = [
      location.name,
      location.address,
      location.city,
      location.state,
      location.zip,
    ].filter((part: string) => part && part.trim && part.trim() !== '');

    return parts.length > 0 ? parts.join(', ') : '';
  };

  // Helper function to get location from tryoutDetails
  const getLocationFromDetails = (config: any): string => {
    // Check tryoutDetails.tryoutSessions first
    if (config?.tryoutDetails?.tryoutSessions?.length > 0) {
      const session = config.tryoutDetails.tryoutSessions[0];
      if (session?.location?.name && session.location.name.trim() !== '') {
        return session.location.name;
      }
    }

    // Check tryoutDetails.location
    if (
      config?.tryoutDetails?.location?.name &&
      config.tryoutDetails.location.name.trim() !== ''
    ) {
      return config.tryoutDetails.location.name;
    }

    // Check config.location
    if (config?.location?.name && config.location.name.trim() !== '') {
      return config.location.name;
    }

    return 'TBD';
  };

  // Helper function to get tryout dates as formatted string
  const getTryoutDatesDisplay = (config: any): string => {
    if (config?.tryoutDetails?.tryoutSessions?.length > 0) {
      const dates = config.tryoutDetails.tryoutSessions
        .filter((s: any) => s.date)
        .map((s: any) => s.date);
      if (dates.length > 0) {
        return dates.join(', ');
      }
    }

    if (config?.tryoutDetails?.startDate) {
      return config.tryoutDetails.startDate;
    }

    if (config?.startDate) {
      return formatDate(config.startDate);
    }

    return 'TBD';
  };

  // Helper function to get tryout fee
  const getTryoutFee = (config: any): number => {
    if (
      config?.tryoutDetails?.tryoutFee !== undefined &&
      config.tryoutDetails.tryoutFee > 0
    ) {
      return config.tryoutDetails.tryoutFee;
    }
    if (config?.tryoutFee && config.tryoutFee > 0) {
      return config.tryoutFee;
    }
    if (config?.price && config.price > 0) {
      return config.price;
    }
    return 0;
  };

  // ✅ Track ViewContent event
  useEffect(() => {
    if (config) {
      ReactPixel.track('ViewContent', {
        content_name: `${title} Page - Bothell Select`,
        content_category: `Basketball ${title}`,
        content_type: 'landing_page',
        event_type: eventType,
        registration_open: config.registrationOpen,
        price: config.price,
      });
      console.log(`✅ Facebook Pixel - ViewContent tracked for ${title} page`);
    }
  }, [config, title, eventType]);

  useEffect(() => {
    fetchEventConfig();
  }, [eventType]);

  useEffect(() => {
    const utmData = getMarketingAttribution();
    if (utmData.source !== 'direct') {
      console.log(`📊 UTM Data captured for ${eventType}:`, utmData);
    }
  }, [searchParams, getMarketingAttribution]);

  const fetchEventConfig = async () => {
    try {
      setLoading(true);

      // Fetch from event-config endpoint
      const response = await axios.get(
        `${API_BASE_URL}/event-config/public/${eventType}`,
      );

      if (!response.data.success || !response.data.config) {
        setError(`No ${eventType} configuration found`);
        setLoading(false);
        return;
      }

      const configData = response.data.config;

      // Try to fetch additional form config data for more details
      try {
        const formResponse = await axios.get(
          `${API_BASE_URL}/registration-config/event/${eventType}`,
        );

        if (formResponse.data.success && formResponse.data.config) {
          const formData = formResponse.data.config;

          // Merge additional fields from form config
          configData.registrationDeadline =
            formData.registrationDeadline || configData.registrationDeadline;
          configData.insuranceRequired = formData.requiresInsurance || false;
          configData.refundPolicy =
            formData.refundPolicy || 'No refunds after registration deadline';
          configData.tryoutFee =
            formData.tryoutFee ||
            formData.pricing?.basePrice ||
            configData.price;
          configData.tryoutName = formData.tryoutName || configData.title;
          configData.tryoutYear =
            formData.tryoutYear || new Date(configData.startDate).getFullYear();
          configData.displayName = formData.displayName || configData.title;
          configData.price =
            formData.tryoutFee ||
            formData.pricing?.basePrice ||
            configData.price;
          // Store the full tryoutDetails
          if (formData.tryoutDetails) {
            configData.tryoutDetails = formData.tryoutDetails;
          }
          // Store whatToBring and importantNotes from formData
          if (formData.whatToBring) {
            configData.whatToBring = formData.whatToBring;
          }
          if (formData.importantNotes) {
            configData.importantNotes = formData.importantNotes;
          }
          // If location is empty in event config but has data in form config
          if (
            formData.location &&
            formData.location.name &&
            !configData.location?.name
          ) {
            configData.location = formData.location;
          }

          console.log('📦 Merged config data:', configData);
          console.log('📦 tryoutDetails:', configData.tryoutDetails);
        }
      } catch (formError) {
        console.log(
          'ℹ️ No additional form config found, using event config only',
        );
      }

      setConfig(configData);

      const wizardConfig = convertToWizardConfig(configData);
      wizardConfig.isActive = configData.registrationOpen;
      setEventConfig(wizardConfig);

      console.log(`🎯 ${eventType} config loaded:`, {
        title: configData.title,
        registrationOpen: configData.registrationOpen,
        tryoutFee: configData.tryoutFee,
        registrationDeadline: configData.registrationDeadline,
        insuranceRequired: configData.insuranceRequired,
        refundPolicy: configData.refundPolicy,
        locationName: configData.location?.name,
        tryoutDetails: configData.tryoutDetails ? 'present' : 'not present',
      });
    } catch (err) {
      console.error(`Error fetching ${eventType} config:`, err);
      setError(`Failed to load ${eventType} information`);
    } finally {
      setLoading(false);
    }
  };

  const convertToWizardConfig = (config: EventConfig): TryoutSpecificConfig => {
    return {
      tryoutName: config.tryoutName || config.title,
      tryoutYear: config.tryoutYear || new Date(config.startDate).getFullYear(),
      displayName: config.displayName || config.title,
      registrationDeadline: config.registrationDeadline || '',
      tryoutDates: [config.startDate],
      locations:
        config.location &&
        config.location.name &&
        config.location.name.trim() !== ''
          ? [
              {
                name: config.location.name,
                address: config.location.address || '',
                city: config.location.city || '',
                state: config.location.state || '',
                zipCode: config.location.zip || '',
              },
            ]
          : [],
      divisions: [],
      ageGroups: config.ageGroups || [],
      requiresPayment: (config.tryoutFee || config.price || 0) > 0,
      requiresRoster: false,
      requiresInsurance: config.insuranceRequired || false,
      paymentDeadline: '',
      refundPolicy:
        config.refundPolicy || 'No refunds after registration deadline',
      tryoutFee: config.tryoutFee || config.price || 0,
      isActive: config.registrationOpen,
      description: config.description || '',
      eventId: config._id,
    };
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForNotification) return;

    try {
      await axios.post(`${API_BASE_URL}/event-config/notify`, {
        email: emailForNotification,
        eventType,
        eventId: config?._id,
      });
      setNotificationSubmitted(true);
      console.log(
        `📧 Email collected for ${eventType} notification:`,
        emailForNotification,
      );
    } catch (error) {
      console.error('Error submitting notification email:', error);
    }
  };

  const toggleDetails = () => {
    setDetailsExpanded(!detailsExpanded);
  };

  if (loading) {
    return (
      <div className='event-page-container'>
        <div className='event-bg-gradient' />
        <div className='event-content-wrapper'>
          <div className='event-status-glass'>
            <LoadingSpinner />
            <p>Loading {title} information…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className='event-page-container'>
        <div className='event-bg-gradient' />
        <div className='event-content-wrapper'>
          <div className='event-status-glass'>
            <h1 className='status-title'>No {title} scheduled</h1>
            <p className='status-body'>
              {error || `Check back soon for upcoming ${title}.`}
            </p>
            <Link to='/' className='event-btn-primary'>
              Return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = formatDate(config.startDate);
  const tryoutFee = getTryoutFee(config);
  const locationDisplay = getLocationFromDetails(config);
  const tryoutDatesDisplay = getTryoutDatesDisplay(config);

  return (
    <div className='event-page-container'>
      {/* Background gradient */}
      <div className='event-bg-gradient' />

      {/* Animated gradient orbs with event color */}
      <div
        className='event-orb event-orb-1'
        style={{ background: `${color}33` }}
      />
      <div
        className='event-orb event-orb-2'
        style={{ background: `${color}22` }}
      />
      <div
        className='event-orb event-orb-3'
        style={{ background: `${color}22` }}
      />

      <div className='event-content-wrapper'>
        {/* ─── HERO SECTION - Full Width ────────────────────── */}
        <section className='event-hero-section'>
          <div className='event-hero-glass'>
            <div className='event-hero-content'>
              <div className='event-hero-icon' style={{ color }}>
                <i className={`ti ${icon}`} />
              </div>
              <h1 className='event-hero-title' style={{ color }}>
                {title}
              </h1>
              <h2 className='event-hero-subtitle'>
                {config.displayName || config.title}
              </h2>
              <p className='event-hero-description'>{config.description}</p>
              <div className='event-hero-facts'>
                <div className='hero-fact'>
                  <span className='hero-fact-label'>Date</span>
                  <span className='hero-fact-value'>{tryoutDatesDisplay}</span>
                </div>
                <div className='hero-fact'>
                  <span className='hero-fact-label'>Time</span>
                  <span className='hero-fact-value'>
                    {config.startTime} – {config.endTime}
                  </span>
                </div>
                <div className='hero-fact'>
                  <span className='hero-fact-label'>Location</span>
                  <span className='hero-fact-value'>{locationDisplay}</span>
                </div>
                {config.grades && (
                  <div className='hero-fact'>
                    <span className='hero-fact-label'>Grades</span>
                    <span className='hero-fact-value'>{config.grades}</span>
                  </div>
                )}
                {config.gender && (
                  <div className='hero-fact'>
                    <span className='hero-fact-label'>Gender</span>
                    <span className='hero-fact-value'>{config.gender}</span>
                  </div>
                )}
                <div className='hero-fact'>
                  <span className='hero-fact-label'>Status</span>
                  <span
                    className='hero-fact-value'
                    style={{
                      color: config.registrationOpen ? '#4ade80' : '#fbbf24',
                    }}
                  >
                    {config.registrationOpen
                      ? '✅ Registration Open'
                      : '📋 Coming Soon'}
                  </span>
                </div>
                {config.registrationOpen && tryoutFee > 0 && (
                  <div className='hero-fact hero-fact-price'>
                    <span className='hero-fact-label'>Registration Fee</span>
                    <span className='hero-fact-value price-amount'>
                      ${tryoutFee}
                    </span>
                  </div>
                )}
                {config.registrationDeadline && (
                  <div className='hero-fact'>
                    <span className='hero-fact-label'>
                      Registration Deadline
                    </span>
                    <span className='hero-fact-value'>
                      {config.registrationDeadline}
                    </span>
                  </div>
                )}
                {config.insuranceRequired && (
                  <div className='hero-fact'>
                    <span className='hero-fact-label'>Insurance</span>
                    <span
                      className='hero-fact-value'
                      style={{ color: '#fbbf24' }}
                    >
                      Required
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── MAIN SECTION - Image Left | Form Right ──────── */}
        <section className='event-main-section'>
          <div className='event-main-grid'>
            {/* Left - Image */}
            <div className='event-image-wrapper'>
              <div className='event-image-container'>
                <img
                  src='/assets/img/theme/player_1.png'
                  alt={`${title} - Bothell Select`}
                  className='event-image'
                />
              </div>
            </div>

            {/* Right - Registration Form */}
            <div className='event-form-wrapper'>
              <div className='event-form-glass'>
                {config.registrationOpen && eventConfig ? (
                  <>
                    <div className='event-form-header'>
                      <div
                        className='event-form-header-icon'
                        style={{
                          background: `${color}33`,
                          borderColor: `${color}66`,
                        }}
                      >
                        <i className={`ti ${icon}`} style={{ color }} />
                      </div>
                      <h3 className='event-form-title'>Secure Your Spot</h3>
                      <p className='event-form-subtitle'>
                        Complete the form below to register for{' '}
                        {config.displayName || config.title}.
                      </p>

                      {/* Tryout Fee - Using the helper */}
                      {tryoutFee > 0 && (
                        <p
                          className='event-form-price'
                          style={{
                            color: '#4ade80',
                            fontWeight: '600',
                            marginTop: '8px',
                          }}
                        >
                          Tryout Fee: <strong>${tryoutFee}</strong> per player
                        </p>
                      )}

                      {/* Tryout Dates - Using the helper */}
                      {tryoutDatesDisplay && tryoutDatesDisplay !== 'TBD' && (
                        <p
                          className='event-form-dates'
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            marginTop: '4px',
                          }}
                        >
                          Tryout Dates: <strong>{tryoutDatesDisplay}</strong>
                        </p>
                      )}

                      {/* Location - Using the helper */}
                      {locationDisplay && locationDisplay !== 'TBD' && (
                        <p
                          className='event-form-location'
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            marginTop: '4px',
                          }}
                        >
                          Locations: <strong>{locationDisplay}</strong>
                        </p>
                      )}

                      {/* Registration Deadline */}
                      {config.registrationDeadline && (
                        <p
                          className='event-form-deadline'
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            marginTop: '4px',
                          }}
                        >
                          Registration Deadline:{' '}
                          <strong>{config.registrationDeadline}</strong>
                        </p>
                      )}

                      {/* Insurance Required */}
                      {config.insuranceRequired && (
                        <p
                          className='event-form-insurance'
                          style={{ color: '#fbbf24', marginTop: '4px' }}
                        >
                          ⚠️ Insurance Required: Players must provide proof of
                          insurance.
                        </p>
                      )}

                      {/* Refund Policy */}
                      {config.refundPolicy && (
                        <p
                          className='event-form-refund'
                          style={{
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.85rem',
                            marginTop: '4px',
                          }}
                        >
                          {config.refundPolicy}
                        </p>
                      )}
                    </div>

                    <div className='event-registration-container'>
                      <RegistrationWizard
                        registrationType={registrationWizardType}
                        eventData={{
                          season: eventConfig.tryoutName,
                          year: eventConfig.tryoutYear,
                          eventId: config._id,
                        }}
                        seasonEvent={{
                          season: eventConfig.tryoutName,
                          year: eventConfig.tryoutYear,
                          eventId: config._id,
                          registrationOpen: true,
                        }}
                        formConfig={eventConfig}
                        onSuccess={() => {
                          console.log(
                            `🎉 ${eventType} registration successful!`,
                          );
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    </div>

                    <div className='event-form-footer'>
                      <p className='event-form-footer-text'>
                        Questions?{' '}
                        <Link to='/contact' className='event-footer-link'>
                          Contact us
                        </Link>
                      </p>
                    </div>
                  </>
                ) : (
                  // Coming Soon State
                  <div className='event-coming-soon'>
                    <div className='coming-soon-icon' style={{ color }}>
                      <i className={`ti ${icon}`} />
                    </div>
                    <h2>{title} Announced!</h2>
                    <p className='coming-soon-text'>
                      Registration for{' '}
                      <strong>{config.displayName || config.title}</strong> will
                      open soon. We're finalizing the details and can't wait to
                      see you there.
                    </p>
                    <div className='coming-soon-details'>
                      <div className='coming-soon-detail'>
                        <span className='detail-label'>Date</span>
                        <span className='detail-value'>
                          {tryoutDatesDisplay}
                        </span>
                      </div>
                      <div className='coming-soon-detail'>
                        <span className='detail-label'>Location</span>
                        <span className='detail-value'>{locationDisplay}</span>
                      </div>
                      {config.grades && (
                        <div className='coming-soon-detail'>
                          <span className='detail-label'>Grades</span>
                          <span className='detail-value'>{config.grades}</span>
                        </div>
                      )}
                    </div>

                    <div className='coming-soon-notify'>
                      <p className='notify-text'>
                        <i className='ti ti-bell-ringing'></i>
                        Get notified when registration opens:
                      </p>
                      {notificationSubmitted ? (
                        <div className='notify-success'>
                          <i className='ti ti-circle-check'></i>
                          You're on the list! We'll notify you when registration
                          opens.
                        </div>
                      ) : (
                        <form
                          onSubmit={handleNotificationSubmit}
                          className='notify-form'
                        >
                          <input
                            type='email'
                            value={emailForNotification}
                            onChange={(e) =>
                              setEmailForNotification(e.target.value)
                            }
                            placeholder='Enter your email'
                            required
                            className='notify-input'
                          />
                          <button
                            type='submit'
                            className='notify-button'
                            style={{ background: color }}
                          >
                            Notify Me
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── DETAILS SECTION - Collapsible ────────────────── */}
        <section className='event-details-section'>
          <div className='event-details-glass'>
            <div className='event-details-header' onClick={toggleDetails}>
              <div className='event-details-header-left'>
                <i className={`ti ti-info-circle`} style={{ color }} />
                <h2 className='event-details-title' style={{ color }}>
                  {title} Details
                </h2>
              </div>
              <button className='event-details-toggle' style={{ color }}>
                <i
                  className={`ti ${detailsExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                />
                <span>{detailsExpanded ? 'Hide Details' : 'Show Details'}</span>
              </button>
            </div>

            <div
              className={`event-details-body ${detailsExpanded ? 'expanded' : ''}`}
            >
              <div className='event-details-content'>
                <div className='details-grid'>
                  {config.whatToBring && config.whatToBring.length > 0 && (
                    <div className='details-card'>
                      <h3 className='details-card-title' style={{ color }}>
                        <i className='ti ti-backpack' /> What to Bring
                      </h3>
                      <ul className='details-list'>
                        {config.whatToBring.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {config.whatToExpect && (
                    <div className='details-card'>
                      <h3 className='details-card-title' style={{ color }}>
                        <i className='ti ti-eye' /> What to Expect
                      </h3>
                      <p className='details-text'>{config.whatToExpect}</p>
                    </div>
                  )}

                  <div className='details-card'>
                    <h3 className='details-card-title' style={{ color }}>
                      <i className='ti ti-users' /> Who Can Participate
                    </h3>
                    <ul className='details-list'>
                      {config.gender && <li>{config.gender}</li>}
                      {config.grades && <li>Grades: {config.grades}</li>}
                      <li>All skill levels welcome</li>
                    </ul>
                  </div>

                  <div className='details-card'>
                    <h3 className='details-card-title' style={{ color }}>
                      <i className='ti ti-map-pin' /> Location
                    </h3>
                    <p className='details-text'>
                      {locationDisplay !== 'TBD'
                        ? locationDisplay
                        : 'Location TBD'}
                    </p>
                    <p className='details-note'>
                      Arrive 30 minutes early for check-in.
                    </p>
                  </div>
                </div>

                {config.importantNotes && config.importantNotes.length > 0 && (
                  <div className='important-notes'>
                    <h3 className='important-notes-title' style={{ color }}>
                      <i className='ti ti-alert-circle' /> Important Notes
                    </h3>
                    <ul className='important-notes-list'>
                      {config.importantNotes.map((note, index) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── UTM Debug (Development Only) ──────────────────── */}
        {process.env.NODE_ENV === 'development' && (
          <div className='event-debug'>
            <strong>UTM debug</strong>
            <pre>{JSON.stringify(getMarketingAttribution(), null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventPage;
