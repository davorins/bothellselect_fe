// components/registration/RegistrationHub.tsx - UPDATED VERSION
import React, { useState, useEffect } from 'react';
import PlayerRegistrationForm from './PlayerRegistrationForm';
import TournamentRegistrationForm from './TournamentRegistrationForm';
import TrainingRegistrationForm from './TrainingRegistrationForm';
import TryoutRegistrationForm from './TryoutRegistrationForm';
import {
  RegistrationFormConfig,
  SeasonEvent,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
} from '../../../types/registration-types';

interface RegistrationHubProps {
  playerConfig?: RegistrationFormConfig | null;
  trainingConfig?: RegistrationFormConfig | null;
  tournamentConfig?: RegistrationFormConfig | TournamentSpecificConfig | null;
  tryoutConfig?: RegistrationFormConfig | TryoutSpecificConfig | null;
  seasonEvent?: SeasonEvent;
  onRegistrationComplete?: () => void;
}

// Helper type guard functions - UPDATED
const isTournamentConfig = (
  config: any
): config is TournamentSpecificConfig => {
  return config && typeof config === 'object' && 'tournamentName' in config;
};

const isTryoutConfig = (config: any): config is TryoutSpecificConfig => {
  return config && typeof config === 'object' && 'tryoutName' in config;
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

const RegistrationHub: React.FC<RegistrationHubProps> = ({
  playerConfig,
  trainingConfig,
  tournamentConfig,
  tryoutConfig,
  seasonEvent,
  onRegistrationComplete,
}) => {
  const [activeForm, setActiveForm] = useState<
    'player' | 'tournament' | 'training' | 'tryout'
  >('player');

  // Get the description for the current active form - FIXED VERSION
  const getCurrentFormDescription = () => {
    console.log('🔍 Getting description for form:', activeForm);
    console.log('📋 Current tryoutConfig:', tryoutConfig);

    switch (activeForm) {
      case 'tournament':
        if (tournamentConfig) {
          const desc = isTournamentConfig(tournamentConfig)
            ? tournamentConfig.description
            : (tournamentConfig as RegistrationFormConfig).description;
          console.log('🏀 Tournament description:', desc);
          return desc;
        }
        break;
      case 'tryout':
        if (tryoutConfig) {
          console.log('🎯 Tryout config structure:', {
            config: tryoutConfig,
            keys: Object.keys(tryoutConfig),
            hasDescription: 'description' in tryoutConfig,
            descriptionValue: (tryoutConfig as any).description,
            isTryoutConfig: isTryoutConfig(tryoutConfig),
          });

          // Always try to get description directly first
          const desc = (tryoutConfig as any).description;
          if (desc) {
            console.log('✅ Found description directly:', desc);
            return desc;
          }

          // If not found, check if it's a TryoutSpecificConfig
          if (isTryoutConfig(tryoutConfig)) {
            console.log(
              '🔧 Using TryoutSpecificConfig description:',
              tryoutConfig.description
            );
            return tryoutConfig.description;
          }

          // Fallback to RegistrationFormConfig
          const registrationDesc = (tryoutConfig as RegistrationFormConfig)
            .description;
          console.log('📝 Fallback description:', registrationDesc);
          return registrationDesc;
        }
        break;
      case 'training':
        if (trainingConfig) {
          console.log('🏋️ Training description:', trainingConfig.description);
          return trainingConfig.description;
        }
        break;
      case 'player':
        if (playerConfig) {
          console.log('👤 Player description:', playerConfig.description);
          return playerConfig.description;
        }
        break;
    }
    return null;
  };

  // Get display name
  const getDisplayName = (
    config:
      | RegistrationFormConfig
      | TournamentSpecificConfig
      | TryoutSpecificConfig
      | null
      | undefined
  ): string => {
    if (!config) return 'Registration';

    if (seasonEvent) {
      const displayName = (config as any).displayName;
      const season = (config as any).season;
      const tournamentName = (config as any).tournamentName;
      const tryoutName = (config as any).tryoutName;

      if (displayName) return displayName;
      if (tournamentName) return tournamentName;
      if (tryoutName) return tryoutName;
      if (season) return season;

      return seasonEvent.season;
    }

    if (isTournamentConfig(config)) {
      return (
        config.displayName || config.tournamentName || 'Tournament Registration'
      );
    }

    if (isTryoutConfig(config)) {
      return config.displayName || config.tryoutName || 'Tryout Registration';
    }

    const registrationConfig = config as RegistrationFormConfig;
    return (
      registrationConfig.displayName ||
      registrationConfig.season ||
      'Registration'
    );
  };

  // Get the proper season event for a config
  const getSeasonEventForConfig = (
    config:
      | RegistrationFormConfig
      | TournamentSpecificConfig
      | TryoutSpecificConfig
      | null
      | undefined
  ): SeasonEvent | undefined => {
    if (seasonEvent) {
      return seasonEvent;
    }

    if (!config) return undefined;

    if (isTournamentConfig(config)) {
      return {
        season: config.tournamentName,
        year: config.tournamentYear,
        eventId:
          config._id?.toString() || `tournament-${config.tournamentYear}`,
        registrationOpens: config.isActive ? new Date() : undefined,
      };
    }

    if (isTryoutConfig(config)) {
      return {
        season: config.season || config.tryoutName,
        year: config.tryoutYear,
        eventId: config._id?.toString() || `tryout-${config.tryoutYear}`,
        registrationOpens: config.isActive ? new Date() : undefined,
      };
    }

    const registrationConfig = config as RegistrationFormConfig;
    return {
      season: registrationConfig.season || 'Training',
      year: registrationConfig.year || new Date().getFullYear(),
      eventId:
        registrationConfig.eventId ||
        registrationConfig._id?.toString() ||
        'training-default',
      registrationOpens: registrationConfig.isActive ? new Date() : undefined,
    };
  };

  // Type-safe helper to get isActive
  const getIsActive = (
    config:
      | RegistrationFormConfig
      | TournamentSpecificConfig
      | TryoutSpecificConfig
      | null
      | undefined
  ): boolean => {
    if (!config) return false;
    return (config as any).isActive || false;
  };

  // Check if forms are active
  const playerActive = getIsActive(playerConfig);
  const tournamentActive = getIsActive(tournamentConfig);
  const trainingActive = getIsActive(trainingConfig);
  const tryoutActive = getIsActive(tryoutConfig);

  // Set initial active tab based on what's available
  useEffect(() => {
    console.log('🎯 RegistrationHub configs:', {
      tryoutConfig,
      tryoutActive,
      tournamentActive,
      trainingActive,
      playerActive,
      tryoutDescription: (tryoutConfig as any)?.description,
      trainingDescription: trainingConfig?.description,
    });

    // Priority: tournament > tryout > training > player
    if (tournamentActive && tournamentConfig) {
      setActiveForm('tournament');
    } else if (tryoutActive && tryoutConfig) {
      setActiveForm('tryout');
    } else if (trainingActive && trainingConfig) {
      setActiveForm('training');
    } else if (playerActive && playerConfig) {
      setActiveForm('player');
    }
  }, [
    playerActive,
    tournamentActive,
    trainingActive,
    tryoutActive,
    playerConfig,
    tournamentConfig,
    trainingConfig,
    tryoutConfig,
  ]);

  // If nothing is active, show a message
  if (!playerActive && !tournamentActive && !trainingActive && !tryoutActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-warning mb-3'></i>
          <h3>Registration Closed</h3>
          <p className='text-muted mb-4'>
            No registrations are currently available. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Get season events for each form type
  const tournamentSeasonEvent = tournamentConfig
    ? getSeasonEventForConfig(tournamentConfig)
    : undefined;
  const tryoutSeasonEvent = tryoutConfig
    ? getSeasonEventForConfig(tryoutConfig)
    : undefined;
  const trainingSeasonEvent = trainingConfig
    ? getSeasonEventForConfig(trainingConfig)
    : undefined;

  // Get current form description
  const currentDescription = getCurrentFormDescription();

  console.log('📋 RegistrationHub rendering:', {
    activeForm,
    currentDescription,
    tryoutConfig,
    trainingConfig,
    tournamentConfig,
    tryoutConfigKeys: tryoutConfig ? Object.keys(tryoutConfig) : [],
  });

  // Convert tryout config to RegistrationFormConfig for TryoutRegistrationForm
  const getTryoutFormConfig = () => {
    if (!tryoutConfig) return null;

    if (isTryoutConfig(tryoutConfig)) {
      return tryoutToRegistrationConfig(tryoutConfig);
    }

    return tryoutConfig as RegistrationFormConfig;
  };

  return (
    <div className='card'>
      {/* Tab Navigation */}
      <div className='card-header bg-light p-0'>
        <div className='form-selector-tabs nav nav-tabs card-header-tabs m-0'>
          {/* Tournament Registration Tab - ONLY if active */}
          {tournamentActive && tournamentConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'tournament' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('tournament')}
                type='button'
              >
                <i className='ti ti-trophy me-2'></i>
                {getDisplayName(tournamentConfig)}
              </button>
            </li>
          )}

          {/* Tryout Registration Tab - ONLY if active */}
          {tryoutActive && tryoutConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'tryout' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('tryout')}
                type='button'
              >
                <i className='ti ti-target-arrow me-2'></i>
                {getDisplayName(tryoutConfig)}
              </button>
            </li>
          )}

          {trainingActive && trainingConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'training' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('training')}
                type='button'
              >
                <i className='ti ti-info-circle me-2'></i>
                {getDisplayName(trainingConfig)}
              </button>
            </li>
          )}

          {playerActive && playerConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'player' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('player')}
                type='button'
              >
                <i className='ti ti-user-plus me-2'></i>
                Add Players to Account
              </button>
            </li>
          )}
        </div>
      </div>

      {/* Description Section - Shows above form */}
      {currentDescription && (
        <div className='card-body border-bottom'>
          <div className='registration-description-container'>
            <div
              className='description-content'
              style={{
                fontSize: '16px',
                lineHeight: '1.6',
                color: '#333',
              }}
              dangerouslySetInnerHTML={{
                __html:
                  currentDescription ||
                  '<p class="text-muted">No description available</p>',
              }}
            />
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className='card-body p-4'>
        {activeForm === 'tournament' &&
          tournamentActive &&
          tournamentConfig && (
            <div className='tab-content'>
              <div className='tab-pane fade show active'>
                <TournamentRegistrationForm
                  onSuccess={onRegistrationComplete}
                  formConfig={tournamentConfig as RegistrationFormConfig}
                  tournamentConfig={
                    tournamentConfig as TournamentSpecificConfig
                  }
                  seasonEvent={tournamentSeasonEvent}
                />
              </div>
            </div>
          )}
        {activeForm === 'tryout' && tryoutActive && tryoutConfig && (
          <div className='tab-content'>
            <div className='tab-pane fade show active'>
              <TryoutRegistrationForm
                onSuccess={onRegistrationComplete}
                formConfig={getTryoutFormConfig()!}
                tryoutConfig={tryoutConfig as TryoutSpecificConfig}
                seasonEvent={tryoutSeasonEvent}
              />
            </div>
          </div>
        )}

        {activeForm === 'training' && trainingActive && trainingConfig && (
          <div className='tab-content'>
            <div className='tab-pane fade show active'>
              <TrainingRegistrationForm
                onSuccess={onRegistrationComplete}
                formConfig={trainingConfig}
                seasonEvent={trainingSeasonEvent}
                description={trainingConfig.description || ''}
              />
            </div>
          </div>
        )}

        {activeForm === 'player' && playerActive && playerConfig && (
          <div className='tab-content'>
            <div className='tab-pane fade show active'>
              <PlayerRegistrationForm
                onSuccess={onRegistrationComplete}
                formConfig={playerConfig}
                seasonEvent={seasonEvent}
              />
            </div>
          </div>
        )}
      </div>
      <style>{`
        .registration-description-container {
          padding: 1.5rem;
        }
        
        .description-content ul,
        .description-content ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        
        .description-content li {
          margin-bottom: 0.5rem;
        }
        
        .description-content strong {
          font-weight: 600;
        }
        
        .description-content a {
          color: #3498db;
          text-decoration: none;
        }
        
        .description-content a:hover {
          text-decoration: underline;
        }
        
        .description-content table {
          width: 100%;
          margin-bottom: 1rem;
          border-collapse: collapse;
        }
        
        .description-content table th,
        .description-content table td {
          padding: 0.75rem;
          border: 1px solid #dee2e6;
        }
        
        .description-content table th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        
        .nav-tabs .nav-link {
          padding: 1rem 1.5rem;
          font-weight: 500;
          border: none;
          transition: all 0.2s ease;
        }
        
        .nav-tabs .nav-link:hover {
          color: #594230;
          background-color: rgba(89, 66, 48, .1) !important;
        }
        
        .nav-tabs .nav-link.active {
          color: #594230;
          background-color: white;
        }
        
        .form-selector-tabs {
          border-bottom: 0px solid #dee2e6;
        }
      `}</style>
    </div>
  );
};

export default RegistrationHub;
