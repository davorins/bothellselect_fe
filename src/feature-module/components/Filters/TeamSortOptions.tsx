// components/Filters/TeamSortOptions.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { TeamSortOrder } from '../Teams/TeamList';

interface TeamSortOptionsProps {
  sortOrder: TeamSortOrder;
  onSortChange: (sortOrder: TeamSortOrder) => void;
}

export const TeamSortOptions: React.FC<TeamSortOptionsProps> = ({
  sortOrder,
  onSortChange,
}) => {
  return (
    <div className='dropdown-menu'>
      <Link
        className={`dropdown-item ${sortOrder === 'asc' ? 'active' : ''}`}
        to='#'
        onClick={(e) => {
          e.preventDefault();
          onSortChange('asc');
        }}
      >
        <i className='ti ti-sort-ascending me-2' />
        Sort by A-Z
      </Link>
      <Link
        className={`dropdown-item ${sortOrder === 'desc' ? 'active' : ''}`}
        to='#'
        onClick={(e) => {
          e.preventDefault();
          onSortChange('desc');
        }}
      >
        <i className='ti ti-sort-descending me-2' />
        Sort by Z-A
      </Link>
      <Link
        className={`dropdown-item ${sortOrder === 'recent' || sortOrder === 'recentlyAdded' ? 'active' : ''}`}
        to='#'
        onClick={(e) => {
          e.preventDefault();
          onSortChange('recent');
        }}
      >
        <i className='ti ti-calendar-time me-2' />
        Sort by Recently Added
      </Link>
    </div>
  );
};
