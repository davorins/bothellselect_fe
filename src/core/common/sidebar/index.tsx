// Sidebar.tsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Scrollbars from 'react-custom-scrollbars-2';
import { SidebarData } from '../../data/json/sidebarData';
import '../../../style/icon/tabler-icons/webfont/tabler-icons.css';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../../feature-module/router/all_routes';
import './sidebar-styles.css';

// Define interfaces for type safety
export interface SubmenuItem {
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

export interface MainMenuItem {
  label: string;
  submenuOpen?: boolean;
  showSubRoute?: boolean;
  submenuHdr?: string;
  icon?: string;
  submenuItems?: SubmenuItem[];
  link?: string;
}

interface User {
  role: string;
  _id?: string;
}

// Styles for consistent icon and text spacing
const styles = {
  icon: {
    marginRight: '12px',
    fontSize: '18px',
    width: '20px',
    display: 'inline-block',
    textAlign: 'center' as const,
    color: 'inherit',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    color: '#6b7280',
    textDecoration: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer' as const,
  },
  submenuLink: {
    paddingLeft: '48px',
  },
  nestedSubmenuLink: {
    paddingLeft: '72px',
  },
  activeLink: {
    color: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  menuArrow: {
    marginLeft: 'auto',
    transition: 'transform 0.2s',
  },
  menuArrowExpanded: {
    transform: 'rotate(90deg)',
  },
};

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

  // Normalize sidebar data - convert single items to have submenuItems
  const normalizeSidebarData = (data: any[]): MainMenuItem[] => {
    return data.map((item) => {
      // If item has link but no submenuItems (like FAQ), convert it
      if (item.link && !item.submenuItems) {
        return {
          ...item,
          submenuItems: [
            {
              label: item.label,
              icon: item.icon,
              link: item.link,
              submenu: false,
              showSubRoute: false,
            },
          ],
          link: undefined,
        };
      }

      if (item.submenuItems) {
        return {
          ...item,
          submenuItems: item.submenuItems,
        };
      }

      return {
        ...item,
        submenuItems: [],
      };
    });
  };

  const filterSidebarData = (
    data: MainMenuItem[],
    role: string,
    userId?: string,
  ): MainMenuItem[] => {
    return data
      .map((mainLabel) => ({
        ...mainLabel,
        submenuItems: (mainLabel.submenuItems || [])
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
      .filter(
        (mainLabel) =>
          mainLabel.submenuItems && mainLabel.submenuItems.length > 0,
      );
  };

  const normalizedData = normalizeSidebarData(SidebarData);
  const filteredSidebarData = filterSidebarData(
    normalizedData,
    user?.role || 'user',
    user?._id,
  );

  // Toggle menu with proper accordion behavior
  const toggleMenu = (menuLabel: string) => {
    setExpandedMenus((prev) => {
      // If this menu is already expanded, close it
      if (prev.includes(menuLabel)) {
        return prev.filter((label) => label !== menuLabel);
      }

      // Close all other menus and open this one
      return [menuLabel];
    });
  };

  const toggleSubsidebar = (subitem: string) => {
    if (subitem === subsidebar) {
      setSubsidebar('');
    } else {
      setSubsidebar(subitem);
    }
  };

  const handleClick = (
    label: string,
    item: SubmenuItem | MainMenuItem,
    e?: React.MouseEvent,
  ) => {
    console.log('Navigation request:', {
      label,
      userRole: user?.role,
      hasSubmenuItems: !!item?.submenuItems,
      link: 'link' in item ? item.link : undefined,
    });

    // Check if this is a leaf item with a link (like Home, About Us, etc.)
    if (
      'link' in item &&
      item.link &&
      (!item.submenuItems || item.submenuItems.length === 0)
    ) {
      navigate(item.link);
      return;
    }

    // If it's a main menu item with submenuItems, toggle expansion
    if (item?.submenuItems && item?.submenuItems.length > 0) {
      // Check if it should be a direct link (single visible item with no icon)
      const visibleItems = item.submenuItems.filter(
        (subItem) =>
          !subItem.roles || subItem.roles.includes(user?.role || 'user'),
      );

      // If only one visible item and no icon, navigate directly
      if (visibleItems.length === 1 && !item.icon) {
        const singleItem = visibleItems[0];
        if (singleItem.link) {
          navigate(singleItem.link);
          return;
        }
      }

      // Otherwise toggle expansion
      toggleMenu(label);
      return;
    }

    // Default navigation for leaf items
    if ('link' in item && item.link) {
      navigate(item.link);
    }
  };

  // Check if a main menu should be treated as a direct link (single item with no icon)
  const isSingleItemMenu = (mainLabel: MainMenuItem): boolean => {
    const items = mainLabel.submenuItems || [];
    const visibleItems = items.filter(
      (item) => !item.roles || item.roles.includes(user?.role || 'user'),
    );
    return visibleItems.length === 1 && !mainLabel.icon;
  };

  // Auto-expand menu containing current route on load
  useEffect(() => {
    const currentPath = location.pathname;
    const menuToExpand: string[] = [];

    filteredSidebarData.forEach((mainLabel: MainMenuItem) => {
      // Skip single item menus (they don't expand)
      if (isSingleItemMenu(mainLabel)) return;

      (mainLabel.submenuItems || []).forEach((item: SubmenuItem) => {
        // Check direct link
        if (item.link === currentPath) {
          menuToExpand.push(mainLabel.label);
        }
        // Check nested items
        if (item.submenuItems) {
          item.submenuItems.forEach((subItem: SubmenuItem) => {
            if (subItem.link === currentPath) {
              menuToExpand.push(mainLabel.label);
            }
          });
        }
      });
    });

    // Only set expanded if we found matches and they're not already expanded
    if (menuToExpand.length > 0) {
      setExpandedMenus((prev) => {
        // Only add if not already present
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

  // Check if a menu item is active
  const isMenuItemActive = (item: SubmenuItem | MainMenuItem): boolean => {
    if ('link' in item && item.link === location.pathname) return true;
    if (item.submenuItems) {
      return item.submenuItems.some((sub: SubmenuItem) => {
        if (sub.link === location.pathname) return true;
        if (sub.submenuItems) {
          return sub.submenuItems.some(
            (nested: SubmenuItem) => nested.link === location.pathname,
          );
        }
        return false;
      });
    }
    return false;
  };

  // Render main menu items
  const renderMainMenuItem = (mainLabel: MainMenuItem, index: number) => {
    const isExpanded = expandedMenus.includes(mainLabel.label);
    const isSingleItem = isSingleItemMenu(mainLabel);
    const isActive = isMenuItemActive(mainLabel);

    // If it's a single item, render as direct link (no expansion)
    if (isSingleItem) {
      const items = mainLabel.submenuItems || [];
      const singleItem = items[0];
      if (!singleItem) return null;

      const isLinkActive = singleItem.link === location.pathname;
      return (
        <li key={index} style={{ listStyle: 'none' }}>
          <Link
            to={singleItem.link || '#'}
            style={{
              ...styles.link,
              ...(isLinkActive ? styles.activeLink : {}),
            }}
            className={isLinkActive ? 'active' : ''}
            onClick={() => {
              if (singleItem.link) {
                navigate(singleItem.link);
              }
            }}
          >
            {mainLabel.icon && (
              <i className={mainLabel.icon} style={styles.icon}></i>
            )}
            <span>{mainLabel.label}</span>
          </Link>
        </li>
      );
    }

    // If it has multiple items, render as collapsible
    const isMainActive = isActive;
    const arrowStyle = isExpanded
      ? { ...styles.menuArrow, ...styles.menuArrowExpanded }
      : styles.menuArrow;

    return (
      <li key={index} style={{ listStyle: 'none' }}>
        <Link
          to='#'
          style={{
            ...styles.link,
            ...(isMainActive ? styles.activeLink : {}),
          }}
          className={`${isExpanded ? 'subdrop' : ''} ${isMainActive ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            // Check if this is a leaf item (like "Main" with submenuItems)
            if (mainLabel.submenuItems && mainLabel.submenuItems.length > 0) {
              // If it has submenuItems, toggle expansion
              toggleMenu(mainLabel.label);
            } else {
              // Otherwise navigate
              handleClick(mainLabel.label, mainLabel);
            }
          }}
        >
          {mainLabel.icon && (
            <i className={mainLabel.icon} style={styles.icon}></i>
          )}
          <span>{mainLabel.label}</span>
          <span className='menu-arrow' style={arrowStyle}>
            ▸
          </span>
        </Link>
        {isExpanded && (
          <ul
            style={{
              display: 'block',
              listStyle: 'none',
              paddingLeft: 0,
              margin: 0,
            }}
          >
            {(mainLabel.submenuItems || []).map((item: SubmenuItem) => {
              const hasNestedChildren =
                item.submenuItems && item.submenuItems.length > 0;

              if (hasNestedChildren) {
                // Handle nested submenu (like Event Configurations)
                const isNestedExpanded = subsidebar === item?.label;
                const isNestedActive = isNestedSubmenuActive(item);
                const nestedArrowStyle = isNestedExpanded
                  ? { ...styles.menuArrow, ...styles.menuArrowExpanded }
                  : styles.menuArrow;

                return (
                  <li
                    key={item.label}
                    className='submenu submenu-two'
                    style={{ listStyle: 'none' }}
                  >
                    <Link
                      to='#'
                      style={{
                        ...styles.link,
                        ...styles.submenuLink,
                        ...(isNestedActive ? styles.activeLink : {}),
                      }}
                      className={`${isNestedExpanded ? 'subdrop' : ''} ${isNestedActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubsidebar(item?.label);
                      }}
                    >
                      {item.icon && (
                        <i className={item.icon} style={styles.icon}></i>
                      )}
                      <span>{item.label}</span>
                      <span className='menu-arrow' style={nestedArrowStyle}>
                        ▸
                      </span>
                    </Link>
                    {isNestedExpanded && (
                      <ul
                        style={{
                          display: 'block',
                          listStyle: 'none',
                          paddingLeft: 0,
                          margin: 0,
                        }}
                      >
                        {(item.submenuItems || []).map(
                          (subItem: SubmenuItem) => {
                            const isSubActive =
                              subItem.link === location.pathname;
                            return (
                              <li
                                key={subItem.label}
                                style={{ listStyle: 'none' }}
                              >
                                <Link
                                  to={subItem?.link || '#'}
                                  style={{
                                    ...styles.link,
                                    ...styles.nestedSubmenuLink,
                                    ...(isSubActive ? styles.activeLink : {}),
                                  }}
                                  className={isSubActive ? 'active' : ''}
                                  onClick={() => {
                                    if (subItem.link) {
                                      navigate(subItem.link);
                                    }
                                  }}
                                >
                                  {subItem.icon && (
                                    <i
                                      className={subItem.icon}
                                      style={styles.icon}
                                    ></i>
                                  )}
                                  <span>{subItem.label}</span>
                                </Link>
                              </li>
                            );
                          },
                        )}
                      </ul>
                    )}
                  </li>
                );
              } else {
                // Regular submenu item - this is where Home, About Us, etc. are rendered
                const isSubActive = item?.link === location.pathname;
                return (
                  <li key={item.label} style={{ listStyle: 'none' }}>
                    <Link
                      to={item?.link || '#'}
                      style={{
                        ...styles.link,
                        ...styles.submenuLink,
                        ...(isSubActive ? styles.activeLink : {}),
                      }}
                      className={isSubActive ? 'active' : ''}
                      onClick={() => {
                        if (item.link) {
                          navigate(item.link);
                        }
                      }}
                    >
                      {item.icon && (
                        <i className={item.icon} style={styles.icon}></i>
                      )}
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
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              {filteredSidebarData?.map(
                (mainLabel: MainMenuItem, index: number) =>
                  renderMainMenuItem(mainLabel, index),
              )}
            </ul>
          </div>
        </div>
      </Scrollbars>
    </div>
  );
};

export default Sidebar;
