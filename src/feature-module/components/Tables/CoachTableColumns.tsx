import React from 'react';
import { all_routes } from '../../router/all_routes';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { TableRecord } from '../../../types/types';
import { getCurrentYear } from '../../../utils/season';
import { getAvatarUrl, getDefaultAvatar } from '../../../utils/r2Utils';
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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Coaches are always active - this function is now deprecated for coaches
// but kept for backward compatibility
const isPlayerRegisteredForCurrentSeason = (player: any): boolean => {
  const currentYear = getCurrentYear();
  if (player.seasons && Array.isArray(player.seasons)) {
    if (player.seasons.some((season: any) => season.year === currentYear))
      return true;
  }
  return player.season && player.registrationYear === currentYear;
};

// For coaches, we always return 'active' regardless of player status
const getCoachStatus = <T extends ExtendedCoachTableRecord>(
  record: T,
): 'active' | 'inactive' => {
  // COACHES ARE ALWAYS ACTIVE - this overrides any player-based calculation
  return 'active';
};

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
    typeof item.address === 'string'
      ? item.address
      : `${item.address?.street}, ${item.address?.city}, ${item.address?.state} ${item.address?.zip}`,
    'Active', // Always Active for coaches
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
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 'auto' },
    },
  });

  doc.save(`coaches_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportCoachesToExcel = <T extends ExtendedCoachTableRecord>(
  data: T[],
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      Name: item.fullName,
      Email: item.email || 'N/A',
      Phone: item.phone ? formatPhoneNumber(item.phone) : 'N/A',
      Address:
        typeof item.address === 'string'
          ? item.address
          : `${item.address?.street}, ${item.address?.city}, ${item.address?.state} ${item.address?.zip}`,
      Status: 'Active', // Always Active for coaches
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
): TableProps<T>['columns'] => {
  return [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'name',
      render: (text: string, record: T) => {
        const defaultAvatar = getDefaultAvatar(
          record.isCoach ? 'coach' : 'parent',
        );

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
                  (e.target as HTMLImageElement).src = getDefaultAvatar(
                    record.isCoach ? 'coach' : 'parent',
                  );
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
              {record.isCoach && (
                <span className='d-block text-muted small'>Coach</span>
              )}
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
      render: (_: unknown, record: T) => {
        // For coaches, we always show Active
        // You can also use record.status if it's set in the data
        const status = 'active'; // Always active for coaches
        const displayStatus = 'Active'; // Always show "Active"

        return (
          <span
            className={`badge badge-soft-success d-inline-flex align-items-center`}
          >
            <i className={`ti ti-circle-filled fs-5 me-1 text-success`}></i>
            {displayStatus}
          </span>
        );
      },
      sorter: (a: T, b: T) => {
        // Since all coaches are active, sorting doesn't matter much
        // But we'll keep it for consistency
        return 0;
      },
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
            render: (_: unknown, record: T) => {
              const canDelete = currentUserRole === 'admin' && !record.parentId;

              return (
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
                        to={`${all_routes.editParent}/${record._id}`}
                        state={{
                          parent: record,
                          isCoach: true,
                          from: window.location.pathname,
                        }}
                      >
                        <i className='ti ti-edit me-2' /> Edit
                      </Link>
                    </li>
                    {canDelete && (
                      <li>
                        <button
                          className='dropdown-item text-danger'
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
                                        <li>
                                          The coach's personal information
                                        </li>
                                        <li>All coaching associations</li>
                                        <li>Any linked player profiles</li>
                                        <li>
                                          Registration history and payment
                                          records
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
                                ),
                              },
                            )
                          }
                        >
                          <i className='ti ti-trash me-2' /> Delete
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              );
            },
          },
        ]
      : []),
  ];
};
