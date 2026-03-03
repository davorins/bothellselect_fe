import React from 'react';
import { all_routes } from '../../../router/all_routes';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { showDeleteConfirm } from '../../../components/modals/DeleteConfirmModal';

interface ParentBreadcrumbProps {
  parent?: any;
  onDeleteSuccess?: () => void;
}

const ParentBreadcrumb: React.FC<ParentBreadcrumbProps> = ({
  parent,
  onDeleteSuccess,
}) => {
  const routes = all_routes;
  const { parentId } = useParams<{ parentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const parentData = parent || location.state?.parent;
  const { currentUser } = useAuth();

  const currentParentId = parentData?._id || parentData?.parentId || parentId;

  const handleDelete = () => {
    if (!parentData) return;

    showDeleteConfirm(
      {
        _id: currentParentId,
        fullName: parentData.fullName || parentData.name || 'this user',
        email: parentData.email,
        type: parentData.isCoach ? 'coach' : parentData.type || 'parent',
        isCoach: parentData.isCoach || false,
      },
      {
        onDeleteSuccess: () => {
          if (onDeleteSuccess) {
            onDeleteSuccess();
          } else {
            // Redirect to parent list after successful delete
            navigate(routes.parentList);
          }
        },
        customTitle: parentData.isCoach
          ? 'Delete Coach Account'
          : 'Delete Parent Account',
        customContent: parentData.isCoach ? undefined : (
          <div>
            <p>Are you sure you want to delete this parent account?</p>
            <p>
              <strong>Name:</strong> {parentData.fullName || parentData.name}
            </p>
            <p>
              <strong>Email:</strong> {parentData.email || 'N/A'}
            </p>
            <div
              className='alert alert-danger mt-2 p-2'
              style={{ fontSize: '14px' }}
            >
              <i className='ti ti-alert-triangle me-2'></i>
              This action cannot be undone. This will permanently delete:
              <ul className='mt-2 mb-0'>
                <li>The parent's personal information</li>
                <li>All associated player profiles</li>
                <li>All guardian information</li>
                <li>Registration history and payment records</li>
              </ul>
            </div>
          </div>
        ),
      },
    );
  };

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
        {currentUser && currentUser.role === 'admin' && (
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap gap-2'>
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

            <button
              onClick={handleDelete}
              className='btn btn-danger d-flex align-items-center mb-2'
            >
              <i className='ti ti-trash me-2' />
              Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentBreadcrumb;
