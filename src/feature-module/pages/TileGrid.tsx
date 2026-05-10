/**
 * TileGrid.tsx
 *
 * Wrap your page items with this component to get the glass tile layout.
 * Each child passed to TileGrid becomes one glass tile.
 *
 * Usage:
 *   <TileGrid>
 *     <TileItem icon="ti-trophy" label="Sign Up" sublabel="Register now" onClick={...} />
 *     <TileItem icon="ti-calendar" label="Schedule" sublabel="View events" onClick={...} />
 *     ...
 *   </TileGrid>
 *
 * OR, if you control PageRenderer, have it render
 *   <div className="hp-tile-grid" data-count={count}>
 *     {tiles.map(t => <div className="hp-tile" ...>...</div>)}
 *   </div>
 */

import React from 'react';

interface TileGridProps {
  children: React.ReactNode;
}

/**
 * Wraps children in a glass tile grid that adjusts columns based on count.
 * Applies hp-tile-grid + data-count so CSS picks up the right grid template.
 */
export const TileGrid: React.FC<TileGridProps> = ({ children }) => {
  const count = React.Children.count(children);
  return (
    <div className='hp-tile-grid' data-count={Math.min(count, 6)}>
      {children}
    </div>
  );
};

interface TileItemProps {
  icon?: string; // Tabler icon class e.g. "ti-trophy"
  label: string; // Main tile label
  sublabel?: string; // Optional secondary text
  isActive?: boolean; // Highlights tile as selected
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Individual glass tile. Use inside TileGrid.
 */
export const TileItem: React.FC<TileItemProps> = ({
  icon,
  label,
  sublabel,
  isActive,
  onClick,
  children,
}) => {
  return (
    <div
      className={`hp-tile ${isActive ? 'hp-tile--active' : ''}`}
      onClick={onClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className='hp-tile__label'>
        {icon && <i className={`ti ${icon}`} />}
        {label}
      </div>
      {sublabel && <div className='hp-tile__sublabel'>{sublabel}</div>}
      {children}
      <span className='hp-tile__arrow'>›</span>
    </div>
  );
};

export default TileGrid;
