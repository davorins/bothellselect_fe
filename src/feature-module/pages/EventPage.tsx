import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RegistrationWizard from '../components/registration/RegistrationWizard';
import { TryoutSpecificConfig } from '../../types/registration-types';
import { formatDate } from '../../utils/dateFormatter';
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
      <div className='event-root'>
        <div className='event-wrap'>
          <div className='event-status'>
            <LoadingSpinner />
            <p>Loading {title} information…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className='event-root'>
        <div className='event-wrap'>
          <div className='event-status'>
            <h1 className='status-title'>No {title} scheduled</h1>
            <p className='status-body'>
              {error || `Check back soon for upcoming ${title}.`}
            </p>
            <Link to='/' className='btn-primary'>
              Return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = formatDate(config.startDate);

  return (
    <div className={`event-root event-root--${eventType}`}>
      <div
        className='event-glow'
        style={{
          background: `radial-gradient(circle, ${color}18, transparent 70%)`,
        }}
      />

      <div className='event-wrap'>
        {/* ─── HERO ───────────────────────────────────────────── */}
        <section className='event-hero'>
          <div className='hero-icon' style={{ color }}>
            <i className={`ti ${icon}`} />
          </div>
          <p className='hero-meta' style={{ color }}>
            {title}
          </p>
          <h1 className='hero-title'>{config.title}</h1>
          <p className='hero-lead'>{config.description}</p>

          <dl className='hero-facts'>
            <div className='fact'>
              <dt>Date</dt>
              <dd>{formattedDate}</dd>
            </div>
            <div className='fact'>
              <dt>Time</dt>
              <dd>
                {config.startTime} – {config.endTime}
              </dd>
            </div>
            <div className='fact'>
              <dt>Where</dt>
              <dd>{config.location.name}</dd>
            </div>
            {config.grades && (
              <div className='fact'>
                <dt>Grades</dt>
                <dd>{config.grades}</dd>
              </div>
            )}
            {config.gender && (
              <div className='fact'>
                <dt>Gender</dt>
                <dd>{config.gender}</dd>
              </div>
            )}
            <div className='fact'>
              <dt>Status</dt>
              <dd>
                {config.registrationOpen ? (
                  <span className='badge-open'>✅ Registration Open</span>
                ) : (
                  <span className='badge-coming'>📋 Coming Soon</span>
                )}
              </dd>
            </div>
          </dl>

          {!config.registrationOpen && (
            <div className='hero-cta-container'>
              <p className='hero-cta-note'>
                Registration is coming soon! Sign up below to be notified when
                it opens.
              </p>
            </div>
          )}
        </section>

        {/* ─── DETAILS ────────────────────────────────────────── */}
        <section className='event-details' id='details'>
          <h2 className='details-heading'>{title} details</h2>

          <div className='details-columns'>
            {config.whatToBring && config.whatToBring.length > 0 && (
              <div className='details-col'>
                <h3>What to bring</h3>
                <ul>
                  {config.whatToBring.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {config.whatToExpect && (
              <div className='details-col'>
                <h3>What to expect</h3>
                <p>{config.whatToExpect}</p>
              </div>
            )}

            <div className='details-col'>
              <h3>Who can participate</h3>
              <ul>
                {config.gender && <li>{config.gender}</li>}
                {config.grades && <li>{config.grades}</li>}
                <li>All skill levels welcome</li>
              </ul>
            </div>

            <div className='details-col'>
              <h3>Location</h3>
              <p>
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
              <h3>Important Notes</h3>
              <ul>
                {config.importantNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ─── REGISTRATION ───────────────────────────────────── */}
        <section className='event-registration' id='registration'>
          {config.registrationOpen && eventConfig ? (
            <>
              <div className='registration-heading'>
                <h2>Secure your spot</h2>
                <p>Complete the form below to register.</p>
              </div>

              <div className='registration-container'>
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
            </>
          ) : (
            <div className='registration-coming-soon'>
              <div className='coming-soon-card'>
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
                    <span className='detail-value'>{config.location.name}</span>
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

                <p className='coming-soon-footer'>
                  Follow us on social media for updates!
                </p>
              </div>
            </div>
          )}
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
