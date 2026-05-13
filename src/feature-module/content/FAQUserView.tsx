import React, { useEffect, useState, useCallback } from 'react';
import { faq } from '../../core/common/selectoption/selectoption';
import axios from 'axios';
import { Alert } from 'react-bootstrap';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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

      <style>{`
        .faq-container {
          min-height: 100vh;
          background: #0a0a0a;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* Background gradient - subtle */
        .faq-bg-gradient {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 50%, rgba(80, 110, 228, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(120, 140, 255, 0.05) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Animated orbs - more subtle */
        .faq-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          animation: float 20s ease-in-out infinite;
          opacity: 0.4;
        }

        .faq-orb-1 {
          width: 400px;
          height: 400px;
          background: rgba(80, 110, 228, 0.15);
          top: -100px;
          left: -100px;
        }

        .faq-orb-2 {
          width: 500px;
          height: 500px;
          background: rgba(120, 140, 255, 0.1);
          bottom: -150px;
          right: -150px;
          animation-delay: 5s;
        }

        .faq-orb-3 {
          width: 300px;
          height: 300px;
          background: rgba(80, 110, 228, 0.1);
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

        .faq-content-wrapper {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
        }

        .faq-card {
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          background: #0f0f0f;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 48px 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .faq-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .faq-header-icon {
          width: 64px;
          height: 64px;
          background: rgba(80, 110, 228, 0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border: 1px solid rgba(80, 110, 228, 0.15);
        }

        .faq-header-icon i {
          font-size: 32px;
          color: #506ee4;
        }

        .faq-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #a0a0ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .faq-header p {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
        }

        .faq-controls {
          margin-bottom: 40px;
        }

        .search-bar {
          position: relative;
          margin-bottom: 20px;
        }

        .search-bar i {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          color: rgba(255, 255, 255, 0.4);
        }

        .search-bar input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          background: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          font-size: 0.9rem;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .search-bar input:focus {
          outline: none;
          border-color: #506ee4;
          background: #1f1f1f;
        }

        .search-bar input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-btn {
          padding: 8px 20px;
          border-radius: 40px;
          font-size: 0.85rem;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          background: #1a1a1a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          background: #222;
          color: #fff;
        }

        .filter-btn.active {
          background: #506ee4;
          border-color: #506ee4;
          color: #fff;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-item {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .faq-item:hover {
          background: #161616;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .faq-question-btn {
          width: 100%;
          padding: 18px 20px;
          background: transparent;
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .faq-question-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #fff;
          flex-shrink: 0;
        }

        .question-text {
          font-size: 1rem;
          font-weight: 500;
          color: #fff;
          line-height: 1.4;
        }

        .faq-question-btn i {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.4);
          transition: transform 0.3s ease;
          flex-shrink: 0;
          margin-left: 16px;
        }

        .faq-question-btn i.open {
          transform: rotate(90deg);
          color: #506ee4;
        }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
          background: #0c0c0c;
        }

        .faq-answer.open {
          max-height: 500px;
          transition: max-height 0.4s ease-in;
        }

        .answer-content {
          padding: 0 20px 18px 20px;
        }

        .answer-content p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 12px 0;
        }

        .answer-content p:first-child {
          margin-top: 0;
        }

        .answer-content p:last-child {
          margin-bottom: 0;
        }

        .faq-empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-state-icon {
          width: 80px;
          height: 80px;
          background: #111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .empty-state-icon i {
          font-size: 48px;
          color: rgba(255, 255, 255, 0.3);
        }

        .faq-empty-state h3 {
          font-size: 1.3rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
        }

        .faq-empty-state p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .faq-alert {
          margin-bottom: 24px;
          border-radius: 12px;
        }

        @media (max-width: 768px) {
          .faq-card {
            padding: 32px 24px;
          }

          .faq-header h1 {
            font-size: 1.8rem;
          }

          .faq-question-btn {
            padding: 14px 16px;
          }

          .question-text {
            font-size: 0.9rem;
          }

          .answer-content {
            padding: 0 16px 14px 16px;
          }
        }

        @media (max-width: 480px) {
          .faq-card {
            padding: 24px 16px;
          }

          .faq-header h1 {
            font-size: 1.5rem;
          }

          .faq-question-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .filter-btn {
            padding: 6px 14px;
            font-size: 0.75rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .faq-orb,
          .faq-item,
          .filter-btn,
          .faq-question-btn i,
          .faq-answer {
            animation: none;
            transition: none;
          }
        }
      `}</style>
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
