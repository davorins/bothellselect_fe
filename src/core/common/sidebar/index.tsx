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

  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);

  const expandMenu = useSelector((state: any) => state.sidebarSlice.expandMenu);

  /*
   * Mini sidebar is active when:
   *
   * dataLayout === 'mini_layout'
   * AND
   * expandMenu is false
   */
  const isMiniSidebar = dataLayout === 'mini_layout' && !expandMenu;

  /*
   * Which top-level menus are open
   */
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  /*
   * Which nested menus are open
   */
  const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([]);

  /*
   * Which mini-sidebar menu is currently open.
   *
   * This is separate from expandedMenus because mini mode
   * behaves more like a fly-out menu.
   */
  const [miniOpenMenu, setMiniOpenMenu] = useState<string | null>(null);

  /*
   * Convert either "link" or "path" into the actual route.
   */
  const getItemLink = (
    item?: MainMenuItem | SubmenuItem,
  ): string | undefined => {
    if (!item) return undefined;

    return item.link || item.path;
  };

  /*
   * Normalize SidebarData.
   *
   * Some of your menu entries are direct links while others
   * have submenuItems.
   *
   * A direct link is converted into one child so that the
   * rendering logic remains consistent.
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
   * Filter menu items based on the logged-in user's role.
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
             * Parents behaves differently depending on role.
             *
             * Admin -> parent list
             * User/coach/etc -> own parent detail
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
             * Filter nested submenu items as well.
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
   * Determine whether a route is active.
   */
  const isActivePath = (link?: string): boolean => {
    if (!link) return false;

    return (
      location.pathname === link || location.pathname.startsWith(`${link}/`)
    );
  };

  /*
   * Recursively determine whether an item or one of its
   * children is active.
   */
  const hasActiveChild = (item: MainMenuItem | SubmenuItem): boolean => {
    if (isActivePath(getItemLink(item))) {
      return true;
    }

    return (item.submenuItems || []).some((child) => hasActiveChild(child));
  };

  /*
   * Open/close a top-level menu.
   *
   * Only one top-level menu remains open at a time.
   */
  const toggleMenu = (label: string) => {
    setExpandedMenus((previous) => {
      const currentlyOpen = previous.includes(label);

      if (currentlyOpen) {
        return [];
      }

      return [label];
    });

    /*
     * Reset nested submenu state when changing
     * top-level menu.
     */
    setExpandedSubmenus([]);

    /*
     * In mini mode, this controls the fly-out.
     */
    setMiniOpenMenu((previous) => (previous === label ? null : label));
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
   * When navigating directly to a child route, automatically
   * open its parent menu.
   */
  useEffect(() => {
    let activeMainLabel: string | null = null;

    filteredSidebarData.forEach((mainItem) => {
      if (hasActiveChild(mainItem)) {
        activeMainLabel = mainItem.label;
      }
    });

    if (activeMainLabel) {
      setExpandedMenus([activeMainLabel]);
    }
  }, [location.pathname, filteredSidebarData]);

  /*
   * When leaving mini mode, close any mini popup.
   */
  useEffect(() => {
    if (!isMiniSidebar) {
      setMiniOpenMenu(null);
    }
  }, [isMiniSidebar]);

  /*
   * When clicking a normal link in mini mode, close the popup.
   */
  const handleNavigation = () => {
    if (isMiniSidebar) {
      setMiniOpenMenu(null);
    }
  };

  /*
   * Render deeply nested submenu.
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
          } ${isOpen ? 'subdrop' : ''}`}
          onClick={() => toggleSubmenu(item.label)}
          aria-expanded={isOpen}
        >
          {item.icon && (
            <i className={`${item.icon} menu-icon`} aria-hidden='true' />
          )}

          <span>{item.label}</span>

          <i className='ti ti-chevron-right menu-arrow' aria-hidden='true' />
        </button>

        {isOpen && (
          <ul className='sidebar-submenu nested-submenu'>
            {(item.submenuItems || []).map((sub) => {
              const link = getItemLink(sub);

              if (!link) return null;

              const active = isActivePath(link);

              return (
                <li
                  key={`${item.label}-${sub.label}`}
                  className='sidebar-menu-item'
                >
                  <Link
                    to={link}
                    onClick={handleNavigation}
                    className={`sidebar-link nested-submenu-link ${
                      active ? 'active' : ''
                    }`}
                  >
                    {sub.icon && (
                      <i
                        className={`${sub.icon} menu-icon`}
                        aria-hidden='true'
                      />
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
  };

  /*
   * Render a top-level menu item.
   */
  const renderMainMenuItem = (mainItem: MainMenuItem, index: number) => {
    const children = mainItem.submenuItems || [];

    if (children.length === 0) {
      return null;
    }

    /*
     * If after role filtering there is only one direct child,
     * treat the parent itself as the actual link.
     *
     * Example:
     *
     * Dashboard
     *    Dashboard
     *
     * becomes simply:
     *
     * Dashboard
     */
    const isDirectMenu =
      children.length === 1 &&
      !!getItemLink(children[0]) &&
      !children[0].submenuItems?.length;

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
            onClick={handleNavigation}
            className={`sidebar-link ${active ? 'active' : ''}`}
          >
            {(mainItem.icon || child.icon) && (
              <i
                className={`${mainItem.icon || child.icon} menu-icon`}
                aria-hidden='true'
              />
            )}

            <span>{mainItem.label}</span>
          </Link>
        </li>
      );
    }

    /*
     * Normal menu with children.
     */
    const isOpen = expandedMenus.includes(mainItem.label);

    const isActive = hasActiveChild(mainItem);

    /*
     * Mini mode popup is controlled by miniOpenMenu.
     */
    const miniIsOpen = isMiniSidebar && miniOpenMenu === mainItem.label;

    const submenuClassName = [
      'sidebar-submenu',
      miniIsOpen ? 'mini-submenu-open' : '',
    ]
      .filter(Boolean)
      .join(' ');

    /*
     * In normal mode we use expandedMenus.
     *
     * In mini mode we use miniOpenMenu.
     */
    const shouldShowSubmenu = isMiniSidebar ? miniIsOpen : isOpen;

    return (
      <li
        key={`${mainItem.label}-${index}`}
        className={`sidebar-menu-item ${miniIsOpen ? 'mini-menu-open' : ''}`}
      >
        <button
          type='button'
          className={`sidebar-link sidebar-parent-link ${
            isActive ? 'active' : ''
          } ${isOpen ? 'subdrop' : ''}`}
          onClick={() => toggleMenu(mainItem.label)}
          aria-expanded={shouldShowSubmenu}
        >
          {mainItem.icon && (
            <i className={`${mainItem.icon} menu-icon`} aria-hidden='true' />
          )}

          <span>{mainItem.label}</span>

          <i className='ti ti-chevron-right menu-arrow' aria-hidden='true' />
        </button>

        {shouldShowSubmenu && (
          <ul className={submenuClassName}>
            {children.map((item) => {
              const hasNested =
                !!item.submenuItems && item.submenuItems.length > 0;

              /*
               * Nested menu
               */
              if (hasNested) {
                return renderNestedMenu(item, mainItem);
              }

              /*
               * Regular submenu item
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
                    onClick={handleNavigation}
                    className={`sidebar-link submenu-link ${
                      active ? 'active' : ''
                    }`}
                  >
                    {item.icon && (
                      <i
                        className={`${item.icon} menu-icon`}
                        aria-hidden='true'
                      />
                    )}

                    <span>{item.label}</span>

                    {item.submenuItems && item.submenuItems.length > 0 && (
                      <i
                        className='ti ti-chevron-right menu-arrow'
                        aria-hidden='true'
                      />
                    )}
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
      className={`sidebar ${isMiniSidebar ? 'mini-sidebar' : ''}`}
      id='sidebar'
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
