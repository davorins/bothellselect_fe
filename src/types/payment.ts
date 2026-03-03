// payment.ts
// ==================== Core Payment Types ====================
export type PaymentSystem = 'square' | 'clover' | 'stripe' | 'paypal';
export type Environment = 'sandbox' | 'production';
export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP';
export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface SquarePaymentResult {
  status: 'OK' | 'FAILED' | 'COMPLETED' | 'PENDING' | 'CANCELED';
  payment?: {
    id: string;
    amount_money: {
      amount: number;
      currency: string;
    };
    card_details?: {
      card: {
        last_4: string;
        card_brand: string;
        exp_month: string;
        exp_year: string;
      };
    };
    receipt_url?: string;
    status?: string;
  };
  errors?: Array<{
    code: string;
    detail: string;
  }>;
}

export interface CloverPaymentResult {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'VOIDED' | 'FAILED';
  orderId?: string;
  card?: {
    last4?: string;
    type?: string;
  };
}

export interface StripePaymentResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method_details?: {
    card?: {
      last4: string;
      brand: string;
      exp_month: number;
      exp_year: number;
    };
  };
  receipt_url?: string;
}

export interface PayPalPaymentResult {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: {
    value: string;
    currency_code: string;
  };
  payment_source?: {
    card?: {
      last_digits: string;
      brand: string;
      expiry: string;
    };
  };
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

// ==================== Configuration Types ====================
export interface SquareConfig {
  accessToken: string;
  applicationId?: string;
  environment: Environment;
  locationId: string;
  webhookSignatureKey?: string;
}

export interface CloverConfig {
  merchantId: string;
  accessToken: string;
  environment: Environment;
  apiBaseUrl?: string;
}

export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
}

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: Environment;
}

export interface PaymentSettings {
  currency: Currency;
  taxRate: number;
  enableAutomaticRefunds: boolean;
  enablePartialRefunds: boolean;
  defaultPaymentDescription?: string;
  receiptEmailTemplate?: string;
}

export interface WebhookUrls {
  paymentSuccess?: string;
  paymentFailed?: string;
  refundProcessed?: string;
}

// ==================== Parent/Guardian Types ====================
export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface ParentInfo {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  address: Address;
  relationship: string;
  isCoach: boolean;
  aauNumber?: string;
  agreeToTerms?: boolean;
  squareCustomerId?: string;
  stripeCustomerId?: string;
  cloverCustomerId?: string;
}

// ==================== Payment Records ====================
export interface PaymentRecord {
  id: string;
  playerId?: string;
  parentId: string;
  paymentId: string; // Transaction ID from payment processor
  orderId?: string; // For Clover/other systems that use orders
  locationId?: string; // Square specific
  merchantId?: string; // Clover specific

  // Payment system info
  paymentSystem: PaymentSystem;
  configurationId?: string;

  // Card details (PCI compliant)
  cardLastFour: string;
  cardBrand: string;
  cardExpMonth: string;
  cardExpYear: string;

  // Transaction details
  amount: number;
  currency: string;
  status: PaymentStatus;
  refundedAmount?: number;
  refundStatus?: 'none' | 'pending' | 'refunded' | 'partially_refunded';

  // Timestamps
  createdAt: Date;
  processedAt?: Date;
  refundedAt?: Date;

  // Additional info
  receiptUrl?: string;
  note?: string;
  parentInfo?: ParentInfo;
  playerInfo?: {
    id: string;
    fullName: string;
    grade?: string;
  };

  // Metadata
  metadata?: Record<string, any>;
  refunds?: Array<{
    id: string;
    amount: number;
    reason: string;
    status: string;
    processedAt: Date;
  }>;
}

// ==================== Configuration Management ====================
export interface PaymentConfiguration {
  _id: string;
  organizationId: string;
  paymentSystem: PaymentSystem;
  isActive: boolean;
  squareConfig?: SquareConfig;
  cloverConfig?: CloverConfig;
  stripeConfig?: StripeConfig;
  paypalConfig?: PayPalConfig;
  settings: PaymentSettings;
  webhookUrls?: WebhookUrls;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastModifiedBy?: string;
}

// ==================== Player & Registration Types ====================
export interface Player {
  id: string;
  parentId: string;
  fullName: string;
  grade: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  paymentStatus?: PaymentStatus;
  paymentComplete?: boolean;
  seasons?: Array<{
    season: string;
    year: number;
    tryoutId?: string;
    paymentStatus: PaymentStatus;
    paymentComplete: boolean;
    paymentId?: string;
    amountPaid?: number;
    cardLast4?: string;
    cardBrand?: string;
    paymentDate?: Date;
    registrationDate?: Date;
  }>;
}

export interface Registration {
  id: string;
  playerId: string;
  parentId: string;
  season: string;
  year: number;
  tryoutId?: string;
  paymentStatus: PaymentStatus;
  paymentComplete: boolean;
  paymentId?: string;
  amountPaid?: number;
  paymentDate?: Date;
  registrationDate: Date;
}

// ==================== Team & Tournament Types ====================
export interface Team {
  id: string;
  name: string;
  coachIds: string[];
  players: string[];
  tournament?: string;
  registrationYear?: number;
  paymentComplete?: boolean;
  paymentStatus?: PaymentStatus;
  tournaments?: Array<{
    tournamentId: string;
    tournamentName: string;
    year: number;
    registrationDate: Date;
    paymentStatus: PaymentStatus;
    paymentComplete: boolean;
    amountPaid?: number;
    paymentId?: string;
    paymentMethod?: string;
    cardLast4?: string;
    cardBrand?: string;
    levelOfCompetition?: string;
  }>;
}

export interface TournamentRegistration {
  tournamentId: string;
  tournamentName: string;
  year: number;
  teamIds: string[];
  paymentStatus: PaymentStatus;
  amount: number;
}

// ==================== API Request/Response ====================
export interface PaymentRequest {
  sourceId: string;
  amount: number;
  currency?: Currency;
  email: string;
  playerId?: string;
  playerIds?: string[];
  parentInfo?: ParentInfo;
  cardDetails?: {
    lastFour: string;
    brand: string;
    expDate: string;
    expMonth?: string;
    expYear?: string;
  };
  locationId?: string; // Square specific
  merchantId?: string; // Clover specific
  note?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  payment: Omit<PaymentRecord, 'id'>;
  parent?: {
    id: string;
    token: string;
  };
  player?: Player;
  players?: Player[];
  receiptUrl?: string;
  message?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
  refundAll?: boolean;
  parentId?: string;
}

export interface RefundResponse {
  success: boolean;
  refund: {
    id: string;
    amount: number;
    status: string;
    reason?: string;
    paymentId: string;
    isFullRefund: boolean;
    isPartialRefund: boolean;
  };
  payment?: {
    id: string;
    refundedAmount: number;
    refundStatus: string;
  };
}

// ==================== Utility Types ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: {
    locationsCount?: number;
    configuredLocationExists?: boolean;
    merchantName?: string;
    merchantId?: string;
    currency?: string;
    available?: number;
    pending?: number;
    livemode?: boolean;
    environment?: Environment;
  };
}

export interface PaymentSystemOption {
  id: PaymentSystem;
  name: string;
  description: string;
  icon: string;
  supportedFeatures: string[];
  documentationUrl?: string;
}

export interface PaymentConfigFormData {
  organizationId: string;
  paymentSystem: PaymentSystem;
  isActive: boolean;
  squareConfig?: Partial<SquareConfig>;
  cloverConfig?: Partial<CloverConfig>;
  stripeConfig?: Partial<StripeConfig>;
  paypalConfig?: Partial<PayPalConfig>;
  settings?: Partial<PaymentSettings>;
  webhookUrls?: Partial<WebhookUrls>;
}

export interface Organization {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: Address;
  paymentConfigurations: string[];
  settings?: {
    timezone: string;
    dateFormat: string;
    currency: Currency;
  };
}

// ==================== Payment Processing Types ====================
export interface ProcessedPayment {
  id: string;
  paymentSystem: PaymentSystem;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  transactionId: string;
  orderId?: string;
  timestamp: Date;
  cardLastFour: string;
  cardBrand: string;
  metadata?: Record<string, any>;
}

export interface PaymentProcessor {
  type: PaymentSystem;
  processPayment(paymentData: PaymentRequest): Promise<ProcessedPayment>;
  refundPayment(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<any>;
  getPaymentDetails(paymentId: string): Promise<any>;
}

// ==================== Webhook Types ====================
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  paymentSystem: PaymentSystem;
  signature?: string;
  rawBody?: string;
}

export interface WebhookHandler {
  handlePaymentSuccess(event: WebhookEvent): Promise<void>;
  handlePaymentFailed(event: WebhookEvent): Promise<void>;
  handleRefundProcessed(event: WebhookEvent): Promise<void>;
}

// ==================== Form & UI Types ====================
export interface PaymentFormData {
  amount: number;
  currency: Currency;
  email: string;
  description: string;
  playerIds: string[];
  parentId: string;
  cardToken: string;
  cardDetails: {
    last4: string;
    brand: string;
    expMonth: string;
    expYear: string;
  };
  saveCard?: boolean;
  agreeToTerms: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  card?: {
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
  };
  bankAccount?: {
    bankName: string;
    last4: string;
  };
  isDefault: boolean;
}

// ==================== Authentication & User Types ====================
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'coach' | 'parent';
  organizationId: string;
  permissions: string[];
  isActive: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getAuthToken: () => Promise<string>;
  hasPermission: (permission: string) => boolean;
}

// ==================== Error Types ====================
export interface PaymentError {
  code: string;
  message: string;
  details?: any;
  userMessage?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ==================== Analytics & Reporting ====================
export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  successfulPayments: number;
  failedPayments: number;
  refundsIssued: number;
  averageTransactionAmount: number;
  revenueByPaymentSystem: Record<PaymentSystem, number>;
  revenueByCurrency: Record<Currency, number>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export interface PaymentReport {
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  totalTransactions: number;
  payments: PaymentRecord[];
  refunds: Array<{
    id: string;
    paymentId: string;
    amount: number;
    reason: string;
    processedAt: Date;
  }>;
}

export interface SquareConfigForm {
  accessToken: string;
  applicationId: string; // No longer optional for form
  environment: Environment;
  locationId: string;
  webhookSignatureKey: string; // No longer optional for form
}

export interface CloverConfigForm {
  merchantId: string;
  accessToken: string;
  environment: Environment;
  apiBaseUrl: string; // No longer optional for form
}

export interface StripeConfigForm {
  secretKey: string;
  publishableKey: string; // No longer optional for form
  webhookSecret: string; // No longer optional for form
}

export interface WebhookUrlsForm {
  paymentSuccess: string; // No longer optional for form
  paymentFailed: string; // No longer optional for form
  refundProcessed: string; // No longer optional for form
}
