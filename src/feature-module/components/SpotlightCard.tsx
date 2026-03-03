// components/SpotlightCard.tsx
import React, { useState } from 'react';
import { Spotlight } from '../../types/types';

interface SpotlightCardProps {
  item: Spotlight;
}

const SpotlightCard = ({ item }: SpotlightCardProps) => {
  const [main, setMain] = useState(item.images && item.images[0]);

  return (
    <div className='spotlight-card glass-frame position-relative mb-4'>
      <div className='img-wrap'>
        {main ? (
          <img src={main} alt={item.title} className='img-fluid rounded' />
        ) : (
          <div className='placeholder p-5 text-center'>No image</div>
        )}
        {/* badges */}
        {item.badges?.map((b, i) => (
          <div key={i} className={`badge-overlay badge-${i % 3}`}>
            {b}
          </div>
        ))}
      </div>

      <div className='card-body p-3'>
        <h5 className='mb-1'>{item.title}</h5>
        <small className='text-muted'>
          {new Date(item.date).toLocaleDateString()}
        </small>
        <p className='mt-2 mb-0'>{item.description}</p>
        {item.playerNames?.length ? (
          <p className='mt-2 mb-0'>
            <strong>Players:</strong> {item.playerNames.join(', ')}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default SpotlightCard;
