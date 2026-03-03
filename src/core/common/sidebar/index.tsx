import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Scrollbars from 'react-custom-scrollbars-2';
import { SidebarData } from '../../data/json/sidebarData';
import '../../../style/icon/tabler-icons/webfont/tabler-icons.css';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../../feature-module/router/all_routes';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subOpen, setSubopen] = useState<any>('');
  const [subsidebar, setSubsidebar] = useState('');

  useEffect(() => {
    console.log('Current Auth State:', {
      role: user?.role,
      id: user?._id,
    });
  }, [user]);

  const filterSidebarData = (data: any[], role: string, userId?: string) => {
    return data
      .map((mainLabel) => ({
        ...mainLabel,
        submenuItems: mainLabel.submenuItems
          .filter((item: any) => !item.roles || item.roles.includes(role))
          .map((item: any) => {
            if (item.label === 'Parents') {
              const isAdminView = role === 'admin';
              return {
                ...item,
                link: isAdminView
                  ? all_routes.parentList
                  : `${all_routes.parentDetail}/${userId}`,
                isAdminView, // Clear naming convention
                isUserView: !isAdminView,
                accessRole: role, // Track actual role
              };
            }
            return item;
          }),
      }))
      .filter((mainLabel) => mainLabel.submenuItems.length > 0);
  };

  const filteredSidebarData = filterSidebarData(
    SidebarData,
    user?.role || 'user',
    user?._id
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

  const handleClick = (label: any, item: any) => {
    console.log('Navigation request:', {
      label,
      userRole: user?.role,
      itemRole: item?.accessRole,
    });

    toggleSidebar(label);

    if (item?.label === 'Parents') {
      // Handle ADMIN case
      if (user?.role === 'admin') {
        console.log('Admin accessing parent list');
        navigate(`${all_routes.parentList}?refresh=${Date.now()}`);
        return;
      }

      // Handle USER case
      if (user?.role === 'user' && user?._id) {
        console.log('Parent accessing their profile');
        navigate(`${all_routes.parentDetail}/${user._id}`);
        return;
      }

      console.error('Unauthorized access attempt');
      return;
    }

    // Default navigation
    if (!item?.submenu && item?.link) {
      navigate(item.link);
    }
  };

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

  return (
    <div className='sidebar' id='sidebar'>
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
                            to={
                              title?.submenu ? '#' : title?.path || title?.link
                            }
                            onClick={(e) => {
                              if (title?.submenu) {
                                e.preventDefault();
                              }
                              handleClick(title?.label, title);
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
                                        ? 'submenu submenu-two'
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
                                      onClick={() =>
                                        toggleSubsidebar(item?.label)
                                      }
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
