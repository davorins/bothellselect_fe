import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import { useAuth } from '../../../../context/AuthContext';
import { formatDate } from '../../../../utils/dateFormatter';
import { isPlayerActive } from '../../../../utils/season';
import { formatPhoneNumber } from '../../../../utils/phone';

export interface GuardianData {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  address: string;
  relationship: string;
  avatar?: string;
  isPrimary?: boolean;
}

interface PlayerData {
  id: string;
  _id?: string;
  key?: string;
  name?: string;
  fullName?: string;
  gender?: string;
  dob?: string | Date;
  age?: number;
  section?: string;
  class?: string;
  grade?: string | number;
  status?: string;
  DateofJoin?: string | Date;
  createdAt?: string | Date;
  avatar?: string;
  aauNumber?: string;
  siblings?: PlayerData[];
  guardians?: GuardianData[];
  parentId?: string;
  phone?: string;
  email?: string;
  schoolName?: string;
  season?: string;
  registrationYear?: number;
  playerStatus?: string;
}

interface PlayerSidebarProps {
  player: PlayerData;
  guardians: GuardianData[];
  token: string | null;
  primaryParent: GuardianData | null;
  siblings: PlayerData[];
}

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({
  player,
  guardians,
  token,
  primaryParent,
  siblings,
}) => {
  const { user } = useAuth();

  if (!player) {
    return <div>No player data found.</div>;
  }

  // Format date of birth without timezone issues
  const formatPlayerDob = (): string => {
    if (!player.dob) return 'N/A';

    try {
      // If it's an ISO string (from MongoDB), extract just YYYY-MM-DD
      if (typeof player.dob === 'string') {
        const [datePart] = player.dob.split('T');
        return formatDate(datePart); // Will format as MM/DD/YYYY
      }

      // If it's a Date object (shouldn't happen with MongoDB data)
      if (player.dob instanceof Date) {
        return formatDate(player.dob);
      }

      return 'N/A';
    } catch (error) {
      console.error('Error formatting date of birth:', error);
      return 'N/A';
    }
  };

  // Helper functions
  const getDisplayName = () => player.fullName || player.name || 'N/A';
  const getJoinDate = () => {
    if (player.DateofJoin) return player.DateofJoin;
    if (player.createdAt) return player.createdAt;
    return undefined;
  };

  const formatGrade = (grade?: string | number) => {
    if (!grade) return 'N/A';

    const gradeNum =
      typeof grade === 'string' ? parseInt(grade.replace(/\D/g, '')) : grade;

    if (isNaN(gradeNum)) return grade.toString();

    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = gradeNum % 100;
    return `${gradeNum}${
      suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]
    } Grade`;
  };

  const getPlayerStatus = (playerData: PlayerData): 'Active' | 'Inactive' => {
    const { fullName, season, registrationYear, status } = playerData;

    console.log('Calculating status for player:', {
      name: fullName,
      season,
      year: registrationYear,
      existingStatus: status,
    });

    // If status is set, check if the player is actually active
    if (status?.trim() && season && registrationYear !== undefined) {
      const active = isPlayerActive({ season, registrationYear });
      console.log('Status provided, recalculated activity:', active);
      return active ? 'Active' : 'Inactive';
    }

    // If no explicit status but enough data to determine activity
    if (season && registrationYear !== undefined) {
      const active = isPlayerActive({ season, registrationYear });
      console.log('Calculated active status (no explicit status):', active);
      return active ? 'Active' : 'Inactive';
    }

    // Fallback
    console.log(
      'Insufficient data to determine status. Defaulting to Inactive.'
    );
    return 'Inactive';
  };

  const shouldShowSiblings = siblings?.length > 0 && user?.role !== 'admin';

  // Get the final status
  const playerStatus = getPlayerStatus(player);
  console.log('Player status determination:', {
    name: getDisplayName(),
    explicitStatus: player.status,
    playerStatus: player.playerStatus,
    season: player.season,
    registrationYear: player.registrationYear,
    finalStatus: playerStatus,
  });

  return (
    <div className='col-xxl-3 col-xl-4 theiaStickySidebar'>
      <div className='stickybar pb-4'>
        <div className='card border-white'>
          <div className='card-header'>
            <div className='d-flex align-items-center flex-wrap row-gap-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                <img
                  src={
                    player.avatar && player.avatar.trim() !== ''
                      ? player.avatar.includes('res.cloudinary.com')
                        ? `${player.avatar}?${Date.now()}` // Add timestamp to prevent caching
                        : player.avatar.startsWith('/')
                        ? `https://bothell-select.onrender.com${player.avatar}`
                        : player.avatar
                      : player.gender === 'Female'
                      ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
                      : 'https://bothell-select.onrender.com/uploads/avatars/boy.png'
                  }
                  className='img-fluid rounded-circle'
                  alt={`${player.fullName || player.name || 'Player'} avatar`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      player.gender === 'Female'
                        ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
                        : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';
                  }}
                />
              </div>
              <div className='overflow-hidden'>
                <span
                  className={`badge badge-soft-${
                    getPlayerStatus(player) === 'Active' ? 'success' : 'danger'
                  } d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 ${
                      getPlayerStatus(player) === 'Active'
                        ? 'text-success'
                        : 'text-danger'
                    }`}
                  />
                  {getPlayerStatus(player)}
                </span>
                <h5 className='mb-1 text-truncate'>{getDisplayName()}</h5>
                <p className='mb-1'>
                  Member since:{' '}
                  {getJoinDate() ? formatDate(getJoinDate()) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className='card-body'>
            <h5 className='mb-3'>Basic Information</h5>
            <dl className='row mb-0'>
              <dt className='col-6 fw-medium text-dark mb-3'>Date Of Birth</dt>
              <dd className='col-6 mb-3'>{formatPlayerDob()}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Gender</dt>
              <dd className='col-6 mb-3'>{player.gender || 'N/A'}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>School</dt>
              <dd className='col-6 mb-3'>
                {player.section || player.schoolName || 'N/A'}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Grade</dt>
              <dd className='col-6 mb-3'>
                {formatGrade(player.grade || player.class)}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>AAU Number</dt>
              <dd className='col-6 mb-3'>{player.aauNumber || 'N/A'}</dd>
              {user?.role === 'admin' && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>
                    Season / Year
                  </dt>
                  <dd className='col-6 mb-3'>
                    {player.season || player.registrationYear ? (
                      <>
                        {player.season ? `${player.season}` : ''} /{' '}
                        {player.registrationYear
                          ? `${player.registrationYear}`
                          : ''}
                      </>
                    ) : (
                      <span className='text-muted'>No data available</span>
                    )}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Primary Contact Information */}
        <div className='card border-white'>
          <div className='card-body'>
            <h5 className='mb-3'>Primary Contact Info</h5>
            <div className='d-flex align-items-center mb-3'>
              <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                <i className='ti ti-phone' />
              </span>
              <div>
                <span className='text-dark fw-medium mb-1'>Phone Number</span>
                <p>{user?.phone ? formatPhoneNumber(user.phone) : 'N/A'}</p>
              </div>
            </div>
            <div className='d-flex align-items-center mb-3'>
              <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                <i className='ti ti-mail' />
              </span>
              <div>
                <span className='text-dark fw-medium mb-1'>Email Address</span>
                <p>{user?.email ?? 'N/A'}</p>
              </div>
            </div>
            <hr className='my-3' />
          </div>
        </div>

        {/* Sibling Information */}
        {shouldShowSiblings && (
          <div className='card border-white'>
            <div className='card-body'>
              <h5 className='mb-3'>Sibling Information</h5>
              <div className='d-flex align-items-center bg-light-300 rounded p-3 mb-3'>
                <div className='ms-2'>
                  <ul>
                    {siblings.map((sibling) => {
                      const siblingId = sibling.id || sibling._id;
                      if (!siblingId) {
                        console.error('Sibling has no ID:', sibling);
                        return null;
                      }

                      return (
                        <li key={siblingId}>
                          <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
                            <div className='d-flex align-items-center justify-content-center avatar avatar-xxl'>
                              <span className='avatar avatar-lg'>
                                <img
                                  src={
                                    sibling.avatar &&
                                    sibling.avatar.trim() !== ''
                                      ? sibling.avatar.includes(
                                          'res.cloudinary.com'
                                        )
                                        ? `${sibling.avatar}?${Date.now()}`
                                        : sibling.avatar.startsWith('/')
                                        ? `https://bothell-select.onrender.com${sibling.avatar}`
                                        : sibling.avatar
                                      : sibling.gender === 'Female'
                                      ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
                                      : 'https://bothell-select.onrender.com/uploads/avatars/boy.png'
                                  }
                                  className='img-fluid rounded-circle'
                                  alt={`${
                                    sibling.fullName ||
                                    sibling.name ||
                                    'Sibling'
                                  } avatar`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      sibling.gender === 'Female'
                                        ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
                                        : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';
                                  }}
                                />
                              </span>
                            </div>
                            <div className='overflow-hidden'>
                              <Link
                                to={`${all_routes.playerDetail}/${siblingId}`}
                                state={{
                                  player: {
                                    ...sibling,
                                    _id: siblingId,
                                    playerId: siblingId,
                                  },
                                  siblings: siblings
                                    .filter(
                                      (s) => (s.id || s._id) !== siblingId
                                    )
                                    .concat([player]),
                                  guardians,
                                }}
                                className='text-dark mb-0'
                              >
                                <h5>
                                  {sibling.fullName ||
                                    sibling.name ||
                                    'Sibling'}
                                </h5>
                              </Link>
                              <p>
                                {formatGrade(sibling.grade || sibling.class)}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSidebar;
