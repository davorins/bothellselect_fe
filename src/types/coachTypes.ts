import { Moment } from 'moment';
import { BaseUser, TableRecord, Player, Address } from './types';

export interface Coach extends BaseUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string | Address;
  aauNumber: string;
  role: string;
  players?: Player[];
  isCoach: true;
  createdAt: string;
  updatedAt?: string;
  avatar?: string;
  status?: string;
}

export interface CoachFilterParams {
  nameFilter: string;
  emailFilter: string;
  phoneFilter: string;
  statusFilter: string | null;
  aauNumberFilter: string;
  dateRange: [Moment, Moment] | null;
}

export type CoachSortOrder =
  | 'asc'
  | 'desc'
  | 'recentlyViewed'
  | 'recentlyAdded'
  | 'aauNumber'
  | null;

export interface CoachTableRecord extends TableRecord {
  isCoach: true;
  aauNumber: string;
}
