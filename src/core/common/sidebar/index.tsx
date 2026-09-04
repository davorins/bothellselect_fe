import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Scrollbars from 'react-custom-scrollbars-2';
import { useSelector } from 'react-redux';

import { SidebarData } from '../../data/json/sidebarData';
import '../../../style/icon/tabler-icons/webfont/tabler-icons.css';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../../feature-module/router/all_routes';

import './sidebar-styles.css';

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
  path?: string;
}

interface User {
  role: string;
  _id?: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();

  const { user } = useAuth() as {
    user: User | null;
  };

  /*
   * Redux sidebar state
   */
  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);

  const expandMenu = useSelector((state: any) => state.sidebarSlice.expandMenu);

  /*
   * Mini sidebar is determined ONLY from Redux.
   */
  const isMiniSidebar = dataLayout === 'mini_layout' && !expandMenu;

  /*
   * Menu expansion state
   */
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([]);

  /*
   * Convert either link or path to a usable route.
   */
  const getItemLink = (
    item?: MainMenuItem | SubmenuItem,
  ): string | undefined => {
    if (!item) return undefined;

    return item.link || item.path;
  };

  /*
   * Normalize sidebar data.
   *
   * Direct links are converted into a single-child menu.
   */
  const normalizedData = useMemo<MainMenuItem[]>(() => {
    return (SidebarData as any[]).map((item: any) => {
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
              roles: item.roles,
            },
          ],
          link: undefined,
        };
      }

      return {
        ...item,
        submenuItems: item.submenuItems || [],
      };
    });
  }, []);

  /*
   * Filter menu items based on user role.
   */
  const filteredSidebarData = useMemo<MainMenuItem[]>(() => {
    const role = user?.role || 'user';

    return normalizedData
      .map((mainItem) => {
        const filteredChildren = (mainItem.submenuItems || [])
          .filter(
            (item: SubmenuItem) => !item.roles || item.roles.includes(role),
          )
          .map((item: SubmenuItem) => {
            /*
             * Special handling for Parents.
             */
            if (item.label === 'Parents') {
              const isAdminView = role === 'admin';

              return {
                ...item,
                link: isAdminView
                  ? all_routes.parentList
                  : `${all_routes.parentDetail}/${user?._id || ''}`,
                isAdminView,
                isUserView: !isAdminView,
                accessRole: role,
              };
            }

            /*
             * Filter nested submenu items.
             */
            if (item.submenuItems && item.submenuItems.length > 0) {
              return {
                ...item,
                submenuItems: item.submenuItems.filter(
                  (sub: SubmenuItem) => !sub.roles || sub.roles.includes(role),
                ),
              };
            }

            return item;
          });

        return {
          ...mainItem,
          submenuItems: filteredChildren,
        };
      })
      .filter((mainItem) => (mainItem.submenuItems || []).length > 0);
  }, [normalizedData, user]);

  /*
   * Determine if a route is active.
   */
  const isActivePath = (link?: string): boolean => {
    if (!link) return false;

    return (
      location.pathname === link || location.pathname.startsWith(`${link}/`)
    );
  };

  /*
   * Determine if this item or any child is active.
   */
  const hasActiveChild = (item: MainMenuItem | SubmenuItem): boolean => {
    if (isActivePath(getItemLink(item))) {
      return true;
    }

    return (item.submenuItems || []).some((child) => hasActiveChild(child));
  };

  /*
   * Toggle top-level menu.
   */
  const toggleMenu = (label: string) => {
    setExpandedMenus((previous) => {
      if (previous.includes(label)) {
        return [];
      }

      return [label];
    });

    /*
     * Reset nested menus when switching
     * top-level menus.
     */
    setExpandedSubmenus([]);
  };

  /*
   * Toggle nested submenu.
   */
  const toggleSubmenu = (label: string) => {
    setExpandedSubmenus((previous) =>
      previous.includes(label)
        ? previous.filter((item) => item !== label)
        : [...previous, label],
    );
  };

  /*
   * Automatically open the menu containing
   * the current route.
   */
  useEffect(() => {
    let activeMainLabel: string | null = null;

    filteredSidebarData.forEach((mainItem) => {
      if (hasActiveChild(mainItem)) {
        activeMainLabel = mainItem.label;
      }
    });

    setExpandedMenus(activeMainLabel ? [activeMainLabel] : []);
  }, [location.pathname, filteredSidebarData]);

  /*
   * Render nested submenu.
   */
  const renderNestedMenu = (item: SubmenuItem, mainItem: MainMenuItem) => {
    const isOpen = expandedSubmenus.includes(item.label);

    const isActive = hasActiveChild(item);

    return (
      <li
        key={`${mainItem.label}-${item.label}`}
        className='sidebar-menu-item sidebar-nested-item'
      >
        <button
          type='button'
          className={`sidebar-link submenu-link ${
            isActive ? 'active' : ''
          } ${isOpen ? 'expanded' : ''}`}
          onClick={() => toggleSubmenu(item.label)}
          data-tooltip={item.label}
        >
          {item.icon && (
            <i className={`${item.icon} menu-icon`} aria-hidden='true' />
          )}

          <span className='menu-label'>{item.label}</span>

          <i
            className={`ti ti-chevron-${isOpen ? 'up' : 'down'} menu-arrow`}
            aria-hidden='true'
          />
        </button>

        {isOpen && (
          <ul
            className={`sidebar-submenu nested-submenu ${
              isMiniSidebar ? 'mini-stack' : ''
            }`}
          >
            {(item.submenuItems || []).map((sub) => {
              const link = getItemLink(sub);

              if (!link) {
                return null;
              }

              const active = isActivePath(link);

              return (
                <li
                  key={`${item.label}-${sub.label}`}
                  className='sidebar-menu-item'
                >
                  <Link
                    to={link}
                    className={`sidebar-link nested-submenu-link ${
                      active ? 'active' : ''
                    }`}
                    data-tooltip={sub.label}
                  >
                    {sub.icon && (
                      <i
                        className={`${sub.icon} menu-icon`}
                        aria-hidden='true'
                      />
                    )}

                    <span className='menu-label'>{sub.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  /*
   * Render top-level menu.
   */
  const renderMainMenuItem = (mainItem: MainMenuItem, index: number) => {
    const children = mainItem.submenuItems || [];

    if (children.length === 0) {
      return null;
    }

    /*
     * A menu with one direct child becomes
     * a direct link.
     *
     * Example:
     *
     * Dashboard
     *   Dashboard
     *
     * becomes:
     *
     * Dashboard
     */
    const isDirectMenu =
      children.length === 1 &&
      !!getItemLink(children[0]) &&
      !children[0].submenuItems?.length;

    /*
     * DIRECT LINK
     */
    if (isDirectMenu) {
      const child = children[0];

      const link = getItemLink(child);

      if (!link) {
        return null;
      }

      const active = isActivePath(link);

      return (
        <li key={`${mainItem.label}-${index}`} className='sidebar-menu-item'>
          <Link
            to={link}
            className={`sidebar-link ${active ? 'active' : ''}`}
            data-tooltip={mainItem.label}
          >
            {(mainItem.icon || child.icon) && (
              <i
                className={`${mainItem.icon || child.icon} menu-icon`}
                aria-hidden='true'
              />
            )}

            <span className='menu-label'>{mainItem.label}</span>
          </Link>
        </li>
      );
    }

    /*
     * NORMAL MENU WITH CHILDREN
     */
    const isOpen = expandedMenus.includes(mainItem.label);

    const isActive = hasActiveChild(mainItem);

    return (
      <li key={`${mainItem.label}-${index}`} className='sidebar-menu-item'>
        <button
          type='button'
          className={`sidebar-link sidebar-parent-link ${
            isActive ? 'active' : ''
          } ${isOpen ? 'expanded' : ''}`}
          onClick={() => toggleMenu(mainItem.label)}
          data-tooltip={mainItem.label}
          aria-expanded={isOpen}
        >
          {mainItem.icon && (
            <i className={`${mainItem.icon} menu-icon`} aria-hidden='true' />
          )}

          <span className='menu-label'>{mainItem.label}</span>

          <i
            className={`ti ti-chevron-${isOpen ? 'up' : 'down'} menu-arrow`}
            aria-hidden='true'
          />
        </button>

        {isOpen && (
          <ul
            className={`sidebar-submenu ${isMiniSidebar ? 'mini-stack' : ''}`}
          >
            {children.map((item) => {
              const hasNested =
                !!item.submenuItems && item.submenuItems.length > 0;

              /*
               * Nested submenu
               */
              if (hasNested) {
                return renderNestedMenu(item, mainItem);
              }

              /*
               * Regular submenu link
               */
              const link = getItemLink(item);

              if (!link) {
                return null;
              }

              const active = isActivePath(link);

              return (
                <li
                  key={`${mainItem.label}-${item.label}`}
                  className='sidebar-menu-item'
                >
                  <Link
                    to={link}
                    className={`sidebar-link submenu-link ${
                      active ? 'active' : ''
                    }`}
                    data-tooltip={item.label}
                  >
                    {item.icon && (
                      <i
                        className={`${item.icon} menu-icon`}
                        aria-hidden='true'
                      />
                    )}

                    <span className='menu-label'>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      id='sidebar'
      className={`sidebar ${isMiniSidebar ? 'mini-sidebar' : ''}`}
    >
      <Scrollbars>
        <div className='sidebar-inner slimscroll'>
          <div id='sidebar-menu' className='sidebar-menu'>
            <ul className='sidebar-root-menu'>
              {filteredSidebarData.map((mainItem, index) =>
                renderMainMenuItem(mainItem, index),
              )}
            </ul>
          </div>
        </div>
      </Scrollbars>
    </div>
  );
};

export default Sidebar;
