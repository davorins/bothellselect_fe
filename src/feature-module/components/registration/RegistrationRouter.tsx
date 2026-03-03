// RegistrationRouter.tsx
import React, { useEffect, useMemo } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import RegistrationWizard from './RegistrationWizard';
import { useTryoutEvent } from '../../../context/TryoutEventContext';
import { useTournamentEvent } from '../../../context/TournamentEventContext';
import {
  RegistrationWizardProps,
  RegistrationFormConfig,
} from '../../../types/registration-types';
import { useFormConfig } from '../../hooks/useFormConfig';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useSeasonEvents, SeasonEvent } from '../../hooks/useSeasonEvents';

// Helper function to get default config
const getDefaultFormConfig = (
  registrationType?: string
): RegistrationFormConfig => {
  const basePrice = registrationType === 'tryout' ? 50 : 100;
  return {
    isActive: true,
    requiresPayment: true,
    requiresQualification: false,
    pricing: {
      basePrice,
      packages: [],
    },
  };
};

interface TryoutEvent {
  season: string;
  year: number;
  tryoutId: string;
  [key: string]: any;
}

interface TournamentEvent {
  tournament: string;
  year: number;
  tournamentId: string;
  [key: string]: any;
}

const TryoutRegistrationPage: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();
  const { seasonEvents, isLoading: seasonEventsLoading } = useSeasonEvents();

  // Try to find a matching season event
  const matchedSeasonEvent = useMemo(() => {
    if (!tryoutEvent || !seasonEvents.length) return null;

    return seasonEvents.find(
      (event: SeasonEvent) =>
        event.season.toLowerCase().includes('tryout') &&
        event.year === tryoutEvent.year
    );
  }, [tryoutEvent, seasonEvents]);

  const eventData = matchedSeasonEvent
    ? {
        season: matchedSeasonEvent.season,
        year: matchedSeasonEvent.year,
        eventId: matchedSeasonEvent.eventId,
        tryoutId: tryoutEvent?.tryoutId,
      }
    : {
        season: tryoutEvent?.season || 'Basketball',
        year: tryoutEvent?.year || new Date().getFullYear(),
        eventId: tryoutEvent?.tryoutId || 'default-tryout',
      };

  const {
    formConfig,
    isLoading: formConfigLoading,
    error,
  } = useFormConfig(eventData.season!, eventData.year, 'tryout');

  // Debug logging
  useEffect(() => {
    console.log('🔄 TryoutRegistrationPage - formConfig state:', {
      formConfig,
      isLoading: formConfigLoading,
      error,
      season: eventData.season,
      year: eventData.year,
      matchedSeasonEvent,
    });
  }, [
    formConfig,
    formConfigLoading,
    error,
    eventData.season,
    eventData.year,
    matchedSeasonEvent,
  ]);

  if (seasonEventsLoading || formConfigLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        // Ensure packages array exists
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 50,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('tryout');

  console.log('🎯 Effective config for tryout:', {
    effectiveConfig,
    isActive: effectiveConfig.isActive,
    packageCount: effectiveConfig.pricing.packages.length,
  });

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Registration for this season is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='tryout'
      eventData={eventData}
      formConfig={effectiveConfig}
      seasonEvent={matchedSeasonEvent || undefined}
      onSuccess={() => console.log('Tryout registration successful')}
    />
  );
};

const TournamentRegistrationPage: React.FC = () => {
  const { tournamentEvent } = useTournamentEvent();
  const { seasonEvents, isLoading: seasonEventsLoading } = useSeasonEvents();

  // Find a matching season event for tournament
  const matchedSeasonEvent = useMemo(() => {
    if (!tournamentEvent || !seasonEvents.length) return null;

    return seasonEvents.find(
      (event: SeasonEvent) =>
        event.season.toLowerCase().includes('tournament') &&
        event.year === tournamentEvent.year
    );
  }, [tournamentEvent, seasonEvents]);

  const eventData = matchedSeasonEvent
    ? {
        season: matchedSeasonEvent.season,
        year: matchedSeasonEvent.year,
        eventId: matchedSeasonEvent.eventId,
        tournamentId: tournamentEvent?.tournamentId,
        tournament: matchedSeasonEvent.season,
      }
    : tournamentEvent
    ? {
        season: tournamentEvent.tournament,
        year: tournamentEvent.year,
        tournamentId: tournamentEvent.tournamentId,
        eventId: tournamentEvent.tournamentId,
        tournament: tournamentEvent.tournament,
      }
    : {
        season: 'Basketball Tournament',
        year: new Date().getFullYear(),
        eventId: 'default-tournament',
        tournament: 'Default Tournament',
      };

  const {
    formConfig,
    isLoading: formConfigLoading,
    error,
  } = useFormConfig(eventData.season!, eventData.year, 'tournament');

  useEffect(() => {
    console.log('🔄 TournamentRegistrationPage - formConfig state:', {
      formConfig,
      isLoading: formConfigLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, formConfigLoading, error, eventData.season, eventData.year]);

  if (seasonEventsLoading || formConfigLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 100,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('tournament');

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Registration for this tournament is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='tournament'
      eventData={eventData}
      formConfig={effectiveConfig}
      seasonEvent={matchedSeasonEvent || undefined}
      onSuccess={() => console.log('Tournament registration successful')}
    />
  );
};

const TeamRegistrationPage: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();
  const { seasonEvents, isLoading: seasonEventsLoading } = useSeasonEvents();

  // Find a matching season event for team
  const matchedSeasonEvent = useMemo(() => {
    if (!tryoutEvent || !seasonEvents.length) return null;

    return seasonEvents.find(
      (event: SeasonEvent) =>
        (event.season.toLowerCase().includes('team') ||
          event.season.toLowerCase().includes('tryout')) &&
        event.year === tryoutEvent.year
    );
  }, [tryoutEvent, seasonEvents]);

  const eventData = matchedSeasonEvent
    ? {
        season: matchedSeasonEvent.season,
        year: matchedSeasonEvent.year,
        eventId: matchedSeasonEvent.eventId,
        tryoutId: tryoutEvent?.tryoutId,
      }
    : tryoutEvent
    ? {
        season: tryoutEvent.season,
        year: tryoutEvent.year,
        eventId: tryoutEvent.tryoutId,
        tryoutId: tryoutEvent.tryoutId,
      }
    : {
        season: 'Basketball Team',
        year: new Date().getFullYear(),
        eventId: 'default-team',
      };

  const {
    formConfig,
    isLoading: formConfigLoading,
    error,
  } = useFormConfig(eventData.season!, eventData.year, 'team');

  useEffect(() => {
    console.log('🔄 TeamRegistrationPage - formConfig state:', {
      formConfig,
      isLoading: formConfigLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, formConfigLoading, error, eventData.season, eventData.year]);

  if (seasonEventsLoading || formConfigLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 150,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('team');

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Team registration is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='team'
      eventData={eventData}
      formConfig={effectiveConfig}
      seasonEvent={matchedSeasonEvent || undefined}
      onSuccess={() => console.log('Team registration successful')}
    />
  );
};

const TrainingRegistrationPage: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();
  const { seasonEvents, isLoading: seasonEventsLoading } = useSeasonEvents();

  // Find a matching season event for training
  const matchedSeasonEvent = useMemo(() => {
    if (!tryoutEvent || !seasonEvents.length) return null;

    return seasonEvents.find(
      (event: SeasonEvent) =>
        event.season.toLowerCase().includes('training') &&
        event.year === tryoutEvent.year
    );
  }, [tryoutEvent, seasonEvents]);

  const eventData = matchedSeasonEvent
    ? {
        season: matchedSeasonEvent.season,
        year: matchedSeasonEvent.year,
        eventId: matchedSeasonEvent.eventId,
        tryoutId: tryoutEvent?.tryoutId,
      }
    : tryoutEvent
    ? {
        season: tryoutEvent.season,
        year: tryoutEvent.year,
        eventId: tryoutEvent.tryoutId,
        tryoutId: tryoutEvent.tryoutId,
      }
    : {
        season: 'Basketball Training',
        year: new Date().getFullYear(),
        eventId: 'default-training',
      };

  const {
    formConfig,
    isLoading: formConfigLoading,
    error,
  } = useFormConfig(eventData.season!, eventData.year, 'training');

  useEffect(() => {
    console.log('🔄 TrainingRegistrationPage - formConfig state:', {
      formConfig,
      isLoading: formConfigLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, formConfigLoading, error, eventData.season, eventData.year]);

  if (seasonEventsLoading || formConfigLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 75,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('training');

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Training registration is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='training'
      eventData={eventData}
      formConfig={effectiveConfig}
      seasonEvent={matchedSeasonEvent || undefined}
      onSuccess={() => console.log('Training registration successful')}
    />
  );
};

const GenericRegistrationPage: React.FC = () => {
  const { registrationType } = useParams();
  const { seasonEvents, isLoading: seasonEventsLoading } = useSeasonEvents();

  const mapRegistrationType = (
    type: string
  ): 'player' | 'tournament' | 'training' => {
    switch (type) {
      case 'tryout':
      case 'team':
        return 'tournament';
      case 'player':
      case 'tournament':
      case 'training':
        return type;
      default:
        return 'player';
    }
  };

  const effectiveType = mapRegistrationType(registrationType || 'player');

  // Find a matching season event
  const matchedSeasonEvent = useMemo(() => {
    if (!seasonEvents.length) return null;

    return seasonEvents.find((event: SeasonEvent) => {
      const eventName = event.season.toLowerCase();
      const searchTerm = effectiveType.toLowerCase();

      return (
        eventName.includes(searchTerm) ||
        (searchTerm === 'training' && eventName.includes('camp')) ||
        (searchTerm === 'tournament' &&
          (eventName.includes('tournament') || eventName.includes('tryout')))
      );
    });
  }, [seasonEvents, effectiveType]);

  const eventData = matchedSeasonEvent
    ? {
        season: matchedSeasonEvent.season,
        year: matchedSeasonEvent.year,
        eventId: matchedSeasonEvent.eventId,
      }
    : {
        season: `Basketball ${
          effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)
        }`,
        year: new Date().getFullYear(),
        eventId: `default-${effectiveType}`,
      };

  const {
    formConfig,
    isLoading: formConfigLoading,
    error,
  } = useFormConfig(eventData.season, eventData.year, effectiveType);

  useEffect(() => {
    console.log('🔄 GenericRegistrationPage - formConfig state:', {
      formConfig,
      isLoading: formConfigLoading,
      error,
      season: eventData.season,
      year: eventData.year,
      originalType: registrationType,
      mappedType: effectiveType,
      matchedSeasonEvent,
    });
  }, [
    formConfig,
    formConfigLoading,
    error,
    eventData.season,
    eventData.year,
    registrationType,
    effectiveType,
    matchedSeasonEvent,
  ]);

  if (seasonEventsLoading || formConfigLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice:
            formConfig.pricing?.basePrice ||
            getDefaultFormConfig(effectiveType).pricing.basePrice,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig(effectiveType);

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            {effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)}{' '}
            registration is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType={effectiveType}
      eventData={eventData}
      formConfig={effectiveConfig}
      seasonEvent={matchedSeasonEvent || undefined}
      onSuccess={() => console.log(`${effectiveType} registration successful`)}
    />
  );
};

const RegistrationRouter: React.FC = () => {
  return (
    <Routes>
      <Route path='/tryout' element={<TryoutRegistrationPage />} />
      <Route path='/tournament' element={<TournamentRegistrationPage />} />
      <Route path='/team' element={<TeamRegistrationPage />} />
      <Route path='/training' element={<TrainingRegistrationPage />} />
      <Route path='/:registrationType' element={<GenericRegistrationPage />} />
    </Routes>
  );
};

export default RegistrationRouter;
