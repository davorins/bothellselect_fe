import React from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import PageRenderer from '../../components/page-builder/PageRenderer';

const ProgramLeadership = () => {
  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          {/* Left Column - Fixed Image with Striped Background */}
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center d-lg-block d-none flex-wrap vh-100 overflow-auto position-relative striped-bg'>
              <ImageWithBasePath
                src='assets/img/watermark-logo-dark.png'
                alt='Our Team and Coaches'
                className='hover-zoom'
              />
            </div>
          </div>

          {/* Right Column - Dynamic Content */}
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='ourteam-page'>
                <div className='mx-auto p-4'>
                  <PageRenderer
                    pageSlug='program-leadership'
                    isEditing={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
       .striped-bg {
          position: relative;
        }

         .striped-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: 
            /* Stripe 1: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 0%,
              rgba(89, 66, 48, .035) 14.2857%,
              transparent 14.2857%
            ),
            /* Stripe 2: White */
            linear-gradient(
              90deg,
              #ffffff 14.2857%,
              #ffffff 28.5714%,
              transparent 28.5714%
            ),
            /* Stripe 3: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 28.5714%,
              rgba(89, 66, 48, .035) 42.8571%,
              transparent 42.8571%
            ),
            /* Stripe 4: White */
            linear-gradient(
              90deg,
              #ffffff 42.8571%,
              #ffffff 57.1428%,
              transparent 57.1428%
            ),
            /* Stripe 5: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 57.1428%,
              rgba(89, 66, 48, .035) 71.4285%,
              transparent 71.4285%
            ),
            /* Stripe 6: White */
            linear-gradient(
              90deg,
              #ffffff 71.4285%,
              #ffffff 85.7142%,
              transparent 85.7142%
            ),
            /* Stripe 7: Colored */
            linear-gradient(
              90deg,
              rgba(89, 66, 48, .035) 85.7142%,
              rgba(89, 66, 48, .035) 100%
            );
          background-size: 100% 100%;
          background-repeat: no-repeat;
          z-index: 1;
        }

        /* Ensure the image sits above the stripes */
        .striped-bg img {
          position: relative;
          z-index: 2;
          max-width: 80%;
          max-height: 80%;
          object-fit: contain;
        }

        /* Hover zoom effect for the image */
        .hover-zoom {
          transition: transform 0.3s ease;
        }
        
        .hover-zoom:hover {
          transform: scale(1.05);
        }

        /* Responsive styles */
        @media (max-width: 991.98px) {
          .col-lg-6:first-child {
            display: none !important;
          }
        }

        /* Alternative method using CSS custom properties */
        /* This is cleaner and more maintainable */
        .striped-bg-alt {
          position: relative;
        }

        .striped-bg-alt::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          --stripe-width: calc(100% / 7);
          background-image: repeating-linear-gradient(
            90deg,
            rgba(89, 66, 48, .035) 0 var(--stripe-width),
            #ffffff var(--stripe-width) calc(var(--stripe-width) * 2),
            rgba(89, 66, 48, .035) calc(var(--stripe-width) * 2) calc(var(--stripe-width) * 3),
            #ffffff calc(var(--stripe-width) * 3) calc(var(--stripe-width) * 4),
            rgba(89, 66, 48, .035) calc(var(--stripe-width) * 4) calc(var(--stripe-width) * 5),
            #ffffff calc(var(--stripe-width) * 5) calc(var(--stripe-width) * 6),
            rgba(89, 66, 48, .035) calc(var(--stripe-width) * 6) 100%
          );
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default ProgramLeadership;
