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
  placement: 'right' | 'left';
}

/* =========================================================
   INDENTATION
   ========================================================= */
const BASE_PADDING_PX = 16;
const LEVEL_STEP_PX = 30;

const paddingForLevel = (level: number) =>
  BASE_PADDING_PX + LEVEL_STEP_PX * level;

/* =========================================================
   TOOLTIP MEASUREMENT HELPERS
   ========================================================= */
const TOOLTIP_GAP_PX = 10;
const TOOLTIP_ESTIMATED_WIDTH_PX = 160; // used only for early flip decision

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
     TOOLTIP (rendered via portal)
     ========================================================= */

  const showTooltip = (event: React.MouseEvent<HTMLElement>, label: string) => {
    if (!isMiniSidebar) return;

    const rect = event.currentTarget.getBoundingClientRect();

    // Decide placement: prefer right, flip to left if it would overflow.
    const wouldOverflowRight =
      rect.right + TOOLTIP_GAP_PX + TOOLTIP_ESTIMATED_WIDTH_PX >
      window.innerWidth;

    const placement: 'right' | 'left' = wouldOverflowRight ? 'left' : 'right';

    const left =
      placement === 'right'
        ? rect.right + TOOLTIP_GAP_PX
        : rect.left - TOOLTIP_GAP_PX;

    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      left,
      placement,
    });
  };

  const hideTooltip = () => setTooltip(null);

  /* =========================================================
     SAFETY: hide tooltip whenever we leave mini mode
     ========================================================= */

  useEffect(() => {
    if (!isMiniSidebar) {
      setTooltip(null);
    }
  }, [isMiniSidebar]);

  /* =========================================================
     SAFETY: hide tooltip if the sidebar scrolls or the window
     resizes while a tooltip is visible (prevents stale
     positions since tooltip is position: fixed)
     ========================================================= */

  useEffect(() => {
    if (!tooltip) return;

    const handle = () => setTooltip(null);

    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);

    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [tooltip]);

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

  const filterByRole = (items: SubmenuItem[], role: string): SubmenuItem[] => {
    return items
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => {
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

        if (item.submenuItems && item.submenuItems.length > 0) {
          return {
            ...item,
            submenuItems: filterByRole(item.submenuItems, role),
          };
        }

        return item;
      });
  };

  const filteredSidebarData = useMemo<MainMenuItem[]>(() => {
    const role = user?.role || 'user';

    return normalizedData
      .map((mainItem) => ({
        ...mainItem,
        submenuItems: filterByRole(mainItem.submenuItems || [], role),
      }))
      .filter((mainItem) => (mainItem.submenuItems || []).length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
     SUBMENU TOGGLE
     ========================================================= */

  const toggleSubmenu = (key: string) => {
    setExpandedSubmenus((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
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
     COLLECT ACTIVE SUBMENU KEYS
     ========================================================= */

  const collectActiveKeys = (
    items: SubmenuItem[],
    parentKey: string,
    acc: string[],
  ) => {
    items.forEach((item) => {
      const key = `${parentKey}>${item.label}`;

      if (item.submenuItems && item.submenuItems.length > 0) {
        if (hasActiveChild(item)) {
          acc.push(key);
        }
        collectActiveKeys(item.submenuItems, key, acc);
      }
    });
  };

  /* =========================================================
     AUTO OPEN ACTIVE BRANCHES
     ========================================================= */

  useEffect(() => {
    let activeMainLabel: string | null = null;
    const activeSubmenuKeys: string[] = [];

    filteredSidebarData.forEach((mainItem) => {
      if (hasActiveChild(mainItem)) {
        activeMainLabel = mainItem.label;
        collectActiveKeys(
          mainItem.submenuItems || [],
          mainItem.label,
          activeSubmenuKeys,
        );
      }
    });

    setExpandedMenus(activeMainLabel ? [activeMainLabel] : []);
    setExpandedSubmenus(activeSubmenuKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, filteredSidebarData]);

  /* =========================================================
     RECURSIVE SUBMENU RENDERER
     Toggle items with children are plain <button> elements -
     no href, no navigation semantics, no preventDefault/
     onKeyDown workarounds needed. A native <button> already
     activates on Enter/Space and never matches an `a`-scoped
     selector in the base template's stylesheet, which is
     exactly what was causing these items to pick up the
     template's bold/anchor-specific styling once they'd been
     switched to <Link>.
     ========================================================= */

  const renderSubmenuItems = (
    items: SubmenuItem[],
    level: number,
    parentKey: string,
  ) => {
    return items.map((item) => {
      const key = `${parentKey}>${item.label}`;
      const hasChildren = !!item.submenuItems && item.submenuItems.length > 0;
      const indentStyle: React.CSSProperties = {
        paddingLeft: paddingForLevel(level),
      };

      if (hasChildren) {
        const isOpen = expandedSubmenus.includes(key);
        const isActive = hasActiveChild(item);

        return (
          <li key={key} className='sidebar-menu-item'>
            <button
              type='button'
              aria-label={item.label}
              className={`sidebar-link submenu-link ${
                isActive ? 'active' : ''
              } ${isOpen ? 'expanded' : ''}`}
              style={indentStyle}
              onClick={() => toggleSubmenu(key)}
              onMouseEnter={(e) => showTooltip(e, item.label)}
              onMouseLeave={hideTooltip}
            >
              {item.icon && (
                <i className={`${item.icon} menu-icon`} aria-hidden='true' />
              )}

              <span className='menu-label'>{item.label}</span>
            </button>

            {isOpen && (
              <ul className='sidebar-submenu'>
                {renderSubmenuItems(item.submenuItems || [], level + 1, key)}
              </ul>
            )}
          </li>
        );
      }

      const link = getItemLink(item);

      if (!link) return null;

      const active = isActivePath(link);

      return (
        <li key={key} className='sidebar-menu-item'>
          <Link
            to={link}
            aria-label={item.label}
            className={`sidebar-link submenu-link ${active ? 'active' : ''}`}
            style={indentStyle}
            onMouseEnter={(e) => showTooltip(e, item.label)}
            onMouseLeave={hideTooltip}
          >
            {item.icon && (
              <i className={`${item.icon} menu-icon`} aria-hidden='true' />
            )}

            <span className='menu-label'>{item.label}</span>
          </Link>
        </li>
      );
    });
  };

  /* =========================================================
     MAIN MENU RENDERER
     ========================================================= */

  const renderMainMenuItem = (mainItem: MainMenuItem, index: number) => {
    const children = mainItem.submenuItems || [];

    if (children.length === 0) {
      return null;
    }

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
            aria-label={mainItem.label}
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
       Regular parent menu - plain <button>, no href
       ------------------------------------------------------- */

    const isOpen = expandedMenus.includes(mainItem.label);
    const isActive = hasActiveChild(mainItem);

    return (
      <li key={`${mainItem.label}-${index}`} className='sidebar-menu-item'>
        <button
          type='button'
          aria-label={mainItem.label}
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
        </button>

        {isOpen && (
          <ul className='sidebar-submenu'>
            {renderSubmenuItems(children, 1, mainItem.label)}
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
            className={`sidebar-tooltip-portal sidebar-tooltip-portal--${tooltip.placement}`}
            style={{ top: tooltip.top, left: tooltip.left }}
            role='tooltip'
          >
            {tooltip.label}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Sidebar;
