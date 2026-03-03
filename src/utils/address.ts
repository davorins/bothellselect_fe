// utils/address.ts

export interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

export const parseAddress = (addressString: string | Address): Address => {
  // If it's already an Address object, return it as-is
  if (typeof addressString !== 'string') {
    return addressString as Address;
  }

  if (!addressString) {
    return {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  }

  // Normalize the string by replacing multiple spaces with single space
  const normalized = addressString.replace(/\s+/g, ' ').trim();

  // Split into parts and trim whitespace
  const parts = normalized.split(',').map((part) => part.trim());

  // Initialize address object
  const address: Address = {
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
  };

  // First part is always street
  if (parts.length > 0) address.street = parts[0];

  // Handle street2 if present (assuming it's the part before the last 3 parts)
  if (parts.length > 3) {
    address.street2 = parts.slice(1, -2).join(', ');
  }

  // City/state/zip handling
  if (parts.length >= 3) {
    // The city is typically the part before the last one
    address.city = parts[parts.length - 2] || '';

    // The last part should contain state and ZIP
    const stateZipPart = parts[parts.length - 1].trim();

    // Improved state/ZIP parsing
    const stateZipMatch = stateZipPart.match(
      /([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)/
    );

    if (stateZipMatch) {
      address.state = stateZipMatch[1].toUpperCase(); // Ensure uppercase state code
      address.zip = stateZipMatch[2];
    } else {
      // Fallback - try to extract just the ZIP if state isn't found
      const zipMatch = stateZipPart.match(/(\d{5}(?:-\d{4})?)/);
      if (zipMatch) {
        address.zip = zipMatch[0];
      } else {
        // If no ZIP found, put the whole thing in state (last resort)
        address.state = stateZipPart;
      }
    }
  }

  return address;
};

export const ensureAddress = (
  address:
    | string
    | Address
    | { street: string; city: string; state: string; zip: string }
    | undefined
): Address => {
  if (!address) {
    return {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    };
  }

  if (typeof address === 'string') {
    return parseAddress(address);
  }

  // Handle case where street2 might be missing
  return {
    street: address.street || '',
    street2: 'street2' in address ? address.street2 : '',
    city: address.city || '',
    state: address.state || '',
    zip: address.zip || '',
  };
};

export const formatAddress = (address: string | Address): string => {
  if (!address) return '';

  const addr = typeof address === 'string' ? parseAddress(address) : address;

  const parts = [
    addr.street,
    addr.street2,
    `${addr.city}, ${addr.state} ${addr.zip}`.trim(),
  ].filter((part) => part && part.trim() !== '');

  return parts.join(', ');
};
