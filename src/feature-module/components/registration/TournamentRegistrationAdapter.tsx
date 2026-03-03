import React from 'react';
import RegistrationWizard from './RegistrationWizard';
import { useTournamentEvent } from '../../../context/TournamentEventContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const TournamentRegistrationAdapter: React.FC = () => {
  const { tournamentEvent } = useTournamentEvent();

  // Transform the tournament event data to match RegistrationWizard's expected format
  const adaptedEventData = tournamentEvent
    ? {
        season: tournamentEvent.tournament, // Map tournament to season
        year: tournamentEvent.year,
        eventId: tournamentEvent.tournamentId,
      }
    : undefined;

  return (
    <RegistrationWizard
      registrationType='tournament'
      eventData={adaptedEventData}
    />
  );
};

export default TournamentRegistrationAdapter;
