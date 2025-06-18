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
                      {/* <th>Early-Bird Special</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>3 times per week</td>
                      <td>9 weeks</td>
                      <td>$625.00</td>
                      {/* <td>$550.00 (Available untill May 30th)</td> */}
                    </tr>
                    <tr>
                      <td>4 times per week</td>
                      <td>9 weeks</td>
                      <td>$835.00</td>
                      {/* <td>$760.00 (Available untill May 30th)</td> */}
                    </tr>
                    <tr>
                      <td>5 times per week</td>
                      <td>9 weeks</td>
                      <td>$1045.00</td>
                      {/* <td>$970.00 (Available untill May 30th)</td> */}
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

      {/* Schedule */}
      <div className='modal fade' id='schedule'>
        <div className='modal-dialog modal-dialog-centered  modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h4 className='modal-title'>
                Bothell Select Basketball 2025 Camp Schedule
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
              <div className='home-detail-info mt-3'>
                <div className='name-info ms-5 me-5'>
                  <div className='content content-two'>
                    <div className='card-header'>
                      <h4 className='mb-4 bg-outline-warning d-flex'>
                        Important Camp Update – Please Read Carefully
                      </h4>
                      <p>
                        <strong>
                          We have not been able to reserve a basketball gym for
                          Week 9 due to school activities.
                        </strong>
                        <br />
                        We suggest the following course of action based on your
                        child’s training schedule:
                      </p>
                      <ul>
                        <li className='mb-2'>
                          <strong>3x/week trainees:</strong> You may attend{' '}
                          <u>one extra session</u> during any of the four
                          available weeks (for a total of 4 sessions/week). This
                          will make up for the missed Week 9.
                        </li>
                        <li className='mb-2'>
                          <strong>4x/week trainees:</strong> You will receive a{' '}
                          <strong>15% refund</strong> via Zelle. Please send us
                          your Zelle info (email or phone number), or provide
                          your mailing address if you prefer a check.
                        </li>
                        <li className='mb-2'>
                          <strong>5x/week trainees:</strong> You will receive a{' '}
                          <strong>32% refund</strong> via Zelle. Please send us
                          your Zelle info (email or phone number), or provide
                          your mailing address if you prefer a check.
                        </li>
                      </ul>
                      <h5 className='mt-2'>✅ Reminders</h5>
                      <ul className='ms-4 mb-3'>
                        <li>
                          Please arrive <strong>5 minutes before</strong> the
                          official start time. Do not drop kids off earlier.
                        </li>
                        <li>
                          Bring only a <strong>water bottle</strong> – no sports
                          drinks or food allowed.
                        </li>
                        <li>
                          Each participant must bring a{' '}
                          <strong>basketball</strong> and a{' '}
                          <strong>reversible jersey</strong>.
                        </li>
                      </ul>
                      <p className='mb-3'>
                        Thank you for your understanding and cooperation!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className='home-detail-info mt-2'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 1</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> June 30th, July 1st, July 2nd
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Kenmore Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>20323 66th Ave NE,
                        Kenmore, WA 98028
                      </ol>
                    </li>
                  </ul>
                </div>
                <div className='name-info'>
                  <h4 className='mb-2'>📅 WEEK 2</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> July 7th - July 10th
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Kenmore Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>20323 66th Ave NE,
                        Kenmore, WA 98028
                      </ol>
                    </li>
                  </ul>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 3</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> July 14th - July 17th
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Canyon Park Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>23723 23rd Ave SE,
                        Bothell, WA 98021
                      </ol>
                    </li>
                  </ul>
                </div>
                <div className='name-info'>
                  <h4 className='mb-2'>📅 WEEK 4</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> July 21st - July 24th
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Skyview Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>21404 35th Ave SE,
                        Bothell, WA 98021
                      </ol>
                    </li>
                  </ul>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 5</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> July 28th - July 31st
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Kenmore Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>20323 66th Ave NE,
                        Kenmore, WA 98028
                      </ol>
                    </li>
                  </ul>
                </div>
                <div className='name-info'>
                  <h4 className='mb-2'>📅 WEEK 6</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> August 4th - August 7th
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Kenmore Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>20323 66th Ave NE,
                        Kenmore, WA 98028
                      </ol>
                    </li>
                  </ul>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 7</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> August 11th - August 14th
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Kenmore Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>20323 66th Ave NE,
                        Kenmore, WA 98028
                      </ol>
                    </li>
                  </ul>
                </div>
                <div className='name-info'>
                  <h4 className='mb-2'>📅 WEEK 8</h4>
                  <ul>
                    <li className='mb-2'>
                      <strong>Dates:</strong> August 18th - August 21st
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      4th thru 6th grade (boys & girls)
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>11am till 12:30pm
                        <br />
                        Optional: leave kids till 1:30pm for extra play
                      </ol>
                      7th thru 11th grade (boys & girls)
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>12:30pm till 2pm
                        <br />
                        Optional: leave kids till 3:00pm for extra play
                      </ol>
                    </li>
                    <li>
                      <strong>Location:</strong>
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-school me-1'></i>Kenmore Middle
                        School
                      </ol>
                      <ol className='ms-4'>
                        <i className='ti ti-map-pin me-1'></i>20323 66th Ave NE,
                        Kenmore, WA 98028
                      </ol>
                    </li>
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
      {/* /Schedule */}
    </>
  );
};

export default HomeModals;
