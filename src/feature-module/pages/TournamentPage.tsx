import React from 'react';
import EventPage from './EventPage';

const TournamentPage: React.FC = () => {
  return (
    <EventPage
      eventType='tournament'
      title='Tournaments'
      icon='ti-trophy'
      color='#f59e0b'
      registrationWizardType='tournament'
    />
  );
};

export default TournamentPage;
