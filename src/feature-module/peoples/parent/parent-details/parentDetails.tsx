import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import ParentSidebar from './parentSidebar';
import ParentBreadcrumb from './parentBreadcrumb';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import axios from 'axios';
import { formatDate } from '../../../../utils/dateFormatter';
import { formatPhoneNumber } from '../../../../utils/phone';

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

interface PaymentData {
  _id: string;
  amount: number;
  createdAt: string;
  cardBrand?: string;
  cardLastFour?: string;
  receiptUrl?: string;
}

const ParentDetails = () => {
  const location = useLocation();
  const { parentId } = useParams<{ parentId?: string }>();
  const navigate = useNavigate();
  const { user, fetchParentData } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [parent, setParent] = useState(location.state?.parent || null);
  const [players, setPlayers] = useState<Player[]>(
    location.state?.players || []
  );
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [activeTab, setActiveTab] = useState('family');
  const [isLoading, setIsLoading] = useState(!location.state?.parent);
  const prevParentIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!parentId || prevParentIdRef.current === parentId) return;

    const loadParent = async () => {
      setIsLoading(true);
      try {
        const parentData = await fetchParentData(parentId);
        if (!parentData) throw new Error('Parent not found');

        // Format avatar URL if needed
        const formattedParent = {
          ...parentData,
          avatar:
            parentData.avatar && !parentData.avatar.startsWith('http')
              ? `https://bothell-select.onrender.com${parentData.avatar}`
              : parentData.avatar,
        };

        setParent(formattedParent);

        // Format player avatar URLs
        const formattedPlayers = (parentData.players || []).map((player) => ({
          ...player,
          imgSrc:
            player.avatar && !player.avatar.startsWith('http')
              ? `https://bothell-select.onrender.com${player.avatar}`
              : player.avatar,
        }));

        setPlayers(formattedPlayers);

        if (user?.role === 'admin') {
          const token = localStorage.getItem('token');
          const res = await axios.get(
            `${API_BASE_URL}/payments/parent/${parentId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setPayments(res.data || []);
        }
      } catch (err) {
        console.error(err);
        navigate(all_routes.parentList);
      } finally {
        setIsLoading(false);
      }
    };

    loadParent();
    prevParentIdRef.current = parentId;
  }, [parentId, fetchParentData, navigate, user?.role, API_BASE_URL]);

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
    } catch {
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

  const getDefaultAvatar = (gender?: string): string => {
    const baseUrl = 'https://bothell-select.onrender.com/uploads/avatars';
    return gender === 'Female' ? `${baseUrl}/girl.png` : `${baseUrl}/boy.png`;
  };

  const mappedGuardians: GuardianData[] = parent?.additionalGuardians
    ? parent.additionalGuardians.map((guardian: any) => ({
        id: guardian._id || guardian.id,
        fullName: guardian.fullName,
        phone: guardian.phone,
        email: guardian.email,
        address: guardian.address,
        relationship: guardian.relationship || 'Guardian',
        avatar:
          guardian.avatar && !guardian.avatar.startsWith('http')
            ? `https://bothell-select.onrender.com${guardian.avatar}`
            : guardian.avatar ||
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
            {/* Tab Navigation - Only show tabs for admin */}
            {user?.role === 'admin' && (
              <div className='card mb-4'>
                <div className='card-header p-0 border-0'>
                  <ul className='nav nav-tabs nav-justified' role='tablist'>
                    <li className='nav-item' role='presentation'>
                      <button
                        className={`nav-link ${
                          activeTab === 'family' ? 'active' : ''
                        }`}
                        onClick={() => setActiveTab('family')}
                      >
                        <i className='ti ti-users me-2'></i>
                        Family Information
                      </button>
                    </li>
                    <li className='nav-item' role='presentation'>
                      <button
                        className={`nav-link ${
                          activeTab === 'payments' ? 'active' : ''
                        } ${payments.length === 0 ? 'text-danger' : ''}`}
                        onClick={() => setActiveTab('payments')}
                      >
                        <i
                          className={`ti ti-credit-card me-2 ${
                            payments.length === 0 ? 'text-danger' : ''
                          }`}
                        ></i>
                        {payments.length === 0
                          ? 'No Payment History'
                          : 'Payment History'}
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className='tab-content pt-0'>
              {/* Family Information Tab - shown to parent user and admins */}
              {(user?.role === 'admin' || user?._id === parent?._id) && (
                <>
                  {/* Family Information Tab */}
                  {(user?.role !== 'admin' || activeTab === 'family') && (
                    <div className='tab-pane fade show active'>
                      {/* Guardians Section */}
                      <div className='card mb-4'>
                        <div className='card-header'>
                          <h5 className='card-title mb-0'>
                            Guardians Information
                          </h5>
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
                                          src={guardian.avatar}
                                          className='img-fluid rounded'
                                          alt={`${guardian.fullName} avatar`}
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.src =
                                              'https://bothell-select.onrender.com/uploads/avatars/parents.png';
                                          }}
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
                                      <p>
                                        {guardian.phone
                                          ? formatPhoneNumber(guardian.phone)
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className='col-sm-6 col-lg-3'>
                                    <div className='mb-3 overflow-hidden me-3'>
                                      <p className='text-dark fw-medium mb-1'>
                                        Email
                                      </p>
                                      <p className='text-truncate'>
                                        {guardian.email || 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className='text-muted'>
                              No additional guardians data available.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Players Section */}
                      <div className='card'>
                        <div className='card-header'>
                          <h5 className='card-title mb-0'>
                            Players Information
                          </h5>
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
                                    <div className='d-flex align-items-center mb-3'>
                                      <span className='avatar avatar-lg flex-shrink-0'>
                                        <img
                                          src={
                                            player.imgSrc
                                              ? player.imgSrc.includes(
                                                  'res.cloudinary.com'
                                                )
                                                ? `${
                                                    player.imgSrc
                                                  }?${Date.now()}`
                                                : player.imgSrc
                                              : getDefaultAvatar(player.gender)
                                          }
                                          className='img-fluid'
                                          alt={`${player.fullName} avatar`}
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.src = getDefaultAvatar(
                                              player.gender
                                            );
                                          }}
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
                                    <div className='mb-3'>
                                      <p className='text-dark fw-medium mb-1'>
                                        Age
                                      </p>
                                      <p>{calculateAge(player.dob)}</p>
                                    </div>
                                  </div>
                                  <div className='col-sm-6 col-lg-3'>
                                    <div className='mb-3'>
                                      <p className='text-dark fw-medium mb-1'>
                                        AAU Number
                                      </p>
                                      <p>{player.aauNumber || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className='col-sm-6 col-lg-2'>
                                    <div className='mb-3'>
                                      <p className='text-dark fw-medium mb-1'>
                                        Grade
                                      </p>
                                      <p>{player.grade || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className='col-sm-6 col-lg-1'>
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
                            <p className='text-muted'>
                              No players data available.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payments Tab - only for admin */}
                  {user?.role === 'admin' && activeTab === 'payments' && (
                    <div className='tab-pane fade show active'>
                      <div className='card'>
                        <div className='card-header'>
                          <h5 className='card-title mb-0'>Payment History</h5>
                        </div>
                        <div className='card-body'>
                          {payments.length > 0 ? (
                            <div className='table-responsive'>
                              <table className='table table-hover'>
                                <thead className='table-light'>
                                  <tr>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Payment Method</th>
                                    <th>Receipt</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {payments.map((payment) => (
                                    <tr key={payment._id}>
                                      <td>${payment.amount.toFixed(2)}</td>
                                      <td>{formatDate(payment.createdAt)}</td>
                                      <td>
                                        {payment.cardBrand &&
                                        payment.cardBrand !== 'UNKNOWN'
                                          ? payment.cardBrand
                                          : 'Card'}{' '}
                                        ending in{' '}
                                        {payment.cardLastFour &&
                                        payment.cardLastFour !== '****'
                                          ? payment.cardLastFour
                                          : '••••'}
                                      </td>
                                      <td>
                                        {payment.receiptUrl && (
                                          <a
                                            href={payment.receiptUrl}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='btn btn-sm btn-outline-primary'
                                          >
                                            View
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className='alert alert-danger d-flex align-items-center'>
                              <i className='ti ti-alert-circle me-2'></i>
                              <span>
                                No payment record found —{' '}
                                <strong>Not Paid</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDetails;
