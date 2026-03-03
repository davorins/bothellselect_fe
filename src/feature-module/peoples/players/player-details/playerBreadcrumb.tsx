import React from 'react';
import { all_routes } from '../../../router/all_routes';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';

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
  const { currentUser } = useAuth();
  const playerData = player || location.state?.player;

  const currentPlayerId = playerData?._id || playerData?.playerId || playerId;

  // Check if user can edit this player
  const canEditPlayer = () => {
    // Admin can edit all players
    if (currentUser?.role === 'admin') return true;

    // Get parentId from localStorage
    const parentId = localStorage.getItem('parentId');

    // Try to get player's parent ID from various possible locations
    const playerParentId =
      playerData?.parentId?._id || // If parentId is populated
      playerData?.parentId || // If parentId is just an ID
      playerData?.parent?._id || // If parent is under 'parent' field
      playerData?.parent; // If parent is just an ID under 'parent' field

    console.log('Edit permission check:', {
      userRole: currentUser?.role,
      isCoach: currentUser?.isCoach,
      parentId,
      playerParentId,
      playerData,
    });

    // If parent IDs match, user can edit
    if (parentId && playerParentId && parentId === playerParentId.toString()) {
      return true;
    }

    // Check if this is the user's own player via isOwnPlayer flag
    if (playerData?.isOwnPlayer === true) {
      return true;
    }

    // If we're in the parents module context, the player might belong to the parent we're viewing
    // Check if the current path includes 'parents' and the player belongs to that parent
    if (location.pathname.includes('/parents/')) {
      // The parent ID might be in the URL
      const pathParts = location.pathname.split('/');
      const parentIdFromPath = pathParts[pathParts.indexOf('parents') + 1];

      if (
        parentIdFromPath &&
        playerParentId &&
        parentIdFromPath === playerParentId.toString()
      ) {
        return true;
      }
    }

    return false;
  };

  const showEditButton = canEditPlayer();

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
          {showEditButton && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerBreadcrumb;
