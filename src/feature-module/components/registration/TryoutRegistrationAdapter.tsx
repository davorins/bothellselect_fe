import React from 'react';
import RegistrationWizard from './RegistrationWizard';
import { useTryoutEvent } from '../../../context/TryoutEventContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const TryoutRegistrationAdapter: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();

  // Transform the tryout event data to match RegistrationWizard's expected format
  const adaptedEventData = tryoutEvent
    ? {
        season: tryoutEvent.season,
        year: tryoutEvent.year,
        eventId: tryoutEvent.tryoutId,
      }
    : undefined;

  return (
    <RegistrationWizard
      registrationType='tryout'
      eventData={adaptedEventData}
    />
  );
};

export default TryoutRegistrationAdapter;
