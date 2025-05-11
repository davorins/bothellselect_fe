import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PlayerSidebar from './playerSidebar';
import PlayerBreadcrumb from './playerBreadcrumb';
import axios from 'axios';
import { all_routes } from '../../../router/all_routes';
import { formatPhoneNumber } from '../../../../utils/phone';
import { Guardian } from '../../../../types/playerTypes';

interface FetchedGuardianData extends Guardian {
  _id: string;
  additionalGuardians?: FetchedGuardianData[];
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DEFAULT_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/parents.png';

const PlayerDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const player = location.state?.player;
  const guardians =
    location.state?.guardians ||
    location.state?.sharedData?.familyGuardians ||
    [];
  const siblings = location.state?.siblings || [];
  const sharedData = location.state?.sharedData || {
    familyGuardians: guardians,
    familyAddress: guardians.find((g: Guardian) => g.isPrimary)?.address,
  };

  const [token, setToken] = useState<string | null>(null);
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);

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
      | null
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

  const primaryParent: Guardian | null =
    guardians?.find((g: FetchedGuardianData) => g.isPrimary) ?? null;

  const mappedGuardians: Guardian[] = guardians
    ? guardians.flatMap((guardian: FetchedGuardianData) => [
        {
          id: guardian._id,
          fullName: guardian.fullName,
          phone: guardian.phone,
          email: guardian.email,
          address: guardian.address,
          relationship: guardian.relationship,
          avatar: guardian.avatar,
          aauNumber: guardian.aauNumber || 'Not Available',
          isPrimary: true,
        },
        ...(guardian.additionalGuardians || []).map((g) => ({
          id: g._id,
          fullName: g.fullName,
          phone: g.phone,
          email: g.email,
          address: g.address,
          relationship: g.relationship,
          avatar: g.avatar,
          aauNumber: g.aauNumber || 'Not Available',
          isPrimary: false,
        })),
      ])
    : [];

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    setToken(storedToken);

    const fetchAvatar = async () => {
      if (!primaryParent?.id) return;

      if (primaryParent.avatar?.startsWith('http')) {
        setAvatarSrc(primaryParent.avatar);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE_URL}/parent/${primaryParent.id}`,
          {
            headers: { Authorization: `Bearer ${storedToken}` },
          }
        );

        const avatar = response.data?.avatar;
        if (avatar?.startsWith('http')) {
          setAvatarSrc(avatar);
        } else if (avatar) {
          setAvatarSrc(`https://bothell-select.onrender.com${avatar}`);
        } else {
          setAvatarSrc(DEFAULT_AVATAR);
        }
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
        setAvatarSrc(DEFAULT_AVATAR);
      }
    };

    fetchAvatar();
  }, [primaryParent?.id, primaryParent?.avatar]);

  if (!player) {
    return <div>No player data found.</div>;
  }

  const uniqueGuardians: Guardian[] = Array.from(
    new Map(mappedGuardians.map((g) => [g.id, g])).values()
  );

  const filteredGuardians = uniqueGuardians.filter(
    (g) =>
      !(
        primaryParent &&
        g.fullName === primaryParent.fullName &&
        g.phone === primaryParent.phone
      )
  );

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='row'>
          <PlayerBreadcrumb player={player} guardians={guardians} />
        </div>
        <div className='row'>
          <PlayerSidebar
            player={player}
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
                  <div className='card-header'>
                    <h5>Parents/Guardians Information</h5>
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
                                  className='img-fluid'
                                />
                              </span>
                              <div className='ms-2 overflow-hidden'>
                                <h6 className='text-truncate'>
                                  {primaryParent.fullName}
                                </h6>
                                <p>{primaryParent.relationship}</p>
                              </div>
                            </div>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <p className='text-dark fw-medium mb-1'>
                              AAU Number
                            </p>
                            <p>{primaryParent.aauNumber}</p>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <p className='text-dark fw-medium mb-1'>Phone</p>
                            <p>
                              {primaryParent.phone
                                ? formatPhoneNumber(primaryParent.phone)
                                : 'N/A'}
                            </p>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <div className='d-flex align-items-center justify-content-between'>
                              <div className='mb-3 overflow-hidden me-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  Email
                                </p>
                                <p className='text-truncate'>
                                  {primaryParent.email || 'N/A'}
                                </p>
                              </div>
                              <button
                                onClick={() => handleViewParent(primaryParent)}
                                className='btn btn-primary btn-sm mb-3'
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {filteredGuardians.length > 0 ? (
                      filteredGuardians.map((guardian) => (
                        <div
                          key={guardian.id}
                          className='border rounded p-3 pb-0 mb-3'
                        >
                          <div className='row'>
                            <div className='col-sm-6 col-lg-3'>
                              <div className='d-flex align-items-center mb-3'>
                                <span className='avatar avatar-lg flex-shrink-0'>
                                  <img
                                    src={guardian.avatar || DEFAULT_AVATAR}
                                    alt={guardian.fullName}
                                    className='img-fluid'
                                  />
                                </span>
                                <div className='ms-2 overflow-hidden'>
                                  <h6 className='text-truncate'>
                                    {guardian.fullName}
                                  </h6>
                                  <p>{guardian.relationship}</p>
                                </div>
                              </div>
                            </div>
                            <div className='col-sm-6 col-lg-3'>
                              <p className='text-dark fw-medium mb-1'>
                                AAU Number
                              </p>
                              <p>{guardian.aauNumber}</p>
                            </div>
                            <div className='col-sm-6 col-lg-3'>
                              <p className='text-dark fw-medium mb-1'>Phone</p>
                              <p>
                                {guardian.phone
                                  ? formatPhoneNumber(guardian.phone)
                                  : 'N/A'}
                              </p>
                            </div>
                            <div className='col-sm-6 col-lg-3'>
                              <div className='d-flex align-items-center justify-content-between'>
                                <div className='mb-3 overflow-hidden me-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    Email
                                  </p>
                                  <p className='text-truncate'>
                                    {guardian.email || 'N/A'}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleViewParent(guardian)}
                                  className='btn btn-primary btn-sm mb-3'
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No parent/guardian data available.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className='col-xxl-12 d-flex'>
                {/* Address Section */}
                <div className='card flex-fill me-4'>
                  <div className='card-header'>
                    <h5>Address</h5>
                  </div>
                  <div className='card-body'>
                    {primaryParent && (
                      <div className='d-flex align-items-center mb-3'>
                        <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                          <i className='ti ti-map-pin-up' />
                        </span>
                        <div>
                          <p className='text-dark fw-medium mb-1'>
                            Primary Parent Address
                          </p>
                          <p>{formatAddress(primaryParent.address)}</p>
                        </div>
                      </div>
                    )}
                    {filteredGuardians
                      .filter(
                        (g) =>
                          formatAddress(g.address) !==
                          formatAddress(primaryParent?.address)
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
                  <div className='card-body pb-1'>
                    <div className='row'>
                      <div className='mb-3'>
                        <p className='text-dark fw-medium mb-1'>
                          {player.healthConcerns || 'No Medical History'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* /Medical History */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDetails;
