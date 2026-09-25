// src/utils/marketingCapture.ts
const SESSION_KEY = 'bs_session_id';
const CAPTURED_KEY = 'bs_marketing_captured';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function captureMarketingAttribution() {
  try {
    // Only capture once per browser session
    if (sessionStorage.getItem(CAPTURED_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const body = {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      landingPage: window.location.href,
      referrer: document.referrer || null,
      sessionId: getSessionId(),
    };

    const token = localStorage.getItem('token');

    await fetch(`${API_BASE_URL}/marketing/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    sessionStorage.setItem(CAPTURED_KEY, '1');
  } catch (err) {
    // Never block the app on this
    console.warn('Marketing capture failed (non-fatal):', err);
  }
}
