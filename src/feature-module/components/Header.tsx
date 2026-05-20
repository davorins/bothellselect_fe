import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ImageWithBasePath from '../../core/common/imageWithBasePath';
import { all_routes } from '../../feature-module/router/all_routes';
import { useAuth } from '../../context/AuthContext';
import {
  setExpandMenu,
  setMobileSidebar,
} from '../../core/data/redux/sidebarSlice';
import axios from 'axios';
import NotificationDropdown from '../../core/common/header/NotificationDropdown';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DEFAULT_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/parents.png';

interface HeaderProps {
  showSponsorLogo: boolean;
}

/* ─── inline styles ────────────────────────────────────────────────────────── */
const S = {
  header: (scrolled: boolean): React.CSSProperties => ({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    background: scrolled ? 'rgba(0,0,0,0.97)' : '#000',
    borderBottom: scrolled
      ? '1px solid rgba(80,110,228,0.35)'
      : '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    transition: 'border-color 0.3s ease, background 0.3s ease',
  }),

  logo: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    flexShrink: 0,
  }),

  logoImg: (): React.CSSProperties => ({
    height: 36,
    width: 'auto',
    filter: 'brightness(0) invert(1)',
  }),

  nav: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  }),

  navLink: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 13px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: active ? '#fff' : 'rgba(255,255,255,0.62)',
    background: active ? 'rgba(80,110,228,0.18)' : 'transparent',
    borderTop: 'none',
    borderRight: 'none',
    borderLeft: 'none',
    borderBottom: active ? '2px solid #506ee4' : '2px solid transparent',
    transition: 'color 0.18s, background 0.18s, border-color 0.18s',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  }),

  dropdownTrigger: (active: boolean, open: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 13px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: active || open ? '#fff' : 'rgba(255,255,255,0.62)',
    background: open ? 'rgba(80,110,228,0.18)' : 'transparent',
    borderTop: 'none',
    borderRight: 'none',
    borderLeft: 'none',
    borderBottom: active ? '2px solid #506ee4' : '2px solid transparent',

    cursor: 'pointer',
    transition: 'color 0.18s, background 0.18s',
    whiteSpace: 'nowrap',
  }),

  chevron: (open: boolean): React.CSSProperties => ({
    fontSize: 11,
    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
    opacity: 0.7,
  }),

  dropdown: (open: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 'calc(100% + 10px)',
    left: '50%',
    minWidth: 200,
    background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(80,110,228,0.12)',
    padding: '6px 0',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'all' : 'none',
    transform: open
      ? 'translateX(-50%) translateY(0)'
      : 'translateX(-50%) translateY(-6px)',
    transition: 'opacity 0.18s ease, transform 0.18s ease',
    zIndex: 100,
  }),

  dropdownItem: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 16px',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 450,
    color: active ? '#fff' : 'rgba(255,255,255,0.72)',
    textDecoration: 'none',
    background: active ? 'rgba(80,110,228,0.15)' : 'transparent',
    transition: 'background 0.15s, color 0.15s',
    cursor: 'pointer',
  }),

  dropdownDot: (active: boolean): React.CSSProperties => ({
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: active ? '#506ee4' : 'rgba(255,255,255,0.25)',
    flexShrink: 0,
    transition: 'background 0.15s',
  }),

  rightSection: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  }),

  loginBtn: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 18px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.04em',
    background: '#506ee4',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.18s, transform 0.15s',
    whiteSpace: 'nowrap',
  }),

  avatarBtn: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '4px 10px 4px 4px',
    borderRadius: 40,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'background 0.18s, border-color 0.18s',
  }),

  avatarImg: (): React.CSSProperties => ({
    width: 32,
    height: 32,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(80,110,228,0.6)',
    flexShrink: 0,
  }),

  avatarName: (): React.CSSProperties => ({
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    color: 'rgba(255,255,255,0.85)',
    maxWidth: 110,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),

  userDropdown: (open: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    minWidth: 230,
    background: '#0d0d0d',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(80,110,228,0.1)',
    opacity: open ? 1 : 0,
    pointerEvents: open ? 'all' : 'none',
    transform: open ? 'translateY(0)' : 'translateY(-8px)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    zIndex: 100,
    overflow: 'hidden',
  }),

  userDropdownHeader: (): React.CSSProperties => ({
    padding: '14px 16px',
    background: 'rgba(80,110,228,0.08)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  }),

  userDropdownHeaderName: (): React.CSSProperties => ({
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: '#fff',
    margin: 0,
  }),

  userDropdownHeaderRole: (): React.CSSProperties => ({
    fontSize: 11,
    fontFamily: "'DM Sans', sans-serif",
    color: '#506ee4',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginTop: 2,
  }),

  userDropdownItem: (danger?: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 450,
    color: danger ? '#f87171' : 'rgba(255,255,255,0.78)',
    textDecoration: 'none',
    background: 'transparent',
    border: 'none',
    width: '100%',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    textAlign: 'left',
  }),

  divider: (): React.CSSProperties => ({
    height: 1,
    background: 'rgba(255,255,255,0.07)',
    margin: '4px 0',
  }),

  mobileBtn: (): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    width: 40,
    height: 40,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    cursor: 'pointer',
    padding: 0,
  }),

  mobileBarSpan: (active: boolean, i: number): React.CSSProperties => ({
    display: 'block',
    width: 20,
    height: 2,
    background: '#fff',
    borderRadius: 2,
    transition: 'transform 0.25s ease, opacity 0.25s ease',
    transform:
      active && i === 0
        ? 'rotate(45deg) translate(5px, 5px)'
        : active && i === 1
          ? 'scaleX(0)'
          : active && i === 2
            ? 'rotate(-45deg) translate(5px, -5px)'
            : 'none',
    opacity: active && i === 1 ? 0 : 1,
  }),
};

/* ─── Dropdown Link with hover ─────────────────────────────────────────────── */
const DropdownLink: React.FC<{
  to: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ to, active, onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...S.dropdownItem(active),
        background: hovered || active ? 'rgba(80,110,228,0.15)' : 'transparent',
        color: hovered || active ? '#fff' : 'rgba(255,255,255,0.72)',
      }}
    >
      <span style={S.dropdownDot(active || hovered)} />
      {children}
    </Link>
  );
};

/* ─── UserDropdown Item with hover ─────────────────────────────────────────── */
const UserDropdownItem: React.FC<{
  as?: 'link' | 'button';
  to?: string;
  danger?: boolean;
  icon: string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ as = 'link', to, danger, icon, onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  const style: React.CSSProperties = {
    ...S.userDropdownItem(danger),
    background: hovered
      ? danger
        ? 'rgba(248,113,113,0.1)'
        : 'rgba(255,255,255,0.05)'
      : 'transparent',
    color: hovered
      ? danger
        ? '#f87171'
        : '#fff'
      : danger
        ? '#f87171'
        : 'rgba(255,255,255,0.78)',
  };
  const inner = (
    <>
      <i className={icon} style={{ fontSize: 15, opacity: 0.8 }} />
      {children}
    </>
  );
  if (as === 'button') {
    return (
      <button
        style={style}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      to={to!}
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {inner}
    </Link>
  );
};

/* ─── NavLink with hover ────────────────────────────────────────────────────── */
const NavItem: React.FC<{
  to: string;
  active: boolean;
  children: React.ReactNode;
}> = ({ to, active, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <li style={{ position: 'relative' }}>
      <Link
        to={to}
        style={{
          ...S.navLink(active),
          color: hovered || active ? '#fff' : 'rgba(255,255,255,0.62)',
          background:
            hovered || active ? 'rgba(80,110,228,0.15)' : 'transparent',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {children}
      </Link>
    </li>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────*/
const Header: React.FC<HeaderProps> = ({ showSponsorLogo }) => {
  const { isAuthenticated, parent, role, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const routes = all_routes;
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(
    null,
  );
  const [scrolled, setScrolled] = useState(false);
  const [loginHovered, setLoginHovered] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);

  const mobileSidebar = useSelector(
    (state: any) => state.sidebarSlice.mobileSidebar,
  );
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLLIElement>(null);
  const teamRef = useRef<HTMLLIElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#mobile_btn')) return;
      if (
        mobileSidebar &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        closeMobileMenu();
      }
      if (aboutRef.current && !aboutRef.current.contains(target))
        setAboutOpen(false);
      if (teamRef.current && !teamRef.current.contains(target))
        setTeamOpen(false);
      if (userRef.current && !userRef.current.contains(target))
        setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSidebar]);

  // Close dropdowns on route change
  useEffect(() => {
    setAboutOpen(false);
    setTeamOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (paths: string[]) =>
    paths.some((p) => location.pathname.startsWith(p));

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/');
  };
  const handleLoginRedirect = () => {
    closeMobileMenu();
    navigate(routes.login);
  };

  const toggleMobileSidebar = useCallback(() => {
    const next = !mobileSidebar;
    dispatch(setMobileSidebar(next));
    if (!next) setOpenMobileDropdown(null);
  }, [dispatch, mobileSidebar]);

  const closeMobileMenu = useCallback(() => {
    if (mobileSidebar) {
      dispatch(setMobileSidebar(false));
      setOpenMobileDropdown(null);
    }
  }, [dispatch, mobileSidebar]);

  const onMouseEnter = useCallback(
    () => dispatch(setExpandMenu(true)),
    [dispatch],
  );
  const onMouseLeave = useCallback(
    () => dispatch(setExpandMenu(false)),
    [dispatch],
  );

  useEffect(() => {
    if (!parent?._id) return;
    if (parent.avatar?.startsWith('http')) {
      setAvatarSrc(parent.avatar);
      return;
    }
    const token = localStorage.getItem('token');
    axios
      .get(`${API_BASE_URL}/parent/${parent._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const av = res.data?.avatar;
        setAvatarSrc(
          av
            ? av.startsWith('http')
              ? av
              : `https://bothell-select.onrender.com${av}`
            : DEFAULT_AVATAR,
        );
      })
      .catch(() => setAvatarSrc(DEFAULT_AVATAR));
  }, [parent?._id, parent?.avatar]);

  const getDashboardRoute = () =>
    role === 'coach'
      ? routes.coachDashboard || '/dashboard'
      : routes.adminDashboard;

  // Navigation config
  const publicNavItems = [
    { path: '/', label: 'Home' },
    { path: '/tournaments', label: 'Tournaments' },
    { path: '/events', label: 'Schedule' },
    { path: '/contact-us', label: 'Contact' },
    { path: '/faq', label: 'FAQ' },
    { path: '/about-us', label: 'About Us' },
  ];

  const mobilePublicItems = [
    { path: '/', icon: 'ti ti-home-2', label: 'Home' },
    { path: '/tournaments', icon: 'ti ti-trophy', label: 'Tournaments' },
    { path: '/events', icon: 'ti ti-calendar-event', label: 'Schedule/Events' },
    { path: '/contact-us', icon: 'ti ti-mail', label: 'Contact Us' },
    { path: '/faq', icon: 'ti ti-question-mark', label: 'FAQ' },
    { path: '/about-us', icon: 'ti ti-ball-basketball', label: 'About Us' },
  ];

  const dropdownItems = [
    // {
    //   name: 'about',
    //   icon: 'ti ti-chess-knight',
    //   label: 'About Us',
    //   paths: ['/about-us', '/program-leadership'],
    //   items: [
    //     { path: '/about-us', label: 'Our Mission' },
    //     { path: '/program-leadership', label: 'Program Leadership' },
    //   ],
    // },
    {
      name: 'team',
      icon: 'ti ti-ball-basketball',
      label: 'Our Team',
      paths: ['/our-team', '/in-the-spotlight'],
      items: [
        { path: '/our-team', label: 'Team Overview' },
        { path: '/in-the-spotlight', label: 'In The Spotlight' },
      ],
    },
  ];

  const privateNavItems = [
    {
      path: routes.profile,
      icon: 'ti ti-user-circle me-1',
      label: 'My Profile',
    },
    { path: routes.myTickets, icon: 'ti ti-ticket me-1', label: 'My Tickets' },
    {
      path: routes.profilesettings,
      icon: 'ti ti-settings me-1',
      label: 'Settings',
    },
  ];

  return (
    <>
      {/* Google Font: DM Sans */}
      <link
        href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'
        rel='stylesheet'
      />

      {/* ── Desktop Header ─────────────────────────────────────────────────── */}
      <header style={S.header(scrolled)}>
        {/* Logo */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Link to={getDashboardRoute()} style={S.logo()}>
            <img
              src='assets/img/logo.png'
              alt='Bothell Select'
              style={S.logoImg()}
            />
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav
          style={{ display: 'flex', alignItems: 'center' }}
          className='d-none d-md-flex'
        >
          <ul style={S.nav()}>
            {publicNavItems.map((item) => (
              <NavItem
                key={item.path}
                to={item.path}
                active={isActive(item.path)}
              >
                {item.label}
              </NavItem>
            ))}

            {/* About Dropdown */}
            {/* <li ref={aboutRef} style={{ position: 'relative' }}>
              <button
                style={{
                  ...S.dropdownTrigger(
                    isGroupActive(['/about-us', '/program-leadership']),
                    aboutOpen,
                  ),
                }}
                onClick={() => {
                  setAboutOpen((p) => !p);
                  setTeamOpen(false);
                }}
              >
                About Us
                <i
                  className='ti ti-chevron-down'
                  style={S.chevron(aboutOpen)}
                />
              </button>
              <div style={S.dropdown(aboutOpen)}>
                {[
                  { path: '/about-us', label: 'Our Mission' },
                  { path: '/program-leadership', label: 'Program Leadership' },
                ].map((item) => (
                  <DropdownLink
                    key={item.path}
                    to={item.path}
                    active={isActive(item.path)}
                    onClick={() => setAboutOpen(false)}
                  >
                    {item.label}
                  </DropdownLink>
                ))}
              </div>
            </li> */}

            {/* Team Dropdown */}
            <li ref={teamRef} style={{ position: 'relative' }}>
              <button
                style={{
                  ...S.dropdownTrigger(
                    isGroupActive(['/our-team', '/in-the-spotlight']),
                    teamOpen,
                  ),
                }}
                onClick={() => {
                  setTeamOpen((p) => !p);
                  setAboutOpen(false);
                }}
              >
                Our Team
                <i className='ti ti-chevron-down' style={S.chevron(teamOpen)} />
              </button>
              <div style={S.dropdown(teamOpen)}>
                {[
                  { path: '/our-team', label: 'Team Overview' },
                  { path: '/in-the-spotlight', label: 'In The Spotlight' },
                ].map((item) => (
                  <DropdownLink
                    key={item.path}
                    to={item.path}
                    active={isActive(item.path)}
                    onClick={() => setTeamOpen(false)}
                  >
                    {item.label}
                  </DropdownLink>
                ))}
              </div>
            </li>
          </ul>
        </nav>

        {/* Right Section */}
        <div style={S.rightSection()} className='d-none d-md-flex'>
          {/* Notification */}
          <NotificationDropdown avatarSrc={avatarSrc || DEFAULT_AVATAR} />

          {isAuthenticated && parent ? (
            /* Avatar / User Dropdown */
            <div ref={userRef} style={{ position: 'relative' }}>
              <button
                style={{
                  ...S.avatarBtn(),
                  background:
                    avatarHovered || userOpen
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.06)',
                  borderColor: userOpen
                    ? 'rgba(80,110,228,0.5)'
                    : 'rgba(255,255,255,0.1)',
                }}
                onClick={() => setUserOpen((p) => !p)}
                onMouseEnter={() => setAvatarHovered(true)}
                onMouseLeave={() => setAvatarHovered(false)}
              >
                <img
                  src={avatarSrc}
                  alt={parent?.fullName || 'User'}
                  style={S.avatarImg()}
                />
                <span style={S.avatarName()}>
                  {parent?.fullName?.split(' ')[0] || 'Account'}
                </span>
                <i
                  className='ti ti-chevron-down'
                  style={{
                    ...S.chevron(userOpen),
                    color: 'rgba(255,255,255,0.4)',
                    marginRight: 2,
                  }}
                />
              </button>

              <div style={S.userDropdown(userOpen)}>
                {/* Header */}
                <div style={S.userDropdownHeader()}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <img
                      src={avatarSrc}
                      alt=''
                      style={{ ...S.avatarImg(), width: 36, height: 36 }}
                    />
                    <div>
                      <p style={S.userDropdownHeaderName()}>
                        {parent?.fullName || 'User'}
                      </p>
                      <p style={S.userDropdownHeaderRole()}>{role}</p>
                    </div>
                  </div>
                </div>

                <UserDropdownItem
                  to={routes.profile}
                  icon='ti ti-user-circle'
                  onClick={() => setUserOpen(false)}
                >
                  My Profile
                </UserDropdownItem>
                <UserDropdownItem
                  to={routes.myTickets}
                  icon='ti ti-ticket'
                  onClick={() => setUserOpen(false)}
                >
                  My Tickets
                </UserDropdownItem>
                <UserDropdownItem
                  to={routes.profilesettings}
                  icon='ti ti-settings'
                  onClick={() => setUserOpen(false)}
                >
                  Settings
                </UserDropdownItem>

                <div style={S.divider()} />

                <UserDropdownItem
                  as='button'
                  icon='ti ti-logout'
                  danger
                  onClick={handleLogout}
                >
                  Logout
                </UserDropdownItem>
              </div>
            </div>
          ) : (
            <button
              style={{
                ...S.loginBtn(),
                background: loginHovered ? '#3f5cd6' : '#506ee4',
                transform: loginHovered ? 'translateY(-1px)' : 'translateY(0)',
              }}
              onClick={handleLoginRedirect}
              onMouseEnter={() => setLoginHovered(true)}
              onMouseLeave={() => setLoginHovered(false)}
            >
              <i className='ti ti-login' style={{ fontSize: 14 }} />
              Log In
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          id='mobile_btn'
          className='d-md-none'
          style={S.mobileBtn()}
          onClick={toggleMobileSidebar}
          aria-label='Toggle menu'
        >
          {[0, 1, 2].map((i) => (
            <span key={i} style={S.mobileBarSpan(mobileSidebar, i)} />
          ))}
        </button>
      </header>

      {/* Spacer so page content starts below fixed header */}
      <div style={{ height: 64 }} />

      {/* ── Mobile Navigation ──────────────────────────────────────────────── */}
      {mobileSidebar && (
        <div className='mobile-nav-glass' ref={mobileMenuRef}>
          <div className='mobile-nav-header'>
            <div className='mobile-nav-title'>
              <span>Menu</span>
            </div>
          </div>

          <div className='mobile-nav-section'>
            <div className='mobile-nav-section-title'>
              <i className='ti ti-compass' />
              <span>Navigation</span>
            </div>
            <ul className='mobile-nav-list'>
              {mobilePublicItems.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} onClick={() => closeMobileMenu()}>
                    <i className={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {dropdownItems.map((dropdown) => (
            <div key={dropdown.name} className='mobile-nav-section'>
              <button
                className='mobile-nav-dropdown-toggle'
                onClick={() =>
                  setOpenMobileDropdown((p) =>
                    p === dropdown.name ? null : dropdown.name,
                  )
                }
              >
                <i className={dropdown.icon} />
                <span>{dropdown.label}</span>
                <i
                  className={`ti ti-chevron-right ${openMobileDropdown === dropdown.name ? 'open' : ''}`}
                />
              </button>
              <div
                className={`mobile-nav-submenu ${openMobileDropdown === dropdown.name ? 'open' : ''}`}
              >
                {dropdown.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => closeMobileMenu()}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {isAuthenticated && (
            <div className='mobile-nav-section private-section'>
              <div className='mobile-nav-section-title'>
                <i className='ti ti-lock' />
                <span>Account</span>
              </div>
              <ul className='mobile-nav-list'>
                {privateNavItems.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} onClick={() => closeMobileMenu()}>
                      <i className={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
                <li className='logout-item'>
                  <button onClick={handleLogout}>
                    <i className='ti ti-logout' />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {!isAuthenticated && (
            <div className='mobile-nav-section auth-section'>
              <button className='mobile-auth-btn' onClick={handleLoginRedirect}>
                <i className='ti ti-login' />
                <span>Login</span>
                <i className='ti ti-arrow-right' />
              </button>
            </div>
          )}
        </div>
      )}
      <style>{`.header .nav .nav-item a.nav-link {
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
}`}</style>
    </>
  );
};

export default Header;
