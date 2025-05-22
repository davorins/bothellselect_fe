import React from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const PrivacyPolicy = () => {
  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div>
                <ImageWithBasePath
                  src='assets/img/authentication/authentication.png'
                  alt='Img'
                />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='ourteam-page'>
                <div className='p-4'>
                  <h1 className='mb-4 text-center'>
                    Privacy Policy for Bothell Basketball Camp
                  </h1>
                  <h5 className='mb-2 text-center'>
                    This Privacy Policy describes how Bothell Basketball camp
                    collects, uses, and shares personal information when you use
                    our basketball camp services.
                  </h5>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Information We Collect</h2>
                  <p className='mb-2'>
                    We collect personal information you provide directly to us
                    when you register for our basketball camp. This information
                    may include:
                  </p>
                  <ul>
                    <li className='mb-2'>Participant’s name</li>
                    <li className='mb-2'>Participant’s age</li>
                    <li className='mb-2'>Parent or guardian’s name</li>
                    <li className='mb-2'>
                      Contact information (e.g., email address, phone number)
                    </li>
                    <li className='mb-2'>Emergency contact information</li>
                    <li className='mb-2'>
                      Medical information relevant to the participant’s
                      participation in the camp
                    </li>
                    <li className='mb-2'>
                      Dietary restrictions or food allergies
                    </li>
                    <li className='mb-2'>
                      Any other information necessary for the provision of our
                      Services
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>How We Use Your Information</h2>
                  <p className='mb-2'>
                    We may use the personal information we collect for the
                    following purposes:
                  </p>
                  <ul>
                    <li className='mb-2'>
                      To register participants for the basketball camp
                    </li>
                    <li className='mb-2'>
                      To communicate with participants and their parents or
                      guardians regarding camp-related information, updates, and
                      activities
                    </li>
                    <li className='mb-2'>
                      To ensure the safety and well-being of participants during
                      the camp
                    </li>
                    <li className='mb-2'>
                      To provide medical care or assistance if needed
                    </li>
                    <li className='mb-2'>
                      To respond to inquiries, concerns, or requests related to
                      the camp
                    </li>
                    <li className='mb-2'>
                      To improve and enhance our basketball summer camp services
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Information Sharing</h2>
                  <p className='mb-2'>
                    We do not sell, trade, or otherwise transfer your personal
                    information to third parties without your consent, except as
                    described in this Privacy Policy. We may share personal
                    information with:
                  </p>
                  <ul>
                    <li className='mb-2'>
                      Our staff members and volunteers who need access to such
                      information to facilitate the basketball camp
                    </li>
                    <li className='mb-2'>
                      Service providers or third parties who assist us in
                      operating our camp, such as medical personnel, catering
                      services, or transportation providers
                    </li>
                    <li className='mb-2'>
                      Law enforcement or government authorities when required by
                      law or to protect our rights, property, or safety, or the
                      rights, property, or safety of others
                    </li>
                    <li className='mb-2'>
                      Other parties with your consent or at your direction
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Data Security</h2>
                  <p className='mb-2'>
                    We take reasonable measures to protect the personal
                    information we collect from unauthorized access, disclosure,
                    alteration, or destruction. However, please be aware that no
                    method of transmission over the internet or electronic
                    storage is 100% secure, and we cannot guarantee absolute
                    security.
                  </p>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Changes to this Privacy Policy</h2>
                  <p className='mb-2'>
                    We may update this Privacy Policy from time to time. Any
                    changes will be posted on this page, and the date of the
                    last update will be indicated at the top of the policy.
                  </p>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Contact Us</h2>
                  <p className='mb-0'>
                    If you have any questions or concerns about this Privacy
                    Policy or our practices regarding your personal information,
                    please send us an{' '}
                    <a href='mailto:bothellselect@proton.me'>email</a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
