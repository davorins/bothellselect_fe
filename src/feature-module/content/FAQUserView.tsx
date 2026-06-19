import React, { useEffect, useState, useCallback } from 'react';
import { faq } from '../../core/common/selectoption/selectoption';
import axios from 'axios';
import { Alert } from 'react-bootstrap';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './FAQUserView.css';

interface FAQItem {
  _id: string;
  questions: string[];
  answers: string[];
  category: string;
}

const FAQUserView = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [openItems, setOpenItems] = useState<string[]>([]);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/faqs`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data?.data || response.data;

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }

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

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredFaqs = faqs.filter((faqItem) => {
    const matchesCategory =
      activeFilter === 'all' || faqItem.category === activeFilter;

    const question = faqItem.questions?.[0] || '';
    const answer = faqItem.answers?.[0] || '';

    const matchesSearch =
      question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      answer.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className='faq-container'>
      {/* Background gradient */}
      <div className='faq-bg-gradient' />

      {/* Background image */}
      <div className='faq-bg-image' />

      {/* Animated gradient orbs */}
      <div className='faq-orb faq-orb-1' />
      <div className='faq-orb faq-orb-2' />
      <div className='faq-orb faq-orb-3' />

      <div className='faq-content-wrapper'>
        <div className='faq-card'>
          <div className='faq-header'>
            <div className='faq-header-icon'>
              <i className='ti ti-question-mark' />
            </div>
            <h1>Frequently Asked Questions</h1>
            <p>
              Find answers to common questions about programs, registration, and
              more
            </p>
          </div>

          {error && (
            <Alert
              variant='danger'
              onClose={() => setError(null)}
              dismissible
              className='faq-alert'
            >
              {error}
            </Alert>
          )}

          <div className='faq-controls'>
            <div className='search-bar'>
              <i className='ti ti-search' />
              <input
                type='text'
                placeholder='Search FAQs...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className='filter-buttons'>
              <button
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              {faq.map((cat) => (
                <button
                  key={cat.value}
                  className={`filter-btn ${activeFilter === cat.value ? 'active' : ''}`}
                  onClick={() => setActiveFilter(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredFaqs.length === 0 && !loading ? (
            <div className='faq-empty-state'>
              <div className='empty-state-icon'>
                <i className='ti ti-info-circle' />
              </div>
              <h3>No FAQs Found</h3>
              <p>
                {faqs.length === 0
                  ? 'No FAQs available at the moment'
                  : 'No FAQs match your search criteria'}
              </p>
            </div>
          ) : (
            <div className='faq-list'>
              {filteredFaqs.map((faqItem) => {
                const categoryLabel =
                  faq.find((c) => c.value === faqItem.category)?.label ||
                  'General';
                const isOpen = openItems.includes(faqItem._id);

                return (
                  <div key={faqItem._id} className='faq-item'>
                    <button
                      className='faq-question-btn'
                      onClick={() => toggleItem(faqItem._id)}
                    >
                      <div className='faq-question-content'>
                        <span
                          className='category-badge'
                          style={{
                            background: getCategoryColor(faqItem.category),
                          }}
                        >
                          {categoryLabel}
                        </span>
                        <span className='question-text'>
                          {faqItem.questions?.[0] || 'No question provided'}
                        </span>
                      </div>
                      <i
                        className={`ti ti-chevron-right ${isOpen ? 'open' : ''}`}
                      />
                    </button>
                    <div className={`faq-answer ${isOpen ? 'open' : ''}`}>
                      <div className='answer-content'>
                        {(faqItem.answers?.[0] || '')
                          .split('\n')
                          .map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    general: '#6c757d',
    registration: '#4c9aff',
    training: '#4ade80',
    games: '#ff6b6b',
    camps: '#a855f7',
    tryouts: '#f97316',
    events: '#fbbf24',
  };
  return colors[category?.toLowerCase()] || '#506ee4';
};

export default FAQUserView;
