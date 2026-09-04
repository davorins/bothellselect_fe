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
  submenuOpen?: boolean;
  submenuHdr?: string;
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
            // Handle "Parents" special case
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

            // Recursively filter nested submenu items
            if (item.submenuItems) {
              return {
                ...item,
                submenuItems: item.submenuItems.filter(
                  (subItem: SubmenuItem) =>
                    !subItem.roles || subItem.roles.includes(role),
                ),
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
        // Check if current path matches any link in this menu
        if (
          item.link === currentPath ||
          (item.submenuItems &&
            item.submenuItems.some(
              (sub: SubmenuItem) => sub.link === currentPath,
            ))
        ) {
          menuToExpand.push(item.label);
        }

        // Also check nested items
        if (item.submenuItems) {
          item.submenuItems.forEach((subItem: SubmenuItem) => {
            if (subItem.link === currentPath) {
              menuToExpand.push(item.label);
            }
          });
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

  // Helper function to check if a menu item is active
  const isMenuItemActive = (item: SubmenuItem): boolean => {
    if (item.link === location.pathname) return true;
    if (item.submenuItems) {
      return item.submenuItems.some(
        (sub: SubmenuItem) => sub.link === location.pathname,
      );
    }
    return false;
  };

  // Helper function to check if a nested submenu item is active
  const isNestedSubmenuActive = (item: SubmenuItem): boolean => {
    if (item.link === location.pathname) return true;
    if (item.submenuItems) {
      return item.submenuItems.some(
        (sub: SubmenuItem) => sub.link === location.pathname,
      );
    }
    return false;
  };

  // Recursive function to render menu items with icons
  const renderMenuItem = (item: SubmenuItem, isNested: boolean = false) => {
    const isExpanded = expandedMenus.includes(item.label);
    const hasChildren = item.submenuItems && item.submenuItems.length > 0;
    const isActive = isMenuItemActive(item);

    if (hasChildren) {
      // This is a submenu with children
      return (
        <li
          key={item.label}
          className={isNested ? 'submenu submenu-two' : 'submenu'}
        >
          <Link
            to='#'
            onClick={(e) => {
              e.preventDefault();
              handleClick(item.label, item);
            }}
            className={`${isExpanded ? 'subdrop' : ''} ${isActive ? 'active' : ''}`}
          >
            {item.icon && <i className={item.icon}></i>}
            <span>{item.label}</span>
            <span className='menu-arrow' />
          </Link>
          {isExpanded && (
            <ul style={{ display: 'block' }}>
              {item.submenuItems?.map((subItem: SubmenuItem) =>
                renderMenuItem(subItem, true),
              )}
            </ul>
          )}
        </li>
      );
    } else {
      // This is a leaf menu item
      return (
        <li key={item.label}>
          <Link
            to={item.link || '#'}
            className={`${item.link === location.pathname ? 'active' : ''}`}
            onClick={() => {
              if (item.link) {
                navigate(item.link);
              }
            }}
          >
            {item.icon && <i className={item.icon}></i>}
            <span>{item.label}</span>
            {item.version && (
              <span className='badge badge-primary badge-xs text-white fs-10 ms-auto'>
                {item.version}
              </span>
            )}
          </Link>
        </li>
      );
    }
  };

  // Legacy render method for compatibility with existing structure
  const renderLegacyMenuItem = (
    title: SubmenuItem,
    mainLabel: MainMenuItem,
  ) => {
    const linkArray: string[] = [];
    if (title.submenuItems) {
      title.submenuItems.forEach((link: SubmenuItem) => {
        if (link?.link) {
          linkArray.push(link.link);
        }
        if (link?.submenu && link.submenuItems) {
          link.submenuItems.forEach((item: SubmenuItem) => {
            if (item?.link) {
              linkArray.push(item.link);
            }
          });
        }
      });
    }
    title.links = linkArray;

    const isExpanded = expandedMenus.includes(title?.label);
    const isActive =
      title?.links?.includes(location.pathname) ||
      title?.submenuItems?.some(
        (link: SubmenuItem) => link?.link === location.pathname,
      ) ||
      title?.link === location.pathname;

    const hasChildren = title.submenuItems && title.submenuItems.length > 0;

    return (
      <li className='submenu' key={title.label}>
        <Link
          to={hasChildren ? '#' : title?.path || title?.link || '#'}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
            }
            handleClick(title?.label, title);
          }}
          className={`${isExpanded ? 'subdrop' : ''} ${isActive ? 'active' : ''}`}
        >
          {title.icon && <i className={title.icon}></i>}
          <span>{title?.label}</span>
          {title?.version && (
            <span className='badge badge-primary badge-xs text-white fs-10 ms-auto'>
              {title?.version}
            </span>
          )}
          {hasChildren && <span className='menu-arrow' />}
        </Link>
        {hasChildren && isExpanded && (
          <ul style={{ display: 'block' }}>
            {title?.submenuItems?.map((item: SubmenuItem) => {
              const hasNestedChildren =
                item.submenuItems && item.submenuItems.length > 0;

              if (hasNestedChildren) {
                // Handle nested submenu (like Event Configurations)
                const isNestedExpanded = subsidebar === item?.label;
                const isNestedActive = isNestedSubmenuActive(item);

                return (
                  <li key={item.label} className='submenu submenu-two'>
                    <Link
                      to='#'
                      className={`${isNestedExpanded ? 'subdrop' : ''} ${isNestedActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubsidebar(item?.label);
                      }}
                    >
                      {item.icon && <i className={item.icon}></i>}
                      <span>{item.label}</span>
                      <span className='menu-arrow' />
                    </Link>
                    {isNestedExpanded && (
                      <ul style={{ display: 'block' }}>
                        {item.submenuItems?.map((subItem: SubmenuItem) => (
                          <li key={subItem.label}>
                            <Link
                              to={subItem?.link || '#'}
                              className={`${subItem.link === location.pathname ? 'active' : ''}`}
                              onClick={() => {
                                if (subItem.link) {
                                  navigate(subItem.link);
                                }
                              }}
                            >
                              {subItem.icon && <i className={subItem.icon}></i>}
                              <span>{subItem.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              } else {
                // Regular submenu item
                return (
                  <li key={item.label}>
                    <Link
                      to={item?.link || '#'}
                      className={`${item?.link === location.pathname ? 'active' : ''}`}
                      onClick={() => {
                        if (item.link) {
                          navigate(item.link);
                        }
                      }}
                    >
                      {item.icon && <i className={item.icon}></i>}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              }
            })}
          </ul>
        )}
      </li>
    );
  };

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
                      {mainLabel?.submenuItems?.map((title: SubmenuItem) =>
                        renderLegacyMenuItem(title, mainLabel),
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
