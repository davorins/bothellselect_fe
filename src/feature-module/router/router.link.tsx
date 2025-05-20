import { Route } from 'react-router';
import { all_routes } from './all_routes';
import DeleteRequest from '../userManagement/deleteRequest';
import Login from '../auth/login/login';
import Register from '../auth/register/register';
import TwoStepVerification from '../auth/twoStepVerification/twoStepVerification';
import EmailVerification from '../auth/emailVerification/emailVerification';
import ResetPassword from '../auth/resetPassword/resetPassword';
import ForgotPassword from '../auth/forgotPassword/forgotPassword';
import Pages from '../content/pages';
//import AdminDashboard from '../mainMenu/adminDashboard';
import AdminDashboard from '../pages/profile';
import AlertUi from '../uiInterface/base-ui/alert-ui';
import CoachDashboard from '../mainMenu/coachDashboard';
import PlayerDasboard from '../mainMenu/studentDashboard';
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
import FeesGroup from '../management/feescollection/feesGroup';
import TwoStepVerification2 from '../auth/twoStepVerification/twoStepVerification-2';
import TwoStepVerification3 from '../auth/twoStepVerification/twoStepVerification-3';
import ResetPasswordSuccess from '../auth/resetPasswordSuccess/resetPasswordSuccess';
import FeesTypes from '../management/feescollection/feesTypes';
import FeesMaster from '../management/feescollection/feesMaster';
import FeesAssign from '../management/feescollection/feesAssign';
import CollectFees from '../management/feescollection/collectFees';
import LibraryMember from '../management/library/libraryMember';
import Books from '../management/library/books';
import IssueBook from '../management/library/issuesBook';
import ReturnBook from '../management/library/returnBook';
import SportsList from '../management/sports/sportsList';
import PlayersList from '../management/sports/playersList';
import HostelRooms from '../management/hostel/hostelRooms';
import HostelList from '../management/hostel/hostelList';
import HostelType from '../management/hostel/hostelType';
import TransportRoutes from '../management/transport/transportRoutes';
import TransportPickupPoints from '../management/transport/transportPickupPoints';
import TransportVehicleDrivers from '../management/transport/transportVehicleDrivers';
import TransportVehicle from '../management/transport/transportVehicle';
import TransportAssignVehicle from '../management/transport/transportAssignVehicle';
import RolesPermissions from '../userManagement/rolesPermissions';
import Permission from '../userManagement/permission';
import Manageusers from '../userManagement/manageusers';
import Profilesettings from '../settings/generalSettings/profile';
import Securitysettings from '../settings/generalSettings/security';
import Notificationssettings from '../settings/generalSettings/notifications';
import ConnectedApps from '../settings/generalSettings/connectedApps';
import CompanySettings from '../settings/websiteSettings/companySettings';
import Localization from '../settings/websiteSettings/localization';
import Prefixes from '../settings/websiteSettings/prefixes';
import Socialauthentication from '../settings/websiteSettings/socialAuthentication';
import Languagesettings from '../settings/websiteSettings/language';
import InvoiceSettings from '../settings/appSettings/invoiceSettings';
import CustomFields from '../settings/appSettings/customFields';
import EmailSettings from '../settings/systemSettings/emailSettings';
import Emailtemplates from '../settings/systemSettings/email-templates';
import SmsSettings from '../settings/systemSettings/smsSettings';
import OtpSettings from '../settings/systemSettings/otp-settings';
import GdprCookies from '../settings/systemSettings/gdprCookies';
import PaymentGateways from '../settings/financialSettings/paymentGateways';
import TaxRates from '../settings/financialSettings/taxRates';
import SchoolSettings from '../settings/academicSettings/schoolSettings';
import Religion from '../settings/academicSettings/religion';
import Storage from '../settings/otherSettings/storage';
import BanIpAddress from '../settings/otherSettings/banIpaddress';
import Faq from '../content/faq';
import Tickets from '../support/tickets';
import TicketGrid from '../support/ticket-grid';
import TicketDetails from '../support/ticket-details';
import ContactMessages from '../support/contactMessages';
import Profile from '../pages/profile';
import LockScreen from '../auth/lockScreen';
import EmailVerification2 from '../auth/emailVerification/emailVerification-2';
import EmailVerification3 from '../auth/emailVerification/emailVerification-3';
import NotificationActivities from '../pages/profile/activities';
import ProtectedRoute from '../components/ProtectedRoute';
import { EmailTemplateSelector } from '../../components/EmailTemplateSelector';
import Events from '../announcements/events';
import FormBuilder from '../settings/systemSettings/form/form-builder';

const routes = all_routes;

export const publicRoutes = [
  // {
  //   path: "/",
  //   name: "Root",
  //   element: <Navigate to="/login" />,
  //   route: Route,
  // },
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
      <ProtectedRoute allowedRoles={['admin']}>
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
    path: routes.studentDashboard,
    element: <PlayerDasboard />,
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
    path: routes.customFields,
    element: <CustomFields />,
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
    path: routes.studentGrid,
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
    path: routes.feesGroup,
    element: <FeesGroup />,
  },
  {
    path: routes.feesType,
    element: <FeesTypes />,
  },
  {
    path: routes.feesMaster,
    element: <FeesMaster />,
  },
  {
    path: routes.feesAssign,
    element: <FeesAssign />,
  },
  {
    path: routes.collectFees,
    element: <CollectFees />,
  },
  {
    path: routes.libraryMembers,
    element: <LibraryMember />,
  },
  {
    path: routes.libraryBooks,
    element: <Books />,
  },
  {
    path: routes.libraryIssueBook,
    element: <IssueBook />,
  },
  {
    path: routes.libraryReturn,
    element: <ReturnBook />,
  },
  {
    path: routes.sportsList,
    element: <SportsList />,
  },
  {
    path: routes.playerList,
    element: <PlayersList />,
  },
  {
    path: routes.hostelRoom,
    element: <HostelRooms />,
  },
  {
    path: routes.hostelType,
    element: <HostelType />,
  },
  {
    path: routes.hostelList,
    element: <HostelList />,
  },
  {
    path: routes.transportRoutes,
    element: <TransportRoutes />,
  },
  {
    path: routes.transportAssignVehicle,
    element: <TransportAssignVehicle />,
  },
  {
    path: routes.transportPickupPoints,
    element: <TransportPickupPoints />,
  },
  {
    path: routes.transportVehicleDrivers,
    element: <TransportVehicleDrivers />,
  },
  {
    path: routes.transportVehicle,
    element: <TransportVehicle />,
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
    path: routes.invoiceSettings,
    element: <InvoiceSettings />,
  },
  {
    path: routes.customFields,
    element: <CustomFields />,
  },
  {
    path: routes.emailSettings,
    element: <EmailSettings />,
  },
  {
    path: routes.emailTemplates,
    element: <Emailtemplates />,
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
    path: routes.paymentGateways,
    element: <PaymentGateways />,
  },
  {
    path: routes.taxRates,
    element: <TaxRates />,
  },
  {
    path: routes.schoolSettings,
    element: <SchoolSettings />,
  },
  {
    path: routes.religion,
    element: <Religion />,
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
    path: routes.twoStepVerification2,
    element: <TwoStepVerification2 />,
    route: Route,
  },
  {
    path: routes.twoStepVerification3,
    element: <TwoStepVerification3 />,
    route: Route,
  },
  {
    path: routes.emailVerification,
    element: <EmailVerification />,
    route: Route,
  },
  {
    path: routes.emailVerification2,
    element: <EmailVerification2 />,
    route: Route,
  },
  {
    path: routes.emailVerification3,
    element: <EmailVerification3 />,
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
];

export const protectedRoutes = [
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
      <ProtectedRoute allowedRoles={['admin']}>
        <CoachDashboard />
      </ProtectedRoute>
    ),
    route: Route,
  },
  {
    path: routes.studentDashboard,
    element: (
      <ProtectedRoute allowedRoles={['student']}>
        <PlayerDasboard />
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
    path: routes.resetPassword,
    element: <ResetPassword />,
    route: Route,
  },
];

// Combine all routes
export const allRoutes = [...publicRoutes, ...authRoutes, ...protectedRoutes];
