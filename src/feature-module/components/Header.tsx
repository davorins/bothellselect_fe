import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import { all_routes } from '../../feature-module/router/all_routes';
import { useAuth } from '../../context/AuthContext';
import {
  setExpandMenu,
  setMobileSidebar,
} from '../../core/data/redux/sidebarSlice';
import axios from 'axios';
import NotificationDropdown from '../../core/common/header/NotificationDropdown';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DEFAULT_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/parents.png';

const Header = () => {
  const { isAuthenticated, parent, role, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const routes = all_routes;
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);

  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLoginRedirect = () => {
    navigate(all_routes.login);
  };

  const toggleMobileSidebar = useCallback(() => {
    dispatch(setMobileSidebar(!mobileSidebar));
  }, [dispatch, mobileSidebar]);

  const onMouseEnter = useCallback(() => {
    dispatch(setExpandMenu(true));
  }, [dispatch]);

  const onMouseLeave = useCallback(() => {
    dispatch(setExpandMenu(false));
  }, [dispatch]);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!parent?._id) return;

      if (parent.avatar && parent.avatar.startsWith('http')) {
        setAvatarSrc(parent.avatar);
        return;
      }

      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(
          `${API_BASE_URL}/parent/${parent._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const avatar = response.data?.avatar;

        if (avatar && avatar.startsWith('http')) {
          setAvatarSrc(avatar);
        } else if (avatar) {
          setAvatarSrc(`https://bothell-select.onrender.com${avatar}`);
        } else {
          setAvatarSrc(DEFAULT_AVATAR);
        }
      } catch (error) {
        console.error('Failed to fetch avatar:', error);
        setAvatarSrc(DEFAULT_AVATAR);
      }
    };

    fetchAvatar();
  }, [parent?._id, parent?.avatar]);

  const renderLogoSection = () => (
    <div
      className='header-left active'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Link to={routes.adminDashboard} className='logo logo-normal'>
        <ImageWithBasePath src='assets/img/logo.png' alt='Logo' />
      </Link>
      <Link to={routes.adminDashboard} className='logo-small'>
        <ImageWithBasePath src='assets/img/logo-small.png' alt='Logo' />
      </Link>
      <Link to={routes.adminDashboard} className='dark-logo'>
        <ImageWithBasePath src='assets/img/logo-dark.svg' alt='Logo' />
      </Link>
    </div>
  );

  const renderMobileMenuButton = () => (
    <Link
      id='mobile_btn'
      className='mobile_btn d-md-none'
      to='#sidebar'
      onClick={toggleMobileSidebar}
    >
      <span className='bar-icon'>
        <span />
        <span />
        <span />
      </span>
    </Link>
  );

  return (
    <>
      {/* Header */}
      <div className='header d-flex justify-content-between align-items-center px-3 py-2 shadow-sm'>
        {/* Logo + Sidebar Toggle + Mobile Menu Button */}
        <div className='d-flex align-items-center'>
          {renderLogoSection()}
          {renderMobileMenuButton()}
        </div>

        {/* Main Nav Menu (hidden on mobile) */}
        <div className='d-none d-md-block'>
          <ul className='nav'>
            <li className='nav-item'>
              <Link className='nav-link' to='/'>
                Home
              </Link>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/about-us'>
                About Us
              </Link>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/our-team'>
                Our Team
              </Link>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/events'>
                Events
              </Link>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/contact-us'>
                Contact Us
              </Link>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/faq'>
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        {/* User Auth / Profile (always visible in desktop) */}
        <div className='d-none d-md-flex align-items-center'>
          <NotificationDropdown avatarSrc={avatarSrc || DEFAULT_AVATAR} />
          {isAuthenticated && parent ? (
            <div className='dropdown ms-2'>
              <Link
                to='#'
                className='dropdown-toggle d-flex align-items-center'
                data-bs-toggle='dropdown'
              >
                <span className='avatar avatar-md rounded-circle'>
                  <img
                    src={avatarSrc}
                    alt={parent?.fullName || 'User avatar'}
                    className='img-fluid rounded-circle'
                  />
                </span>
              </Link>
              <div className='dropdown-menu dropdown-menu-end'>
                <div className='d-flex align-items-center p-2'>
                  <span className='avatar avatar-md me-2'>
                    <img
                      src={avatarSrc}
                      alt={parent?.fullName || 'User avatar'}
                      className='img-fluid rounded-circle'
                    />
                  </span>
                  <div>
                    <h6 className='mb-0'>{parent?.fullName || 'User'}</h6>
                    <small className='text-muted'>{role}</small>
                  </div>
                </div>
                <hr className='dropdown-divider' />
                <Link className='dropdown-item' to={routes.profile}>
                  <i className='ti ti-user-circle me-2' /> My Profile
                </Link>
                <Link className='dropdown-item' to={routes.profilesettings}>
                  <i className='ti ti-settings me-2' /> Settings
                </Link>
                <hr className='dropdown-divider' />
                <button
                  className='dropdown-item text-danger'
                  onClick={handleLogout}
                >
                  <i className='ti ti-logout me-2' /> Logout
                </button>
              </div>
            </div>
          ) : (
            <button
              className='btn btn-outline-primary ms-2'
              onClick={handleLoginRedirect}
            >
              Log In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Slide Down Menu */}
      {mobileSidebar && (
        <div className='mobile-nav d-md-none px-3 pb-3 bg-white shadow-sm'>
          <ul className='nav flex-column'>
            <li className='nav-item'>
              <Link className='nav-link' to='/' onClick={toggleMobileSidebar}>
                <i className='ti ti-home-2' /> Home
              </Link>
            </li>
            <li className='nav-item'>
              <Link
                className='nav-link'
                to='/about-us'
                onClick={toggleMobileSidebar}
              >
                <i className='ti ti-chess-knight' /> About Us
              </Link>
            </li>
            <li className='nav-item'>
              <Link
                className='nav-link'
                to='/our-team'
                onClick={toggleMobileSidebar}
              >
                <i className='ti ti-ball-basketball' /> Our Team
              </Link>
            </li>
            <li className='nav-item'>
              <Link
                className='nav-link'
                to='/events'
                onClick={toggleMobileSidebar}
              >
                <i className='ti ti-calendar-event' /> Events
              </Link>
            </li>
            <li className='nav-item'>
              <Link
                className='nav-link'
                to='/contact-us'
                onClick={toggleMobileSidebar}
              >
                <i className='ti ti-mail' /> Contact Us
              </Link>
            </li>
            <li className='nav-item'>
              <Link
                className='nav-link'
                to='/faq'
                onClick={toggleMobileSidebar}
              >
                <i className='ti ti-question-mark' /> FAQ
              </Link>
            </li>
            <li>
              <Link className='dropdown-item' to={routes.profile}>
                <i className='ti ti-user-circle me-2' /> My Profile
              </Link>
            </li>

            <li className='nav-item mt-2'>
              {!isAuthenticated ? (
                <button
                  className='btn btn-outline-primary w-100'
                  onClick={() => {
                    toggleMobileSidebar();
                    handleLoginRedirect();
                  }}
                >
                  Log In
                </button>
              ) : (
                <button
                  className='btn btn-outline-danger w-100'
                  onClick={() => {
                    toggleMobileSidebar();
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </>
  );
};

export default Header;
