// Sidebar.tsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Scrollbars from 'react-custom-scrollbars-2';
import { SidebarData } from '../../data/json/sidebarData';
import '../../../style/icon/tabler-icons/webfont/tabler-icons.css';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../../feature-module/router/all_routes';
import './sidebar-styles.css';

// Interfaces
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
  path?: string; // Added to fix TypeScript error
}

interface User {
  role: string;
  _id?: string;
}

// Styles
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

  // Helper to get link from item (supports both 'link' and 'path')
  const getItemLink = (
    item?: MainMenuItem | SubmenuItem,
  ): string | undefined => {
    return item?.link || item?.path;
  };

  // Normalize data: convert items with only 'link' to have submenuItems
  const normalizeSidebarData = (data: any[]): MainMenuItem[] => {
    return data.map((item) => {
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
        return { ...item, submenuItems: item.submenuItems };
      }
      return { ...item, submenuItems: [] };
    });
  };

  // Filter by role and handle special cases
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
            if (item.submenuItems) {
              return {
                ...item,
                submenuItems: item.submenuItems.filter(
                  (sub: SubmenuItem) => !sub.roles || sub.roles.includes(role),
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

  // Toggle menu (accordion: only one open at a time)
  const toggleMenu = (menuLabel: string) => {
    setExpandedMenus((prev) => {
      if (prev.includes(menuLabel)) {
        return prev.filter((label) => label !== menuLabel);
      }
      return [menuLabel];
    });
  };

  const toggleSubsidebar = (subitem: string) => {
    setSubsidebar((prev) => (prev === subitem ? '' : subitem));
  };

  // Handle click on menu items
  const handleClick = (label: string, item: SubmenuItem | MainMenuItem) => {
    // If it has submenuItems, it's a parent
    if (item.submenuItems && item.submenuItems.length > 0) {
      const visibleItems = item.submenuItems.filter(
        (sub) => !sub.roles || sub.roles.includes(user?.role || 'user'),
      );
      // If single visible item and no parent icon, treat as direct link
      if (visibleItems.length === 1 && !item.icon) {
        const single = visibleItems[0];
        const link = getItemLink(single);
        if (link) navigate(link);
        return;
      }
      // Otherwise toggle expansion
      toggleMenu(label);
      return;
    }

    // Leaf item: navigate directly
    const link = getItemLink(item);
    if (link) {
      navigate(link);
    }
  };

  // Check if a main menu is a single-item menu (no expansion)
  const isSingleItemMenu = (mainLabel: MainMenuItem): boolean => {
    const visible = (mainLabel.submenuItems || []).filter(
      (item) => !item.roles || item.roles.includes(user?.role || 'user'),
    );
    return visible.length === 1 && !mainLabel.icon;
  };

  // Auto-expand the menu containing the current route
  useEffect(() => {
    const currentPath = location.pathname;
    const toExpand: string[] = [];

    filteredSidebarData.forEach((main) => {
      if (isSingleItemMenu(main)) return;
      (main.submenuItems || []).forEach((item) => {
        if (getItemLink(item) === currentPath) {
          toExpand.push(main.label);
        }
        if (item.submenuItems) {
          item.submenuItems.forEach((sub) => {
            if (getItemLink(sub) === currentPath) {
              toExpand.push(main.label);
            }
          });
        }
      });
    });

    if (toExpand.length > 0) {
      setExpandedMenus((prev) => {
        const merged = [...prev];
        toExpand.forEach((m) => {
          if (!merged.includes(m)) merged.push(m);
        });
        return merged;
      });
    }
  }, [location.pathname, filteredSidebarData]);

  // Helper to check if a nested submenu is active
  const isNestedSubmenuActive = (item: SubmenuItem): boolean => {
    if (getItemLink(item) === location.pathname) return true;
    if (item.submenuItems) {
      return item.submenuItems.some(
        (sub) => getItemLink(sub) === location.pathname,
      );
    }
    return false;
  };

  const isMenuItemActive = (item: SubmenuItem | MainMenuItem): boolean => {
    if (getItemLink(item) === location.pathname) return true;
    if (item.submenuItems) {
      return item.submenuItems.some((sub) => {
        if (getItemLink(sub) === location.pathname) return true;
        if (sub.submenuItems) {
          return sub.submenuItems.some(
            (nested) => getItemLink(nested) === location.pathname,
          );
        }
        return false;
      });
    }
    return false;
  };

  // Render a single main menu item
  const renderMainMenuItem = (mainLabel: MainMenuItem, index: number) => {
    const isExpanded = expandedMenus.includes(mainLabel.label);
    const isSingle = isSingleItemMenu(mainLabel);
    const isActive = isMenuItemActive(mainLabel);

    // Single item – direct link
    if (isSingle) {
      const singleItem = (mainLabel.submenuItems || [])[0];
      if (!singleItem) return null;
      const link = getItemLink(singleItem);
      const isLinkActive = link === location.pathname;
      // Icon: use parent icon if exists, else child icon
      const icon = mainLabel.icon || singleItem.icon;
      return (
        <li key={index} style={{ listStyle: 'none' }}>
          <Link
            to={link || '#'}
            style={{
              ...styles.link,
              ...(isLinkActive ? styles.activeLink : {}),
            }}
            className={isLinkActive ? 'active' : ''}
            onClick={() => link && navigate(link)}
          >
            {icon && <i className={icon} style={styles.icon}></i>}
            <span>{mainLabel.label}</span>
          </Link>
        </li>
      );
    }

    // Multi-item – collapsible
    const arrowStyle = isExpanded
      ? { ...styles.menuArrow, ...styles.menuArrowExpanded }
      : styles.menuArrow;

    return (
      <li key={index} style={{ listStyle: 'none' }}>
        <Link
          to='#'
          style={{
            ...styles.link,
            ...(isActive ? styles.activeLink : {}),
          }}
          className={`${isExpanded ? 'subdrop' : ''} ${isActive ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            toggleMenu(mainLabel.label);
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
            {(mainLabel.submenuItems || []).map((item) => {
              const hasNested =
                item.submenuItems && item.submenuItems.length > 0;

              if (hasNested) {
                // Nested submenu (e.g., Event Configurations)
                const isNestedExpanded = subsidebar === item.label;
                const isNestedActive = isNestedSubmenuActive(item);
                const nestedArrow = isNestedExpanded
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
                        toggleSubsidebar(item.label);
                      }}
                    >
                      {item.icon && (
                        <i className={item.icon} style={styles.icon}></i>
                      )}
                      <span>{item.label}</span>
                      <span className='menu-arrow' style={nestedArrow}>
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
                        {(item.submenuItems || []).map((sub) => {
                          const link = getItemLink(sub);
                          const isSubActive = link === location.pathname;
                          return (
                            <li key={sub.label} style={{ listStyle: 'none' }}>
                              <Link
                                to={link || '#'}
                                style={{
                                  ...styles.link,
                                  ...styles.nestedSubmenuLink,
                                  ...(isSubActive ? styles.activeLink : {}),
                                }}
                                className={isSubActive ? 'active' : ''}
                                onClick={() => link && navigate(link)}
                              >
                                {sub.icon && (
                                  <i
                                    className={sub.icon}
                                    style={styles.icon}
                                  ></i>
                                )}
                                <span>{sub.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              } else {
                // Regular submenu item
                const link = getItemLink(item);
                const isSubActive = link === location.pathname;
                return (
                  <li key={item.label} style={{ listStyle: 'none' }}>
                    <Link
                      to={link || '#'}
                      style={{
                        ...styles.link,
                        ...styles.submenuLink,
                        ...(isSubActive ? styles.activeLink : {}),
                      }}
                      className={isSubActive ? 'active' : ''}
                      onClick={() => link && navigate(link)}
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
              {filteredSidebarData.map((mainLabel, index) =>
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
