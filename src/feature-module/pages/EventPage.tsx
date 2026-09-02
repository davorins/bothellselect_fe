import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RegistrationWizard from '../components/registration/RegistrationWizard';
import { TryoutSpecificConfig } from '../../types/registration-types';
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

  const { getMarketingAttribution } = useMarketing();

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

      const response = await axios.get(
        `${API_BASE_URL}/event-config/public/${eventType}`,
      );

      if (!response.data.success || !response.data.config) {
        setError(`No ${eventType} configuration found`);
        setLoading(false);
        return;
      }

      const configData = response.data.config;
      setConfig(configData);

      const wizardConfig = convertToWizardConfig(configData);
      wizardConfig.isActive = configData.registrationOpen;
      setEventConfig(wizardConfig);

      console.log(`🎯 ${eventType} config loaded:`, {
        title: configData.title,
        registrationOpen: configData.registrationOpen,
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
      tryoutName: config.title,
      tryoutYear: new Date(config.startDate).getFullYear(),
      displayName: config.title,
      registrationDeadline: '',
      tryoutDates: [config.startDate],
      locations: [
        {
          name: config.location.name,
          address: config.location.address,
          city: config.location.city,
          state: config.location.state,
          zipCode: config.location.zip,
        },
      ],
      divisions: [],
      ageGroups: config.ageGroups || [],
      requiresPayment: config.price > 0,
      requiresRoster: false,
      requiresInsurance: true,
      paymentDeadline: '',
      refundPolicy: 'No refunds after registration deadline',
      tryoutFee: config.price || 0,
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
        <div className='event-grid'>
          {/* Left side - Event Illustration with Glassmorphism */}
          <div className='event-illustration-wrapper'>
            <div className='event-illustration-glass'>
              <div className='event-illustration-inner'>
                <div className='event-illustration-icon' style={{ color }}>
                  <i className={`ti ${icon}`} />
                </div>
                <h2 className='event-illustration-title' style={{ color }}>
                  {title}
                </h2>
                <div className='event-illustration-facts'>
                  <div className='event-fact'>
                    <span className='fact-label'>Date</span>
                    <span className='fact-value'>{formattedDate}</span>
                  </div>
                  <div className='event-fact'>
                    <span className='fact-label'>Time</span>
                    <span className='fact-value'>
                      {config.startTime} – {config.endTime}
                    </span>
                  </div>
                  <div className='event-fact'>
                    <span className='fact-label'>Location</span>
                    <span className='fact-value'>{config.location.name}</span>
                  </div>
                  {config.grades && (
                    <div className='event-fact'>
                      <span className='fact-label'>Grades</span>
                      <span className='fact-value'>{config.grades}</span>
                    </div>
                  )}
                  {config.gender && (
                    <div className='event-fact'>
                      <span className='fact-label'>Gender</span>
                      <span className='fact-value'>{config.gender}</span>
                    </div>
                  )}
                  <div className='event-fact'>
                    <span className='fact-label'>Status</span>
                    <span
                      className='fact-value'
                      style={{
                        color: config.registrationOpen ? '#4ade80' : '#fbbf24',
                      }}
                    >
                      {config.registrationOpen
                        ? '✅ Registration Open'
                        : '📋 Coming Soon'}
                    </span>
                  </div>
                </div>
                {config.registrationOpen && config.price > 0 && (
                  <div className='event-illustration-price'>
                    <span className='price-label'>Registration Fee</span>
                    <span className='price-value'>${config.price}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Registration Form */}
          <div className='event-form-wrapper'>
            <div className='event-form-glass'>
              {config.registrationOpen && eventConfig ? (
                <>
                  <div className='event-header'>
                    <div
                      className='event-header-icon'
                      style={{
                        background: `${color}33`,
                        borderColor: `${color}66`,
                      }}
                    >
                      <i className={`ti ${icon}`} style={{ color }} />
                    </div>
                    <h1 className='event-header-title'>Secure Your Spot</h1>
                    <p className='event-header-subtitle'>
                      Complete the form below to register for {config.title}.
                    </p>
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
                        console.log(`🎉 ${eventType} registration successful!`);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  </div>

                  <div className='event-footer'>
                    <div className='event-footer-content'>
                      <p className='event-footer-text'>
                        Questions?{' '}
                        <Link to='/contact' className='event-footer-link'>
                          Contact us
                        </Link>
                      </p>
                    </div>
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
                    Registration for <strong>{config.title}</strong> will open
                    soon. We're finalizing the details and can't wait to see you
                    there.
                  </p>
                  <div className='coming-soon-details'>
                    <div className='coming-soon-detail'>
                      <span className='detail-label'>Date</span>
                      <span className='detail-value'>{formattedDate}</span>
                    </div>
                    <div className='coming-soon-detail'>
                      <span className='detail-label'>Location</span>
                      <span className='detail-value'>
                        {config.location.name}
                      </span>
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

        {/* Details Section - Below the main grid */}
        <div className='event-details-section'>
          <div className='event-details-glass'>
            <h2 className='details-heading' style={{ color }}>
              {title} Details
            </h2>

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
                  {config.location.name}
                  {config.location.address && (
                    <>
                      <br />
                      {config.location.address}
                    </>
                  )}
                  {config.location.city && (
                    <>
                      <br />
                      {config.location.city}, {config.location.state}{' '}
                      {config.location.zip}
                    </>
                  )}
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

        {/* UTM Debug (Development Only) */}
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
