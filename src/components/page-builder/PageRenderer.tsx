// src/components/page-builder/PageRenderer.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout, PageSection } from '../../types/page-builder-types';
import SpotlightContent from '../spotlight/SpotlightContent';
import RegistrationHub from '../../feature-module/components/registration/RegistrationHub';
import FormEmbed from '../../components/FormEmbed';
import { useAuth } from '../../context/AuthContext';
import {
  RegistrationFormConfig,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
  SeasonEvent,
} from '../../types/registration-types';

interface PageRendererProps {
  pageSlug: string;
  isEditing?: boolean;
  onSectionClick?: (section: PageSection) => void;
}

const PageRenderer: React.FC<PageRendererProps> = ({
  pageSlug,
  isEditing = false,
  onSectionClick,
}) => {
  const [page, setPage] = useState<PageLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formConfigs, setFormConfigs] = useState<{
    player: RegistrationFormConfig | null;
    training: RegistrationFormConfig | null;
    tournament: RegistrationFormConfig | null;
    tryout: RegistrationFormConfig | null;
  }>({
    player: null,
    training: null,
    tournament: null,
    tryout: null,
  });

  const { isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (pageSlug) {
      fetchPage();
    }
  }, [pageSlug]);

  useEffect(() => {
    // Fetch form configs for any page that might have registration sections
    fetchAllFormConfigs();
  }, []);

  const fetchPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/page-builder/pages/${pageSlug}`;
      console.log('🌐 DEBUG: Fetching page from URL:', url);

      const response = await fetch(url);
      console.log('📡 DEBUG: Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 DEBUG: Response data:', data);

      if (data.success) {
        setPage(data.data);
      } else {
        throw new Error(data.message || 'Failed to load page');
      }
    } catch (err: any) {
      console.error('❌ DEBUG: Error loading page:', err);
      setError(err.message || 'An error occurred while loading the page');

      // Create a default page with registration section if home page fails
      if (pageSlug === 'home') {
        setPage({
          _id: 'default-home',
          pageType: 'home',
          pageSlug: 'home',
          pageTitle: 'Home',
          metaDescription: 'Default home page',
          version: '1.0.0',
          sections: [
            {
              id: 'default-registration-section',
              type: 'registration',
              title: 'Registration',
              content: '',
              position: 0,
              isActive: true,
              config: {
                showTitle: true,
                showViewAll: false,
              },
              styles: {
                className: 'registration-section',
                paddingTop: '2rem',
                paddingBottom: '2rem',
              },
            },
          ],
          settings: {
            showHeader: true,
            showFooter: true,
            showSponsorBanner: true,
            sponsorBannerPosition: 'bottom',
            containerMaxWidth: '1200px',
            defaultSectionSpacing: '2rem',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            accentColor: '#594230',
            canonicalUrl: '/',
            openGraphImage: '',
            headerScripts: '',
            footerScripts: '',
          },
          parentTemplate: '',
          isTemplate: false,
          isActive: true,
          publishedBy: 'system',
          createdBy: 'system',
          updatedBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: new Date(),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFormConfigs = async () => {
    try {
      console.log('🔍 PageRenderer: Fetching form configs...');

      let formConfigsData = {};
      let tournamentConfigsData: TournamentSpecificConfig[] = [];
      let tryoutConfigsData: TryoutSpecificConfig[] = [];

      try {
        const formResponse = await fetch(`${API_BASE_URL}/admin/form-configs`);
        if (formResponse.ok) {
          formConfigsData = await formResponse.json();
          console.log('📋 Form configs data:', formConfigsData);
        }
      } catch (err) {
        console.error('Error fetching form configs:', err);
      }

      try {
        const tournamentResponse = await fetch(
          `${API_BASE_URL}/admin/tournament-configs`,
        );
        if (tournamentResponse.ok) {
          tournamentConfigsData = await tournamentResponse.json();
        }
      } catch (err) {
        console.error('Error fetching tournament configs:', err);
      }

      try {
        const tryoutResponse = await fetch(
          `${API_BASE_URL}/admin/tryout-configs`,
        );
        if (tryoutResponse.ok) {
          tryoutConfigsData = await tryoutResponse.json();
        }
      } catch (err) {
        console.error('Error fetching tryout configs:', err);
      }

      // Build configs - IMPORTANT: This logic should match your original HomePage
      const configsData = {
        player: null as RegistrationFormConfig | null,
        training: null as RegistrationFormConfig | null,
        tournament: null as RegistrationFormConfig | null,
        tryout: null as RegistrationFormConfig | null,
      };

      // CRITICAL FIX: Process form configs with the SAME logic as HomePage
      Object.entries(formConfigsData).forEach(
        ([key, configData]: [string, any]) => {
          if (!configData.isActive) return;

          console.log(`🔍 Processing ACTIVE form config: ${key}`, {
            tournamentName: configData.tournamentName,
            tryoutName: configData.tryoutName,
            hasPackages: !!configData.pricing?.packages,
            packageCount: configData.pricing?.packages?.length || 0,
            basePrice: configData.pricing?.basePrice,
            season: configData.season,
          });

          // Check if this is a tournament config (shouldn't happen from form-configs)
          if (configData.tournamentName) {
            return;
          }

          // Check if this is a tryout config (shouldn't happen from form-configs)
          if (configData.tryoutName) {
            return;
          }

          // Check if this is a training config
          const isTrainingKey =
            key.toLowerCase().includes('training') ||
            key.toLowerCase().includes('select');
          const isTrainingSeason =
            configData.season &&
            configData.season.toLowerCase().includes('training');
          const hasPackages =
            configData.pricing?.packages &&
            configData.pricing.packages.length > 0;

          if (
            (hasPackages || isTrainingKey || isTrainingSeason) &&
            !configsData.training
          ) {
            console.log(
              `✅ Found ACTIVE training: ${configData.season || key}`,
            );
            configsData.training = {
              _id: configData._id,
              season: configData.season || key.split('-')[0],
              year:
                configData.year ||
                parseInt(key.split('-')[1]) ||
                new Date().getFullYear(),
              isActive: configData.isActive,
              requiresPayment:
                configData.requiresPayment !== undefined
                  ? configData.requiresPayment
                  : true,
              requiresQualification: configData.requiresQualification || false,
              pricing: {
                basePrice: configData.pricing?.basePrice || 0,
                packages: (configData.pricing?.packages || []).map(
                  (pkg: any) => ({
                    id:
                      pkg.id || pkg._id?.toString() || Math.random().toString(),
                    name: pkg.name || '',
                    price: pkg.price || 0,
                    description: pkg.description || '',
                  }),
                ),
              },
              description: configData.description || '',
              displayName: configData.displayName,
              createdAt: configData.createdAt,
              updatedAt: configData.updatedAt,
              __v: configData.__v,
            };
            return;
          }

          // Check if this is a player config
          if (
            !configsData.player &&
            !configData.tournamentName &&
            !configData.tryoutName &&
            (!configData.pricing?.packages ||
              configData.pricing.packages.length === 0)
          ) {
            console.log(
              `✅ Found ACTIVE player registration: ${configData.season || key}`,
            );
            configsData.player = {
              _id: configData._id,
              season: configData.season || key.split('-')[0],
              year:
                configData.year ||
                parseInt(key.split('-')[1]) ||
                new Date().getFullYear(),
              isActive: configData.isActive,
              requiresPayment: false,
              requiresQualification: false,
              pricing: { basePrice: 0, packages: [] },
              createdAt: configData.createdAt,
              updatedAt: configData.updatedAt,
              __v: configData.__v,
            };
          }
        },
      );

      // Process tournament configs
      if (tournamentConfigsData.length > 0) {
        const activeTournament = tournamentConfigsData.find(
          (config: TournamentSpecificConfig) => config.isActive,
        );

        if (activeTournament) {
          console.log(
            `✅ Found ACTIVE tournament: ${activeTournament.tournamentName}`,
          );
          configsData.tournament = {
            _id: activeTournament._id,
            season: activeTournament.tournamentName,
            year: activeTournament.tournamentYear,
            isActive: activeTournament.isActive,
            requiresPayment: true,
            requiresQualification: false,
            pricing: {
              basePrice: activeTournament.tournamentFee || 0,
              packages: [],
            },
            tournamentName: activeTournament.tournamentName,
            tournamentYear: activeTournament.tournamentYear,
            displayName: activeTournament.displayName,
            registrationDeadline: activeTournament.registrationDeadline,
            tournamentDates: activeTournament.tournamentDates || [],
            locations: activeTournament.locations || [],
            divisions: activeTournament.divisions || [],
            ageGroups: activeTournament.ageGroups || [],
            requiresRoster: activeTournament.requiresRoster || false,
            requiresInsurance: activeTournament.requiresInsurance || false,
            paymentDeadline: activeTournament.paymentDeadline,
            refundPolicy: activeTournament.refundPolicy,
            rulesDocumentUrl: activeTournament.rulesDocumentUrl,
            scheduleDocumentUrl: activeTournament.scheduleDocumentUrl,
            tournamentFee: activeTournament.tournamentFee || 0,
            createdAt: activeTournament.createdAt,
            updatedAt: activeTournament.updatedAt,
            __v: activeTournament.__v,
            description: activeTournament.description || '',
          };
        }
      }

      // Process tryout configs
      if (tryoutConfigsData.length > 0) {
        const activeTryout = tryoutConfigsData.find(
          (config: TryoutSpecificConfig) => config.isActive,
        );

        if (activeTryout) {
          console.log(`🎯 Found ACTIVE tryout: ${activeTryout.tryoutName}`);
          configsData.tryout = {
            _id: activeTryout._id,
            season: activeTryout.tryoutName,
            year: activeTryout.tryoutYear,
            isActive: activeTryout.isActive,
            requiresPayment: activeTryout.requiresPayment,
            requiresQualification: false,
            pricing: {
              basePrice: activeTryout.tryoutFee || 0,
              packages: [],
            },
            tryoutName: activeTryout.tryoutName,
            tryoutYear: activeTryout.tryoutYear,
            displayName: activeTryout.displayName,
            registrationDeadline: activeTryout.registrationDeadline,
            tryoutDates: activeTryout.tryoutDates || [],
            locations: activeTryout.locations || [],
            divisions: activeTryout.divisions || [],
            ageGroups: activeTryout.ageGroups || [],
            requiresRoster: activeTryout.requiresRoster || false,
            requiresInsurance: activeTryout.requiresInsurance || false,
            paymentDeadline: activeTryout.paymentDeadline,
            refundPolicy: activeTryout.refundPolicy,
            tryoutFee: activeTryout.tryoutFee || 0,
            createdAt: activeTryout.createdAt,
            updatedAt: activeTryout.updatedAt,
            __v: activeTryout.__v,
            description: activeTryout.description || '',
          };
        }
      }

      console.log('✅ ALL ACTIVE Configurations in PageRenderer:', {
        hasTournament: !!configsData.tournament,
        tournamentName: configsData.tournament?.tournamentName,
        tournamentIsActive: configsData.tournament?.isActive,
        hasTryout: !!configsData.tryout,
        tryoutName: configsData.tryout?.tryoutName,
        tryoutIsActive: configsData.tryout?.isActive,
        hasTraining: !!configsData.training,
        trainingIsActive: configsData.training?.isActive,
        hasPlayer: !!configsData.player,
        playerIsActive: configsData.player?.isActive,
        allConfigs: configsData,
      });

      // If NO forms are active, show player registration as default (MATCHING HomePage LOGIC)
      if (
        !configsData.tournament?.isActive &&
        !configsData.tryout?.isActive &&
        !configsData.training?.isActive &&
        !configsData.player?.isActive
      ) {
        console.log('📝 No active forms, showing default player registration');
        configsData.player = {
          season: 'Player Registration',
          year: new Date().getFullYear(),
          isActive: true,
          requiresPayment: false,
          requiresQualification: false,
          pricing: { basePrice: 0, packages: [] },
        };
      }

      setFormConfigs(configsData);
    } catch (error) {
      console.error(
        '❌ Error fetching form configurations in PageRenderer:',
        error,
      );
      // Set default player registration on error (MATCHING HomePage LOGIC)
      setFormConfigs({
        player: {
          season: 'Player Registration',
          year: new Date().getFullYear(),
          isActive: true,
          requiresPayment: false,
          requiresQualification: false,
          pricing: { basePrice: 0, packages: [] },
        },
        training: null,
        tournament: null,
        tryout: null,
      });
    }
  };

  const getDefaultSeasonEvent = (): SeasonEvent => {
    // Priority: tournament > tryout > training > player
    if (formConfigs.tournament?.isActive && formConfigs.tournament) {
      return {
        season: formConfigs.tournament.tournamentName || 'Tournament',
        year:
          formConfigs.tournament.tournamentYear ||
          formConfigs.tournament.year ||
          2025,
        eventId:
          formConfigs.tournament._id?.toString() || 'tournament-registration',
        description:
          formConfigs.tournament.displayName || 'Tournament Registration',
      };
    }

    if (formConfigs.tryout?.isActive && formConfigs.tryout) {
      return {
        season: formConfigs.tryout.tryoutName || 'Tryout',
        year: formConfigs.tryout.tryoutYear || formConfigs.tryout.year || 2025,
        eventId: formConfigs.tryout._id?.toString() || 'tryout-registration',
        description: formConfigs.tryout.displayName || 'Tryout Registration',
      };
    }

    if (formConfigs.training?.isActive && formConfigs.training) {
      return {
        season: formConfigs.training.season || 'Training',
        year: formConfigs.training.year || 2025,
        eventId:
          formConfigs.training._id?.toString() || 'training-registration',
        description:
          formConfigs.training.season || 'Basketball Training Registration',
      };
    }

    if (formConfigs.player?.isActive && formConfigs.player) {
      return {
        season: formConfigs.player.season || 'Player Registration',
        year: formConfigs.player.year || 2025,
        eventId: formConfigs.player._id?.toString() || 'player-registration',
        description: 'Add Players to Your Account',
      };
    }

    // Default fallback - ALWAYS return player registration as fallback
    return {
      season: 'Player Registration',
      year: new Date().getFullYear(),
      eventId: 'player-registration',
      description: 'Add Players to Your Account',
    };
  };

  const renderCTASection = (section: PageSection) => {
    // Get CTA configuration with defaults
    const buttonText = section.config?.buttonText || 'Get Started';
    const buttonLink = section.config?.buttonLink || '#';
    const buttonStyle = section.config?.buttonStyle || 'primary';
    const buttonSize = section.config?.buttonSize || 'lg';
    const alignment = section.config?.alignment || 'center';
    const backgroundImage = section.config?.backgroundImage;
    const overlayOpacity = section.config?.overlayOpacity || 0.5;
    const openInNewTab = section.config?.openInNewTab || false;
    const showTitle = section.config?.showTitle !== false;
    const showSubtitle = section.config?.showSubtitle !== false;
    const secondaryButtonText = section.config?.secondaryButtonText;
    const secondaryButtonLink = section.config?.secondaryButtonLink;
    const secondaryButtonStyle =
      section.config?.secondaryButtonStyle || 'secondary';
    const buttonClass = section.config?.buttonClass || '';

    // Get title alignment
    const titleAlignment = section.config?.titleAlignment || 'center';

    // Button class based on size and custom class
    const btnClass = `btn btn-${buttonStyle} btn-${buttonSize} ${buttonClass}`;

    // Container styles
    const containerStyle: React.CSSProperties = {
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      textAlign: alignment as any,
      color:
        section.styles?.textColor || (backgroundImage ? '#ffffff' : '#333333'),
      borderRadius: section.styles?.borderRadius || '0.5rem',
      overflow: 'hidden',
    };

    // If background image exists, add a dark overlay
    const overlayStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: backgroundImage ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
      opacity: backgroundImage ? overlayOpacity : 0,
      transition: 'opacity 0.3s ease',
    };

    // Content container - positioned relative to appear above overlay
    const contentStyle: React.CSSProperties = {
      position: 'relative',
      zIndex: 1,
      padding: backgroundImage ? '4rem 1rem' : '0rem',
    };

    // Title style with alignment
    const titleStyle = {
      textAlign: titleAlignment as 'left' | 'center' | 'right',
      fontSize: section.styles?.titleSize,
      fontWeight: section.styles?.titleWeight,
      color:
        section.styles?.titleColor || (backgroundImage ? '#ffffff' : '#333333'),
    };

    return (
      <div
        className={`cta-section ${section.styles?.className || ''}`}
        style={{ ...containerStyle, ...section.styles }}
      >
        {/* Background overlay */}
        {backgroundImage && <div style={overlayStyle} />}

        <div style={contentStyle}>
          {/* Title */}
          {showTitle && section.title && (
            <h2
              className={`cta-title mb-3 ${section.styles?.titleClass || ''}`}
              style={titleStyle}
            >
              {section.title}
            </h2>
          )}

          {/* Subtitle */}
          {showSubtitle && section.subtitle && (
            <p
              className='cta-subtitle mb-4'
              style={{ textAlign: titleAlignment }}
            >
              {section.subtitle}
            </p>
          )}

          {/* Button Group */}
          <div
            className={`d-flex ${
              alignment === 'center'
                ? 'justify-content-center'
                : alignment === 'right'
                  ? 'justify-content-end'
                  : ''
            } flex-wrap gap-3`}
          >
            {/* Primary Button */}
            {buttonText && buttonLink && (
              <a
                href={buttonLink}
                className={btnClass}
                target={openInNewTab ? '_blank' : '_self'}
                rel={openInNewTab ? 'noopener noreferrer' : undefined}
                style={{
                  minWidth: '200px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {buttonText}
              </a>
            )}

            {/* Secondary button if configured */}
            {secondaryButtonText && secondaryButtonLink && (
              <a
                href={secondaryButtonLink}
                className={`btn btn-${secondaryButtonStyle} btn-${buttonSize}`}
                target={openInNewTab ? '_blank' : '_self'}
                rel={openInNewTab ? 'noopener noreferrer' : undefined}
                style={{
                  minWidth: '200px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {secondaryButtonText}
              </a>
            )}
          </div>

          {/* Custom content if provided */}
          {section.content && (
            <div
              className='mt-4'
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
        </div>
      </div>
    );
  };

  const renderSection = (section: PageSection, index: number) => {
    const sectionStyles = {
      paddingTop: section.styles?.paddingTop || '2rem',
      paddingBottom: section.styles?.paddingBottom || '2rem',
      backgroundColor: section.styles?.backgroundColor,
      color: section.styles?.textColor,
      marginTop: section.styles?.marginTop,
      marginBottom: section.styles?.marginBottom,
    };

    const containerClass =
      section.styles?.layout === 'full-width'
        ? 'container-fluid'
        : section.styles?.containerClass || 'container';

    const handleClick = () => {
      if (isEditing && onSectionClick) {
        onSectionClick(section);
      }
    };

    // Get alignment configurations with defaults
    const titleAlignment = section.config?.titleAlignment || 'center';
    const contentAlignment = section.config?.contentAlignment || 'left';
    const subtitleAlignment = section.config?.subtitleAlignment || 'center';

    // Title style
    const titleStyle = {
      textAlign: titleAlignment as 'left' | 'center' | 'right' | 'justify',
      fontSize: section.styles?.titleSize || section.config?.titleFontSize,
      fontWeight:
        section.styles?.titleWeight || section.config?.titleFontWeight,
      color:
        section.styles?.titleColor ||
        section.config?.titleColor ||
        section.styles?.textColor ||
        '#333333',
      fontFamily:
        section.styles?.titleFontFamily || section.config?.titleFontFamily,
    };

    // Subtitle style
    const subtitleStyle = {
      textAlign: subtitleAlignment as 'left' | 'center' | 'right' | 'justify',
      fontSize: section.styles?.subtitleSize,
      fontWeight: section.styles?.subtitleWeight,
      color:
        section.styles?.subtitleColor || section.styles?.textColor || '#666666',
    };

    // Content style - Apply content size and font family
    const contentStyle = {
      textAlign: contentAlignment as 'left' | 'center' | 'right' | 'justify',
      fontSize: section.styles?.contentSize,
      color:
        section.styles?.contentColor || section.styles?.textColor || '#333333',
      fontFamily: section.styles?.contentFontFamily,
      lineHeight: '1.6',
    };

    // SpotlightContent handles its own header
    const shouldShowSectionHeader = section.type !== 'spotlight';

    const sectionContent = (
      <div
        key={section.id}
        className={`page-section ${isEditing ? 'editable-section' : ''} ${
          section.styles?.className || ''
        }`}
        style={sectionStyles}
        onClick={handleClick}
        data-section-id={section.id}
      >
        <div className={containerClass}>
          {/* Section Title - NEVER show for spotlight sections */}
          {shouldShowSectionHeader &&
            section.title &&
            section.config?.showTitle !== false && (
              <div className='section-header mb-4' style={contentStyle}>
                <h2
                  className={`section-title ${
                    section.styles?.titleClass || ''
                  }`}
                  style={titleStyle}
                >
                  {section.title}
                </h2>
                {section.subtitle && (
                  <p
                    className='section-subtitle text-muted'
                    style={subtitleStyle}
                  >
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

          {/* Section Content based on type */}
          <div
            className={`section-content ${section.styles?.contentClass || ''}`}
            style={contentStyle}
          >
            {renderSectionContent(section)}
          </div>

          {/* View All Link - Also handle for spotlight sections */}
          {section.config?.showViewAll && section.config?.viewAllLink && (
            <div
              className='section-footer mt-4'
              style={{ textAlign: contentAlignment }}
            >
              <a
                href={section.config.viewAllLink}
                className='btn btn-outline-primary'
              >
                View All <i className='ti ti-arrow-right ms-1'></i>
              </a>
            </div>
          )}
        </div>
      </div>
    );

    return sectionContent;
  };

  // In PageRenderer.tsx - Update the renderSectionContent function
  const renderSectionContent = (section: PageSection) => {
    switch (section.type) {
      case 'welcome':
      case 'text':
        return (
          <div
            dangerouslySetInnerHTML={{
              __html: section.content || '',
            }}
          />
        );

      case 'cta':
        return renderCTASection(section);

      case 'image':
        return (
          <div className='image-section'>
            {section.content ? (
              // If there's HTML content in the section, render it
              <div
                dangerouslySetInnerHTML={{
                  __html: section.content,
                }}
              />
            ) : (
              // Otherwise, render a basic image with config options
              <div className='image-container text-center'>
                {section.config?.media?.[0]?.url ? (
                  <img
                    src={section.config.media[0].url}
                    alt={
                      section.config.media[0].alt || section.title || 'Image'
                    }
                    className={`img-fluid ${section.styles?.className || ''}`}
                    style={{
                      maxWidth: section.config.media[0].width || '100%',
                      height: section.config.media[0].height || 'auto',
                      borderRadius: section.styles?.borderRadius || '0',
                      boxShadow: section.styles?.boxShadow || 'none',
                    }}
                  />
                ) : (
                  <div className='alert alert-warning'>
                    No image configured for this section.
                  </div>
                )}
                {section.config?.media?.[0]?.caption && (
                  <div className='image-caption mt-2'>
                    <p className='text-muted'>
                      {section.config.media[0].caption}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'image-gallery':
        return (
          <div className='image-gallery-section'>
            {section.config?.media &&
            Array.isArray(section.config.media) &&
            section.config.media.length > 0 ? (
              <div className='row'>
                {section.config.media.map((image, index: number) => (
                  <div
                    key={index}
                    className={`col-${section.config?.columns || 12} col-md-${
                      12 / (section.config?.columns || 3)
                    } mb-3`}
                  >
                    <div className='gallery-item'>
                      <img
                        src={image.url}
                        alt={image.caption || `Gallery image ${index + 1}`}
                        className='img-fluid rounded'
                        style={{
                          width: '100%',
                          height: image.height || '200px',
                          objectFit: 'cover',
                        }}
                      />
                      {image.caption && (
                        <div className='gallery-caption mt-2'>
                          <p className='small text-muted'>{image.caption}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : section.content ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: section.content,
                }}
              />
            ) : (
              <div className='alert alert-info'>
                Configure images in the gallery section settings.
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className='video-section'>
            {section.content ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: section.content,
                }}
              />
            ) : section.config?.videoUrl ? (
              <div className='video-container'>
                {section.config.videoUrl.includes('youtube.com') ||
                section.config.videoUrl.includes('youtu.be') ? (
                  // YouTube embed
                  <div className='ratio ratio-16x9'>
                    <iframe
                      src={`https://www.youtube.com/embed/${
                        section.config.videoUrl.includes('youtu.be')
                          ? section.config.videoUrl.split('/').pop()
                          : new URL(section.config.videoUrl).searchParams.get(
                              'v',
                            )
                      }`}
                      title={section.title || 'Video'}
                      allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : section.config.videoUrl.includes('vimeo.com') ? (
                  // Vimeo embed
                  <div className='ratio ratio-16x9'>
                    <iframe
                      src={`https://player.vimeo.com/video/${section.config.videoUrl
                        .split('/')
                        .pop()}`}
                      title={section.title || 'Video'}
                      allow='autoplay; fullscreen; picture-in-picture'
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  // Direct video file
                  <video
                    style={{ width: '100%' }}
                    className={section.styles?.className || ''}
                    autoPlay={section.config?.autoplay}
                    muted={section.config?.muted}
                    loop={section.config?.loop}
                    controls={section.config?.showControls !== false}
                  >
                    <source src={section.config.videoUrl} type='video/mp4' />
                    Your browser does not support the video tag.
                  </video>
                )}
                {section.config?.media?.[0]?.caption && (
                  <div className='video-caption mt-2'>
                    <p className='text-muted'>
                      {section.config.media[0].caption}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className='alert alert-warning'>
                No video URL configured for this section.
              </div>
            )}
          </div>
        );

      case 'spotlight':
        return (
          <SpotlightContent
            limit={section.config?.limit || 1}
            showTitle={section.config?.showTitle !== false}
            title={section.title || 'In The Spotlight'}
            showViewAll={section.config?.showViewAll}
            viewAllLink={section.config?.viewAllLink || '/in-the-spotlight'}
            featuredOnly={section.config?.showFeatured !== false}
            showImageModal={true}
            className={section.styles?.className}
          />
        );

      case 'form':
        // If no form ID, show warning
        if (!section.config?.formId) {
          return (
            <div className={`form-section ${section.styles?.className || ''}`}>
              <div className='alert alert-warning'>No form selected</div>
            </div>
          );
        }

        // Render a wrapper that will conditionally show/hide based on form status
        return (
          <div className={`form-section ${section.styles?.className || ''}`}>
            {/* Show section title if configured */}
            {section.title && section.config?.showTitle !== false && (
              <div className='section-header mb-4'>
                <h2 className='section-title'>{section.title}</h2>
                {section.subtitle && (
                  <p className='section-subtitle text-muted'>
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Show custom form title if provided */}
            {section.config?.showFormTitle !== false &&
              section.config?.formTitle && (
                <h3 className='form-title mb-3'>{section.config.formTitle}</h3>
              )}

            {/* FormEmbedWrapper handles the conditional rendering */}
            <FormEmbed
              formId={section.config.formId}
              wrapperClassName='card p-5'
            />
          </div>
        );

      case 'registration':
        return (
          <div className='registration-section'>
            {/* Show loading if still checking */}
            {!formConfigs.player &&
            !formConfigs.training &&
            !formConfigs.tournament &&
            !formConfigs.tryout ? (
              <div className='text-center p-5'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>
                    Loading registration...
                  </span>
                </div>
                <p className='mt-3'>Checking registration availability...</p>
              </div>
            ) : (
              <RegistrationHub
                playerConfig={formConfigs.player}
                trainingConfig={formConfigs.training}
                tournamentConfig={formConfigs.tournament}
                tryoutConfig={formConfigs.tryout}
                seasonEvent={getDefaultSeasonEvent()}
                onRegistrationComplete={() => {
                  fetchAllFormConfigs();
                  if (isAuthenticated) checkAuth();
                }}
              />
            )}
          </div>
        );

      case 'sponsors':
        return (
          <div className='sponsors-section'>
            {section.content ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: section.content,
                }}
              />
            ) : (
              <div className='text-center'>
                {/* Section Title */}
                {section.title && section.config?.showTitle !== false && (
                  <div className='section-header mb-4'>
                    <h2 className='section-title'>{section.title}</h2>
                    {section.subtitle && (
                      <p className='section-subtitle text-muted'>
                        {section.subtitle}
                      </p>
                    )}
                  </div>
                )}

                {/* Sponsors Grid */}
                <div className='sponsors-grid'>
                  {section.config?.media &&
                  Array.isArray(section.config.media) ? (
                    <div className='row justify-content-center'>
                      {section.config.media.map(
                        (sponsor: any, index: number) => (
                          <div
                            key={index}
                            // Use optional chaining and type assertion
                            className={`col-6 col-md-4 col-lg-3 mb-4 ${
                              (section.config as any)?.className || ''
                            }`}
                          >
                            <div className='sponsor-item text-center p-3'>
                              {sponsor.url ? (
                                <a
                                  href={sponsor.link || '#'}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='d-block'
                                >
                                  <img
                                    src={sponsor.url}
                                    alt={sponsor.alt || `Sponsor ${index + 1}`}
                                    className='img-fluid sponsor-logo'
                                    style={{
                                      // Use type assertion for logoHeight
                                      maxHeight:
                                        (section.config as any)?.logoHeight ||
                                        '80px',
                                      maxWidth: '100%',
                                      objectFit: 'contain',
                                      filter: sponsor.grayscale
                                        ? 'grayscale(100%)'
                                        : 'none',
                                      opacity: sponsor.opacity || 1,
                                    }}
                                  />
                                </a>
                              ) : (
                                <div
                                  className='sponsor-placeholder bg-light rounded d-flex align-items-center justify-content-center'
                                  style={{
                                    // Use type assertion for logoHeight
                                    height:
                                      (section.config as any)?.logoHeight ||
                                      '80px',
                                  }}
                                >
                                  <span className='text-muted'>
                                    Sponsor Logo
                                  </span>
                                </div>
                              )}

                              {sponsor.name && (
                                <h6 className='sponsor-name mt-3 mb-1'>
                                  {sponsor.name}
                                </h6>
                              )}
                              {sponsor.level && (
                                <span
                                  className={`badge sponsor-level bg-${
                                    sponsor.levelColor || 'primary'
                                  }`}
                                >
                                  {sponsor.level}
                                </span>
                              )}
                              {sponsor.description && (
                                <p className='sponsor-description small text-muted mt-2 mb-0'>
                                  {sponsor.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className='alert alert-info'>
                      <p>No sponsors configured yet.</p>
                      <p className='small mb-0'>
                        Add sponsor logos and information in the section editor.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      // Add other section types as needed
      case 'custom':
        return section.content ? (
          <div
            dangerouslySetInnerHTML={{
              __html: section.content,
            }}
          />
        ) : (
          <div className='alert alert-info'>Custom HTML content goes here.</div>
        );

      // Simplified versions for other types
      case 'team':
      case 'stats':
      case 'sponsors':
      case 'contact-form':
      case 'map':
      case 'social-feed':
      case 'tournament':
      case 'pricing':
      case 'faq':
      case 'schedule':
        return section.content ? (
          <div
            dangerouslySetInnerHTML={{
              __html: section.content,
            }}
          />
        ) : (
          <div className='alert alert-info'>
            Section type "{section.type}" is coming soon. For now, you can use
            custom HTML content in this section.
          </div>
        );

      default:
        return (
          <div className='alert alert-info'>
            Section type "{section.type}" is not yet implemented. You can add
            custom HTML content in the editor.
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className='text-center py-5'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='alert alert-danger'>
        <h4>Error Loading Page</h4>
        <p>{error}</p>
        <button className='btn btn-primary' onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  if (!page) {
    return (
      <div className='alert alert-warning'>
        <h4>Page Not Found</h4>
        <p>The page "{pageSlug}" could not be found.</p>
        <button className='btn btn-primary' onClick={() => navigate('/')}>
          Go to Home
        </button>
      </div>
    );
  }

  // Apply page-wide styles
  const pageStyles = {
    backgroundColor: page.settings.backgroundColor,
    color: page.settings.textColor,
  };

  return (
    <div className='page-container' style={pageStyles}>
      {/* Page Content - Render sections in order */}
      <main className='page-content'>
        {page.sections
          .filter((section: PageSection) => section.isActive)
          .sort((a: PageSection, b: PageSection) => a.position - b.position)
          .map((section: PageSection, index: number) =>
            renderSection(section, index),
          )}
      </main>
    </div>
  );
};

export default PageRenderer;
