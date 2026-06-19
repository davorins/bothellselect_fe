import React, { useState, useEffect } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './Terms.css';

const Terms = () => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/theme/player9_1.png';
    img.onload = () => {
      setIsImageLoaded(true);
    };

    const timer = setTimeout(() => {
      setIsImageLoaded(true);
    }, 500);

    // Mouse move effect for parallax
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className='terms-white-container'>
      {/* Background Image with dramatic entrance */}
      <div
        className={`terms-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='terms-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/bg/bg_terms.png'
            alt='Background'
            className='terms-bg-img'
          />
        </div>
        <div className='terms-bg-overlay' />
        <div className='terms-bg-gradient-overlay' />
      </div>

      {/* Floating particles */}
      <div className='terms-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='terms-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='terms-content-wrapper-white'>
        <div className='terms-grid-white'>
          {/* Left column - Image */}
          <div className='terms-image-col'>
            <div className='terms-image-card'>
              {/* <div className='terms-image-glass'>
                <div className='terms-image-glow' />
                <ImageWithBasePath
                  src='assets/img/authentication/authentication.png'
                  alt='Terms & Conditions'
                  className='terms-img'
                />
              </div>
              <div className='terms-image-badge'>
                <i className='ti ti-file-description' />
                <span>
                  Terms & Conditions
                  <br />
                  Please Read Carefully
                </span>
              </div> */}
            </div>
          </div>

          {/* Right column - Terms Content */}
          <div className='terms-content-col'>
            <div className='terms-card-white'>
              <div className='terms-header-white'>
                <div className='terms-header-icon-white'>
                  <i className='ti ti-file-text' />
                </div>
                <h1>Terms and Conditions</h1>
                <p>
                  These Terms and Conditions ("Terms") govern your child's
                  participation in the Bothell Select camp (the "Camp"). By
                  registering for and participating in the Camp, you agree to be
                  bound by these Terms.
                </p>
              </div>

              <div className='terms-sections'>
                {/* Registration and Payment */}
                <div className='terms-section'>
                  <h2>
                    <i className='ti ti-credit-card' />
                    Registration and Payment
                  </h2>
                  <ul>
                    <li>
                      <strong>Registration:</strong> To participate in the Camp,
                      you must complete the registration process and provide
                      accurate and complete information about yourself or the
                      participant you are registering.
                    </li>
                    <li>
                      <strong>Payment:</strong> Payment for the Camp must be
                      made in full at the time of registration, unless otherwise
                      specified by us. We accept major credit cards, debit
                      cards, and electronic bank transfers.
                    </li>
                    <li>
                      <strong>Cancellation and Refunds:</strong> Cancellation
                      requests must be submitted in writing 14 days prior to the
                      start of the Camp. Refunds will be issued according to the
                      following schedule: Full refund (minus processing fee) if
                      cancelled 14+ days before camp, 50% refund if cancelled
                      7-13 days before camp, no refund if cancelled less than 7
                      days before camp.
                    </li>
                  </ul>
                </div>

                {/* Participant Conduct and Responsibilities */}
                <div className='terms-section'>
                  <h2>
                    <i className='ti ti-users' />
                    Participant Conduct and Responsibilities
                  </h2>
                  <ul>
                    <li>
                      <strong>Code of Conduct:</strong> Participants are
                      expected to conduct themselves in a respectful and
                      sportsmanlike manner at all times during the Camp. Any
                      behavior deemed inappropriate, including but not limited
                      to bullying, harassment, or violence, may result in
                      immediate dismissal from the Camp without refund.
                    </li>
                    <li>
                      <strong>Supervision:</strong> Participants are required to
                      adhere to the schedule and rules established by the Camp
                      staff. Participants are not allowed to leave the Camp
                      premises during scheduled activities without permission
                      from Camp staff.
                    </li>
                    <li>
                      <strong>Health and Safety:</strong> Participants must
                      comply with all health and safety guidelines and
                      instructions provided by Camp staff. Participants with
                      pre-existing medical conditions or allergies must inform
                      Camp staff in advance and may be required to provide a
                      medical clearance to participate in certain activities.
                    </li>
                  </ul>
                </div>

                {/* Liability and Release */}
                <div className='terms-section'>
                  <h2>
                    <i className='ti ti-shield' />
                    Liability and Release
                  </h2>
                  <ul>
                    <li>
                      <strong>Assumption of Risk:</strong> Participation in the
                      Camp involves certain inherent risks, including but not
                      limited to the risk of injury. By participating in the
                      Camp, you acknowledge and accept these risks.
                    </li>
                    <li>
                      <strong>Release of Liability:</strong> To the fullest
                      extent permitted by law, you release and discharge Bothell
                      Select Basketball camp, its officers, directors,
                      employees, and agents from any and all claims,
                      liabilities, damages, or expenses arising out of or in
                      connection with your participation in the Camp.
                    </li>
                  </ul>
                </div>

                {/* Intellectual Property */}
                <div className='terms-section'>
                  <h2>
                    <i className='ti ti-copyright' />
                    Intellectual Property
                  </h2>
                  <ul>
                    <li>
                      <strong>Ownership:</strong> All intellectual property
                      rights related to the Camp, including but not limited to
                      logos, designs, and materials, are owned by Bothell Select
                      Basketball camp or its licensors.
                    </li>
                    <li>
                      <strong>Use of Likeness:</strong> By participating in the
                      Camp, you grant Bothell Select camp the right to use your
                      name, likeness, and image in promotional materials related
                      to the Camp without compensation.
                    </li>
                  </ul>
                </div>

                {/* Miscellaneous */}
                <div className='terms-section'>
                  <h2>
                    <i className='ti ti-adjustments' />
                    Miscellaneous
                  </h2>
                  <ul>
                    <li>
                      <strong>Severability:</strong> If any provision of these
                      Terms is found to be invalid or unenforceable, the
                      remaining provisions will remain in full force and effect.
                    </li>
                    <li>
                      <strong>Governing Law:</strong> These Terms are governed
                      by the laws of the State of Washington. Any disputes
                      arising out of or in connection with these Terms shall be
                      resolved exclusively by the courts of King County,
                      Washington.
                    </li>
                    <li>
                      <strong>Changes to Terms:</strong> We reserve the right to
                      modify or update these Terms at any time. Any changes will
                      be effective immediately upon posting the updated Terms on
                      our website.
                    </li>
                  </ul>
                </div>

                {/* Contact Us */}
                <div className='terms-section terms-contact-section'>
                  <h2>
                    <i className='ti ti-mail' />
                    Contact Us
                  </h2>
                  <p>
                    If you have any questions or concerns about these Terms and
                    Conditions, please send us an{' '}
                    <a href='mailto:bothellselect@proton.me'>email</a>.
                  </p>
                </div>
              </div>

              <div className='terms-footer-white'>
                <p>
                  © {new Date().getFullYear()} Bothell Select Basketball. All
                  rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
