import { Moment } from 'moment';

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
  paymentStatusFilter?: 'paid' | 'pending' | 'failed'; // New filter
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
