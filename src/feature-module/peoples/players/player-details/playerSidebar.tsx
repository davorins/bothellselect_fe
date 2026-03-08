// PlayerSidebar.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import { useAuth } from '../../../../context/AuthContext';
import { formatDate } from '../../../../utils/dateFormatter';
import { getPlayerStatus } from '../../../../utils/season';
import { formatPhoneNumber } from '../../../../utils/phone';
import { Player, Guardian } from '../../../../types/playerTypes';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { Player as RegistrationPlayer } from '../../../../types/registration-types';

interface PlayerSidebarProps {
  player: Player;
  guardians: Guardian[];
  token?: string | null;
  primaryParent: Guardian | null;
  siblings: Player[];
  sharedData?: {
    familyGuardians: Guardian[];
    familyAddress?:
      | string
      | {
          street: string;
          street2?: string;
          city: string;
          state: string;
          zip: string;
        };
  };
}

const toRegistrationPlayer = (player: Player): RegistrationPlayer => ({
  _id: (player as any)._id || (player as any).id || '',
  fullName: player.fullName || (player as any).name || '',
  gender: player.gender || '',
  dob: player.dob ? String(player.dob) : '',
  schoolName: player.section || player.schoolName || '',
  healthConcerns: player.healthConcerns || '',
  aauNumber: player.aauNumber || '',
  registrationYear: player.registrationYear || new Date().getFullYear(),
  season: player.season || '',
  grade: String(player.grade || player.class || ''),
  isGradeOverridden: (player as any).isGradeOverridden || false,
  avatar: player.avatar || '',
});

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({
  player,
  guardians,
  primaryParent,
  siblings,
  sharedData = {
    familyGuardians: guardians,
    familyAddress: primaryParent?.address,
  },
}) => {
  const { user } = useAuth();

  // ── Dynamic fields ──────────────────────────────────────────────────────
  const { getVisibleFields } = useDynamicFormFields('player', {
    registrationYear: player.registrationYear || new Date().getFullYear(),
  });

  const visibleFields = useMemo(
    () => getVisibleFields(toRegistrationPlayer(player)),
    [player, getVisibleFields],
  );

  const hasField = (name: string) =>
    visibleFields.length === 0 ||
    visibleFields.some((f) => f.fieldName === name);

  if (!player) {
    return <div>No player data found.</div>;
  }

  const formatPlayerDob = (): string => {
    if (!player.dob) return 'N/A';
    try {
      if (typeof player.dob === 'string') {
        const [datePart] = player.dob.split('T');
        return formatDate(datePart);
      }
      if (player.dob instanceof Date) return formatDate(player.dob);
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date of birth:', error);
      return 'N/A';
    }
  };

  const getDisplayName = () => player.fullName || (player as any).name || 'N/A';
  const getJoinDate = () =>
    (player as any).DateofJoin || (player as any).createdAt || undefined;

  const formatGrade = (grade?: string | number) => {
    if (!grade) return 'N/A';
    const gradeStr = String(grade);
    if (gradeStr === 'PK') return 'Pre-Kindergarten';
    if (gradeStr === 'K') return 'Kindergarten';
    const gradeNum = parseInt(gradeStr.replace(/\D/g, ''));
    if (isNaN(gradeNum)) return gradeStr;
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = gradeNum % 100;
    return `${gradeNum}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]} Grade`;
  };

  const playerStatus = getPlayerStatus(player);

  const shouldShowSiblings = siblings?.length > 0 && user?.role !== 'admin';

  const getPlayerSeasons = (): any[] => {
    const playerWithSeasons = player as any;
    if (playerWithSeasons.seasons && Array.isArray(playerWithSeasons.seasons)) {
      return playerWithSeasons.seasons;
    }
    return [];
  };

  const getSeasonPaymentStatus = (season: any): string => {
    if (season.paymentStatus) return season.paymentStatus;
    if (season.paymentComplete) return 'paid';
    return 'pending';
  };

  const groupSeasonsByYear = () => {
    const seasons = getPlayerSeasons();
    const grouped: { [year: number]: any[] } = {};
    seasons.forEach((season) => {
      const year = season.year || player.registrationYear;
      if (year) {
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(season);
      }
    });
    return grouped;
  };

  const seasonsByYear = groupSeasonsByYear();
  const hasSeasons = getPlayerSeasons().length > 0;

  const getDisplayParent = () => {
    if (primaryParent && (primaryParent.phone || primaryParent.email))
      return primaryParent;
    return guardians.find((g) => g.phone || g.email) || null;
  };

  const displayParent = getDisplayParent();

  const playerDefaultAvatar = getDefaultAvatar(
    'player',
    player.gender as 'Male' | 'Female' | undefined,
  );
  const playerAvatarSrc = getAvatarUrl(player.avatar, playerDefaultAvatar);

  const getStatusBadge = () => {
    switch (playerStatus) {
      case 'Active':
        return (
          <span
            className='badge badge-soft-success d-inline-flex align-items-center'
            title='Registered and paid for current season'
          >
            <i className='ti ti-circle-filled fs-5 me-1 text-success' />
            Active
          </span>
        );
      case 'Pending Payment':
        return (
          <span
            className='badge badge-soft-warning d-inline-flex align-items-center'
            title='Registered but payment pending for current season'
          >
            <i className='ti ti-circle-filled fs-5 me-1 text-warning' />
            Pending Payment
          </span>
        );
      case 'Inactive':
      default:
        return (
          <span
            className='badge badge-soft-danger d-inline-flex align-items-center'
            title='Not registered for current season'
          >
            <i className='ti ti-circle-filled fs-5 me-1 text-danger' />
            Inactive
          </span>
        );
    }
  };

  return (
    <div className='col-xxl-3 col-xl-4 theiaStickySidebar'>
      <div className='stickybar pb-4'>
        <div className='card border-white'>
          <div className='card-header'>
            <div className='d-flex align-items-center flex-wrap row-gap-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                <img
                  src={playerAvatarSrc}
                  className='img-fluid rounded-circle'
                  alt={`${getDisplayName()} avatar`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = playerDefaultAvatar;
                  }}
                />
              </div>
              <div className='overflow-hidden'>
                <div className='d-flex align-items-center gap-2 mb-1'>
                  {getStatusBadge()}
                </div>
                <h5 className='mb-1 text-truncate'>{getDisplayName()}</h5>
                <p className='mb-1'>
                  Member since:{' '}
                  {getJoinDate() ? formatDate(getJoinDate()) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className='card-body'>
            <h5 className='mb-3'>Basic Information</h5>
            <dl className='row mb-0'>
              {hasField('dob') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>
                    Date Of Birth
                  </dt>
                  <dd className='col-6 mb-3'>{formatPlayerDob()}</dd>
                </>
              )}

              {hasField('gender') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>Gender</dt>
                  <dd className='col-6 mb-3'>{player.gender || 'N/A'}</dd>
                </>
              )}

              {hasField('schoolName') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>School</dt>
                  <dd className='col-6 mb-3'>
                    {player.section || player.schoolName || 'N/A'}
                  </dd>
                </>
              )}

              {hasField('grade') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>Grade</dt>
                  <dd className='col-6 mb-3'>
                    {formatGrade(player.grade || (player as any).class)}
                  </dd>
                </>
              )}

              {hasField('aauNumber') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>AAU Number</dt>
                  <dd className='col-6 mb-3'>{player.aauNumber || 'N/A'}</dd>
                </>
              )}

              <dt className='col-12 fw-medium text-dark mb-2 mt-3'>
                Seasons & Events
              </dt>
              <dd className='col-12 mb-3'>
                {hasSeasons ? (
                  <div className='seasons-list'>
                    {Object.entries(seasonsByYear).map(([year, seasons]) => (
                      <div key={year} className='season-year-group mb-3'>
                        <h6 className='text-dark fw-medium mb-2'>
                          {year} Season
                        </h6>
                        {seasons.map((season, index) => {
                          const paymentStatus = getSeasonPaymentStatus(season);
                          const isPaid = paymentStatus === 'paid';
                          return (
                            <div
                              key={index}
                              className='season-item mb-2 p-2 bg-light rounded'
                            >
                              <div className='d-flex justify-content-between align-items-start'>
                                <div>
                                  <strong>{season.season}</strong>
                                  {season.tryoutId && (
                                    <div className='text-muted small'>
                                      ID: {season.tryoutId}
                                    </div>
                                  )}
                                  {season.registrationDate && (
                                    <div className='text-muted small'>
                                      Registered:{' '}
                                      {formatDate(season.registrationDate)}
                                    </div>
                                  )}
                                </div>
                                <span
                                  className={`badge badge-soft-${isPaid ? 'success' : 'warning'}`}
                                >
                                  {isPaid ? 'Paid' : 'Pending'}
                                </span>
                              </div>
                              {season.amountPaid && (
                                <div className='text-muted small mt-1'>
                                  Amount: ${season.amountPaid}
                                  {season.cardBrand && season.cardLast4 && (
                                    <span className='ms-2'>
                                      {season.cardBrand} •••• {season.cardLast4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : player.season && player.registrationYear ? (
                  <div className='single-season'>
                    <div className='d-flex justify-content-between align-items-center'>
                      <span>
                        {player.season} / {player.registrationYear}
                      </span>
                      <span
                        className={`badge badge-soft-${player.paymentComplete ? 'success' : 'warning'}`}
                      >
                        {player.paymentComplete ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className='text-muted'>
                    <i className='ti ti-info-circle me-1'></i>
                    No season registrations found
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>

        <div className='card border-white'>
          <div className='card-body'>
            <h5 className='mb-3'>Primary Contact Info</h5>
            {displayParent ? (
              <>
                <div className='d-flex align-items-center mb-3'>
                  <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                    <i className='ti ti-phone' />
                  </span>
                  <div>
                    <span className='text-dark fw-medium mb-1'>
                      Phone Number
                    </span>
                    <p>
                      {displayParent.phone
                        ? formatPhoneNumber(displayParent.phone)
                        : 'N/A'}
                    </p>
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
                    <p>{displayParent.email || 'N/A'}</p>
                  </div>
                </div>
                {displayParent.relationship && (
                  <div className='d-flex align-items-center mb-3'>
                    <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                      <i className='ti ti-users' />
                    </span>
                    <div>
                      <span className='text-dark fw-medium mb-1'>
                        Relationship
                      </span>
                      <p>{displayParent.relationship}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className='text-muted'>No contact information available</p>
            )}
            <hr className='my-3' />
          </div>
        </div>

        {shouldShowSiblings && (
          <div className='card border-white'>
            <div className='card-body'>
              <h5 className='mb-3'>Sibling Information</h5>
              <div className='d-flex align-items-center bg-light-300 rounded p-3 mb-3'>
                <div className='ms-2'>
                  <ul>
                    {siblings.map((sibling) => {
                      const siblingId =
                        (sibling as any).id || (sibling as any)._id;
                      if (!siblingId) {
                        console.error('Sibling has no ID:', sibling);
                        return null;
                      }

                      const siblingDefault = getDefaultAvatar(
                        'player',
                        sibling.gender as 'Male' | 'Female' | undefined,
                      );
                      const siblingAvatarSrc = getAvatarUrl(
                        sibling.avatar,
                        siblingDefault,
                      );
                      const siblingStatus = getPlayerStatus(sibling);

                      return (
                        <li key={siblingId}>
                          <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
                            <div className='d-flex align-items-center justify-content-center avatar avatar-xxl'>
                              <span className='avatar avatar-lg'>
                                <img
                                  src={siblingAvatarSrc}
                                  className='img-fluid rounded-circle'
                                  alt={`${sibling.fullName || (sibling as any).name || 'Sibling'} avatar`}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      siblingDefault;
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
                                      (s) =>
                                        ((s as any).id || (s as any)._id) !==
                                        siblingId,
                                    )
                                    .concat([player]),
                                  sharedData,
                                }}
                                className='text-dark mb-0'
                              >
                                <h5>
                                  {sibling.fullName ||
                                    (sibling as any).name ||
                                    'Sibling'}
                                </h5>
                              </Link>
                              <div className='d-flex align-items-center gap-2 mt-1'>
                                <span
                                  className={`badge badge-soft-${
                                    siblingStatus === 'Active'
                                      ? 'success'
                                      : siblingStatus === 'Pending Payment'
                                        ? 'warning'
                                        : 'danger'
                                  }`}
                                >
                                  {siblingStatus}
                                </span>
                              </div>
                              {hasField('grade') && (
                                <p>
                                  {formatGrade(
                                    sibling.grade || (sibling as any).class,
                                  )}
                                </p>
                              )}
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
