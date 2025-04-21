// utils/validation.ts

// Existing validators (unchanged)
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s'-]+$/.test(name);
};

export const validateDateOfBirth = (dob: string): boolean => {
  const date = new Date(dob);
  return !isNaN(date.getTime()) && date < new Date();
};

export const validateState = (state: string): boolean => {
  return state.length === 2 && /^[A-Z]{2}$/.test(state);
};

export const validateZipCode = (zip: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zip);
};

export const validateGrade = (grade: string): boolean => {
  return /^([1-9]|1[0-2])$/.test(grade);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

// New credit card validation functions
export const validateCreditCardNumber = (cardNumber: string): boolean => {
  // Remove all non-digit characters
  const digits = cardNumber.replace(/\D/g, '');

  // Basic length check for most card types
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  // Luhn algorithm validation
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

export const validateExpirationDate = (expDate: string): boolean => {
  // Expected format: MM/YY or MM/YYYY
  const match = expDate.match(/^(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return false;

  const month = parseInt(match[1], 10);
  let year = parseInt(match[2], 10);

  // Convert 2-digit year to 4-digit (assuming 2000s)
  if (year < 100) {
    year += 2000;
  }

  // Validate month
  if (month < 1 || month > 12) {
    return false;
  }

  // Validate not expired
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed

  if (year < currentYear) {
    return false;
  }
  if (year === currentYear && month < currentMonth) {
    return false;
  }

  return true;
};

export const validateCVV = (cvv: string): boolean => {
  // Remove all non-digit characters
  const digits = cvv.replace(/\D/g, '');

  // CVV can be 3 or 4 digits
  return digits.length === 3 || digits.length === 4;
};

export const validateCardHolderName = (name: string): boolean => {
  // Similar to validateName but more permissive for international names
  return name.trim().length >= 2 && /^[a-zA-Z\s\-'.]+$/.test(name);
};
