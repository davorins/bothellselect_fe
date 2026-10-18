import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { formatPhoneNumber } from '../../../../utils/phone';
import { getAvatarUrl } from '../../../../utils/r2Utils';
import {
  getParentAvatar,
  getCoachAvatar,
  resolveParentDefaultAvatar,
} from '../../../../utils/avatarUtils';
import {
  formatAddress,
  Address,
  AddressShowConfig,
} from '../../../../utils/address';
import { useDynamicFormFields } from '../../../hooks/useDynamicFormFields';

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
  relationship?: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const getParentPaymentLabel = (parent: any): string => {
  if (parent?.isCoach) return 'All Paid';

  const players: any[] = parent?.players || [];
  if (players.length === 0) return 'Inactive';

  const allSeasons: any[] = players.flatMap((p: any) => p.seasons || []);

  if (allSeasons.length === 0) {
    const anyPaid = players.some(
      (p: any) => p.paymentComplete === true || p.paymentStatus === 'paid',
    );
    return anyPaid ? 'All Paid' : 'Inactive';
  }

  const paidCount = allSeasons.filter(
    (s: any) => s.paymentStatus === 'paid' || s.paymentComplete === true,
  ).length;
  const total = allSeasons.length;

  if (paidCount === total) return 'All Paid';
  if (paidCount > 0) return `${paidCount}/${total} Paid`;
  return 'No Payments';
};

interface ParentSidebarProps {
  parent: ParentData;
}

const ParentSidebar: React.FC<ParentSidebarProps> = ({ parent }) => {
  const [avatarSrc, setAvatarSrc] = useState<string>(() => {
    // ✅ Single source of truth
    const defaultAvatar = resolveParentDefaultAvatar(parent);
    return getAvatarUrl(parent?.avatar || parent?.imgSrc, defaultAvatar);
  });

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

  useEffect(() => {
    const fetchAvatarUrlFromBackend = async () => {
      const token = localStorage.getItem('token');
      const parentId = parent?._id;
      if (!token || !parentId) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const fetchedRelationship =
          response.data.relationship || parent?.relationship;

        // ✅ Single source of truth
        const defaultAvatar = resolveParentDefaultAvatar({
          isCoach: parent?.isCoach,
          relationship: fetchedRelationship,
        });

        setAvatarSrc(getAvatarUrl(response.data.avatar, defaultAvatar));
      } catch (err) {
        console.error('Failed to fetch avatar:', err);
      }
    };
    fetchAvatarUrlFromBackend();
  }, [
    parent?._id,
    parent?.isCoach,
    parent?.avatar,
    parent?.imgSrc,
    parent?.relationship,
  ]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // ✅ Single source of truth
    e.currentTarget.src = resolveParentDefaultAvatar(parent);
  };

  if (!parent) return <div>No parent data found.</div>;

  const getDisplayName = () => parent.fullName || parent.name || 'N/A';

  const fmtAddr = (addr: string | LooseAddress | undefined) =>
    formatAddress(addr as Address | string | null | undefined, addrShow);

  const statusLabel = getParentPaymentLabel(parent);

  const badgeColor =
    statusLabel === 'All Paid'
      ? 'success'
      : statusLabel === 'Inactive'
        ? 'danger'
        : 'warning';

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
                  className={`badge badge-soft-${badgeColor} d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 text-${badgeColor}`}
                  />
                  {statusLabel}
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
