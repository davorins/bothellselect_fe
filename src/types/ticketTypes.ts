// types/ticketTypes.ts
export interface TicketPurchaseData {
  _id: string;
  key: string;
  formId: string;
  submissionId: string;
  customerEmail: string;
  customerName: string;
  paymentId: string;
  squarePaymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  packageName: string;
  quantity: number;
  unitPrice: number;
  receiptUrl: string;
  processedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  formName?: string;
  tournamentName?: string;
  season?: string;
  year?: number;
}

export interface TicketStats {
  totalAmount: number;
  totalTickets: number;
  totalTransactions: number;
  averageTicketPrice: number;
  uniqueCustomers?: number;
}

export interface TicketFilterParams {
  seasonFilter: string | null;
  yearFilter: number | null;
  statusFilter: string | null;
  packageFilter: string | null;
  customerFilter: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export interface SeasonYearData {
  seasons: string[];
  years: number[];
  packages: string[];
}

// Add these interfaces for pagination support
export interface PaginationData {
  current: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TicketApiResponse {
  tickets: TicketPurchaseData[];
  pagination: PaginationData;
  stats?: TicketStats;
  metadata?: SeasonYearData;
}

export interface ApiResponseWithPagination<T> {
  data: T[];
  pagination: PaginationData;
  stats?: TicketStats;
  metadata?: SeasonYearData;
}
