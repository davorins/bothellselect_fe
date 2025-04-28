import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RegistrationForm from '../components/RegistrationForm';
import PlayerRegistrationForm from '../components/PlayerRegistrationForm';
import { useAuth } from '../../context/AuthContext';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import { getNextSeason } from '../../utils/season';
import HomeModals from './homeModals';

const HomePage = () => {
  const { isAuthenticated, checkAuth, players, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [nextSeason] = useState(getNextSeason());
  const [hasPlayersForNextSeason, setHasPlayersForNextSeason] = useState(false);
  const [hasUnpaidPlayers, setHasUnpaidPlayers] = useState(false);

  useEffect(() => {
    checkAuth();

    if (isAuthenticated && players) {
      const nextSeasonPlayers = players.filter(
        (player) => player.season === nextSeason
      );
      setHasPlayersForNextSeason(nextSeasonPlayers.length > 0);

      // Check if any next season players are unpaid
      const unpaid = nextSeasonPlayers.some(
        (player) => !player.paymentComplete
      );
      setHasUnpaidPlayers(unpaid);
    }
  }, [checkAuth, isAuthenticated, players, nextSeason]);

  const handleRegisterClick = () => {
    setShowRegistrationForm(true);
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const renderAuthenticatedContent = () => {
    // Scenario 1: No players registered for next season
    if (!hasPlayersForNextSeason) {
      return (
        <div className='card'>
          <div className='card-header'>
            <h3>Register Players for {nextSeason} Season</h3>
          </div>
          <div className='card-body'>
            <RegistrationForm isExistingUser={true} />
          </div>
        </div>
      );
    }

    // Scenario 2: Has unpaid players
    if (hasUnpaidPlayers) {
      const unpaidPlayer = players.find(
        (player) => player.season === nextSeason && !player.paymentComplete
      );
      return (
        <PlayerRegistrationForm
          playerId={unpaidPlayer?._id}
          showPayment={true}
        />
      );
    }

    // Scenario 3: All players paid, show dashboard with option to add more
    return (
      <>
        <div className='card'>
          <div className='card-body'>
            <PlayerRegistrationForm />
          </div>
        </div>
      </>
    );
  };

  const renderUnauthenticatedContent = () => {
    if (showRegistrationForm) {
      return <RegistrationForm isExistingUser={false} />;
    }

    return (
      <>
        {/* Information Section */}
        <div
          className='grid-container mb-5'
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
          }}
        >
          {/* Quadrant 1 */}
          <div className='quadrant align-items-center text-center'>
            <h1>
              <i className='ti ti-calendar-bolt me-0' />
            </h1>
            <h4>Starting</h4>
            <p>June 30th - August 29th</p>
          </div>
          {/* Quadrant 2 */}
          <div className='quadrant align-items-center text-center'>
            <h1>
              <i className='ti ti-calendar-smile me-0' />
            </h1>
            <h4>Days</h4>
            <p>Monday thru Friday</p>
          </div>
          {/* Quadrant 3 */}
          <div className='quadrant align-items-center text-center'>
            <h1>
              <i className='ti ti-star me-0' />
            </h1>
            <h4>Age</h4>
            <p>3rd thru 12th grade / Boys & Girls</p>
          </div>
          {/* Quadrant 4 */}
          <div className='quadrant align-items-center text-center'>
            <h1>
              <i className='ti ti-currency-dollar me-0' />
            </h1>
            <h4>Cost</h4>
            <p>Get full pricing and details</p>
            <Link
              to='#'
              className='btn btn-info me-2 mb-2'
              data-bs-toggle='modal'
              data-bs-target='#login_detail'
            >
              <i className='ti ti-currency-dollar me-0' />
              Price Details
            </Link>
          </div>
        </div>
        <div>
          <ul>
            <li className='mb-4'>
              <h5>New to the camp?</h5>
              <p>Click below to register and secure your spot.</p>
              <button
                onClick={handleRegisterClick}
                className='btn btn-primary me-2'
              >
                Register Now
              </button>
            </li>
            <li>
              <h5>Returning player?</h5>
              <p>
                Welcome back! Log in to access your account and sign up for the
                '25 season.
              </p>
              <button onClick={handleLoginClick} className='btn btn-secondary'>
                Login
              </button>
            </li>
          </ul>
        </div>
      </>
    );
  };

  return (
    <div className='container-fluid'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflow-y-auto bg-01'>
              <div>
                <ImageWithBasePath
                  src='assets/img/authentication/authentication.png'
                  alt='Img'
                />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='home-page'>
                <div className='mx-auto p-4'>
                  <h1 className='mb-4'>Welcome to Bothell Select</h1>
                  <p className='mb-5'>
                    Being a part of the Bothell Select basketball program
                    requires a serious commitment to the basketball season. One
                    of the goals of a successful high school feeder program is
                    to develop players into the types of athletes that can be
                    successful at the high school level. In order to achieve
                    this, the player and parents must be willing to commit
                    themselves to an increased level of participation,
                    preparation and competition.
                  </p>
                  <h2 className='mb-3'>🔥 9 Weeks Summer Camp 🔥</h2>
                  <p className='mb-3'>
                    ☀️ The 2025 Summer Basketball Camp is here, and the courts
                    are waiting for your young athlete! Whether your child is a
                    rising star or just discovering their love for the game,
                    this is their chance to:
                  </p>
                  <ul className='mb-4'>
                    <li>🔥 Elevate their skills with expert coaching</li>
                    <li>💪 Build confidence both on and off the court</li>
                    <li>🤝 Make lasting friendships with fellow players</li>
                    <li>
                      🎉 Experience the thrill of basketball in a fun,
                      supportive environment
                    </li>
                  </ul>
                  <p>
                    Perfect for all skill levels – every player will leave
                    stronger, smarter, and more passionate about the game!
                  </p>
                  <p>
                    📅 Spots are filling fast!{' '}
                    <Link
                      to='#'
                      data-bs-toggle='modal'
                      data-bs-target='#login_detail'
                    >
                      See details.
                    </Link>
                  </p>
                  <div className='mx-auto'>
                    {isAuthenticated
                      ? renderAuthenticatedContent()
                      : renderUnauthenticatedContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <HomeModals />;
    </div>
  );
};

export default HomePage;
