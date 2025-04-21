/**
 * Complete payment types with all dependencies
 */

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
