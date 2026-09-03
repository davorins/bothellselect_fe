// feature-module/pages/EventPage.tsx - Bothell Select
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TryoutRegistrationForm from '../components/registration/TryoutRegistrationForm';
import TrainingRegistrationForm from '../components/registration/TrainingRegistrationForm';
import TournamentRegistrationForm from '../components/registration/TournamentRegistrationForm';
import { formatDate } from '../../utils/dateFormatter';
import ReactPixel from 'react-facebook-pixel';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
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
  tryoutDetails?: any;
  trainingDetails?: any;
  tournamentDetails?: any;
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
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const { getMarketingAttribution } = useMarketing();

  // ─── Helper Functions ─────────────────────────────────────

  const getLocationFromConfig = (config: any): string => {
    if (!config) return 'TBD';

    if (config.tryoutDetails?.tryoutSessions?.length > 0) {
      const session = config.tryoutDetails.tryoutSessions[0];
      if (session?.location?.name?.trim()) {
        return session.location.name;
      }
    }
    if (config.tryoutDetails?.location?.name?.trim()) {
      return config.tryoutDetails.location.name;
    }
    if (config.location?.name?.trim()) {
      return config.location.name;
    }
    return 'TBD';
  };

  const getDatesFromConfig = (config: any): string => {
    if (!config) return 'TBD';

    if (config.tryoutDetails?.tryoutSessions?.length > 0) {
      const dates = config.tryoutDetails.tryoutSessions
        .filter((s: any) => s.date)
        .map((s: any) => s.date);
      if (dates.length > 0) return dates.join(', ');
    }
    if (config.tryoutDetails?.startDate) return config.tryoutDetails.startDate;
    if (config.startDate) return formatDate(config.startDate);
    return 'TBD';
  };

  const getFeeFromConfig = (config: any): number => {
    if (!config) return 0;
    if (config.tryoutDetails?.tryoutFee > 0)
      return config.tryoutDetails.tryoutFee;
    if (config.tryoutFee > 0) return config.tryoutFee;
    if (config.price > 0) return config.price;
    return 0;
  };

  // ─── Build Registration Config ────────────────────────────

  const buildRegistrationConfig = (): any => {
    if (!config) return null;

    const base = {
      displayName: config.displayName || config.title,
      registrationDeadline: config.registrationDeadline || '',
      requiresInsurance: config.insuranceRequired || false,
      refundPolicy:
        config.refundPolicy || 'No refunds after registration deadline',
      isActive: config.registrationOpen,
      description: config.description || '',
      eventId: config._id,
      ageGroups: config.ageGroups || [],
    };

    if (eventType === 'tryout') {
      return {
        ...base,
        tryoutName: config.tryoutName || config.title,
        tryoutYear:
          config.tryoutYear || new Date(config.startDate).getFullYear(),
        tryoutDates: [config.startDate],
        locations: config.location?.name?.trim() ? [config.location.name] : [],
        divisions: [],
        requiresPayment: (config.tryoutFee || config.price || 0) > 0,
        requiresRoster: false,
        paymentDeadline: '',
        tryoutFee: config.tryoutFee || config.price || 0,
        tryoutDetails: config.tryoutDetails || null,
      };
    }

    if (eventType === 'training') {
      return {
        ...base,
        season: config.title,
        year: new Date(config.startDate).getFullYear(),
        requiresPayment: (config.price || 0) > 0,
        requiresQualification: false,
        pricing: {
          basePrice: config.price || 75,
          packages: [],
        },
        trainingDetails: config.trainingDetails || null,
      };
    }

    if (eventType === 'tournament') {
      return {
        ...base,
        tournamentName: config.title,
        tournamentYear: new Date(config.startDate).getFullYear(),
        tournamentDates: [config.startDate],
        locations: config.location?.name?.trim() ? [config.location.name] : [],
        divisions: ['Gold', 'Silver'],
        requiresRoster: true,
        paymentDeadline: '',
        tournamentFee: config.price || 425,
        tournamentDetails: config.tournamentDetails || null,
      };
    }

    return null;
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

      const response = await axios.get(
        `${API_BASE_URL}/event-config/public/${eventType}`,
      );

      if (!response.data.success || !response.data.config) {
        setError(`No ${eventType} configuration found`);
        setLoading(false);
        return;
      }

      const configData = response.data.config;
      configData.eventType = eventType;

      // Try to fetch full config with details
      if (eventType === 'tryout') {
        try {
          const fullResponse = await axios.get(
            `${API_BASE_URL}/admin/tryout-configs`,
          );
          const activeConfig = Array.isArray(fullResponse.data)
            ? fullResponse.data.find((c: any) => c.isActive)
            : null;

          if (activeConfig?.tryoutDetails) {
            configData.tryoutDetails = activeConfig.tryoutDetails;
            configData.tryoutFee =
              activeConfig.tryoutFee || configData.tryoutFee;
            configData.tryoutName = activeConfig.tryoutName || configData.title;
            configData.tryoutYear =
              activeConfig.tryoutYear ||
              new Date(configData.startDate).getFullYear();
            configData.registrationDeadline =
              activeConfig.registrationDeadline ||
              configData.registrationDeadline;
            configData.requiresInsurance =
              activeConfig.requiresInsurance || false;
            configData.refundPolicy =
              activeConfig.refundPolicy || configData.refundPolicy;

            if (
              !configData.location?.name &&
              configData.tryoutDetails?.tryoutSessions?.length > 0
            ) {
              const session = configData.tryoutDetails.tryoutSessions[0];
              if (session?.location?.name) {
                configData.location = {
                  name: session.location.name,
                  address: session.location.address || '',
                  city: session.location.city || '',
                  state: session.location.state || '',
                  zip: session.location.zipCode || '',
                };
              }
            }
          }
        } catch (e) {
          console.log('ℹ️ Could not fetch full tryout config');
        }
      }

      if (eventType === 'training') {
        try {
          const fullResponse = await axios.get(
            `${API_BASE_URL}/admin/form-configs`,
          );
          const configs = Array.isArray(fullResponse.data)
            ? fullResponse.data
            : Object.values(fullResponse.data || {});
          const activeConfig = configs.find(
            (c: any) => c.isActive && c.trainingDetails,
          );
          if (activeConfig)
            configData.trainingDetails = activeConfig.trainingDetails;
        } catch (e) {
          console.log('ℹ️ Could not fetch full training config');
        }
      }

      if (eventType === 'tournament') {
        try {
          const fullResponse = await axios.get(
            `${API_BASE_URL}/admin/tournament-configs`,
          );
          const activeConfig = Array.isArray(fullResponse.data)
            ? fullResponse.data.find((c: any) => c.isActive)
            : null;
          if (activeConfig?.tournamentDetails) {
            configData.tournamentDetails = activeConfig.tournamentDetails;
          }
        } catch (e) {
          console.log('ℹ️ Could not fetch full tournament config');
        }
      }

      setConfig(configData);
    } catch (err) {
      console.error(`Error fetching ${eventType} config:`, err);
      setError(`Failed to load ${eventType} information`);
    } finally {
      setLoading(false);
    }
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
    } catch (error) {
      console.error('Error submitting notification email:', error);
    }
  };

  const toggleDetails = () => setDetailsExpanded(!detailsExpanded);

  if (loading) {
    return (
      <div className='event-page-container'>
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

  const fee = getFeeFromConfig(config);
  const locationDisplay = getLocationFromConfig(config);
  const datesDisplay = getDatesFromConfig(config);
  const registrationConfig = buildRegistrationConfig();

  const renderRegistrationForm = () => {
    if (!config.registrationOpen || !registrationConfig) {
      return (
        <div className='event-coming-soon'>
          <div className='coming-soon-icon' style={{ color }}>
            <i className={`ti ${icon}`} />
          </div>
          <h2>{title} Announced!</h2>
          <p className='coming-soon-text'>
            Registration for{' '}
            <strong>{config.displayName || config.title}</strong> will open
            soon.
          </p>
          <div className='coming-soon-details'>
            <div className='coming-soon-detail'>
              <span className='detail-label'>Date</span>
              <span className='detail-value'>{datesDisplay}</span>
            </div>
            <div className='coming-soon-detail'>
              <span className='detail-label'>Location</span>
              <span className='detail-value'>{locationDisplay}</span>
            </div>
          </div>
          <div className='coming-soon-notify'>
            <p className='notify-text'>
              <i className='ti ti-bell-ringing'></i> Get notified when
              registration opens:
            </p>
            {notificationSubmitted ? (
              <div className='notify-success'>
                <i className='ti ti-circle-check'></i> You're on the list!
              </div>
            ) : (
              <form onSubmit={handleNotificationSubmit} className='notify-form'>
                <input
                  type='email'
                  value={emailForNotification}
                  onChange={(e) => setEmailForNotification(e.target.value)}
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
      );
    }

    const FormComponent = {
      tryout: TryoutRegistrationForm,
      training: TrainingRegistrationForm,
      tournament: TournamentRegistrationForm,
    }[eventType];

    return (
      <>
        <div className='event-registration-container'>
          <FormComponent
            {...(eventType === 'tryout' && {
              tryoutConfig: registrationConfig,
            })}
            {...(eventType === 'training' && {
              formConfig: registrationConfig,
            })}
            {...(eventType === 'tournament' && {
              tournamentConfig: registrationConfig,
            })}
            seasonEvent={{
              season:
                registrationConfig.tryoutName ||
                registrationConfig.season ||
                registrationConfig.tournamentName ||
                config.title,
              year:
                registrationConfig.tryoutYear ||
                registrationConfig.year ||
                new Date(config.startDate).getFullYear(),
              eventId: config._id,
            }}
            onSuccess={() => {
              console.log(`🎉 ${eventType} registration successful!`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
        <div className='event-form-footer'>
          <p className='event-form-footer-text'>
            Questions?{' '}
            <Link to='/contact-us' className='event-footer-link'>
              Contact us
            </Link>
          </p>
        </div>
      </>
    );
  };

  return (
    <div className='event-page-container'>
      <div className='event-bg-gradient' />

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
        {/* ─── HERO SECTION ──────────────────────────────── */}
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
                  <span className='hero-fact-value'>{datesDisplay}</span>
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
                {config.registrationOpen && fee > 0 && (
                  <div className='hero-fact hero-fact-price'>
                    <span className='hero-fact-label'>Registration Fee</span>
                    <span className='hero-fact-value price-amount'>${fee}</span>
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

        {/* ─── MAIN SECTION ────────────────────────────────── */}
        <section className='event-main-section'>
          <div className='event-main-grid'>
            {/* Left - Image (hidden on mobile) */}
            <div className='event-image-wrapper'>
              <div className='event-image-glass'>
                <div className='event-image-container'>
                  <ImageWithBasePath
                    src='assets/img/theme/player_1.png'
                    alt={`${title} - Bothell Select`}
                    className='event-image'
                  />
                </div>
              </div>
            </div>

            {/* Right - Registration Form */}
            <div className='event-form-wrapper'>
              <div className='event-form-glass'>{renderRegistrationForm()}</div>
            </div>
          </div>
        </section>

        {/* ─── DETAILS SECTION ─────────────────────────────── */}
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
                  {config.whatToBring?.length > 0 && (
                    <div className='details-card'>
                      <h3 className='details-card-title' style={{ color }}>
                        <i className='ti ti-backpack' /> What to Bring
                      </h3>
                      <ul className='details-list'>
                        {config.whatToBring.map((item, i) => (
                          <li key={i}>{item}</li>
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

                {config.importantNotes?.length > 0 && (
                  <div className='important-notes'>
                    <h3 className='important-notes-title' style={{ color }}>
                      <i className='ti ti-alert-circle' /> Important Notes
                    </h3>
                    <ul className='important-notes-list'>
                      {config.importantNotes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── UTM Debug ────────────────────────────────────── */}
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
