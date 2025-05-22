import { Moment } from 'moment';

export type ParentFilterParams = {
  nameFilter: string;
  emailFilter: string;
  phoneFilter: string;
  statusFilter: string | null;
  roleFilter: string | null;
  dateRange: [Moment, Moment] | null;
  paymentStatusFilter?: 'paid' | 'notPaid' | null;
};

export type SortOrder =
  | 'asc'
  | 'desc'
  | 'recentlyViewed'
  | 'recentlyAdded'
  | null;
