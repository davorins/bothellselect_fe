import React from 'react';
import { all_routes } from '../../router/all_routes';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { TableRecord } from '../../../types/types';
import { getCurrentYear } from '../../../utils/season';
import { getAvatarUrl, getDefaultAvatar } from '../../../utils/r2Utils';
import { formatAddress, AddressShowConfig } from '../../../utils/address';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { showDeleteConfirm } from '../modals/DeleteConfirmModal';
import Swal from 'sweetalert2';

interface ExtendedCoachTableRecord extends Omit<TableRecord, 'email'> {
  type: 'coach';
  status: string;
  DateofJoin: string;
  imgSrc?: string;
  avatar?: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  isCoach: boolean;
  email?: string;
  role: string;
  players?: any[];
  [key: string]: any;
}

// LooseAddress to handle optional street2 from API
type LooseAddress = {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
};
const fmtAddr = (
  addr: string | LooseAddress | undefined,
  show?: AddressShowConfig,
): string => {
  if (!addr) return 'N/A';
  if (typeof addr === 'string') return addr || 'N/A';
  return formatAddress(addr as any, show) || 'N/A';
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const exportEmailList = <T extends ExtendedCoachTableRecord>(
  data: T[],
) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .map((item) => item.email?.trim())
        .filter((email): email is string => !!email),
    ),
  );

  if (uniqueEmails.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Emails Found',
      text: 'No valid email addresses found to export.',
      confirmButtonColor: '#594230',
      confirmButtonText: 'OK',
    });
    return;
  }

  const link = document.createElement('a');
  link.setAttribute(
    'href',
    encodeURI('data:text/csv;charset=utf-8,' + uniqueEmails.join('\n')),
  );
  link.setAttribute(
    'download',
    `coach_emails_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  Swal.fire({
    icon: 'success',
    title: 'Export Complete',
    html: `<p style="color:#555"><strong>${uniqueEmails.length}</strong> email${uniqueEmails.length > 1 ? 's' : ''} exported to CSV.</p>`,
    confirmButtonColor: '#594230',
    confirmButtonText: 'Done',
    timer: 3000,
    timerProgressBar: true,
  });
};

export const exportCoachesToPDF = <T extends ExtendedCoachTableRecord>(
  data: T[],
  addrShow?: AddressShowConfig,
) => {
  const doc = new jsPDF();
  doc.text('Coaches List', 14, 15);

  const tableColumn = [
    'Name',
    'Email',
    'Phone',
    'Address',
    'Status',
    'Date Joined',
  ];
  const tableRows = data.map((item) => [
    item.fullName,
    item.email || 'N/A',
    item.phone ? formatPhoneNumber(item.phone) : 'N/A',
    fmtAddr(item.address as any, addrShow),
    'Active',
    formatDate(item.createdAt),
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
  });

  doc.save(`coaches_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportCoachesToExcel = <T extends ExtendedCoachTableRecord>(
  data: T[],
  addrShow?: AddressShowConfig,
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      Name: item.fullName,
      Email: item.email || 'N/A',
      Phone: item.phone ? formatPhoneNumber(item.phone) : 'N/A',
      Address: fmtAddr(item.address as any, addrShow),
      Status: 'Active',
      'Date Joined': formatDate(item.createdAt),
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Coaches');
  XLSX.writeFile(
    workbook,
    `coaches_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const copyEmailListToClipboard = <T extends ExtendedCoachTableRecord>(
  data: T[],
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void,
) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .map((item) => item.email?.trim())
        .filter((email): email is string => !!email && email !== ''),
    ),
  );

  if (uniqueEmails.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Emails Found',
      text: 'No valid email addresses found to copy.',
      confirmButtonColor: '#594230',
      confirmButtonText: 'OK',
    });
    onError?.('No valid email addresses found to copy');
    return false;
  }

  navigator.clipboard
    .writeText(uniqueEmails.join(', '))
    .then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        html: `
          <div style="text-align:left">
            <p style="margin-bottom:10px;color:#555">
              <strong>${uniqueEmails.length}</strong> coach email${uniqueEmails.length > 1 ? 's' : ''} copied to clipboard.
            </p>
            <div style="
              background:#f8f9fa;
              border:1px solid #e9ecef;
              border-radius:8px;
              padding:10px 14px;
              max-height:140px;
              overflow-y:auto;
              font-size:13px;
              color:#495057;
              font-family:monospace;
              line-height:1.7;
            ">
              ${uniqueEmails.map((e) => `<div>${e}</div>`).join('')}
            </div>
          </div>
        `,
        confirmButtonColor: '#594230',
        confirmButtonText: 'Done',
        showCloseButton: true,
        timer: 5000,
        timerProgressBar: true,
      });
    })
    .catch((err) => {
      console.error('Failed to copy emails:', err);
      Swal.fire({
        icon: 'error',
        title: 'Copy Failed',
        text: 'Could not copy emails to clipboard. Please try again.',
        confirmButtonColor: '#594230',
        confirmButtonText: 'OK',
      });
      onError?.('Failed to copy emails to clipboard');
    });

  return true;
};

export const getCoachTableColumns = <T extends ExtendedCoachTableRecord>(
  handleCoachClick: (record: T) => void,
  currentUserRole?: string,
  onDeleteSuccess?: () => void,
  visibleFields?: string[],
): TableProps<T>['columns'] => {
  // undefined = config not wired up yet, show everything
  // [] = config loaded, all fields disabled
  const isFieldVisible = (name: string): boolean => {
    if (visibleFields === undefined) return true;
    return visibleFields.includes(name);
  };

  const nameCol = {
    title: 'Name',
    dataIndex: 'fullName',
    key: 'name',
    render: (text: string, record: T) => {
      const defaultAvatar = getDefaultAvatar('coach');
      const avatarUrl = getAvatarUrl(
        record.avatar || record.imgSrc,
        defaultAvatar,
      );

      return (
        <div className='table-avatar d-flex align-items-center'>
          <div
            className='avatar avatar-md cursor-pointer'
            onClick={() => handleCoachClick(record)}
          >
            <img
              src={avatarUrl}
              className='img-fluid rounded-circle'
              alt={record.fullName}
              onError={(e) => {
                (e.target as HTMLImageElement).src = getDefaultAvatar('coach');
              }}
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
            <span className='d-block text-muted small'>Coach</span>
          </div>
        </div>
      );
    },
    sorter: (a: T, b: T) => a.fullName.localeCompare(b.fullName),
  };

  const emailCol = {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    sorter: (a: T, b: T) => (a.email || '').localeCompare(b.email || ''),
  };

  const phoneCol = {
    title: 'Phone',
    dataIndex: 'phone',
    key: 'phone',
    render: (phone: string) => (phone ? formatPhoneNumber(phone) : 'N/A'),
    sorter: (a: T, b: T) => (a.phone || '').localeCompare(b.phone || ''),
  };

  // AAU is always shown for coaches — they are by definition coaches
  const aauCol = {
    title: 'AAU Number',
    dataIndex: 'aauNumber',
    key: 'aauNumber',
    render: (num: string) => num || 'N/A',
    sorter: (a: T, b: T) =>
      (a.aauNumber || '').localeCompare(b.aauNumber || ''),
  };

  const statusCol = {
    title: 'Status',
    key: 'status',
    render: () => (
      <span className='badge badge-soft-success d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-success'></i>
        Active
      </span>
    ),
  };

  const dateCol = {
    title: 'Date Joined',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (date: string) => formatDate(date),
    sorter: (a: T, b: T) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

  const actionsCol =
    currentUserRole === 'admin' || currentUserRole === 'coach'
      ? [
          {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: T) => {
              const canDelete = currentUserRole === 'admin' && !record.parentId;

              return (
                <div className='d-flex align-items-center gap-2'>
                  <button
                    onClick={() => handleCoachClick(record)}
                    className='btn btn-sm btn-icon btn-outline-secondary'
                    title='View Details'
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className='ti ti-eye fs-16' />
                  </button>
                  <Link
                    to={`${all_routes.editParent}/${record._id}`}
                    state={{
                      parent: record,
                      isCoach: true,
                      from: window.location.pathname,
                    }}
                    className='btn btn-sm btn-icon btn-outline-warning'
                    title='Edit'
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className='ti ti-edit fs-16' />
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() =>
                        showDeleteConfirm(
                          {
                            _id: record._id,
                            fullName: record.fullName,
                            email: record.email,
                            parentId: record.parentId,
                            isCoach: true,
                            role: 'coach',
                          },
                          {
                            onDeleteSuccess: onDeleteSuccess,
                            customTitle: 'Delete Coach Account',
                            customContent: (
                              <div>
                                <p>
                                  Are you sure you want to delete this coach
                                  account?
                                </p>
                                <p>
                                  <strong>Name:</strong> {record.fullName}
                                </p>
                                <p>
                                  <strong>Email:</strong>{' '}
                                  {record.email || 'N/A'}
                                </p>
                                <div
                                  className='alert alert-danger mt-2 p-2'
                                  style={{ fontSize: '14px' }}
                                >
                                  <i className='ti ti-alert-triangle me-2'></i>
                                  This action cannot be undone. This will
                                  permanently delete:
                                  <ul className='mt-2 mb-0'>
                                    <li>The coach's personal information</li>
                                    <li>All coaching associations</li>
                                    <li>Any linked player profiles</li>
                                    <li>
                                      Registration history and payment records
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            ),
                          },
                        )
                      }
                      className='btn btn-sm btn-icon btn-outline-danger'
                      title='Delete'
                      style={{ width: '32px', height: '32px' }}
                    >
                      <i className='ti ti-trash fs-16' />
                    </button>
                  )}
                </div>
              );
            },
          },
        ]
      : [];

  return [
    nameCol,
    ...(isFieldVisible('email') ? [emailCol] : []),
    ...(isFieldVisible('phone') ? [phoneCol] : []),
    aauCol, // always shown — coaches always have AAU
    statusCol,
    dateCol,
    ...actionsCol,
  ];
};
