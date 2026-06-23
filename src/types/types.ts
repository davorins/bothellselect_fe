// types.ts
import { FormField } from './form';

export interface SearchResult {
  id: string;
  type: 'player' | 'parent' | 'guardian' | 'coach' | 'school';
  name: string;
  email?: string;
  gender?: string;
  grade?: string;
  dob?: string;
  aauNumber?: string;
  status?: string;
  season?: string;
  registrationYear?: number | null;
  image?: string;
  additionalInfo?: string;
  createdAt?: Date;
  isPaymentMatch?: boolean;
  paymentDetails?: {
    cardBrand: string;
    cardLastFour: string;
    amount?: number;
    date?: string;
    receiptUrl?: string;
  };
  phone?: string;
  address?: any;
  seasons?: Array<{
    season: string;
    year: number;
    tryoutId?: string;
    registrationDate?: string;
    paymentComplete?: boolean;
    paymentStatus?: string;
    amountPaid?: number;
    cardLast4?: string;
    cardBrand?: string;
  }>;
}

export interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

export interface Parent {
  _id: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  address:
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      }
    | string;
  relationship?: string;
  aauNumber?: string;
  role: string;
  isCoach?: boolean;
  players?: Player[];
  additionalGuardians?: Guardian[];
  createdAt?: string;
  updatedAt?: string;
  isGuardian?: boolean;
  avatar?: string;
  imgSrc?: string;
  paymentComplete?: boolean;
  dismissedNotifications: string[];
  playersSeason: string[];
  playersYear: number[];
  emailVerified?: boolean;
}

export interface Coach extends Parent {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address:
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      }
    | string;
  isCoach: true;
  aauNumber: string;
  status: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
}

export interface Guardian {
  id?: string;
  _id?: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  address:
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      }
    | string;
  isCoach: boolean;
  aauNumber: string;
  players?: Player[];
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
  parentId?: string;
}

export interface Player {
  _id: string;
  id?: string;
  parentId?: string;
  fullName: string;
  gender: string;
  grade: string;
  dob: string;
  schoolName: string;
  healthConcerns: string;
  aauNumber: string;
  registrationYear: number;
  season: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  __v?: number;
  paymentComplete?: boolean;
  registrationComplete?: boolean;
  avatar: string;
  parents?: { email: string }[];
  siblings?: Player[];
  name?: string;
  playerStatus?: string;
  imgSrc?: string;
  age?: number;
  section?: string;
  class?: string;
  year?: number;
  seasons?: Array<{
    season: string;
    year: number;
    paymentStatus?: string;
  }>;
  paymentInfo?: {
    status: string;
    lastFour?: string;
    cardBrand?: string;
    expDate?: string;
    amount?: number;
    paymentDate?: string;
    receiptUrl?: string;
    transactionId?: string;
  };
  isGradeOverridden?: boolean;
}

export interface ParentTableData {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string | Address;
  role: string;
  type: 'parent' | 'guardian' | 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  aauNumber: string;
  players: Player[];
  parentId?: string;
  createdAt?: string;
}

export interface GuardianTableData {
  id: string;
  key: string;
  name: string;
  phone: string;
  email: string;
  address:
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      }
    | string;
  relationship: string;
  aauNumber: string;
  status: string;
  DateofJoin: string;
  imgSrc: string;
  players?: Player[];
  isCoach: boolean;
  role: string;
}

export interface DecodedToken {
  id: string;
  role: 'admin' | 'coach' | 'user' | 'parent';
  exp?: number;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string | Address;
  relationship?: string;
  players?: Player[];
  isCoach?: boolean;
  aauNumber?: string;
  additionalGuardians?: Guardian[];
  dismissedNotifications: string[];
  playersSeason: string[];
  playersYear: number[];
}

export interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
}

export interface RegistrationStatus {
  parentRegistered: boolean;
  parentPaid: boolean;
  currentSeason: string;
  hasPlayers: boolean;
  hasCurrentSeasonPlayers: boolean;
  allPlayersPaid: boolean;
}

export interface TempAccountData {
  email: string;
  password: string;
}

export interface CompleteRegistrationData {
  fullName: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
  agreeToTerms: boolean;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  parent: Parent | null;
  parents: Parent[];
  user: Parent | null;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  allParents: Parent[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: any,
    relationship: string,
    isCoach: boolean,
    aauNumber: string,
    agreeToTerms: boolean,
  ) => Promise<Parent>;
  fetchParentData: (
    parentId: string,
    isViewing?: boolean,
    isCoach?: boolean,
  ) => Promise<Parent | null>;
  fetchPlayersData: (
    playerIds: string[],
    queryParams?: string,
  ) => Promise<void>;
  fetchPlayerData: (playerId: string) => Promise<Player | null>;
  fetchAllPlayers: (queryParams?: string) => Promise<Player[]>;
  fetchAllParents: (queryParams?: string) => Promise<Parent[]>;
  fetchGuardians: (playerId: string) => Promise<Guardian[]>;
  checkAuth: () => Promise<void>;
  role: string;
  isLoading: boolean;
  searchAll: (term: string) => Promise<SearchResult[]>;
  fetchParentsData: (queryParams?: string) => Promise<void>;
  fetchParentPlayers: (parentId: string) => Promise<Player[]>;
  fetchAllGuardians: (queryParams?: string) => Promise<Guardian[]>;
  currentUser: Parent | null;
  allGuardians: Guardian[];
  refreshAuthData: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  refreshParentData: () => Promise<Parent | null>;
  registrationStatus: RegistrationStatus;
  setRegistrationStatus?: React.Dispatch<
    React.SetStateAction<RegistrationStatus>
  >;
  updateParent: (
    updatedData: Partial<Parent> & { avatar?: string | null },
  ) => void;
  viewedParent: Parent | null;
  viewedCoach: Parent | null;
  setViewedParent: (parent: Parent | null) => void;
  setViewedCoach: (coach: Parent | null) => void;
  setParentData: (fetchedParent: Parent | any) => Parent;
  currentSeason: string;
  currentYear: number;
  getAuthToken: () => Promise<string | null>;
  createTempAccount: (
    email: string,
    password: string,
  ) => Promise<{ tempToken: string }>;
  completeRegistration: (
    userData: CompleteRegistrationData,
    tempToken: string,
  ) => Promise<Parent>;
  sendVerificationEmail: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<boolean>;
  checkVerificationStatus: () => Promise<boolean>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  isEmailVerified: boolean;
  setIsEmailVerified: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface TableRecord {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string | Address;
  role: string;
  type?: 'parent' | 'guardian' | 'coach';
  aauNumber?: string;
  imgSrc?: string;
  avatar?: string;
  createdAt: string;
  status: string;
}

export type FormattedAddress = string | Address;

export interface ExtendedCoachTableRecord extends TableRecord {
  type: 'coach';
  status: string;
  DateofJoin: string;
  imgSrc?: string;
  avatar?: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  isCoach: boolean;
  email: string;
  players?: any[];
  [key: string]: any;
}

export interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  avatar?: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  players?: Player[];
  isCoach?: boolean;
}

// ✅ GuardianFormData is declared first so ParentFormData can reference it
export interface GuardianFormData {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  aauNumber: string;
  avatar?: string;
  isCoach?: boolean;
}

export interface ParentFormData {
  _id: string;
  password?: string;
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber: string;
  avatar?: string;
  additionalGuardians?: GuardianFormData[];
}

export interface ParentState {
  parent?: Parent;
  guardians?: Guardian[];
  players?: Player[];
  from?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface ParentData {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface PlayerFormData {
  _id?: string;
  id?: string;
  playerId?: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  grade: string;
  healthConcerns?: string;
  aauNumber?: string;
  avatar?: string;
  isGradeOverridden?: boolean;
  registrationYear?: string | number;
  season?: string;
  parentId?: string;
}

interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address:
    | string
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      };
  relationship: string;
  avatar?: string;
  aauNumber: string;
  isPrimary?: boolean;
}

interface PlayerData {
  _id?: string;
  playerId?: string;
  name: string;
  fullName?: string;
  gender: string;
  dob?: string;
  section: string;
  schoolName?: string;
  class: string;
  grade?: string;
  healthConcerns: string;
  aauNumber: string;
  parentId?: string;
  avatar: string;
}

export interface PlayerState {
  player?: PlayerData;
  guardians?: GuardianData[];
  siblings?: any[];
  playerId?: string;
  from?: string;
  sharedData?: {
    familyGuardians?: any[];
    familyAddress?: any;
  };
}

export interface BaseUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  address?: string | Address;
}

export interface Payment {
  _id: string;
  playerId: string;
  parentId: string;
  paymentId: string;
  orderId?: string;
  locationId: string;
  cardLastFour: string;
  cardBrand: string;
  cardExpMonth: string;
  cardExpYear: string;
  amount: number;
  currency?: 'USD' | 'CAD';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt?: Date;
  processedAt?: Date;
  receiptUrl?: string;
  refunds?: Array<{
    amount: number;
    reason: string;
    processedAt: Date;
    refundId: string;
  }>;
  ipAddress?: string;
  deviceFingerprint?: string;
  statusHistory?: Array<{
    status: string;
    changedAt: Date;
    reason: string;
  }>;
  registrationId?: string;
  season?: string;
  registrationYear?: number;
}

export interface Notification {
  _id: string;
  user:
    | string
    | {
        _id: string;
        fullName: string;
        avatar?: string;
      };
  message: string;
  read: boolean;
  dismissedBy?: string[];
  targetType: 'all' | 'season' | 'individual';
  parentIds?: string[];
  seasonName?: string;
  createdAt: string | Date;
  link?: string;
}

export interface SignatureConfig {
  organizationName: string;
  title: string;
  fullName: string;
  phone: string;
  email: string;
  website: string;
  additionalInfo: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue: string;
}

export interface TempEmailAttachment {
  filename: string;
  size: number;
  mimeType: string;
  content: string;
  uploadedAt: string;
}

export interface EmailAttachment {
  _id?: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
}

export interface EmailTemplate {
  _id?: string;
  title: string;
  subject: string;
  content: string;
  completeContent?: string;
  status: boolean;
  includeSignature: boolean;
  signatureConfig: {
    organizationName: string;
    title: string;
    fullName: string;
    phone: string;
    email: string;
    website: string;
    additionalInfo: string;
  };
  variables: Array<{
    name: string;
    description: string;
    defaultValue?: string;
  }>;
  category: 'system' | 'marketing' | 'transactional' | 'notification' | 'other';
  createdBy?: string;
  lastUpdatedBy?: string;
  tags: string[];
  version: number;
  previousVersions: Array<{
    content: string;
    updatedAt: Date;
    updatedBy?: string;
  }>;
  predefinedVariables: string[];
  attachments: Array<{
    _id?: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  }>;
  builderConfig?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailCampaignData {
  templateId: string;
  parentIds?: string[];
  season?: string;
  year?: number;
}

export interface ManualEmailRequest {
  templateId: string;
  emails: string[];
  variables?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
  error?: string;
}

export interface SeasonOption {
  season: string;
  year: number;
}

export interface SchoolInfo {
  name: string;
  address: string;
  website: string;
}

interface PaymentConfig {
  amount: number;
  description: string;
  currency?: 'USD' | 'CAD' | 'EUR' | 'GBP';
}

export interface EventDetails {
  _id?: string;
  title: string;
  caption?: string;
  price: number;
  start: string;
  end?: string;
  backgroundColor?: string;
  description?: string;
  category?: string;
  attendees?: string[];
  allDay?: boolean;
  attachment?: string;
  school?: SchoolInfo;
  formId?: string;
  formFields?: FormField[];
  paymentConfig?: PaymentConfig;
}

export type CalendarEvent = {
  id: string;
  title: string;
  startStr: string;
  endStr: string;
  extendedProps: {
    caption: string;
    price: number;
    description: string;
    category: string;
    school?: SchoolInfo;
    attendees: string[];
  };
  revert: () => void;
};

export interface Spotlight {
  _id: string;
  title: string;
  description: string;
  category: 'Team' | 'Player' | 'Other';
  playerNames: string[];
  badges: string[];
  images: string[];
  date: string;
  featured: boolean;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SpotlightForm {
  title: string;
  description: string;
  category: 'Team' | 'Player' | 'Other';
  playerNames: string[];
  badges: string[];
  images: string[];
  files: File[];
  date: string;
  featured: boolean;
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

export interface VerificationStatus {
  verified: boolean;
  email: string;
  verifiedAt?: string;
}

export interface EmailVerificationStepProps {
  email: string;
  onResendVerification: () => Promise<void> | void;
  onBack: () => void;
  isLoading?: boolean;
  countdown?: number;
}

export interface PlayerSeason {
  season: string;
  year: number;
  tryoutId?: string | null;
  registrationDate?: string | Date;
  paymentComplete?: boolean;
  paymentStatus?: string;
  paymentDate?: string | Date;
  paymentId?: string;
  amountPaid?: number;
  cardLast4?: string;
  cardBrand?: string;
}
