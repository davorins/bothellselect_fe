import React from 'react';
import { all_routes } from '../../../router/all_routes';
import { Link, useParams, useLocation } from 'react-router-dom';

interface PlayerBreadcrumbProps {
  guardians?: any[];
  player?: any;
}

const PlayerBreadcrumb: React.FC<PlayerBreadcrumbProps> = ({
  guardians,
  player,
}) => {
  const routes = all_routes;
  const { playerId } = useParams<{ playerId: string }>();
  const location = useLocation();
  const playerData = player || location.state?.player;

  const currentPlayerId = playerData?._id || playerData?.playerId || playerId;

  return (
    <div className='col-md-12'>
      <div className='d-md-flex d-block align-items-center justify-content-between mb-3'>
        <div className='my-auto mb-2'>
          <h3 className='page-title mb-1'>Player Details</h3>
          <nav>
            <ol className='breadcrumb mb-0'>
              <li className='breadcrumb-item'>
                <Link to={routes.adminDashboard}>Dashboard</Link>
              </li>
              <li className='breadcrumb-item'>
                <Link to={routes.PlayerList}>Player</Link>
              </li>
              <li className='breadcrumb-item active' aria-current='page'>
                {playerData ? playerData.name : 'Player Details'}
              </li>
            </ol>
          </nav>
        </div>
        <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
          <Link
            to={`${routes.editPlayer}/${currentPlayerId}`}
            state={{
              player: playerData,
              guardians: guardians || [],
              playerId: currentPlayerId,
              from: location.pathname,
            }}
            className='btn btn-primary d-flex align-items-center mb-2'
          >
            <i className='ti ti-edit-circle me-2' />
            Edit Player
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlayerBreadcrumb;
