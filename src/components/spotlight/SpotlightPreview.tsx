import React from 'react';
import { Star, Calendar, Users } from 'lucide-react';

interface SpotlightPreviewProps {
  title?: string;
  showViewAll?: boolean;
  limit?: number;
}

const SpotlightPreview: React.FC<SpotlightPreviewProps> = ({
  title = 'In The Spotlight',
  showViewAll = true,
  limit = 1,
}) => {
  return (
    <div className='spotlight-preview'>
      <div className='d-flex justify-content-between align-items-center mb-3'>
        <h4 className='mb-0'>{title}</h4>
        {showViewAll && (
          <button className='btn btn-outline-primary btn-sm'>View All →</button>
        )}
      </div>

      <div className='card'>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-5'>
              <div className='placeholder-image bg-light rounded d-flex align-items-center justify-content-center p-5'>
                <Star size={32} className='text-muted' />
              </div>
            </div>
            <div className='col-md-7'>
              <div className='d-flex align-items-center mb-2'>
                <Star className='text-warning me-2' size={16} />
                <h5 className='mb-0'>Sample Spotlight Item</h5>
              </div>
              <div className='d-flex mb-2'>
                <small className='text-muted me-3'>
                  <Calendar size={12} className='me-1' />
                  Today's Date
                </small>
                <small className='text-muted'>
                  <Users size={12} className='me-1' />
                  Team
                </small>
              </div>
              <p className='mb-2'>
                This is a preview of how spotlight content will appear. Actual
                content will be loaded dynamically.
              </p>
              <div className='mt-2'>
                <span className='badge bg-primary me-1'>Badge 1</span>
                <span className='badge bg-primary'>Badge 2</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-2 text-muted small'>
        Shows {limit} featured spotlight item{limit !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default SpotlightPreview;
