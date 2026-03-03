// components/MyTicketsWrapper.tsx
import React, { useEffect } from 'react';
import UserTickets from './UserTickets';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const MyTicketsWrapper: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className='text-center py-5'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
        <p className='mt-2'>Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='alert alert-warning'>
        <p>You need to be logged in to view your tickets.</p>
        <button className='btn btn-primary' onClick={() => navigate('/login')}>
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <div className='my-tickets-wrapper'>
          <div className='card mb-4'>
            <div className='card-body'>
              <h4 className='card-title'>
                <i className='ti ti-ticket me-2'></i>
                My Tickets
              </h4>
              <p className='card-text text-muted'>
                View all your ticket purchases. Showing tickets for:{' '}
                <strong>{user.email}</strong>
              </p>
            </div>
          </div>

          <UserTickets
            email={user.email}
            userId={user._id}
            isPublicMode={false}
          />
        </div>
      </div>
    </div>
  );
};

export default MyTicketsWrapper;
