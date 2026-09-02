import React from 'react';
import AdminEventConfig from './AdminEventConfig';

const AdminTryoutConfig: React.FC = () => {
  return (
    <AdminEventConfig
      eventType='tryout'
      title='Tryouts'
      icon='ti-target-arrow'
      color='#506ee4'
      badgeColor='primary'
    />
  );
};

export default AdminTryoutConfig;
