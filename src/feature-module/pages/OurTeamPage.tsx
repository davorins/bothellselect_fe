import React from 'react';
import { useNavigate } from 'react-router-dom';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const OurTeamPage = () => {
  const navigate = useNavigate();

  const handleRegisterClick = () => {
    navigate('/home-page');
  };

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div>
                <ImageWithBasePath src='assets/img/ourteam.png' alt='Img' />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='ourteam-page'>
                <div className='mx-auto p-4'>
                  <h1 className='mb-4 text-center'>Our Team and Coaches</h1>
                  <h5 className='mb-5 text-center'>
                    At Bothell Select, we take pride in assembling a team of
                    dedicated and experienced coaches who are passionate about
                    basketball and committed to providing an enriching
                    experience for all participants. Our coaches bring a wealth
                    of knowledge, skills, and enthusiasm to each session,
                    ensuring that every player receives top-notch instruction
                    and guidance.
                  </h5>
                  <h2 className='mb-2 text-center'>Our Coaching Philosophy</h2>
                  <p className='mb-2'>
                    At Bothell Select, we believe that basketball is more than
                    just a game – it’s an opportunity for growth, development,
                    and personal excellence. Our coaching philosophy is grounded
                    in the following principles:
                  </p>
                  <ul className='mb-5'>
                    <li className='mb-2'>
                      <strong>Skill Development:</strong> We prioritize
                      individual skill development in all aspects of the game,
                      including shooting, ball-handling, passing, defense, and
                      more.
                    </li>
                    <li className='mb-2'>
                      <strong>Teamwork and Collaboration:</strong> We emphasize
                      the importance of teamwork, communication, and
                      collaboration both on and off the court. Campers learn to
                      work together, support each other, and celebrate success
                      as a team.
                    </li>
                    <li className='mb-2'>
                      <strong>Sportsmanship and Respect:</strong> We instill
                      values of sportsmanship, respect, and integrity in our
                      campers, teaching them to compete with honor and respect
                      for their opponents, coaches, and officials.
                    </li>
                    <li className='mb-2'>
                      <strong>Fun and Positive Environment:</strong> We believe
                      that learning and improvement are most effective in a fun,
                      positive, and supportive environment. Our coaches strive
                      to create an atmosphere where campers feel motivated,
                      encouraged, and inspired to do their best.
                    </li>
                  </ul>
                  <h2 className='mb-2 text-center'>
                    Join Us for an Unforgettable Experience!
                  </h2>
                  <p className='mb-2'>
                    Whether your child is a beginner looking to learn the
                    fundamentals of basketball or an experienced player seeking
                    to take his game to the next level, Bothell Select is the
                    perfect place for your kiddo. Enroll your child today for an
                    unforgettable basketball experience led by our team of
                    dedicated coaches.
                  </p>
                  <p className='mb-5'>
                    For more information about our coaching staff, camp
                    sessions, and registration details, please contact us at{' '}
                    <a href='mailto:bothellselect@proton.me'>
                      bothellselect@proton.me
                    </a>
                  </p>
                  <h2 className='mb-2 text-center'>Join Us!</h2>
                  <p className='mb-2'>
                    Join us at our camp for an unforgettable basketball
                    experience. Come be a part of our vibrant community, learn
                    from expert coaches, make new friends, and take your
                    basketball skills to new heights!
                  </p>
                  <p className='mb-4'>
                    For more information about our camp programs, coaching
                    staff, registration details, and upcoming sessions, please
                    explore our website or contact us directly. We can’t wait to
                    welcome you to our family!
                  </p>
                  <div className='align-items-center text-center mb-5'>
                    <button
                      onClick={handleRegisterClick}
                      className='btn btn-primary me-2'
                    >
                      Signup Now
                    </button>
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

export default OurTeamPage;
