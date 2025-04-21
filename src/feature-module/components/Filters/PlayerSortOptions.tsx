import React from 'react';
import { PlayerSortOrder } from '../../../types/playerTypes';

interface PlayerSortOptionsProps {
  sortOrder: PlayerSortOrder;
  onSortChange: (order: PlayerSortOrder) => void;
}

export const PlayerSortOptions: React.FC<PlayerSortOptionsProps> = ({
  sortOrder,
  onSortChange,
}) => (
  <ul className='dropdown-menu p-3'>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'asc' ? 'active' : ''
        }`}
        onClick={() => onSortChange('asc')}
      >
        Ascending
      </div>
    </li>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'desc' ? 'active' : ''
        }`}
        onClick={() => onSortChange('desc')}
      >
        Descending
      </div>
    </li>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'recentlyViewed' ? 'active' : ''
        }`}
        onClick={() => onSortChange('recentlyViewed')}
      >
        Recently Viewed
      </div>
    </li>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'recentlyAdded' ? 'active' : ''
        }`}
        onClick={() => onSortChange('recentlyAdded')}
      >
        Recently Added
      </div>
    </li>
  </ul>
);
