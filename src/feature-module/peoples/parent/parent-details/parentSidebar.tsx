import React from 'react';
import { formatDate } from '../../../../utils/dateFormatter';

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
}

interface ParentSidebarProps {
  parent: ParentData;
}

const ParentSidebar: React.FC<ParentSidebarProps> = ({ parent }) => {
  if (!parent) {
    return <div>No parent data found.</div>;
  }

  const getDisplayName = () => parent.fullName || parent.name || 'N/A';
  const getJoinDate = () => parent.DateofJoin || parent.createdAt;

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

  return (
    <div className='col-xxl-3 col-xl-4 theiaStickySidebar'>
      <div className='stickybar pb-4'>
        <div className='card border-white'>
          <div className='card-header'>
            <div className='d-flex align-items-center flex-wrap row-gap-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                <img
                  src={
                    parent.imgSrc && parent.imgSrc.trim() !== ''
                      ? `https://bothell-select.onrender.com${parent.imgSrc}`
                      : 'https://bothell-select.onrender.com/uploads/avatars/parents.png'
                  }
                  className='img-fluid'
                  alt={`${getDisplayName()} avatar`}
                />
              </div>
              <div className='overflow-hidden'>
                <span className='badge badge-soft-success d-inline-flex align-items-center mb-1'>
                  <i className='ti ti-circle-filled fs-5 me-1' />
                  {parent.status || 'Active'}
                </span>
                <h5 className='mb-1 text-truncate'>{getDisplayName()}</h5>
                <p className='mb-1'>
                  Member since:{' '}
                  {getJoinDate() ? formatDate(getJoinDate()) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className='card-body'>
            <h5 className='mb-3'>Basic Information</h5>
            <dl className='row mb-0'>
              <dt className='col-6 fw-medium text-dark mb-3'>Phone</dt>
              <dd className='col-6 mb-3'>{parent.phone || 'N/A'}</dd>

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
