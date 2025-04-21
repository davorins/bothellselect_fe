import React from 'react';
import { useNavigate } from 'react-router-dom';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const AboutUsPage = () => {
  const navigate = useNavigate();

  const teamPageClick = () => {
    navigate('/our-team');
  };

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
                <ImageWithBasePath src='assets/img/aboutus.png' alt='Img' />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='about-page'>
                <div className='mx-auto p-4'>
                  <h1 className='mb-4 text-center'>Welcome!</h1>
                  <h5 className='mb-4 text-center'>
                    You are at the place where passion for basketball meets the
                    joy of learning and growth. Established with the aim of
                    providing aspiring young athletes with a platform to develop
                    their skills, foster teamwork, and cultivate a love for the
                    game, our basketball camp is a place where dreams are
                    nurtured and champions are made.
                  </h5>
                  <div className='align-items-center text-center mb-5'>
                    <button
                      onClick={teamPageClick}
                      className='btn btn-primary me-2'
                    >
                      Our Team
                    </button>
                  </div>
                  <h2 className='mb-2 text-center'>Our Mission…</h2>
                  <p className='mb-2'>
                    At Bothell Basketball camp, our mission is simple yet
                    profound: to inspire and empower young basketball players to
                    reach their full potential, both on and off the court. We
                    believe that basketball is more than just a sport; it’s a
                    vehicle for personal growth, character development, and
                    lifelong friendships.
                  </p>
                  <p className='mb-5'>
                    Through expert coaching, comprehensive skill development
                    programs, and a supportive community environment, we strive
                    to create an unforgettable experience that leaves a lasting
                    impact on every camper.
                  </p>
                  <h2 className='mb-2 text-center'>What Sets Us Apart</h2>
                  <ul className='mb-5'>
                    <li className='mb-2'>
                      <strong>Expert Coaching:</strong> Our camp is led by a
                      team of experienced coaches who are passionate about
                      basketball and dedicated to helping each camper excel.
                      With a focus on individualized instruction and skill
                      development, our coaches bring a wealth of knowledge and
                      expertise to every session.
                    </li>
                    <li className='mb-2'>
                      <strong>Comprehensive Curriculum:</strong> We offer a
                      comprehensive curriculum designed to cater to players of
                      all skill levels, from beginners to advanced. Whether
                      you’re learning the basics or honing advanced techniques,
                      our camp provides a structured program that covers all
                      aspects of the game, including shooting, ball-handling,
                      defense, teamwork, and more.
                    </li>
                    <li className='mb-2'>
                      <strong>Positive Environment:</strong> We prioritize
                      creating a positive and inclusive environment where
                      campers feel supported, encouraged, and motivated to learn
                      and grow. Our camp is not just about improving basketball
                      skills; it’s also about building confidence, fostering
                      friendships, and instilling values of sportsmanship,
                      respect, and teamwork.
                    </li>
                    <li className='mb-2'>
                      <strong>Fun and Engaging Activities:</strong> In addition
                      to basketball training, our camp features a variety of fun
                      and engaging activities designed to enhance the overall
                      camp experience. From team-building exercises to friendly
                      competitions and exciting challenges, there’s never a dull
                      moment at our camp.
                    </li>
                  </ul>
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

export default AboutUsPage;
