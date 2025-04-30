import React from 'react';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { TableRecord, FormattedAddress } from '../../../types/types';

interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  isCoach?: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const getParentTableColumns = <T extends ExtendedTableRecord>(
  handleParentClick: (record: T) => void,
  currentUserRole?: string
): TableProps<T>['columns'] => [
  {
    title: 'Name',
    dataIndex: 'fullName',
    key: 'name',
    render: (text: string, record: T) => {
      return (
        <div key={record._id} className='d-flex align-items-center'>
          <div
            onClick={() => handleParentClick(record)}
            className='avatar avatar-md cursor-pointer'
          >
            <img
              src={
                record.imgSrc && record.imgSrc.trim() !== ''
                  ? record.imgSrc.startsWith('http')
                    ? record.imgSrc // Use Cloudinary URL directly
                    : `${API_BASE_URL}${record.imgSrc}` // Handle local paths
                  : 'https://bothell-select.onrender.com/uploads/avatars/parents.png'
              }
              className='img-fluid rounded-circle'
              alt={
                record.fullName
                  ? `${record.fullName}'s profile picture`
                  : 'Guardian profile picture'
              }
            />
          </div>
          <div className='ms-3'>
            <span
              className='cursor-pointer text-primary mb-0'
              onClick={() => handleParentClick(record)}
            >
              {text}
              {record.type === 'guardian' && (
                <span className='text-muted small d-block'>Guardian</span>
              )}
            </span>
          </div>
        </div>
      );
    },
    sorter: (a: T, b: T) => a.fullName.localeCompare(b.fullName),
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    sorter: (a: T, b: T) => (a.email || '').localeCompare(b.email || ''),
  },
  {
    title: 'Phone',
    dataIndex: 'phone',
    key: 'phone',
    sorter: (a: T, b: T) => (a.phone || '').localeCompare(b.phone || ''),
    render: (phone: string) => (phone ? formatPhoneNumber(phone) : 'N/A'),
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
    render: (address: FormattedAddress) =>
      typeof address === 'string'
        ? address
        : `${address.street}, ${address.city}, ${address.state} ${address.zip}`,
    sorter: (a: T, b: T) => {
      const addrA =
        typeof a.address === 'string'
          ? a.address
          : `${a.address?.street} ${a.address?.city} ${a.address?.state} ${a.address?.zip}`;
      const addrB =
        typeof b.address === 'string'
          ? b.address
          : `${b.address?.street} ${b.address?.city} ${b.address?.state} ${b.address?.zip}`;
      return (addrA || '').localeCompare(addrB || '');
    },
  },
  {
    title: 'Type',
    key: 'type',
    render: (_: unknown, record: T) => {
      if (record.isCoach) return <span>Coach</span>;
      if (record.type === 'guardian') return <span>Guardian</span>;
      return <span>Parent</span>;
    },
    sorter: (a: T, b: T) => {
      const typeA = a.isCoach ? 'coach' : a.type || 'parent';
      const typeB = b.isCoach ? 'coach' : b.type || 'parent';
      return typeA.localeCompare(typeB);
    },
  },
  {
    title: 'Status',
    key: 'status',
    render: (_: unknown, record: T) => (
      <span className='badge badge-soft-success d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1'></i>
        Active
      </span>
    ),
  },
  {
    title: 'Date Joined',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (date: string) => formatDate(date),
    sorter: (a: T, b: T) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
  ...(currentUserRole === 'admin' || currentUserRole === 'coach'
    ? [
        {
          title: 'Action',
          key: 'action',
          render: (_: unknown, record: T) => {
            // Use parentId for guardians in action items too
            const targetRecord = record.parentId
              ? { ...record, _id: record.parentId }
              : record;

            return (
              <div className='d-flex align-items-center'>
                <div className='dropdown'>
                  <Link
                    to='#'
                    className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
                    data-bs-toggle='dropdown'
                    aria-expanded='false'
                  >
                    <i className='ti ti-dots-vertical fs-14' />
                  </Link>
                  <ul className='dropdown-menu dropdown-menu-right p-3'>
                    <li>
                      <div
                        className='dropdown-item rounded-1 cursor-pointer'
                        onClick={() => handleParentClick(targetRecord)}
                      >
                        <i className='ti ti-menu me-2' />
                        View
                      </div>
                    </li>
                    <li>
                      <Link
                        className='dropdown-item rounded-1'
                        to={`/parents/edit/${targetRecord._id}`}
                      >
                        <i className='ti ti-edit me-2' />
                        Edit
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            );
          },
        },
      ]
    : []),
];
