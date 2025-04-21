import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageWithBasePath from '../imageWithBasePath';
import { all_routes } from '../../../feature-module/router/all_routes';

const NotificationDropdown = () => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const routes = all_routes;

  const toggleNotification = () => {
    setNotificationVisible(!notificationVisible);
  };

  return (
    <div
      className={`pe-1 ${notificationVisible ? 'notification-item-show' : ''}`}
      id='notification_item'
    >
      <Link
        onClick={toggleNotification}
        to='#'
        className='btn btn-outline-light bg-white btn-icon position-relative me-1'
        id='notification_popup'
      >
        <i className='ti ti-bell' />
        <span className='notification-status-dot' />
      </Link>
      <div className='dropdown-menu dropdown-menu-end notification-dropdown p-4'>
        <div className='d-flex align-items-center justify-content-between border-bottom p-0 pb-3 mb-3'>
          <h4 className='notification-title'>Notifications (2)</h4>
          <div className='d-flex align-items-center'>
            <Link to='#' className='text-primary fs-15 me-3 lh-1'>
              Mark all as read
            </Link>
            <div className='dropdown'>
              <Link
                to='#'
                className='bg-white dropdown-toggle'
                data-bs-toggle='dropdown'
              >
                <i className='ti ti-calendar-due me-1' />
                Today
              </Link>
              <ul className='dropdown-menu mt-2 p-3'>
                <li>
                  <Link to='#' className='dropdown-item rounded-1'>
                    This Week
                  </Link>
                </li>
                <li>
                  <Link to='#' className='dropdown-item rounded-1'>
                    Last Week
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className='noti-content'>
          <div className='d-flex flex-column'>
            <div className='border-bottom mb-3 pb-3'>
              <Link to={routes.activity}>
                <div className='d-flex'>
                  <span className='avatar avatar-lg me-2 flex-shrink-0'>
                    <ImageWithBasePath
                      src='assets/img/profiles/avatar-27.jpg'
                      alt='Profile'
                    />
                  </span>
                  <div className='flex-grow-1'>
                    <p className='mb-1'>
                      <span className='text-dark fw-semibold'>Shawn</span>{' '}
                      performance in Math is below the threshold.
                    </p>
                    <span>Just Now</span>
                  </div>
                </div>
              </Link>
            </div>
            {/* Other notification items... */}
          </div>
        </div>
        <div className='d-flex p-0'>
          <Link to='#' className='btn btn-light w-100 me-2'>
            Cancel
          </Link>
          <Link to={routes.activity} className='btn btn-primary w-100'>
            View All
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
