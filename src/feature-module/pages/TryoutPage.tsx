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
      registrationDeadline: '', // Can be configured separately
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
      isActive: true, // ALWAYS active for the public page
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

      // Fetch form config for this event
      let config = null;
      if (activeTryout.formId) {
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

      // Create tryout config - ALWAYS set isActive to true for the public page
      const tryoutConfigData = convertToTryoutConfig(activeTryout, config);
      tryoutConfigData.isActive = true;
      setTryoutConfig(tryoutConfigData);

      console.log('🎯 Tryout config loaded (forced active):', {
        tryoutName: tryoutConfigData.tryoutName,
        isActive: tryoutConfigData.isActive,
        hasFormConfig: !!config,
      });
    } catch (err) {
      console.error('Error fetching tryout:', err);
      setError('Failed to load tryout information');
    } finally {
      setLoading(false);
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
          </dl>

          <a href='#registration' className='hero-cta'>
            Register for tryouts
          </a>
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
                <li>Grades 3–8</li>
                <li>All skill levels welcome</li>
              </ul>
            </div>

            <div className='details-col'>
              <h3>Location</h3>
              <p>
                {event.school?.name || 'Bothell High School'}
                <br />
                {event.school?.address || '18100 92nd Ave NE'}
                <br />
                {event.school?.city || 'Bothell'}, {event.school?.state || 'WA'}{' '}
                {event.school?.zip || '98011'}
              </p>
              <p className='details-note'>
                Arrive 30 minutes early for check-in.
              </p>
            </div>
          </div>
        </section>

        {/* ─── REGISTRATION ───────────────────────────────────── */}
        <section className='tryout-registration' id='registration'>
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
