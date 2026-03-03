import { TableRecord } from './types';

export type StatusType = 'Active' | 'Inactive' | 'Pending Payment';

export interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: StatusType;
  paymentStatus?: 'paid' | 'notPaid' | null;
  DateofJoin: string;
  imgSrc: string;
  avatar?: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  isCoach?: boolean;
  players?: any[];
  additionalGuardians?: any[];
  updatedAt?: string;
  relationship?: string;
}
