import React, { useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form Data Submitted:', formData);
  };

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
              <div className='contact-page'>
                <div className='mx-auto p-4'>
                  <h1 className='mb-4 text-center'>Reach Out!</h1>
                  <h6 className='mb-4 text-center'>
                    We are committed to providing exceptional service and
                    assistance. Don’t hesitate to contact us with any questions
                    or concerns you may have. We look forward to hearing from
                    you!
                  </h6>
                  <div className='mx-auto'>
                    <form onSubmit={handleSubmit}>
                      <div className='card'>
                        <div className='card-body'>
                          <div className='mt-0'>
                            <div className='mb-2'>
                              <label className='form-label'>Full Name</label>
                              <input
                                type='text'
                                name='fullName'
                                className='form-control'
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                aria-label='Full Name'
                              />
                            </div>
                            <div className='mb-2'>
                              <label className='form-label'>Email</label>
                              <input
                                type='email'
                                name='email'
                                className='form-control'
                                value={formData.email}
                                onChange={handleChange}
                                required
                                aria-label='Email'
                              />
                            </div>
                            <div className='mb-2'>
                              <label className='form-label'>Subject</label>
                              <input
                                type='text'
                                name='subject'
                                className='form-control'
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                aria-label='Subject'
                              />
                            </div>
                            <div className='mb-4'>
                              <label className='form-label'>Message</label>
                              <textarea
                                name='message'
                                className='form-control'
                                value={formData.message}
                                onChange={handleChange}
                                required
                                aria-label='Message'
                                rows={5}
                              />
                            </div>
                          </div>
                          <div className='mb-2'>
                            <button
                              type='submit'
                              className='btn btn-primary w-100'
                            >
                              Send Message
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                  <h2 className='mb-2 text-center'>Feedback & Suggestions</h2>
                  <p className='mb-5 text-center'>
                    We value your feedback and suggestions! If you have any
                    comments, suggestions, or feedback about your experience
                    with Bothell Select, please don’t hesitate to reach out to
                    us. Your input helps us improve and enhance our camp
                    programs for future participants.
                  </p>
                  <h2 className='mb-2 text-center'>Connect With Us!</h2>
                  <p className='mb-2 text-center'>
                    Stay connected with Bothell Select on social media for the
                    latest news, updates, photos, and more:
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

export default ContactPage;
