import { Moment } from 'moment';

export interface Player {
  id: string;
  _id?: string;
  fullName: string;
  name?: string;
  gender?: string;
  dob?: string | Date;
  age?: number;
  section?: string;
  class?: string;
  grade?: string | number;
  schoolName?: string;
  healthConcerns?: string;
  aauNumber?: string;
  status?: string;
  playerStatus?: string;
  season?: string;
  registrationYear?: number;
  DateofJoin?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  avatar?: string;
  imgSrc?: string;
  parentId?: string;
  siblings?: Player[];
  guardians?: Guardian[];
  paymentComplete?: boolean;
  registrationComplete?: boolean;
}

export interface Guardian {
  id: string;
  _id?: string;
  fullName: string;
  phone: string;
  email?: string;
  address:
    | string
    | {
        street: string;
        street2?: string;
        city: string;
        state: string;
        zip: string;
      };
  relationship: string;
  avatar?: string;
  aauNumber?: string;
  isPrimary?: boolean;
  isCoach?: boolean;
  additionalGuardians?: Guardian[];
  createdAt?: string;
  updatedAt?: string;
}
export interface PlayerSidebarProps {
  player: Player;
  guardians: Guardian[];
  primaryParent: Guardian | null;
  siblings: Player[];
  onViewSibling: (siblingId: string) => void;
  token?: string | null;
}

export interface PlayerDetailsProps {
  player: Player;
  guardians: Guardian[];
  siblings: Player[];
}

// ==================== Existing Types ====================
export type PlayerSortOrder =
  | 'asc'
  | 'desc'
  | 'recentlyViewed'
  | 'recentlyAdded'
  | null;

export interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  relationship: string;
  aauNumber: string;
  isCoach?: boolean;
}

export interface PlayerFilterParams {
  nameFilter: string;
  genderFilter: string | null;
  gradeFilter: string | null;
  ageFilter: number | null;
  statusFilter: string | null;
  dateRange: [Moment, Moment] | null;
  seasonParam: string | null;
  yearParam: string | null;
  paymentStatusFilter?: 'paid' | 'pending' | 'failed';
  schoolFilter: string | null;
}

// ==================== Enhanced Player Data ====================
export interface PlayerTableData {
  id: string;
  key: string;
  name: string;
  gender: string;
  dob: string;
  age: number;
  section: string;
  class: string;
  status: string;
  DateofJoin: string;
  healthConcerns: string;
  imgSrc: string;
  aauNumber: string;
  siblings: PlayerTableData[];
  guardians?: GuardianData[];
  season?: string;
  registrationYear?: number;
  parentId?: string;

  // New payment fields (all optional for backward compatibility)
  paymentInfo?: {
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    lastFour?: string; // Last 4 digits of card
    cardBrand?: string; // Visa, Mastercard, etc.
    expDate?: string; // "MM/YY"
    amount?: number;
    paymentDate?: string; // ISO date
    receiptUrl?: string;
    transactionId?: string; // Square transaction ID
  };
}

// ==================== New Payment Types ====================
export interface PaymentRecord {
  playerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  cardLastFour: string;
  cardBrand: string;
  paymentDate: string;
  receiptUrl?: string;
}

// For API responses
export interface PlayerWithPayments extends PlayerTableData {
  paymentHistory?: PaymentRecord[];
}

// ==================== Type Guards ====================
export function isPaidPlayer(player: PlayerTableData): boolean {
  return player.paymentInfo?.status === 'paid';
}

export function hasPaymentInfo(player: PlayerTableData): boolean {
  return !!player.paymentInfo;
}
