// components/Tables/PlayerTableColumns.tsx
import React from 'react';
import { TableProps, Skeleton } from 'antd';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { formatDate, formatDateForStorage } from '../../../utils/dateFormatter';
import { getAvatarUrl, getDefaultAvatar } from '../../../utils/r2Utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PlayerTableData } from '../../../types/playerTypes';
import Swal from 'sweetalert2';

interface PlayerTableColumnsProps {
  handlePlayerClick: (record: PlayerTableData) => void;
  location: any;
  seasonFilter?: {
    currentSeason: string;
    currentYear: number;
  };
  loading?: boolean;
  currentUserRole?: string;
  isCoach?: boolean;
  activeTab?: string;
  visibleFields?: string[];
}

// Skeleton loader for table rows
export const PlayerTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 10,
}) => {
  return (
    <div className='player-table-skeleton'>
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
                style={{ width: 40, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 100, height: 16 }}
              />
              <Skeleton.Input
                active
                size='small'
                style={{ width: 60, height: 16 }}
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const getPlayerStatus = (
  player: PlayerTableData,
): 'Active' | 'Inactive' | 'Pending Payment' => {
  if (player.status) {
    if (typeof player.status === 'string') {
      if (player.status.toLowerCase() === 'active') return 'Active';
      if (player.status.toLowerCase() === 'pending') return 'Pending Payment';
      return 'Inactive';
    }
    return player.status ? 'Active' : 'Inactive';
  }
  const registrationComplete =
    player.registrationComplete ?? player.paymentInfo?.status !== 'failed';
  const paymentComplete =
    player.paymentComplete ?? player.paymentInfo?.status === 'paid';
  if (registrationComplete && paymentComplete) return 'Active';
  if (registrationComplete && !paymentComplete) return 'Pending Payment';
  return 'Inactive';
};

const getFilteredSeasonInfo = (
  player: PlayerTableData,
  filter?: { currentSeason: string; currentYear: number },
) => {
  if (!filter || !filter.currentSeason || !filter.currentYear) {
    return player.season
      ? `${player.season} ${player.registrationYear}`
      : 'N/A';
  }
  const matchingSeason = player.seasons?.find(
    (s) => s.season === filter.currentSeason && s.year === filter.currentYear,
  );
  return matchingSeason
    ? `${matchingSeason.season} ${matchingSeason.year}`
    : 'N/A';
};

const getFilteredPaymentStatus = (
  player: PlayerTableData,
  filter?: { currentSeason: string; currentYear: number },
) => {
  if (!filter || !filter.currentSeason || !filter.currentYear) {
    return player.paymentStatus || 'N/A';
  }
  const matchingSeason = player.seasons?.find(
    (s) => s.season === filter.currentSeason && s.year === filter.currentYear,
  );
  return matchingSeason?.paymentStatus || player.paymentStatus || 'N/A';
};

const getCompactSeasonsDisplay = (player: PlayerTableData): string => {
  if (!player.seasons || player.seasons.length === 0) {
    return player.season
      ? `${player.season} ${player.registrationYear || ''}`.trim()
      : 'No Seasons';
  }
  const seasonsByYear: { [year: number]: string[] } = {};
  player.seasons.forEach((season) => {
    const year = season.year;
    if (!seasonsByYear[year]) seasonsByYear[year] = [];
    const seasonName = season.season;
    if (!seasonsByYear[year].includes(seasonName))
      seasonsByYear[year].push(seasonName);
  });
  const sortedYears = Object.keys(seasonsByYear)
    .map(Number)
    .sort((a, b) => b - a);
  const displayParts: string[] = [];
  sortedYears.forEach((year) => {
    const seasons = seasonsByYear[year];
    if (seasons.length === 1) displayParts.push(`${seasons[0]} ${year}`);
    else if (seasons.length <= 3)
      displayParts.push(`${seasons.join('/')} ${year}`);
    else
      displayParts.push(
        `${seasons.slice(0, 2).join('/')}+${seasons.length - 2} ${year}`,
      );
  });
  return displayParts.join(', ') || 'No Seasons';
};

const getSeasonsPaymentStatus = (player: PlayerTableData): React.ReactNode => {
  if (!player.seasons || player.seasons.length === 0) {
    const status = getPlayerStatus(player);
    return (
      <span
        className={`badge badge-soft-${status === 'Active' ? 'success' : status === 'Pending Payment' ? 'warning' : 'danger'} d-inline-flex align-items-center`}
      >
        <i
          className={`ti ti-circle-filled fs-5 me-1 ${status === 'Active' ? 'text-success' : status === 'Pending Payment' ? 'text-warning' : 'text-danger'}`}
        ></i>
        {status}
      </span>
    );
  }
  const paidSeasons = player.seasons.filter(
    (s) => s.paymentStatus === 'paid' || s.paymentComplete,
  ).length;
  const totalSeasons = player.seasons.length;
  if (paidSeasons === totalSeasons) {
    return (
      <span className='badge badge-soft-success d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-success'></i>All Paid
      </span>
    );
  } else if (paidSeasons > 0) {
    return (
      <span className='badge badge-soft-warning d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-warning'></i>
        {paidSeasons}/{totalSeasons} Paid
      </span>
    );
  } else {
    return (
      <span className='badge badge-soft-warning d-inline-flex align-items-center'>
        <i className='ti ti-circle-filled fs-5 me-1 text-warning'></i>No
        Payments
      </span>
    );
  }
};

const getSeasonsTooltip = (player: PlayerTableData): string => {
  if (!player.seasons || player.seasons.length === 0) {
    return player.season
      ? `${player.season} ${player.registrationYear || ''}`.trim()
      : 'No season data';
  }
  const seasonsByYear: { [year: number]: typeof player.seasons } = {};
  player.seasons.forEach((season) => {
    const year = season.year;
    if (!seasonsByYear[year]) seasonsByYear[year] = [];
    seasonsByYear[year].push(season);
  });
  const sortedYears = Object.keys(seasonsByYear)
    .map(Number)
    .sort((a, b) => b - a);
  return sortedYears
    .map((year) => {
      const yearSeasons = seasonsByYear[year];
      const seasonDetails = yearSeasons
        .map((season) => {
          const paymentStatus =
            season.paymentStatus ||
            (season.paymentComplete ? 'paid' : 'pending');
          const amount = season.amountPaid ? `$${season.amountPaid}` : '';
          const date = season.registrationDate
            ? ` (${formatDate(season.registrationDate)})`
            : '';
          return `  ${season.season}: ${paymentStatus}${amount}${date}`;
        })
        .join('\n');
      return `--- ${year} ---\n${seasonDetails}`;
    })
    .join('\n\n');
};

const getPlayerVisibility = (visibleFields: string[] = []) => {
  return {
    showName: true,
    showGender: visibleFields.includes('gender'),
    showDOB: visibleFields.includes('dob'),
    showAge: visibleFields.includes('dob'), // Age is derived from DOB
    showSchool: visibleFields.includes('schoolName'),
    showGrade: visibleFields.includes('grade'),
    showSeasons: true,
    showStatus: true,
    showAAU: visibleFields.includes('aauNumber'),
  };
};

// exportPlayersToPDF
export const exportPlayersToPDF = <T extends PlayerTableData>(
  data: T[],
  visibleFields?: string[],
) => {
  const doc = new jsPDF();
  doc.text('Players List', 14, 15);

  // Check visibility for each field
  const showGender = !visibleFields || visibleFields.includes('gender');
  const showDOB = !visibleFields || visibleFields.includes('dob');
  const showSchool = !visibleFields || visibleFields.includes('schoolName');
  const showGrade = !visibleFields || visibleFields.includes('grade');
  const showAAU = !visibleFields || visibleFields.includes('aauNumber');

  // Build dynamic columns - always show Name, Seasons, Status
  const tableColumn: string[] = ['Name'];
  const tableRows = data.map((item) => {
    const row: any[] = [item.name ?? 'N/A'];

    if (showGender) row.push(item.gender ?? 'N/A');
    if (showDOB) row.push(item.dob ? formatDOBWithoutShift(item.dob) : 'N/A');
    // Age is derived from DOB - only show if DOB is shown
    if (showDOB) row.push(item.age ?? 'N/A');
    if (showSchool) row.push(item.section ?? 'N/A');
    if (showGrade) row.push(item.class ?? 'N/A');
    if (showAAU) row.push(item.aauNumber ?? 'N/A');

    // Always show these core fields
    row.push(getCompactSeasonsDisplay(item));
    row.push(getPlayerStatus(item));

    return row;
  });

  // Add headers based on visibility
  if (showGender) tableColumn.push('Gender');
  if (showDOB) {
    tableColumn.push('DOB');
    tableColumn.push('Age');
  }
  if (showSchool) tableColumn.push('School');
  if (showGrade) tableColumn.push('Grade');
  if (showAAU) tableColumn.push('AAU Number');
  tableColumn.push('Seasons', 'Status');

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
  });

  doc.save(`players_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// exportPlayersToExcel
export const exportPlayersToExcel = <T extends PlayerTableData>(
  data: T[],
  visibleFields?: string[],
) => {
  const showGender = !visibleFields || visibleFields.includes('gender');
  const showDOB = !visibleFields || visibleFields.includes('dob');
  const showSchool = !visibleFields || visibleFields.includes('schoolName');
  const showGrade = !visibleFields || visibleFields.includes('grade');
  const showAAU = !visibleFields || visibleFields.includes('aauNumber');

  const excelData = data.map((item) => {
    const obj: any = {
      Name: item.name ?? 'N/A',
    };

    if (showGender) obj.Gender = item.gender ?? 'N/A';
    if (showDOB) {
      obj.DOB = item.dob ? formatDOBWithoutShift(item.dob) : 'N/A';
      obj.Age = item.age ?? 'N/A';
    }
    if (showSchool) obj.School = item.section ?? 'N/A';
    if (showGrade) obj.Grade = item.class ?? 'N/A';
    if (showAAU) obj['AAU Number'] = item.aauNumber ?? 'N/A';

    // Always show these core fields
    obj.Seasons = getCompactSeasonsDisplay(item);
    obj.Status = getPlayerStatus(item);

    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
  XLSX.writeFile(
    workbook,
    `players_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const exportPlayerParentEmails = <T extends PlayerTableData>(
  data: T[],
) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .flatMap((player) =>
          player.parents?.map((parent) => parent.email?.trim()),
        )
        .filter((email): email is string => !!email && email.includes('@')),
    ),
  );

  if (uniqueEmails.length === 0) {
    const hasParents = data.some(
      (player) => player.parents && player.parents.length > 0,
    );
    Swal.fire({
      icon: 'warning',
      title: 'No Emails Found',
      text: hasParents
        ? 'No valid parent email addresses found. Ensure parents have valid emails.'
        : 'No parents associated with the selected players.',
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
    `player_parent_emails_${new Date().toISOString().slice(0, 10)}.csv`,
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

export const copyPlayerParentEmailsToClipboard = <T extends PlayerTableData>(
  data: T[],
  onSuccess?: (message: string) => void,
  onError?: (message: string) => void,
) => {
  const uniqueEmails = Array.from(
    new Set(
      data
        .flatMap((player) =>
          player.parents?.map((parent) => parent.email?.trim()),
        )
        .filter((email): email is string => !!email && email.includes('@')),
    ),
  );

  if (uniqueEmails.length === 0) {
    const hasParents = data.some(
      (player) => player.parents && player.parents.length > 0,
    );
    const msg = hasParents
      ? 'No valid parent email addresses found. Ensure parents have valid emails.'
      : 'No parents associated with the selected players.';
    Swal.fire({
      icon: 'warning',
      title: 'No Emails Found',
      text: msg,
      confirmButtonColor: '#594230',
      confirmButtonText: 'OK',
    });
    onError?.(msg);
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
              <strong>${uniqueEmails.length}</strong> parent email${uniqueEmails.length > 1 ? 's' : ''} copied to clipboard.
            </p>
            <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:10px 14px;max-height:140px;overflow-y:auto;font-size:13px;color:#495057;font-family:monospace;line-height:1.7;">
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
      console.error('Failed to copy parent emails:', err);
      Swal.fire({
        icon: 'error',
        title: 'Copy Failed',
        text: 'Could not copy emails to clipboard. Please try again.',
        confirmButtonColor: '#594230',
        confirmButtonText: 'OK',
      });
      onError?.('Failed to copy parent emails to clipboard');
    });

  return true;
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
  seasonFilter,
  loading = false,
  currentUserRole,
  isCoach = false,
  activeTab = 'my-players',
  visibleFields,
}: PlayerTableColumnsProps): TableProps<PlayerTableData>['columns'] => {
  // undefined = config not yet wired up, show everything
  // [] = config loaded, all optional fields disabled
  const isFieldVisible = (name: string): boolean => {
    if (visibleFields === undefined) return true;
    return visibleFields.includes(name);
  };

  const resolveAvatar = (
    avatar: string | undefined,
    gender: string | undefined,
  ): string => {
    return getAvatarUrl(
      avatar,
      getDefaultAvatar('player', gender as 'Male' | 'Female' | undefined),
    );
  };

  if (loading) {
    return [
      {
        title: 'Name',
        dataIndex: 'name',
        width: 200,
        render: () => (
          <div className='d-flex align-items-center'>
            <Skeleton.Avatar active size='large' shape='circle' />
            <div className='ms-2'>
              <Skeleton.Input
                active
                size='small'
                style={{ width: 120, height: 16 }}
              />
            </div>
          </div>
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
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'DOB',
        dataIndex: 'dob',
        width: 110,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Age',
        dataIndex: 'age',
        width: 80,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 40, height: 16 }}
          />
        ),
      },
      {
        title: 'School Name',
        dataIndex: 'section',
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
        title: 'Grade',
        dataIndex: 'class',
        width: 100,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 60, height: 16 }}
          />
        ),
      },
      {
        title: 'Seasons',
        key: 'seasons',
        width: 180,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 120, height: 16 }}
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
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'AAU Number',
        dataIndex: 'aauNumber',
        width: 120,
        render: () => (
          <Skeleton.Input
            active
            size='small'
            style={{ width: 80, height: 16 }}
          />
        ),
      },
      {
        title: 'Action',
        dataIndex: 'action',
        width: 100,
        render: () => (
          <Skeleton.Button
            active
            size='small'
            style={{ width: 40, height: 32 }}
          />
        ),
      },
    ];
  }

  // ── Name column — always shown ─────────────────────────────────────────────
  const nameCol = {
    title: 'Name',
    dataIndex: 'name',
    width: 200,
    render: (text: string, record: PlayerTableData) => {
      const avatarUrl = resolveAvatar(record.avatar, record.gender);
      return (
        <div className='d-flex align-items-center'>
          <div
            onClick={() => handlePlayerClick(record)}
            className='avatar avatar-md cursor-pointer flex-shrink-0'
          >
            <img
              src={avatarUrl}
              className='img-fluid rounded-circle'
              alt={`${record.name || 'Player'} avatar`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = resolveAvatar(
                  undefined,
                  record.gender,
                );
              }}
            />
          </div>
          <div className='ms-2 flex-grow-1 min-width-0'>
            <p
              className='cursor-pointer text-primary mb-0 text-truncate'
              style={{ maxWidth: '150px' }}
              title={text}
            >
              <span
                onClick={() => handlePlayerClick(record)}
                className='cursor-pointer'
              >
                {text}
              </span>
            </p>
          </div>
        </div>
      );
    },
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      (a.name || '').localeCompare(b.name || ''),
  };

  const genderCol = {
    title: 'Gender',
    dataIndex: 'gender',
    width: 100,
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      (a.gender || '').localeCompare(b.gender || ''),
  };

  const dobCol = {
    title: 'DOB',
    dataIndex: 'dob',
    width: 110,
    render: formatDOBWithoutShift,
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      new Date(formatDateForStorage(a.dob)).getTime() -
      new Date(formatDateForStorage(b.dob)).getTime(),
  };

  const ageCol = {
    title: 'Age',
    dataIndex: 'age',
    width: 80,
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      (a.age || 0) - (b.age || 0),
  };

  const schoolCol = {
    title: 'School Name',
    dataIndex: 'section',
    width: 150,
    render: (text: string) => (
      <span
        className='text-truncate d-inline-block'
        style={{ maxWidth: '140px' }}
        title={text}
      >
        {text}
      </span>
    ),
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      (a.section || '').localeCompare(b.section || ''),
  };

  const gradeCol = {
    title: 'Grade',
    dataIndex: 'class',
    width: 100,
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      (a.class || '').localeCompare(b.class || ''),
  };

  // Seasons — always shown (core registration data)
  const seasonsCol = {
    title: 'Seasons',
    key: 'seasons',
    width: 180,
    render: (_: unknown, record: PlayerTableData) => (
      <div
        className='seasons-display'
        title={getSeasonsTooltip(record)}
        style={{ cursor: 'help' }}
      >
        <span
          className='text-dark fw-medium text-truncate d-inline-block'
          style={{ maxWidth: '170px' }}
        >
          {getCompactSeasonsDisplay(record)}
        </span>
      </div>
    ),
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      getCompactSeasonsDisplay(a).localeCompare(getCompactSeasonsDisplay(b)),
  };

  // Status — always shown
  const statusCol = {
    title: 'Status',
    key: 'status',
    width: 130,
    render: (_: unknown, record: PlayerTableData) =>
      getSeasonsPaymentStatus(record),
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      getPlayerStatus(a).localeCompare(getPlayerStatus(b)),
  };

  const aauCol = {
    title: 'AAU Number',
    dataIndex: 'aauNumber',
    width: 120,
    sorter: (a: PlayerTableData, b: PlayerTableData) =>
      (a.aauNumber || '').localeCompare(b.aauNumber || ''),
  };

  const actionCol = {
    title: 'Action',
    dataIndex: 'action',
    width: 100,
    render: (
      _: unknown,
      record: PlayerTableData & { isOwnPlayer?: boolean },
    ) => {
      const showEdit =
        currentUserRole === 'admin' ||
        activeTab === 'my-players' ||
        (isCoach && record.isOwnPlayer);

      return (
        <div className='d-flex align-items-center gap-2'>
          <button
            onClick={() => handlePlayerClick(record)}
            className='btn btn-sm btn-icon btn-outline-secondary'
            title='View Details'
            style={{ width: '32px', height: '32px' }}
          >
            <i className='ti ti-eye fs-16' />
          </button>
          {showEdit && (
            <Link
              to={`${all_routes.editPlayer}/${record.id}`}
              state={{
                player: {
                  ...record,
                  playerId: record.id,
                  _id: record.id,
                  fullName: record.name,
                  seasons: record.seasons || [],
                },
                from: location.pathname,
              }}
              className='btn btn-sm btn-icon btn-outline-warning'
              title='Edit'
              style={{ width: '32px', height: '32px' }}
            >
              <i className='ti ti-edit fs-16' />
            </Link>
          )}
        </div>
      );
    },
  };

  return [
    nameCol,
    ...(isFieldVisible('gender') ? [genderCol] : []),
    ...(isFieldVisible('dob') ? [dobCol] : []),
    // age is derived from dob — gate on same field
    ...(isFieldVisible('dob') ? [ageCol] : []),
    ...(isFieldVisible('schoolName') ? [schoolCol] : []),
    ...(isFieldVisible('grade') ? [gradeCol] : []),
    seasonsCol,
    statusCol,
    ...(isFieldVisible('aauNumber') ? [aauCol] : []),
    actionCol,
  ];
};
