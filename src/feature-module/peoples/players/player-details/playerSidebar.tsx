import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import { useAuth } from '../../../../context/AuthContext';
import { formatDate } from '../../../../utils/dateFormatter';

export interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
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
  imgSrc?: string;
  aauNumber?: string;
  siblings?: PlayerData[];
  guardians?: GuardianData[];
  parentId?: string;
  phone?: string;
  email?: string;
  schoolName?: string;
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

  // Helper functions
  const getDisplayName = () => player.fullName || player.name || 'N/A';
  const getJoinDate = () => player.DateofJoin || player.createdAt;

  const getDefaultAvatar = (gender: string | undefined): string => {
    const baseUrl = 'https://bothell-select.onrender.com/uploads/avatars';
    return gender === 'Female' ? `${baseUrl}/girl.png` : `${baseUrl}/boy.png`;
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

  const shouldShowSiblings = siblings?.length > 0 && user?.role !== 'admin';

  return (
    <div className='col-xxl-3 col-xl-4 theiaStickySidebar'>
      <div className='stickybar pb-4'>
        <div className='card border-white'>
          <div className='card-header'>
            <div className='d-flex align-items-center flex-wrap row-gap-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                <img
                  src={
                    player.imgSrc && player.imgSrc.trim() !== ''
                      ? `${player.imgSrc}`
                      : getDefaultAvatar(player.gender)
                  }
                  className='img-fluid'
                  alt={`${getDisplayName()} avatar`}
                />
              </div>
              <div className='overflow-hidden'>
                <span className='badge badge-soft-success d-inline-flex align-items-center mb-1'>
                  <i className='ti ti-circle-filled fs-5 me-1' />
                  {player.status || 'Active'}
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
              <dd className='col-6 mb-3'>
                {player.dob ? formatDate(player.dob) : 'N/A'}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Gender</dt>
              <dd className='col-6 mb-3'>{player.gender || 'N/A'}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>School</dt>
              <dd className='col-6 mb-3'>{formatGrade(player.schoolName)}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Grade</dt>
              <dd className='col-6 mb-3'>
                {formatGrade(player.grade || player.class)}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>AAU Number</dt>
              <dd className='col-6 mb-3'>{player.aauNumber || 'N/A'}</dd>
            </dl>
          </div>
        </div>

        {/* Primary Contact Information */}
        {user && user.role !== 'admin' ? (
          <div className='card border-white'>
            <div className='card-body'>
              <h5 className='mb-3'>Primary Contact Info</h5>
              <div className='d-flex align-items-center mb-3'>
                <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                  <i className='ti ti-phone' />
                </span>
                <div>
                  <span className='text-dark fw-medium mb-1'>Phone Number</span>
                  <p>{user.phone ?? 'N/A'}</p>
                </div>
              </div>
              <div className='d-flex align-items-center mb-3'>
                <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                  <i className='ti ti-mail' />
                </span>
                <div>
                  <span className='text-dark fw-medium mb-1'>
                    Email Address
                  </span>
                  <p>{user.email ?? 'N/A'}</p>
                </div>
              </div>
              <hr className='my-3' />
            </div>
          </div>
        ) : primaryParent || guardians?.length > 0 ? (
          <div className='card border-white'>
            <div className='card-body'>
              <h5 className='mb-3'>Primary Contact Info</h5>
              <div className='d-flex align-items-center mb-3'>
                <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                  <i className='ti ti-phone' />
                </span>
                <div>
                  <span className='text-dark fw-medium mb-1'>Phone Number</span>
                  <p>{primaryParent?.phone ?? guardians[0]?.phone ?? 'N/A'}</p>
                </div>
              </div>
              <div className='d-flex align-items-center mb-3'>
                <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                  <i className='ti ti-mail' />
                </span>
                <div>
                  <span className='text-dark fw-medium mb-1'>
                    Email Address
                  </span>
                  <p>{primaryParent?.email ?? guardians[0]?.email ?? 'N/A'}</p>
                </div>
              </div>
              <hr className='my-3' />
            </div>
          </div>
        ) : (
          <div>No primary contact information available.</div>
        )}

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
                                    sibling.imgSrc &&
                                    sibling.imgSrc.trim() !== ''
                                      ? `${sibling.imgSrc}`
                                      : getDefaultAvatar(sibling.gender)
                                  }
                                  className='img-fluid'
                                  alt={`${
                                    sibling.fullName ||
                                    sibling.name ||
                                    'Sibling'
                                  } avatar`}
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
