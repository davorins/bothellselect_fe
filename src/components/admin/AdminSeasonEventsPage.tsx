import React, { useState, useEffect } from 'react';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Badge,
  Alert,
  Card,
} from 'react-bootstrap';
import SeasonEventManager from './SeasonEventManager';
import { SeasonEvent } from '../../types/registration-types';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const AdminSeasonEventsPage: React.FC = () => {
  const [seasonEvents, setSeasonEvents] = useState<SeasonEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSeasonEvents();
  }, []);

  const loadSeasonEvents = async () => {
    try {
      setLoading(true);
      // Simulate API call
      const response = await fetch(`${API_BASE_URL}/admin/season-events`);
      if (response.ok) {
        const events = await response.json();
        setSeasonEvents(events);
      }
    } catch (error) {
      setError('Failed to load season events');
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonCreate = async (season: Omit<SeasonEvent, 'eventId'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/season-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(season),
      });

      if (response.ok) {
        const createdSeason = await response.json();
        setSeasonEvents((prev) => [...prev, createdSeason]);
        setSuccessMessage('Season event created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      }
      return false;
    } catch (error) {
      setError('Failed to create season event');
      return false;
    }
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

        {successMessage && (
          <Alert
            variant='success'
            onClose={() => setSuccessMessage(null)}
            dismissible
          >
            {successMessage}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Season Events Management</h3>
            <p className='text-muted mb-0'>
              Create and manage seasonal events for registration
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
          <div className='col-12'>
            <div className='card'>
              <div className='card-body'>
                <SeasonEventManager
                  seasonEvents={seasonEvents}
                  onSeasonCreate={handleSeasonCreate}
                  onSeasonUpdate={setSeasonEvents}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSeasonEventsPage;
