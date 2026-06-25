// router.link.tsx

import React from 'react';
import { Route, Navigate, useParams } from 'react-router-dom';
import { all_routes } from './all_routes';
import DeleteRequest from '../userManagement/deleteRequest';
import Login from '../auth/login/login';
import Register from '../auth/register/register';
import TwoStepVerification from '../auth/twoStepVerification/twoStepVerification';
import EmailVerification from '../auth/emailVerification/emailVerification';
import ResetPassword from '../auth/resetPassword/resetPassword';
import ForgotPassword from '../auth/forgotPassword/forgotPassword';
import Pages from '../content/pages';
import AdminDashboard from '../mainMenu/adminDashboard';
import AlertUi from '../uiInterface/base-ui/alert-ui';
import CoachDashboard from '../mainMenu/coachDashboard';
import ParentDashboard from '../mainMenu/parentDashboard';
import PlayerGrid from '../peoples/players/player-grid';
import AddPlayer from '../peoples/players/add-player';
import AddParent from '../peoples/parent/add-parent';
import PlayerList from '../peoples/players/player-list';
import PlayerDetails from '../peoples/players/player-details/playerDetails';
import ParentDetails from '../peoples/parent/parent-details/parentDetails';
import CoachGrid from '../peoples/coach/coach-grid';
import CoachList from '../peoples/coach/coach-list';
import ParentGrid from '../peoples/parent/parent-grid';
import ParentList from '../peoples/parent/parent-list';
import GuardianGrid from '../peoples/guardian/guardian-grid';
import GuardianList from '../peoples/guardian/guardian-list';
import ResetPasswordSuccess from '../auth/resetPasswordSuccess/resetPasswordSuccess';
import RolesPermissions from '../userManagement/rolesPermissions';
import Permission from '../userManagement/permission';
import Manageusers from '../userManagement/manageusers';
import Profilesettings from '../settings/generalSettings/profile';
import Securitysettings from '../settings/generalSettings/security';
import AcceptMerge from '../settings/generalSettings/ApproveMerge';
import Notificationssettings from '../settings/generalSettings/notifications';
import ConnectedApps from '../settings/generalSettings/connectedApps';
import CompanySettings from '../settings/websiteSettings/companySettings';
import Localization from '../settings/websiteSettings/localization';
import Prefixes from '../settings/websiteSettings/prefixes';
import Socialauthentication from '../settings/websiteSettings/socialAuthentication';
import Languagesettings from '../settings/websiteSettings/language';
import EmailSettings from '../settings/systemSettings/emailSettings';
import EmailTemplatesPage from '../settings/systemSettings/email-templates';
import { EmailTemplateSelector } from '../../components/EmailTemplateSelector';
import EmailTemplateBuilder from '../../components/EmailTemplateBuilder';
import SmsSettings from '../settings/systemSettings/smsSettings';
import OtpSettings from '../settings/systemSettings/otp-settings';
import GdprCookies from '../settings/systemSettings/gdprCookies';
import Storage from '../settings/otherSettings/storage';
import BanIpAddress from '../settings/otherSettings/banIpaddress';
import Faq from '../content/faq';
import Tickets from '../support/tickets';
import TicketGrid from '../support/ticket-grid';
import TicketDetails from '../support/ticket-details';
import ContactMessages from '../support/contactMessages';
import Profile from '../pages/profile';
import LockScreen from '../auth/lockScreen';
import NotificationActivities from '../pages/profile/activities';
import ProtectedRoute from '../components/ProtectedRoute';
import Events from '../announcements/events';
import FormBuilder from '../../components/admin/FormBuilder';
import TournamentAdminPage from '../pages/tournament/index';
import TeamList from '../components/Teams/TeamList';
import TeamForm from '../components/Teams/TeamForm';
import TeamDetail from '../components/Teams/TeamDetail';
import AdminRefundsPanel from '../components/AdminRefundsPanel';
import SpotlightManager from '../pages/SpotlightManager';
import AdminRegistrationManagerPage from '../../components/admin/AdminRegistrationManagerPage';
import AdminSeasonEventsPage from '../../components/admin/AdminSeasonEventsPage';
import AdminFormPreviewPage from '../../components/admin/AdminFormPreviewPage';
import UserTickets from '../../components/UserTickets';
import MyTicketsWrapper from '../../components/MyTicketsWrapper';
import PublicTicketLookup from '../../components/PublicTicketLookup';
import TicketList from '../../components/admin/TicketDashboard/TicketList';
import TournamentAdmin from '../../components/admin/Tournament/TournamentAdmin';
import PageBuilder from '../../components/page-builder/PageBuilder';
import CreateNewPage from '../../components/page-builder/CreateNewPage';
import PageList from '../../components/page-builder/PageList';
import PageRenderer from '../../components/page-builder/PageRenderer';
import PaymentConfiguration from '../../components/admin/paymentSettings/PaymentConfiguration';
import FormFieldConfigPage from '../settings/systemSettings/formFieldConfig/FormFieldConfig';
import CloverReceiptPage from '../peoples/parent/receipts/CloverReceiptPage';
import AdminAdManager from '../components/ads/AdminAdManager';

const routes = all_routes;

// Create wrapper component for PageRenderer
const PageRendererWrapper: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  return <PageRenderer pageSlug={slug || ''} isEditing={false} />;
};

// ─── Email Template Builder Wrapper ──────────────────────────────────────
// This handles the /builder and /builder/:id routes
const EmailTemplateBuilderWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <EmailTemplateBuilder templateId={id || null} />;
};

// ─── Email Templates Page Wrapper ───────────────────────────────────────
// This handles the main email templates listing page
const EmailTemplatesPageWrapper: React.FC = () => {
  return <EmailTemplatesPage />;
};

export const publicRoutes = [
  {
    path: routes.adminDashboard,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.coachDashboard,
    element: (
      <ProtectedRoute allowedRoles={['coach']}>
        <CoachDashboard />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.EmailTemplateSelector,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <EmailTemplateSelector />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.tournamentAdminPage,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <TournamentAdminPage />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: '/admin/refunds',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminRefundsPanel />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: '/admin/tournaments',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach']}>
        <TournamentAdmin />
      </ProtectedRoute>
    ),
    route: Route,
  },
  // Page Management - Admin Routes
  {
    path: routes.pageList,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <PageList />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.pageBuilderNew,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <CreateNewPage />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.pageBuilderEdit,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <PageBuilder />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.pageBuilder,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <Navigate to={routes.pageBuilderNew} replace />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: '/receipts/clover/:orderId',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach', 'parent']}>
        <CloverReceiptPage />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.parentDashboard,
    element: <ParentDashboard />,
    route: Route,
  },
  {
    path: routes.connectedApps,
    element: <ConnectedApps />,
    route: Route,
  },
  {
    path: routes.deleteRequest,
    element: <DeleteRequest />,
    route: Route,
  },
  {
    path: routes.banIpAddress,
    element: <BanIpAddress />,
    route: Route,
  },
  {
    path: routes.pages,
    element: <Pages />,
    route: Route,
  },
  {
    path: routes.faq,
    element: <Faq />,
    route: Route,
  },
  {
    path: routes.alert,
    element: <AlertUi />,
    route: Route,
  },
  // Peoples Module
  {
    path: routes.playerGrid,
    element: <PlayerGrid />,
  },
  {
    path: routes.PlayerList,
    element: <PlayerList />,
  },
  {
    path: routes.addPlayer,
    element: <AddPlayer isEdit={false} />,
  },
  {
    path: routes.editPlayer + '/:playerId',
    element: <AddPlayer isEdit={true} />,
  },
  {
    path: routes.playerDetail + '/:playerId',
    element: <PlayerDetails />,
  },
  {
    path: routes.addParent,
    element: <AddParent isEdit={false} />,
  },
  {
    path: routes.editParent + '/:parentId',
    element: <AddParent isEdit={true} />,
  },
  {
    path: routes.editCoach + '/:parentId',
    element: <AddParent isEdit={true} />,
  },
  {
    path: routes.parentDetail + '/:parentId',
    element: <ParentDetails />,
  },
  {
    path: routes.coachGrid,
    element: <CoachGrid />,
  },
  {
    path: routes.coachList,
    element: <CoachList />,
  },
  {
    path: routes.parentGrid,
    element: <ParentGrid />,
  },
  {
    path: routes.parentList,
    element: <ParentList />,
  },
  {
    path: routes.layoutDefault,
    element: <AdminDashboard />,
  },
  {
    path: routes.layoutMini,
    element: <AdminDashboard />,
  },
  {
    path: routes.layoutRtl,
    element: <AdminDashboard />,
  },
  {
    path: routes.layoutBox,
    element: <AdminDashboard />,
  },
  {
    path: routes.layoutDark,
    element: <AdminDashboard />,
  },
  {
    path: routes.guardiansGrid,
    element: <GuardianGrid />,
  },
  {
    path: routes.guardiansList,
    element: <GuardianList />,
  },
  {
    path: routes.events,
    element: <Events />,
  },

  //Settings
  {
    path: routes.profilesettings,
    element: <Profilesettings />,
  },
  {
    path: routes.securitysettings,
    element: <Securitysettings />,
  },
  {
    path: routes.notificationssettings,
    element: <Notificationssettings />,
  },
  {
    path: routes.connectedApps,
    element: <ConnectedApps />,
  },
  {
    path: routes.companySettings,
    element: <CompanySettings />,
  },
  {
    path: routes.localization,
    element: <Localization />,
  },
  {
    path: routes.prefixes,
    element: <Prefixes />,
  },
  {
    path: routes.socialAuthentication,
    element: <Socialauthentication />,
  },
  {
    path: routes.language,
    element: <Languagesettings />,
  },
  {
    path: routes.emailSettings,
    element: <EmailSettings />,
  },
  // ✅ EMAIL TEMPLATES ROUTE - Main list page
  {
    path: routes.emailTemplates,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <EmailTemplatesPageWrapper />
      </ProtectedRoute>
    ),
    route: Route,
  },
  // ✅ EMAIL TEMPLATES BUILDER - Create new (no ID)
  {
    path: routes.emailTemplatesBuilder,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <EmailTemplateBuilderWrapper />
      </ProtectedRoute>
    ),
    route: Route,
  },
  // ✅ EMAIL TEMPLATES BUILDER - Edit existing (with ID)
  {
    path: routes.emailTemplatesEdit,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <EmailTemplateBuilderWrapper />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.formBuilder,
    element: <FormBuilder />,
  },
  {
    path: routes.smsSettings,
    element: <SmsSettings />,
  },
  {
    path: routes.optSettings,
    element: <OtpSettings />,
  },
  {
    path: routes.gdprCookies,
    element: <GdprCookies />,
  },
  {
    path: routes.storage,
    element: <Storage />,
  },
  {
    path: routes.rolesPermissions,
    element: <RolesPermissions />,
  },
  {
    path: routes.permissions,
    element: <Permission />,
  },
  {
    path: routes.manageusers,
    element: <Manageusers />,
  },
  {
    path: routes.tickets,
    element: <Tickets />,
  },
  {
    path: routes.ticketGrid,
    element: <TicketGrid />,
  },
  {
    path: routes.ticketDetails,
    element: <TicketDetails />,
  },
  {
    path: routes.contactMessages,
    element: <ContactMessages />,
  },
  {
    path: routes.profile,
    element: <Profile />,
  },
  {
    path: routes.activity,
    element: <NotificationActivities />,
  },
  // Team Management Routes
  {
    path: routes.teams,
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach']}>
        <TeamList />
      </ProtectedRoute>
    ),
  },
  {
    path: routes.createTeam,
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach']}>
        <TeamForm />
      </ProtectedRoute>
    ),
  },
  {
    path: routes.editTeam + '/:id',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach']}>
        <TeamForm />
      </ProtectedRoute>
    ),
  },
  {
    path: routes.teamDetail + '/:id',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach']}>
        <TeamDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: routes.viewTickets,
    element: <UserTickets />,
    route: Route,
  },
  {
    path: routes.findTickets,
    element: <PublicTicketLookup />,
    route: Route,
  },
];

export const authRoutes = [
  {
    path: routes.login,
    element: <Login />,
    route: Route,
  },
  {
    path: routes.register,
    element: <Register />,
    route: Route,
  },
  {
    path: routes.twoStepVerification,
    element: <TwoStepVerification />,
    route: Route,
  },
  {
    path: routes.emailVerification,
    element: <EmailVerification />,
    route: Route,
  },
  {
    path: routes.resetPassword,
    element: <ResetPassword />,
    route: Route,
  },
  {
    path: routes.forgotPassword,
    element: <ForgotPassword />,
    route: Route,
  },
  {
    path: routes.lockScreen,
    element: <LockScreen />,
  },
  {
    path: routes.resetPasswordSuccess,
    element: <ResetPasswordSuccess />,
  },
  {
    path: routes.mergeAccount,
    element: <AcceptMerge />,
    route: Route,
  },
  {
    path: all_routes.dynamicPage,
    element: <PageRendererWrapper />,
    route: Route,
  },
];

export const protectedRoutes = [
  {
    path: '/admin/refunds',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminRefundsPanel />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: '/admin/ticket-dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <TicketList />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.adminDashboard,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.coachDashboard,
    element: (
      <ProtectedRoute allowedRoles={['coach']}>
        <CoachDashboard />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.parentDashboard,
    element: (
      <ProtectedRoute allowedRoles={['parent']}>
        <ParentDashboard />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.spotlightManager,
    element: (
      <ProtectedRoute allowedRoles={['admin', 'coach']}>
        <SpotlightManager />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.resetPassword,
    element: <ResetPassword />,
    route: Route,
  },
  {
    path: routes.adminFormConfigs,
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <FormFieldConfigPage />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: '/admin/advertisements',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminAdManager />
      </ProtectedRoute>
    ),
    route: Route,
  },
  // Admin Registration Management
  {
    path: routes.adminRegistrationManager,
    element: <AdminRegistrationManagerPage />,
    roles: ['admin'],
  },
  {
    path: routes.adminSeasonEvents,
    element: <AdminSeasonEventsPage />,
    roles: ['admin'],
  },
  {
    path: routes.adminFormPreview,
    element: <AdminFormPreviewPage />,
    roles: ['admin'],
  },
  {
    path: routes.adminRefundsPanel,
    element: <AdminRefundsPanel />,
    roles: ['admin'],
  },
  {
    path: routes.paymentConfiguration,
    element: <PaymentConfiguration />,
    roles: ['admin'],
  },
  {
    path: routes.myTickets,
    element: (
      <ProtectedRoute
        allowedRoles={['user', 'admin', 'coach', 'student', 'parent']}
      >
        <MyTicketsWrapper />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.myTickets,
    element: (
      <ProtectedRoute
        allowedRoles={['user', 'admin', 'coach', 'student', 'parent']}
      >
        <UserTickets />
      </ProtectedRoute>
    ),
    route: Route,
  },
];

// Combine all routes
export const allRoutes = [...publicRoutes, ...authRoutes, ...protectedRoutes];
