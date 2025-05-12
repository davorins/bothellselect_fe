import React, { useEffect, useState } from 'react';
import { formatDate } from '../../../../utils/dateFormatter';
import axios from 'axios';
import { isPlayerActive } from '../../../../utils/season';
import { useAuth } from '../../../../context/AuthContext';
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
  const { user } = useAuth();

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

  const getParentStatus = (parentData: ParentData): 'Active' | 'Inactive' => {
    const hasActivePlayers = parentData.players?.some((player) =>
      isPlayerActive(player)
    );

    return hasActivePlayers ? 'Active' : 'Inactive';
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
                    getParentStatus(parent) === 'Active' ? 'success' : 'danger'
                  } d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 ${
                      getParentStatus(parent) === 'Active'
                        ? 'text-success'
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
