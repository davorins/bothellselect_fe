// components/Headers/TeamListHeader.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { useAuth } from '../../../context/AuthContext';

interface TeamListHeaderProps {
  teamData: any[];
  onRefresh?: () => void;
}

export const TeamListHeader: React.FC<TeamListHeaderProps> = ({
  teamData,
  onRefresh,
}) => {
  const { currentUser } = useAuth();

  // Define routes for teams if they don't exist in all_routes
  const teamRoutes = {
    createTeam: '/teams/create',
  };

  return (
    <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
      <div className='my-auto mb-2'>
        <h3 className='page-title mb-1'>Team Management</h3>
        <nav>
          <ol className='breadcrumb mb-0'>
            <li className='breadcrumb-item'>
              <Link to={all_routes.adminDashboard}>Dashboard</Link>
            </li>
            <li className='breadcrumb-item'>
              <Link to={all_routes.teams}>Teams</Link>
            </li>
          </ol>
        </nav>
      </div>
      {currentUser && (currentUser.role === 'admin' || currentUser.isCoach) && (
        <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
          <div className='mb-2'>
            <Link
              to={teamRoutes.createTeam}
              className='btn btn-primary d-flex align-items-center'
            >
              <i className='ti ti-square-rounded-plus me-2' />
              Create New Team
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
