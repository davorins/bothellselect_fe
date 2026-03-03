import { Player, Guardian, Address, Team } from '../types/registration-types';

export const parseAddress = (fullAddress: string): Address => {
  console.log('🔍 parseAddress input:', fullAddress);

  if (!fullAddress || typeof fullAddress !== 'string') {
    return {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  }

  // Clean the input
  const cleaned = fullAddress.replace(/,+/g, ',').replace(/\s+/g, ' ').trim();

  console.log('🔍 Cleaned address:', cleaned);

  // If it's empty or just commas, return empty address
  if (!cleaned || cleaned === ',' || cleaned === ', ,') {
    return {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  }

  // Simple comma-based parsing
  const parts = cleaned
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');

  console.log('🔍 Split parts:', parts);

  if (parts.length < 2) {
    // Not enough parts for full address
    return {
      street: cleaned,
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  }

  // Initialize result
  const result: Address = {
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
  };

  // Handle different address formats
  if (parts.length === 2) {
    // Format: "Street, City State ZIP"
    result.street = parts[0] || '';

    // Parse city, state, and ZIP from second part
    const cityStateZip = parts[1] || '';
    const stateZipMatch = cityStateZip.match(
      /([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
    );

    if (stateZipMatch) {
      result.state = normalizeState(stateZipMatch[1]);
      result.zip = stateZipMatch[2];
      result.city = cityStateZip
        .replace(stateZipMatch[0], '')
        .trim()
        .replace(/,$/, '');
    } else {
      // Try to extract just ZIP
      const zipMatch = cityStateZip.match(/(\d{5}(?:-\d{4})?)$/);
      if (zipMatch) {
        result.zip = zipMatch[0];
        const beforeZip = cityStateZip.replace(zipMatch[0], '').trim();
        const stateMatch = beforeZip.match(/([A-Za-z]{2})$/);
        if (stateMatch) {
          result.state = normalizeState(stateMatch[1]);
          result.city = beforeZip
            .replace(stateMatch[0], '')
            .trim()
            .replace(/,$/, '');
        } else {
          result.city = beforeZip;
        }
      } else {
        result.city = cityStateZip;
      }
    }
  } else if (parts.length >= 3) {
    // Format: "Street, City, State ZIP" or "Street, Street2, City, State ZIP"
    result.street = parts[0] || '';

    if (parts.length === 3) {
      // "Street, City, State ZIP"
      result.city = parts[1] || '';

      // Parse state and ZIP from last part
      const lastPart = parts[2] || '';
      const stateZipMatch = lastPart.match(
        /([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
      );

      if (stateZipMatch) {
        result.state = normalizeState(stateZipMatch[1]);
        result.zip = stateZipMatch[2];
      } else {
        const zipMatch = lastPart.match(/(\d{5}(?:-\d{4})?)$/);
        if (zipMatch) {
          result.zip = zipMatch[0];
          result.state = normalizeState(
            lastPart.replace(zipMatch[0], '').trim()
          );
        } else {
          result.state = normalizeState(lastPart);
        }
      }
    } else {
      // "Street, Street2, City, State ZIP" or more complex
      result.street2 = parts.slice(1, parts.length - 2).join(', ');
      result.city = parts[parts.length - 2] || '';

      const lastPart = parts[parts.length - 1] || '';
      const stateZipMatch = lastPart.match(
        /([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/
      );

      if (stateZipMatch) {
        result.state = normalizeState(stateZipMatch[1]);
        result.zip = stateZipMatch[2];
      } else {
        const zipMatch = lastPart.match(/(\d{5}(?:-\d{4})?)$/);
        if (zipMatch) {
          result.zip = zipMatch[0];
          result.state = normalizeState(
            lastPart.replace(zipMatch[0], '').trim()
          );
        } else {
          result.state = normalizeState(lastPart);
        }
      }
    }
  }

  console.log('🔍 parseAddress result:', result);
  return result;
};

export const normalizeState = (stateInput: string): string => {
  const stateMap: Record<string, string> = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    hawaii: 'HI',
    idaho: 'ID',
    illinois: 'IL',
    indiana: 'IN',
    iowa: 'IA',
    kansas: 'KS',
    kentucky: 'KY',
    louisiana: 'LA',
    maine: 'ME',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    minnesota: 'MN',
    mississippi: 'MS',
    missouri: 'MO',
    montana: 'MT',
    nebraska: 'NE',
    nevada: 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    ohio: 'OH',
    oklahoma: 'OK',
    oregon: 'OR',
    pennsylvania: 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    tennessee: 'TN',
    texas: 'TX',
    utah: 'UT',
    vermont: 'VT',
    virginia: 'VA',
    washington: 'WA',
    'west virginia': 'WV',
    wisconsin: 'WI',
    wyoming: 'WY',
  };

  // Handle empty input
  if (!stateInput || stateInput.trim() === '') {
    return '';
  }

  const normalizedInput = stateInput.toLowerCase().trim();

  // If it's already a 2-letter code in correct case, return it
  if (/^[A-Z]{2}$/.test(stateInput)) {
    return stateInput;
  }

  // If it's a 2-letter code in wrong case, uppercase it
  if (/^[a-zA-Z]{2}$/.test(stateInput)) {
    return stateInput.toUpperCase();
  }

  // Look up full state name
  return stateMap[normalizedInput] || stateInput;
};

export const formatPhoneNumber = (value: string): string => {
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  return match
    ? !match[2]
      ? match[1]
      : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`
    : value;
};

export const validateAddress = (
  address: Address
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!address.street?.trim()) {
    errors.push('Street address is required');
  }

  if (!address.city?.trim()) {
    errors.push('City is required');
  }

  if (!address.state?.trim()) {
    errors.push('State is required');
  } else if (!/^[A-Z]{2}$/.test(address.state)) {
    errors.push('State must be a valid 2-letter code (e.g., WA)');
  }

  if (!address.zip?.trim()) {
    errors.push('ZIP code is required');
  } else if (!/^\d{5}(-\d{4})?$/.test(address.zip)) {
    errors.push('ZIP code must be in valid format (e.g., 98012 or 98012-1234)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const calculatePayments = (
  playerCount: number,
  perPlayerAmount: number = 20
) => {
  const basePrice = perPlayerAmount * playerCount;
  return {
    amount: basePrice,
    amountInCents: basePrice * 100,
    playerCount,
    perPlayerAmount,
    breakdown: {
      basePrice,
      subtotal: basePrice,
      total: basePrice,
    },
  };
};

export const validatePlayer = (
  player: Player,
  index: number = 0
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!player.fullName?.trim()) {
    errors[`player${index}FullName`] = 'Full name is required';
  }

  if (!player.gender) {
    errors[`player${index}Gender`] = 'Gender is required';
  }

  if (!player.dob) {
    errors[`player${index}Dob`] = 'Date of birth is required';
  } else {
    const dob = new Date(player.dob);
    const today = new Date();
    if (dob >= today) {
      errors[`player${index}Dob`] = 'Date of birth must be in the past';
    }
  }

  if (!player.schoolName?.trim()) {
    errors[`player${index}School`] = 'School name is required';
  }

  if (!player.grade) {
    errors[`player${index}Grade`] = 'Grade is required';
  }

  return errors;
};

export const validateGuardian = (
  guardian: Guardian,
  isAdditional: boolean = false
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!guardian.fullName?.trim()) {
    errors.fullName = 'Full name is required';
  }

  if (!guardian.relationship?.trim()) {
    errors.relationship = 'Relationship is required';
  }

  if (!guardian.phone?.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhoneNumber(guardian.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (!guardian.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(guardian.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!validateAddress(guardian.address)) {
    errors.address = 'Please enter a complete address';
  }

  if (guardian.isCoach && !guardian.aauNumber?.trim()) {
    errors.aauNumber = 'AAU number is required for coaches';
  }

  return errors;
};

export const validateTeam = (team: Team): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!team.name?.trim()) {
    errors.name = 'Team name is required';
  }

  if (!team.grade) {
    errors.grade = 'Grade is required';
  }

  if (!team.sex) {
    errors.sex = 'Team gender is required';
  }

  if (!team.levelOfCompetition) {
    errors.levelOfCompetition = 'Level of competition is required';
  }

  return errors;
};

// Updated calculateGradeFromDOB function in registration-utils.ts
// Updated calculateGradeFromDOB function in registration-utils.ts
export const calculateGradeFromDOB = (
  dob: string,
  registrationYear: number
): string => {
  if (!dob) return '';

  const birthDate = new Date(dob);
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth() + 1; // Convert to 1-indexed month
  const birthDay = birthDate.getDate();

  // Washington state cutoff: Students must be 5 by August 31st to start Kindergarten
  // Cutoff month is September (month 9), so cutoff is August 31st
  const cutoffMonth = 8; // September (0-indexed would be 8, but we're using 1-indexed)
  const cutoffDay = 31;

  // Debug logging
  console.log('🔍 Grade Calculation Debug:', {
    dob,
    birthYear,
    birthMonth,
    birthDay,
    registrationYear,
    cutoffMonth,
    cutoffDay,
  });

  // Determine if the child was born before the cutoff for the school year
  // Child is eligible if born on or before August 31st
  const isBeforeCutoff =
    birthMonth < cutoffMonth ||
    (birthMonth === cutoffMonth && birthDay <= cutoffDay);

  // If born before cutoff (August 31st or earlier), they start Kindergarten the year they turn 5
  // If born after cutoff (September 1st or later), they start Kindergarten the following year
  const kindergartenStartYear = isBeforeCutoff ? birthYear + 5 : birthYear + 6;

  // Calculate grade based on kindergarten start year
  const gradeLevel = registrationYear - kindergartenStartYear;

  console.log('🔍 Grade Calculation Result:', {
    isBeforeCutoff,
    kindergartenStartYear,
    gradeLevel,
  });

  // Handle edge cases
  if (gradeLevel < 0) return 'PK'; // Pre-K (before kindergarten)
  if (gradeLevel === 0) return 'K'; // Kindergarten
  if (gradeLevel > 12) return '12'; // Maximum 12th grade

  return gradeLevel.toString();
};

export const getOrdinalSuffix = (grade: string) => {
  if (grade === 'PK' || grade === 'K') return '';

  const num = parseInt(grade);
  if (isNaN(num)) return '';

  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

export const formatAddress = (address: Address): string => {
  const parts = [
    address.street,
    address.street2,
    address.city,
    address.state,
    address.zip,
  ].filter((part) => part && part.trim() !== '');

  return parts.join(', ');
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s\-']+$/.test(name);
};
