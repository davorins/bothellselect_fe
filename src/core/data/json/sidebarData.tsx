import { all_routes } from '../../../feature-module/router/all_routes';
const routes = all_routes;

export const SidebarData = [
  {
    label: 'MAIN',
    submenuOpen: true,
    showSubRoute: false,
    submenuHdr: 'Main',
    submenuItems: [
      {
        icon: 'ti ti-home-2',
        label: 'Home',
        path: '/',
      },
      {
        icon: 'ti ti-chess-knight',
        label: 'About Us',
        path: '/about-us',
      },
      {
        icon: 'ti ti-ball-basketball',
        label: 'Our Team',
        path: '/our-team',
      },
      {
        icon: 'ti ti-mail',
        label: 'Contact Us',
        path: '/contact-us',
      },
    ],
  },
  {
    label: 'Team',
    submenuOpen: true,
    showSubRoute: false,
    submenuHdr: 'Peoples',
    submenuItems: [
      {
        label: 'Players',
        icon: 'ti ti-shirt-sport',
        submenu: false,
        showSubRoute: false,
        link: routes.PlayerList,
      },
      {
        label: 'Parents',
        icon: 'ti ti-users',
        submenu: false,
        roles: ['admin', 'user'],
      },
      {
        label: 'Coaches',
        icon: 'ti ti-user-bolt',
        submenu: false,
        showSubRoute: false,
        link: routes.coachList,
      },
    ],
  },
  {
    label: 'Events',
    submenuOpen: true,
    showSubRoute: false,
    submenuHdr: 'Events',
    submenuItems: [
      {
        label: 'Schedules',
        icon: 'ti ti-calendar-event',
        submenu: false,
        showSubRoute: false,
        link: routes.events,
      },
    ],
  },
  {
    label: 'Email',
    submenu: true,
    showSubRoute: false,
    submenuHdr: 'Email',
    submenuItems: [
      {
        label: 'Templates',
        submenu: false,
        showSubRoute: false,
        link: routes.emailTemplates,
        icon: 'ti ti-file-symlink',
        roles: ['admin'],
      },
      {
        label: 'Send Email',
        submenu: false,
        showSubRoute: false,
        link: routes.EmailTemplateSelector,
        icon: 'ti ti-mail-forward',
        roles: ['admin'],
      },
    ],
  },
];
