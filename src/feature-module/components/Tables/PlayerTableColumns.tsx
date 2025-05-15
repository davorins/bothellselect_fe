import React from 'react';
import { TableProps } from 'antd';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { isPlayerActive } from '../../../utils/season';
import { formatDate, formatDateForStorage } from '../../../utils/dateFormatter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface PlayerData {
  id: string;
  name?: string;
  fullName?: string;
  gender?: string;
  dob?: string | Date;
  age?: number;
  section?: string;
  class?: string;
  avatar?: string;
  aauNumber?: string;
  season: string;
  registrationYear: number;
}

interface PlayerTableColumnsProps {
  handlePlayerClick: (record: any) => void;
  location: any;
}

const getPlayerStatus = (player: PlayerData): 'Active' | 'Inactive' => {
  return isPlayerActive(player) ? 'Active' : 'Inactive';
};

// Export to PDF function
export const exportPlayersToPDF = <T extends PlayerData>(data: T[]) => {
  const doc = new jsPDF();
  doc.text('Players List', 14, 15);

  const tableColumn = ['Name', 'Gender', 'Age', 'School', 'Grade', 'AAU#'];

  const tableRows = data.map((item) => [
    item.fullName ?? item.name ?? 'N/A',
    item.gender ?? 'N/A',
    item.age !== undefined ? item.age : 'N/A',
    item.section ?? 'N/A',
    item.class ?? 'N/A',
    item.aauNumber ?? 'N/A',
    getPlayerStatus(item),
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows as (string | number)[][],
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

  doc.save(`players_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Export to Excel function
export const exportPlayersToExcel = <T extends PlayerData>(data: T[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      Name: item.fullName ?? item.name ?? 'N/A',
      Gender: item.gender ?? 'N/A',
      Age: item.age !== undefined ? item.age : 'N/A',
      School: item.section ?? 'N/A',
      Grade: item.class ?? 'N/A',
      AAU: item.aauNumber ?? 'N/A',
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');
  XLSX.writeFile(
    workbook,
    `players_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};

const formatDOBWithoutShift = (dob: string | Date | undefined): string => {
  if (!dob) return 'N/A';

  try {
    if (typeof dob === 'string' && dob.includes('T')) {
      const date = new Date(dob);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${month}/${day}/${year}`;
    }
    return formatDate(dob);
  } catch (error) {
    console.error('Error formatting DOB:', error);
    return 'N/A';
  }
};

export const getPlayerTableColumns = ({
  handlePlayerClick,
  location,
}: PlayerTableColumnsProps): TableProps<any>['columns'] => {
  const getAvatarUrl = (
    avatar: string | undefined,
    gender: string | undefined
  ): string => {
    if (!avatar) {
      return gender === 'Female'
        ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
        : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';
    }

    // Return URL with cache busting if it's a Cloudinary URL
    if (avatar.includes('res.cloudinary.com')) {
      return `${avatar}${avatar.includes('?') ? '&' : '?'}${Date.now()}`;
    }

    // Handle local paths
    if (avatar.startsWith('/uploads/')) {
      return `https://bothell-select.onrender.com${avatar}`;
    }

    return avatar;
  };

  return [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text: string, record: PlayerData) => {
        const avatarUrl = getAvatarUrl(record.avatar, record.gender);
        return (
          <div className='d-flex align-items-center'>
            <div
              onClick={() => handlePlayerClick(record)}
              className='avatar avatar-md cursor-pointer'
            >
              <img
                src={avatarUrl}
                className='img-fluid rounded-circle'
                alt={`${record.fullName || 'Player'} avatar`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getAvatarUrl(undefined, record.gender);
                }}
              />
            </div>
            <div className='ms-2'>
              <p className='cursor-pointer text-primary mb-0'>
                <span
                  onClick={() => handlePlayerClick({ ...record })}
                  className='cursor-pointer'
                >
                  {text}
                </span>
              </p>
            </div>
          </div>
        );
      },
      sorter: (a: PlayerData, b: PlayerData) =>
        (a.fullName || '').localeCompare(b.fullName || ''),
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      sorter: (a: PlayerData, b: PlayerData) =>
        (a.gender || '').localeCompare(b.gender || ''),
    },
    {
      title: 'DOB',
      dataIndex: 'dob',
      render: formatDOBWithoutShift,
      sorter: (a: PlayerData, b: PlayerData) => {
        const dateA = new Date(formatDateForStorage(a.dob));
        const dateB = new Date(formatDateForStorage(b.dob));
        return dateA.getTime() - dateB.getTime();
      },
    },
    {
      title: 'Age',
      dataIndex: 'age',
      sorter: (a: PlayerData, b: PlayerData) => (a.age || 0) - (b.age || 0),
    },
    {
      title: 'School Name',
      dataIndex: 'section',
      sorter: (a: PlayerData, b: PlayerData) =>
        (a.section || '').localeCompare(b.section || ''),
    },
    {
      title: 'Grade',
      dataIndex: 'class',
      sorter: (a: PlayerData, b: PlayerData) =>
        (a.class || '').localeCompare(b.class || ''),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: PlayerData) => {
        const status = getPlayerStatus(record);
        return (
          <span
            className={`badge badge-soft-${
              status === 'Active' ? 'success' : 'danger'
            } d-inline-flex align-items-center`}
          >
            <i
              className={`ti ti-circle-filled fs-5 me-1 ${
                status === 'Active' ? 'text-success' : 'text-danger'
              }`}
            ></i>
            {status}
          </span>
        );
      },
      sorter: (a: PlayerData, b: PlayerData) => {
        const statusA = getPlayerStatus(a);
        const statusB = getPlayerStatus(b);
        return statusA.localeCompare(statusB);
      },
    },
    {
      title: 'AAU Number',
      dataIndex: 'aauNumber',
      sorter: (a: PlayerData, b: PlayerData) =>
        (a.aauNumber || '').localeCompare(b.aauNumber || ''),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      render: (_: unknown, record: PlayerData) => (
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
                  onClick={() => handlePlayerClick({ ...record })}
                >
                  <i className='ti ti-menu me-2' />
                  View
                </div>
              </li>
              <li>
                <Link
                  to={`${all_routes.editPlayer}/${record.id}`}
                  state={{
                    player: {
                      ...record,
                      playerId: record.id,
                      _id: record.id,
                    },
                    from: location.pathname,
                  }}
                  className='dropdown-item rounded-1'
                >
                  <i className='ti ti-edit me-2' />
                  Edit
                </Link>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];
};
