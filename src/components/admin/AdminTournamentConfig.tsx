import React from 'react';
import AdminEventConfig from './AdminEventConfig';

const AdminTournamentConfig: React.FC = () => {
  return (
    <AdminEventConfig
      eventType='tournament'
      title='Tournaments'
      icon='ti-trophy'
      color='#f59e0b'
      badgeColor='warning'
    />
  );
};

export default AdminTournamentConfig;
