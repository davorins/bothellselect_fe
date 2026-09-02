import React from 'react';
import EventPage from './EventPage';

const TrainingPage: React.FC = () => {
  return (
    <EventPage
      eventType='training'
      title='Training'
      icon='ti-ball-basketball'
      color='#22c55e'
      registrationWizardType='training'
    />
  );
};

export default TrainingPage;
