import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import TooltipOption from '../../../core/common/tooltipOption';
import { useAuth } from '../../../context/AuthContext';
import {
  exportPlayersToPDF,
  exportPlayersToExcel,
} from '../../components/Tables/PlayerTableColumns';

interface PlayerListHeaderProps {
  seasonParam: string | null;
  yearParam: string | null;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  playerData: any[];
}

export const PlayerListHeader: React.FC<PlayerListHeaderProps> = ({
  seasonParam,
  yearParam,
  playerData,
}) => {
  const { currentUser } = useAuth();

  const handleExportPDF = () => {
    exportPlayersToPDF(playerData);
  };

  const handleExportExcel = () => {
    exportPlayersToExcel(playerData);
  };

  return (
    <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
      <div className='my-auto mb-2'>
        <h3 className='page-title mb-1'>Players List</h3>
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
            <li className='breadcrumb-item'>Players</li>
            <li className='breadcrumb-item active' aria-current='page'>
              All Players
            </li>
          </ol>
        </nav>
      </div>
      {currentUser && currentUser.role === 'admin' && (
        <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
          <TooltipOption
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
          <div className='mb-2'>
            <Link
              to={all_routes.addPlayer}
              className='btn btn-primary d-flex align-items-center'
            >
              <i className='ti ti-square-rounded-plus me-2' />
              Add Player
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
