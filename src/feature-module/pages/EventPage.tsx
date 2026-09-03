// feature-module/pages/EventPage.tsx - Bothell Select
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TryoutRegistrationForm from '../components/registration/TryoutRegistrationForm';
import TrainingRegistrationForm from '../components/registration/TrainingRegistrationForm';
import TournamentRegistrationForm from '../components/registration/TournamentRegistrationForm';
import {
  TryoutSpecificConfig,
  RegistrationFormConfig,
  TournamentSpecificConfig,
} from '../../types/registration-types';
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

  // ─── Helper Functions ─────────────────────────────────────────────────────

  const getLocationFromConfig = (config: any): string => {
    if (!config) return 'TBD';

    if (config.tryoutDetails?.tryoutSessions?.length > 0) {
      const session = config.tryoutDetails.tryoutSessions[0];
      if (session?.location?.name && session.location.name.trim() !== '') {
        return session.location.name;
      }
    }
    if (
      config.tryoutDetails?.location?.name &&
      config.tryoutDetails.location.name.trim() !== ''
    ) {
      return config.tryoutDetails.location.name;
    }

    if (config.location?.name && config.location.name.trim() !== '') {
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
      if (dates.length > 0) {
        return dates.join(', ');
      }
    }
    if (config.tryoutDetails?.startDate) {
      return config.tryoutDetails.startDate;
    }

    if (config.startDate) {
      return formatDate(config.startDate);
    }

    return 'TBD';
  };

  const getFeeFromConfig = (config: any): number => {
    if (!config) return 0;

    if (
      config.tryoutDetails?.tryoutFee !== undefined &&
      config.tryoutDetails.tryoutFee > 0
    ) {
      return config.tryoutDetails.tryoutFee;
    }
    if (config.tryoutFee && config.tryoutFee > 0) {
      return config.tryoutFee;
    }
    if (config.price && config.price > 0) {
      return config.price;
    }

    return 0;
  };

  // ─── Build Registration Config ──────────────────────────────────────────

  const buildRegistrationConfig = (): any => {
    if (!config) return null;

    if (eventType === 'tryout') {
      return {
        tryoutName: config.tryoutName || config.title,
        tryoutYear:
          config.tryoutYear || new Date(config.startDate).getFullYear(),
        displayName: config.displayName || config.title,
        registrationDeadline: config.registrationDeadline || '',
        tryoutDates: [config.startDate],
        locations:
          config.location &&
          config.location.name &&
          config.location.name.trim() !== ''
            ? [config.location.name]
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
        tryoutDetails: config.tryoutDetails || null,
      };
    }

    if (eventType === 'training') {
      return {
        season: config.title,
        year: new Date(config.startDate).getFullYear(),
        displayName: config.displayName || config.title,
        isActive: config.registrationOpen,
        requiresPayment: (config.price || 0) > 0,
        requiresQualification: false,
        pricing: {
          basePrice: config.price || 75,
          packages: [],
        },
        description: config.description || '',
        eventId: config._id,
        registrationDeadline: config.registrationDeadline || '',
        refundPolicy:
          config.refundPolicy || 'No refunds after registration deadline',
        requiresInsurance: config.insuranceRequired || false,
        ageGroups: config.ageGroups || [],
        trainingDetails: config.trainingDetails || null,
      };
    }

    if (eventType === 'tournament') {
      return {
        tournamentName: config.title,
        tournamentYear: new Date(config.startDate).getFullYear(),
        displayName: config.displayName || config.title,
        registrationDeadline: config.registrationDeadline || '',
        tournamentDates: [config.startDate],
        locations:
          config.location &&
          config.location.name &&
          config.location.name.trim() !== ''
            ? [config.location.name]
            : [],
        divisions: ['Gold', 'Silver'],
        ageGroups: config.ageGroups || [],
        requiresRoster: true,
        requiresInsurance: config.insuranceRequired || false,
        paymentDeadline: '',
        refundPolicy:
          config.refundPolicy || 'No refunds after registration deadline',
        tournamentFee: config.price || 425,
        isActive: config.registrationOpen,
        description: config.description || '',
        eventId: config._id,
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

      // ✅ Step 1: Fetch basic event config
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

      console.log('📦 Basic event config loaded:', configData);

      if (eventType === 'tryout') {
        try {
          const fullConfigListResponse = await axios.get(
            `${API_BASE_URL}/admin/tryout-configs`,
          );

          const activeTryoutConfig = Array.isArray(fullConfigListResponse.data)
            ? fullConfigListResponse.data.find((c: any) => c.isActive)
            : null;

          if (activeTryoutConfig && activeTryoutConfig.tryoutDetails) {
            // ✅ Merge the tryoutDetails into our config
            configData.tryoutDetails = activeTryoutConfig.tryoutDetails;
            configData.tryoutFee =
              activeTryoutConfig.tryoutFee || configData.tryoutFee;
            configData.tryoutName =
              activeTryoutConfig.tryoutName || configData.title;
            configData.tryoutYear =
              activeTryoutConfig.tryoutYear ||
              new Date(configData.startDate).getFullYear();
            configData.registrationDeadline =
              activeTryoutConfig.registrationDeadline ||
              configData.registrationDeadline;
            configData.requiresInsurance =
              activeTryoutConfig.requiresInsurance || false;
            configData.refundPolicy =
              activeTryoutConfig.refundPolicy || configData.refundPolicy;

            // If location is empty in basic config, try to get it from tryoutDetails
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

            console.log('✅ Full tryout config merged:', {
              tryoutFee: configData.tryoutFee,
              hasTryoutDetails: !!configData.tryoutDetails,
              tryoutSessions:
                configData.tryoutDetails?.tryoutSessions?.length || 0,
            });
          } else {
            console.log(
              'ℹ️ No active tryout config with tryoutDetails found, using basic config',
            );
          }
        } catch (fullConfigError) {
          // This is not a critical error - we can continue with basic config
          console.log(
            'ℹ️ Could not fetch full tryout config, using basic config:',
            fullConfigError,
          );
        }
      }

      // ✅ Step 3: Try to fetch training details, matched by isActive
      // (see note above — same fix as the tryout block).
      if (eventType === 'training') {
        try {
          const fullConfigListResponse = await axios.get(
            `${API_BASE_URL}/admin/form-configs`,
          );

          const trainingConfigs = Array.isArray(fullConfigListResponse.data)
            ? fullConfigListResponse.data
            : Object.values(fullConfigListResponse.data || {});

          const activeTrainingConfig: any = trainingConfigs.find(
            (c: any) => c.isActive && c.trainingDetails,
          );

          if (activeTrainingConfig) {
            configData.trainingDetails = activeTrainingConfig.trainingDetails;
            console.log('✅ Full training config merged');
          } else {
            console.log(
              'ℹ️ No active training config with trainingDetails found, using basic config',
            );
          }
        } catch (fullConfigError) {
          console.log(
            'ℹ️ Could not fetch full training config, using basic config',
          );
        }
      }

      // ✅ Step 4: Try to fetch tournament details, matched by isActive
      // (see note above — same fix as the tryout block).
      if (eventType === 'tournament') {
        try {
          const fullConfigListResponse = await axios.get(
            `${API_BASE_URL}/admin/tournament-configs`,
          );

          const activeTournamentConfig = Array.isArray(
            fullConfigListResponse.data,
          )
            ? fullConfigListResponse.data.find((c: any) => c.isActive)
            : null;

          if (
            activeTournamentConfig &&
            activeTournamentConfig.tournamentDetails
          ) {
            configData.tournamentDetails =
              activeTournamentConfig.tournamentDetails;
            console.log('✅ Full tournament config merged');
          } else {
            console.log(
              'ℹ️ No active tournament config with tournamentDetails found, using basic config',
            );
          }
        } catch (fullConfigError) {
          console.log(
            'ℹ️ Could not fetch full tournament config, using basic config',
          );
        }
      }

      setConfig(configData);

      const fee = getFeeFromConfig(configData);
      const location = getLocationFromConfig(configData);
      const dates = getDatesFromConfig(configData);

      console.log(`🎯 ${eventType} config loaded:`, {
        title: configData.title,
        registrationOpen: configData.registrationOpen,
        fee: fee,
        registrationDeadline: configData.registrationDeadline,
        insuranceRequired: configData.insuranceRequired,
        refundPolicy: configData.refundPolicy,
        location: location,
        dates: dates,
        hasTryoutDetails: !!configData.tryoutDetails,
      });
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

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForNotification)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      // ✅ Send notification request to backend
      await axios.post(`${API_BASE_URL}/event-config/notify`, {
        email: emailForNotification,
        eventType: eventType,
        eventId: config?._id,
        eventName:
          config?.displayName || config?.title || 'Bothell Select Tryouts',
        eventDate: datesDisplay,
        eventLocation: locationDisplay,
      });

      setNotificationSubmitted(true);
      console.log(
        `✅ Notification request submitted for: ${emailForNotification}`,
      );
    } catch (error) {
      console.error('Error submitting notification request:', error);
      // ✅ User-friendly error message
      alert(
        'Unable to submit notification request. Please try again later or contact us directly at bothellselect@proton.me.',
      );
    }
  };

  const toggleDetails = () => {
    setDetailsExpanded(!detailsExpanded);
  };

  if (loading) {
    return (
      <div className='event-page-container'>
        <LoadingSpinner />
        <p>Loading {title} information…</p>
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
          <div className='event-hero-content'>
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
                    : 'Coming Soon'}
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
        </section>

        {/* ─── Image Left | Form Right ──────── */}
        <section className='event-main-section'>
          <div className='event-main-grid'>
            {/* Left - Image */}
            <div className='contact-image-wrapper'>
              <div className='contact-image-glass'>
                <div className='contact-image-container'>
                  <ImageWithBasePath
                    src='assets/img/bg/bg_login.png'
                    alt='Contact Illustration'
                    className='contact-illustration-img'
                  />
                </div>
              </div>
            </div>

            {/* Right - Registration Form */}
            <div className='event-form-wrapper'>
              <div className='event-form-glass'>
                {config.registrationOpen && registrationConfig ? (
                  <>
                    <div className='event-registration-container'>
                      {/* ✅ Use specific forms directly (same as home page) */}
                      {eventType === 'tryout' && (
                        <TryoutRegistrationForm
                          tryoutConfig={registrationConfig}
                          seasonEvent={{
                            season: registrationConfig.tryoutName,
                            year: registrationConfig.tryoutYear,
                            eventId: config._id,
                          }}
                          onSuccess={() => {
                            console.log(
                              `🎉 ${eventType} registration successful!`,
                            );
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      )}
                      {eventType === 'training' && (
                        <TrainingRegistrationForm
                          formConfig={registrationConfig}
                          seasonEvent={{
                            season: config.title,
                            year: new Date(config.startDate).getFullYear(),
                            eventId: config._id,
                          }}
                          onSuccess={() => {
                            console.log(
                              `🎉 ${eventType} registration successful!`,
                            );
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      )}
                      {eventType === 'tournament' && (
                        <TournamentRegistrationForm
                          tournamentConfig={registrationConfig}
                          seasonEvent={{
                            season: config.title,
                            year: new Date(config.startDate).getFullYear(),
                            eventId: config._id,
                          }}
                          onSuccess={() => {
                            console.log(
                              `🎉 ${eventType} registration successful!`,
                            );
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        />
                      )}
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
                      open soon.
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
