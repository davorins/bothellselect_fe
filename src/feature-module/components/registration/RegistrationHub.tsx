import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import AutoGridFromDescription from '../AutoGridFromDescription';
import './RegistrationHub.css';

interface RegistrationHubProps {
  playerConfig?: RegistrationFormConfig | null;
  trainingConfig?: RegistrationFormConfig | null;
  tournamentConfig?: RegistrationFormConfig | TournamentSpecificConfig | null;
  tryoutConfig?: RegistrationFormConfig | TryoutSpecificConfig | null;
  seasonEvent?: SeasonEvent;
  onRegistrationComplete?: () => void;
  hasEmbeddedForms?: boolean;
}

// Helper type guard functions
const isTournamentConfig = (
  config: any,
): config is TournamentSpecificConfig => {
  return config && typeof config === 'object' && 'tournamentName' in config;
};

const isTryoutConfig = (config: any): config is TryoutSpecificConfig => {
  return config && typeof config === 'object' && 'tryoutName' in config;
};

// Helper function to convert TryoutSpecificConfig to RegistrationFormConfig
const tryoutToRegistrationConfig = (
  tryoutConfig: TryoutSpecificConfig,
): RegistrationFormConfig => {
  console.log('🔍 tryoutToRegistrationConfig - input:', {
    tryoutName: tryoutConfig.tryoutName,
    hasTryoutDetails: !!(tryoutConfig as any).tryoutDetails,
    tryoutDetails: (tryoutConfig as any).tryoutDetails,
  });
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
    tryoutDetails: (tryoutConfig as any).tryoutDetails,
  };
};

// Helper function to convert TournamentSpecificConfig to RegistrationFormConfig
const tournamentToRegistrationConfig = (
  tournamentConfig: TournamentSpecificConfig,
): RegistrationFormConfig => {
  return {
    _id: tournamentConfig._id,
    season: tournamentConfig.tournamentName,
    year: tournamentConfig.tournamentYear,
    isActive: tournamentConfig.isActive,
    requiresPayment: true,
    requiresQualification: false,
    pricing: {
      basePrice: tournamentConfig.tournamentFee,
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
    tournamentFee: tournamentConfig.tournamentFee,
    createdAt: tournamentConfig.createdAt,
    updatedAt: tournamentConfig.updatedAt,
    __v: tournamentConfig.__v,
    description: tournamentConfig.description || '',
  };
};

// Helper to convert any config to RegistrationFormConfig
const toRegistrationConfig = (config: any): RegistrationFormConfig => {
  if (isTournamentConfig(config)) {
    return tournamentToRegistrationConfig(config);
  }
  if (isTryoutConfig(config)) {
    return tryoutToRegistrationConfig(config);
  }
  return config as RegistrationFormConfig;
};

const RegistrationHub: React.FC<RegistrationHubProps> = ({
  playerConfig,
  trainingConfig,
  tournamentConfig,
  tryoutConfig,
  seasonEvent,
  onRegistrationComplete,
  hasEmbeddedForms = true,
}) => {
  const [activeForm, setActiveForm] = useState<
    'player' | 'tournament' | 'training' | 'tryout' | null
  >(null);

  const [showDescription, setShowDescription] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const getIsActive = useCallback((config: any): boolean => {
    if (!config) return false;
    return config.isActive || false;
  }, []);

  const playerActive = useMemo(
    () => getIsActive(playerConfig),
    [playerConfig, getIsActive],
  );
  const tournamentActive = useMemo(
    () => getIsActive(tournamentConfig),
    [tournamentConfig, getIsActive],
  );
  const trainingActive = useMemo(
    () => getIsActive(trainingConfig),
    [trainingConfig, getIsActive],
  );
  const tryoutActive = useMemo(
    () => getIsActive(tryoutConfig),
    [tryoutConfig, getIsActive],
  );

  const getDisplayName = useCallback(
    (config: any): string => {
      if (!config) return 'Registration';

      if (seasonEvent) {
        if (config.displayName) return config.displayName;
        if (config.tournamentName) return config.tournamentName;
        if (config.tryoutName) return config.tryoutName;
        if (config.season) return config.season;
        return seasonEvent.season;
      }

      if (isTournamentConfig(config)) {
        return (
          config.displayName ||
          config.tournamentName ||
          'Tournament Registration'
        );
      }

      if (isTryoutConfig(config)) {
        return config.displayName || config.tryoutName || 'Tryout Registration';
      }

      return config.displayName || config.season || 'Registration';
    },
    [seasonEvent],
  );

  const getIcon = useCallback(
    (type: 'player' | 'tournament' | 'training' | 'tryout'): string => {
      switch (type) {
        case 'player':
          return 'ti-user-plus';
        case 'tournament':
          return 'ti-trophy';
        case 'training':
          return 'ti-ball-basketball';
        case 'tryout':
          return 'ti-target-arrow';
        default:
          return 'ti-file';
      }
    },
    [],
  );

  const getBackgroundImage = useCallback(
    (
      type: 'player' | 'tournament' | 'training' | 'tryout',
      config: any,
    ): string | undefined => {
      const title = getDisplayName(config).toLowerCase();
      if (title.includes('tryout') || type === 'tryout') {
        return '/assets/img/theme/tile_05.png';
      } else if (title.includes('camp') || type === 'training') {
        return '/assets/img/theme/tile_06.png';
      }
      return undefined;
    },
    [getDisplayName],
  );

  const getSeasonEventForConfig = useCallback(
    (config: any): SeasonEvent | undefined => {
      if (seasonEvent) return seasonEvent;
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

      return {
        season: config.season || 'Training',
        year: config.year || new Date().getFullYear(),
        eventId: config.eventId || config._id?.toString() || 'training-default',
        registrationOpens: config.isActive ? new Date() : undefined,
      };
    },
    [seasonEvent],
  );

  const currentDescription = useMemo(() => {
    switch (activeForm) {
      case 'tournament':
        return tournamentConfig?.description || null;
      case 'tryout':
        return tryoutConfig?.description || null;
      case 'training':
        return trainingConfig?.description || null;
      case 'player':
        return playerConfig?.description || null;
      default:
        return null;
    }
  }, [
    activeForm,
    tournamentConfig,
    tryoutConfig,
    trainingConfig,
    playerConfig,
  ]);

  const availableForms = useMemo(() => {
    const forms = [];
    if (tournamentActive && tournamentConfig)
      forms.push({ type: 'tournament' as const, config: tournamentConfig });
    if (tryoutActive && tryoutConfig)
      forms.push({ type: 'tryout' as const, config: tryoutConfig });
    if (trainingActive && trainingConfig)
      forms.push({ type: 'training' as const, config: trainingConfig });
    if (playerActive && playerConfig)
      forms.push({ type: 'player' as const, config: playerConfig });
    return forms;
  }, [
    tournamentActive,
    tournamentConfig,
    tryoutActive,
    tryoutConfig,
    trainingActive,
    trainingConfig,
    playerActive,
    playerConfig,
  ]);

  useEffect(() => {
    if (availableForms.length === 1 && !activeForm) {
      const formType = availableForms[0].type;
      setActiveForm(formType);
      setShowDescription(formType !== 'player');
    } else if (availableForms.length > 1 && !activeForm) {
      setActiveForm(null);
      setShowDescription(true);
    }
  }, [availableForms]);

  const tournamentSeasonEvent = useMemo(
    () =>
      tournamentConfig ? getSeasonEventForConfig(tournamentConfig) : undefined,
    [tournamentConfig, getSeasonEventForConfig],
  );
  const tryoutSeasonEvent = useMemo(
    () => (tryoutConfig ? getSeasonEventForConfig(tryoutConfig) : undefined),
    [tryoutConfig, getSeasonEventForConfig],
  );
  const trainingSeasonEvent = useMemo(
    () =>
      trainingConfig ? getSeasonEventForConfig(trainingConfig) : undefined,
    [trainingConfig, getSeasonEventForConfig],
  );

  const tryoutFormConfig = useMemo(() => {
    if (!tryoutConfig) return null;
    if (isTryoutConfig(tryoutConfig))
      return tryoutToRegistrationConfig(tryoutConfig);
    return tryoutConfig as RegistrationFormConfig;
  }, [tryoutConfig]);

  const handleTileClick = useCallback(
    (form: 'player' | 'tournament' | 'training' | 'tryout') => {
      setActiveForm(form);
      setShowDescription(true);
    },
    [],
  );

  const handleBackToTiles = useCallback(() => {
    setActiveForm(null);
    setShowDescription(true);
  }, []);

  const handleRegistrationComplete = useCallback(() => {
    onRegistrationComplete?.();
  }, [onRegistrationComplete]);

  const handleToggleView = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setShowDescription((prev) => !prev);
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  }, [isAnimating]);

  if (availableForms.length === 0) return null;

  // SINGLE FORM MODE
  if (availableForms.length === 1 && activeForm) {
    const form = availableForms[0];
    const backgroundImage = getBackgroundImage(form.type, form.config);
    const isPlayerForm = form.type === 'player';

    if (isPlayerForm) {
      return (
        <div className='reg-hub-single'>
          <div className='reg-form-card glass-card'>
            {backgroundImage && <div className='reg-card-overlay'></div>}
            <div className='reg-form-content'>
              <div className='reg-form-container'>
                <div className='reg-form-wrapper'>
                  <PlayerRegistrationForm
                    onSuccess={handleRegistrationComplete}
                    formConfig={playerConfig!}
                    seasonEvent={seasonEvent}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className='reg-hub-single'>
        <div className='reg-form-card glass-card'>
          {backgroundImage && <div className='reg-card-overlay'></div>}
          <div className='reg-form-content'>
            {showDescription && (
              <div className='reg-description-container'>
                <div className='reg-description'>
                  <AutoGridFromDescription
                    config={toRegistrationConfig(form.config)}
                    onRegister={handleToggleView}
                  />
                </div>
                {/* <button
                  className='reg-toggle-btn'
                  onClick={handleToggleView}
                  disabled={isAnimating}
                >
                  <i className='ti ti-eye'></i>
                  <span>Continue to Registration Form</span>
                  <i className='ti ti-arrow-right'></i>
                </button> */}
              </div>
            )}

            {!showDescription && (
              <div className='reg-form-container'>
                <button
                  className='reg-toggle-btn reg-toggle-back-btn'
                  onClick={handleToggleView}
                  disabled={isAnimating}
                >
                  <i className='ti ti-arrow-left'></i>
                  <span>Back to Description</span>
                </button>
                <div className='reg-form-wrapper'>
                  {form.type === 'tournament' && tournamentConfig && (
                    <TournamentRegistrationForm
                      onSuccess={handleRegistrationComplete}
                      formConfig={tournamentConfig as RegistrationFormConfig}
                      tournamentConfig={
                        tournamentConfig as TournamentSpecificConfig
                      }
                      seasonEvent={tournamentSeasonEvent}
                    />
                  )}
                  {form.type === 'tryout' && tryoutConfig && (
                    <TryoutRegistrationForm
                      onSuccess={handleRegistrationComplete}
                      formConfig={tryoutFormConfig!}
                      tryoutConfig={tryoutConfig as TryoutSpecificConfig}
                      seasonEvent={tryoutSeasonEvent}
                    />
                  )}
                  {form.type === 'training' && trainingConfig && (
                    <TrainingRegistrationForm
                      onSuccess={handleRegistrationComplete}
                      formConfig={trainingConfig}
                      seasonEvent={trainingSeasonEvent}
                      description={trainingConfig.description || ''}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // TILES MODE
  if (!activeForm) {
    return (
      <div className='reg-hub-grid'>
        <div className='reg-tiles-grid'>
          {availableForms.map(({ type, config }) => (
            <button
              key={type}
              className='reg-tile'
              style={
                getBackgroundImage(type, config)
                  ? {
                      backgroundImage: `url(${getBackgroundImage(type, config)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {}
              }
              onClick={() => handleTileClick(type)}
            >
              {getBackgroundImage(type, config) && (
                <div className='reg-tile-overlay'></div>
              )}
              <div className='reg-tile-icon'>
                <i className={`ti ${getIcon(type)}`} />
              </div>
              <div className='reg-tile-content'>
                <span className='reg-tile-title'>{getDisplayName(config)}</span>
                <span className='reg-tile-subtitle'>Click to register</span>
              </div>
              <div className='reg-tile-arrow'>
                <i className='ti ti-chevron-right' />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // MULTIPLE FORMS MODE - Selected form
  const selectedForm = availableForms.find((f) => f.type === activeForm);
  if (!selectedForm) return null;

  const backgroundImage = getBackgroundImage(
    selectedForm.type,
    selectedForm.config,
  );

  return (
    <div className='reg-hub-multi'>
      <button className='reg-back-btn' onClick={handleBackToTiles}>
        <i className='ti ti-arrow-left'></i>
      </button>
      <div className='reg-form-card glass-card'>
        {backgroundImage && <div className='reg-card-overlay'></div>}
        <div className='reg-form-content'>
          {showDescription && (
            <>
              <AutoGridFromDescription
                config={toRegistrationConfig(selectedForm.config)}
                onRegister={handleToggleView}
              />
              {/* <button className='reg-toggle-btn' onClick={handleToggleView}>
                <i className='ti ti-chevron-down'></i>
                <span>Continue to Registration Form</span>
                <i className='ti ti-arrow-right'></i>
              </button> */}
            </>
          )}

          {!showDescription && (
            <>
              <button
                className='reg-toggle-btn reg-toggle-back-btn'
                onClick={handleToggleView}
              >
                <i className='ti ti-chevron-up'></i>
                <span>Back to Description</span>
              </button>
              <div className='reg-form-wrapper'>
                {selectedForm.type === 'tournament' && tournamentConfig && (
                  <TournamentRegistrationForm
                    onSuccess={handleRegistrationComplete}
                    formConfig={tournamentConfig as RegistrationFormConfig}
                    tournamentConfig={
                      tournamentConfig as TournamentSpecificConfig
                    }
                    seasonEvent={tournamentSeasonEvent}
                  />
                )}
                {selectedForm.type === 'tryout' && tryoutConfig && (
                  <TryoutRegistrationForm
                    onSuccess={handleRegistrationComplete}
                    formConfig={tryoutFormConfig!}
                    tryoutConfig={tryoutConfig as TryoutSpecificConfig}
                    seasonEvent={tryoutSeasonEvent}
                  />
                )}
                {selectedForm.type === 'training' && trainingConfig && (
                  <TrainingRegistrationForm
                    onSuccess={handleRegistrationComplete}
                    formConfig={trainingConfig}
                    seasonEvent={trainingSeasonEvent}
                    description={trainingConfig.description || ''}
                  />
                )}
                {selectedForm.type === 'player' && playerConfig && (
                  <PlayerRegistrationForm
                    onSuccess={handleRegistrationComplete}
                    formConfig={playerConfig}
                    seasonEvent={seasonEvent}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationHub;
