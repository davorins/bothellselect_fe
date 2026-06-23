// utils/generateEmailHTML.ts

export type LayoutStyle =
  | 'minimal'
  | 'hero-banner'
  | 'card-centered'
  | 'sidebar-accent'
  | 'full-bg'
  | 'newsletter'
  | 'split-column'
  | 'feature-grid'
  | 'modern-dark';

export type ImagePosition = 'left' | 'center' | 'right' | 'full';

export interface BuilderConfig {
  layout: LayoutStyle;
  primaryColor: string;
  backgroundColor: string;
  headerBg: string;
  ctaColor: string;
  fontFamily: string;
  headerTitle: string;
  headerSubtitle: string;
  showLogo: boolean;
  logoUrl: string;
  headerImage: string;
  inlineImage: string;
  backgroundImage: string;
  overlayOpacity: number;
  imagePosition: ImagePosition;
  imageCaption: string;
  ctaText: string;
  ctaUrl: string;
  footerText: string;
  textColor?: string;
  accentColor?: string;
}

const LOGO_FALLBACK =
  'https://pub-eab2790b2e94418f896b048a8e6658d0.r2.dev/logo/logo.png';

const FONT_MAP: Record<string, string> = {
  system:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, sans-serif',
  trebuchet: "'Trebuchet MS', sans-serif",
  courier: "'Courier New', Courier, monospace",
  inter:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'open-sans': "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  lato: "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
};

export function generateEmailHTML(
  cfg: BuilderConfig,
  bodyContent: string,
  subject: string,
  signatureHTML: string = '',
  attachmentsHTML: string = '',
): string {
  const font =
    cfg.fontFamily && cfg.fontFamily.includes(',')
      ? cfg.fontFamily
      : FONT_MAP[cfg.fontFamily] || FONT_MAP.system;

  const primary = cfg.primaryColor || '#506ee4';
  const bgColor = cfg.backgroundColor || '#f0f4ff';
  const hBg = cfg.headerBg || '#1e3a8a';
  const overlay = cfg.overlayOpacity !== undefined ? cfg.overlayOpacity : 0.55;
  const year = new Date().getFullYear();
  const logoUrl = cfg.showLogo ? cfg.logoUrl || LOGO_FALLBACK : '';
  const textColor = cfg.textColor || '#374151';

  // ── Reusable blocks ──────────────────────────────────────────────────────────

  const logoBlock = cfg.showLogo
    ? `<img src="${logoUrl}" alt="Bothell Select" height="30"
        style="display:block;height:30px;"
        onerror="this.onerror=null;this.src='${LOGO_FALLBACK}';" />`
    : '';

  const inlineImageBlock = cfg.inlineImage
    ? `<div style="margin:20px 0;text-align:${cfg.imagePosition || 'center'};">
        <img src="${cfg.inlineImage}" alt=""
          style="max-width:100%;border-radius:8px;display:${cfg.imagePosition === 'center' ? 'block' : 'inline-block'};margin:${cfg.imagePosition === 'center' ? '0 auto' : '0'};" />
        ${cfg.imageCaption ? `<p style="font-size:12px;color:#888;text-align:center;margin:6px 0 0;">${cfg.imageCaption}</p>` : ''}
      </div>`
    : '';

  const ctaBlock = cfg.ctaText
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${cfg.ctaUrl || '#'}"
          style="display:inline-block;padding:14px 32px;background:${cfg.ctaColor || primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.2px;"
        >${cfg.ctaText}</a>
      </div>`
    : '';

  const bodyBlock = `<div style="font-size:15px;line-height:1.75;color:${textColor};">${bodyContent}</div>`;

  const standardFooter = `
    <tr>
      <td style="padding:0 30px;">
        <div style="text-align:center;font-size:12px;color:#999;padding:24px 0 16px;border-top:1px solid #eaeaea;margin-top:32px;">
          <p style="margin:0 0 6px;">${cfg.footerText || "You're receiving this because you're part of <strong>Bothell Select</strong>."}</p>
          <p style="margin:0;">
            <a href="https://bothellselect.com/unsubscribe" style="color:${primary};text-decoration:none;font-size:11px;">Unsubscribe</a>&nbsp;•&nbsp;
            <a href="https://bothellselect.com/contact" style="color:${primary};text-decoration:none;font-size:11px;">Contact Us</a>&nbsp;•&nbsp;
            <a href="https://bothellselect.com" style="color:${primary};text-decoration:none;font-size:11px;">Website</a>
          </p>
        </div>
      </td>
    </tr>`;

  const copyright = `<p style="text-align:center;font-size:11px;color:#bbb;margin:16px 0 0;">© ${year} Bothell Select. All rights reserved.</p>`;

  const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @media only screen and (max-width:600px){
      .es-container{width:100%!important;padding:10px!important;}
      .es-body{padding:20px 16px!important;}
      .es-hero img{height:180px!important;}
      .es-split{display:block!important;}
      .es-split td{display:block!important;width:100%!important;}
      .es-grid td{width:100%!important;display:block!important;}
    }
    body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  </style>
</head>`;

  // ── Layout renderers ─────────────────────────────────────────────────────────

  switch (cfg.layout) {
    // ── HERO BANNER ────────────────────────────────────────────────────────────
    case 'hero-banner': {
      const heroBlock = cfg.headerImage
        ? `<div class="es-hero" style="position:relative;overflow:hidden;height:240px;">
            <img src="${cfg.headerImage}" alt=""
              style="width:100%;height:240px;object-fit:cover;display:block;" />
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.6));"></div>
            <div style="position:absolute;bottom:24px;left:28px;right:28px;">
              ${cfg.showLogo ? `<div style="margin-bottom:10px;">${logoBlock}</div>` : ''}
              ${cfg.headerTitle ? `<h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#fff;line-height:1.2;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0;font-size:15px;color:rgba(255,255,255,0.88);">${cfg.headerSubtitle}</p>` : ''}
            </div>
          </div>`
        : `<div style="background:${hBg};padding:36px 28px;">
            ${cfg.showLogo ? `<div style="margin-bottom:12px;">${logoBlock}</div>` : ''}
            ${cfg.headerTitle ? `<h1 style="margin:0 0 6px;font-size:26px;font-weight:700;color:#fff;">${cfg.headerTitle}</h1>` : ''}
            ${cfg.headerSubtitle ? `<p style="margin:0;font-size:15px;color:rgba(255,255,255,0.8);">${cfg.headerSubtitle}</p>` : ''}
          </div>`;

      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:32px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:600px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr><td style="padding:0;">${heroBlock}</td></tr>
          <tr>
            <td class="es-body" style="padding:32px 30px;">
              ${inlineImageBlock}
              ${bodyBlock}
              ${attachmentsHTML}
              ${ctaBlock}
              ${signatureHTML}
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── CARD CENTERED ──────────────────────────────────────────────────────────
    case 'card-centered': {
      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:40px 20px;">
    <tr><td align="center">
      <div class="es-container" style="max-width:560px;margin:0 auto;">
        ${cfg.showLogo ? `<div style="text-align:center;margin-bottom:20px;">${logoBlock}</div>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">
          <tr><td style="height:6px;background:${primary};padding:0;font-size:0;line-height:0;"></td></tr>
          <tr>
            <td class="es-body" style="padding:36px 36px 28px;">
              ${cfg.headerTitle ? `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;line-height:1.25;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0 0 20px;font-size:14px;color:#888;border-bottom:1px solid #f0f0f0;padding-bottom:20px;">${cfg.headerSubtitle}</p>` : ''}
              ${inlineImageBlock}
              ${bodyBlock}
              ${attachmentsHTML}
              ${ctaBlock}
              ${signatureHTML}
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── SIDEBAR ACCENT ─────────────────────────────────────────────────────────
    case 'sidebar-accent': {
      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:40px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:600px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.07);">
          <tr>
            <td width="6" style="background:${primary};padding:0;font-size:0;"></td>
            <td class="es-body" style="padding:36px 32px;">
              ${cfg.showLogo ? `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f0f0f0;">${logoBlock}</div>` : ''}
              ${cfg.headerTitle ? `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0 0 20px;font-size:13px;color:#888;">${cfg.headerSubtitle}</p>` : ''}
              ${inlineImageBlock}
              ${bodyBlock}
              ${attachmentsHTML}
              ${ctaBlock}
              ${signatureHTML}
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── FULL BACKGROUND ────────────────────────────────────────────────────────
    case 'full-bg': {
      const hasBg = !!cfg.backgroundImage;
      const darkCTA = cfg.ctaText
        ? `<div style="text-align:center;margin:28px 0;">
            <a href="${cfg.ctaUrl || '#'}"
              style="display:inline-block;padding:14px 32px;background:#fff;color:${primary};text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;"
            >${cfg.ctaText}</a>
          </div>`
        : '';
      const lightSig = signatureHTML
        ? signatureHTML
            .replace(/color:#222/g, 'color:#fff')
            .replace(/color:#333/g, 'color:rgba(255,255,255,0.92)')
            .replace(/color:#666/g, 'color:rgba(255,255,255,0.65)')
            .replace(/color:#555/g, 'color:rgba(255,255,255,0.75)')
        : '';

      return `${head}
<body style="font-family:${font};margin:0;padding:0;">
  <div style="${hasBg ? `background-image:url('${cfg.backgroundImage}');background-size:cover;background-position:center;` : `background:${hBg};`}min-height:100%;position:relative;">
    <div style="position:absolute;inset:0;background:rgba(0,0,0,${overlay});"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="position:relative;z-index:1;padding:48px 20px;">
      <tr><td align="center">
        <div class="es-container" style="max-width:580px;margin:0 auto;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:rgba(255,255,255,0.10);border-radius:16px;border:1px solid rgba(255,255,255,0.18);">
            <tr>
              <td class="es-body" style="padding:40px 36px;">
                ${cfg.showLogo ? `<div style="margin-bottom:20px;text-align:center;">${logoBlock}</div>` : ''}
                ${cfg.headerTitle ? `<h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#fff;text-align:center;">${cfg.headerTitle}</h1>` : ''}
                ${cfg.headerSubtitle ? `<p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.8);text-align:center;">${cfg.headerSubtitle}</p>` : ''}
                ${inlineImageBlock}
                <div style="font-size:15px;line-height:1.75;color:rgba(255,255,255,0.92);">${bodyContent}</div>
                ${attachmentsHTML}
                ${darkCTA}
                ${lightSig}
                <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px;color:rgba(255,255,255,0.45);">
                  <a href="https://bothellselect.com/unsubscribe" style="color:rgba(255,255,255,0.55);text-decoration:none;margin:0 6px;">Unsubscribe</a>
                  <a href="https://bothellselect.com/contact" style="color:rgba(255,255,255,0.55);text-decoration:none;margin:0 6px;">Contact</a>
                  <a href="https://bothellselect.com" style="color:rgba(255,255,255,0.55);text-decoration:none;margin:0 6px;">Website</a>
                </div>
              </td>
            </tr>
          </table>
          <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.3);margin:14px 0 0;">© ${year} Bothell Select.</p>
        </div>
      </td></tr>
    </table>
  </div>
</body></html>`;
    }

    // ── NEWSLETTER ─────────────────────────────────────────────────────────────
    case 'newsletter': {
      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:32px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:620px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:${hBg};border-radius:12px 12px 0 0;">
          <tr>
            <td style="padding:18px 24px;">${cfg.showLogo ? logoBlock : ''}</td>
            <td style="padding:18px 24px;text-align:right;font-size:11px;color:rgba(255,255,255,0.65);">${dateStr}</td>
          </tr>
        </table>
        ${cfg.headerImage ? `<img src="${cfg.headerImage}" alt="" style="width:100%;max-height:200px;object-fit:cover;display:block;" />` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;">
          <tr>
            <td class="es-body" style="padding:28px 28px 16px;">
              ${cfg.headerTitle ? `<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0 0 20px;font-size:13px;color:#999;border-bottom:1px solid #f0f0f0;padding-bottom:16px;">${cfg.headerSubtitle}</p>` : ''}
              ${inlineImageBlock}
              ${bodyBlock}
              ${attachmentsHTML}
              ${ctaBlock}
              ${signatureHTML}
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── SPLIT COLUMN ──────────────────────────────────────────────────────────
    case 'split-column': {
      const hasImage = !!cfg.headerImage;
      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:32px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:600px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          ${cfg.showLogo ? `<tr><td style="padding:20px 30px 0;text-align:center;">${logoBlock}</td></tr>` : ''}
          <tr>
            <td style="padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="es-split">
                <tr>
                  ${
                    hasImage
                      ? `
                    <td width="50%" style="padding:0;vertical-align:top;">
                      <img src="${cfg.headerImage}" alt=""
                        style="width:100%;height:100%;object-fit:cover;display:block;min-height:300px;" />
                    </td>
                  `
                      : ''
                  }
                  <td width="${hasImage ? '50' : '100'}%" style="padding:30px;vertical-align:middle;">
                    ${cfg.headerTitle ? `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;">${cfg.headerTitle}</h1>` : ''}
                    ${cfg.headerSubtitle ? `<p style="margin:0 0 20px;font-size:14px;color:#888;">${cfg.headerSubtitle}</p>` : ''}
                    ${inlineImageBlock}
                    ${bodyBlock}
                    ${attachmentsHTML}
                    ${ctaBlock}
                    ${signatureHTML}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── FEATURE GRID ──────────────────────────────────────────────────────────
    case 'feature-grid': {
      // Parse features from bodyContent or use defaults
      const featureItems = [
        { icon: '🎯', title: 'Feature 1', desc: 'Description of feature 1' },
        { icon: '🚀', title: 'Feature 2', desc: 'Description of feature 2' },
        { icon: '💡', title: 'Feature 3', desc: 'Description of feature 3' },
        { icon: '⭐', title: 'Feature 4', desc: 'Description of feature 4' },
      ];

      let gridHtml = '';
      for (let i = 0; i < featureItems.length; i += 2) {
        gridHtml += `<tr>`;
        for (let j = i; j < i + 2 && j < featureItems.length; j++) {
          const item = featureItems[j];
          gridHtml += `
            <td style="padding:10px;width:50%;vertical-align:top;">
              <div style="text-align:center;padding:20px 16px;background:#f8f9fa;border-radius:8px;height:100%;">
                <div style="font-size:36px;line-height:1.2;">${item.icon}</div>
                <div style="font-weight:600;margin-top:10px;color:#111;">${item.title}</div>
                <div style="font-size:13px;color:#666;margin-top:6px;">${item.desc}</div>
              </div>
            </td>
          `;
        }
        gridHtml += `</tr>`;
      }

      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:32px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:600px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          ${cfg.showLogo ? `<tr><td style="padding:20px 30px 0;text-align:center;">${logoBlock}</td></tr>` : ''}
          <tr>
            <td style="padding:30px;">
              ${cfg.headerTitle ? `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111;text-align:center;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0 0 24px;font-size:14px;color:#888;text-align:center;">${cfg.headerSubtitle}</p>` : ''}
              ${cfg.headerImage ? `<img src="${cfg.headerImage}" alt="" style="width:100%;border-radius:8px;margin-bottom:20px;" />` : ''}
              ${inlineImageBlock}
              ${bodyBlock}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="es-grid">
                ${gridHtml}
              </table>
              ${attachmentsHTML}
              ${ctaBlock}
              ${signatureHTML}
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── MODERN DARK ────────────────────────────────────────────────────────────
    case 'modern-dark': {
      const darkBg = '#1a1a1a';
      const darkCard = '#2d2d2d';
      const darkText = '#eaeaea';
      const darkMuted = '#999';
      const darkBorder = '#444';

      const darkLogoBlock = cfg.showLogo
        ? `<img src="${logoUrl}" alt="Bothell Select" height="30"
            style="display:block;height:30px;margin:0 auto;"
            onerror="this.onerror=null;this.src='${LOGO_FALLBACK}';" />`
        : '';

      const darkBodyBlock = `<div style="font-size:15px;line-height:1.75;color:${darkText};">${bodyContent}</div>`;

      const darkCTA = cfg.ctaText
        ? `<div style="text-align:center;margin:24px 0;">
            <a href="${cfg.ctaUrl || '#'}"
              style="display:inline-block;padding:14px 32px;background:${cfg.ctaColor || primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;"
            >${cfg.ctaText}</a>
          </div>`
        : '';

      const darkInlineImage = cfg.inlineImage
        ? `<div style="margin:20px 0;text-align:${cfg.imagePosition || 'center'};">
            <img src="${cfg.inlineImage}" alt=""
              style="max-width:100%;border-radius:8px;display:${cfg.imagePosition === 'center' ? 'block' : 'inline-block'};margin:${cfg.imagePosition === 'center' ? '0 auto' : '0'};" />
            ${cfg.imageCaption ? `<p style="font-size:12px;color:${darkMuted};text-align:center;margin:6px 0 0;">${cfg.imageCaption}</p>` : ''}
          </div>`
        : '';

      const darkSig = signatureHTML
        ? signatureHTML
            .replace(/color:#222/g, `color:${darkText}`)
            .replace(/color:#333/g, `color:${darkText}`)
            .replace(/color:#666/g, `color:${darkMuted}`)
            .replace(/color:#555/g, `color:${darkMuted}`)
            .replace(/#eaeaea/g, darkBorder)
        : '';

      return `${head}
<body style="font-family:${font};background:${darkBg};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${darkBg};padding:32px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:600px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:${darkCard};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.3);">
          <tr>
            <td style="padding:30px;">
              ${cfg.showLogo ? `<div style="text-align:center;margin-bottom:20px;">${darkLogoBlock}</div>` : ''}
              ${cfg.headerTitle ? `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${darkText};text-align:center;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0 0 24px;font-size:14px;color:${darkMuted};text-align:center;">${cfg.headerSubtitle}</p>` : ''}
              ${cfg.headerImage ? `<img src="${cfg.headerImage}" alt="" style="width:100%;border-radius:8px;margin-bottom:20px;" />` : ''}
              ${darkInlineImage}
              ${darkBodyBlock}
              ${attachmentsHTML}
              ${darkCTA}
              ${darkSig}
              <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid ${darkBorder};">
                <p style="color:${darkMuted};font-size:11px;margin:0;">${cfg.footerText || "You're receiving this because you're part of Bothell Select."}</p>
                <div style="margin-top:8px;">
                  <a href="https://bothellselect.com/unsubscribe" style="color:${darkMuted};text-decoration:none;font-size:10px;margin:0 6px;">Unsubscribe</a>
                  <a href="https://bothellselect.com/contact" style="color:${darkMuted};text-decoration:none;font-size:10px;margin:0 6px;">Contact</a>
                  <a href="https://bothellselect.com" style="color:${darkMuted};text-decoration:none;font-size:10px;margin:0 6px;">Website</a>
                </div>
              </div>
            </td>
          </tr>
        </table>
        <p style="text-align:center;font-size:11px;color:#555;margin:16px 0 0;">© ${year} Bothell Select. All rights reserved.</p>
      </div>
    </td></tr>
  </table>
</body></html>`;
    }

    // ── MINIMAL (default) ──────────────────────────────────────────────────────
    default: {
      return `${head}
<body style="font-family:${font};background:${bgColor};margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${bgColor};padding:40px 0;">
    <tr><td align="center">
      <div class="es-container" style="max-width:600px;margin:0 auto;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:22px 30px 0;border-bottom:1px solid #f0f0f0;">
              <div style="padding-bottom:16px;">${cfg.showLogo ? logoBlock : ''}</div>
            </td>
          </tr>
          <tr>
            <td class="es-body" style="padding:30px 30px;">
              ${cfg.headerTitle ? `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111;">${cfg.headerTitle}</h1>` : ''}
              ${cfg.headerSubtitle ? `<p style="margin:0 0 22px;font-size:14px;color:#888;">${cfg.headerSubtitle}</p>` : ''}
              ${inlineImageBlock}
              ${bodyBlock}
              ${attachmentsHTML}
              ${ctaBlock}
              ${signatureHTML}
            </td>
          </tr>
          ${standardFooter}
        </table>
        ${copyright}
      </div>
    </td></tr>
  </table>
</body></html>`;
    }
  }
}
