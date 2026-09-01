import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface TryoutEvent {
  _id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location: string;
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
}

interface FormConfig {
  _id: string;
  fields: any[];
  requiresPayment: boolean;
  pricing: {
    basePrice: number;
    packages: any[];
  };
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TryoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<TryoutEvent | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  // This is where UTM params are captured by the MarketingContext
  const { getMarketingAttribution } = useMarketing();

  useEffect(() => {
    fetchActiveTryout();
  }, []);

  const fetchActiveTryout = async () => {
    try {
      setLoading(true);

      // Fetch active tryout event
      const eventsResponse = await axios.get(
        `${API_BASE_URL}/events?category=tryout`,
      );
      const activeTryout = eventsResponse.data.find(
        (e: any) => e.isActive !== false && new Date(e.start) > new Date(),
      );

      if (!activeTryout) {
        setError('No active tryouts available');
        setLoading(false);
        return;
      }

      setEvent(activeTryout);

      // Fetch form config for this event
      if (activeTryout.formId) {
        const formResponse = await axios.get(
          `${API_BASE_URL}/events/forms/${activeTryout.formId}`,
        );
        setFormConfig(formResponse.data);
      }

      // Log UTM params for debugging
      const utmData = getMarketingAttribution();
      console.log('📊 UTM Data captured:', utmData);
    } catch (err) {
      console.error('Error fetching tryout:', err);
      setError('Failed to load tryout information');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    // Get UTM data for registration
    const marketing = getMarketingAttribution();
    console.log('📝 Registration started with:', marketing);
    setShowRegistration(true);
  };

  if (loading) {
    return (
      <div className='container py-5'>
        <div className='text-center'>
          <LoadingSpinner />
          <p className='mt-3 text-muted'>Loading tryout information...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className='container py-5'>
        <div className='alert alert-warning'>
          <h4 className='alert-heading'>No Active Tryouts</h4>
          <p>{error || 'Check back soon for upcoming tryout dates.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='tryout-page'>
      {/* Hero Section */}
      <section className='tryout-hero bg-primary text-white py-5'>
        <div className='container'>
          <div className='row align-items-center'>
            <div className='col-lg-8'>
              <h1 className='display-4 fw-bold'>{event.title}</h1>
              <p className='lead'>
                {event.description || 'Join Bothell Select Basketball'}
              </p>
              <div className='d-flex flex-wrap gap-3 mt-4'>
                <div className='d-flex align-items-center'>
                  <i className='ti ti-calendar-event me-2'></i>
                  <span>
                    {new Date(event.start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className='d-flex align-items-center'>
                  <i className='ti ti-clock me-2'></i>
                  <span>
                    {new Date(event.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className='d-flex align-items-center'>
                  <i className='ti ti-map-pin me-2'></i>
                  <span>{event.school?.name || 'Bothell High School'}</span>
                </div>
              </div>
            </div>
            <div className='col-lg-4 text-lg-end mt-4 mt-lg-0'>
              <div className='bg-white text-dark p-4 rounded-3 shadow'>
                <div className='text-center'>
                  <div className='display-6 fw-bold text-primary'>
                    ${event.price || 50}
                  </div>
                  <div className='text-muted small'>per player</div>
                  <button
                    className='btn btn-primary btn-lg w-100 mt-3'
                    onClick={handleRegister}
                  >
                    <i className='ti ti-user-plus me-2'></i>
                    Register Now
                  </button>
                  <div className='text-muted small mt-2'>Spots are limited</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className='py-5'>
        <div className='container'>
          <div className='row'>
            <div className='col-lg-8'>
              <h2>Tryout Details</h2>
              <div className='card mb-4'>
                <div className='card-body'>
                  <h5>What to Bring</h5>
                  <ul className='list-unstyled'>
                    <li>
                      <i className='ti ti-check text-success me-2'></i>{' '}
                      Basketball shoes
                    </li>
                    <li>
                      <i className='ti ti-check text-success me-2'></i> Water
                      bottle
                    </li>
                    <li>
                      <i className='ti ti-check text-success me-2'></i> Athletic
                      wear
                    </li>
                    <li>
                      <i className='ti ti-check text-success me-2'></i>{' '}
                      Completed registration form
                    </li>
                  </ul>
                </div>
              </div>

              <div className='card'>
                <div className='card-body'>
                  <h5>What to Expect</h5>
                  <p>
                    Tryouts will consist of skill demonstrations, drills, and
                    scrimmages. Players will be evaluated on their basketball
                    fundamentals, athleticism, and teamwork.
                  </p>
                </div>
              </div>
            </div>
            <div className='col-lg-4'>
              <div className='card'>
                <div className='card-header'>
                  <h5 className='mb-0'>Location</h5>
                </div>
                <div className='card-body'>
                  <p className='mb-1'>
                    <strong>
                      {event.school?.name || 'Bothell High School'}
                    </strong>
                  </p>
                  <p className='text-muted'>
                    {event.school?.address || '18100 92nd Ave NE'}
                    <br />
                    {event.school?.city || 'Bothell'},{' '}
                    {event.school?.state || 'WA'} {event.school?.zip || '98011'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Modal */}
      {showRegistration && (
        <div
          className='modal show d-block'
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className='modal-dialog modal-lg modal-dialog-centered'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title'>Register for Tryouts</h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={() => setShowRegistration(false)}
                ></button>
              </div>
              <div className='modal-body'>
                {/* Your existing registration form component goes here */}
                <p>Registration form will appear here</p>
                <p className='text-muted small'>
                  <i className='ti ti-info-circle me-1'></i>
                  UTM data will be captured:{' '}
                  {JSON.stringify(getMarketingAttribution())}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TryoutPage;
