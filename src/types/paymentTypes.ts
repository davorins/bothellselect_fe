// paymentTypes.ts
export type PaymentSystem = 'square' | 'clover' | 'stripe' | 'paypal';
export type Environment = 'sandbox' | 'production';
export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP';

export interface SquareConfig {
  accessToken?: string;
  applicationId?: string;
  environment?: Environment;
  locationId?: string;
  webhookSignatureKey?: string;
}

export interface CloverConfig {
  merchantId?: string;
  accessToken?: string;
  environment?: Environment;
  apiBaseUrl?: string;
}

export interface PaymentConfiguration {
  _id: string;
  paymentSystem: PaymentSystem;
  isActive: boolean;
  isDefault?: boolean;
  squareConfig?: {
    accessToken?: string;
    applicationId?: string;
    environment?: Environment | string;
    locationId?: string;
    webhookSignatureKey?: string;
  };
  cloverConfig?: {
    merchantId?: string;
    accessToken?: string;
    environment?: Environment | string;
    apiBaseUrl?: string;
  };
  stripeConfig?: any;
  paypalConfig?: any;
  settings?: {
    currency?: string;
    taxRate?: number;
    enableAutomaticRefunds?: boolean;
    enablePartialRefunds?: boolean;
    defaultPaymentDescription?: string;
    receiptEmailTemplate?: string;
  };
  webhookUrls?: {
    paymentSuccess?: string;
    paymentFailed?: string;
    refundProcessed?: string;
  };
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

// ==================== Core Payment Types ====================
export interface SquarePaymentResult {
  status: 'OK' | 'FAILED';
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
  };
  errors?: Array<{
    code: string;
    detail: string;
  }>;
}

// ==================== Parent/Guardian Types ====================
export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
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
}

// ==================== Payment Records ====================
export interface PaymentRecord {
  id: string;
  playerId: string;
  parentId: string;
  paymentId: string; // Square transaction ID
  locationId: string;

  // Card details (PCI compliant)
  cardLastFour: string;
  cardBrand: string;
  cardExpMonth: string;
  cardExpYear: string;

  // Transaction details
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  // Timestamps
  createdAt: Date;
  processedAt?: Date;

  // Additional info
  receiptUrl?: string;
  parentInfo?: ParentInfo; // Now properly defined
}

// ==================== API Request/Response ====================
export interface PaymentRequest {
  sourceId: string;
  amount: number;
  playerId?: string;
  parentInfo?: ParentInfo;
  cardDetails: {
    lastFour: string;
    brand: string;
    expDate: string;
  };
  locationId: string;
}

export interface PaymentResponse {
  success: boolean;
  payment: Omit<PaymentRecord, 'id'>;
  parent?: {
    id: string;
    token: string;
  };
}
