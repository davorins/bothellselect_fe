import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const Notificationssettings = () => {
  const routes = all_routes;
  return (
    <div>
      <div className='page-wrapper'>
        <div className='content'>
          <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
            <div className='my-auto mb-2'>
              <h3 className='page-title mb-1'>General Settings</h3>
              <nav>
                <ol className='breadcrumb mb-0'>
                  <li className='breadcrumb-item'>
                    <Link to='index'>Dashboard</Link>
                  </li>
                  <li className='breadcrumb-item'>
                    <Link to='#'>Settings</Link>
                  </li>
                  <li className='breadcrumb-item active' aria-current='page'>
                    General Settings
                  </li>
                </ol>
              </nav>
            </div>
            <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
              <div className='pe-1 mb-2'>
                <OverlayTrigger
                  placement='top'
                  overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
                >
                  <Link
                    to='#'
                    className='btn btn-outline-light bg-white btn-icon me-1'
                  >
                    <i className='ti ti-refresh' />
                  </Link>
                </OverlayTrigger>
              </div>
            </div>
          </div>
          <div className='row'>
            <div className='col-xxl-2 col-xl-3'>
              <div className='pt-3 d-flex flex-column list-group mb-4'>
                <Link
                  to={routes.profilesettings}
                  className='d-block rounded p-2'
                >
                  Profile Settings
                </Link>
                <Link
                  to={routes.securitysettings}
                  className='d-block rounded p-2'
                >
                  Security Settings
                </Link>
                <Link
                  to={routes.notificationssettings}
                  className='d-block rounded active p-2'
                >
                  Notifications
                </Link>
              </div>
            </div>
            <div className='col-xxl-10 col-xl-9'>
              <div className='flex-fill border-start ps-3'>
                <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom mb-3 pt-3'>
                  <div className='mb-3'>
                    <h5>Notifications</h5>
                    <p>
                      Get notification what happening right now, you can turn
                      off at any time
                    </p>
                  </div>
                </div>
                <div className='d-block'>
                  <div className='card border-0 p-3 pb-0 mb-3 rounded'>
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Email Notifications</h6>
                        <p>
                          Bothell Select can send you email notifications for
                          any new direct messages
                        </p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-check-md'>
                          <input className='form-check-input' type='checkbox' />
                        </div>
                      </div>
                    </div>
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>News and Update Settings</h6>
                        <p>
                          Stay informed with the latest announcements and
                          updates from Bothell Select
                        </p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-check-md'>
                          <input className='form-check-input' type='checkbox' />
                        </div>
                      </div>
                    </div>
                    <div className='d-flex justify-content-between align-items-center flex-wrap mb-0'>
                      <div className='mb-3'>
                        <h6>Offers &amp; Promotions</h6>
                        <p>
                          Stay updated on special deals, package pricing, and
                          the latest discounts for our basketball camps.
                        </p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-check-md'>
                          <input className='form-check-input' type='checkbox' />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notificationssettings;
