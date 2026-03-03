// utils/r2Utils.ts

/**
 * Clean malformed R2 URLs
 * @param url - The URL to clean
 * @returns Cleaned URL string
 */
export const cleanR2Url = (url: string | null | undefined): string => {
  if (!url) return '';

  let cleanUrl = url;

  // Fix https// issue (missing colon)
  if (cleanUrl.startsWith('https//')) {
    cleanUrl = cleanUrl.replace('https//', 'https://');
  }

  // Fix http// issue
  if (cleanUrl.startsWith('http//')) {
    cleanUrl = cleanUrl.replace('http//', 'http://');
  }

  // Fix double domain issue (partizan-be.onrender.comhttps://)
  if (cleanUrl.includes('partizan-be.onrender.comhttps://')) {
    cleanUrl = cleanUrl.split('partizan-be.onrender.com')[1];
  }

  if (cleanUrl.includes('partizan-be.onrender.comhttp://')) {
    cleanUrl = cleanUrl.split('partizan-be.onrender.com')[1];
  }

  // Remove any trailing slashes
  cleanUrl = cleanUrl.replace(/\/+$/, '');

  // Ensure it's a proper URL
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  return cleanUrl;
};

/**
 * Check if a URL is from R2
 * @param url - The URL to check
 * @returns boolean
 */
export const isR2Url = (url: string | null | undefined): boolean => {
  if (!url) return false;

  const r2Patterns = [
    'r2.cloudflarestorage.com',
    '.r2.dev',
    'pub-',
    'cloudflarestorage',
  ];

  return r2Patterns.some((pattern) => url.includes(pattern));
};

/**
 * Extract the key from an R2 URL
 * @param url - The full R2 URL
 * @param publicUrl - The public URL base (optional)
 * @returns The extracted key or null
 */
export const extractKeyFromR2Url = (
  url: string | null | undefined,
  publicUrl: string = process.env.REACT_APP_R2_PUBLIC_URL || '',
): string | null => {
  if (!url) return null;

  const cleanUrl = cleanR2Url(url);

  // Try to extract using public URL
  if (publicUrl && cleanUrl.includes(publicUrl)) {
    return cleanUrl.replace(`${publicUrl}/`, '');
  }

  // Try to extract from .r2.dev pattern
  const r2DevMatch = cleanUrl.match(/\.r2\.dev\/(.+)$/);
  if (r2DevMatch) return r2DevMatch[1];

  // Try to extract from cloudflarestorage pattern
  const cloudflareMatch = cleanUrl.match(
    /cloudflarestorage\.com\/[^\/]+\/(.+)$/,
  );
  if (cloudflareMatch) return cloudflareMatch[1];

  return null;
};

/**
 * Get avatar URL with proper formatting and cache busting
 * @param avatar - The avatar URL or null
 * @param defaultAvatar - Default avatar URL
 * @returns Formatted avatar URL
 */
export const getAvatarUrl = (
  avatar: string | null | undefined,
  defaultAvatar: string,
): string => {
  if (!avatar) return defaultAvatar;

  const cleanedUrl = cleanR2Url(avatar);

  // Add cache-busting timestamp for R2 URLs
  if (isR2Url(cleanedUrl)) {
    const separator = cleanedUrl.includes('?') ? '&' : '?';
    return `${cleanedUrl}${separator}t=${Date.now()}`;
  }

  return cleanedUrl;
};

/**
 * Get the appropriate default avatar based on role and gender
 * @param role - User role (parent, coach, player, guardian)
 * @param gender - Optional gender for players
 * @returns Default avatar URL
 */
export const getDefaultAvatar = (
  role: 'parent' | 'coach' | 'player' | 'guardian' = 'parent',
  gender?: 'Male' | 'Female',
): string => {
  const baseUrl = 'https://partizan-be.onrender.com/uploads/avatars';

  switch (role) {
    case 'coach':
      return `${baseUrl}/coach.png`;
    case 'player':
      return gender === 'Female' ? `${baseUrl}/girl.png` : `${baseUrl}/boy.png`;
    case 'guardian':
      // Use same as parent for now, but you can create a specific guardian avatar later
      return `${baseUrl}/parents.png`;
    case 'parent':
    default:
      return `${baseUrl}/parents.png`;
  }
};

/**
 * Helper function to get avatar type from an item
 * @param item - The item (parent, guardian, coach, player)
 * @returns The role type for avatar
 */
export const getAvatarTypeFromItem = (
  item: any,
): 'parent' | 'coach' | 'player' | 'guardian' => {
  if (item.isCoach) return 'coach';
  if (item.type === 'guardian' || item.isGuardian) return 'guardian';
  if (item.type === 'player' || item.gender) return 'player';
  return 'parent';
};

/**
 * Helper function to get gender from an item
 * @param item - The item
 * @returns Gender or undefined
 */
export const getGenderFromItem = (item: any): 'Male' | 'Female' | undefined => {
  if (item.gender === 'Male' || item.gender === 'Female') {
    return item.gender;
  }
  return undefined;
};

/**
 * Get R2 public URL from environment
 * @returns The R2 public URL
 */
export const getR2PublicUrl = (): string => {
  return (
    process.env.REACT_APP_R2_PUBLIC_URL ||
    'https://pub-3eb0901007e24e51b6ed1bde149cb0bb.r2.dev'
  );
};

/**
 * Construct R2 URL for an attachment
 * @param filename - The filename
 * @returns The full R2 URL for the attachment
 */
export const getR2AttachmentUrl = (filename: string): string => {
  const baseUrl = getR2PublicUrl();
  // Ensure filename doesn't start with a slash
  const cleanFilename = filename.startsWith('/')
    ? filename.substring(1)
    : filename;
  return `${baseUrl}/attachments/${cleanFilename}`;
};

/**
 * Construct R2 URL for an asset (logo, etc.)
 * @param path - The asset path (e.g., 'logo.png')
 * @returns The full R2 URL for the asset
 */
export const getR2AssetUrl = (path: string): string => {
  const baseUrl = getR2PublicUrl();
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${baseUrl}/assets/${cleanPath}`;
};

/**
 * Get file icon based on MIME type
 * @param mimeType - The MIME type of the file
 * @returns An emoji representing the file type
 */
export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return '📊';
  if (mimeType === 'text/plain') return '📃';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  return '📎';
};

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
