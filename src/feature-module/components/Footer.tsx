import React from 'react';
import { Link } from 'react-router-dom'; // Add this import

const currentYear = new Date().getFullYear();
const Footer = () => {
  return (
    <footer className='footer'>
      <div className='copyright'>
        © {currentYear} Bothell Select by{' '}
        <a href='https://rainbootsmarketing.com/'>Rainboots</a>
      </div>
      <div className='footer-links'>
        <Link to='/privacy-policy'>Privacy Policy</Link>
        <Link to='/terms-conditions'>Terms and Conditions</Link>
      </div>
    </footer>
  );
};

export default Footer;
