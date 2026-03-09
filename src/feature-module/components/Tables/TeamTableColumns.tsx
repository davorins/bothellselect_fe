// components/Tables/TeamTableColumns.tsx
import React from 'react';
import { TableProps, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { InternalTeamTableData } from '../../../types/teamTypes';

const teamRoutes = {
  teamDetail: '/teams/detail',
  editTeam: '/teams/edit',
};

interface TeamTableColumnsProps {
  handleDeleteTeam: (teamId: string, teamName: string) => void;
  handleToggleTeamStatus: (teamId: string, currentStatus: string) => void;
  location: any;
  loading?: boolean;
  currentUserRole?: string;
}

export const TeamTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 10,
}) => {
  return (
    <div className='team-table-skeleton'>
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
                style={{ width: 150, height: 16 }}
                className='mb-1'
              />
            </div>
            <div className='d-flex gap-4 flex-wrap'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
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
                style={{ width: 60, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 100, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 80, height: 16 }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const getTeamStatus = (
  team: InternalTeamTableData,
): 'Active' | 'Inactive' | 'Pending Payment' => {
  if (team.status === 'active') return 'Active';
  if (team.status === 'pending') return 'Pending Payment';
  return 'Inactive';
};

export const exportTeamsToPDF = <T extends InternalTeamTableData>(
  data: T[],
) => {
  const doc = new jsPDF();
  doc.text('Teams List', 14, 15);
  const tableColumn = [
    'Team Name',
    'Year',
    'Grade',
    'Gender',
    'Players',
    'Coaches',
    'Tryout Season',
    'Status',
  ];
  const tableRows = data.map((item) => [
    item.name ?? 'N/A',
    item.year?.toString() ?? 'N/A',
    item.grade ? `Grade ${item.grade}` : 'N/A',
    item.gender ?? 'N/A',
    item.playerCount?.toString() ?? '0',
    item.coachCount?.toString() ?? '0',
    item.tryoutSeason ?? '-',
    getTeamStatus(item),
  ]);
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows as (string | number)[][],
    startY: 25,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, { cellWidth: 'auto' }]),
    ),
  });
  doc.save(`teams_${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportTeamsToExcel = <T extends InternalTeamTableData>(
  data: T[],
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map((item) => ({
      'Team Name': item.name ?? 'N/A',
      Year: item.year ?? 'N/A',
      Grade: item.grade ? `Grade ${item.grade}` : 'N/A',
      Gender: item.gender ?? 'N/A',
      Players: item.playerCount ?? 0,
      Coaches: item.coachCount ?? 0,
      'Tryout Season': item.tryoutSeason ?? '-',
      Status: getTeamStatus(item),
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Teams');
  XLSX.writeFile(
    workbook,
    `teams_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const getTeamTableColumns = ({
  handleDeleteTeam,
  handleToggleTeamStatus,
  location,
  loading = false,
  currentUserRole,
}: TeamTableColumnsProps): TableProps<InternalTeamTableData>['columns'] => {
  const resolveAvatar = (gender: string | undefined): string => {
    return gender === 'Female'
      ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
      : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
  };

  if (loading) {
    return [
      {
        title: 'Team Name',
        dataIndex: 'name',
        width: 220,
        render: () => (
          <div className='d-flex align-items-center'>
            <Skeleton.Avatar active size='large' shape='circle' />
            <div className='ms-2'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 150, height: 16 }}
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Year',
        dataIndex: 'year',
        width: 80,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'Grade',
        dataIndex: 'grade',
        width: 100,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Gender',
        dataIndex: 'gender',
        width: 100,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Players',
        dataIndex: 'playerCount',
        width: 80,
        align: 'center' as const,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'Coaches',
        dataIndex: 'coachCount',
        width: 80,
        align: 'center' as const,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'Tryout Season',
        dataIndex: 'tryoutSeason',
        width: 150,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 100, height: 16 }}
          />
        ),
      },
      {
        title: 'Status',
        key: 'status',
        width: 130,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 100, height: 16 }}
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 120,
        render: () => (
          <Skeleton.Button
            active
            size='small'
            style={{ width: 60, height: 32 }}
          />
        ),
      },
    ];
  }

  const nameCol = {
    title: 'Team Name',
    dataIndex: 'name',
    width: 220,
    render: (text: string, record: InternalTeamTableData) => {
      const avatarUrl = resolveAvatar(record.gender);
      return (
        <div className='d-flex align-items-center'>
          <div className='avatar avatar-sm flex-shrink-0 me-2'>
            <img
              src={avatarUrl}
              className='img-fluid rounded-circle'
              alt={`${text} avatar`}
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'cover',
                border: '1px solid #e8e8e8',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = resolveAvatar(undefined);
              }}
            />
          </div>
          <div className='flex-grow-1 min-width-0'>
            <p
              className='cursor-pointer text-primary mb-0 text-truncate'
              style={{ maxWidth: '170px' }}
              title={text}
            >
              <Link
                to={`${teamRoutes.teamDetail}/${record.id}`}
                className='text-primary fw-medium'
              >
                {text}
              </Link>
            </p>
          </div>
        </div>
      );
    },
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.name || '').localeCompare(b.name || ''),
  };

  const yearCol = {
    title: 'Year',
    dataIndex: 'year',
    width: 80,
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.year || 0) - (b.year || 0),
  };

  const gradeCol = {
    title: 'Grade',
    dataIndex: 'grade',
    width: 100,
    render: (grade: string) => {
      if (!grade) return '-';
      const gradeNum = parseInt(grade);
      if (isNaN(gradeNum)) return grade;
      let suffix = 'th';
      if (gradeNum === 1) suffix = 'st';
      else if (gradeNum === 2) suffix = 'nd';
      else if (gradeNum === 3) suffix = 'rd';
      return `${gradeNum}${suffix} Grade`;
    },
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      parseInt(a.grade || '0') - parseInt(b.grade || '0'),
  };

  const genderCol = {
    title: 'Gender',
    dataIndex: 'gender',
    width: 100,
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.gender || '').localeCompare(b.gender || ''),
  };

  const playersCol = {
    title: 'Players',
    dataIndex: 'playerCount',
    width: 80,
    align: 'center' as const,
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.playerCount || 0) - (b.playerCount || 0),
  };

  const coachesCol = {
    title: 'Coaches',
    dataIndex: 'coachCount',
    width: 80,
    align: 'center' as const,
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.coachCount || 0) - (b.coachCount || 0),
  };

  const tryoutSeasonCol = {
    title: 'Tryout Season',
    dataIndex: 'tryoutSeason',
    width: 150,
    render: (tryoutSeason: string) => (
      <span className='text-muted'>{tryoutSeason || '-'}</span>
    ),
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      (a.tryoutSeason || '').localeCompare(b.tryoutSeason || ''),
  };

  // Status column — admin gets inline toggle, others get badge
  const statusCol = {
    title: 'Status',
    key: 'status',
    width: 150,
    render: (_: unknown, record: InternalTeamTableData) => {
      const isActive = record.status === 'active';
      if (currentUserRole === 'admin') {
        return (
          <div className='d-flex align-items-center gap-2'>
            <div
              className='form-check form-switch mb-0'
              style={{ paddingLeft: '2.5em' }}
            >
              <input
                className='form-check-input'
                type='checkbox'
                role='switch'
                checked={isActive}
                onChange={() =>
                  handleToggleTeamStatus(record.id, record.status || 'active')
                }
                style={{ cursor: 'pointer', width: '2.2em', height: '1.2em' }}
              />
            </div>
            <span
              className={`fw-semibold small ${isActive ? 'text-success' : 'text-danger'}`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      }
      const badgeColor = isActive ? 'success' : 'danger';
      return (
        <span
          className={`badge badge-soft-${badgeColor} d-inline-flex align-items-center`}
        >
          <i className={`ti ti-circle-filled fs-5 me-1 text-${badgeColor}`}></i>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      );
    },
    sorter: (a: InternalTeamTableData, b: InternalTeamTableData) =>
      getTeamStatus(a).localeCompare(getTeamStatus(b)),
  };

  const actionCol = {
    title: 'Actions',
    key: 'actions',
    width: 120,
    align: 'center' as const,
    render: (_: unknown, record: InternalTeamTableData) => {
      const canEdit =
        currentUserRole === 'admin' || currentUserRole === 'coach';
      return (
        <div className='d-flex align-items-center justify-content-center gap-2'>
          <Link
            to={`${teamRoutes.teamDetail}/${record.id}`}
            state={{ from: location.pathname }}
          >
            <button
              className='btn btn-sm btn-icon btn-outline-secondary'
              title='View Details'
              style={{ width: '32px', height: '32px' }}
            >
              <i className='ti ti-eye fs-16' />
            </button>
          </Link>
          {canEdit && (
            <>
              <Link
                to={`${teamRoutes.editTeam}/${record.id}`}
                state={{
                  team: { ...record, _id: record.id },
                  from: location.pathname,
                }}
              >
                <button
                  className='btn btn-sm btn-icon btn-outline-warning'
                  title='Edit'
                  style={{ width: '32px', height: '32px' }}
                >
                  <i className='ti ti-edit fs-16' />
                </button>
              </Link>
              <button
                onClick={() => handleDeleteTeam(record.id, record.name)}
                className='btn btn-sm btn-icon btn-outline-danger'
                title='Delete'
                style={{ width: '32px', height: '32px' }}
              >
                <i className='ti ti-trash fs-16' />
              </button>
            </>
          )}
        </div>
      );
    },
  };

  return [
    nameCol,
    yearCol,
    gradeCol,
    genderCol,
    playersCol,
    coachesCol,
    tryoutSeasonCol,
    statusCol,
    actionCol,
  ];
};
