import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLayout, PageSection } from '../../types/page-builder-types';
import SpotlightContent from '../../components/spotlight/SpotlightContent';
import RegistrationHub from '../../feature-module/components/registration/RegistrationHub';
import FormEmbed from '../../components/FormEmbed';
import {
  RegistrationFormConfig,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
  SeasonEvent,
} from '../../types/registration-types';
import './HomeTileRenderer.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ─── Section → tile metadata ──────────────────────────────────────────────────
interface TileMeta {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
}

function sectionToTileMeta(section: PageSection): TileMeta {
  const iconMap: Record<string, string> = {
    registration: 'ti-user-plus',
    form: 'ti-clipboard-list',
    spotlight: 'ti-star',
    cta: 'ti-rocket',
    video: 'ti-player-play',
    image: 'ti-photo',
    'image-gallery': 'ti-layout-grid',
    text: 'ti-ball-basketball',
    welcome: 'ti-home',
    sponsors: 'ti-building',
    tournament: 'ti-trophy',
    schedule: 'ti-calendar',
    team: 'ti-users',
    stats: 'ti-chart-bar',
    custom: 'ti-code',
  };
  let label =
    section.title ||
    section.type.charAt(0).toUpperCase() + section.type.slice(1);

  // Override for form type to a generic title
  if (section.type === 'form') {
    label = 'Events';
  }

  return {
    id: section.id,
    label: label,
    sublabel: section.subtitle,
    icon: iconMap[section.type] || 'ti-layout',
  };
}

// ─── Get background image based on tile index and type ────────────────────
function getTileBackgroundImage(index: number, sectionType: string): string {
  // Map indices to specific background images (sequential)
  const backgroundMap: Record<number, string> = {
    0: '/assets/img/theme/tile_01.png', // Welcome
    1: '/assets/img/theme/tile_02.png', // Registration
    2: '/assets/img/theme/tile_03.png', // Form
    3: '/assets/img/theme/tile_04.png', // Spotlight
    4: '/assets/img/theme/tile_05.png', // Additional tiles
    5: '/assets/img/theme/tile_06.png',
    6: '/assets/img/theme/tile_07.png',
    7: '/assets/img/theme/tile_08.png',
    8: '/assets/img/theme/tile_09.png',
    9: '/assets/img/theme/tile_10.png',
  };

  // Use index-based mapping if available
  if (backgroundMap[index]) {
    return backgroundMap[index];
  }

  // Fallback to type-based mapping
  if (sectionType === 'welcome') return '/assets/img/theme/tile_01.png';
  if (sectionType === 'registration') return '/assets/img/theme/tile_02.png';
  if (sectionType === 'form') return '/assets/img/theme/tile_03.png';
  if (sectionType === 'spotlight') return '/assets/img/theme/tile_04.png';

  // Default fallback - cycle through available images
  const defaultImages = [
    '/assets/img/theme/tile_05.png',
    '/assets/img/theme/tile_06.png',
    '/assets/img/theme/tile_07.png',
    '/assets/img/theme/tile_08.png',
  ];
  return defaultImages[index % defaultImages.length];
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  pageSlug: string;
}

const HomeTileRenderer: React.FC<Props> = ({ pageSlug }) => {
  const { isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState<PageLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const [formConfigs, setFormConfigs] = useState<{
    player: RegistrationFormConfig | null;
    training: RegistrationFormConfig | null;
    tournament: RegistrationFormConfig | null;
    tryout: RegistrationFormConfig | null;
  }>({ player: null, training: null, tournament: null, tryout: null });
  const [activeFormIds, setActiveFormIds] = useState<Set<string>>(new Set());

  // ── fetch page ─────────────────────────────────────────────────────────────
  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/page-builder/pages/${pageSlug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setPage(data.data);
      else throw new Error(data.message || 'Failed to load page');
    } catch {
      setPage({
        _id: 'default-home',
        pageType: 'home',
        pageSlug: 'home',
        pageTitle: 'Home',
        metaDescription: '',
        version: '1.0.0',
        sections: [
          {
            id: 'default-welcome-section',
            type: 'welcome',
            title: 'Welcome to Bothell Select',
            content:
              '<h2>Welcome to Bothell Select Basketball</h2><p>Join our community and be part of something great.</p>',
            position: 0,
            isActive: true,
            config: {},
            styles: {},
          },
          {
            id: 'default-registration-section',
            type: 'registration',
            title: 'Registration',
            content: '',
            position: 1,
            isActive: true,
            config: { showTitle: true, showViewAll: false },
            styles: {
              className: 'registration-section',
              paddingTop: '2rem',
              paddingBottom: '2rem',
            },
          },
          {
            id: 'default-form-section',
            type: 'form',
            title: 'Contact Form',
            content: '',
            position: 2,
            isActive: true,
            config: { formId: 'default-form' },
            styles: {},
          },
          {
            id: 'default-spotlight-section',
            type: 'spotlight',
            title: 'In The Spotlight',
            content: '',
            position: 3,
            isActive: true,
            config: { limit: 1, showFeatured: true },
            styles: {},
          },
        ],
        settings: {
          showHeader: true,
          showFooter: true,
          showSponsorBanner: true,
          sponsorBannerPosition: 'bottom',
          containerMaxWidth: '1200px',
          defaultSectionSpacing: '2rem',
          backgroundColor: 'transparent',
          textColor: '#ffffff',
          accentColor: '#506ee4',
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
    } finally {
      setLoading(false);
    }
  }, [pageSlug]);

  // ── fetch active forms ─────────────────────────────────────────────────────
  const fetchActiveForms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/forms/published`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const ids = new Set<string>(
            data.data
              .filter((f: any) => f.status === 'published')
              .map((f: any) => f._id?.toString())
              .filter(Boolean),
          );
          setActiveFormIds(ids);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // ── fetch form configs ─────────────────────────────────────────────────────
  const fetchAllFormConfigs = useCallback(async () => {
    try {
      let formConfigsData: Record<string, any> = {};
      let tournamentConfigs: TournamentSpecificConfig[] = [];
      let tryoutConfigs: TryoutSpecificConfig[] = [];

      try {
        const r = await fetch(`${API_BASE_URL}/admin/form-configs`);
        if (r.ok) formConfigsData = await r.json();
      } catch {
        /* ignore */
      }

      try {
        const r = await fetch(`${API_BASE_URL}/admin/tournament-configs`);
        if (r.ok) tournamentConfigs = await r.json();
      } catch {
        /* ignore */
      }

      try {
        const r = await fetch(`${API_BASE_URL}/admin/tryout-configs`);
        if (r.ok) tryoutConfigs = await r.json();
      } catch {
        /* ignore */
      }

      const configs: typeof formConfigs = {
        player: null,
        training: null,
        tournament: null,
        tryout: null,
      };

      Object.entries(formConfigsData).forEach(([key, c]: [string, any]) => {
        if (!c.isActive) return;
        if (c.tournamentName || c.tryoutName) return;

        const isTraining =
          key.toLowerCase().includes('training') ||
          key.toLowerCase().includes('select') ||
          (c.season && c.season.toLowerCase().includes('training')) ||
          (c.pricing?.packages && c.pricing.packages.length > 0);

        if (isTraining && !configs.training) {
          configs.training = {
            _id: c._id,
            season: c.season || key.split('-')[0],
            year:
              c.year || parseInt(key.split('-')[1]) || new Date().getFullYear(),
            isActive: c.isActive,
            requiresPayment: c.requiresPayment ?? true,
            requiresQualification: c.requiresQualification || false,
            pricing: {
              basePrice: c.pricing?.basePrice || 0,
              packages: (c.pricing?.packages || []).map((p: any) => ({
                id: p.id || p._id?.toString() || Math.random().toString(),
                name: p.name || '',
                price: p.price || 0,
                description: p.description || '',
              })),
            },
            description: c.description || '',
            displayName: c.displayName,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            __v: c.__v,
            trainingDetails: c.trainingDetails,
          };
          return;
        }

        if (!configs.player && !c.pricing?.packages?.length) {
          configs.player = {
            _id: c._id,
            season: c.season || key.split('-')[0],
            year:
              c.year || parseInt(key.split('-')[1]) || new Date().getFullYear(),
            isActive: c.isActive,
            requiresPayment: false,
            requiresQualification: false,
            pricing: { basePrice: 0, packages: [] },
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            __v: c.__v,
          };
        }
      });

      const activeTournament = tournamentConfigs.find((c) => c.isActive);
      if (activeTournament) {
        configs.tournament = {
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

      const activeTryout = tryoutConfigs.find((c) => c.isActive);
      if (activeTryout) {
        const locationStrings: string[] = (activeTryout.locations || [])
          .map((loc) => loc.name)
          .filter(Boolean);

        configs.tryout = {
          _id: activeTryout._id,
          season: activeTryout.tryoutName,
          year: activeTryout.tryoutYear,
          isActive: activeTryout.isActive,
          requiresPayment: activeTryout.requiresPayment,
          requiresQualification: false,
          pricing: { basePrice: activeTryout.tryoutFee || 0, packages: [] },
          tryoutName: activeTryout.tryoutName,
          tryoutYear: activeTryout.tryoutYear,
          displayName: activeTryout.displayName,
          registrationDeadline: activeTryout.registrationDeadline,
          tryoutDates: activeTryout.tryoutDates || [],
          locations: locationStrings,
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
          tryoutDetails: activeTryout.tryoutDetails,
        };
      }

      if (
        !configs.tournament?.isActive &&
        !configs.tryout?.isActive &&
        !configs.training?.isActive &&
        !configs.player?.isActive
      ) {
        configs.player = {
          season: 'Player Registration',
          year: new Date().getFullYear(),
          isActive: true,
          requiresPayment: false,
          requiresQualification: false,
          pricing: { basePrice: 0, packages: [] },
        };
      }

      setFormConfigs(configs);
    } catch {
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
  }, []);

  useEffect(() => {
    fetchPage();
    fetchActiveForms();
    fetchAllFormConfigs();
  }, [fetchPage, fetchActiveForms, fetchAllFormConfigs]);

  const getDefaultSeasonEvent = (): SeasonEvent => {
    if (formConfigs.tournament?.isActive)
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
    if (formConfigs.tryout?.isActive)
      return {
        season: formConfigs.tryout.tryoutName || 'Tryout',
        year: formConfigs.tryout.tryoutYear || formConfigs.tryout.year || 2025,
        eventId: formConfigs.tryout._id?.toString() || 'tryout-registration',
        description: formConfigs.tryout.displayName || 'Tryout Registration',
      };
    if (formConfigs.training?.isActive)
      return {
        season: formConfigs.training.season || 'Training',
        year: formConfigs.training.year || 2025,
        eventId:
          formConfigs.training._id?.toString() || 'training-registration',
        description:
          formConfigs.training.season || 'Basketball Training Registration',
      };
    return {
      season: formConfigs.player?.season || 'Player Registration',
      year: formConfigs.player?.year || 2025,
      eventId: formConfigs.player?._id?.toString() || 'player-registration',
      description: 'Add Players to Your Account',
    };
  };

  // Helper function to check if there are any active embedded forms
  const hasActiveEmbeddedForms = useCallback(() => {
    return activeFormIds.size > 0;
  }, [activeFormIds]);

  // Helper function to check if there are any registration forms available
  const hasActiveRegistrationForms = useCallback(() => {
    return (
      formConfigs.player?.isActive ||
      formConfigs.training?.isActive ||
      formConfigs.tournament?.isActive ||
      formConfigs.tryout?.isActive
    );
  }, [formConfigs]);

  const renderTileContent = (section: PageSection) => {
    switch (section.type) {
      case 'welcome':
      case 'text':
        return (
          <div className='welcome-container'>
            {/* <div className='welcome-icon'>
              <i className='ti ti-home-heart'></i>
            </div> */}
            <div className='welcome-title'>{section.title || 'Welcome'}</div>
            <div
              className='welcome-content'
              dangerouslySetInnerHTML={{ __html: section.content || '' }}
            />
            <div className='welcome-cta'>
              <button
                className='welcome-btn'
                onClick={() => navigate('/about-us')}
              >
                Learn More
                <i
                  className='ti ti-arrow-right'
                  style={{ marginLeft: '8px' }}
                ></i>
              </button>
            </div>
          </div>
        );

      case 'image':
        return section.config?.media?.[0]?.url ? (
          <img
            src={section.config.media[0].url}
            alt={section.config.media[0].alt || ''}
            className='img-fluid'
            style={{ borderRadius: 8 }}
          />
        ) : section.content ? (
          <div dangerouslySetInnerHTML={{ __html: section.content }} />
        ) : null;

      case 'video':
        return section.config?.videoUrl ? (
          <video
            src={section.config.videoUrl}
            controls
            className='w-100'
            style={{ borderRadius: 8 }}
          />
        ) : section.content ? (
          <div dangerouslySetInnerHTML={{ __html: section.content }} />
        ) : null;

      case 'spotlight':
        return (
          <SpotlightContent
            limit={section.config?.limit || 1}
            showTitle={false}
            title={section.title || 'In The Spotlight'}
            showViewAll={section.config?.showViewAll}
            viewAllLink={section.config?.viewAllLink || '/in-the-spotlight'}
            featuredOnly={section.config?.showFeatured !== false}
            showImageModal={true}
            className={section.styles?.className}
          />
        );

      case 'form': {
        // Don't render the form section if there are no active embedded forms
        if (!hasActiveEmbeddedForms()) {
          return null;
        }

        if (!section.config?.formId)
          return (
            <p style={{ color: 'rgba(255,255,255,.5)' }}>No form configured.</p>
          );
        const isActive = activeFormIds.has(section.config.formId);
        return isActive ? (
          <FormEmbed
            formId={section.config.formId}
            isActive={true}
            wrapperClassName='card p-4'
          />
        ) : null;
      }

      case 'registration':
        // Don't render the registration section if there are no active registration forms
        if (!hasActiveRegistrationForms()) {
          return null;
        }

        return !formConfigs.player &&
          !formConfigs.training &&
          !formConfigs.tournament &&
          !formConfigs.tryout ? (
          <div className='text-center py-4'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading…</span>
            </div>
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
            hasEmbeddedForms={hasActiveEmbeddedForms()}
          />
        );

      case 'cta': {
        const btnText = section.config?.buttonText || 'Get Started';
        const btnLink = section.config?.buttonLink || '#';
        const btnStyle = section.config?.buttonStyle || 'primary';
        return (
          <div className='text-center pt-2'>
            {section.subtitle && (
              <p
                className='mb-3'
                style={{ color: 'rgba(255,255,255,.7)', fontSize: '.92rem' }}
              >
                {section.subtitle}
              </p>
            )}
            <a
              href={btnLink}
              className={`btn btn-${btnStyle} btn-lg`}
              target={section.config?.openInNewTab ? '_blank' : '_self'}
              rel={
                section.config?.openInNewTab ? 'noopener noreferrer' : undefined
              }
            >
              {btnText}
            </a>
            {section.config?.secondaryButtonText &&
              section.config?.secondaryButtonLink && (
                <a
                  href={section.config.secondaryButtonLink}
                  className={`btn btn-${section.config.secondaryButtonStyle || 'secondary'} btn-lg ms-3`}
                  target={section.config?.openInNewTab ? '_blank' : '_self'}
                >
                  {section.config.secondaryButtonText}
                </a>
              )}
          </div>
        );
      }

      default:
        return section.content ? (
          <div dangerouslySetInnerHTML={{ __html: section.content }} />
        ) : (
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '.85rem' }}>
            Content coming soon.
          </p>
        );
    }
  };

  if (loading) {
    return (
      <div className='htr-spinner'>
        <div className='htr-spinner__ring' />
      </div>
    );
  }

  const sections = (page?.sections || [])
    .filter((s) => s.isActive)
    .sort((a, b) => a.position - b.position);

  if (!sections.length) return null;

  const expandedSection = activeTileId
    ? sections.find((s) => s.id === activeTileId)
    : null;

  return (
    <>
      {/* macOS Dock style overlay when a tile is expanded */}
      {activeTileId && expandedSection && (
        <div className='htr-dock-overlay'>
          <div className='htr-expanded-container'>
            <div
              className={`htr-expanded-card ${expandedSection.type === 'welcome' ? 'htr-expanded-card--welcome' : ''}`}
            >
              <div className='htr-expanded-content'>
                {renderTileContent(expandedSection)}
              </div>
            </div>
          </div>

          {/* Dock with all tiles as icons */}
          <div className='htr-dock'>
            <div className='glow-effect' />
            <div className='htr-dock-inner'>
              {sections.map((section) => {
                const meta = sectionToTileMeta(section);
                const isActive = activeTileId === section.id;

                // Check if this section should be hidden
                let shouldHide = false;
                if (section.type === 'form' && !hasActiveEmbeddedForms()) {
                  shouldHide = true;
                }
                if (
                  section.type === 'registration' &&
                  !hasActiveRegistrationForms()
                ) {
                  shouldHide = true;
                }

                if (shouldHide) return null;

                return (
                  <button
                    key={section.id}
                    className={`htr-dock-item ${isActive ? 'active' : ''}`}
                    onClick={() =>
                      setActiveTileId(isActive ? null : section.id)
                    }
                    aria-pressed={isActive}
                    aria-label={`Toggle ${meta.label}`}
                  >
                    <i className={`ti ${meta.icon}`} aria-hidden='true' />
                    <span className='htr-dock-item-label'>{meta.label}</span>
                  </button>
                );
              })}
              <button
                className='htr-close-btn'
                onClick={() => setActiveTileId(null)}
                aria-label='Close all sections'
              >
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='currentColor'
                  aria-hidden='true'
                  focusable='false'
                >
                  <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tiles grid view - side by side on desktop, stacked on mobile */}
      {!activeTileId && (
        <div className='htr-tiles-wrapper'>
          <div className='glow-effect' />
          <div className='htr-tiles-grid'>
            {sections.map((section, idx) => {
              const meta = sectionToTileMeta(section);
              const backgroundImage = getTileBackgroundImage(idx, section.type);

              // Check if this section should be hidden due to no content
              let shouldHide = false;
              if (section.type === 'form' && !hasActiveEmbeddedForms()) {
                shouldHide = true;
              }
              if (
                section.type === 'registration' &&
                !hasActiveRegistrationForms()
              ) {
                shouldHide = true;
              }

              // Skip rendering this tile if it should be hidden
              if (shouldHide) {
                return null;
              }

              return (
                <button
                  key={section.id}
                  className='htr-tile'
                  style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  onClick={() => setActiveTileId(section.id)}
                >
                  {backgroundImage && <div className='htr-tile-overlay'></div>}
                  <div className='htr-tile-icon'>
                    <i className={`ti ${meta.icon}`} />
                  </div>
                  <div className='htr-tile-content'>
                    <span className='htr-tile-title'>{meta.label}</span>
                    <span className='htr-tile-subtitle'>
                      {meta.sublabel || 'Click to open'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default HomeTileRenderer;
