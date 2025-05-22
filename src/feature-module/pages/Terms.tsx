import React from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const Terms = () => {
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
                    Terms and Conditions for Bothell Basketball camp
                  </h1>
                  <h5 className='mb-2 text-center'>
                    These Terms and Conditions (“Terms”) govern your child’s
                    participation in the Bothell Basketball camp (the “Camp”).
                    By registering for and participating in the Camp, you agree
                    to be bound by these Terms.
                  </h5>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Registration and Payment</h2>
                  <ul>
                    <li className='mb-2'>
                      <strong>Registration:</strong> To participate in the Camp,
                      you must complete the registration process and provide
                      accurate and complete information about yourself or the
                      participant you are registering.
                    </li>
                    <li className='mb-2'>
                      <strong>Payment:</strong> Payment for the Camp must be
                      made in full at the time of registration, unless otherwise
                      specified by us. We accept [payment methods accepted].
                    </li>
                    <li className='mb-2'>
                      <strong>Cancellation and Refunds:</strong> Cancellation
                      requests must be submitted in writing [number of days]
                      days prior to the start of the Camp. Refunds will be
                      issued according to the following schedule: [refund
                      schedule].
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>
                    Participant Conduct and Responsibilities
                  </h2>
                  <ul>
                    <li className='mb-2'>
                      <strong>Code of Conduct:</strong> Participants are
                      expected to conduct themselves in a respectful and
                      sportsmanlike manner at all times during the Camp. Any
                      behavior deemed inappropriate, including but not limited
                      to bullying, harassment, or violence, may result in
                      immediate dismissal from the Camp without refund.
                    </li>
                    <li className='mb-2'>
                      <strong>Supervision:</strong> Participants are required to
                      adhere to the schedule and rules established by the Camp
                      staff. Participants are not allowed to leave the Camp
                      premises during scheduled activities without permission
                      from Camp staff.
                    </li>
                    <li className='mb-2'>
                      <strong>Health and Safety:</strong> Participants must
                      comply with all health and safety guidelines and
                      instructions provided by Camp staff. Participants with
                      pre-existing medical conditions or allergies must inform
                      Camp staff in advance and may be required to provide a
                      medical clearance to participate in certain activities.
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Liability and Release</h2>
                  <ul>
                    <li className='mb-2'>
                      <strong>Assumption of Risk:</strong> Participation in the
                      Camp involves certain inherent risks, including but not
                      limited to the risk of injury. By participating in the
                      Camp, you acknowledge and accept these risks.
                    </li>
                    <li className='mb-2'>
                      <strong>Release of Liability:</strong> To the fullest
                      extent permitted by law, you release and discharge Bothell
                      Basketball camp, its officers, directors, employees, and
                      agents from any and all claims, liabilities, damages, or
                      expenses arising out of or in connection with your
                      participation in the Camp.
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Intellectual Property</h2>
                  <ul>
                    <li className='mb-2'>
                      <strong>Ownership:</strong> All intellectual property
                      rights related to the Camp, including but not limited to
                      logos, designs, and materials, are owned by Bothell
                      Basketball camp or its licensors.
                    </li>
                    <li className='mb-2'>
                      <strong>Use of Likeness:</strong> By participating in the
                      Camp, you grant Bothell Basketball camp the right to use
                      your name, likeness, and image in promotional materials
                      related to the Camp without compensation.
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Miscellaneous</h2>
                  <ul>
                    <li className='mb-2'>
                      <strong>Severability:</strong> If any provision of these
                      Terms is found to be invalid or unenforceable, the
                      remaining provisions will remain in full force and effect.
                    </li>
                    <li className='mb-2'>
                      <strong>Governing Law:</strong> These Terms are governed
                      by the laws of [jurisdiction]. Any disputes arising out of
                      or in connection with these Terms shall be resolved
                      exclusively by the courts of [jurisdiction].
                    </li>
                    <li className='mb-2'>
                      <strong>Changes to Terms:</strong> We reserve the right to
                      modify or update these Terms at any time. Any changes will
                      be effective immediately upon posting the updated Terms on
                      our website.
                    </li>
                  </ul>
                </div>
                <div className='p-2'>
                  <h2 className='mb-2'>Contact Us</h2>
                  <p className='mb-0'>
                    If you have any questions or concerns about these Terms and
                    Conditions,please send us an{' '}
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

export default Terms;
