/**
 * Generate a temporary ID for frontend use
 */
export const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Check if an ID is a temporary ID
 */
export const isTempId = (id: string | undefined | null): boolean => {
  if (!id) return true; // No ID means it's temporary
  return id.toString().startsWith('temp_') || id.toString().length < 10;
};

/**
 * Generate a timestamp-based ID for new records
 */
export const generateTimestampId = (): string => {
  return Date.now().toString();
};
