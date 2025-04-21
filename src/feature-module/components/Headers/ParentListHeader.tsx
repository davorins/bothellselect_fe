import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import TooltipOption from '../../../core/common/tooltipOption';

interface ParentListHeaderProps {
  seasonParam: string | null;
  yearParam: string | null;
}

export const ParentListHeader: React.FC<ParentListHeaderProps> = ({
  seasonParam,
  yearParam,
}) => (
  <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
    <div className='my-auto mb-2'>
      <div className='my-auto mb-2'>
        <h3 className='page-title mb-1'>Parents & Guardians List</h3>
      </div>
      {seasonParam && yearParam && (
        <div className='text-muted'>
          Showing players for: {seasonParam} {yearParam}
        </div>
      )}
      <nav>
        <ol className='breadcrumb mb-0'>
          <li className='breadcrumb-item'>
            <Link to={all_routes.adminDashboard}>Dashboard</Link>
          </li>
          <li className='breadcrumb-item'>Parents</li>
          <li className='breadcrumb-item active' aria-current='page'>
            All Parents & Guardians
          </li>
        </ol>
      </nav>
    </div>
    <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
      <TooltipOption />
      <div className='mb-2'>
        <Link
          to={all_routes.addParent}
          className='btn btn-primary d-flex align-items-center'
        >
          <i className='ti ti-square-rounded-plus me-2' />
          Add Parent
        </Link>
      </div>
    </div>
  </div>
);
