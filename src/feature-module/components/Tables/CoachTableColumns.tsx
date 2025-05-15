import React from 'react';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { TableRecord } from '../../../types/types';
import { isPlayerActive } from '../../../utils/season';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  players?: any[];
  [key: string]: any;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Helper function to get coach status
const getCoachStatus = <T extends ExtendedCoachTableRecord>(
  record: T
): 'active' | 'inactive' => {
  const hasActivePlayers = record.players?.some((player) =>
    isPlayerActive(player)
  );
  return hasActivePlayers ? 'active' : 'inactive';
};

// Export to PDF function
export const exportCoachesToPDF = <T extends ExtendedCoachTableRecord>(
  data: T[]
) => {
  // Create new jsPDF instance
  const doc = new jsPDF();

  // Add title
  doc.text('Coaches List', 14, 15);

  // Prepare table data
  const tableColumn = ['Name', 'Email', 'Phone', 'Address'];

  const tableRows = data.map((item) => [
    item.fullName,
    item.email || 'N/A',
    item.phone ? formatPhoneNumber(item.phone) : 'N/A',
    typeof item.address === 'string'
      ? item.address
      : `${item.address?.street}, ${item.address?.city}, ${item.address?.state} ${item.address?.zip}`,
    getCoachStatus(item) === 'active' ? 'Active' : 'Inactive',
    formatDate(item.createdAt),
  ]);

  // Add table using autoTable
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
    },
  });

  // Save the PDF
  doc.save(`coaches_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Export to Excel function
export const exportCoachesToExcel = <T extends ExtendedCoachTableRecord>(
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
      Status: getCoachStatus(item) === 'active' ? 'Active' : 'Inactive',
      'Date Joined': formatDate(item.createdAt),
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Coaches');
  XLSX.writeFile(
    workbook,
    `coaches_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

//Export to CSV
export const exportEmailList = <T extends ExtendedCoachTableRecord>(
  data: T[]
) => {
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

export const copyEmailListToClipboard = <T extends ExtendedCoachTableRecord>(
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

export const getCoachTableColumns = <T extends ExtendedCoachTableRecord>(
  handleCoachClick: (record: T) => void,
  currentUserRole?: string
): TableProps<T>['columns'] => {
  return [
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
      render: (_: unknown, record: T) => {
        const status = getCoachStatus(record);
        return (
          <span
            className={`badge badge-soft-${
              status === 'active' ? 'success' : 'danger'
            } d-inline-flex align-items-center`}
          >
            <i
              className={`ti ti-circle-filled fs-5 me-1 ${
                status === 'active' ? 'text-success' : 'text-danger'
              }`}
            ></i>
            {status === 'active' ? 'Active' : 'Inactive'}
          </span>
        );
      },
      sorter: (a: T, b: T) => {
        const statusA = getCoachStatus(a);
        const statusB = getCoachStatus(b);
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
};
