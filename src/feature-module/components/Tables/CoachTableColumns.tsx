import React from 'react';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { TableRecord } from '../../../types/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface ExtendedCoachTableRecord extends Omit<TableRecord, 'email'> {
  type: 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  isCoach: boolean;
  email?: string;
  [key: string]: any;
}

export const getCoachTableColumns = <T extends ExtendedCoachTableRecord>(
  handleCoachClick: (record: T) => void,
  currentUserRole?: string
): TableProps<T>['columns'] => [
  {
    title: 'Name',
    dataIndex: 'fullName',
    key: 'name',
    render: (text: string, record: T) => (
      <div className='table-avatar d-flex align-items-center'>
        <div
          className='avatar avatar-md cursor-pointer'
          onClick={() => handleCoachClick(record)}
        >
          <img
            src={
              record.imgSrc && record.imgSrc.trim() !== ''
                ? record.imgSrc.startsWith('http')
                  ? record.imgSrc // Use Cloudinary URL directly
                  : `${API_BASE_URL}${record.imgSrc}` // Handle local paths
                : 'https://bothell-select.onrender.com/uploads/avatars/coach.png'
            }
            className='img-fluid rounded-circle'
            alt={
              record.fullName
                ? `${text}'s profile picture`
                : 'Coach profile picture'
            }
          />
        </div>
        <div className='ms-3'>
          <Link
            to='#'
            onClick={(e) => {
              e.preventDefault();
              handleCoachClick(record);
            }}
            className='text-primary'
          >
            {text}
          </Link>
          {record.isCoach && (
            <span className='d-block text-muted small'>Coach</span>
          )}
        </div>
      </div>
    ),
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
    render: (phone: string) => (phone ? formatPhoneNumber(phone) : 'N/A'),
    sorter: (a: T, b: T) => (a.phone || '').localeCompare(b.phone || ''),
  },
  {
    title: 'AAU Number',
    dataIndex: 'aauNumber',
    key: 'aauNumber',
    render: (num: string) => num || 'N/A',
    sorter: (a: T, b: T) =>
      (a.aauNumber || '').localeCompare(b.aauNumber || ''),
  },
  {
    title: 'Status',
    key: 'status',
    render: (
      _: unknown,
      record: T // Explicitly typed parameter
    ) => (
      <span className='badge badge-soft-success'>
        <i className='ti ti-circle-filled fs-5 me-1' />
        {record.status || 'Active'}
      </span>
    ),
    filters: [
      { text: 'Active', value: 'active' },
      { text: 'Inactive', value: 'inactive' },
    ],
    onFilter: (value, record) => record.status === value,
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
          title: 'Actions',
          key: 'actions',
          width: 120,
          render: (
            _: unknown,
            record: T // Explicitly typed parameter
          ) => (
            <div className='dropdown'>
              <Link
                to='#'
                className='btn btn-icon btn-sm'
                data-bs-toggle='dropdown'
              >
                <i className='ti ti-dots-vertical' />
              </Link>
              <ul className='dropdown-menu dropdown-menu-end'>
                <li>
                  <button
                    className='dropdown-item'
                    onClick={() => handleCoachClick(record)}
                  >
                    <i className='ti ti-eye me-2' /> View
                  </button>
                </li>
                <li>
                  <Link
                    className='dropdown-item'
                    to={`/coaches/edit/${record._id}`}
                  >
                    <i className='ti ti-edit me-2' /> Edit
                  </Link>
                </li>
              </ul>
            </div>
          ),
        },
      ]
    : []),
];
