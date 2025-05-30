import React from 'react';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { TableRecord, FormattedAddress } from '../../../types/types';
import {
  isPlayerActive,
  getCurrentSeason,
  getNextSeason,
  getCurrentYear,
} from '../../../utils/season';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: string;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  isCoach?: boolean;
  players?: any[];
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Helper function to get parent status
const getParentStatus = <T extends ExtendedTableRecord>(
  record: T
): 'active' | 'inactive' | 'pending' => {
  if (record.isCoach) return 'active';

  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();
  const nextSeason = getNextSeason();
  const nextSeasonYear =
    currentSeason === 'Winter' ? currentYear + 1 : currentYear;

  // Check players for current/next season registrations
  const hasCurrentSeasonPlayers = record.players?.some(
    (player) =>
      player.season === currentSeason && player.registrationYear === currentYear
  );
  const hasNextSeasonPlayers = record.players?.some(
    (player) =>
      player.season === nextSeason && player.registrationYear === nextSeasonYear
  );

  // Check payment status for current/next season players
  const hasPendingPayments = record.players?.some((player) => {
    const isCurrentOrNext =
      (player.season === currentSeason &&
        player.registrationYear === currentYear) ||
      (player.season === nextSeason &&
        player.registrationYear === nextSeasonYear);

    return (
      isCurrentOrNext && player.registrationComplete && !player.paymentComplete
    );
  });

  const hasActivePlayers = record.players?.some(
    (player) => isPlayerActive(player) && player.paymentComplete
  );

  if (hasActivePlayers) return 'active';
  if (hasPendingPayments) return 'pending';
  if (hasCurrentSeasonPlayers || hasNextSeasonPlayers) return 'pending'; // Fallback if payment status not available
  return 'inactive';
};

// Export to PDF function
export const exportParentsToPDF = <T extends ExtendedTableRecord>(
  data: T[]
) => {
  const doc = new jsPDF();
  doc.text('Parents List', 14, 15);

  const tableColumn = ['Name', 'Email', 'Phone', 'Address', 'Type', 'Status'];

  const tableRows = data.map((item) => [
    item.fullName,
    item.email || 'N/A',
    item.phone ? formatPhoneNumber(item.phone) : 'N/A',
    typeof item.address === 'string'
      ? item.address
      : `${item.address?.street}, ${item.address?.city}, ${item.address?.state} ${item.address?.zip}`,
    item.isCoach ? 'Coach' : item.type === 'guardian' ? 'Guardian' : 'Parent',
    getParentStatus(item) === 'active' ? 'Active' : 'Inactive', // Simplified for exports
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
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

  doc.save(`parents_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Export to Excel function
export const exportParentsToExcel = <T extends ExtendedTableRecord>(
  data: T[]
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
      Type: item.isCoach
        ? 'Coach'
        : item.type === 'guardian'
        ? 'Guardian'
        : 'Parent',
      Status: getParentStatus(item) === 'active' ? 'Active' : 'Inactive', // Simplified for exports
      'Date Joined': formatDate(item.createdAt),
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');
  XLSX.writeFile(
    workbook,
    `parents_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

// Export to CSV function (unchanged)
export const exportEmailList = <T extends ExtendedTableRecord>(data: T[]) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .map((parent) => parent.email?.trim())
        .filter((email): email is string => !!email)
    )
  );

  if (uniqueEmails.length === 0) {
    alert('No valid email addresses found to export');
    return;
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + uniqueEmails.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `parent_emails_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Copy to clipboard function (unchanged)
export const copyEmailListToClipboard = <T extends ExtendedTableRecord>(
  data: T[],
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void
) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .map((parent) => parent.email?.trim())
        .filter((email) => email && email !== '')
    )
  );

  if (uniqueEmails.length === 0) {
    onError?.('No valid email addresses found to copy');
    return false;
  }

  const emailString = uniqueEmails.join(', ');

  navigator.clipboard
    .writeText(emailString)
    .then(() => {
      onSuccess?.('Email list copied to clipboard!');
    })
    .catch((err) => {
      console.error('Failed to copy emails: ', err);
      onError?.('Failed to copy emails to clipboard');
    });

  return true;
};

// Main columns definition
export const getParentTableColumns = <T extends ExtendedTableRecord>(
  handleParentClick: (record: T) => void,
  currentUserRole?: string
): TableProps<T>['columns'] => {
  const columns: TableProps<T>['columns'] = [
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
                      ? record.imgSrc
                      : `${API_BASE_URL}${record.imgSrc}`
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
      render: (_: unknown, record: T) => {
        const status = getParentStatus(record);
        return (
          <span
            className={`badge badge-soft-${
              status === 'active'
                ? 'success'
                : status === 'pending'
                ? 'warning'
                : 'danger'
            } d-inline-flex align-items-center`}
          >
            <i
              className={`ti ti-circle-filled fs-5 me-1 ${
                status === 'active'
                  ? 'text-success'
                  : status === 'pending'
                  ? 'text-warning'
                  : 'text-danger'
              }`}
            ></i>
            {status === 'active'
              ? 'Active'
              : status === 'pending'
              ? 'Pending Payment'
              : 'Inactive'}
          </span>
        );
      },
      sorter: (a: T, b: T) => {
        const statusA = getParentStatus(a);
        const statusB = getParentStatus(b);
        return statusA.localeCompare(statusB);
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
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: T) => {
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

  return columns;
};
