// pages/InTheSpotlight.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Masonry from 'react-masonry-css';
import SpotlightCard from '../components/SpotlightCard';
import { Spotlight } from '../../types/types';

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
      className='spotlight-page-wrapper'
      style={{
        backgroundImage: 'url(/assets/img/bg/spotlight.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
      }}
    >
      <div
        className='spotlight-overlay'
        style={{
          backgroundColor: 'rgba(89, 66, 48, 0.05)',
          minHeight: '100vh',
          padding: '2rem 0',
        }}
      >
        <div className='container py-5'>
          <div className='spotlight'>
            <div className='text-center mb-5'>
              <h1 className='mb-3 display-4 fw-bold'>In The Spotlight</h1>
              <h4 className='mb-5'>
                Celebrating player achievements and team highlights.
              </h4>
            </div>

            {loading ? (
              <div className='text-center py-5'>
                <div className='spinner-border text-light' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
                <p className='text-light mt-3'>Loading spotlight content...</p>
              </div>
            ) : error ? (
              <div className='alert alert-danger text-center'>
                <p className='mb-0'>{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className='text-center py-5'>
                <div className='card bg-light border-0'>
                  <div className='card-body py-5'>
                    <h3 className='text-muted'>No spotlight items yet</h3>
                    <p className='text-muted'>
                      Check back later for exciting updates!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Masonry
                breakpointCols={breakpointCols}
                className='my-masonry-grid'
                columnClassName='my-masonry-grid_column'
              >
                {items.map((item) => (
                  <SpotlightCard key={item._id} item={item} />
                ))}
              </Masonry>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InTheSpotlight;
