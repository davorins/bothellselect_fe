import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PlayerSidebar from './playerSidebar';
import PlayerBreadcrumb from './playerBreadcrumb';
import { useAuth } from '../../../../context/AuthContext';

interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  relationship: string;
  avatar?: string;
  aauNumber: string;
  isPrimary?: boolean;
}

interface FetchedGuardianData {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  relationship: string;
  avatar?: string;
  aauNumber: string;
  isPrimary?: boolean;
  additionalGuardians?: FetchedGuardianData[];
}

const PlayerDetails = () => {
  const location = useLocation();
  const player = location.state?.player;
  const guardians = location.state?.guardians;
  const siblings = location.state?.siblings || [];
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuth();

  const formatAddress = (
    address:
      | string
      | {
          street: string;
          street2: string;
          city: string;
          state: string;
          zip: string;
        }
  ): string => {
    if (!address) return '';

    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.street2,
      `${address.city}, ${address.state} ${address.zip}`.trim(),
    ].filter((part) => part && part.trim() !== '');

    return parts.join(', ');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    setToken(storedToken);
  }, []);

  if (!player) {
    return <div>No player data found.</div>;
  }

  // Map the logged-in user (primary parent) to GuardianData
  const primaryParent: GuardianData | null =
    user && user.role !== 'admin'
      ? {
          id: user._id || 'default-id',
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          address: user.address,
          relationship: user.relationship || 'Primary Parent',
          aauNumber: user.aauNumber || 'Not Available',
          isPrimary: true,
        }
      : guardians?.find(
          (guardian: FetchedGuardianData) => guardian.isPrimary
        ) || null;

  // Mapping and deduplication of guardians
  const mappedGuardians: GuardianData[] = guardians
    ? guardians.flatMap((guardian: FetchedGuardianData) => [
        {
          id: guardian._id,
          fullName: guardian.fullName,
          phone: guardian.phone,
          email: guardian.email,
          address: guardian.address,
          relationship: guardian.relationship,
          avatar:
            guardian.avatar ||
            'https://bothell-select.onrender.com/uploads/avatars/parents.png',
          aauNumber: guardian.aauNumber || 'Not Available',
          isPrimary: true,
        },
        ...(guardian.additionalGuardians || []).map(
          (additionalGuardian: FetchedGuardianData) => ({
            id: additionalGuardian._id,
            fullName: additionalGuardian.fullName,
            phone: additionalGuardian.phone,
            email: additionalGuardian.email,
            address: additionalGuardian.address,
            relationship: additionalGuardian.relationship,
            avatar:
              additionalGuardian.avatar ||
              'https://bothell-select.onrender.com/uploads/avatars/parents.png',
            aauNumber: additionalGuardian.aauNumber || 'Not Available',
            isPrimary: false,
          })
        ),
      ])
    : [];

  const uniqueGuardians: GuardianData[] = Array.from(
    new Map(mappedGuardians.map((g) => [g.id, g])).values()
  );

  const filteredGuardians = uniqueGuardians.filter(
    (guardian: GuardianData) => guardian.id !== primaryParent?.id
  );

  return (
    <>
      {/* Page Wrapper */}
      <div className='page-wrapper'>
        <div className='content'>
          <div className='row'>
            {/* Page Header */}
            <PlayerBreadcrumb player={player} guardians={guardians} />
            {/* /Page Header */}
          </div>
          <div className='row'>
            {/* Player Information */}
            <PlayerSidebar
              player={player}
              guardians={filteredGuardians} // Pass filtered guardians
              token={token} // Pass the token state
              primaryParent={primaryParent} // Pass the mapped primary parent
              siblings={siblings} // Pass the siblings data
            />
            {/* /Player Information */}
            <div className='col-xxl-9 col-xl-8'>
              <div className='row'>
                <div className='col-md-12'>
                  {/* Parents/Guardians Information */}
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
                                    src={
                                      primaryParent.avatar &&
                                      primaryParent.avatar.trim() !== ''
                                        ? `https://bothell-select.onrender.com${primaryParent.avatar}`
                                        : 'https://bothell-select.onrender.com/uploads/avatars/parents.png'
                                    }
                                    className='img-fluid'
                                    alt={primaryParent.fullName}
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
                              <div className='d-flex align-items-center justify-content-between'>
                                <div className='mb-3 overflow-hidden me-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    AAU Number
                                  </p>
                                  <p>{primaryParent.aauNumber}</p>
                                </div>
                              </div>
                            </div>
                            <div className='col-sm-6 col-lg-3'>
                              <div className='mb-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  Phone
                                </p>
                                <p>{primaryParent.phone}</p>
                              </div>
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
                                <Link
                                  to='#'
                                  data-bs-toggle='tooltip'
                                  data-bs-placement='top'
                                  aria-label='Reset Password'
                                  data-bs-original-title='Reset Password'
                                  className='btn btn-dark btn-icon btn-sm mb-3'
                                >
                                  <i className='ti ti-lock-x' />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {filteredGuardians.length > 0 ? (
                        filteredGuardians.map((guardian: GuardianData) => (
                          <div
                            key={guardian.id}
                            className='border rounded p-3 pb-0 mb-3'
                          >
                            <div className='row'>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='d-flex align-items-center mb-3'>
                                  <span className='avatar avatar-lg flex-shrink-0'>
                                    <img
                                      src={
                                        'https://bothell-select.onrender.com/uploads/avatars/parents.png'
                                      }
                                      className='img-fluid rounded'
                                      alt={`${guardian.fullName} avatar`}
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
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    AAU Number
                                  </p>
                                  <p>{guardian.aauNumber}</p>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    Phone
                                  </p>
                                  <p>{guardian.phone}</p>
                                </div>
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
                                  <Link
                                    to='#'
                                    data-bs-toggle='tooltip'
                                    data-bs-placement='top'
                                    aria-label='Reset Password'
                                    data-bs-original-title='Reset Password'
                                    className='btn btn-dark btn-icon btn-sm mb-3'
                                  >
                                    <i className='ti ti-lock-x' />
                                  </Link>
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
                  {/* /Parents/Guardians Information */}
                </div>
                <div className='col-xxl-12 d-flex'>
                  {/* Address */}
                  <div className='card flex-fill me-4'>
                    <div className='card-header'>
                      <h5>Address</h5>
                    </div>
                    <div className='card-body'>
                      {/* Primary Parent Address */}
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
                      {/* Guardians' Addresses */}
                      {filteredGuardians.length > 0 ? (
                        filteredGuardians
                          .filter(
                            (guardian: GuardianData) =>
                              guardian.address !== primaryParent?.address
                          ) // Filter out guardians with the same address as the primary parent
                          .map((guardian: GuardianData) => (
                            <div
                              key={guardian.id}
                              className='d-flex align-items-center mb-3'
                            >
                              <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                                <i className='ti ti-map-pins' />
                              </span>
                              <div>
                                <p className='text-dark fw-medium mb-1'>
                                  {guardian.fullName}'s Address
                                </p>
                                <p>{formatAddress(guardian.address)}</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p>No guardian address available.</p>
                      )}
                    </div>
                  </div>
                  {/* /Address */}
                  {/* Medical History */}
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
      {/* /Page Wrapper */}
    </>
  );
};

export default PlayerDetails;
