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
  hasEmbeddedForms?: boolean; // This indicates if there are embedded forms available elsewhere
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
  hasEmbeddedForms = true,
}) => {
  const [activeForm, setActiveForm] = useState<
    'player' | 'tournament' | 'training' | 'tryout' | null
  >(null);

  // For multi-form mode and non-player single forms, track if showing description or form
  const [showDescription, setShowDescription] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Type-safe helper to get isActive
  const getIsActive = useCallback(
    (
      config:
        | RegistrationFormConfig
        | TournamentSpecificConfig
        | TryoutSpecificConfig
        | null
        | undefined,
    ): boolean => {
      if (!config) return false;
      return (config as any).isActive || false;
    },
    [],
  );

  // Memoize active status checks
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

  // Get display name
  const getDisplayName = useCallback(
    (
      config:
        | RegistrationFormConfig
        | TournamentSpecificConfig
        | TryoutSpecificConfig
        | null
        | undefined,
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
          config.displayName ||
          config.tournamentName ||
          'Tournament Registration'
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
    },
    [seasonEvent],
  );

  // Get icon for each registration type
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

  // Get background image for training camp tiles
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

  // Get the proper season event for a config
  const getSeasonEventForConfig = useCallback(
    (
      config:
        | RegistrationFormConfig
        | TournamentSpecificConfig
        | TryoutSpecificConfig
        | null
        | undefined,
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
    },
    [seasonEvent],
  );

  // Memoize current form description
  const currentDescription = useMemo(() => {
    switch (activeForm) {
      case 'tournament':
        if (tournamentConfig) {
          return isTournamentConfig(tournamentConfig)
            ? tournamentConfig.description
            : (tournamentConfig as RegistrationFormConfig).description;
        }
        return null;
      case 'tryout':
        if (tryoutConfig) {
          const desc = (tryoutConfig as any).description;
          if (desc) return desc;
          if (isTryoutConfig(tryoutConfig)) return tryoutConfig.description;
          return (tryoutConfig as RegistrationFormConfig).description;
        }
        return null;
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

  // Get all available registration types (these are the REAL registration forms)
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

  // Set initial active form based on available count
  useEffect(() => {
    if (availableForms.length === 1 && !activeForm) {
      const formType = availableForms[0].type;
      setActiveForm(formType);
      // For single form: show description only for non-player forms
      // Player form shows immediately (no description)
      if (formType === 'player') {
        setShowDescription(false);
      } else {
        setShowDescription(true);
      }
    } else if (availableForms.length > 1 && !activeForm) {
      setActiveForm(null);
      setShowDescription(true);
    }
  }, [availableForms]);

  // Memoize season events
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

  // Memoize tryout form config
  const tryoutFormConfig = useMemo(() => {
    if (!tryoutConfig) return null;
    if (isTryoutConfig(tryoutConfig)) {
      return tryoutToRegistrationConfig(tryoutConfig);
    }
    return tryoutConfig as RegistrationFormConfig;
  }, [tryoutConfig]);

  // Handle tile clicks
  const handleTileClick = useCallback(
    (form: 'player' | 'tournament' | 'training' | 'tryout') => {
      setActiveForm(form);
      // For multi-form: always show description first
      setShowDescription(true);
    },
    [],
  );

  // Handle back to tiles
  const handleBackToTiles = useCallback(() => {
    setActiveForm(null);
    setShowDescription(true);
  }, []);

  // Handle registration complete
  const handleRegistrationComplete = useCallback(() => {
    if (onRegistrationComplete) {
      onRegistrationComplete();
    }
  }, [onRegistrationComplete]);

  // Toggle between description and form (used for multi-form and single non-player forms)
  const handleToggleView = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);

    if (showDescription) {
      const descElement = document.querySelector('.reg-description');
      if (descElement) {
        descElement.classList.add('exit');
      }
    } else {
      const formElement = document.querySelector('.reg-form-wrapper');
      if (formElement) {
        formElement.classList.add('exit');
      }
    }

    setTimeout(() => {
      setShowDescription((prev) => !prev);

      setTimeout(() => {
        const descElement = document.querySelector('.reg-description');
        const formElement = document.querySelector('.reg-form-wrapper');
        if (descElement) descElement.classList.remove('exit');
        if (formElement) formElement.classList.remove('exit');
        setIsAnimating(false);
      }, 50);
    }, 200);
  }, [showDescription, isAnimating]);

  // If no registration forms are active, show nothing (don't render)
  if (availableForms.length === 0) {
    return null;
  }

  // SINGLE FORM MODE
  if (availableForms.length === 1 && activeForm) {
    const form = availableForms[0];
    const backgroundImage = getBackgroundImage(form.type, form.config);
    const isPlayerForm = form.type === 'player';

    // For Player form: show form immediately (no description toggle)
    if (isPlayerForm) {
      return (
        <div className='reg-hub-single'>
          <div className='reg-form-card glass-card'>
            {backgroundImage && <div className='reg-card-overlay'></div>}
            <div className='reg-form-content'>
              <div className='reg-form-container'>
                <div className='reg-form-wrapper'>
                  {form.type === 'player' && playerConfig && (
                    <PlayerRegistrationForm
                      onSuccess={handleRegistrationComplete}
                      formConfig={playerConfig}
                      seasonEvent={seasonEvent}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // For non-player single forms (Tournament, Tryout, Training): show description with toggle
    return (
      <div className='reg-hub-single'>
        <div className='reg-form-card glass-card'>
          {backgroundImage && <div className='reg-card-overlay'></div>}
          <div className='reg-form-content'>
            {/* Description View */}
            {showDescription && (
              <div className='reg-description-container'>
                {currentDescription && (
                  <div className='reg-description'>
                    <AutoGridFromDescription
                      descriptionHtml={currentDescription}
                      onRegister={handleToggleView}
                    />
                  </div>
                )}
                <button
                  className='reg-toggle-btn'
                  onClick={handleToggleView}
                  disabled={isAnimating}
                >
                  <i className='ti ti-eye'></i>
                  <span>Continue to Registration Form</span>
                  <i className='ti ti-arrow-right'></i>
                </button>
              </div>
            )}

            {/* Form View */}
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

  // MULTIPLE FORMS MODE - Show tiles grid (horizontal scroll on desktop)
  if (!activeForm) {
    return (
      <div className='reg-hub-grid'>
        <div className='reg-tiles-grid'>
          {availableForms.map(({ type, config }) => {
            const backgroundImage = getBackgroundImage(type, config);
            const displayName = getDisplayName(config);

            return (
              <button
                key={type}
                className='reg-tile'
                style={
                  backgroundImage
                    ? {
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {}
                }
                onClick={() => handleTileClick(type)}
              >
                {backgroundImage && <div className='reg-tile-overlay'></div>}
                <div className='reg-tile-icon'>
                  <i className={`ti ${getIcon(type)}`} />
                </div>
                <div className='reg-tile-content'>
                  <span className='reg-tile-title'>{displayName}</span>
                  <span className='reg-tile-subtitle'>Click to register</span>
                </div>
                <div className='reg-tile-arrow'>
                  <i className='ti ti-chevron-right' />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // MULTIPLE FORMS MODE - Show selected form with back button and description toggle
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
          {/* Description View - shown first for multi-form */}
          {showDescription && (
            <>
              {currentDescription && (
                <AutoGridFromDescription
                  descriptionHtml={currentDescription}
                  onRegister={handleToggleView}
                />
              )}
              <button className='reg-toggle-btn' onClick={handleToggleView}>
                <i className='ti ti-chevron-down'></i>
                <span>Continue to Registration Form</span>
                <i className='ti ti-arrow-right'></i>
              </button>
            </>
          )}

          {/* Form View - shown after clicking continue */}
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
