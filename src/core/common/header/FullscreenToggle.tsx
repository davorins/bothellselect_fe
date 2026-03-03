import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

const FullscreenToggle = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {});
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => {});
        }
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  return (
    <Link
      onClick={toggleFullscreen}
      to='#'
      className='btn btn-outline-light bg-white btn-icon me-1'
      id='btnFullscreen'
    >
      <i className='ti ti-maximize' />
    </Link>
  );
};

export default FullscreenToggle;
