import React from 'react';
import EventPage from './EventPage';

const TryoutPage: React.FC = () => {
  return (
    <EventPage
      eventType='tryout'
      title='Tryouts'
      icon='ti-target-arrow'
      color='#506ee4'
      registrationWizardType='tryout'
    />
  );
};

export default TryoutPage;
