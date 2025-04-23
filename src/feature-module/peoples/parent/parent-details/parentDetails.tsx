import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import ParentSidebar from './parentSidebar';
import ParentBreadcrumb from './parentBreadcrumb';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';

interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address:
    | string
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      };
  relationship: string;
  avatar?: string;
  aauNumber: string;
  isPrimary?: boolean;
}

interface Player {
  _id: string;
  fullName: string;
  grade: string;
  aauNumber: string;
  status: string;
  imgSrc?: string;
  dob: string;
  gender?: string;
}

const ParentDetails = () => {
  const location = useLocation();
  const { parentId } = useParams();
  const navigate = useNavigate();
  const { fetchParentData, user } = useAuth();

  // Initialize state from location or empty
  const [parent, setParent] = useState(location.state?.parent || null);
  const [players, setPlayers] = useState<Player[]>(
    location.state?.players || []
  );
  const [isLoading, setIsLoading] = useState(!location.state?.parent);

  // Function to calculate age from date of birth
  const calculateAge = (dob: string): string => {
    if (!dob) return 'N/A';

    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age.toString();
    } catch (error) {
      console.error('Error calculating age:', error);
      return 'N/A';
    }
  };

  const handleViewPlayer = (player: Player) => {
    navigate(`${all_routes.playerDetail}/${player._id}`, {
      state: {
        player,
        guardians: parent
          ? [parent, ...(parent.additionalGuardians || [])]
          : [],
        siblings: players.filter((p) => p._id !== player._id),
      },
    });
  };

  useEffect(() => {
    const loadParent = async () => {
      if ((!parent || !players.length) && parentId) {
        try {
          setIsLoading(true);
          const parentData = await fetchParentData(parentId);
          if (parentData) {
            setParent(parentData);
            if (parentData.players) {
              setPlayers(parentData.players);
            }
          } else {
            navigate(all_routes.parentList);
          }
        } catch (error) {
          console.error('Error loading parent:', error);
          navigate(all_routes.parentList);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadParent();
  }, [parent, players, parentId, fetchParentData, navigate]);

  const getDefaultAvatar = (gender: string | undefined): string => {
    const baseUrl = 'https://bothell-select.onrender.com/uploads/avatars';
    return gender === 'Female' ? `${baseUrl}/girl.png` : `${baseUrl}/boy.png`;
  };

  // Map additional guardians only (excluding primary parent)
  const mappedGuardians: GuardianData[] = parent?.additionalGuardians
    ? parent.additionalGuardians.map((guardian: any) => ({
        id: guardian._id || guardian.id,
        fullName: guardian.fullName,
        phone: guardian.phone,
        email: guardian.email,
        address: guardian.address,
        relationship: guardian.relationship || 'Guardian',
        avatar:
          guardian.avatar ||
          'https://bothell-select.onrender.com/uploads/avatars/parents.png',
        aauNumber: guardian.aauNumber || 'Not Available',
        isPrimary: false,
      }))
    : [];

  if (isLoading) return <div className='loading-spinner'>Loading...</div>;
  if (!parent) return <div>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='row'>
          <ParentBreadcrumb parent={parent} />
        </div>
        <div className='row'>
          <ParentSidebar parent={parent} />
          <div className='col-xxl-9 col-xl-8'>
            <div className='row'>
              {/* Guardians Information Section - Now shows only additional guardians */}
              <div className='col-md-12'>
                <div className='card'>
                  <div className='card-header'>
                    <h5>Additional Guardians Information</h5>
                  </div>
                  <div className='card-body'>
                    {mappedGuardians.length > 0 ? (
                      mappedGuardians.map((guardian) => (
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
                                {user?.role === 'admin' && (
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
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No additional guardians data available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Players Information Section with Age */}
              <div className='col-md-12'>
                <div className='card'>
                  <div className='card-header'>
                    <h5>Players Information</h5>
                  </div>
                  <div className='card-body'>
                    {players.length > 0 ? (
                      players.map((player) => (
                        <div
                          key={player._id}
                          className='border rounded p-3 pb-0 mb-3'
                        >
                          <div className='row'>
                            <div className='col-sm-6 col-lg-3'>
                              {' '}
                              {/* Adjusted column width */}
                              <div className='d-flex align-items-center mb-3'>
                                <span className='avatar avatar-lg flex-shrink-0'>
                                  <img
                                    src={
                                      player.imgSrc &&
                                      player.imgSrc.trim() !== ''
                                        ? `https://bothell-select.onrender.com${player.imgSrc}`
                                        : getDefaultAvatar(player.gender)
                                    }
                                    className='img-fluid'
                                    alt={`${player.fullName} avatar`}
                                  />
                                </span>
                                <div className='ms-2 overflow-hidden'>
                                  <h6 className='text-truncate'>
                                    {player.fullName}
                                  </h6>
                                </div>
                              </div>
                            </div>
                            <div className='col-sm-6 col-lg-3'>
                              {' '}
                              {/* Adjusted column width */}
                              <div className='mb-3'>
                                <p className='text-dark fw-medium mb-1'>Age</p>
                                <p>{calculateAge(player.dob)}</p>
                              </div>
                            </div>
                            <div className='col-sm-6 col-lg-3'>
                              {' '}
                              {/* Adjusted column width */}
                              <div className='mb-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  AAU Number
                                </p>
                                <p>{player.aauNumber || 'N/A'}</p>
                              </div>
                            </div>
                            <div className='col-sm-6 col-lg-2'>
                              {' '}
                              {/* Adjusted column width */}
                              <div className='mb-3'>
                                <p className='text-dark fw-medium mb-1'>
                                  Grade
                                </p>
                                <p>{player.grade || 'N/A'}</p>
                              </div>
                            </div>
                            <div className='col-sm-6 col-lg-1'>
                              {' '}
                              {/* Adjusted column width */}
                              <div className='d-flex align-items-center justify-content-end'>
                                <button
                                  onClick={() => handleViewPlayer(player)}
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
                      <p>No player data available.</p>
                    )}
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

export default ParentDetails;
