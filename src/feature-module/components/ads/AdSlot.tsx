import React from 'react';

export type AdPlacement =
  | 'sidebar'
  | 'header'
  | 'footer'
  | 'topbar'
  | 'inline'
  | 'popup';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
  children: React.ReactNode;
}

const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  className = '',
  children,
}) => (
  <div
    data-ad-placement={placement}
    className={`ad-slot ad-slot--${placement} ${className}`.trim()}
  >
    {children}
  </div>
);

export default AdSlot;
