import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UTMData {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
}

export const useUTM = (): UTMData => {
  const location = useLocation();
  const [utmData, setUtmData] = useState<UTMData>({
    utm_source: 'direct',
    utm_medium: 'none',
    utm_campaign: 'none',
    utm_content: 'none',
    utm_term: 'none',
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const newUtmData: UTMData = {
      utm_source: params.get('utm_source') || 'direct',
      utm_medium: params.get('utm_medium') || 'none',
      utm_campaign: params.get('utm_campaign') || 'none',
      utm_content: params.get('utm_content') || 'none',
      utm_term: params.get('utm_term') || 'none',
    };

    // Store in sessionStorage for persistence across navigation
    if (Object.values(newUtmData).some((v) => v !== 'none' && v !== 'direct')) {
      sessionStorage.setItem('utm_data', JSON.stringify(newUtmData));
      setUtmData(newUtmData);
    } else {
      // Try to get from sessionStorage
      const stored = sessionStorage.getItem('utm_data');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUtmData(parsed);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [location.search]);

  return utmData;
};

export const getUTMForRegistration = (): {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
} => {
  // Check sessionStorage first
  const stored = sessionStorage.getItem('utm_data');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        source: parsed.utm_source || 'direct',
        medium: parsed.utm_medium || 'none',
        campaign: parsed.utm_campaign || 'none',
        content: parsed.utm_content || 'none',
        term: parsed.utm_term || 'none',
      };
    } catch (e) {
      // ignore
    }
  }

  // Fallback to URL params
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || 'direct',
    medium: params.get('utm_medium') || 'none',
    campaign: params.get('utm_campaign') || 'none',
    content: params.get('utm_content') || 'none',
    term: params.get('utm_term') || 'none',
  };
};
