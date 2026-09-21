const SELECTOR_MAP: Array<{ placement: string; selectors: string[] }> = [
  {
    placement: 'sidebar',
    selectors: [
      '.ad-sidebar',
      '.sidebar-ad',
      '.sidebar-ad-container',
      '.ad-slot--sidebar',
      '[data-ad-placement="sidebar"]',
      'aside .ad-container',
      '.sidebar .ad-wrapper',
    ],
  },
  {
    placement: 'header',
    selectors: [
      '.ad-header',
      '.header-ad',
      '.header-ad-container',
      '.ad-slot--header',
      '[data-ad-placement="header"]',
      'header .ad-container',
      'header .ad-wrapper',
    ],
  },
  {
    placement: 'topbar',
    selectors: [
      '.ad-topbar',
      '.topbar-ad',
      '.topbar-ad-container',
      '.top-bar-ad',
      '.ad-slot--topbar',
      '[data-ad-placement="topbar"]',
      '.topbar .ad-container',
    ],
  },
  {
    placement: 'footer',
    selectors: [
      '.ad-footer',
      '.footer-ad',
      '.footer-ad-container',
      '.ad-slot--footer',
      '[data-ad-placement="footer"]',
      'footer .ad-container',
      'footer .ad-wrapper',
    ],
  },
  {
    placement: 'inline',
    selectors: [
      '.ad-inline',
      '.inline-ad',
      '.inline-ad-container',
      '.ad-slot--inline',
      '[data-ad-placement="inline"]',
    ],
  },
  {
    placement: 'popup',
    selectors: [
      '.ad-popup',
      '.popup-ad',
      '.popup-ad-container',
      '.ad-slot--popup',
      '[data-ad-placement="popup"]',
    ],
  },
];

export function tagAdSlots(): () => void {
  const tagged: HTMLElement[] = [];

  SELECTOR_MAP.forEach(({ placement, selectors }) => {
    selectors.forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        // Skip if already tagged
        if (el.dataset.adPlacement) return;
        // Skip the gallery and anything inside it
        if (el.closest('.hp-ad-gallery-anchor')) return;
        // Skip if this element IS the gallery anchor
        if (el.classList.contains('hp-ad-gallery-anchor')) return;

        el.dataset.adPlacement = placement;
        tagged.push(el);
      });
    });
  });

  return () => {
    tagged.forEach((el) => {
      delete el.dataset.adPlacement;
    });
  };
}
