import { all_routes } from '../../../feature-module/router/all_routes';
const routes = all_routes;

export const SidebarData = [
  // {
  //   label: 'MAIN',
  //   submenuOpen: true,
  //   showSubRoute: false,
  //   submenuHdr: 'Main',
  //   submenuItems: [
  //     {
  //       label: 'Dashboard',
  //       icon: 'ti ti-layout-dashboard',
  //       submenu: true,
  //       showSubRoute: false,
  //       roles: ['admin', 'coach', 'user'],
  //       submenuItems: [
  //         {
  //           label: 'Admin Dashboard',
  //           link: routes.adminDashboard,
  //           roles: ['admin'],
  //         },
  //         {
  //           label: 'Coach Dashboard',
  //           link: routes.coachDashboard,
  //           roles: ['admin'],
  //         },
  //         { label: 'Player Dashboard', link: routes.studentDashboard },
  //         { label: 'Parent Dashboard', link: routes.parentDashboard },
  //       ],
  //     },
  //   ],
  // },
  {
    label: 'Peoples',
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
        icon: 'ti ti-user-bolt',
        submenu: false,
        showSubRoute: false,
        link: routes.parentList,
        isDynamic: true,
      },
      {
        label: 'Coaches',
        icon: 'ti ti-users',
        submenu: false,
        showSubRoute: false,
        link: routes.coachList,
      },
    ],
  },
];
