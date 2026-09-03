import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import './ContactPage.css';

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

          <div className='contact-image-wrapper'>
            <div className='contact-image-glass'>
              <div className='contact-image-container'>
                <ImageWithBasePath
                  src='assets/img/theme/player_1.png'
                  alt='Contact Illustration'
                  className='contact-illustration-img'
                />
              </div>
            </div>
          </div>

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
    </div>
  );
};

export default ContactPage;
