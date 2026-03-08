import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { formatPhoneNumber } from '../../../../utils/phone';
import { getAvatarUrl, getDefaultAvatar } from '../../../../utils/r2Utils';
import { getParentStatus } from '../../../../utils/parentUtils';
import {
  formatAddress,
  Address,
  AddressShowConfig,
} from '../../../../utils/address';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';

// API data may omit street2
type LooseAddress = Omit<Address, 'street2'> & { street2?: string };

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
  address?: string | LooseAddress;
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
    const defaultAvatar = getDefaultAvatar(
      parent?.isCoach ? 'coach' : 'parent',
    );
    return getAvatarUrl(parent?.avatar || parent?.imgSrc, defaultAvatar);
  });

  // ── Dynamic fields ──────────────────────────────────────────────────────
  const { getVisibleFields: getParentVisibleFields } = useDynamicFormFields(
    'parent',
    { registrationYear: parent?.registrationYear || new Date().getFullYear() },
  );

  const parentVisibleFields = useMemo(
    () => getParentVisibleFields({} as any),
    [getParentVisibleFields],
  );

  const hasField = (name: string) =>
    parentVisibleFields.some((f) => f.fieldName === name);

  const addrShow: AddressShowConfig = {
    street: hasField('address'),
    city: hasField('city'),
    state: hasField('state'),
    zip: hasField('zip'),
  };
  const hasAnyAddressField = Object.values(addrShow).some(Boolean);

  // ── Avatar fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAvatarUrlFromBackend = async () => {
      const token = localStorage.getItem('token');
      const parentId = parent?._id;
      if (!token || !parentId) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const defaultAvatar = getDefaultAvatar(
          parent?.isCoach ? 'coach' : 'parent',
        );
        setAvatarSrc(getAvatarUrl(response.data.avatar, defaultAvatar));
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
      }
    };
    fetchAvatarUrlFromBackend();
  }, [parent?._id, parent?.isCoach, parent?.avatar, parent?.imgSrc]);

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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = getDefaultAvatar(
      parent?.isCoach ? 'coach' : 'parent',
    );
  };

  if (!parent) return <div>No parent data found.</div>;

  const getDisplayName = () => parent.fullName || parent.name || 'N/A';

  const fmtAddr = (addr: string | LooseAddress | undefined) =>
    formatAddress(addr as Address | string | null | undefined, addrShow);

  const calculatedStatus = getParentStatus(parent as any);

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
                    calculatedStatus === 'Active'
                      ? 'success'
                      : calculatedStatus === 'Pending Payment'
                        ? 'warning'
                        : 'danger'
                  } d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 ${
                      calculatedStatus === 'Active'
                        ? 'text-success'
                        : calculatedStatus === 'Pending Payment'
                          ? 'text-warning'
                          : 'text-danger'
                    }`}
                  />
                  {calculatedStatus}
                </span>
                <h5 className='mb-1 text-truncate'>{getDisplayName()}</h5>
              </div>
            </div>
          </div>

          <div className='card-body'>
            <h5 className='mb-3'>Basic Information</h5>
            <dl className='row mb-0'>
              {hasField('phone') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>Phone</dt>
                  <dd className='col-6 mb-3'>
                    {parent.phone ? formatPhoneNumber(parent.phone) : 'N/A'}
                  </dd>
                </>
              )}

              {hasField('email') && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>Email</dt>
                  <dd className='col-6 mb-3'>{parent.email || 'N/A'}</dd>
                </>
              )}

              {hasAnyAddressField && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>Address</dt>
                  <dd className='col-6 mb-3'>
                    {fmtAddr(parent.address) || 'N/A'}
                  </dd>
                </>
              )}

              {(hasField('isCoach') || parent.isCoach) && (
                <>
                  <dt className='col-6 fw-medium text-dark mb-3'>AAU Number</dt>
                  <dd className='col-6 mb-3'>{parent.aauNumber || 'N/A'}</dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentSidebar;
