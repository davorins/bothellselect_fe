import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen: React.FC = () => {
  return (
    <div
      className='fixed inset-0 flex items-center justify-center bg-white z-50'
      style={{
        width: '100vw',
        height: '100vh',
        // Prevent scrolling when splash screen is visible
        overflow: 'hidden',
      }}
    >
      {/* Ripple Glow */}
      <motion.div
        className='absolute w-40 h-40 rounded-full'
        style={{ border: '2px solid #506ee4' }}
        animate={{
          scale: [1, 1.3],
          opacity: [1, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: 'easeInOut',
        }}
      />

      {/* Bouncing Ball */}
      <motion.div
        className='z-10'
        animate={{
          y: [0, -30, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: 'easeInOut',
        }}
      >
        <svg
          width='80'
          height='80'
          viewBox='0 0 100 100'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='50'
            cy='50'
            r='45'
            stroke='#506ee4'
            strokeWidth='8'
            fill='transparent'
          />
          <path
            d='M15,50 A35,35 0 0,1 85,50'
            stroke='#506ee4'
            strokeWidth='4'
            fill='none'
          />
          <path
            d='M50,15 A35,35 0 0,0 50,85'
            stroke='#506ee4'
            strokeWidth='4'
            fill='none'
          />
        </svg>
      </motion.div>

      {/* Bothell Select Text */}
      <div className='absolute bottom-12 text-center'>
        <h1 className='text-xl tracking-wider' style={{ color: '#506ee4' }}>
          Bothell Select
        </h1>
        <div className='mt-2 text-sm text-gray-600'>Loading...</div>
      </div>
    </div>
  );
};

export default SplashScreen;
