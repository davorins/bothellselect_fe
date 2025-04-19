import React from 'react';
import { all_routes } from '../../../router/all_routes';
import { Link, useParams, useLocation } from 'react-router-dom';

interface ParentBreadcrumbProps {
  parent?: any;
}

const ParentBreadcrumb: React.FC<ParentBreadcrumbProps> = ({ parent }) => {
  const routes = all_routes;
  const { parentId } = useParams<{ parentId: string }>();
  const location = useLocation();
  const parentData = parent || location.state?.parent;

  const currentParentId = parentData?._id || parentData?.parentId || parentId;

  return (
    <div className='col-md-12'>
      <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
        <div className='my-auto mb-2'>
          <h3 className='page-title mb-1'>Parent Details</h3>
          <nav>
            <ol className='breadcrumb mb-0'>
              <li className='breadcrumb-item'>
                <Link to={routes.adminDashboard}>Dashboard</Link>
              </li>
              <li className='breadcrumb-item'>
                <Link to={routes.parentList}>Parents</Link>
              </li>
              <li className='breadcrumb-item active' aria-current='page'>
                {parentData
                  ? parentData.name || parentData.fullName
                  : 'Parent Details'}
              </li>
            </ol>
          </nav>
        </div>
        <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
          <Link
            to={`${routes.editParent}/${currentParentId}`}
            state={{
              parent: parentData,
              parentId: currentParentId,
              from: location.pathname,
            }}
            className='btn btn-primary d-flex align-items-center mb-2'
          >
            <i className='ti ti-edit-circle me-2' />
            Edit Parent
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ParentBreadcrumb;
