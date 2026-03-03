import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatPhoneNumber } from '../../../../utils/phone';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';
import { getParentStatus } from '../../../../utils/parentUtils';

interface ParentData {
  _id?: string;
  name?: string;
  fullName?: string;
  status?: string;
  DateofJoin?: string | Date;
  createdAt?: string | Date;
  imgSrc?: string;
  avatar?: string;
  aauNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  players?: any[];
  season?: string;
  registrationYear?: number;
  registrationComplete?: boolean;
  paymentComplete?: boolean;
  isCoach?: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface ParentSidebarProps {
  parent: ParentData;
}

const ParentSidebar: React.FC<ParentSidebarProps> = ({ parent }) => {
  const [avatarSrc, setAvatarSrc] = useState<string>(() => {
    // Initial avatar based on props
    const defaultAvatar = getDefaultAvatar(
      parent?.isCoach ? 'coach' : 'parent',
    );
    return getAvatarUrl(parent?.avatar || parent?.imgSrc, defaultAvatar);
  });

  // Fetch avatar from backend - MUST be called before any conditional returns
  useEffect(() => {
    const fetchAvatarUrlFromBackend = async () => {
      const token = localStorage.getItem('token');
      const parentId = parent?._id;

      if (!token || !parentId) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const avatarUrl = response.data.avatar;
        const defaultAvatar = getDefaultAvatar(
          parent?.isCoach ? 'coach' : 'parent',
        );

        setAvatarSrc(getAvatarUrl(avatarUrl, defaultAvatar));
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
        // Keep existing avatar on error
      }
    };

    fetchAvatarUrlFromBackend();
  }, [parent?._id, parent?.isCoach, parent?.avatar, parent?.imgSrc]);

  // Debug log to see what's happening - MUST be called before any conditional returns
  useEffect(() => {
    if (parent) {
      console.log('👪 ParentSidebar - Parent:', {
        name: parent.fullName,
        isCoach: parent.isCoach,
        playersCount: parent.players?.length,
        players: parent.players?.map((p) => ({
          name: p.fullName,
          seasons: p.seasons,
          season: p.season,
          registrationYear: p.registrationYear,
          paymentComplete: p.paymentComplete,
        })),
      });
    }
  }, [parent]);

  // Handle image load error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = getDefaultAvatar(
      parent?.isCoach ? 'coach' : 'parent',
    );
  };

  // NOW we can have conditional returns after all hooks
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

  // Calculate the parent status using the utility function
  const calculatedStatus = getParentStatus(parent as any);
  const displayStatus = calculatedStatus;

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
                  onError={handleImageError}
                />
              </div>
              <div className='overflow-hidden'>
                <span
                  className={`badge badge-soft-${
                    displayStatus === 'Active'
                      ? 'success'
                      : displayStatus === 'Pending Payment'
                        ? 'warning'
                        : 'danger'
                  } d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 ${
                      displayStatus === 'Active'
                        ? 'text-success'
                        : displayStatus === 'Pending Payment'
                          ? 'text-warning'
                          : 'text-danger'
                    }`}
                  />
                  {displayStatus}
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
