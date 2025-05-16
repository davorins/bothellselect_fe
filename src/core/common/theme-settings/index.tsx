import React, { useRef, useState } from 'react';

const ThemeSettings = () => {
  return (
    <>
      <div className='sidebar-contact '>
        <div
          className='toggle-theme'
          data-bs-toggle='offcanvas'
          data-bs-target='#theme-setting'
        >
          <i className='fa fa-cog fa-w-16 fa-spin' />
        </div>
      </div>
      <div
        className='sidebar-themesettings offcanvas offcanvas-end'
        id='theme-setting'
      >
        <div className='offcanvas-header d-flex align-items-center justify-content-between bg-light-500'></div>
      </div>
    </>
  );
};

export default ThemeSettings;
