import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Scrollbars from 'react-custom-scrollbars-2';
import { SidebarData } from '../../data/json/sidebarData';
import '../../../style/icon/tabler-icons/webfont/tabler-icons.css';
import { setExpandMenu } from '../../data/redux/sidebarSlice';
import { useDispatch } from 'react-redux';
import {
  resetAllMode,
  setDataLayout,
} from '../../data/redux/themeSettingSlice';
import usePreviousRoute from './usePreviousRoute';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../../feature-module/router/all_routes';

const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subOpen, setSubopen] = useState<any>('');
  const [subsidebar, setSubsidebar] = useState('');

  // Enhanced filter function with role-based handling
  const filterSidebarData = (data: any[], role: string) => {
    return data
      .map((mainLabel) => ({
        ...mainLabel,
        submenuItems: mainLabel.submenuItems
          .filter((item: any) => !item.roles || item.roles.includes(role))
          .map((item: any) => {
            // Special handling for Parents menu item
            if (item.label === 'Parents') {
              return {
                ...item,
                // For regular users, modify the link to their detail page
                link:
                  role === 'user'
                    ? `${all_routes.parentDetail}/${user?._id}`
                    : item.link,
                isUserParentLink: role === 'user',
              };
            }
            return {
              ...item,
              submenuItems: item.submenuItems
                ? item.submenuItems.filter(
                    (subItem: any) =>
                      !subItem.roles || subItem.roles.includes(role)
                  )
                : [],
            };
          }),
      }))
      .filter((mainLabel) => mainLabel.submenuItems.length > 0);
  };

  const filteredSidebarData = filterSidebarData(
    SidebarData,
    user?.role || 'user'
  );

  const toggleSidebar = (title: any) => {
    localStorage.setItem('menuOpened', title);
    if (title === subOpen) {
      setSubopen('');
    } else {
      setSubopen(title);
    }
  };

  const toggleSubsidebar = (subitem: any) => {
    if (subitem === subsidebar) {
      setSubsidebar('');
    } else {
      setSubsidebar(subitem);
    }
  };

  const handleLayoutChange = (layout: string) => {
    dispatch(setDataLayout(layout));
  };

  const handleClick = (
    label: any,
    themeSetting: any,
    layout: any,
    item: any
  ) => {
    toggleSidebar(label);
    if (themeSetting) {
      handleLayoutChange(layout);
    }

    // Special handling for Parents menu item for regular users
    if (item?.isUserParentLink) {
      navigate(`${all_routes.parentDetail}/${user?._id}`);
      return;
    }
  };

  const getLayoutClass = (label: any) => {
    switch (label) {
      case 'Default':
        return 'default_layout';
      case 'Mini':
        return 'mini_layout';
      case 'Box':
        return 'boxed_layout';
      case 'Dark':
        return 'dark_data_theme';
      case 'RTL':
        return 'rtl';
      default:
        return '';
    }
  };

  const previousLocation = usePreviousRoute();

  useEffect(() => {
    const layoutPages = [
      '/layout-dark',
      '/layout-rtl',
      '/layout-mini',
      '/layout-box',
      '/layout-default',
    ];

    const isCurrentLayoutPage = layoutPages.some((path) =>
      location.pathname.includes(path)
    );
    const isPreviousLayoutPage =
      previousLocation &&
      layoutPages.some((path) => previousLocation.pathname.includes(path));

    if (isPreviousLayoutPage && !isCurrentLayoutPage) {
      dispatch(resetAllMode());
    }
  }, [location, previousLocation, dispatch]);

  useEffect(() => {
    setSubopen(localStorage.getItem('menuOpened'));
    const submenus = document.querySelectorAll('.submenu');
    submenus.forEach((submenu) => {
      const listItems = submenu.querySelectorAll('li');
      submenu.classList.remove('active');
      listItems.forEach((item) => {
        if (item.classList.contains('active')) {
          submenu.classList.add('active');
          return;
        }
      });
    });
  }, [location.pathname]);

  const onMouseEnter = () => {
    dispatch(setExpandMenu(true));
  };

  const onMouseLeave = () => {
    dispatch(setExpandMenu(false));
  };

  return (
    <div
      className='sidebar'
      id='sidebar'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Scrollbars>
        <div className='sidebar-inner slimscroll'>
          <div id='sidebar-menu' className='sidebar-menu'>
            <ul>
              {filteredSidebarData?.map((mainLabel, index) => (
                <li key={index}>
                  <h6 className='submenu-hdr'>
                    <span>{mainLabel?.label}</span>
                  </h6>
                  <ul>
                    {mainLabel?.submenuItems?.map((title: any, i: number) => {
                      let link_array: any = [];
                      if ('submenuItems' in title) {
                        title.submenuItems?.forEach((link: any) => {
                          link_array.push(link?.link);
                          if (link?.submenu && 'submenuItems' in link) {
                            link.submenuItems?.forEach((item: any) => {
                              link_array.push(item?.link);
                            });
                          }
                        });
                      }
                      title.links = link_array;

                      return (
                        <li className='submenu' key={title.label}>
                          <Link
                            to={title?.submenu ? '#' : title?.link}
                            onClick={(e) => {
                              if (title?.isUserParentLink) {
                                e.preventDefault();
                              }
                              handleClick(
                                title?.label,
                                title?.themeSetting,
                                getLayoutClass(title?.label),
                                title
                              );
                            }}
                            className={`${
                              subOpen === title?.label ? 'subdrop' : ''
                            } ${
                              title?.links?.includes(location.pathname)
                                ? 'active'
                                : ''
                            } ${
                              title?.submenuItems
                                ?.map((link: any) => link?.link)
                                .includes(location.pathname) ||
                              title?.link === location.pathname
                                ? 'active'
                                : ''
                            }`}
                          >
                            <i className={title.icon}></i>
                            <span>{title?.label}</span>
                            {title?.version && (
                              <span className='badge badge-primary badge-xs text-white fs-10 ms-auto'>
                                {title?.version}
                              </span>
                            )}
                            <span
                              className={title?.submenu ? 'menu-arrow' : ''}
                            />
                          </Link>
                          {title?.submenu !== false &&
                            subOpen === title?.label && (
                              <ul
                                style={{
                                  display:
                                    subOpen === title?.label ? 'block' : 'none',
                                }}
                              >
                                {title?.submenuItems?.map((item: any) => (
                                  <li
                                    className={
                                      item?.submenuItems
                                        ? 'submenu submenu-two '
                                        : ''
                                    }
                                    key={item.label}
                                  >
                                    <Link
                                      to={item?.link}
                                      className={`${
                                        item?.submenuItems
                                          ?.map((link: any) => link?.link)
                                          .includes(location.pathname) ||
                                        item?.link === location.pathname
                                          ? 'active'
                                          : ''
                                      } ${
                                        subsidebar === item?.label
                                          ? 'subdrop'
                                          : ''
                                      }`}
                                      onClick={() => {
                                        toggleSubsidebar(item?.label);
                                      }}
                                    >
                                      {item?.label}
                                      <span
                                        className={
                                          item?.submenu ? 'menu-arrow' : ''
                                        }
                                      />
                                    </Link>
                                    {item?.submenuItems && (
                                      <ul
                                        style={{
                                          display:
                                            subsidebar === item?.label
                                              ? 'block'
                                              : 'none',
                                        }}
                                      >
                                        {item?.submenuItems?.map(
                                          (items: any) => (
                                            <li key={items.label}>
                                              <Link
                                                to={items?.link}
                                                className={`${
                                                  subsidebar === items?.label
                                                    ? 'submenu-two subdrop'
                                                    : 'submenu-two'
                                                } ${
                                                  items?.submenuItems
                                                    ?.map(
                                                      (link: any) => link.link
                                                    )
                                                    .includes(
                                                      location.pathname
                                                    ) ||
                                                  items?.link ===
                                                    location.pathname
                                                    ? 'active'
                                                    : ''
                                                }`}
                                              >
                                                {items?.label}
                                              </Link>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Scrollbars>
    </div>
  );
};

export default Sidebar;
