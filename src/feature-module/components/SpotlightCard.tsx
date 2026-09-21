// components/SpotlightCard.tsx
import React, { useState } from 'react';
import { Calendar, Star, Users, ZoomIn } from 'lucide-react';
import { Spotlight } from '../../types/types';

interface SpotlightCardProps {
  item: Spotlight;
  onImageClick?: (imageUrl: string, index: number) => void;
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  item,
  onImageClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const description = item.description || '';
  const isLong = description.length > 160;

  const handleImageClick = (e: React.MouseEvent) => {
    // Stop this click from bubbling further up the tree; some of our
    // ancestors have handlers (e.g. the just-mounted modal overlay) that
    // would otherwise react to this same event.
    e.stopPropagation();
    e.preventDefault();

    if (onImageClick) {
      const imageUrl = item.images?.[0] || '/assets/img/placeholder.jpg';
      onImageClick(imageUrl, 0);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className='spotlight-card-glass'>
      <div className='spotlight-card-image' onClick={handleImageClick}>
        <img
          src={item.images?.[0] || '/assets/img/placeholder.jpg'}
          alt={item.title}
          loading='lazy'
        />
        <div className='spotlight-card-image-overlay'>
          <ZoomIn size={24} className='text-white' />
        </div>
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

        <p
          className={`spotlight-card-description ${
            isExpanded ? 'expanded' : ''
          }`}
        >
          {description}
        </p>

        {isLong && (
          <button
            type='button'
            className='spotlight-card-readmore-btn'
            onClick={handleToggleExpand}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </button>
        )}

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
