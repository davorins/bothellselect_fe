// src/types/page-builder-types.ts
export type PageType =
  | 'home'
  | 'about'
  | 'programs'
  | 'tournaments'
  | 'contact'
  | 'spotlight'
  | 'registration'
  | 'custom';

export type SectionType =
  | 'welcome'
  | 'spotlight'
  | 'form'
  | 'registration'
  | 'custom'
  | 'tournament'
  | 'sponsors'
  | 'video'
  | 'text'
  | 'image'
  | 'image-gallery'
  | 'stats'
  | 'cta'
  | 'team'
  | 'schedule'
  | 'pricing'
  | 'faq'
  | 'contact-form'
  | 'map'
  | 'social-feed';

// CTA specific config type
export interface CTASectionConfig {
  // Button properties
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'light'
    | 'dark';
  buttonSize?: 'sm' | 'md' | 'lg' | 'xl';
  openInNewTab?: boolean;

  // Layout
  alignment?: 'left' | 'center' | 'right';

  // Background
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;

  // Display options
  showTitle?: boolean;
  showSubtitle?: boolean;

  // Additional CTA options
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  secondaryButtonStyle?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'light'
    | 'dark';
  showIcon?: boolean;
  iconName?: string;
  iconPosition?: 'left' | 'right';
}

// Sponsors specific config type
export interface SponsorsSectionConfig {
  logoHeight?: string;
  columns?: number;
  className?: string;
  showTitle?: boolean;
  grayscale?: boolean;
  opacity?: number;
}

// Form specific config type
export interface FormSectionConfig {
  formId?: string;
  formTitle?: string;
  showFormTitle?: boolean;
  showFormDescription?: boolean;
}

// Video specific config type
export interface VideoSectionConfig {
  videoUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  thumbnailUrl?: string;
}

// Spotlight specific config type
export interface SpotlightSectionConfig {
  limit?: number;
  showFeatured?: boolean;
  showViewAll?: boolean;
  viewAllLink?: string;
}

// Media specific config type
export interface MediaItem {
  url?: string;
  alt?: string;
  caption?: string;
  alignment?: 'left' | 'right' | 'center' | 'full';
  width?: string;
  height?: string;
  name?: string;
  link?: string;
  level?: string;
  levelColor?: string;
  description?: string;
  grayscale?: boolean;
  opacity?: number;
}

// Image gallery specific config type
export interface GallerySectionConfig {
  showCaptions?: boolean;
  columnsDesktop?: number;
  columnsTablet?: number;
  columnsMobile?: number;
  gap?: string;
  layout?: 'grid' | 'masonry' | 'carousel';
}

// Dynamic content config type
export interface DynamicContentConfig {
  type:
    | 'spotlight'
    | 'forms'
    | 'tournaments'
    | 'players'
    | 'teams'
    | 'sponsors';
  limit?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Main config type that includes all section-specific configs
// src/types/page-builder-types.ts

export interface PageSectionConfig {
  // Common properties
  showTitle?: boolean;
  showSubtitle?: boolean;
  title?: string;

  // Text alignment properties
  titleAlignment?: 'left' | 'center' | 'right' | 'justify';
  contentAlignment?: 'left' | 'center' | 'right' | 'justify';
  subtitleAlignment?: 'left' | 'center' | 'right' | 'justify';

  // Typography properties
  titleFontFamily?:
    | 'inherit'
    | "'Helvetica Neue', Helvetica, Arial, sans-serif"
    | "Georgia, 'Times New Roman', Times, serif"
    | "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    | "'Roboto', 'Open Sans', sans-serif"
    | "'Montserrat', sans-serif"
    | "'Poppins', sans-serif";

  titleFontSize?: string;
  titleFontWeight?: string;
  titleColor?: string;

  // Section-specific configs
  cta?: CTASectionConfig;
  sponsors?: SponsorsSectionConfig;
  form?: FormSectionConfig;
  video?: VideoSectionConfig;
  spotlight?: SpotlightSectionConfig;
  gallery?: GallerySectionConfig;
  buttonClass?: string;

  // Dynamic content
  dynamicContent?: DynamicContentConfig;

  // Media
  media?: MediaItem[];

  // Form
  formId?: string;
  formTitle?: string;
  showFormTitle?: boolean;
  showFormDescription?: boolean;

  // Spotlight specific
  limit?: number;
  showFeatured?: boolean;
  showViewAll?: boolean;
  viewAllLink?: string;

  // Video
  videoUrl?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  thumbnailUrl?: string;

  // Registration
  defaultTab?: 'player' | 'training' | 'tournament' | 'tryout';

  // Text/Content specific
  htmlContent?: string;

  // Layout
  columns?: number;
  layout?: 'grid' | 'list' | 'carousel';

  // Component type
  componentType?:
    | 'text'
    | 'image'
    | 'video'
    | 'html'
    | 'carousel'
    | 'grid'
    | 'list';

  // Sponsors specific
  className?: string;
  logoHeight?: string;

  // Gallery specific
  showCaptions?: boolean;

  // Common
  backgroundColor?: string;
  textColor?: string;

  // Grid/Columns
  columnsDesktop?: number;
  columnsTablet?: number;
  columnsMobile?: number;
  gap?: string;
  justify?: string;
  align?: string;
  showDescription?: boolean;
  showLevel?: boolean;

  // CTA specific properties
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?: string;
  buttonSize?: string;
  openInNewTab?: boolean;
  alignment?: string;
  backgroundImage?: string;
  overlayOpacity?: number;

  // Secondary CTA button properties
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  secondaryButtonStyle?: string;
}

export interface PageSection {
  id: string;
  type: SectionType;
  position: number;
  title?: string;
  subtitle?: string;
  content?: string;
  config?: PageSectionConfig;
  styles?: {
    // Layout
    layout?: 'full-width' | 'container' | 'boxed';
    columns?: number;
    columnGap?: string;
    rowGap?: string;

    // Spacing
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    marginTop?: string;
    marginBottom?: string;

    // Colors
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;

    // Typography
    titleSize?: string;
    titleWeight?: string;
    titleColor?: string;
    titleFontFamily?: string;
    contentSize?: string;
    contentColor?: string;
    contentFontFamily?: string;
    subtitleSize?: string;
    subtitleWeight?: string;
    subtitleColor?: string;

    // Borders
    borderRadius?: string;
    borderColor?: string;
    borderWidth?: string;

    // Shadows
    boxShadow?: string;

    // Custom classes
    className?: string;
    containerClass?: string;
    titleClass?: string;
    contentClass?: string;
  };

  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PageLayout {
  _id?: string;
  pageType: PageType;
  pageSlug: string;
  pageTitle: string;
  metaDescription?: string;
  metaKeywords?: string[];

  version: string;
  sections: PageSection[];

  settings: {
    showHeader: boolean;
    showFooter: boolean;
    showSponsorBanner: boolean;
    sponsorBannerPosition: 'top' | 'bottom' | 'both';

    containerMaxWidth: string;
    defaultSectionSpacing: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;

    canonicalUrl?: string;
    openGraphImage?: string;
    headerScripts?: string;
    footerScripts?: string;
  };

  parentTemplate?: string;
  isTemplate: boolean;
  templateName?: string;

  isActive: boolean;
  publishedBy?: string;
  createdBy?: string;
  updatedBy?: string;

  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

export interface PageTemplate {
  _id?: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  layout: Omit<PageLayout, '_id' | 'pageType' | 'pageSlug' | 'pageTitle'>;
  isSystemTemplate: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
