import React, { useState, useEffect } from 'react';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Badge,
  Alert,
  Card,
} from 'react-bootstrap';
import RegistrationFormManager from './RegistrationFormManager';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminRegistrationManagerPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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
            <h3 className='page-title mb-1'>Registration Form Manager</h3>
            <p className='text-muted mb-0'>
              Manage registration forms and season events
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
                  onClick={() => window.location.reload()}
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
                <RegistrationFormManager />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistrationManagerPage;
