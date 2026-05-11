import React from 'react';
import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();
const Footer = () => {
  return (
    <footer className='footer'>
      <div className='copyright'>
        © {currentYear} Bothell Select by{' '}
        <a href='https://rainbootsmarketing.com/'>Rainboots</a>
      </div>
      <div className='footer-links'>
        <Link to='/privacy-policy'>
          <i className='ti ti-lock'></i>
          <span className='link-text'>Privacy Policy</span>
        </Link>
        <Link to='/terms-conditions'>
          <i className='ti ti-file-text'></i>
          <span className='link-text'>Terms and Conditions</span>
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
