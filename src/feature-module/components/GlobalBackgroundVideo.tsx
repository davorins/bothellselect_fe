// GlobalBackgroundVideo.tsx
import React, { useEffect, useRef, useState } from 'react';

interface GlobalBackgroundVideoProps {
  videoUrl: string;
}

const GlobalBackgroundVideo: React.FC<GlobalBackgroundVideoProps> = ({
  videoUrl,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't show video on mobile for performance
  if (isMobile || !videoUrl) return null;

  return (
    <div className='global-bg-video-container'>
      <video
        ref={videoRef}
        className='global-bg-video'
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        preload='metadata'
      />
      <div className='global-bg-gradient-overlay' />
    </div>
  );
};

export default GlobalBackgroundVideo;
