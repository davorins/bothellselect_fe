import React, { useEffect, useState, useCallback } from 'react';
import { faq } from '../../core/common/selectoption/selectoption';
import axios from 'axios';
import { Alert, Accordion, Form, Button, Badge } from 'react-bootstrap';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

interface FAQItem {
  _id: string;
  questions: string[]; // Changed to array of strings
  answers: string[]; // Changed to array of strings
  category: string;
}

const FAQUserView = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching from:', `${API_BASE_URL}/faqs`);
      const response = await axios.get(`${API_BASE_URL}/faqs`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data?.data || response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

      console.log('Received data:', data);
      setFaqs(data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Filter FAQs
  const filteredFaqs = faqs.filter((faqItem) => {
    const matchesCategory =
      activeFilter === 'all' || faqItem.category === activeFilter;

    // Get first question/answer or empty string if array is empty
    const question = faqItem.questions?.[0] || '';
    const answer = faqItem.answers?.[0] || '';

    const matchesSearch =
      question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div>
                <ImageWithBasePath src='assets/img/faq.png' alt='Img' />
              </div>
            </div>
          </div>
          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='faq-page faq-user-container'>
                {error && (
                  <Alert
                    variant='danger'
                    onClose={() => setError(null)}
                    dismissible
                  >
                    {error}
                  </Alert>
                )}

                <div className='faq-header mb-4'>
                  <h2>Frequently Asked Questions</h2>
                  <p>Find answers to common questions</p>

                  {/* Search and Filter Bar */}
                  <div className='faq-controls mb-4'>
                    <div className='search-bar mb-3'>
                      <Form.Control
                        type='text'
                        placeholder='Search FAQs...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className='filter-buttons'>
                      <Button
                        variant={
                          activeFilter === 'all'
                            ? 'primary'
                            : 'outline-secondary'
                        }
                        onClick={() => setActiveFilter('all')}
                        className='me-2 mb-2'
                      >
                        All
                      </Button>
                      {faq.map((cat) => (
                        <Button
                          key={cat.value}
                          variant={
                            activeFilter === cat.value
                              ? 'primary'
                              : 'outline-secondary'
                          }
                          onClick={() => setActiveFilter(cat.value)}
                          className='me-2 mb-2'
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FAQ List */}
                {filteredFaqs.length === 0 && !loading ? (
                  <div className='no-results text-center py-5'>
                    <i className='ti ti-info-circle fs-1 text-muted mb-3'></i>
                    <p className='text-muted'>
                      {faqs.length === 0
                        ? 'No FAQs available'
                        : 'No FAQs match your search criteria'}
                    </p>
                  </div>
                ) : (
                  <Accordion className='faq-accordion'>
                    {filteredFaqs.map((faqItem, index) => (
                      <Accordion.Item
                        eventKey={index.toString()}
                        key={faqItem._id}
                      >
                        <Accordion.Header>
                          <div className='faq-question'>
                            <Badge
                              bg='secondary'
                              className='category-badge me-2'
                            >
                              {faq.find((c) => c.value === faqItem.category)
                                ?.label || 'General'}
                            </Badge>
                            {faqItem.questions?.[0] || 'No question provided'}
                          </div>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className='faq-answer'>
                            {(faqItem.answers?.[0] || '')
                              .split('\n')
                              .map((para, i) => (
                                <p key={i}>{para}</p>
                              ))}
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQUserView;
