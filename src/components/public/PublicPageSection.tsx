// src/components/public/PublicPageSection.tsx
import React from 'react';
import { PageSection } from '../../types/page-builder-types';
import HtmlRenderer from '../common/HtmlRenderer';

interface PublicPageSectionProps {
  section: PageSection;
  className?: string;
}

const PublicPageSection: React.FC<PublicPageSectionProps> = ({
  section,
  className = '',
}) => {
  if (!section.isActive) return null;

  const sectionStyles: React.CSSProperties = {
    backgroundColor: section.styles?.backgroundColor || 'transparent',
    color: section.styles?.textColor || 'inherit',
    paddingTop: section.styles?.paddingTop || '0',
    paddingBottom: section.styles?.paddingBottom || '0',
    borderRadius: section.styles?.borderRadius || '0',
    boxShadow: section.styles?.boxShadow || 'none',
  };

  // Helper to render title
  const renderTitle = () => {
    if (section.config?.showTitle === false || !section.title) return null;

    const titleClass = `section-title ${section.styles?.titleClass || ''}`;
    const titleStyle = {
      fontSize: section.styles?.titleSize || 'inherit',
    };

    return (
      <h2 className={titleClass} style={titleStyle}>
        {section.title}
      </h2>
    );
  };

  // Helper to render subtitle
  const renderSubtitle = () => {
    if (!section.subtitle) return null;

    return <p className='section-subtitle mb-4'>{section.subtitle}</p>;
  };

  // Render based on section type
  const renderSectionContent = () => {
    switch (section.type) {
      case 'welcome':
      case 'text':
        return (
          <div className='section-content'>
            <HtmlRenderer html={section.content || ''} />
          </div>
        );

      case 'cta':
        return renderCTASection();

      case 'image':
        return renderImageSection();

      case 'video':
        return renderVideoSection();

      case 'form':
        return renderFormSection();

      case 'spotlight':
        return renderSpotlightSection();

      case 'custom':
        return renderCustomSection();

      case 'sponsors':
        return renderSponsorsSection();

      default:
        return (
          <div className='alert alert-warning'>
            Unknown section type: {section.type}
          </div>
        );
    }
  };

  // CTA section renderer
  const renderCTASection = () => {
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

    // Container styles
    const containerStyle: React.CSSProperties = {
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      textAlign: alignment as any,
      color: section.styles?.textColor || '#ffffff',
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      opacity: backgroundImage ? overlayOpacity : 0,
      transition: 'opacity 0.3s ease',
    };

    // Content container - positioned relative to appear above overlay
    const contentStyle: React.CSSProperties = {
      position: 'relative',
      zIndex: 1,
      padding: '4rem 1rem',
    };

    return (
      <div className='cta-section' style={containerStyle}>
        {/* Background overlay (only if background image exists) */}
        {backgroundImage && <div style={overlayStyle} />}

        <div style={contentStyle}>
          {/* Title */}
          {showTitle && section.title && (
            <h2 className='cta-title mb-3'>{section.title}</h2>
          )}

          {/* Subtitle */}
          {showSubtitle && section.subtitle && (
            <p className='cta-subtitle mb-4'>{section.subtitle}</p>
          )}

          {/* Button */}
          {buttonText && buttonLink && (
            <a
              href={buttonLink}
              className={`btn btn-${buttonStyle} btn-${buttonSize}`}
              target={openInNewTab ? '_blank' : '_self'}
              rel={openInNewTab ? 'noopener noreferrer' : undefined}
              style={{
                minWidth: '200px',
                padding:
                  buttonSize === 'xl'
                    ? '1rem 2.5rem'
                    : buttonSize === 'lg'
                    ? '0.75rem 2rem'
                    : buttonSize === 'md'
                    ? '0.625rem 1.75rem'
                    : '0.5rem 1.5rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {buttonText}
            </a>
          )}

          {/* Secondary button if configured */}
          {section.config?.secondaryButtonText &&
            section.config?.secondaryButtonLink && (
              <a
                href={section.config.secondaryButtonLink}
                className={`btn btn-${
                  section.config.secondaryButtonStyle || 'secondary'
                } btn-${buttonSize} ms-2`}
                target={openInNewTab ? '_blank' : '_self'}
                rel={openInNewTab ? 'noopener noreferrer' : undefined}
                style={{
                  minWidth: '200px',
                  padding:
                    buttonSize === 'xl'
                      ? '1rem 2.5rem'
                      : buttonSize === 'lg'
                      ? '0.75rem 2rem'
                      : buttonSize === 'md'
                      ? '0.625rem 1.75rem'
                      : '0.5rem 1.5rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {section.config.secondaryButtonText}
              </a>
            )}
        </div>
      </div>
    );
  };

  // Image section renderer
  const renderImageSection = () => {
    const media = section.config?.media?.[0];
    if (!media?.url) return null;

    const imageClass = `section-image img-fluid ${
      media.alignment === 'full' ? 'w-100' : ''
    }`;
    const containerClass = `image-container ${media.alignment || 'center'}`;

    return (
      <div className={containerClass}>
        <img
          src={media.url}
          alt={media.alt || section.title || 'Section image'}
          className={imageClass}
          style={{
            maxWidth: media.alignment === 'full' ? '100%' : 'auto',
            display: 'block',
            margin:
              media.alignment === 'center'
                ? '0 auto'
                : media.alignment === 'left'
                ? '0 auto 0 0'
                : '0 0 0 auto',
          }}
        />
        {media.caption && (
          <figcaption className='image-caption text-center mt-2'>
            {media.caption}
          </figcaption>
        )}
      </div>
    );
  };

  // Video section renderer
  const renderVideoSection = () => {
    const videoUrl = section.config?.videoUrl;
    if (!videoUrl) return null;

    // Check if it's a YouTube or Vimeo URL
    const isYouTube =
      videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    const isVimeo = videoUrl.includes('vimeo.com');

    if (isYouTube) {
      // Extract YouTube video ID
      const videoId = videoUrl.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      )?.[1];

      if (!videoId) return null;

      return (
        <div className='video-container ratio ratio-16x9'>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=${
              section.config?.autoplay ? 1 : 0
            }&controls=${section.config?.showControls !== false ? 1 : 0}&loop=${
              section.config?.loop ? 1 : 0
            }&mute=${section.config?.muted ? 1 : 0}`}
            title={section.title || 'Video'}
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            allowFullScreen
          />
        </div>
      );
    } else if (isVimeo) {
      // Extract Vimeo video ID
      const videoId = videoUrl.match(
        /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/
      )?.[1];

      if (!videoId) return null;

      return (
        <div className='video-container ratio ratio-16x9'>
          <iframe
            src={`https://player.vimeo.com/video/${videoId}?autoplay=${
              section.config?.autoplay ? 1 : 0
            }&loop=${section.config?.loop ? 1 : 0}&muted=${
              section.config?.muted ? 1 : 0
            }`}
            title={section.title || 'Video'}
            allow='autoplay; fullscreen; picture-in-picture'
            allowFullScreen
          />
        </div>
      );
    } else {
      // Direct video file
      return (
        <div className='video-container'>
          <video
            className='w-100'
            controls={section.config?.showControls !== false}
            autoPlay={section.config?.autoplay}
            loop={section.config?.loop}
            muted={section.config?.muted}
            poster={section.config?.thumbnailUrl}
          >
            <source src={videoUrl} type='video/mp4' />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
  };

  // Form section renderer
  const renderFormSection = () => {
    const formId = section.config?.formId;
    if (!formId) {
      return (
        <div className='alert alert-warning'>
          No form selected for this section.
        </div>
      );
    }

    return (
      <div className={`form-section ${section.styles?.className || ''}`}>
        {section.config?.formTitle && (
          <h3 className='form-title mb-3'>{section.config.formTitle}</h3>
        )}
        <div
          className='form-container'
          data-form-id={formId}
          style={{ minHeight: '300px' }}
        >
          {/* Form will be loaded dynamically via JavaScript */}
          <div className='form-loading text-center p-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading form...</span>
            </div>
            <p className='mt-2'>Loading form...</p>
          </div>
        </div>
      </div>
    );
  };

  // Spotlight section renderer
  const renderSpotlightSection = () => {
    // In a real implementation, you would fetch spotlight items
    // For now, show a placeholder
    return (
      <div className='spotlight-section'>
        <div className='row'>
          {Array.from({ length: section.config?.limit || 3 }).map(
            (_, index) => (
              <div key={index} className='col-md-4 mb-4'>
                <div className='spotlight-item card h-100'>
                  <div className='card-body text-center'>
                    <div className='placeholder-wave mb-3'>
                      <div
                        className='placeholder bg-secondary'
                        style={{ height: '150px', width: '100%' }}
                      />
                    </div>
                    <h5 className='card-title'>Spotlight Item {index + 1}</h5>
                    <p className='card-text'>
                      This is a placeholder for spotlight content.
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {section.config?.showViewAll && (
          <div className='text-center mt-4'>
            <a
              href={section.config?.viewAllLink || '/spotlight'}
              className='btn btn-outline-primary'
            >
              View All
            </a>
          </div>
        )}
      </div>
    );
  };

  // Custom HTML section renderer
  const renderCustomSection = () => {
    const htmlContent = section.config?.htmlContent;
    if (!htmlContent) return null;

    return (
      <div
        className='custom-html-section'
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  // Sponsors section renderer
  const renderSponsorsSection = () => {
    const sponsors = section.config?.media || [];
    if (sponsors.length === 0) return null;

    const columns = section.config?.columns || 4;
    const colClass = `col-6 col-md-${12 / columns}`;
    const logoHeight = section.config?.logoHeight || '80px';

    return (
      <div className={`sponsors-section ${section.config?.className || ''}`}>
        <div className='row g-4 align-items-center justify-content-center'>
          {sponsors.map((sponsor, index) => (
            <div key={index} className={colClass}>
              <div className='sponsor-item text-center p-3'>
                {sponsor.link ? (
                  <a
                    href={sponsor.link}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='d-block'
                  >
                    {renderSponsorLogo(sponsor, logoHeight)}
                  </a>
                ) : (
                  renderSponsorLogo(sponsor, logoHeight)
                )}

                {sponsor.name && (
                  <div className='sponsor-info mt-2'>
                    <h6 className='sponsor-name mb-1'>{sponsor.name}</h6>
                    {sponsor.level && (
                      <span
                        className={`badge bg-${
                          sponsor.levelColor || 'primary'
                        }`}
                      >
                        {sponsor.level}
                      </span>
                    )}
                    {sponsor.description && (
                      <p className='sponsor-description small mt-2 mb-0'>
                        {sponsor.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper to render sponsor logo with styles
  const renderSponsorLogo = (sponsor: any, height: string) => {
    const logoStyle: React.CSSProperties = {
      height,
      maxHeight: height,
      width: 'auto',
      maxWidth: '100%',
      objectFit: 'contain',
      filter: sponsor.grayscale ? 'grayscale(100%)' : 'none',
      opacity: sponsor.opacity || 1,
    };

    return (
      <div className='sponsor-logo-container'>
        {sponsor.url ? (
          <img
            src={sponsor.url}
            alt={sponsor.name || 'Sponsor logo'}
            className='sponsor-logo'
            style={logoStyle}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                'https://via.placeholder.com/200x80?text=Logo+Missing';
            }}
          />
        ) : (
          <div
            className='sponsor-placeholder d-flex align-items-center justify-content-center bg-light'
            style={{ height, width: '100%' }}
          >
            <span className='text-muted'>Logo</span>
          </div>
        )}
      </div>
    );
  };

  // Determine container class based on layout
  const getContainerClass = () => {
    switch (section.styles?.layout) {
      case 'full-width':
        return 'container-fluid';
      case 'boxed':
        return 'container boxed-container';
      case 'container':
      default:
        return 'container';
    }
  };

  return (
    <section
      className={`public-page-section ${section.type}-section ${className}`}
      style={sectionStyles}
      id={`section-${section.id}`}
    >
      <div className={getContainerClass()}>
        {renderTitle()}
        {renderSubtitle()}
        <div className={`section-body ${section.styles?.contentClass || ''}`}>
          {renderSectionContent()}
        </div>
      </div>
    </section>
  );
};

export default PublicPageSection;
