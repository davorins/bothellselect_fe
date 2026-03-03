import React from 'react';
import { CoachSortOrder } from '../../../types/coachTypes';

interface CoachSortOptionsProps {
  sortOrder: CoachSortOrder;
  onSortChange: (order: CoachSortOrder) => void;
}

export const CoachSortOptions: React.FC<CoachSortOptionsProps> = ({
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
        <i className='ti ti-sort-ascending me-2' />
        Name (A-Z)
      </div>
    </li>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'desc' ? 'active' : ''
        }`}
        onClick={() => onSortChange('desc')}
      >
        <i className='ti ti-sort-descending me-2' />
        Name (Z-A)
      </div>
    </li>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'recentlyViewed' ? 'active' : ''
        }`}
        onClick={() => onSortChange('recentlyViewed')}
      >
        <i className='ti ti-eye me-2' />
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
        <i className='ti ti-clock me-2' />
        Recently Added
      </div>
    </li>
    <li className='dropdown-divider'></li>
    <li>
      <div
        className={`dropdown-item rounded-1 ${
          sortOrder === 'aauNumber' ? 'active' : ''
        }`}
        onClick={() => onSortChange('aauNumber')}
      >
        <i className='ti ti-id me-2' />
        AAU Number
      </div>
    </li>
  </ul>
);
