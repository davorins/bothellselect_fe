// utils/phone.ts

export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = cleaned.slice(0, 10);

  if (!limited) return '';

  // Format as (XXX) XXX-XXXX
  const match = limited.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (!match) return limited;

  const areaCode = match[1];
  const prefix = match[2];
  const lineNumber = match[3];

  if (prefix && lineNumber) {
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  } else if (prefix) {
    return `(${areaCode}) ${prefix}`;
  } else if (areaCode) {
    return `(${areaCode}`;
  } else {
    return limited;
  }
};

export const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

// Optional: Function to get raw digits from formatted phone
export const getPhoneDigits = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '');
};
