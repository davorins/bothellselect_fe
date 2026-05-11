// components/SpotlightCard.tsx
import React from 'react';
import { Calendar, Star, Users } from 'lucide-react';
import { Spotlight } from '../../types/types';

interface SpotlightCardProps {
  item: Spotlight;
  onClick?: () => void;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({ item, onClick }) => {
  return (
    <div className='spotlight-card-glass' onClick={onClick}>
      <div className='spotlight-card-image'>
        <img
          src={item.images?.[0] || '/assets/img/placeholder.jpg'}
          alt={item.title}
          loading='lazy'
        />
        {item.featured && (
          <div className='spotlight-card-featured'>
            <Star size={12} fill='currentColor' />
            Featured
          </div>
        )}
      </div>

      <div className='spotlight-card-content'>
        <span className='spotlight-card-category'>
          <Users size={12} />
          {item.category}
        </span>

        <h3 className='spotlight-card-title'>{item.title}</h3>

        <div className='spotlight-card-date'>
          <Calendar size={14} />
          {new Date(item.date).toLocaleDateString()}
        </div>

        <p className='spotlight-card-description'>{item.description}</p>

        {item.playerNames && item.playerNames.length > 0 && (
          <div className='spotlight-card-players'>
            <strong>Players:</strong> {item.playerNames.join(', ')}
          </div>
        )}

        {item.badges && item.badges.length > 0 && (
          <div className='spotlight-card-badges'>
            {item.badges.map((badge, index) => (
              <span key={index} className='spotlight-card-badge'>
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotlightCard;
