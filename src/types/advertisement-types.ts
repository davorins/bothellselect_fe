export interface Advertisement {
  _id: string;
  title: string;
  description?: string;

  // Media
  desktopImage?: {
    url: string;
    publicId: string;
    alt: string;
    fileSize: number;
  };
  mobileImage?: {
    url: string;
    publicId: string;
    alt: string;
    fileSize: number;
  };

  // Business info
  businessName: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;

  // Links
  clickUrl?: string;
  ctaText: string;

  // Display settings
  displayOrder: number;
  placement: 'sidebar' | 'header' | 'footer' | 'inline' | 'popup';

  // Targeting
  targetRoles: string[];
  targetPages: string[];

  // Frequency capping
  showOnceOnly: boolean;
  cooldownDays: number;

  // Status
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;

  // Analytics
  impressions: number;
  clicks: number;

  // Metadata
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt?: Date;
}

export interface AdImpression {
  adId: string;
  userId: string;
  viewedAt: Date;
  clicked: boolean;
}

export interface AdStats {
  totalImpressions: number;
  totalClicks: number;
  activeAds: number;
  totalAds: number;
  clickThroughRate: string;
}
