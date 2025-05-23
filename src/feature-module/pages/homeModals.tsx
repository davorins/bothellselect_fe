import ImageWithBasePath from '../../core/common/imageWithBasePath';
import { Link } from 'react-router-dom';

const HomeModals = () => {
  return (
    <>
      {/* Pricing Details */}
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
                Close
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Pricing Details */}

      {/* Waiver */}
      <div className='modal fade' id='waiver'>
        <div className='modal-dialog modal-dialog-centered  modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h4 className='modal-title'>
                Bothell Select Basketball Camp Waiver and Release of Liability
              </h4>
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
                    In consideration of my child’s participation in the Bothell
                    Select Basketball Camp ("Camp"), I, as the parent or legal
                    guardian, acknowledge and agree to the following:
                  </h4>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info'>
                  <ul className='mb-2'>
                    <li className='me-2' />
                    <strong>Acknowledgment of Risk: </strong>I understand that
                    participation in basketball and camp activities involves
                    risk of injury, including but not limited to sprains,
                    fractures, concussions, and in rare cases, serious injury or
                    death. I voluntarily assume all such risks on behalf of my
                    child.
                    <li className='me-2' />
                    <strong>Release and Waiver: </strong>I hereby release,
                    discharge, and hold harmless Bothell Select, its directors,
                    coaches, staff, volunteers, sponsors, and affiliates from
                    any and all liability, claims, demands, or causes of action
                    that may arise from my child’s participation in the Camp,
                    whether caused by negligence or otherwise.
                    <li className='me-2' />
                    <strong>Medical Authorization: </strong>In the event of an
                    emergency where I cannot be reached, I authorize Camp staff
                    to seek and secure any necessary medical treatment for my
                    child, and I accept financial responsibility for such
                    treatment.
                    <li className='me-2' />
                    <strong>Photo and Media Release: </strong>I grant permission
                    for photos and videos taken during Camp activities, which
                    may include my child, to be used for promotional purposes,
                    including social media, websites, and marketing materials.
                    <li className='me-2' />
                    <strong>Behavioral Expectations: </strong>I acknowledge that
                    my child must follow all Camp rules and instructions.
                    Disruptive or unsafe behavior may result in dismissal from
                    the Camp without refund.
                    <li className='me-2' />
                    <strong>Refund Policy: </strong>I understand that
                    registration fees are non-refundable after Septtember 1st
                    unless due to medical reasons verified by a physician.
                  </ul>
                </div>
              </div>
            </div>
            <div className='modal-footer'>
              <Link
                to='#'
                className='btn btn-light me-2'
                data-bs-dismiss='modal'
              >
                Close
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* /Waiver */}
    </>
  );
};

export default HomeModals;
