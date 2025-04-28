import ImageWithBasePath from '../../core/common/imageWithBasePath';
import { Link } from 'react-router-dom';

const HomeModals = () => {
  return (
    <>
      {/* Login Details */}
      <div className='modal fade' id='login_detail'>
        <div className='modal-dialog modal-dialog-centered  modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h4 className='modal-title'>'25 Bothell Select Summer Camp</h4>
              <button
                type='button'
                className='btn-close custom-btn-close'
                data-bs-dismiss='modal'
                aria-label='Close'
              >
                <i className='ti ti-x' />
              </button>
            </div>
            <div className='modal-body'>
              <div className='home-detail-info'>
                <span className='d-block me-4 mb-2 layout-img'>
                  <ImageWithBasePath
                    src='assets/img/logo-small.png'
                    alt='Img'
                  />
                </span>
                <div className='name-info'>
                  <h4>
                    Bothell Select is pleased to offer Basketball Summer
                    Training Program for all boys and girls currently attending
                    3rd thru 12th grade.
                  </h4>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info'>
                  <h5 className='mb-2'>
                    <i className='ti ti-calendar-bolt me-2' />
                    Camp Dates: June 30th – August 29th -- 9 action-packed weeks
                    of training!
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-calendar-smile me-2' />
                    Days: Monday thru Friday
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-location me-2' />
                    Where: Bothell HS, Canyon Park MS, and/or Kenmore MS
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-clock me-2' />
                    Time: 11am till 12:30pm for younger kids
                    <br />
                    <span
                      className='ms-4'
                      style={{
                        fontSize: '13px',
                        maxWidth: '550px',
                        display: 'inline-block',
                      }}
                    >
                      Note: we will try to provide organized basketball from
                      12:30pm till 1:30pm after the training session; so parents
                      can leave kids from 11am till 2pm to play basketball or
                      choose to pick them up at 12:30pm
                    </span>
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-clock me-2' />
                    Time: 12:30pm till 2pm for older kids
                    <br />
                    <span
                      className='ms-4'
                      style={{
                        fontSize: '13px',
                        maxWidth: '550px',
                        display: 'inline-block',
                      }}
                    >
                      Note: we will try to provide organized basketball from 2pm
                      till 3pm after the training session; so parents can leave
                      kids from 12:30pm till 3pm or choose to pick them up at
                      2pm
                    </span>
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-user me-2' />
                    Organizers: Armend Kahrimanovic and Zlatko Savovic
                    <br />
                    <span
                      className='ms-4'
                      style={{
                        fontSize: '13px',
                        maxWidth: '550px',
                        display: 'inline-block',
                      }}
                    >
                      Former D1 basketball players and European Professional
                      basketball players will be supported by Bothell High
                      School former and current Basketball Players
                    </span>
                  </h5>
                </div>
              </div>
              <div className='table-responsive custom-table no-datatable_length'>
                <table className='table datanew'>
                  <thead className='thead-light'>
                    <tr>
                      <th>Times / Week</th>
                      <th>Duration</th>
                      <th>Price</th>
                      <th>Early-Bird Special</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>3 times per week</td>
                      <td>9 weeks</td>
                      <td>$625.00</td>
                      <td>$550.00 (Available untill May 30th)</td>
                    </tr>
                    <tr>
                      <td>4 times per week</td>
                      <td>9 weeks</td>
                      <td>$835.00</td>
                      <td>$760.00 (Available untill May 30th)</td>
                    </tr>
                    <tr>
                      <td>5 times per week</td>
                      <td>9 weeks</td>
                      <td>$1045.00</td>
                      <td>$970.00 (Available untill May 30th)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className='modal-footer'>
              <Link
                to='#'
                className='btn btn-light me-2'
                data-bs-dismiss='modal'
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Login Details */}
    </>
  );
};

export default HomeModals;
