// utils/dateFormatter.ts
export const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'N/A';

  try {
    let date: Date;

    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'string') {
      // Handle ISO strings (from MongoDB)
      if (dateString.includes('T')) {
        // Extract just the date part and create in local timezone
        const [datePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      // Handle YYYY-MM-DD format
      else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        date = new Date(year, month - 1, day);
      }
      // Handle MM/DD/YYYY format
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [month, day, year] = dateString.split('/').map(Number);
        date = new Date(year, month - 1, day);
      }
      // Fallback
      else {
        date = new Date(dateString);
      }
    } else {
      return 'Invalid Date';
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

export const validateDateOfBirth = (
  dob: string
): { isValid: boolean; message?: string } => {
  if (!dob) return { isValid: false, message: 'Date of birth is required' };

  // Check format
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    return { isValid: false, message: 'Please use MM/DD/YYYY format' };
  }

  const [month, day, year] = dob.split('/').map(Number);
  const date = new Date(year, month - 1, day);

  // Check if date components match input (handles invalid dates like 02/30/2020)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { isValid: false, message: 'Invalid date' };
  }

  // Check if date is in the future
  if (date > new Date()) {
    return { isValid: false, message: 'Date cannot be in the future' };
  }

  // Check if age is reasonable (e.g., between 5 and 18 for youth sports)
  const age = new Date().getFullYear() - year;
  if (age < 5 || age > 18) {
    return { isValid: false, message: 'Age must be between 5 and 18' };
  }

  return { isValid: true };
};

export const storeDateAsUTC = (date: Date): string => {
  // Get date components in local time
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Create a new date in UTC
  const utcDate = new Date(Date.UTC(year, month, day));

  // Return as ISO string (time will be 00:00:00Z)
  return utcDate.toISOString();
};
