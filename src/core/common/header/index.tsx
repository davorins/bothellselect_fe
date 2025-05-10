import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setDataLayout } from '../../data/redux/themeSettingSlice';
import {
  setExpandMenu,
  setMobileSidebar,
  toggleMiniSidebar,
} from '../../data/redux/sidebarSlice';
import ImageWithBasePath from '../imageWithBasePath';
import { all_routes } from '../../../feature-module/router/all_routes';
import { useAuth } from '../../../context/AuthContext';
import SeasonDropdown from '../../../components/common/SeasonDropdown';
import SearchBar from './SearchBar';
import FullscreenToggle from './FullscreenToggle';
import NotificationDropdown from './NotificationDropdown';
import axios from 'axios';

const Header = () => {
  const { parent, role, logout } = useAuth();
  const dispatch = useDispatch();
  const routes = all_routes;
  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);
  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar
  );
  const [searchParams] = useSearchParams();
  const seasonParam = searchParams.get('season');
  const yearParam = searchParams.get('year');
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const DEFAULT_AVATAR =
    'https://bothell-select.onrender.com/uploads/avatars/parents.png';

  const fetchAvatarUrlFromBackend = useCallback(async () => {
    const token = localStorage.getItem('token');
    const parentId = localStorage.getItem('parentId');

    if (!token || !parentId) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const avatarUrl = response.data.avatar;

      if (avatarUrl && avatarUrl.startsWith('http')) {
        setAvatarSrc(avatarUrl);
        localStorage.setItem('avatarUrl', avatarUrl);
      } else {
        setAvatarSrc(DEFAULT_AVATAR);
      }
    } catch (err) {
      console.error('Failed to fetch avatar:', err);
      setAvatarSrc(DEFAULT_AVATAR);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    // Fetch the avatar from the backend when the component mounts
    fetchAvatarUrlFromBackend();
  }, [fetchAvatarUrlFromBackend]);

  const handleLogout = useCallback(() => {
    logout();
    window.location.href = '/';
  }, [logout]);

  const toggleMobileSidebar = useCallback(() => {
    dispatch(setMobileSidebar(!mobileSidebar));
  }, [dispatch, mobileSidebar]);

  const onMouseEnter = useCallback(() => {
    dispatch(setExpandMenu(true));
  }, [dispatch]);

  const onMouseLeave = useCallback(() => {
    dispatch(setExpandMenu(false));
  }, [dispatch]);

  const handleToggleMiniSidebar = useCallback(() => {
    if (dataLayout === 'mini_layout') {
      dispatch(setDataLayout('default_layout'));
      localStorage.setItem('dataLayout', 'default_layout');
    } else {
      dispatch(toggleMiniSidebar());
    }
  }, [dataLayout, dispatch]);

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
      <Link id='toggle_btn' to='#' onClick={handleToggleMiniSidebar}>
        <i className='ti ti-menu-deep' />
      </Link>
    </div>
  );

  const renderMobileMenuButton = () => (
    <Link
      id='mobile_btn'
      className='mobile_btn'
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

  const renderSeasonDropdown = () => (
    <div className='dropdown me-2'>
      <Link
        to='#'
        className='btn btn-outline-light fw-normal bg-white d-flex align-items-center p-2'
        data-bs-toggle='dropdown'
        aria-expanded='false'
      >
        <i className='ti ti-calendar-due me-1' />
        {seasonParam && yearParam
          ? `${seasonParam} ${yearParam}`
          : 'Select Season'}
      </Link>
      <div className='dropdown-menu'>
        <SeasonDropdown
          currentSeason={seasonParam || undefined}
          currentYear={yearParam || undefined}
        />
      </div>
    </div>
  );

  const renderUserDropdown = () => {
    if (!parent) return null;

    const avatarUrl =
      parent.avatar && parent.avatar.trim() !== ''
        ? `https://bothell-select.onrender.com${parent.avatar}`
        : avatarSrc || DEFAULT_AVATAR;

    return (
      <div className='dropdown ms-1'>
        <Link
          to='#'
          className='dropdown-toggle d-flex align-items-center'
          data-bs-toggle='dropdown'
        >
          <span className='avatar avatar-md rounded'>
            <img
              src={avatarUrl}
              alt={parent.fullName || 'User avatar'}
              className='img-fluid rounded-circle'
            />
          </span>
        </Link>
        <div className='dropdown-menu'>
          <div className='d-block'>
            <div className='d-flex align-items-center p-2'>
              <span className='avatar avatar-md me-2 online avatar-rounded'>
                <img
                  src={avatarUrl}
                  alt={parent.fullName || 'User avatar'}
                  className='img-fluid rounded-circle'
                />
              </span>
              <div>
                <h6>{parent.fullName || 'User'}</h6>
                <p className='text-primary mb-0'>{role}</p>
              </div>
            </div>
            <hr className='m-0' />
            <Link
              className='dropdown-item d-inline-flex align-items-center p-2'
              to={routes.profile}
            >
              <i className='ti ti-user-circle me-2' />
              My Profile
            </Link>
            <Link
              className='dropdown-item d-inline-flex align-items-center p-2'
              to={routes.profilesettings}
            >
              <i className='ti ti-settings me-2' />
              Settings
            </Link>
            <hr className='m-0' />
            <Link
              className='dropdown-item d-inline-flex align-items-center p-2'
              to='#'
              onClick={handleLogout}
            >
              <i className='ti ti-logout me-2' />
              Logout
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='header'>
      {renderLogoSection()}
      {renderMobileMenuButton()}

      <div className='header-user'>
        <div className='nav user-menu'>
          <SearchBar role={role} />

          <div className='d-flex align-items-center'>
            {parent?.role === 'admin' && renderSeasonDropdown()}
            <NotificationDropdown />
            <FullscreenToggle />
            {renderUserDropdown()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
