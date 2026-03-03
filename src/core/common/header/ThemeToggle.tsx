import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setDataTheme } from '../../data/redux/themeSettingSlice';

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const dataTheme = useSelector((state: any) => state.themeSetting.dataTheme);

  const handleToggleClick = useCallback(() => {
    if (dataTheme === 'default_data_theme') {
      dispatch(setDataTheme('dark_data_theme'));
    } else {
      dispatch(setDataTheme('default_data_theme'));
    }
  }, [dataTheme, dispatch]);

  return (
    <Link
      onClick={handleToggleClick}
      to='#'
      id='dark-mode-toggle'
      className='dark-mode-toggle activate btn btn-outline-light bg-white btn-icon me-1'
    >
      <i
        className={
          dataTheme === 'default_data_theme'
            ? 'ti ti-moon'
            : 'ti ti-brightness-up'
        }
      />
    </Link>
  );
};

export default ThemeToggle;
