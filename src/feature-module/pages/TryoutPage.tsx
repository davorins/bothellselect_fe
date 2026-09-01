import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RegistrationWizard from '../components/registration/RegistrationWizard';
import { TryoutSpecificConfig } from '../../types/registration-types';
import './TryoutPage.css';

interface TryoutEvent {
  _id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  price: number;
  category: string;
  formId?: string;
  school?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  backgroundColor?: string;
  isActive?: boolean;
  registrationOpen?: boolean; // New field to control if registration is open
}

interface FormConfig {
  _id: string;
  fields: any[];
  requiresPayment: boolean;
  pricing: {
    basePrice: number;
    packages: any[];
  };
  isActive: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TryoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<TryoutEvent | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tryoutConfig, setTryoutConfig] = useState<TryoutSpecificConfig | null>(
    null,
  );
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [emailForNotification, setEmailForNotification] = useState('');
  const [notificationSubmitted, setNotificationSubmitted] = useState(false);

  const { getMarketingAttribution } = useMarketing();

  useEffect(() => {
    fetchActiveTryout();
  }, []);

  useEffect(() => {
    const utmData = getMarketingAttribution();
    if (utmData.source !== 'direct') {
      console.log('📊 UTM Data captured:', utmData);
    }
  }, [searchParams, getMarketingAttribution]);

  // Helper to convert tryout event to TryoutSpecificConfig
  const convertToTryoutConfig = (
    event: TryoutEvent,
    formConfig: FormConfig | null,
  ): TryoutSpecificConfig => {
    const tryoutName = event.title || 'Tryout';
    const tryoutYear =
      new Date(event.start).getFullYear() || new Date().getFullYear();

    return {
      tryoutName: tryoutName,
      tryoutYear: tryoutYear,
      displayName: tryoutName,
      registrationDeadline: '',
      tryoutDates: [event.start],
      locations: event.school
        ? [
            {
              name: event.school.name,
              address: event.school.address,
              city: event.school.city,
              state: event.school.state,
              zipCode: event.school.zip,
            },
          ]
        : [],
      divisions: [],
      ageGroups: [],
      requiresPayment: formConfig?.requiresPayment ?? true,
      requiresRoster: false,
      requiresInsurance: true,
      paymentDeadline: '',
      refundPolicy: 'No refunds after tryout registration deadline',
      tryoutFee: event.price || 50,
      isActive: isRegistrationOpen, // Use the state variable
      description: event.description || '',
      eventId: event._id,
    };
  };

  const fetchActiveTryout = async () => {
    try {
      setLoading(true);

      // Fetch active tryout events
      const eventsResponse = await axios.get(
        `${API_BASE_URL}/events?category=tryout`,
      );
      const now = new Date();
      const activeTryout = eventsResponse.data
        .filter((e: any) => e.isActive !== false)
        .sort(
          (a: any, b: any) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        .find(
          (e: any) =>
            new Date(e.start) > now ||
            new Date(e.start).toDateString() === now.toDateString(),
        );

      if (!activeTryout) {
        setError('No active tryouts available');
        setLoading(false);
        return;
      }

      setEvent(activeTryout);

      // Check if registration is open
      // You can control this via a flag in the event or by checking if formId exists and is active
      const isOpen = activeTryout.registrationOpen === true;
      setIsRegistrationOpen(isOpen);

      // Fetch form config for this event (only if registration is open)
      let config = null;
      if (isOpen && activeTryout.formId) {
        try {
          const formResponse = await axios.get(
            `${API_BASE_URL}/events/forms/${activeTryout.formId}`,
          );
          config = formResponse.data;
          setFormConfig(config);
        } catch (formErr) {
          console.warn('No form config found for this event');
        }
      }

      // Create tryout config - only active if registration is open
      const tryoutConfigData = convertToTryoutConfig(activeTryout, config);
      tryoutConfigData.isActive = isOpen;
      setTryoutConfig(tryoutConfigData);

      console.log('🎯 Tryout config loaded:', {
        tryoutName: tryoutConfigData.tryoutName,
        isActive: tryoutConfigData.isActive,
        hasFormConfig: !!config,
        registrationOpen: isOpen,
      });
    } catch (err) {
      console.error('Error fetching tryout:', err);
      setError('Failed to load tryout information');
    } finally {
      setLoading(false);
    }
  };

  // Handle email notification signup
  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForNotification) return;

    try {
      // You can implement this endpoint to collect emails
      // For now, we'll just show success
      setNotificationSubmitted(true);
      console.log('📧 Email collected for notification:', emailForNotification);

      // Optionally, send to backend
      // await axios.post(`${API_BASE_URL}/tryout/notify`, { email: emailForNotification });
    } catch (error) {
      console.error('Error submitting notification email:', error);
    }
  };

  if (loading) {
    return (
      <div className='tryout-root'>
        <div className='tryout-wrap'>
          <div className='tryout-status'>
            <LoadingSpinner />
            <p>Loading tryout information…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event || !tryoutConfig) {
    return (
      <div className='tryout-root'>
        <div className='tryout-wrap'>
          <div className='tryout-status'>
            <h1 className='status-title'>No tryouts scheduled</h1>
            <p className='status-body'>
              {error || 'Check back soon for upcoming tryout dates.'}
            </p>
            <Link to='/' className='btn-primary'>
              Return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.start).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className='tryout-root'>
      <div className='tryout-glow' />

      <div className='tryout-wrap'>
        {/* ─── HERO ───────────────────────────────────────────── */}
        <section className='tryout-hero'>
          <p className='hero-meta'>Bothell Select Tryouts</p>
          <h1 className='hero-title'>{event.title}</h1>
          <p className='hero-lead'>
            {event.description ||
              'Join Bothell Select Basketball for the upcoming season.'}
          </p>

          <dl className='hero-facts'>
            <div className='fact'>
              <dt>Date</dt>
              <dd>{formattedDate}</dd>
            </div>
            <div className='fact'>
              <dt>Time</dt>
              <dd>{formattedTime}</dd>
            </div>
            <div className='fact'>
              <dt>Where</dt>
              <dd>{event.school?.name || 'Bothell High School'}</dd>
            </div>
            <div className='fact'>
              <dt>Status</dt>
              <dd>
                {isRegistrationOpen ? (
                  <span className='badge-open'>✅ Registration Open</span>
                ) : (
                  <span className='badge-coming'>📋 Coming Soon</span>
                )}
              </dd>
            </div>
          </dl>

          {!isRegistrationOpen && (
            <div className='hero-cta-container'>
              <p className='hero-cta-note'>
                Registration is coming soon! Sign up below to be notified when
                it opens.
              </p>
            </div>
          )}
        </section>

        {/* ─── DETAILS ────────────────────────────────────────── */}
        <section className='tryout-details' id='details'>
          <h2 className='details-heading'>Tryout details</h2>

          <div className='details-columns'>
            <div className='details-col'>
              <h3>What to bring</h3>
              <ul>
                <li>Basketball shoes</li>
                <li>Water bottle</li>
                <li>Athletic wear</li>
                <li>Completed waiver</li>
              </ul>
            </div>

            <div className='details-col'>
              <h3>What to expect</h3>
              <p>
                Skill demonstrations, drills, and scrimmages. Players are
                evaluated on fundamentals, athleticism, and teamwork.
              </p>
            </div>

            <div className='details-col'>
              <h3>Who can try out</h3>
              <ul>
                <li>Boys &amp; girls</li>
                <li>Grades 4–8</li>
                <li>All skill levels welcome</li>
              </ul>
            </div>

            <div className='details-col'>
              <h3>Location</h3>
              <p>
                {event.school?.name || ''}
                <br />
                {event.school?.address || ''}
                <br />
                {event.school?.city || ''}, {event.school?.state || ''}{' '}
                {event.school?.zip || ''}
              </p>
              <p className='details-note'>
                Arrive 30 minutes early for check-in.
              </p>
            </div>
          </div>
        </section>

        {/* ─── REGISTRATION ───────────────────────────────────── */}
        <section className='tryout-registration' id='registration'>
          {isRegistrationOpen ? (
            // Phase 2: Registration is OPEN - Show full form
            <>
              <div className='registration-heading'>
                <h2>Secure your spot</h2>
                <p>Complete the form below to register for tryouts.</p>
              </div>

              <div className='registration-container'>
                <RegistrationWizard
                  registrationType='tryout'
                  eventData={{
                    season: tryoutConfig.tryoutName,
                    year: tryoutConfig.tryoutYear,
                    eventId: event._id,
                    tryoutId: event._id,
                  }}
                  seasonEvent={{
                    season: tryoutConfig.tryoutName,
                    year: tryoutConfig.tryoutYear,
                    eventId: event._id,
                    registrationOpen: true,
                  }}
                  formConfig={tryoutConfig}
                  onSuccess={() => {
                    console.log('🎉 Tryout registration successful!');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </>
          ) : (
            // Phase 1: Registration is CLOSED - Show "Coming Soon" with email notification
            <div className='registration-coming-soon'>
              <div className='coming-soon-card'>
                <div className='coming-soon-icon'>🏀</div>
                <h2>Tryouts Announced!</h2>
                <p className='coming-soon-text'>
                  Registration for the <strong>{event.title}</strong> tryouts
                  will open soon. We're finalizing the details and can't wait to
                  see you there.
                </p>
                <div className='coming-soon-details'>
                  <div className='coming-soon-detail'>
                    <span className='detail-label'>Date</span>
                    <span className='detail-value'>{formattedDate}</span>
                  </div>
                  <div className='coming-soon-detail'>
                    <span className='detail-label'>Location</span>
                    <span className='detail-value'>
                      {event.school?.name || 'Bothell High School'}
                    </span>
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
                      <button type='submit' className='notify-button'>
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
          <div className='tryout-debug'>
            <strong>UTM debug</strong>
            <pre>{JSON.stringify(getMarketingAttribution(), null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TryoutPage;
