import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import TooltipOption from '../../../core/common/tooltipOption';
import { useAuth } from '../../../context/AuthContext';
import {
  exportParentsToPDF,
  exportParentsToExcel,
  exportEmailList,
  copyEmailListToClipboard,
} from '../../components/Tables/ParentTableColumns';

interface ParentListHeaderProps {
  seasonParam: string | null;
  yearParam: string | null;
  parentData: any[];
}

export const ParentListHeader: React.FC<ParentListHeaderProps> = ({
  seasonParam,
  yearParam,
  parentData,
}) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isListView = location.pathname === all_routes.parentList;

  const handleExportPDF = () => {
    exportParentsToPDF(parentData);
  };

  const handleExportExcel = () => {
    exportParentsToExcel(parentData);
  };

  const handleExportEmail = () => {
    exportEmailList(parentData);
  };

  const handleCopyEmails = () => {
    copyEmailListToClipboard(parentData);
  };

  return (
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
      {currentUser && currentUser.role === 'admin' && (
        <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
          <TooltipOption
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportEmails={isListView ? handleExportEmail : undefined}
            onCopyEmails={isListView ? handleCopyEmails : undefined}
            showEmailExport={isListView}
            showCopyEmails={isListView}
          />
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
      )}
    </div>
  );
};
