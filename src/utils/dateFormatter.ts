// utils/dateFormatter.ts
export const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'N/A';

  try {
    // Handle Date objects directly
    if (dateString instanceof Date) {
      if (isNaN(dateString.getTime())) return 'Invalid Date';
      return dateString.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC', // Add this to prevent timezone conversion
      });
    }

    // Handle string input
    if (typeof dateString === 'string') {
      // For ISO strings (from MongoDB), extract just the date part
      if (dateString.includes('T')) {
        const [datePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        // Create date in UTC to prevent timezone shift
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
      }

      // For YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
      }

      // For MM/DD/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [month, day, year] = dateString.split('/').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
      }

      // Fallback for other string formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }

    return 'Invalid Date';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export const formatDateForStorage = (
  date: Date | string | undefined
): string => {
  if (!date) return '';

  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else {
    // Parse date string in UTC to prevent timezone issues
    if (date.includes('/')) {
      const [month, day, year] = date.split('/').map(Number);
      d = new Date(Date.UTC(year, month - 1, day));
    } else if (date.includes('-')) {
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(Date.UTC(year, month - 1, day));
    } else {
      d = new Date(date);
    }
  }

  if (isNaN(d.getTime())) return '';

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const isoToMMDDYYYY = (isoString: string): string => {
  if (!isoString) return '';

  // Parse in UTC to prevent timezone shift
  let date: Date;
  if (isoString.includes('T')) {
    const [datePart] = isoString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    date = new Date(Date.UTC(year, month - 1, day));
  } else {
    const [year, month, day] = isoString.split('-').map(Number);
    date = new Date(Date.UTC(year, month - 1, day));
  }

  if (isNaN(date.getTime())) return '';

  const monthStr = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getUTCDate()).padStart(2, '0');
  const yearStr = date.getUTCFullYear();

  return `${monthStr}/${dayStr}/${yearStr}`;
};

export const formatDateInput = (input: string): string => {
  // Remove all non-digit characters
  const cleaned = input.replace(/\D/g, '');

  // Apply MM/DD/YYYY format
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(
      4,
      8
    )}`;
  } else if (cleaned.length > 2) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
  return cleaned;
};

export const validateDateOfBirth = (dob: string): boolean => {
  // First check if it's already an ISO string
  if (dob.includes('T')) {
    const date = new Date(dob);
    return !isNaN(date.getTime()) && date <= new Date();
  }

  // MM/DD/YYYY format validation
  const pattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!pattern.test(dob)) return false;

  const [month, day, year] = dob.split('/').map(Number);
  // Create date in local time for validation
  const date = new Date(year, month - 1, day);

  // Check if the date is valid and not in the future
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= new Date()
  );
};
