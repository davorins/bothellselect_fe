import React, { useState, useEffect, useMemo } from 'react';
import PlayerRegistrationForm from './PlayerRegistrationForm';
import TournamentRegistrationForm from './TournamentRegistrationForm';
import TrainingRegistrationForm from './TrainingRegistrationForm';
import TryoutRegistrationForm from './TryoutRegistrationForm';
import {
  RegistrationFormConfig,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
  Player,
} from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useSeasonEvents } from '../../hooks/useSeasonEvents';

interface RegistrationWizardProps {
  registrationType?: 'player' | 'tournament' | 'training' | 'tryout' | 'team';
  eventData?: any;
  seasonEvent?: any;
  onSuccess?: (data?: any) => void;
  isExistingUser?: boolean;
  formConfig?:
    | RegistrationFormConfig
    | TournamentSpecificConfig
    | TryoutSpecificConfig;
  existingPlayers?: Player[];
}

// Helper function to check if config is a tournament config
const isTournamentConfig = (
  config: any
): config is TournamentSpecificConfig => {
  return config && typeof config === 'object' && 'tournamentName' in config;
};

// Helper function to check if config is a tryout config
const isTryoutConfig = (config: any): config is TryoutSpecificConfig => {
  return config && typeof config === 'object' && 'tryoutName' in config;
};

// Helper to convert TournamentSpecificConfig to RegistrationFormConfig
const tournamentToRegistrationConfig = (
  tournamentConfig: TournamentSpecificConfig
): RegistrationFormConfig => {
  return {
    _id: tournamentConfig._id,
    season: tournamentConfig.tournamentName,
    year: tournamentConfig.tournamentYear,
    isActive: tournamentConfig.isActive,
    requiresPayment: true,
    requiresQualification: false,
    pricing: {
      basePrice: tournamentConfig.tournamentFee || 425,
      packages: [],
    },
    tournamentName: tournamentConfig.tournamentName,
    tournamentYear: tournamentConfig.tournamentYear,
    displayName: tournamentConfig.displayName,
    registrationDeadline: tournamentConfig.registrationDeadline,
    tournamentDates: tournamentConfig.tournamentDates,
    locations: tournamentConfig.locations,
    divisions: tournamentConfig.divisions,
    ageGroups: tournamentConfig.ageGroups,
    requiresRoster: tournamentConfig.requiresRoster,
    requiresInsurance: tournamentConfig.requiresInsurance,
    paymentDeadline: tournamentConfig.paymentDeadline,
    refundPolicy: tournamentConfig.refundPolicy,
    rulesDocumentUrl: tournamentConfig.rulesDocumentUrl,
    scheduleDocumentUrl: tournamentConfig.scheduleDocumentUrl,
    tournamentFee: tournamentConfig.tournamentFee,
    createdAt: tournamentConfig.createdAt,
    updatedAt: tournamentConfig.updatedAt,
    __v: tournamentConfig.__v,
    description: tournamentConfig.description || '',
  };
};

// Helper function to convert TryoutSpecificConfig to RegistrationFormConfig
const tryoutToRegistrationConfig = (
  tryoutConfig: TryoutSpecificConfig
): RegistrationFormConfig => {
  return {
    _id: tryoutConfig._id,
    season: tryoutConfig.tryoutName,
    year: tryoutConfig.tryoutYear,
    isActive: tryoutConfig.isActive,
    requiresPayment: tryoutConfig.requiresPayment,
    requiresQualification: false,
    pricing: {
      basePrice: tryoutConfig.tryoutFee || 50,
      packages: [],
    },
    tryoutName: tryoutConfig.tryoutName,
    tryoutYear: tryoutConfig.tryoutYear,
    displayName: tryoutConfig.displayName,
    registrationDeadline: tryoutConfig.registrationDeadline,
    tryoutDates: tryoutConfig.tryoutDates,
    locations: tryoutConfig.locations,
    divisions: tryoutConfig.divisions,
    ageGroups: tryoutConfig.ageGroups,
    requiresRoster: tryoutConfig.requiresRoster,
    requiresInsurance: tryoutConfig.requiresInsurance,
    paymentDeadline: tryoutConfig.paymentDeadline,
    refundPolicy: tryoutConfig.refundPolicy,
    tryoutFee: tryoutConfig.tryoutFee,
    createdAt: tryoutConfig.createdAt,
    updatedAt: tryoutConfig.updatedAt,
    __v: tryoutConfig.__v,
    description: tryoutConfig.description || '',
  };
};

const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  registrationType = 'player',
  eventData,
  seasonEvent,
  onSuccess,
  isExistingUser = false,
  formConfig,
  existingPlayers = [],
}) => {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { seasonEvents, isLoading: seasonEventsLoading } = useSeasonEvents();

  // State to track if user has completed initial registration steps
  const [userRegistrationComplete, setUserRegistrationComplete] =
    useState(false);
  const [savedUserData, setSavedUserData] = useState<any>(null);
  const [savedPlayers, setSavedPlayers] = useState<Player[]>([]);
  const [hasSavedInitialData, setHasSavedInitialData] = useState(false);

  // Determine the effective user state
  const effectiveIsExistingUser = useMemo(() => {
    return isExistingUser || isAuthenticated;
  }, [isExistingUser, isAuthenticated]);

  // Default season event
  const defaultSeasonEvent = useMemo(() => {
    // If seasonEvent prop is provided, use it
    if (seasonEvent) {
      return seasonEvent;
    }

    // Find a matching season event
    if (seasonEvents && seasonEvents.length > 0) {
      // For training, look for training-related events
      if (registrationType === 'training') {
        const trainingEvent = seasonEvents.find(
          (event) =>
            event.season.toLowerCase().includes('training') ||
            event.season.toLowerCase().includes('camp')
        );
        if (trainingEvent) return trainingEvent;
      }

      // For tournaments
      if (registrationType === 'tournament') {
        const tournamentEvent = seasonEvents.find((event) =>
          event.season.toLowerCase().includes('tournament')
        );
        if (tournamentEvent) return tournamentEvent;
      }

      // For tryouts
      if (registrationType === 'tryout') {
        const tryoutEvent = seasonEvents.find((event) =>
          event.season.toLowerCase().includes('tryout')
        );
        if (tryoutEvent) return tryoutEvent;
      }

      // Default to the first active event
      const activeEvent = seasonEvents.find((event) => event.registrationOpen);
      if (activeEvent) return activeEvent;
    }

    // Fallback to old hardcoded values
    return {
      season: 'Partizan Team',
      year: new Date().getFullYear(),
      eventId: 'partizan-2026',
    };
  }, [seasonEvent, seasonEvents, registrationType]);

  // Default form config - Handle RegistrationFormConfig, TournamentSpecificConfig, and TryoutSpecificConfig
  const defaultFormConfig: RegistrationFormConfig = useMemo(() => {
    // If formConfig is provided
    if (formConfig) {
      let resultConfig: RegistrationFormConfig;

      // Check if it's a tournament config
      if (isTournamentConfig(formConfig)) {
        resultConfig = tournamentToRegistrationConfig(formConfig);
      }
      // Check if it's a tryout config
      else if (isTryoutConfig(formConfig)) {
        resultConfig = tryoutToRegistrationConfig(formConfig);
      }
      // If it's already a RegistrationFormConfig, return it
      else {
        resultConfig = formConfig as RegistrationFormConfig;
      }

      console.log('🔍 Original formConfig description:', {
        hasDescription: !!formConfig.description,
        descriptionLength: formConfig.description?.length || 0,
        descriptionPreview: formConfig.description?.substring(0, 100),
      });

      // Preserve the description from original formConfig
      if (formConfig.description) {
        resultConfig.description = formConfig.description;
      }

      return resultConfig;
    }

    // Otherwise create defaults based on registration type
    const baseConfig: RegistrationFormConfig = {
      isActive: registrationType === 'player' ? false : true,
      requiresPayment:
        registrationType === 'training' ||
        registrationType === 'tournament' ||
        registrationType === 'tryout' ||
        registrationType === 'team',
      requiresQualification: false,
      pricing: {
        basePrice:
          registrationType === 'training'
            ? 75
            : registrationType === 'tournament'
            ? 425
            : registrationType === 'tryout'
            ? 50
            : registrationType === 'team'
            ? 150
            : 0,
        packages:
          registrationType === 'training'
            ? [
                {
                  id: '1',
                  name: 'Single Session',
                  price: 75,
                  description: 'One training session',
                },
                {
                  id: '2',
                  name: '4-Session Pack',
                  price: 250,
                  description: 'Save $50 with 4 sessions',
                },
                {
                  id: '3',
                  name: '8-Session Pack',
                  price: 450,
                  description: 'Save $150 with 8 sessions',
                },
              ]
            : [],
      },
      description: '',
    };

    return baseConfig;
  }, [formConfig, registrationType]);

  // Handle user registration completion
  const handleUserRegistrationComplete = (userData: any) => {
    console.log('✅ User registration complete:', userData);
    setSavedUserData(userData);
    setUserRegistrationComplete(true);

    // Store in localStorage to persist across refreshes
    if (userData) {
      localStorage.setItem('pendingRegistrationUser', JSON.stringify(userData));
    }
  };

  // Handle player registration completion
  const handlePlayerRegistrationComplete = (players: Player[]) => {
    console.log('✅ Player registration complete:', players);
    setSavedPlayers(players);

    // Store in localStorage
    localStorage.setItem('pendingRegistrationPlayers', JSON.stringify(players));
  };

  // Handle full registration success
  const handleSuccess = (data?: any) => {
    console.log('🎉 Registration wizard completed successfully');

    // Clear localStorage
    localStorage.removeItem('pendingRegistrationUser');
    localStorage.removeItem('pendingRegistrationPlayers');

    // Reset state
    setUserRegistrationComplete(false);
    setSavedUserData(null);
    setSavedPlayers([]);
    setHasSavedInitialData(false);

    // Call parent success handler
    onSuccess?.(data);
  };

  // Load saved data from localStorage on mount
  useEffect(() => {
    if (!effectiveIsExistingUser) {
      try {
        const savedUser = localStorage.getItem('pendingRegistrationUser');
        const savedPlayers = localStorage.getItem('pendingRegistrationPlayers');

        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setSavedUserData(userData);
          setUserRegistrationComplete(true);
          console.log('📥 Loaded saved user data from localStorage');
        }

        if (savedPlayers) {
          const playersData = JSON.parse(savedPlayers);
          setSavedPlayers(playersData);
          console.log('📥 Loaded saved players data from localStorage');
        }
      } catch (error) {
        console.error('Error loading saved registration data:', error);
      }
    }
  }, [effectiveIsExistingUser]);

  // For authenticated users or existing users, mark user registration as complete
  useEffect(() => {
    if (effectiveIsExistingUser && !hasSavedInitialData) {
      console.log(
        '👤 User is authenticated/existing, marking registration complete'
      );
      setUserRegistrationComplete(true);

      // If user exists, use their data as saved data
      if (user) {
        setSavedUserData({
          _id: user._id,
          email: user.email,
          fullName: user.fullName,
        });
      }

      setHasSavedInitialData(true);
    }
  }, [effectiveIsExistingUser, user, hasSavedInitialData]);

  // For new users who have completed registration but haven't saved initial data
  useEffect(() => {
    if (
      !effectiveIsExistingUser &&
      userRegistrationComplete &&
      savedUserData &&
      !hasSavedInitialData
    ) {
      console.log('🆕 New user completed registration, saving initial data');
      setHasSavedInitialData(true);
    }
  }, [
    effectiveIsExistingUser,
    userRegistrationComplete,
    savedUserData,
    hasSavedInitialData,
  ]);

  // Render closed message when form is not active
  const renderClosedMessage = (formType: string) => {
    const messages = {
      training: {
        title: 'Training Registration Closed',
        message:
          'Training registration is not currently available. Please check back later for upcoming training sessions.',
        icon: 'ti ti-calendar-off',
      },
      tournament: {
        title: 'Tournament Registration Closed',
        message:
          'Tournament registration is not currently available. Please check back later for upcoming tournaments.',
        icon: 'ti ti-trophy-off',
      },
      tryout: {
        title: 'Tryout Registration Closed',
        message:
          'Tryout registration is not currently available. Please check back later for upcoming tryouts.',
        icon: 'ti ti-target-off', // Changed to target-off for consistency
      },
      team: {
        title: 'Team Registration Closed',
        message:
          'Team registration is not currently available. Please check back later for team registrations.',
        icon: 'ti ti-users',
      },
      player: {
        title: 'Player Registration Closed',
        message:
          'Player registration is not currently available. Please check back later.',
        icon: 'ti ti-user-off',
      },
    };

    const msg = messages[formType as keyof typeof messages] || messages.player;

    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <div className='py-4'>
            <i className={`${msg.icon} fs-1 text-warning mb-3`}></i>
            <h3>{msg.title}</h3>
            <p className='text-muted mb-4'>{msg.message}</p>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  if (authLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration...</p>
        </div>
      </div>
    );
  }

  // Common props for all forms
  const commonProps = {
    onSuccess: handleSuccess,
    formConfig: defaultFormConfig,
    isExistingUser: effectiveIsExistingUser,
    savedUserData: savedUserData,
    savedPlayers: savedPlayers,
    skipToPlayerStep: !effectiveIsExistingUser && userRegistrationComplete,
  };

  console.log('🔍 RegistrationWizard state:', {
    registrationType,
    effectiveIsExistingUser,
    userRegistrationComplete,
    hasSavedInitialData,
    savedUserData: !!savedUserData,
    savedPlayersCount: savedPlayers.length,
    skipToPlayerStep: commonProps.skipToPlayerStep,
    formConfig: defaultFormConfig,
    isActive: defaultFormConfig.isActive,
  });

  // Check if the form is active
  if (!defaultFormConfig.isActive) {
    return renderClosedMessage(registrationType);
  }

  // Render the appropriate form based on registration type
  switch (registrationType) {
    case 'tournament':
      // Get tournament config
      let tournamentConfig: TournamentSpecificConfig;

      if (formConfig && isTournamentConfig(formConfig)) {
        tournamentConfig = formConfig;
      } else {
        // Create a default tournament config
        tournamentConfig = {
          tournamentName: eventData?.tournament || 'Tournament',
          tournamentYear: eventData?.year || new Date().getFullYear(),
          displayName: eventData?.tournament || 'Tournament Registration',
          registrationDeadline: '',
          tournamentDates: [],
          locations: [],
          divisions: ['Gold', 'Silver'],
          ageGroups: [],
          requiresRoster: true,
          requiresInsurance: true,
          paymentDeadline: '',
          refundPolicy: 'No refunds after registration deadline',
          rulesDocumentUrl: '',
          scheduleDocumentUrl: '',
          tournamentFee: defaultFormConfig.pricing.basePrice,
          isActive: true,
        };
      }

      return (
        <TournamentRegistrationForm
          {...commonProps}
          tournamentConfig={tournamentConfig}
          seasonEvent={
            seasonEvent || {
              season: tournamentConfig.tournamentName,
              year: tournamentConfig.tournamentYear,
              eventId: tournamentConfig._id?.$oid || 'tournament',
            }
          }
        />
      );

    case 'training':
      return (
        <TrainingRegistrationForm
          {...commonProps}
          seasonEvent={
            seasonEvent || {
              season: 'Skills Training',
              year: eventData?.year || new Date().getFullYear(),
              eventId: eventData?.eventId || 'training',
            }
          }
          existingPlayers={existingPlayers}
        />
      );

    case 'tryout':
      // Get tryout config
      let tryoutConfig: TryoutSpecificConfig;

      if (formConfig && isTryoutConfig(formConfig)) {
        tryoutConfig = formConfig;
      } else {
        // Create a default tryout config
        tryoutConfig = {
          tryoutName: eventData?.season || 'Tryout',
          tryoutYear: eventData?.year || new Date().getFullYear(),
          displayName: eventData?.season || 'Tryout Registration',
          registrationDeadline: '',
          tryoutDates: [],
          locations: [],
          divisions: [],
          ageGroups: [],
          requiresPayment: true,
          requiresRoster: false,
          requiresInsurance: true,
          paymentDeadline: '',
          refundPolicy: 'No refunds after tryout registration deadline',
          tryoutFee: defaultFormConfig.pricing.basePrice,
          isActive: true,
        };
      }

      return (
        <TryoutRegistrationForm
          {...commonProps}
          tryoutConfig={tryoutConfig}
          seasonEvent={
            seasonEvent || {
              season: tryoutConfig.tryoutName,
              year: tryoutConfig.tryoutYear,
              eventId: eventData?.eventId || 'tryout',
            }
          }
        />
      );

    case 'team':
      // For team registration, use TournamentRegistrationForm
      const teamConfig: TournamentSpecificConfig = {
        tournamentName: eventData?.season || 'Team Registration',
        tournamentYear: eventData?.year || new Date().getFullYear(),
        displayName: eventData?.season || 'Team Registration',
        registrationDeadline: '',
        tournamentDates: [],
        locations: [],
        divisions: ['Gold', 'Silver'],
        ageGroups: [],
        requiresRoster: true,
        requiresInsurance: true,
        paymentDeadline: '',
        refundPolicy: 'No refunds after registration deadline',
        rulesDocumentUrl: '',
        scheduleDocumentUrl: '',
        tournamentFee: defaultFormConfig.pricing.basePrice,
        isActive: true,
      };

      return (
        <TournamentRegistrationForm
          {...commonProps}
          tournamentConfig={teamConfig}
          seasonEvent={
            seasonEvent || {
              season: teamConfig.tournamentName,
              year: teamConfig.tournamentYear,
              eventId: eventData?.eventId || 'team',
            }
          }
        />
      );

    case 'player':
    default:
      return (
        <PlayerRegistrationForm
          {...commonProps}
          existingPlayers={existingPlayers}
          onUserRegistrationComplete={handleUserRegistrationComplete}
          onPlayerRegistrationComplete={handlePlayerRegistrationComplete}
        />
      );
  }
};

export default RegistrationWizard;
