// pages/InTheSpotlight.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Masonry from 'react-masonry-css';
import SpotlightCard from '../components/SpotlightCard';
import { Spotlight } from '../../types/types';
import './InTheSpotlight.css';

const InTheSpotlight = () => {
  const [items, setItems] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchSpotlightItems = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/spotlight`);
        setItems(response.data);
      } catch (err) {
        console.error('Error fetching spotlight items:', err);
        setError('Failed to load spotlight items');
      } finally {
        setLoading(false);
      }
    };

    fetchSpotlightItems();
  }, [API_BASE_URL]);

  const breakpointCols = { default: 3, 1100: 2, 700: 1 };

  return (
    <div
      className='spotlight-glass-page'
      style={{
        backgroundImage: 'url(/assets/img/bg/spotlight.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className='spotlight-glass-overlay'>
        <div className='spotlight-glass-container'>
          {/* Header Section */}
          <div className='text-center mb-5'>
            <h1 className='mb-3 display-4 fw-bold spotlight-glass-title'>
              In The Spotlight
            </h1>
            <h4 className='mb-5 spotlight-glass-subtitle'>
              Celebrating player achievements and team highlights.
            </h4>
          </div>

          {/* Content Section */}
          {loading ? (
            <div className='spotlight-glass-loading'>
              <div className='spotlight-glass-spinner'></div>
              <p>Loading spotlight content...</p>
            </div>
          ) : error ? (
            <div className='spotlight-glass-error'>
              <p>{error}</p>
              <button
                className='spotlight-glass-retry-btn'
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className='spotlight-glass-empty'>
              <h3>No spotlight items yet</h3>
              <p>Check back later for exciting updates!</p>
            </div>
          ) : (
            <Masonry
              breakpointCols={breakpointCols}
              className='spotlight-glass-masonry-grid'
              columnClassName='spotlight-glass-masonry-column'
            >
              {items.map((item) => (
                <SpotlightCard key={item._id} item={item} />
              ))}
            </Masonry>
          )}
        </div>
      </div>
    </div>
  );
};

export default InTheSpotlight;
