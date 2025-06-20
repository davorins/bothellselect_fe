import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  isPlayerActive,
  getCurrentSeason,
  getNextSeason,
  getCurrentYear,
} from '../../../../utils/season';
import { formatPhoneNumber } from '../../../../utils/phone';

interface ParentData {
  _id?: string;
  name?: string;
  fullName?: string;
  status?: string;
  DateofJoin?: string | Date;
  createdAt?: string | Date;
  imgSrc?: string;
  aauNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  players?: any[];
  season?: string;
  registrationYear?: number;
  registrationComplete?: boolean;
  paymentComplete?: boolean;
}

interface PaymentData {
  _id: string;
  amount: number;
  createdAt: string;
  cardBrand?: string;
  cardLastFour?: string;
  receiptUrl?: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const DEFAULT_AVATAR =
  'https://bothell-select.onrender.com/uploads/avatars/parents.png';

interface ParentSidebarProps {
  parent: ParentData;
}

const ParentSidebar: React.FC<ParentSidebarProps> = ({ parent }) => {
  const [avatarSrc, setAvatarSrc] = useState<string>(DEFAULT_AVATAR);
  const [payments, setPayments] = useState<PaymentData[]>([]);

  useEffect(() => {
    const fetchAvatarUrlFromBackend = async () => {
      const token = localStorage.getItem('token');
      const parentId = parent._id;

      if (!token || !parentId) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const avatarUrl = response.data.avatar;

        if (avatarUrl && avatarUrl.startsWith('http')) {
          setAvatarSrc(avatarUrl);
        } else {
          setAvatarSrc(DEFAULT_AVATAR);
        }
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
        setAvatarSrc(DEFAULT_AVATAR);
      }
    };

    fetchAvatarUrlFromBackend();
  }, [parent._id]);

  useEffect(() => {
    const fetchPayments = async () => {
      const token = localStorage.getItem('token');
      const parentId = parent._id;

      if (!token || !parentId) return;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/payments/parent/${parentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPayments(res.data || []);
      } catch (err) {
        console.error('Failed to fetch payments:', err);
      }
    };

    fetchPayments();
  }, [parent._id]);

  if (!parent) {
    return <div>No parent data found.</div>;
  }

  const getDisplayName = () => parent.fullName || parent.name || 'N/A';

  const formatAddress = (address: any): string => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;

    const parts = [
      address.street,
      address.street2,
      `${address.city}, ${address.state} ${address.zip}`.trim(),
    ].filter((part) => part && part.trim() !== '');

    return parts.join(', ');
  };

  const getParentStatus = (
    parentData: ParentData
  ): 'Active' | 'Inactive' | 'Pending Payment' => {
    const currentSeason = getCurrentSeason();
    const currentYear = getCurrentYear();
    const nextSeason = getNextSeason();
    const nextSeasonYear =
      currentSeason === 'Winter' ? currentYear + 1 : currentYear;

    // Check players for current/next season registrations
    const hasCurrentSeasonPlayers = parentData.players?.some(
      (player) =>
        player.season === currentSeason &&
        player.registrationYear === currentYear
    );
    const hasNextSeasonPlayers = parentData.players?.some(
      (player) =>
        player.season === nextSeason &&
        player.registrationYear === nextSeasonYear
    );

    // Check payment status for current/next season players
    const hasPendingPayments = parentData.players?.some((player) => {
      const isCurrentOrNext =
        (player.season === currentSeason &&
          player.registrationYear === currentYear) ||
        (player.season === nextSeason &&
          player.registrationYear === nextSeasonYear);

      return (
        isCurrentOrNext &&
        player.registrationComplete &&
        !player.paymentComplete
      );
    });

    const hasActivePlayers = parentData.players?.some(
      (player) => isPlayerActive(player) && player.paymentComplete
    );

    if (hasActivePlayers) return 'Active';
    if (hasPendingPayments) return 'Pending Payment';
    if (hasCurrentSeasonPlayers || hasNextSeasonPlayers)
      return 'Pending Payment'; // Fallback if payment status not available
    return 'Inactive';
  };

  return (
    <div className='col-xxl-3 col-xl-4 theiaStickySidebar'>
      <div className='stickybar pb-4'>
        <div className='card border-white'>
          <div className='card-header'>
            <div className='d-flex align-items-center flex-wrap row-gap-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                <img
                  src={avatarSrc}
                  className='img-fluid'
                  alt={`${getDisplayName()} avatar`}
                />
              </div>
              <div className='overflow-hidden'>
                <span
                  className={`badge badge-soft-${
                    getParentStatus(parent) === 'Active'
                      ? 'success'
                      : getParentStatus(parent) === 'Pending Payment'
                      ? 'warning'
                      : 'danger'
                  } d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 ${
                      getParentStatus(parent) === 'Active'
                        ? 'text-success'
                        : getParentStatus(parent) === 'Pending Payment'
                        ? 'text-warning'
                        : 'text-danger'
                    }`}
                  />
                  {getParentStatus(parent)}
                </span>
                <h5 className='mb-1 text-truncate'>{getDisplayName()}</h5>
              </div>
            </div>
          </div>

          <div className='card-body'>
            <h5 className='mb-3'>Basic Information</h5>
            <dl className='row mb-0'>
              <dt className='col-6 fw-medium text-dark mb-3'>Phone</dt>
              <dd className='col-6 mb-3'>
                {parent.phone ? formatPhoneNumber(parent.phone) : 'N/A'}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Email</dt>
              <dd className='col-6 mb-3'>{parent.email || 'N/A'}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Address</dt>
              <dd className='col-6 mb-3'>
                {formatAddress(parent.address || 'N/A')}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>AAU Number</dt>
              <dd className='col-6 mb-3'>{parent.aauNumber || 'N/A'}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentSidebar;
