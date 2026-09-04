import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Scrollbars from 'react-custom-scrollbars-2';
import { SidebarData } from '../../data/json/sidebarData';
import '../../../style/icon/tabler-icons/webfont/tabler-icons.css';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../../feature-module/router/all_routes';

// Define interfaces for type safety
interface SubmenuItem {
  label: string;
  icon?: string;
  submenu?: boolean;
  showSubRoute?: boolean;
  link?: string;
  path?: string;
  roles?: string[];
  submenuItems?: SubmenuItem[];
  version?: string;
  isAdminView?: boolean;
  isUserView?: boolean;
  accessRole?: string;
  links?: string[];
}

interface MainMenuItem {
  label: string;
  submenuOpen?: boolean;
  showSubRoute?: boolean;
  submenuHdr?: string;
  submenuItems: SubmenuItem[];
}

interface User {
  role: string;
  _id?: string;
}

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() as { user: User | null };
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [subsidebar, setSubsidebar] = useState<string>('');

  useEffect(() => {
    console.log('Current Auth State:', {
      role: user?.role,
      id: user?._id,
    });
  }, [user]);

  const filterSidebarData = (
    data: MainMenuItem[],
    role: string,
    userId?: string,
  ): MainMenuItem[] => {
    return data
      .map((mainLabel) => ({
        ...mainLabel,
        submenuItems: mainLabel.submenuItems
          .filter(
            (item: SubmenuItem) => !item.roles || item.roles.includes(role),
          )
          .map((item: SubmenuItem) => {
            if (item.label === 'Parents') {
              const isAdminView = role === 'admin';
              return {
                ...item,
                link: isAdminView
                  ? all_routes.parentList
                  : `${all_routes.parentDetail}/${userId}`,
                isAdminView,
                isUserView: !isAdminView,
                accessRole: role,
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
    user?._id,
  );

  const toggleMenu = (menuLabel: string) => {
    setExpandedMenus((prev) => {
      if (prev.includes(menuLabel)) {
        return prev.filter((label) => label !== menuLabel);
      } else {
        return [...prev, menuLabel];
      }
    });
  };

  const toggleSubsidebar = (subitem: string) => {
    if (subitem === subsidebar) {
      setSubsidebar('');
    } else {
      setSubsidebar(subitem);
    }
  };

  const handleClick = (label: string, item: SubmenuItem) => {
    console.log('Navigation request:', {
      label,
      userRole: user?.role,
      itemRole: item?.accessRole,
    });

    // If it's a menu header (has submenuItems), toggle expansion
    if (item?.submenuItems && !item?.submenu) {
      toggleMenu(label);
      return;
    }

    if (item?.label === 'Parents') {
      if (user?.role === 'admin') {
        console.log('Admin accessing parent list');
        navigate(`${all_routes.parentList}?refresh=${Date.now()}`);
        return;
      }

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

  // Auto-expand menu containing current route on load
  useEffect(() => {
    const currentPath = location.pathname;
    const menuToExpand: string[] = [];

    filteredSidebarData.forEach((mainLabel: MainMenuItem) => {
      mainLabel.submenuItems.forEach((item: SubmenuItem) => {
        if (
          item.link === currentPath ||
          (item.submenuItems &&
            item.submenuItems.some(
              (sub: SubmenuItem) => sub.link === currentPath,
            ))
        ) {
          menuToExpand.push(mainLabel.label);
        }
      });
    });

    if (menuToExpand.length > 0) {
      setExpandedMenus((prev) => {
        const newMenus = [...prev];
        menuToExpand.forEach((menu) => {
          if (!newMenus.includes(menu)) {
            newMenus.push(menu);
          }
        });
        return newMenus;
      });
    }

    // Set active submenu
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
  }, [location.pathname, filteredSidebarData]);

  return (
    <div className='sidebar' id='sidebar'>
      <Scrollbars>
        <div className='sidebar-inner slimscroll'>
          <div id='sidebar-menu' className='sidebar-menu'>
            <ul>
              {filteredSidebarData?.map(
                (mainLabel: MainMenuItem, index: number) => (
                  <li key={index}>
                    <h6 className='submenu-hdr'>
                      <span>{mainLabel?.label}</span>
                    </h6>
                    <ul>
                      {mainLabel?.submenuItems?.map(
                        (title: SubmenuItem, i: number) => {
                          const linkArray: string[] = [];
                          if (title.submenuItems) {
                            title.submenuItems.forEach((link: SubmenuItem) => {
                              if (link?.link) {
                                linkArray.push(link.link);
                              }
                              if (link?.submenu && link.submenuItems) {
                                link.submenuItems.forEach(
                                  (item: SubmenuItem) => {
                                    if (item?.link) {
                                      linkArray.push(item.link);
                                    }
                                  },
                                );
                              }
                            });
                          }
                          title.links = linkArray;

                          const isExpanded = expandedMenus.includes(
                            title?.label,
                          );

                          const isActive =
                            title?.links?.includes(location.pathname) ||
                            title?.submenuItems?.some(
                              (link: SubmenuItem) =>
                                link?.link === location.pathname,
                            ) ||
                            title?.link === location.pathname;

                          return (
                            <li className='submenu' key={title.label}>
                              <Link
                                to={
                                  title?.submenu || title?.submenuItems
                                    ? '#'
                                    : title?.path || title?.link || '#'
                                }
                                onClick={(e) => {
                                  if (title?.submenu || title?.submenuItems) {
                                    e.preventDefault();
                                  }
                                  handleClick(title?.label, title);
                                }}
                                className={`${isExpanded ? 'subdrop' : ''} ${
                                  isActive ? 'active' : ''
                                }`}
                              >
                                {title.icon && <i className={title.icon}></i>}
                                <span>{title?.label}</span>
                                {title?.version && (
                                  <span className='badge badge-primary badge-xs text-white fs-10 ms-auto'>
                                    {title?.version}
                                  </span>
                                )}
                                {(title?.submenu !== false ||
                                  title?.submenuItems) && (
                                  <span className='menu-arrow' />
                                )}
                              </Link>
                              {(title?.submenu !== false ||
                                title?.submenuItems) &&
                                isExpanded && (
                                  <ul style={{ display: 'block' }}>
                                    {title?.submenuItems?.map(
                                      (item: SubmenuItem) => (
                                        <li
                                          className={
                                            item?.submenuItems
                                              ? 'submenu submenu-two'
                                              : ''
                                          }
                                          key={item.label}
                                        >
                                          <Link
                                            to={item?.link || '#'}
                                            className={`${
                                              item?.submenuItems?.some(
                                                (link: SubmenuItem) =>
                                                  link?.link ===
                                                  location.pathname,
                                              ) ||
                                              item?.link === location.pathname
                                                ? 'active'
                                                : ''
                                            } ${
                                              subsidebar === item?.label
                                                ? 'subdrop'
                                                : ''
                                            }`}
                                            onClick={() => {
                                              if (item?.submenuItems) {
                                                toggleSubsidebar(item?.label);
                                              } else if (item?.link) {
                                                navigate(item.link);
                                              }
                                            }}
                                          >
                                            {item?.label}
                                            {item?.submenuItems && (
                                              <span className='menu-arrow' />
                                            )}
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
                                                (subItem: SubmenuItem) => (
                                                  <li key={subItem.label}>
                                                    <Link
                                                      to={subItem?.link || '#'}
                                                      className={`${
                                                        subsidebar ===
                                                        subItem?.label
                                                          ? 'submenu-two subdrop'
                                                          : 'submenu-two'
                                                      } ${
                                                        subItem?.submenuItems?.some(
                                                          (link: SubmenuItem) =>
                                                            link.link ===
                                                            location.pathname,
                                                        ) ||
                                                        subItem?.link ===
                                                          location.pathname
                                                          ? 'active'
                                                          : ''
                                                      }`}
                                                    >
                                                      {subItem?.label}
                                                    </Link>
                                                  </li>
                                                ),
                                              )}
                                            </ul>
                                          )}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                )}
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </Scrollbars>
    </div>
  );
};

export default Sidebar;
