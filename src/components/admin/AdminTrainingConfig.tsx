import React from 'react';
import AdminEventConfig from './AdminEventConfig';

const AdminTrainingConfig: React.FC = () => {
  return (
    <AdminEventConfig
      eventType='training'
      title='Training'
      icon='ti-ball-basketball'
      color='#22c55e'
      badgeColor='success'
    />
  );
};

export default AdminTrainingConfig;
