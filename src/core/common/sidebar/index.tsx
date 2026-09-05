import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface TooltipState {
  label: string;
  top: number;
  left: number;
}

const Sidebar = () => {
  const location = useLocation();

  const { user } = useAuth() as {
    user: User | null;
  };

  /* =========================================================
     REDUX
     ========================================================= */

  const miniSidebar = useSelector(
    (state: any) => state.sidebarSlice.miniSidebar,
  );

  const expandMenu = useSelector((state: any) => state.sidebarSlice.expandMenu);

  /* =========================================================
     LOCAL STATE
     ========================================================= */

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [expandedSubmenus, setExpandedSubmenus] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  /* =========================================================
     MINI SIDEBAR STATE
     ========================================================= */

  const isMiniSidebar = miniSidebar && !expandMenu;

  /* =========================================================
     TOOLTIP (rendered via portal - see below)
     ========================================================= */

  /*
   * The sidebar's scroll container (react-custom-scrollbars-2) clips
   * any child positioned outside its own bounds, so a CSS-only
   * ::after tooltip anchored to a link inside it can never be seen
   * once it extends past the sidebar's edge. Rendering the tooltip
   * through a portal straight to document.body sidesteps that
   * clipping entirely.
   */
  const showTooltip = (event: React.MouseEvent<HTMLElement>, label: string) => {
    if (!isMiniSidebar) return;

    const rect = event.currentTarget.getBoundingClientRect();

    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => setTooltip(null);

  /* =========================================================
     LINK HELPER
     ========================================================= */

  const getItemLink = (
    item?: MainMenuItem | SubmenuItem,
  ): string | undefined => {
    return item?.link || item?.path;
  };

  /* =========================================================
     NORMALIZE SIDEBAR DATA
     ========================================================= */

  const normalizedData = useMemo<MainMenuItem[]>(() => {
    return SidebarData.map((item: any) => {
      // Convert a top-level item that only has a link
      // into the same structure as the other menu items.
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

  /* =========================================================
     ROLE FILTERING
     ========================================================= */

  const filteredSidebarData = useMemo<MainMenuItem[]>(() => {
    const role = user?.role || 'user';

    return normalizedData
      .map((mainItem) => {
        const filteredChildren = (mainItem.submenuItems || [])
          .filter(
            (item: SubmenuItem) => !item.roles || item.roles.includes(role),
          )
          .map((item: SubmenuItem) => {
            // Special Parents behavior
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

            // Filter nested menus
            if (item.submenuItems) {
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

  /* =========================================================
     TOP LEVEL MENU TOGGLE
     ========================================================= */

  const toggleMenu = (label: string) => {
    setExpandedMenus((previous) => {
      if (previous.includes(label)) {
        return [];
      }

      return [label];
    });
  };

  /* =========================================================
     NESTED MENU TOGGLE
     ========================================================= */

  const toggleSubmenu = (label: string) => {
    setExpandedSubmenus((previous) =>
      previous.includes(label)
        ? previous.filter((item) => item !== label)
        : [...previous, label],
    );
  };

  /* =========================================================
     ACTIVE ROUTE
     ========================================================= */

  const isActivePath = (link?: string) => {
    if (!link) return false;

    return (
      location.pathname === link || location.pathname.startsWith(`${link}/`)
    );
  };

  /* =========================================================
     ACTIVE CHILD
     ========================================================= */

  const hasActiveChild = (item: MainMenuItem | SubmenuItem): boolean => {
    if (isActivePath(getItemLink(item))) {
      return true;
    }

    return (item.submenuItems || []).some((child) => hasActiveChild(child));
  };

  /* =========================================================
     AUTO OPEN ACTIVE TOP LEVEL MENU
     ========================================================= */

  useEffect(() => {
    let activeMainLabel: string | null = null;

    filteredSidebarData.forEach((mainItem) => {
      if (hasActiveChild(mainItem)) {
        activeMainLabel = mainItem.label;
      }
    });

    setExpandedMenus(activeMainLabel ? [activeMainLabel] : []);
  }, [location.pathname, filteredSidebarData]);

  /* =========================================================
     NESTED MENU RENDERER
     ========================================================= */

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
          onMouseEnter={(e) => showTooltip(e, item.label)}
          onMouseLeave={hideTooltip}
        >
          {item.icon && (
            <i className={`${item.icon} menu-icon`} aria-hidden='true' />
          )}

          <span className='menu-label'>{item.label}</span>

          {!isMiniSidebar && (
            <i
              className={`ti ti-chevron-${isOpen ? 'up' : 'down'} menu-arrow`}
              aria-hidden='true'
            />
          )}
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
                    className={`sidebar-link nested-submenu-link ${
                      active ? 'active' : ''
                    }`}
                    onMouseEnter={(e) => showTooltip(e, sub.label)}
                    onMouseLeave={hideTooltip}
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

  /* =========================================================
     MAIN MENU RENDERER
     ========================================================= */

  const renderMainMenuItem = (mainItem: MainMenuItem, index: number) => {
    const children = mainItem.submenuItems || [];

    if (children.length === 0) {
      return null;
    }

    // If there is only one direct child, make the parent itself a direct link
    const isDirectMenu =
      children.length === 1 && !!children[0].link && !children[0].submenuItems;

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
            onMouseEnter={(e) => showTooltip(e, mainItem.label)}
            onMouseLeave={hideTooltip}
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

    /* -------------------------------------------------------
       Regular parent menu
       ------------------------------------------------------- */

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
          onMouseEnter={(e) => showTooltip(e, mainItem.label)}
          onMouseLeave={hideTooltip}
        >
          {mainItem.icon && (
            <i className={`${mainItem.icon} menu-icon`} aria-hidden='true' />
          )}

          <span className='menu-label'>{mainItem.label}</span>

          {!isMiniSidebar && (
            <i
              className={`ti ti-chevron-${isOpen ? 'up' : 'down'} menu-arrow`}
              aria-hidden='true'
            />
          )}
        </button>

        {isOpen && (
          <ul className='sidebar-submenu'>
            {children.map((item) => {
              const hasNested =
                !!item.submenuItems && item.submenuItems.length > 0;

              if (hasNested) {
                return renderNestedMenu(item, mainItem);
              }

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
                    onMouseEnter={(e) => showTooltip(e, item.label)}
                    onMouseLeave={hideTooltip}
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

  /* =========================================================
     RENDER
     ========================================================= */

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

      {tooltip &&
        createPortal(
          <div
            className='sidebar-tooltip-portal'
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Sidebar;
