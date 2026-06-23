// types/emailBuilder.types.ts

export type EmailLayoutStyle =
  | 'minimal'
  | 'hero-banner'
  | 'card-centered'
  | 'sidebar-accent'
  | 'full-bg'
  | 'newsletter'
  | 'split-column'
  | 'feature-grid'
  | 'modern-dark';

export type ImagePosition = 'left' | 'center' | 'right' | 'full';

export interface EmailColorPreset {
  name: string;
  primaryColor: string;
  backgroundColor: string;
  headerBg: string;
  ctaColor: string;
  textColor: string;
  accentColor?: string;
}

export interface EmailDesignConfig {
  layout: EmailLayoutStyle;
  primaryColor: string;
  backgroundColor: string;
  headerBg: string;
  ctaColor: string;
  fontFamily: string;
  textColor: string;
  accentColor?: string;
}

export interface EmailImageConfig {
  headerImage: string;
  inlineImage: string;
  backgroundImage: string;
  overlayOpacity: number;
  imagePosition: ImagePosition;
  imageCaption: string;
  imageAltText: string;
  imageWidth?: number;
  imageAlignment?: 'left' | 'center' | 'right';
}

export interface EmailHeaderConfig {
  headerTitle: string;
  headerSubtitle: string;
  showLogo: boolean;
  logoUrl: string;
  logoHeight?: number;
  headerAlignment?: 'left' | 'center' | 'right';
}

export interface EmailFooterConfig {
  ctaText: string;
  ctaUrl: string;
  footerText: string;
  showSocialIcons: boolean;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  showUnsubscribe: boolean;
}

export interface EmailContentSection {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'two-column';
  content: string;
  styles?: Record<string, any>;
  imageUrl?: string;
  imageAlt?: string;
  buttonText?: string;
  buttonUrl?: string;
  column1?: EmailContentSection;
  column2?: EmailContentSection;
}

export interface EmailBuilderConfig
  extends
    EmailDesignConfig,
    EmailImageConfig,
    EmailHeaderConfig,
    EmailFooterConfig {
  sections?: EmailContentSection[];
  customCSS?: string;
  responsiveBreakpoints?: {
    mobile: number;
    tablet: number;
  };
}
