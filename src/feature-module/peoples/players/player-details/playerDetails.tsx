import React, { useState, useEffect, useMemo } from 'react';
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
import {
  formatAddress,
  normalizeAddressKey,
  AddressShowConfig,
  Address,
} from '../../../../utils/address';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';
import { Player as RegistrationPlayer } from '../../../../types/registration-types';

// API data may omit street2 — this local alias widens the type for use
// only within this file without touching the shared Address interface.
type LooseAddress = Omit<Address, 'street2'> & { street2?: string };

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

// Convert player data to the shape useDynamicFormFields expects
const toRegistrationPlayer = (player: any): RegistrationPlayer => ({
  _id: player._id || player.id || '',
  fullName: player.fullName || player.name || '',
  gender: player.gender || '',
  dob: player.dob ? String(player.dob) : '',
  schoolName: player.section || player.schoolName || '',
  healthConcerns: player.healthConcerns || '',
  aauNumber: player.aauNumber || '',
  registrationYear: player.registrationYear || new Date().getFullYear(),
  season: player.season || '',
  grade: String(player.grade || player.class || ''),
  isGradeOverridden: player.isGradeOverridden || false,
  avatar: player.avatar || '',
});

const PlayerDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playerId } = useParams();

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
  const [guardianAvatarStates, setGuardianAvatarStates] = useState<
    Record<string, string>
  >({});

  // ── Dynamic fields ──────────────────────────────────────────────────────
  const { getVisibleFields: getPlayerVisibleFields } = useDynamicFormFields(
    'player',
    {
      registrationYear:
        playerData?.registrationYear || new Date().getFullYear(),
    },
  );

  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: new Date().getFullYear() },
  );

  const { getVisibleFields: getGuardianVisibleFields } = useDynamicFormFields(
    'guardian',
    { registrationYear: new Date().getFullYear() },
  );

  const playerVisibleFields = useMemo(
    () =>
      playerData
        ? getPlayerVisibleFields(toRegistrationPlayer(playerData))
        : [],
    [playerData, getPlayerVisibleFields],
  );

  const parentVisibleFields = useMemo(
    () => getParentVisibleFields({} as any),
    [getParentVisibleFields],
  );

  const guardianVisibleFields = useMemo(
    () => getGuardianVisibleFields({} as any),
    [getGuardianVisibleFields],
  );

  const hasParentField = (name: string) =>
    parentVisibleFields.some((f) => f.fieldName === name);

  const hasGuardianField = (name: string) =>
    guardianVisibleFields.some((f) => f.fieldName === name);

  const hasPlayerField = (name: string) =>
    playerVisibleFields.some((f) => f.fieldName === name);

  // ── Location state sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (location.state?.player) {
      setPlayerData(location.state.player);
      setIsLoading(false);
    }
    if (location.state?.guardians) setGuardians(location.state.guardians);
    if (location.state?.siblings) setSiblings(location.state.siblings);
    if (location.state?.sharedData) setSharedData(location.state.sharedData);
  }, [location.state]);

  // ── Fetch player if missing ─────────────────────────────────────────────
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      if (!playerId || playerData) return;
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
        setPlayerData(response.data);

        if (guardians.length === 0) {
          try {
            const guardiansResponse = await axios.get(
              `${API_BASE_URL}/player/${playerId}/guardians`,
              { headers: { Authorization: `Bearer ${storedToken}` } },
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
    };
    fetchPlayerDetails();
  }, [playerId, playerData, guardians.length]);

  // ── Guardian avatar init ────────────────────────────────────────────────
  useEffect(() => {
    const newAvatarStates: Record<string, string> = {};
    guardians.forEach((guardian: FetchedGuardianData, index: number) => {
      const isCoach =
        guardian.isCoach === true ||
        guardian.role === 'coach' ||
        guardian.type === 'coach' ||
        !!guardian.aauNumber?.trim();
      const defaultAvatar = getDefaultAvatar(isCoach ? 'coach' : 'parent');
      const avatarKey = guardian._id || guardian.id || `guardian-${index}`;
      newAvatarStates[avatarKey] = getAvatarUrl(guardian.avatar, defaultAvatar);

      (guardian.additionalGuardians || []).forEach((g: any, gIndex: number) => {
        const isSubCoach =
          g.isCoach === true ||
          g.role === 'coach' ||
          g.type === 'coach' ||
          !!g.aauNumber?.trim();
        const subKey = g._id || g.id || `guardian-${index}-sub-${gIndex}`;
        newAvatarStates[subKey] = getAvatarUrl(
          g.avatar,
          getDefaultAvatar(isSubCoach ? 'coach' : 'parent'),
        );
      });
    });
    setGuardianAvatarStates(newAvatarStates);
  }, [guardians]);

  // ── Primary parent avatar fetch ─────────────────────────────────────────
  const primaryParent: FetchedGuardianData | null =
    guardians?.find((g) => g.isPrimary) ?? null;

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
          { headers: { Authorization: `Bearer ${storedToken}` } },
        );
        const resolved = getAvatarUrl(response.data?.avatar, defaultAvatar);
        setAvatarSrc(resolved);
        setGuardianAvatarStates((prev) => ({ ...prev, [avatarKey]: resolved }));
      } catch {
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

  // ── Helpers ─────────────────────────────────────────────────────────────
  const handleViewParent = (parent: Guardian) => {
    navigate(`${all_routes.parentDetail}/${parent.id}`, { state: { parent } });
  };

  // Wrappers that accept LooseAddress (street2 optional) from API data,
  // casting to Address to satisfy the shared interface without modifying it.
  const fmtAddr = (
    addr: string | LooseAddress | undefined | null,
    show?: AddressShowConfig,
  ) => formatAddress(addr as Address | string | null | undefined, show);

  const normAddr = (addr: string | LooseAddress | undefined | null) =>
    normalizeAddressKey(addr as Address | string | null | undefined);

  const getGuardianAvatar = (guardian: GuardianWithPlayers) => {
    const avatarKey = guardian._id || guardian.id;
    if (guardianAvatarStates[avatarKey]) return guardianAvatarStates[avatarKey];
    const isCoach = guardian.isCoach || false;
    return getAvatarUrl(
      guardian.avatar,
      getDefaultAvatar(isCoach ? 'coach' : 'parent'),
    );
  };

  const getParentStatusBadge = (parent: GuardianWithPlayers) => {
    if (parent.isCoach) {
      return (
        <span className='badge badge-soft-primary d-inline-flex align-items-center ms-2'>
          <i className='ti ti-coach fs-5 me-1' />
          Coach
        </span>
      );
    }
    const status = getParentStatus(parent as any);
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
      default:
        return (
          <span className='badge badge-soft-danger d-inline-flex align-items-center ms-2'>
            <i className='ti ti-circle-filled fs-5 me-1 text-danger' />
            Inactive
          </span>
        );
    }
  };

  // ── Mapped guardians ────────────────────────────────────────────────────
  const mappedGuardians: GuardianWithPlayers[] = guardians
    ? guardians.flatMap((guardian: FetchedGuardianData) => {
        const familyPlayers = playerData
          ? [playerData]
          : guardian.players || [];
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

  if (isLoading) return <div>Loading player details...</div>;
  if (!playerData) return <div>No player data found.</div>;

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

  // Whether we show the address section at all (parent config)
  // Show address section if EITHER parent or guardian config has address enabled
  // Which address sub-fields are enabled per config
  const parentAddrShow = {
    street: hasParentField('address'),
    city: hasParentField('city'),
    state: hasParentField('state'),
    zip: hasParentField('zip'),
  };
  const guardianAddrShow = {
    street: hasGuardianField('address'),
    city: hasGuardianField('city'),
    state: hasGuardianField('state'),
    zip: hasGuardianField('zip'),
  };
  const parentHasAddress = Object.values(parentAddrShow).some(Boolean);
  const guardianHasAddress = Object.values(guardianAddrShow).some(Boolean);
  const showAddressSection = parentHasAddress || guardianHasAddress;

  // ── Render a single guardian card row ───────────────────────────────────
  const renderGuardianRow = (
    guardian: GuardianWithPlayers,
    avatarEl: React.ReactNode,
  ) => {
    const isCoach = guardian.isCoach || false;
    return (
      <div className='row'>
        {/* Name + avatar — always shown */}
        <div className='col-sm-6 col-lg-3'>
          <div className='d-flex align-items-center mb-3'>
            <span className='avatar avatar-lg flex-shrink-0'>{avatarEl}</span>
            <div className='ms-2 overflow-hidden'>
              <div className='d-flex align-items-center flex-wrap gap-1'>
                <h6 className='text-truncate mb-0'>{guardian.fullName}</h6>
                {isCoach && (
                  <span className='badge badge-soft-primary ms-2'>Coach</span>
                )}
              </div>
              <p className='mb-0'>{guardian.relationship}</p>
            </div>
          </div>
        </div>

        {/* AAU Number — gated */}
        {hasGuardianField('aauNumber') && (
          <div className='col-sm-6 col-lg-2'>
            <p className='text-dark fw-medium mb-1'>AAU Number</p>
            <p>{guardian.aauNumber}</p>
          </div>
        )}

        {/* Phone — gated */}
        {hasGuardianField('phone') && (
          <div className='col-sm-6 col-lg-2'>
            <p className='text-dark fw-medium mb-1'>Phone</p>
            <p>{guardian.phone ? formatPhoneNumber(guardian.phone) : 'N/A'}</p>
          </div>
        )}

        {/* Email — gated */}
        {hasGuardianField('email') && (
          <div className='col-sm-6 col-lg-3'>
            <p className='text-dark fw-medium mb-1'>Email</p>
            <p className='text-truncate' title={guardian.email}>
              {guardian.email || 'N/A'}
            </p>
          </div>
        )}

        {/* View profile — always shown */}
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
    );
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
                        {renderGuardianRow(
                          {
                            ...primaryParent,
                            aauNumber:
                              primaryParent.aauNumber || 'Not Available',
                          } as GuardianWithPlayers,
                          <img
                            src={avatarSrc}
                            alt={primaryParent.fullName}
                            className='img-fluid rounded'
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                getDefaultAvatar(
                                  primaryParent.isCoach ? 'coach' : 'parent',
                                );
                            }}
                          />,
                        )}
                      </div>
                    )}

                    {filteredGuardians.length > 0 ? (
                      filteredGuardians.map((guardian) => (
                        <div
                          key={guardian.id}
                          className='border rounded p-3 pb-0 mb-3'
                        >
                          {renderGuardianRow(
                            guardian,
                            <img
                              src={getGuardianAvatar(guardian)}
                              alt={guardian.fullName}
                              className='img-fluid rounded'
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  getDefaultAvatar(
                                    guardian.isCoach ? 'coach' : 'parent',
                                  );
                              }}
                            />,
                          )}
                        </div>
                      ))
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
                {showAddressSection && (
                  <div className='card flex-fill me-4'>
                    <div className='card-header'>
                      <h5>Address Information</h5>
                    </div>
                    <div className='card-body'>
                      {primaryParent &&
                        parentHasAddress &&
                        (() => {
                          const displayed = fmtAddr(
                            primaryParent.address,
                            parentAddrShow,
                          );
                          if (!displayed || displayed === 'N/A') return null;
                          return (
                            <div className='d-flex align-items-center mb-3'>
                              <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                                <i className='ti ti-map-pin-up' />
                              </span>
                              <div>
                                <p className='text-dark fw-medium mb-1'>
                                  {primaryParent.fullName}'s Address
                                </p>
                                <p>{displayed}</p>
                              </div>
                            </div>
                          );
                        })()}
                      {guardianHasAddress &&
                        (() => {
                          const primaryAddrKey = normAddr(
                            primaryParent?.address,
                          );
                          const seenKeys = new Set<string>(
                            primaryAddrKey ? [primaryAddrKey] : [],
                          );
                          return filteredGuardians
                            .filter((g) => {
                              const addrKey = normAddr(g.address);
                              if (!addrKey) return false;
                              // Skip if same as an already-shown address
                              if (seenKeys.has(addrKey)) return false;
                              // Skip if display would be blank
                              const displayed = fmtAddr(
                                g.address,
                                guardianAddrShow,
                              );
                              if (!displayed || displayed === 'N/A')
                                return false;
                              seenKeys.add(addrKey);
                              return true;
                            })
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
                                  <p>{fmtAddr(g.address, guardianAddrShow)}</p>
                                </div>
                              </div>
                            ));
                        })()}
                    </div>
                  </div>
                )}

                {/* Medical History — always shown */}
                <div
                  className={`card flex-fill${showAddressSection ? '' : ' w-100'}`}
                >
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
                        <p className='mb-0'>{playerData.healthConcerns}</p>
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
