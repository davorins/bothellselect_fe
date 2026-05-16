import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AcceptMerge: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid merge link. No token provided.');
      return;
    }

    const acceptMerge = async () => {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/parents/approve-merge`,
          { token },
        );

        if (response.data.success) {
          setStatus('success');
          setMessage(
            'Accounts merged successfully! The other parent has been added as a guardian to your account.',
          );
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Failed to merge accounts');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err.response?.data?.error || 'Invalid or expired merge request',
        );
      }
    };

    acceptMerge();
  }, [token]);

  return (
    <div className='container py-5'>
      <div className='row justify-content-center'>
        <div className='col-md-6'>
          <div className='card shadow-sm'>
            <div className='card-body text-center py-5'>
              {status === 'loading' && (
                <>
                  <div
                    className='spinner-border text-primary mb-3'
                    role='status'
                  >
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                  <h4>Processing your merge request...</h4>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className='avatar avatar-lg bg-success-transparent text-success mb-3'>
                    <i className='ti ti-check fs-24'></i>
                  </div>
                  <h4 className='text-success'>Merge Successful!</h4>
                  <p className='text-muted mt-3'>{message}</p>
                  <button
                    className='btn btn-primary mt-3'
                    onClick={() => navigate('/login')}
                  >
                    Go to Login
                  </button>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className='avatar avatar-lg bg-danger-transparent text-danger mb-3'>
                    <i className='ti ti-x fs-24'></i>
                  </div>
                  <h4 className='text-danger'>Merge Failed</h4>
                  <p className='text-muted mt-3'>{message}</p>
                  <button
                    className='btn btn-outline-secondary mt-3'
                    onClick={() => navigate('/')}
                  >
                    Return to Home
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptMerge;
