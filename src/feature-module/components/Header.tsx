import React, { useCallback, useEffect, useState, useRef } from 'react';
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

interface HeaderProps {
  showSponsorLogo: boolean;
}

const Header: React.FC<HeaderProps> = ({ showSponsorLogo }) => {
  const { isAuthenticated, parent, role, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const routes = all_routes;
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(
    null,
  );

  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar,
  );

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const sponsors = [
    {
      name: 'Concrete Restoration Inc.',
      logo: 'assets/img/sponsor_logo.png',
      link: 'https://concreterestorationinc.com/',
    },
    {
      name: 'GR Solution',
      logo: 'assets/img/sponsor_logo_2.png',
      link: 'https://www.grshsolution.com/',
    },
  ];

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/');
  };

  const handleLoginRedirect = () => {
    closeMobileMenu();
    navigate(routes.login);
  };

  const toggleMobileSidebar = useCallback(() => {
    const newState = !mobileSidebar;
    dispatch(setMobileSidebar(newState));
    if (!newState) {
      setOpenMobileDropdown(null);
    }
  }, [dispatch, mobileSidebar]);

  const closeMobileMenu = useCallback(() => {
    if (mobileSidebar) {
      dispatch(setMobileSidebar(false));
      setOpenMobileDropdown(null);
    }
  }, [dispatch, mobileSidebar]);

  const handleMobileLinkClick = useCallback(() => {
    closeMobileMenu();
  }, [closeMobileMenu]);

  const toggleMobileDropdown = useCallback((dropdownName: string) => {
    setOpenMobileDropdown((prev) =>
      prev === dropdownName ? null : dropdownName,
    );
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking on the mobile menu button
      if (target.closest('#mobile_btn')) {
        return;
      }

      if (
        mobileSidebar &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        closeMobileMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSidebar, closeMobileMenu]);

  const onMouseEnter = useCallback(() => {
    dispatch(setExpandMenu(true));
  }, [dispatch]);

  const onMouseLeave = useCallback(() => {
    dispatch(setExpandMenu(false));
  }, [dispatch]);

  const toggleAboutDropdown = () => {
    setAboutDropdownOpen((prev) => !prev);
    setTeamDropdownOpen(false);
  };

  const toggleTeamDropdown = () => {
    setTeamDropdownOpen((prev) => !prev);
    setAboutDropdownOpen(false);
  };

  const closeAboutDropdown = () => {
    setAboutDropdownOpen(false);
  };

  const closeTeamDropdown = () => {
    setTeamDropdownOpen(false);
  };

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
          },
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

  const getDashboardRoute = () => {
    if (role === 'coach') {
      return routes.coachDashboard || '/coach-dashboard';
    }
    return routes.adminDashboard;
  };

  const renderLogoSection = () => {
    const dashboardRoute = getDashboardRoute();

    return (
      <div
        className='header-left active'
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Link to={dashboardRoute} className='logo logo-normal'>
          <ImageWithBasePath src='assets/img/logo.png' alt='Logo' />
        </Link>
        <Link to={dashboardRoute} className='logo-small'>
          <ImageWithBasePath src='assets/img/logo-small.png' alt='Logo' />
        </Link>
        <Link to={dashboardRoute} className='dark-logo'>
          <ImageWithBasePath src='assets/img/logo-dark.svg' alt='Logo' />
        </Link>
      </div>
    );
  };

  const renderMobileMenuButton = () => (
    <button
      id='mobile_btn'
      className={`mobile_btn d-md-none ${mobileSidebar ? 'active' : ''}`}
      onClick={toggleMobileSidebar}
      aria-label='Toggle menu'
    >
      <span className='bar-icon'>
        <span />
        <span />
        <span />
      </span>
    </button>
  );
  // Navigation items configuration
  const publicNavItems = [
    { path: '/', icon: 'ti ti-home-2', label: 'Home' },
    { path: '/tournaments', icon: 'ti ti-trophy', label: 'Tournaments' },
    { path: '/events', icon: 'ti ti-calendar-event', label: 'Schedule/Events' },
    { path: '/contact-us', icon: 'ti ti-mail', label: 'Contact Us' },
    { path: '/faq', icon: 'ti ti-question-mark', label: 'FAQ' },
  ];

  const dropdownItems = [
    {
      name: 'about',
      icon: 'ti ti-chess-knight',
      label: 'About Us',
      items: [
        { path: '/about-us', label: 'Our Mission' },
        { path: '/program-leadership', label: 'Program Leadership' },
      ],
    },
    {
      name: 'team',
      icon: 'ti ti-ball-basketball',
      label: 'Our Team',
      items: [
        { path: '/our-team', label: 'Team Overview' },
        { path: '/in-the-spotlight', label: 'In The Spotlight' },
      ],
    },
  ];

  const privateNavItems = [
    { path: routes.profile, icon: 'ti ti-user-circle', label: 'My Profile' },
    { path: routes.myTickets, icon: 'ti ti-ticket', label: 'My Tickets' },
    { path: routes.profilesettings, icon: 'ti ti-settings', label: 'Settings' },
  ];

  return (
    <>
      <div className='header d-flex justify-content-between align-items-center px-3 py-2 shadow-sm'>
        <div className='d-flex align-items-center'>
          {renderLogoSection()}
          {renderMobileMenuButton()}
        </div>

        <div className='d-none d-md-block'>
          <ul className='nav'>
            <li className='nav-item'>
              <Link className='nav-link' to='/'>
                Home
              </Link>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/tournaments'>
                Tournaments
              </Link>
            </li>
            <li className='nav-item dropdown'>
              <Link
                className='nav-link dropdown-toggle'
                to='#'
                role='button'
                data-bs-toggle='dropdown'
                aria-expanded={aboutDropdownOpen}
                onClick={toggleAboutDropdown}
              >
                About Us
              </Link>
              <ul
                className={`dropdown-menu ${aboutDropdownOpen ? 'show' : ''}`}
              >
                <li>
                  <Link
                    className='dropdown-item'
                    to='/about-us'
                    onClick={closeAboutDropdown}
                  >
                    Our Mission
                  </Link>
                </li>
                <li>
                  <Link
                    className='dropdown-item'
                    to='/program-leadership'
                    onClick={closeAboutDropdown}
                  >
                    Program Leadership
                  </Link>
                </li>
              </ul>
            </li>
            <li className='nav-item dropdown'>
              <Link
                className='nav-link dropdown-toggle'
                to='#'
                role='button'
                data-bs-toggle='dropdown'
                aria-expanded={teamDropdownOpen}
                onClick={toggleTeamDropdown}
              >
                Our Team
              </Link>
              <ul className={`dropdown-menu ${teamDropdownOpen ? 'show' : ''}`}>
                <li>
                  <Link
                    className='dropdown-item'
                    to='/our-team'
                    onClick={closeTeamDropdown}
                  >
                    Team Overview
                  </Link>
                </li>
                <li>
                  <Link
                    className='dropdown-item'
                    to='/in-the-spotlight'
                    onClick={closeTeamDropdown}
                  >
                    In The Spotlight
                  </Link>
                </li>
              </ul>
            </li>
            <li className='nav-item'>
              <Link className='nav-link' to='/events'>
                Schedule/Events
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
                <Link className='dropdown-item' to={routes.myTickets}>
                  <i className='ti ti-ticket me-2' /> My Tickets
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
              Log In / Register
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation - Glassmorphism Style */}
      {mobileSidebar && (
        <div className='mobile-nav-glass' ref={mobileMenuRef}>
          <div className='mobile-nav-header'>
            <div className='mobile-nav-title'>
              <span>Menu</span>
            </div>
            {/* <button className='mobile-nav-close' onClick={closeMobileMenu}>
              <i className='ti ti-x'></i>
            </button> */}
          </div>

          {/* Public Section */}
          <div className='mobile-nav-section'>
            <div className='mobile-nav-section-title'>
              <i className='ti ti-compass'></i>
              <span>Navigation</span>
            </div>
            <ul className='mobile-nav-list'>
              {publicNavItems.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} onClick={handleMobileLinkClick}>
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Dropdown Items */}
          {dropdownItems.map((dropdown) => (
            <div key={dropdown.name} className='mobile-nav-section'>
              <button
                className='mobile-nav-dropdown-toggle'
                onClick={() => toggleMobileDropdown(dropdown.name)}
              >
                <i className={dropdown.icon}></i>
                <span>{dropdown.label}</span>
                <i
                  className={`ti ti-chevron-right ${openMobileDropdown === dropdown.name ? 'open' : ''}`}
                ></i>
              </button>
              <div
                className={`mobile-nav-submenu ${openMobileDropdown === dropdown.name ? 'open' : ''}`}
              >
                {dropdown.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleMobileLinkClick}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Private Section - Only when authenticated */}
          {isAuthenticated && (
            <div className='mobile-nav-section private-section'>
              <div className='mobile-nav-section-title'>
                <i className='ti ti-lock'></i>
                <span>Account</span>
              </div>
              <ul className='mobile-nav-list'>
                {privateNavItems.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} onClick={handleMobileLinkClick}>
                      <i className={item.icon}></i>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
                <li className='logout-item'>
                  <button onClick={handleLogout}>
                    <i className='ti ti-logout'></i>
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Auth Button Section - Public */}
          {!isAuthenticated && (
            <div className='mobile-nav-section auth-section'>
              <button className='mobile-auth-btn' onClick={handleLoginRedirect}>
                <i className='ti ti-login'></i>
                <span>Login / Register</span>
                <i className='ti ti-arrow-right'></i>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Header;
