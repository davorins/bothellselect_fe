import React, { useState, useEffect } from 'react';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Badge,
  Alert,
  Card,
} from 'react-bootstrap';
import FormPreview from './FormPreview';
import {
  SeasonEvent,
  RegistrationFormConfig,
} from '../../types/registration-types';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AdminFormPreviewPage: React.FC = () => {
  const [selectedSeason, setSelectedSeason] = useState<SeasonEvent | null>(
    null
  );
  const [formConfig, setFormConfig] = useState<RegistrationFormConfig | null>(
    null
  );
  const [seasonEvents, setSeasonEvents] = useState<SeasonEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasonEvents();
  }, []);

  const loadSeasonEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/season-events`);
      if (response.ok) {
        const events = await response.json();
        setSeasonEvents(events);
        if (events.length > 0) {
          setSelectedSeason(events[0]);
          loadFormConfig(events[0]);
        }
      }
    } catch (error) {
      setError('Failed to load season events');
    } finally {
      setLoading(false);
    }
  };

  const loadFormConfig = async (seasonEvent: SeasonEvent) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/form-configs`);
      if (response.ok) {
        const configs = await response.json();
        const key = `${seasonEvent.season}-${seasonEvent.year}`;
        setFormConfig(configs[key] || null);
      }
    } catch (error) {
      setError('Failed to load form configuration');
    }
  };

  const handleSeasonChange = (season: SeasonEvent) => {
    setSelectedSeason(season);
    loadFormConfig(season);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Form Preview</h3>
            <p className='text-muted mb-0'>
              Preview how registration forms will appear to users
            </p>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
              <OverlayTrigger
                overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
              >
                <Button
                  variant='outline-light'
                  className='bg-white btn-icon me-1'
                  onClick={loadSeasonEvents}
                >
                  <i className='ti ti-refresh' />
                </Button>
              </OverlayTrigger>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-md-3'>
            <div className='card'>
              <div className='card-header'>
                <h5 className='card-title mb-0'>Select Season</h5>
              </div>
              <div className='card-body'>
                <div className='list-group'>
                  {seasonEvents.map((season) => (
                    <button
                      key={`${season.season}-${season.year}`}
                      className={`list-group-item list-group-item-action ${
                        selectedSeason?.season === season.season &&
                        selectedSeason?.year === season.year
                          ? 'active'
                          : ''
                      }`}
                      onClick={() => handleSeasonChange(season)}
                    >
                      <div className='d-flex w-100 justify-content-between'>
                        <h6 className='mb-1'>{season.season}</h6>
                        <small>{season.year}</small>
                      </div>
                      <small>{season.description}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className='col-md-9'>
            <div className='card'>
              <div className='card-body'>
                {selectedSeason && formConfig ? (
                  <FormPreview
                    seasonEvent={selectedSeason}
                    formConfig={formConfig}
                  />
                ) : (
                  <div className='text-center p-5'>
                    <i className='ti ti-eye-off fs-1 text-muted mb-3'></i>
                    <h5>No Configuration Found</h5>
                    <p className='text-muted'>
                      Please select a season and configure the form settings
                      first.
                    </p>
                    <Button
                      variant='primary'
                      onClick={() =>
                        (window.location.href = '/admin/registration-manager')
                      }
                    >
                      <i className='ti ti-settings me-2'></i>
                      Configure Forms
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFormPreviewPage;
