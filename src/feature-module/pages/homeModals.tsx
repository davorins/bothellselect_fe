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
              <h4 className='modal-title'>
                Fall '25, Partizan Basketball Training
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
                    Partizan is pleased to offer Basketball Fall Training
                    Program for all boys and girls currently attending 3rd thru
                    12th grade.
                  </h4>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info'>
                  <h5 className='mb-2'>
                    <i className='ti ti-calendar-bolt me-2' />
                    Camp Dates: September 8th – October 31st -- 8 action-packed
                    weeks of training!
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-calendar-smile me-2' />
                    Days: Monday, Wednesday, and Friday
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-location me-2' />
                    Where: Canyon Park Middle School
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-clock me-2' />
                    Time: 6:00pm till 7:30pm -- grades 6th and under | Monday
                    and Wednesday
                    <br />
                    <span
                      className='ms-4'
                      style={{
                        fontSize: '13px',
                        maxWidth: '550px',
                        display: 'inline-block',
                      }}
                    >
                      Note: these are the primary trainings sessions
                    </span>
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-clock me-2' />
                    Time: 7:30pm till 9:00pm -- grades 6th & higher | Monday and
                    Wednesday
                    <br />
                    <span
                      className='ms-4'
                      style={{
                        fontSize: '13px',
                        maxWidth: '550px',
                        display: 'inline-block',
                      }}
                    >
                      Note: these are the primary trainings sessions
                    </span>
                  </h5>
                  <h5 className='mb-2'>
                    <i className='ti ti-clock me-2' />
                    Time: 5:30pm to 7pm (Fridays)
                    <br />
                    <span
                      className='ms-4'
                      style={{
                        fontSize: '13px',
                        maxWidth: '550px',
                        display: 'inline-block',
                      }}
                    >
                      Note: For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2 times per week</td>
                      <td>8 weeks</td>
                      <td>$450.00</td>
                    </tr>
                    <tr>
                      <td>3 times per week</td>
                      <td>8 weeks</td>
                      <td>$600.00</td>
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
              <h4 className='modal-title'>'25 Fall Training Schedule</h4>
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
              <div className='home-detail-info mt-2'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 1</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, Sep 8 and Wednesday, Sep
                      10
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, September 12
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 7:00pm
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
                  <h4 className='mb-2'>📅 WEEK 2</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, September 15
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, September 19
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 9:00pm
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
              </div>
              <div className='home-detail-info'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 3</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, September 22
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:30pm till 8:00pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>8:00pm till 9:30pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Wednesday, September 24
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, September 26
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 9:00pm
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
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, September 29
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:30pm till 8:00pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>8:00pm till 9:30pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Wednesday, October 1
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, October 3
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 9:00pm
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
              </div>
              <div className='home-detail-info'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 5</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, October 6 and Wednesday,
                      October 8
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, October 10
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 9:00pm
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
                  <h4 className='mb-2'>📅 WEEK 6</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, October 13 and Wednesday,
                      October 15
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, October 17
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2
                      sessions/week kids who missed or can’t attend Monday or
                      Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 9:00pm
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
              </div>
              <div className='home-detail-info'>
                <div className='name-info me-5'>
                  <h4 className='mb-2'>📅 WEEK 7</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, October 20 and Wednesday,
                      October 22
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Friday, October 24
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      For kids enrolled in 3 sessions/week, and for 2<br />
                      sessions/week kids who missed or can’t attend Monday
                      <br />
                      or Wednesday.
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>5:30pm till 9:00pm
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
                  <h4 className='mb-2'>📅 WEEK 8</h4>
                  <ul>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Monday, October 27
                    </li>
                    <li className='mb-1'>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:30pm till 8:00pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>8:00pm till 9:30pm
                      </ol>
                    </li>
                    <li className='mb-1'>
                      <strong>Dates:</strong> Wednesday, October 29
                    </li>
                    <li>
                      <strong>Time:</strong>
                      <br />
                      Grades: 6th and Under
                      <ol className='ms-4 mb-1'>
                        <i className='ti ti-clock me-1'></i>6:00pm till 7:30pm
                      </ol>
                      Grades: 6th and Higher
                      <ol className='ms-4'>
                        <i className='ti ti-clock me-1'></i>7:30pm till 9:00pm
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

      {/* Waiver */}
      <div className='modal fade' id='waiver'>
        <div className='modal-dialog modal-dialog-centered  modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h4 className='modal-title'>
                Partizan Basketball Camp Waiver and Release of Liability
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
                    discharge, and hold harmless Partizan, its directors,
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

      {/* Waiver */}
      <div className='modal fade' id='tournament-waiver'>
        <div className='modal-dialog modal-dialog-centered modal-lg'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h4 className='modal-title'>
                Winter Classic Tournament Waiver and Release of Liability
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
                    In consideration of my team's participation in the Winter
                    Classic Tournament, I, as the coach or team representative,
                    acknowledge and agree to the following:
                  </h4>
                </div>
              </div>
              <div className='home-detail-info'>
                <div className='name-info'>
                  By checking the box below, I, as the coach or team
                  representative, confirm that I am authorized to register this
                  team and its players for the Winter Classic Tournament. I
                  acknowledge and accept that participation in basketball
                  carries inherent risks of injury, and on behalf of myself, my
                  team, and all team members (including players, parents, and
                  guardians), I assume full responsibility for such risks. I
                  release and hold harmless Partizan, its staff, volunteers,
                  facilities, and sponsors from any liability, claims, or
                  demands arising out of participation in the tournament,
                  including but not limited to injuries, accidents, or
                  illnesses. I confirm that I have communicated these risks to
                  all parents/guardians of the players on my team and have
                  obtained their consent for participation. I also grant
                  permission for photos and videos of the team and its players
                  taken during the event to be used by Partizan for promotional
                  purposes. By checking the box, I confirm that I have read,
                  understood, and agreed to this waiver and release of liability
                  on behalf of my team and its members.
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
