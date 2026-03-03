// src/pages/DynamicPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageRenderer from './PageRenderer';

interface DynamicPageProps {
  slug?: string;
}

const DynamicPage: React.FC<DynamicPageProps> = ({ slug }) => {
  const params = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSlug = slug || params.slug || '';

  // If no slug provided, redirect to home
  useEffect(() => {
    if (!pageSlug) {
      navigate('/');
    }
  }, [pageSlug, navigate]);

  if (loading) {
    return (
      <div className='container py-5'>
        <div className='text-center'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='mt-3'>Loading page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container py-5'>
        <div className='alert alert-danger'>
          <h4>Page Not Found</h4>
          <p>{error}</p>
          <button className='btn btn-primary' onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='dynamic-page'>
      <PageRenderer pageSlug={pageSlug} isEditing={false} />
    </div>
  );
};

export default DynamicPage;
