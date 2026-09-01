import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import RegistrationHub from '../components/registration/RegistrationHub';
import RegistrationWizard from '../components/registration/RegistrationWizard';
import {
  RegistrationFormConfig,
  TryoutSpecificConfig,
} from '../../types/registration-types';
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
    // Get tryout details from event
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
      // Force isActive to true regardless of admin settings
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

  // Helper for images with fallback
  const getImageSrc = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/assets')) {
      return path;
    }
    return `/assets/${path}`;
  };

  if (loading) {
    return (
      <div className='tryout-root'>
        <div className='tryout-wrap'>
          <div className='text-center py-5'>
            <LoadingSpinner />
            <p className='mt-3 text-muted'>Loading tryout information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event || !tryoutConfig) {
    return (
      <div className='tryout-root'>
        <div className='tryout-wrap'>
          <div className='text-center py-5'>
            <div className='display-1 text-muted mb-4'>🏀</div>
            <h3 className='text-white'>No Active Tryouts</h3>
            <p className='text-muted'>
              {error || 'Check back soon for upcoming tryout dates.'}
            </p>
            <Link to='/' className='btn-primary-glass mt-3'>
              Return Home <i className='ti ti-arrow-right' />
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
      {/* Background Effects */}
      <div className='tryout-bg' />
      <div className='tryout-orb tryout-orb-1' />
      <div className='tryout-orb tryout-orb-2' />
      <div className='tryout-orb tryout-orb-3' />

      <div className='tryout-wrap'>
        {/* ─── HERO SECTION ──────────────────────────────────────── */}
        <section className='tryout-hero'>
          <div className='hero-grid'>
            <div className='hero-text'>
              <div className='hero-eyebrow'>
                <span className='eyebrow-dot' />
                {event.category || 'Tryout'} • {new Date().getFullYear()}
              </div>
              <h1 className='hero-title'>
                <span className='hero-accent'>{event.title}</span>
              </h1>
              <p className='hero-lead'>
                {event.description ||
                  'Join Bothell Select Basketball for the upcoming season'}
              </p>

              <div className='hero-info-grid'>
                <div className='hero-info-item'>
                  <i className='ti ti-calendar-event' />
                  <div>
                    <span className='label'>Date</span>
                    <span className='value'>{formattedDate}</span>
                  </div>
                </div>
                <div className='hero-info-item'>
                  <i className='ti ti-clock' />
                  <div>
                    <span className='label'>Time</span>
                    <span className='value'>{formattedTime}</span>
                  </div>
                </div>
                <div className='hero-info-item'>
                  <i className='ti ti-map-pin' />
                  <div>
                    <span className='label'>Location</span>
                    <span className='value'>
                      {event.school?.name || 'Bothell High School'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className='hero-img-col'>
              <div className='hero-img-glass'>
                <div className='hero-glow' />
                <img
                  src={getImageSrc('assets/img/tryout-hero.png')}
                  alt='Bothell Select Tryouts'
                  className='hero-img'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%231a1a2e"/%3E%3Ctext x="200" y="150" text-anchor="middle" fill="%23506ee4" font-size="24" font-family="Arial"%3E🏀 Tryouts%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className='hero-badge'>
                <i className='ti ti-award' />
                <span>
                  Limited Spots
                  <br />
                  Available
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── DETAILS SECTION ────────────────────────────────────── */}
        <section className='tryout-details' id='details'>
          <div className='section-hdr'>
            <div className='section-tag'>Everything You Need to Know</div>
            <h2 className='section-title'>Tryout Details</h2>
            <p className='section-sub'>
              Come prepared and ready to showcase your skills
            </p>
          </div>

          <div className='details-grid'>
            {/* What to Bring */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-package' />
              </div>
              <h3 className='details-title'>What to Bring</h3>
              <ul className='details-list'>
                <li>
                  <i className='ti ti-check' /> Basketball shoes
                </li>
                <li>
                  <i className='ti ti-check' /> Water bottle
                </li>
                <li>
                  <i className='ti ti-check' /> Athletic wear
                </li>
                <li>
                  <i className='ti ti-check' /> Completed waiver
                </li>
              </ul>
            </div>

            {/* What to Expect */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-info-circle' />
              </div>
              <h3 className='details-title'>What to Expect</h3>
              <p className='details-body'>
                Tryouts will consist of skill demonstrations, drills, and
                scrimmages. Players will be evaluated on their basketball
                fundamentals, athleticism, and teamwork.
              </p>
            </div>

            {/* Who Can Tryout */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-users' />
              </div>
              <h3 className='details-title'>Who Can Tryout</h3>
              <ul className='details-list'>
                <li>
                  <i className='ti ti-check' /> Boys &amp; Girls
                </li>
                <li>
                  <i className='ti ti-check' /> Grades 3-8
                </li>
                <li>
                  <i className='ti ti-check' /> All skill levels welcome
                </li>
              </ul>
            </div>

            {/* Location */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-map-pin' />
              </div>
              <h3 className='details-title'>Location</h3>
              <p className='details-body'>
                <strong>{event.school?.name || 'Bothell High School'}</strong>
                <br />
                {event.school?.address || '18100 92nd Ave NE'}
                <br />
                {event.school?.city || 'Bothell'}, {event.school?.state || 'WA'}{' '}
                {event.school?.zip || '98011'}
              </p>
              <p className='details-note'>
                <i className='ti ti-clock' /> Please arrive 30 minutes early for
                check-in
              </p>
            </div>
          </div>
        </section>

        {/* ─── REGISTRATION FORM ────────────────────────────────── */}
        {/* This is the key change - always show the form, always active */}
        <section className='tryout-registration-section'>
          <div className='section-hdr'>
            <div className='section-tag'>Register Now</div>
            <h2 className='section-title'>Secure Your Spot</h2>
            <p className='section-sub'>
              Complete the form below to register for tryouts
            </p>
          </div>

          <div className='registration-container'>
            {/* Use RegistrationWizard directly with the tryout config */}
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
                // Scroll to top or show success message
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        </section>

        {/* ─── UTM Debug (Development Only) ────────────────────── */}
        {process.env.NODE_ENV === 'development' && (
          <div className='tryout-debug'>
            <div className='debug-card'>
              <strong>🔍 UTM Debug:</strong>
              <pre>{JSON.stringify(getMarketingAttribution(), null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TryoutPage;
