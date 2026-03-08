// utils/address.ts

export interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

export interface AddressShowConfig {
  street?: boolean;
  city?: boolean;
  state?: boolean;
  zip?: boolean;
}

// Default: show everything
const SHOW_ALL: Required<AddressShowConfig> = {
  street: true,
  city: true,
  state: true,
  zip: true,
};

export const parseAddress = (addressString: string | Address): Address => {
  if (typeof addressString !== 'string') {
    return addressString as Address;
  }

  if (!addressString) {
    return { street: '', street2: '', city: '', state: '', zip: '' };
  }

  const normalized = addressString.replace(/\s+/g, ' ').trim();
  const parts = normalized.split(',').map((part) => part.trim());

  const address: Address = {
    street: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
  };

  if (parts.length > 0) address.street = parts[0];
  if (parts.length > 3) address.street2 = parts.slice(1, -2).join(', ');

  if (parts.length >= 3) {
    address.city = parts[parts.length - 2] || '';
    const stateZipPart = parts[parts.length - 1].trim();
    const stateZipMatch = stateZipPart.match(
      /([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)/,
    );
    if (stateZipMatch) {
      address.state = stateZipMatch[1].toUpperCase();
      address.zip = stateZipMatch[2];
    } else {
      const zipMatch = stateZipPart.match(/(\d{5}(?:-\d{4})?)/);
      if (zipMatch) {
        address.zip = zipMatch[0];
      } else {
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
    | undefined,
): Address => {
  if (!address) {
    return { street: '', street2: '', city: '', state: '', zip: '' };
  }
  if (typeof address === 'string') return parseAddress(address);
  return {
    street: address.street || '',
    street2: 'street2' in address ? (address as Address).street2 : '',
    city: address.city || '',
    state: address.state || '',
    zip: address.zip || '',
  };
};

/**
 * Formats an address for display, respecting an optional `show` config that
 * controls which fields are rendered. Useful when certain address fields are
 * disabled via dynamic form configuration.
 *
 * Examples (city=Bothell, state=WA, zip=98012):
 *   show all              → "16920 42nd Dr SE, Bothell, WA 98012"
 *   city + state + zip    → "Bothell, WA 98012"
 *   city only             → "Bothell"
 *   city + state          → "Bothell, WA"
 *   city + zip            → "Bothell 98012"
 *   state + zip           → "WA 98012"
 *   zip only              → "98012"
 */
export const formatAddress = (
  address: string | Address | undefined | null,
  show: AddressShowConfig = SHOW_ALL,
): string => {
  if (!address) return '';

  const addr = typeof address === 'string' ? parseAddress(address) : address;
  const s = { ...SHOW_ALL, ...show };

  const lines: string[] = [];

  // Street line
  if (s.street && addr.street?.trim()) {
    lines.push(addr.street.trim());
    if (addr.street2?.trim()) lines.push(addr.street2.trim());
  }

  // City / State / Zip line
  const cityPart = s.city && addr.city?.trim() ? addr.city.trim() : '';
  const statePart = s.state && addr.state?.trim() ? addr.state.trim() : '';
  const zipPart = s.zip && addr.zip?.trim() ? addr.zip.trim() : '';

  if (cityPart || statePart || zipPart) {
    let cityState = '';
    if (cityPart && statePart) cityState = `${cityPart}, ${statePart}`;
    else if (cityPart) cityState = cityPart;
    else if (statePart) cityState = statePart;

    const lastLine = zipPart
      ? cityState
        ? `${cityState} ${zipPart}`
        : zipPart
      : cityState;

    if (lastLine) lines.push(lastLine);
  }

  return lines.join(', ');
};

/**
 * Produces a normalized key for address deduplication — strips whitespace,
 * lowercases, ignores field order. Use this for equality checks, not display.
 */
export const normalizeAddressKey = (
  address: string | Address | undefined | null,
): string => {
  if (!address) return '';
  const addr = typeof address === 'string' ? parseAddress(address) : address;
  return [addr.street, addr.street2, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .join(',')
    .replace(/\s+/g, '')
    .toLowerCase();
};
