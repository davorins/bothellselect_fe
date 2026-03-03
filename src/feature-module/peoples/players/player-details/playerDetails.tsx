import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PlayerSidebar from './playerSidebar';
import PlayerBreadcrumb from './playerBreadcrumb';
import axios from 'axios';
import { all_routes } from '../../../router/all_routes';
import { formatPhoneNumber } from '../../../../utils/phone';
import { Guardian } from '../../../../types/playerTypes';
import { getParentStatus } from '../../../../utils/parentUtils';
import { getPlayerStatus } from '../../../../utils/season';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';

interface FetchedGuardianData extends Guardian {
  _id: string;
  additionalGuardians?: FetchedGuardianData[];
  players?: any[];
  role?: string;
  type?: string;
}

interface GuardianWithPlayers extends Guardian {
  players?: any[];
  isPrimary?: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DEFAULT_PARENT_AVATAR = getDefaultAvatar('parent');
const DEFAULT_BOY_AVATAR = getDefaultAvatar('player', 'Male');
const DEFAULT_GIRL_AVATAR = getDefaultAvatar('player', 'Female');

const PlayerDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playerId } = useParams();

  // State for player data that updates when location.state changes
  const [playerData, setPlayerData] = useState(location.state?.player);
  const [guardians, setGuardians] = useState<FetchedGuardianData[]>(
    location.state?.guardians ||
      location.state?.sharedData?.familyGuardians ||
      [],
  );
  const [siblings, setSiblings] = useState(location.state?.siblings || []);
  const [sharedData, setSharedData] = useState(
    location.state?.sharedData || {
      familyGuardians: guardians,
      familyAddress: guardians.find((g: Guardian) => g.isPrimary)?.address,
    },
  );

  const [token, setToken] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_PARENT_AVATAR);
  const [isLoading, setIsLoading] = useState(!location.state?.player);

  // State for guardian avatars
  const [guardianAvatarStates, setGuardianAvatarStates] = useState<
    Record<string, string>
  >({});

  // Update state when location.state changes
  useEffect(() => {
    console.log('Location state updated:', location.state);

    if (location.state?.player) {
      setPlayerData(location.state.player);
      setIsLoading(false);
    }
    if (location.state?.guardians) {
      setGuardians(location.state.guardians);
    }
    if (location.state?.siblings) {
      setSiblings(location.state.siblings);
    }
    if (location.state?.sharedData) {
      setSharedData(location.state.sharedData);
    }
  }, [location.state]);

  // Fetch data if no player data is available
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      if (!playerId) return;

      if (!playerData) {
        setIsLoading(true);
        try {
          const storedToken = localStorage.getItem('authToken');
          setToken(storedToken);

          const response = await axios.get(
            `${API_BASE_URL}/players/${playerId}`,
            {
              headers: { Authorization: `Bearer ${storedToken}` },
            },
          );

          const fullPlayerData = response.data;
          setPlayerData(fullPlayerData);

          if (guardians.length === 0) {
            try {
              const guardiansResponse = await axios.get(
                `${API_BASE_URL}/player/${playerId}/guardians`,
                {
                  headers: { Authorization: `Bearer ${storedToken}` },
                },
              );
              setGuardians(guardiansResponse.data);
            } catch (guardianError) {
              console.error('Failed to fetch guardians:', guardianError);
            }
          }
        } catch (error) {
          console.error('Failed to fetch player details:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPlayerDetails();
  }, [playerId, playerData, guardians.length]);

  // Initialize guardian avatar states
  useEffect(() => {
    const newAvatarStates: Record<string, string> = {};

    guardians.forEach((guardian: FetchedGuardianData, index: number) => {
      const isGuardianCoach =
        guardian.isCoach === true ||
        guardian.role === 'coach' ||
        guardian.type === 'coach' ||
        (guardian.aauNumber && guardian.aauNumber.trim() !== '');

      const defaultAvatar = getDefaultAvatar(
        isGuardianCoach ? 'coach' : 'parent',
      );
      const avatarKey = guardian._id || guardian.id || `guardian-${index}`;

      newAvatarStates[avatarKey] = getAvatarUrl(guardian.avatar, defaultAvatar);

      // Also handle additional guardians
      if (guardian.additionalGuardians) {
        guardian.additionalGuardians.forEach((g: any, gIndex: number) => {
          const isSubGuardianCoach =
            g.isCoach === true ||
            g.role === 'coach' ||
            g.type === 'coach' ||
            (g.aauNumber && g.aauNumber.trim() !== '');

          const subDefaultAvatar = getDefaultAvatar(
            isSubGuardianCoach ? 'coach' : 'parent',
          );
          const subAvatarKey =
            g._id || g.id || `guardian-${index}-sub-${gIndex}`;

          newAvatarStates[subAvatarKey] = getAvatarUrl(
            g.avatar,
            subDefaultAvatar,
          );
        });
      }
    });

    setGuardianAvatarStates(newAvatarStates);
  }, [guardians]);

  const handleViewParent = (parent: Guardian) => {
    navigate(`${all_routes.parentDetail}/${parent.id}`, {
      state: { parent },
    });
  };

  const formatAddress = (
    address:
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
  ): string => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.street2,
      `${address.city}, ${address.state} ${address.zip}`.trim(),
    ].filter(Boolean);

    return parts.join(', ');
  };

  const primaryParent: FetchedGuardianData | null =
    guardians?.find((g: FetchedGuardianData) => g.isPrimary) ?? null;

  // Create mapped guardians with players
  const mappedGuardians: GuardianWithPlayers[] = guardians
    ? guardians.flatMap((guardian: FetchedGuardianData) => {
        // Get all players for this family (from the current player)
        const familyPlayers = playerData
          ? [playerData]
          : guardian.players || [];

        // Create main guardian record
        const mainGuardian: GuardianWithPlayers = {
          id: guardian._id,
          _id: guardian._id,
          fullName: guardian.fullName,
          phone: guardian.phone,
          email: guardian.email,
          address: guardian.address,
          relationship: guardian.relationship,
          avatar: guardian.avatar,
          aauNumber: guardian.aauNumber || 'Not Available',
          isPrimary: true,
          players: familyPlayers.map((p) => ({
            ...p,
            _id: p._id,
            fullName: p.fullName,
            seasons: p.seasons || [],
            season: p.season,
            registrationYear: p.registrationYear,
            paymentComplete: p.paymentComplete,
            paymentStatus: p.paymentStatus,
          })),
          isCoach: guardian.isCoach || false,
        };

        // Create additional guardians
        const additionalGuardians: GuardianWithPlayers[] = (
          guardian.additionalGuardians || []
        ).map((g) => ({
          id: g._id,
          _id: g._id,
          fullName: g.fullName,
          phone: g.phone,
          email: g.email,
          address: g.address,
          relationship: g.relationship,
          avatar: g.avatar,
          aauNumber: g.aauNumber || 'Not Available',
          isPrimary: false,
          players: familyPlayers.map((p) => ({
            ...p,
            _id: p._id,
            fullName: p.fullName,
            seasons: p.seasons || [],
            season: p.season,
            registrationYear: p.registrationYear,
            paymentComplete: p.paymentComplete,
            paymentStatus: p.paymentStatus,
          })),
          isCoach: g.isCoach || false,
        }));

        return [mainGuardian, ...additionalGuardians];
      })
    : [];

  // Fetch primary parent avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!primaryParent?.id) return;

      const avatarKey = primaryParent._id || primaryParent.id;
      if (guardianAvatarStates[avatarKey]) {
        setAvatarSrc(guardianAvatarStates[avatarKey]);
        return;
      }

      const isCoach = primaryParent.isCoach || false;
      const defaultAvatar = getDefaultAvatar(isCoach ? 'coach' : 'parent');

      if (primaryParent.avatar?.startsWith('http')) {
        setAvatarSrc(getAvatarUrl(primaryParent.avatar, defaultAvatar));
        return;
      }

      try {
        const storedToken = localStorage.getItem('authToken');
        const response = await axios.get(
          `${API_BASE_URL}/parent/${primaryParent.id}`,
          {
            headers: { Authorization: `Bearer ${storedToken}` },
          },
        );

        const avatar = response.data?.avatar;
        const resolvedAvatar = getAvatarUrl(avatar, defaultAvatar);
        setAvatarSrc(resolvedAvatar);

        // Update avatar state
        setGuardianAvatarStates((prev) => ({
          ...prev,
          [avatarKey]: resolvedAvatar,
        }));
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
        setAvatarSrc(defaultAvatar);
      }
    };

    fetchAvatar();
  }, [
    primaryParent?.id,
    primaryParent?.avatar,
    primaryParent?.isCoach,
    guardianAvatarStates,
  ]);

  if (isLoading) {
    return <div>Loading player details...</div>;
  }

  if (!playerData) {
    return <div>No player data found.</div>;
  }

  const uniqueGuardians: GuardianWithPlayers[] = Array.from(
    new Map(mappedGuardians.map((g) => [g.id, g])).values(),
  );

  const filteredGuardians = uniqueGuardians.filter(
    (g) =>
      !(
        primaryParent &&
        g.fullName === primaryParent.fullName &&
        g.phone === primaryParent.phone
      ),
  );

  // Enhanced parent status badge using the utility function
  const getParentStatusBadge = (parent: GuardianWithPlayers) => {
    // Log the parent data for debugging
    console.log('🏷️ Getting status for parent:', {
      name: parent.fullName,
      isPrimary: parent.isPrimary,
      isCoach: parent.isCoach,
      playersCount: parent.players?.length,
      players: parent.players?.map((p) => ({
        name: p.fullName,
        status: getPlayerStatus(p),
      })),
    });

    // Use the imported utility function for consistent status
    const status = getParentStatus(parent as any);

    // Also check if parent is a coach
    if (parent.isCoach) {
      return (
        <span className='badge badge-soft-primary d-inline-flex align-items-center ms-2'>
          <i className='ti ti-coach fs-5 me-1' />
          Coach
        </span>
      );
    }

    // Return badge based on status from utility
    switch (status) {
      case 'Active':
        return (
          <span className='badge badge-soft-success d-inline-flex align-items-center ms-2'>
            <i className='ti ti-circle-filled fs-5 me-1 text-success' />
            Active
          </span>
        );
      case 'Pending Payment':
        return (
          <span className='badge badge-soft-warning d-inline-flex align-items-center ms-2'>
            <i className='ti ti-circle-filled fs-5 me-1 text-warning' />
            Pending Payment
          </span>
        );
      case 'Inactive':
        return (
          <span className='badge badge-soft-danger d-inline-flex align-items-center ms-2'>
            <i className='ti ti-circle-filled fs-5 me-1 text-danger' />
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  // Get player status for display
  const playerStatus = getPlayerStatus(playerData);

  // Helper to get guardian avatar
  const getGuardianAvatar = (guardian: GuardianWithPlayers) => {
    const avatarKey = guardian._id || guardian.id;
    if (guardianAvatarStates[avatarKey]) {
      return guardianAvatarStates[avatarKey];
    }

    const isCoach = guardian.isCoach || false;
    const defaultAvatar = getDefaultAvatar(isCoach ? 'coach' : 'parent');
    return getAvatarUrl(guardian.avatar, defaultAvatar);
  };

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='row'>
          <PlayerBreadcrumb player={playerData} guardians={guardians} />
        </div>
        <div className='row'>
          <PlayerSidebar
            player={playerData}
            guardians={filteredGuardians}
            token={token}
            primaryParent={primaryParent}
            siblings={siblings}
            sharedData={sharedData}
          />
          <div className='col-xxl-9 col-xl-8'>
            <div className='row'>
              <div className='col-md-12'>
                {/* Parents/Guardians Card */}
                <div className='card'>
                  <div className='card-header d-flex justify-content-between align-items-center'>
                    <h5 className='mb-0'>Parents/Guardians Information</h5>
                  </div>
                  <div className='card-body'>
                    {primaryParent && (
                      <div className='border rounded p-3 pb-0 mb-3'>
                        <div className='row'>
                          <div className='col-sm-6 col-lg-3'>
                            <div className='d-flex align-items-center mb-3'>
                              <span className='avatar avatar-lg flex-shrink-0'>
                                <img
                                  src={avatarSrc}
                                  alt={primaryParent.fullName}
                                  className='img-fluid rounded'
                                  onError={(e) => {
                                    const isCoach =
                                      primaryParent.isCoach || false;
                                    (e.target as HTMLImageElement).src =
                                      getDefaultAvatar(
                                        isCoach ? 'coach' : 'parent',
                                      );
                                  }}
                                />
                              </span>
                              <div className='ms-2 overflow-hidden'>
                                <div className='d-flex align-items-center flex-wrap gap-1'>
                                  <h6 className='text-truncate mb-0'>
                                    {primaryParent.fullName}
                                  </h6>
                                  {primaryParent.isCoach && (
                                    <span className='badge badge-soft-primary ms-2'>
                                      Coach
                                    </span>
                                  )}
                                </div>
                                <p className='mb-0'>
                                  {primaryParent.relationship}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className='col-sm-6 col-lg-2'>
                            <p className='text-dark fw-medium mb-1'>
                              AAU Number
                            </p>
                            <p>{primaryParent.aauNumber}</p>
                          </div>
                          <div className='col-sm-6 col-lg-2'>
                            <p className='text-dark fw-medium mb-1'>Phone</p>
                            <p>
                              {primaryParent.phone
                                ? formatPhoneNumber(primaryParent.phone)
                                : 'N/A'}
                            </p>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <p className='text-dark fw-medium mb-1'>Email</p>
                            <p
                              className='text-truncate'
                              title={primaryParent.email}
                            >
                              {primaryParent.email || 'N/A'}
                            </p>
                          </div>
                          <div className='col-sm-6 col-lg-2'>
                            <div className='d-flex justify-content-end'>
                              <button
                                onClick={() => handleViewParent(primaryParent)}
                                className='btn btn-primary btn-sm'
                              >
                                View Profile
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {filteredGuardians.length > 0 ? (
                      filteredGuardians.map((guardian) => {
                        const guardianAvatar = getGuardianAvatar(guardian);
                        const isCoach = guardian.isCoach || false;

                        return (
                          <div
                            key={guardian.id}
                            className='border rounded p-3 pb-0 mb-3'
                          >
                            <div className='row'>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='d-flex align-items-center mb-3'>
                                  <span className='avatar avatar-lg flex-shrink-0'>
                                    <img
                                      src={guardianAvatar}
                                      alt={guardian.fullName}
                                      className='img-fluid rounded'
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          getDefaultAvatar(
                                            isCoach ? 'coach' : 'parent',
                                          );
                                      }}
                                    />
                                  </span>
                                  <div className='ms-2 overflow-hidden'>
                                    <div className='d-flex align-items-center flex-wrap gap-1'>
                                      <h6 className='text-truncate mb-0'>
                                        {guardian.fullName}
                                      </h6>
                                      {isCoach && (
                                        <span className='badge badge-soft-primary ms-2'>
                                          Coach
                                        </span>
                                      )}
                                    </div>
                                    <p className='mb-0'>
                                      {guardian.relationship}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-2'>
                                <p className='text-dark fw-medium mb-1'>
                                  AAU Number
                                </p>
                                <p>{guardian.aauNumber}</p>
                              </div>
                              <div className='col-sm-6 col-lg-2'>
                                <p className='text-dark fw-medium mb-1'>
                                  Phone
                                </p>
                                <p>
                                  {guardian.phone
                                    ? formatPhoneNumber(guardian.phone)
                                    : 'N/A'}
                                </p>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  Email
                                </p>
                                <p
                                  className='text-truncate'
                                  title={guardian.email}
                                >
                                  {guardian.email || 'N/A'}
                                </p>
                              </div>
                              <div className='col-sm-6 col-lg-2'>
                                <div className='d-flex justify-content-end'>
                                  <button
                                    onClick={() => handleViewParent(guardian)}
                                    className='btn btn-primary btn-sm'
                                  >
                                    View Profile
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className='text-muted'>
                        No parent/guardian data available.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className='col-xxl-12 d-flex'>
                {/* Address Section */}
                <div className='card flex-fill me-4'>
                  <div className='card-header'>
                    <h5>Address Information</h5>
                  </div>
                  <div className='card-body'>
                    {primaryParent && (
                      <div className='d-flex align-items-center mb-3'>
                        <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                          <i className='ti ti-map-pin-up' />
                        </span>
                        <div>
                          <p className='text-dark fw-medium mb-1'>
                            Primary Address
                          </p>
                          <p>{formatAddress(primaryParent.address)}</p>
                        </div>
                      </div>
                    )}
                    {filteredGuardians
                      .filter(
                        (g) =>
                          formatAddress(g.address) !==
                          formatAddress(primaryParent?.address),
                      )
                      .map((g) => (
                        <div
                          key={g.id}
                          className='d-flex align-items-center mb-3'
                        >
                          <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                            <i className='ti ti-map-pins' />
                          </span>
                          <div>
                            <p className='text-dark fw-medium mb-1'>
                              {g.fullName}'s Address
                            </p>
                            <p>{formatAddress(g.address)}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Medical History Section */}
                <div className='card flex-fill'>
                  <div className='card-header'>
                    <h5>Medical History</h5>
                  </div>
                  <div className='card-body'>
                    <div className='d-flex align-items-start'>
                      <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                        <i className='ti ti-heartbeat' />
                      </span>
                      <div>
                        <p className='text-dark fw-medium mb-1'>Health Notes</p>
                        <p className='mb-0'>
                          {playerData.healthConcerns ||
                            'No medical history on file'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDetails;
