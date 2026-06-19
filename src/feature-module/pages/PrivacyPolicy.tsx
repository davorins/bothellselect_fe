import React, { useState, useEffect } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Preload image and trigger entrance animation
    const img = new Image();
    img.src = 'assets/img/bg/bg_privacypolicy.png';
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
    <div className='privacy-white-container'>
      {/* Background Image with dramatic entrance */}
      <div
        className={`privacy-background-image ${isImageLoaded ? 'loaded' : ''}`}
      >
        <div
          className='privacy-bg-parallax'
          style={{
            transform: `translate(${(mousePosition.x - 50) * -0.02}px, ${(mousePosition.y - 50) * -0.02}px)`,
          }}
        >
          <ImageWithBasePath
            src='assets/img/bg/bg_privacypolicy.png'
            alt='Background'
            className='privacy-bg-img'
          />
        </div>
        <div className='privacy-bg-overlay' />
        <div className='privacy-bg-gradient-overlay' />
      </div>

      {/* Floating particles */}
      <div className='privacy-particles'>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className='privacy-particle'
            style={{
              animationDelay: `${i * 0.5}s`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className='privacy-content-wrapper-white'>
        <div className='privacy-grid-white'>
          {/* Left column - Image */}
          <div className='privacy-image-col'>
            <div className='privacy-image-card'>
              {/* <div className='privacy-image-glass'>
                <div className='privacy-image-glow' />
                <ImageWithBasePath
                  src='assets/img/authentication/authentication.png'
                  alt='Privacy Shield'
                  className='privacy-img'
                />
              </div>
              <div className='privacy-image-badge'>
                <i className='ti ti-shield-lock' />
                <span>
                  Your Privacy
                  <br />
                  Matters to Us
                </span>
              </div> */}
            </div>
          </div>

          {/* Right column - Privacy Policy Content */}
          <div className='privacy-content-col'>
            <div className='privacy-card-white'>
              <div className='privacy-header-white'>
                <div className='privacy-header-icon-white'>
                  <i className='ti ti-shield' />
                </div>
                <h1>Privacy Policy</h1>
                <p>
                  This Privacy Policy describes how Bothell Select camp
                  collects, uses, and shares personal information when you use
                  our basketball camp services.
                </p>
              </div>

              <div className='privacy-sections'>
                {/* Information We Collect */}
                <div className='privacy-section'>
                  <h2>
                    <i className='ti ti-info-circle' />
                    Information We Collect
                  </h2>
                  <p>
                    We collect personal information you provide directly to us
                    when you register for our basketball camp. This information
                    may include:
                  </p>
                  <ul>
                    <li>Participant's name</li>
                    <li>Participant's age</li>
                    <li>Parent or guardian's name</li>
                    <li>
                      Contact information (e.g., email address, phone number)
                    </li>
                    <li>Emergency contact information</li>
                    <li>
                      Medical information relevant to the participant's
                      participation in the camp
                    </li>
                    <li>Dietary restrictions or food allergies</li>
                    <li>
                      Any other information necessary for the provision of our
                      Services
                    </li>
                  </ul>
                </div>

                {/* How We Use Your Information */}
                <div className='privacy-section'>
                  <h2>
                    <i className='ti ti-chart-bar' />
                    How We Use Your Information
                  </h2>
                  <p>
                    We may use the personal information we collect for the
                    following purposes:
                  </p>
                  <ul>
                    <li>To register participants for the basketball camp</li>
                    <li>
                      To communicate with participants and their parents or
                      guardians regarding camp-related information, updates, and
                      activities
                    </li>
                    <li>
                      To ensure the safety and well-being of participants during
                      the camp
                    </li>
                    <li>To provide medical care or assistance if needed</li>
                    <li>
                      To respond to inquiries, concerns, or requests related to
                      the camp
                    </li>
                    <li>
                      To improve and enhance our basketball summer camp services
                    </li>
                  </ul>
                </div>

                {/* Information Sharing */}
                <div className='privacy-section'>
                  <h2>
                    <i className='ti ti-share' />
                    Information Sharing
                  </h2>
                  <p>
                    We do not sell, trade, or otherwise transfer your personal
                    information to third parties without your consent, except as
                    described in this Privacy Policy. We may share personal
                    information with:
                  </p>
                  <ul>
                    <li>
                      Our staff members and volunteers who need access to such
                      information to facilitate the basketball camp
                    </li>
                    <li>
                      Service providers or third parties who assist us in
                      operating our camp, such as medical personnel, catering
                      services, or transportation providers
                    </li>
                    <li>
                      Law enforcement or government authorities when required by
                      law or to protect our rights, property, or safety, or the
                      rights, property, or safety of others
                    </li>
                    <li>
                      Other parties with your consent or at your direction
                    </li>
                  </ul>
                </div>

                {/* Data Security */}
                <div className='privacy-section'>
                  <h2>
                    <i className='ti ti-lock' />
                    Data Security
                  </h2>
                  <p>
                    We take reasonable measures to protect the personal
                    information we collect from unauthorized access, disclosure,
                    alteration, or destruction. However, please be aware that no
                    method of transmission over the internet or electronic
                    storage is 100% secure, and we cannot guarantee absolute
                    security.
                  </p>
                </div>

                {/* Changes to this Privacy Policy */}
                <div className='privacy-section'>
                  <h2>
                    <i className='ti ti-edit' />
                    Changes to this Privacy Policy
                  </h2>
                  <p>
                    We may update this Privacy Policy from time to time. Any
                    changes will be posted on this page, and the date of the
                    last update will be indicated at the top of the policy.
                  </p>
                </div>

                {/* Contact Us */}
                <div className='privacy-section privacy-contact-section'>
                  <h2>
                    <i className='ti ti-mail' />
                    Contact Us
                  </h2>
                  <p>
                    If you have any questions or concerns about this Privacy
                    Policy or our practices regarding your personal information,
                    please send us an{' '}
                    <a href='mailto:bothellselect@proton.me'>email</a>.
                  </p>
                </div>
              </div>

              <div className='privacy-footer-white'>
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

export default PrivacyPolicy;
