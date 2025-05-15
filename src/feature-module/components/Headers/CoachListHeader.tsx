import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import TooltipOption from '../../../core/common/tooltipOption';
import { useAuth } from '../../../context/AuthContext';
import {
  exportCoachesToPDF,
  exportCoachesToExcel,
  exportEmailList,
  copyEmailListToClipboard,
} from '../../components/Tables/CoachTableColumns';

interface CoachListHeaderProps {
  seasonParam: string | null;
  yearParam: string | null;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  coachData: any[];
}

export const CoachListHeader: React.FC<CoachListHeaderProps> = ({
  seasonParam,
  yearParam,
  coachData,
}) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isListView = location.pathname === all_routes.coachList;

  const handleExportPDF = () => {
    exportCoachesToPDF(coachData);
  };

  const handleExportExcel = () => {
    exportCoachesToExcel(coachData);
  };

  const handleExportEmail = () => {
    exportEmailList(coachData);
  };

  const handleCopyEmails = () => {
    copyEmailListToClipboard(coachData);
  };

  return (
    <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
      <div className='my-auto mb-2'>
        <div className='my-auto mb-2'>
          <h3 className='page-title mb-1'>Coach List</h3>
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
            <li className='breadcrumb-item'>Coaches</li>
            <li className='breadcrumb-item active' aria-current='page'>
              All Coaches
            </li>
          </ol>
        </nav>
      </div>
      {currentUser?.role === 'admin' && (
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
              to={all_routes.addCoach}
              className='btn btn-primary d-flex align-items-center'
            >
              <i className='ti ti-square-rounded-plus me-2' />
              Add Coach
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
