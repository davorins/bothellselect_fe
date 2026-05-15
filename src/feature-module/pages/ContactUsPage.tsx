import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowSuccess(true);
        setFormData({
          fullName: '',
          email: '',
          subject: '',
          message: '',
        });

        setTimeout(() => {
          navigate('/');
        }, 5000);
      } else {
        const errorData = await response.json();
        console.error('Error sending message:', errorData);
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='contact-page-container'>
      {/* Background gradient */}
      <div className='contact-bg-gradient' />

      {/* Animated gradient orbs */}
      <div className='contact-orb contact-orb-1' />
      <div className='contact-orb contact-orb-2' />
      <div className='contact-orb contact-orb-3' />

      <div className='contact-content-wrapper'>
        <div className='contact-grid'>
          {/* Left side - Illustration with glassmorphism - Centered image */}

          <ImageWithBasePath
            src='assets/img/authentication/authentication.png'
            alt='Contact Illustration'
            className='contact-illustration-img'
          />

          {/* Right side - Contact Form */}
          <div className='contact-form-wrapper'>
            <div className='contact-form-glass'>
              {showSuccess ? (
                <div className='contact-success-message'>
                  <div className='success-icon'>
                    <i className='ti ti-circle-check' />
                  </div>
                  <h2>Message Sent Successfully!</h2>
                  <p>
                    Thank you for reaching out. We've received your message and
                    will get back to you shortly!
                  </p>
                  <div className='success-animation' />
                </div>
              ) : (
                <>
                  <div className='contact-header'>
                    <div className='contact-header-icon'>
                      <i className='ti ti-mail-heart' />
                    </div>
                    <h1>Reach Out!</h1>
                    <p>
                      Whether you have questions about camp registration,
                      practice schedules, skill levels, or training programs —
                      don't hesitate to reach out. Our team is dedicated to
                      helping every player grow on and off the court.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className='contact-form'>
                    <div className='form-group'>
                      <label className='form-label'>
                        <i className='ti ti-user' />
                        Full Name
                      </label>
                      <input
                        type='text'
                        name='fullName'
                        className='form-control glass-input'
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        placeholder='Enter your full name'
                      />
                    </div>

                    <div className='form-group'>
                      <label className='form-label'>
                        <i className='ti ti-mail' />
                        Email Address
                      </label>
                      <input
                        type='email'
                        name='email'
                        className='form-control glass-input'
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder='you@example.com'
                      />
                    </div>

                    <div className='form-group'>
                      <label className='form-label'>
                        <i className='ti ti-article' />
                        Subject
                      </label>
                      <input
                        type='text'
                        name='subject'
                        className='form-control glass-input'
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="What's this about?"
                      />
                    </div>

                    <div className='form-group'>
                      <label className='form-label'>
                        <i className='ti ti-message' />
                        Message
                      </label>
                      <textarea
                        name='message'
                        className='form-control glass-input glass-textarea'
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder='Tell us how we can help...'
                        rows={5}
                      />
                    </div>

                    <button
                      type='submit'
                      className='contact-submit-btn'
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className='spinner' />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <i className='ti ti-arrow-right' />
                        </>
                      )}
                    </button>
                  </form>

                  <div className='contact-footer'>
                    <div className='contact-footer-content'>
                      <h3>Connect With Us!</h3>
                      <p>
                        Stay connected on social media for the latest news,
                        updates, and more:
                      </p>
                      <div className='social-links'>
                        <a href='#' className='social-link'>
                          <i className='ti ti-brand-facebook' />
                        </a>
                        <a href='#' className='social-link'>
                          <i className='ti ti-brand-instagram' />
                        </a>
                        <a href='#' className='social-link'>
                          <i className='ti ti-brand-twitter' />
                        </a>
                        <a href='#' className='social-link'>
                          <i className='ti ti-brand-youtube' />
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .contact-page-container {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Background gradient */
        .contact-bg-gradient {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(80, 110, 228, 0.15) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(120, 140, 255, 0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Animated orbs */
        .contact-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: float 20s ease-in-out infinite;
        }

        .contact-orb-1 {
          width: 400px;
          height: 400px;
          background: rgba(80, 110, 228, 0.2);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .contact-orb-2 {
          width: 500px;
          height: 500px;
          background: rgba(120, 140, 255, 0.15);
          bottom: -150px;
          right: -150px;
          animation-delay: 5s;
        }

        .contact-orb-3 {
          width: 300px;
          height: 300px;
          background: rgba(80, 110, 228, 0.15);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 10s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }

        /* Content wrapper */
        .contact-content-wrapper {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 80px 24px;
        }

        .contact-grid {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: stretch;
        }

        /* Glassmorphism illustration - Centered image */
        .contact-illustration-wrapper {
          animation: slideInLeft 0.8s ease-out;
          display: flex;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .contact-illustration-glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-radius: 44px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 48px 32px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }

        .contact-illustration-glass:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.25);
        }

        /* Center the image both horizontally and vertically */
        .contact-illustration-inner {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .contact-illustration-img {
          max-width: 100%;
          height: auto;
          filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
          object-fit: contain;
        }

        /* Form glass card - MATCHES HEIGHT */
        .contact-form-wrapper {
          animation: slideInRight 0.8s ease-out;
          display: flex;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .contact-form-glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border-radius: 44px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 48px 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
        }

        .contact-form-glass:hover {
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
        }

        /* Header styles */
        .contact-header {
          text-align: center;
          margin-bottom: 32px;
          flex-shrink: 0;
        }

        .contact-header-icon {
          width: 64px;
          height: 64px;
          background: rgba(80, 110, 228, 0.2);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 1px solid rgba(80, 110, 228, 0.3);
        }

        .contact-header-icon i {
          font-size: 32px;
          color: #506ee4;
        }

        .contact-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #506ee4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .contact-header p {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        /* Form styles */
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-label i {
          font-size: 16px;
          color: #506ee4;
        }

        .glass-input,
        .glass-textarea {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 12px 16px;
          font-size: 0.95rem;
          color: #fff;
          transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
        }

        .glass-input:focus,
        .glass-textarea:focus {
          outline: none;
          border-color: #506ee4;
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 3px rgba(80, 110, 228, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        .glass-input::placeholder,
        .glass-textarea::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .glass-textarea {
          resize: vertical;
          min-height: 100px;
        }

        /* Submit button */
        .contact-submit-btn {
          background: linear-gradient(135deg, #506ee4, #3f5cd6);
          border: none;
          border-radius: 40px;
          padding: 14px 32px;
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
          margin-top: 8px;
        }

        .contact-submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .contact-submit-btn:hover::before {
          left: 100%;
        }

        .contact-submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(80, 110, 228, 0.4);
        }

        .contact-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer section */
        .contact-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .contact-footer-content {
          text-align: center;
        }

        .contact-footer-content h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 12px;
        }

        .contact-footer-content p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 20px;
        }

        .social-links {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .social-link {
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.2rem;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          text-decoration: none;
        }

        .social-link:hover {
          background: #506ee4;
          transform: translateY(-4px);
          border-color: transparent;
          color: #fff;
        }

        /* Success message */
        .contact-success-message {
          text-align: center;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 500px;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #506ee4, #3f5cd6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: scaleIn 0.5s ease-out;
        }

        .success-icon i {
          font-size: 48px;
          color: #fff;
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .contact-success-message h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 16px;
        }

        .contact-success-message p {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }

        .success-animation {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at center, rgba(80, 110, 228, 0.2), transparent);
          animation: pulse 2s ease-out;
          pointer-events: none;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(0.8);
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }

        /* Responsive */
        @media (max-width: 968px) {
          .contact-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .contact-illustration-wrapper {
            display: flex;
          }

          .contact-illustration-glass {
            padding: 40px 32px;
            min-height: 300px;
          }

          .contact-form-glass {
            padding: 32px 24px;
          }

          .contact-header h1 {
            font-size: 2rem;
          }
        }

        @media (max-width: 768px) {
          .contact-content-wrapper {
            padding: 60px 16px;
          }

          .contact-illustration-glass,
          .contact-form-glass {
            padding: 28px 20px;
          }

          .contact-header h1 {
            font-size: 1.8rem;
          }

          .contact-illustration-img {
            max-width: 80%;
          }
        }

        @media (max-width: 480px) {
          .contact-illustration-glass,
          .contact-form-glass {
            padding: 24px 16px;
          }

          .contact-header-icon {
            width: 52px;
            height: 52px;
          }

          .contact-header-icon i {
            font-size: 26px;
          }

          .glass-input,
          .glass-textarea {
            padding: 10px 14px;
            font-size: 0.9rem;
          }

          .contact-illustration-img {
            max-width: 70%;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .contact-orb,
          .contact-illustration-wrapper,
          .contact-form-wrapper,
          .contact-submit-btn,
          .social-link {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ContactPage;
