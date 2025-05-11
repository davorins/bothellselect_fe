// types.ts
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
  paymentComplete?: boolean;
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
}

export interface Player {
  _id: string;
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
  updatedAt: string;
  status: string;
  __v: number;
  paymentComplete?: boolean;
  avatar: string;
  registrationComplete?: boolean;
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
    address: string,
    relationship: string,
    isCoach: boolean,
    aauNumber: string,
    agreeToTerms: boolean
  ) => Promise<void>;
  fetchParentData: (
    parentId: string,
    isViewing?: boolean,
    isCoach?: boolean
  ) => Promise<Parent | null>;
  fetchPlayersData: (
    playerIds: string[],
    queryParams?: string
  ) => Promise<void>;
  fetchPlayerData: (playerId: string) => Promise<Player | null>;
  fetchAllPlayers: (queryParams?: string) => Promise<void>;
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
  registrationStatus: RegistrationStatus;
  setRegistrationStatus?: React.Dispatch<
    React.SetStateAction<RegistrationStatus>
  >;
  updateParent: (
    updatedData: Partial<Parent> & { avatar?: string | null }
  ) => void;
  viewedParent: Parent | null;
  viewedCoach: Parent | null;
  setViewedParent: (parent: Parent | null) => void;
  setViewedCoach: (coach: Parent | null) => void;
  setParentData: (fetchedParent: Parent | any) => Parent;
  currentSeason: string;
  currentYear: number;
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
  createdAt: string;
  status: string;
}

export type FormattedAddress = string | Address;

export interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  players?: Player[];
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
  additionalGuardians?: Array<{
    id?: string;
    fullName: string;
    email: string;
    phone: string;
    address: Address;
    relationship: string;
    aauNumber: string;
    avatar?: string;
    isCoach?: boolean;
  }>;
}

export interface GuardianFormData {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  aauNumber: string;
  avatar?: string;
  isCoach?: boolean;
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
  playerId: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  grade: string;
  healthConcerns: string;
  aauNumber: string;
  registrationYear: string;
  season: string;
  parentId: string;
  avatar: string;
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
  user: string;
  message: string;
  avatar?: string;
  createdAt: string;
  read: boolean;
}
