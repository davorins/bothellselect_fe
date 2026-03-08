// components/Tables/ParentTableColumns.tsx
import React from 'react';
import { all_routes } from '../../router/all_routes';
import { TableProps, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../../../utils/phone';
import { formatDate } from '../../../utils/dateFormatter';
import { FormattedAddress } from '../../../types/types';
import { ExtendedTableRecord } from '../../../types/table.types';
import { getCurrentYear } from '../../../utils/season';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getAvatarUrl, getDefaultAvatar } from '../../../utils/r2Utils';
import {
  showDeleteConfirm,
  DeleteUserData,
} from '../modals/DeleteConfirmModal';
import Swal from 'sweetalert2';
import {
  formatAddress,
  AddressShowConfig,
  Address,
} from '../../../utils/address';

interface ParentTableColumnsProps {
  handleParentClick: (record: ExtendedTableRecord) => void;
  handleEditClick?: (record: ExtendedTableRecord) => void;
  currentUserRole?: string;
  loading?: boolean;
  onDeleteSuccess?: () => void;
  visibleFields?: string[];
}

// fmtAddr accepts address with optional street2 and casts for shared formatAddress
const fmtAddr = (
  addr:
    | string
    | {
        street: string;
        street2?: string;
        city: string;
        state: string;
        zip: string;
      }
    | undefined
    | null,
  show?: AddressShowConfig,
) => formatAddress(addr as Address | string | null | undefined, show);

// Skeleton loader for parent table rows
export const ParentTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 10,
}) => {
  return (
    <div className='parent-table-skeleton'>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className='skeleton-row d-flex align-items-center p-3 border-bottom'
        >
          <div className='d-flex align-items-center w-100'>
            <Skeleton.Avatar
              active
              size='large'
              shape='circle'
              className='me-3 flex-shrink-0'
            />
            <div className='flex-grow-1'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
                className='mb-1'
              />
            </div>
            <div className='d-flex gap-4 flex-wrap'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 150, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 100, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 80, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 80, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 90, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Helper: is player registered for current season
const isPlayerRegisteredForCurrentSeason = (player: any): boolean => {
  const currentYear = getCurrentYear();
  if (player.seasons && Array.isArray(player.seasons)) {
    if (player.seasons.some((season: any) => season.year === currentYear))
      return true;
  }
  return player.season && player.registrationYear === currentYear;
};

// Helper: parent status
const getParentStatus = <T extends ExtendedTableRecord>(
  record: T,
): 'active' | 'inactive' | 'pending' => {
  if (record.isCoach) return 'active';
  const hasCurrentSeasonRegistration = record.players?.some(
    isPlayerRegisteredForCurrentSeason,
  );
  if (hasCurrentSeasonRegistration) return 'active';
  const hasPendingPayments = record.players?.some(
    (player) => player.registrationComplete && !player.paymentComplete,
  );
  return hasPendingPayments ? 'pending' : 'inactive';
};

// Export to PDF
export const exportParentsToPDF = <T extends ExtendedTableRecord>(
  data: T[],
  addrShow: AddressShowConfig = {
    street: true,
    city: true,
    state: true,
    zip: true,
  },
) => {
  const doc = new jsPDF();
  doc.text('Parents List', 14, 15);

  const tableColumn = ['Name', 'Email', 'Phone', 'Address', 'Type', 'Status'];
  const tableRows = data.map((item) => [
    item.fullName,
    item.email || 'N/A',
    item.phone ? formatPhoneNumber(item.phone) : 'N/A',
    fmtAddr(item.address, addrShow) || 'N/A',
    item.isCoach ? 'Coach' : item.type === 'guardian' ? 'Guardian' : 'Parent',
    getParentStatus(item) === 'active' ? 'Active' : 'Inactive',
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

  doc.save(`parents_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Export to Excel
export const exportParentsToExcel = <T extends ExtendedTableRecord>(
  data: T[],
  addrShow: AddressShowConfig = {
    street: true,
    city: true,
    state: true,
    zip: true,
  },
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      Name: item.fullName,
      Email: item.email || 'N/A',
      Phone: item.phone ? formatPhoneNumber(item.phone) : 'N/A',
      Address: fmtAddr(item.address, addrShow) || 'N/A',
      Type: item.isCoach
        ? 'Coach'
        : item.type === 'guardian'
          ? 'Guardian'
          : 'Parent',
      Status: getParentStatus(item) === 'active' ? 'Active' : 'Inactive',
      'Date Joined': formatDate(item.createdAt),
    })),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');
  XLSX.writeFile(
    workbook,
    `parents_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

// Export email list to CSV
export const exportEmailList = <T extends ExtendedTableRecord>(data: T[]) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .map((parent) => parent.email?.trim())
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
    `parent_emails_${new Date().toISOString().slice(0, 10)}.csv`,
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

// Copy emails to clipboard
export const copyEmailListToClipboard = <T extends ExtendedTableRecord>(
  data: T[],
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void,
) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .map((parent) => parent.email?.trim())
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
              <strong>${uniqueEmails.length}</strong> email${uniqueEmails.length > 1 ? 's' : ''} copied to clipboard.
            </p>
            <div style="
              background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px;
              padding:10px 14px; max-height:140px; overflow-y:auto;
              font-size:13px; color:#495057; font-family:monospace; line-height:1.7;
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

// ---------------------------------------------------------------------------
// Main columns definition with dynamic visibility
// ---------------------------------------------------------------------------
export const getParentTableColumns = ({
  handleParentClick,
  handleEditClick,
  currentUserRole,
  loading = false,
  onDeleteSuccess,
  visibleFields = [],
}: ParentTableColumnsProps): TableProps<ExtendedTableRecord>['columns'] => {
  // No length===0 fallback — if visibleFields is empty the caller hasn't loaded
  // config yet; columns are simply not rendered until fields arrive.
  const isFieldVisible = (fieldName: string): boolean =>
    visibleFields.includes(fieldName);

  const isAddressFieldVisible =
    isFieldVisible('address') ||
    isFieldVisible('city') ||
    isFieldVisible('state') ||
    isFieldVisible('zip');

  const isPhoneFieldVisible = isFieldVisible('phone');

  const addrShow: AddressShowConfig = {
    street: isFieldVisible('address'),
    city: isFieldVisible('city'),
    state: isFieldVisible('state'),
    zip: isFieldVisible('zip'),
  };

  // Loading skeleton columns
  if (loading) {
    return [
      {
        title: 'Name',
        dataIndex: 'fullName',
        key: 'name',
        render: () => (
          <div className='d-flex align-items-center'>
            <Skeleton.Avatar active size='large' shape='circle' />
            <div className='ms-3'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
              />
            </div>
          </div>
        ),
      },
      ...(isFieldVisible('email')
        ? [
            {
              title: 'Email',
              dataIndex: 'email',
              key: 'email',
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 150, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isPhoneFieldVisible
        ? [
            {
              title: 'Phone',
              dataIndex: 'phone',
              key: 'phone',
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 100, height: 16 }}
                />
              ),
            },
          ]
        : []),
      ...(isAddressFieldVisible
        ? [
            {
              title: 'Address',
              dataIndex: 'address',
              key: 'address',
              render: () => (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: 120, height: 16 }}
                />
              ),
            },
          ]
        : []),
      {
        title: 'Type',
        key: 'type',
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Payment Status',
        key: 'status',
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Date Joined',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 90, height: 16 }}
          />
        ),
      },
      ...(currentUserRole === 'admin' || currentUserRole === 'coach'
        ? [
            {
              title: 'Action',
              key: 'action',
              render: () => (
                <Skeleton.Button
                  active
                  size='small'
                  style={{ width: 60, height: 32 }}
                />
              ),
            },
          ]
        : []),
    ];
  }

  const columns: TableProps<ExtendedTableRecord>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'name',
      render: (text: string, record: ExtendedTableRecord) => {
        const defaultAvatar = getDefaultAvatar(
          record.isCoach ? 'coach' : 'parent',
        );
        const avatarUrl = getAvatarUrl(
          record.avatar || record.imgSrc,
          defaultAvatar,
        );
        return (
          <div key={record._id} className='d-flex align-items-center'>
            <div
              onClick={() => handleParentClick(record)}
              className='avatar avatar-md cursor-pointer'
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
              <span
                className='cursor-pointer text-primary mb-0'
                onClick={() => handleParentClick(record)}
              >
                {text}
              </span>
            </div>
          </div>
        );
      },
      sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) =>
        a.fullName.localeCompare(b.fullName),
    },

    ...(isFieldVisible('email')
      ? [
          {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) =>
              (a.email || '').localeCompare(b.email || ''),
          },
        ]
      : []),

    ...(isPhoneFieldVisible
      ? [
          {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) =>
              (a.phone || '').localeCompare(b.phone || ''),
            render: (phone: string) =>
              phone ? formatPhoneNumber(phone) : 'N/A',
          },
        ]
      : []),

    ...(isAddressFieldVisible
      ? [
          {
            title: 'Address',
            dataIndex: 'address',
            key: 'address',
            render: (_: unknown, record: ExtendedTableRecord) =>
              fmtAddr(record.address, addrShow) || 'N/A',
            sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) =>
              fmtAddr(a.address, addrShow).localeCompare(
                fmtAddr(b.address, addrShow),
              ),
          },
        ]
      : []),

    {
      title: 'Type',
      key: 'type',
      render: (_: unknown, record: ExtendedTableRecord) => {
        if (record.isCoach) return <span>Coach</span>;
        if (record.type === 'guardian') return <span>Guardian</span>;
        return <span>Parent</span>;
      },
      sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) => {
        const typeA = a.isCoach ? 'coach' : a.type || 'parent';
        const typeB = b.isCoach ? 'coach' : b.type || 'parent';
        return typeA.localeCompare(typeB);
      },
    },

    {
      title: 'Payment Status',
      key: 'status',
      render: (_: unknown, record: ExtendedTableRecord) => {
        const status = record.status;
        const badgeColor =
          status === 'Active'
            ? 'success'
            : status === 'Pending Payment'
              ? 'warning'
              : 'danger';
        return (
          <span
            className={`badge badge-soft-${badgeColor} d-inline-flex align-items-center`}
          >
            <i className={`ti ti-circle-filled fs-5 me-1 text-${badgeColor}`} />
            {status}
          </span>
        );
      },
      sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) =>
        (a.status || '').localeCompare(b.status || ''),
    },

    {
      title: 'Date Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
      sorter: (a: ExtendedTableRecord, b: ExtendedTableRecord) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },

    ...(currentUserRole === 'admin' || currentUserRole === 'coach'
      ? [
          {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: ExtendedTableRecord) => {
              const targetRecord = record.parentId
                ? { ...record, _id: record.parentId }
                : record;
              const canDelete =
                currentUserRole === 'admin' &&
                (record.type === 'parent' ||
                  (record.type === 'coach' && !record.parentId));

              return (
                <div className='d-flex align-items-center gap-2'>
                  <button
                    onClick={() => handleParentClick(targetRecord)}
                    className='btn btn-sm btn-icon btn-outline-secondary btn-sm'
                    title='View Details'
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className='ti ti-eye fs-16' />
                  </button>
                  <button
                    onClick={() => handleEditClick?.(record)}
                    className='btn btn-sm btn-icon btn-outline-warning btn-sm'
                    title='Edit'
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className='ti ti-edit fs-16' />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() =>
                        showDeleteConfirm(
                          {
                            _id: targetRecord._id,
                            fullName: targetRecord.fullName,
                            email: targetRecord.email,
                            parentId: targetRecord.parentId,
                            type: targetRecord.type,
                            isCoach: targetRecord.isCoach,
                          },
                          { onDeleteSuccess: onDeleteSuccess },
                        )
                      }
                      className='btn btn-sm btn-icon btn-outline-danger btn-sm'
                      title='Delete'
                      style={{ width: '32px', height: '32px' }}
                    >
                      <i className='ti ti-trash fs-16' />
                    </button>
                  )}
                </div>
              );
              {
                /* Dropdown Menu - Preserved for future use */
              }
              {
                /* <div className='dropdown'>
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
                        <div
                          className='dropdown-item rounded-1 cursor-pointer'
                          onClick={() => handleEditClick?.(record)}
                        >
                          <i className='ti ti-edit me-2' />
                          Edit
                        </div>
                      </li>
                      {canDelete && (
                        <li>
                          <div
                            className='dropdown-item rounded-1 cursor-pointer text-danger'
                            onClick={() =>
                              showDeleteConfirm(
                                {
                                  _id: targetRecord._id,
                                  fullName: targetRecord.fullName,
                                  email: targetRecord.email,
                                  parentId: targetRecord.parentId,
                                  type: targetRecord.type,
                                  isCoach: targetRecord.isCoach,
                                },
                                {
                                  onDeleteSuccess: onDeleteSuccess,
                                },
                              )
                            }
                          >
                            <i className='ti ti-trash me-2' />
                            Delete
                          </div>
                        </li>
                      )}
                    </ul>
                  </div> */
              }
            },
          },
        ]
      : []),
  ];

  return columns;
};
