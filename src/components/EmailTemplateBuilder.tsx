// components/EmailTemplateBuilder.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Form,
  Modal,
  Alert,
  Spinner,
  Badge,
  Row,
  Col,
} from 'react-bootstrap';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { emailTemplateService } from '../services/emailTemplateService';
import type { EmailTemplate } from '../types/types';
import './EmailTemplateBuilder.css';

// ─── UUID Generator ──────────────────────────────────────────────────────

const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ─── Types ──────────────────────────────────────────────────────────────────

type ElementType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'video'
  | 'social'
  | 'html'
  | 'features'
  | 'list'; // Added list type

// Use React.CSSProperties for proper CSS typing
interface ElementStyle extends React.CSSProperties {
  // Allow any additional CSS properties
  [key: string]: any;
}

// List item types
type BulletType =
  | 'circle'
  | 'disc'
  | 'square'
  | 'icon'
  | 'image'
  | 'number'
  | 'check'
  | 'star'
  | 'arrow';

interface ListItem {
  id: string;
  content: string;
  icon?: string; // For icon type bullets
  image?: string; // For image type bullets
}

interface FeatureItem {
  id: string;
  icon?: string;
  image?: string;
  headline: string;
  subHeadline?: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  badge?: string;
  backgroundColor?: string;
  textColor?: string;
  imagePosition?: 'top' | 'left' | 'right';
}

interface FeatureLayout {
  columns: 1 | 2 | 3 | 4;
  gap: number;
  alignment: 'left' | 'center' | 'right';
  cardStyle: 'flat' | 'bordered' | 'shadowed' | 'elevated';
  showDivider: boolean;
  imagePosition: 'top' | 'left' | 'right';
  imageSize: 'small' | 'medium' | 'large';
  showIcons: boolean;
}

interface ListLayout {
  bulletType: BulletType;
  bulletColor: string;
  bulletSize: 'small' | 'medium' | 'large';
  showBullets: boolean;
  iconSize: 'small' | 'medium' | 'large';
  gap: number;
}

interface EmailElement {
  id: string;
  type: ElementType;
  content?: string;
  src?: string;
  alt?: string;
  href?: string;
  target?: string;
  columns?: EmailElement[];
  style?: ElementStyle;
  settings?: Record<string, any>;
  features?: FeatureItem[];
  featureLayout?: FeatureLayout;
  items?: ListItem[]; // For list elements
  listLayout?: ListLayout; // For list elements
}

interface EmailBuilderState {
  elements: EmailElement[];
  title: string;
  subject: string;
  category: string;
  tags: string[];
  status: boolean;
  includeSignature: boolean;
  signatureConfig: {
    organizationName: string;
    title: string;
    fullName: string;
    phone: string;
    email: string;
    website: string;
    additionalInfo: string;
  };
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    linkColor: string;
    buttonBg: string;
    buttonText: string;
  };
  attachments: any[];
}

const DEFAULT_STATE: EmailBuilderState = {
  elements: [],
  title: '',
  subject: '',
  category: 'transactional',
  tags: [],
  status: true,
  includeSignature: false,
  signatureConfig: {
    organizationName: 'Bothell Select',
    title: '',
    fullName: '',
    phone: '',
    email: 'bothellselect@proton.me',
    website: 'https://bothellselect.com',
    additionalInfo: '',
  },
  globalStyles: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    primaryColor: '#506ee4',
    backgroundColor: '#f6f6f6',
    textColor: '#333333',
    linkColor: '#506ee4',
    buttonBg: '#506ee4',
    buttonText: '#ffffff',
  },
  attachments: [],
};

// ─── Element Factory ──────────────────────────────────────────────────────

const createFeatureItem = (overrides?: Partial<FeatureItem>): FeatureItem => ({
  id: generateId(),
  icon: '⭐',
  headline: 'Feature Title',
  description:
    'Add a description for this feature. Highlight the key benefits.',
  subHeadline: '',
  ctaText: '',
  ctaUrl: '',
  badge: '',
  image: '',
  ...overrides,
});

const createFeaturesElement = (): EmailElement => {
  const featureItems = [
    createFeatureItem({
      icon: '🎯',
      headline: 'Feature 1',
      description: 'Description of feature 1',
    }),
    createFeatureItem({
      icon: '🚀',
      headline: 'Feature 2',
      description: 'Description of feature 2',
    }),
    createFeatureItem({
      icon: '💡',
      headline: 'Feature 3',
      description: 'Description of feature 3',
    }),
    createFeatureItem({
      icon: '⭐',
      headline: 'Feature 4',
      description: 'Description of feature 4',
    }),
  ];

  return {
    id: generateId(),
    type: 'features',
    style: {
      padding: '20px 0',
      backgroundColor: 'transparent',
    },
    features: featureItems,
    featureLayout: {
      columns: 2,
      gap: 24,
      alignment: 'center',
      cardStyle: 'bordered',
      showDivider: false,
      imagePosition: 'top',
      imageSize: 'medium',
      showIcons: true,
    },
    settings: {
      title: 'Features',
      subtitle: '',
      showSectionTitle: true,
    },
  };
};

// Create list element
const createListElement = (): EmailElement => {
  return {
    id: generateId(),
    type: 'list',
    style: {
      padding: '8px 0',
      fontSize: '16px',
      lineHeight: 1.8,
      color: '#333333',
    },
    items: [
      { id: generateId(), content: 'List item 1' },
      { id: generateId(), content: 'List item 2' },
      { id: generateId(), content: 'List item 3' },
    ],
    listLayout: {
      bulletType: 'circle',
      bulletColor: '#506ee4',
      bulletSize: 'medium',
      showBullets: true,
      iconSize: 'medium',
      gap: 8,
    },
    settings: {
      ordered: false,
      startNumber: 1,
    },
  };
};

const createElement = (
  type: ElementType,
  overrides?: Partial<EmailElement>,
): EmailElement => {
  const base: EmailElement = {
    id: generateId(),
    type,
    style: {},
    settings: {},
  };

  switch (type) {
    case 'heading':
      return {
        ...base,
        content: 'Enter your heading here',
        style: {
          fontSize: '28px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#222222',
          padding: '16px 0',
        },
      };
    case 'paragraph':
      return {
        ...base,
        content:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        style: {
          fontSize: '16px',
          lineHeight: 1.6,
          color: '#333333',
          padding: '8px 0',
        },
      };
    case 'list':
      return createListElement();
    case 'image':
      return {
        ...base,
        src: '',
        alt: 'Image description',
        style: {
          maxWidth: '100%',
          borderRadius: '8px',
          margin: '8px 0',
        },
        settings: { caption: '' },
      };
    case 'button':
      return {
        ...base,
        content: 'Click Me',
        href: '#',
        style: {
          backgroundColor: '#506ee4',
          color: '#ffffff',
          padding: '12px 32px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          textAlign: 'center',
          display: 'inline-block',
        },
        settings: { target: '_blank' },
      };
    case 'divider':
      return {
        ...base,
        style: {
          border: 'none',
          borderTop: '2px solid #eaeaea',
          margin: '24px 0',
        },
      };
    case 'spacer':
      return {
        ...base,
        style: { height: '20px' },
      };
    case 'columns':
      return {
        ...base,
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '8px 0',
        },
        columns: [
          {
            ...createElement('paragraph'),
            id: generateId(),
            style: {
              flex: '1',
              minWidth: '0',
              ...createElement('paragraph').style,
            },
          },
          {
            ...createElement('paragraph'),
            id: generateId(),
            style: {
              flex: '1',
              minWidth: '0',
              ...createElement('paragraph').style,
            },
          },
        ],
        settings: { columnCount: 2, gap: 20 },
      };
    case 'video':
      return {
        ...base,
        src: '',
        style: {
          maxWidth: '100%',
          borderRadius: '8px',
          margin: '8px 0',
        },
        settings: { caption: '', aspectRatio: '16:9' },
      };
    case 'social':
      return {
        ...base,
        style: { textAlign: 'center', padding: '16px 0' },
        settings: {
          platforms: [
            { name: 'Facebook', url: '', icon: 'facebook' },
            { name: 'Twitter', url: '', icon: 'twitter' },
            { name: 'Instagram', url: '', icon: 'instagram' },
          ],
        },
      };
    case 'html':
      return {
        ...base,
        content: '<p>Custom HTML content here</p>',
        style: { padding: '8px 0' },
      };
    case 'features':
      return createFeaturesElement();
    default:
      return base;
  }
};

// ─── Helper to convert style to CSS string ──────────────────────────────

const styleToCssString = (style: ElementStyle | undefined): string => {
  if (!style) return '';
  return Object.entries(style)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      // Convert camelCase to kebab-case
      const key = k.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${key}:${v}`;
    })
    .join(';');
};

// ─── Component ────────────────────────────────────────────────────────────

interface EmailTemplateBuilderProps {
  templateId?: string | null;
  onSave?: (template: EmailTemplate) => void;
  onCancel?: () => void;
  onNewTemplate?: () => void; // New prop for creating new template
}

const EmailTemplateBuilder: React.FC<EmailTemplateBuilderProps> = ({
  templateId = null,
  onSave,
  onCancel,
  onNewTemplate,
}) => {
  // ─── State ──────────────────────────────────────────────────────────────

  const [state, setState] = useState<EmailBuilderState>(DEFAULT_STATE);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(!!templateId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────

  const getSelectedElement = useCallback(() => {
    if (!selectedElementId) return null;
    const findElement = (elements: EmailElement[]): EmailElement | null => {
      for (const el of elements) {
        if (el.id === selectedElementId) return el;
        if (el.columns) {
          const found = findElement(el.columns);
          if (found) return found;
        }
      }
      return null;
    };
    return findElement(state.elements);
  }, [selectedElementId, state.elements]);

  const updateElement = useCallback(
    (id: string, updates: Partial<EmailElement>) => {
      const updateRecursive = (elements: EmailElement[]): EmailElement[] => {
        return elements.map((el) => {
          if (el.id === id) return { ...el, ...updates };
          if (el.columns)
            return { ...el, columns: updateRecursive(el.columns) };
          return el;
        });
      };
      setState((prev) => ({
        ...prev,
        elements: updateRecursive(prev.elements),
      }));
    },
    [],
  );

  // ─── HTML Parser ──────────────────────────────────────────────────────

  const parseHtmlToElements = (html: string): EmailElement[] => {
    if (!html) return [];

    const elements: EmailElement[] = [];

    // Try to detect if this is a features layout
    if (html.includes('feature') || html.includes('Features')) {
      // Try to extract features
      const featureMatches = html.match(/<h3[^>]*>([^<]*)<\/h3>/g);
      const descMatches = html.match(/<p[^>]*>([^<]*)<\/p>/g);

      if (featureMatches && featureMatches.length > 0) {
        const features: FeatureItem[] = [];
        const icons = ['🎯', '🚀', '💡', '⭐', '🌟', '🔥', '💪', '🎨'];

        featureMatches.forEach((match, index) => {
          const headline = match.replace(/<[^>]*>/g, '').trim();
          const description =
            descMatches && descMatches[index + 1]
              ? descMatches[index + 1].replace(/<[^>]*>/g, '').trim()
              : 'Description of ' + headline;

          features.push({
            id: generateId(),
            icon: icons[index % icons.length],
            headline: headline || `Feature ${index + 1}`,
            description: description || 'Description of feature',
            subHeadline: '',
            ctaText: '',
            ctaUrl: '',
            badge: '',
            image: '',
          });
        });

        if (features.length > 0) {
          elements.push({
            id: generateId(),
            type: 'features',
            style: { padding: '20px 0', backgroundColor: 'transparent' },
            features: features,
            featureLayout: {
              columns: Math.min(features.length, 3) as 1 | 2 | 3 | 4,
              gap: 24,
              alignment: 'center',
              cardStyle: 'bordered',
              showDivider: false,
              imagePosition: 'top',
              imageSize: 'medium',
              showIcons: true,
            },
            settings: {
              title: 'Features',
              subtitle: '',
              showSectionTitle: true,
            },
          });
          return elements;
        }
      }
    }

    // Detect lists
    const ulMatch = html.match(/<ul[^>]*>([\s\S]*?)<\/ul>/);
    if (ulMatch) {
      const liMatches = ulMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g);
      if (liMatches) {
        const items: ListItem[] = liMatches.map((li) => ({
          id: generateId(),
          content: li.replace(/<[^>]*>/g, '').trim(),
        }));
        elements.push({
          id: generateId(),
          type: 'list',
          items: items,
          listLayout: {
            bulletType: 'disc',
            bulletColor: '#506ee4',
            bulletSize: 'medium',
            showBullets: true,
            iconSize: 'medium',
            gap: 8,
          },
          style: {
            padding: '8px 0',
            fontSize: '16px',
            lineHeight: 1.8,
            color: '#333333',
          },
          settings: { ordered: false },
        });
        return elements;
      }
    }

    // Check for heading
    const headingMatch = html.match(
      /<h1[^>]*>([^<]*)<\/h1>|<h2[^>]*>([^<]*)<\/h2>/,
    );
    if (headingMatch) {
      const headingText = headingMatch[1] || headingMatch[2] || '';
      elements.push({
        id: generateId(),
        type: 'heading',
        content: headingText,
        style: {
          fontSize: '28px',
          fontWeight: 700,
          textAlign: 'center',
          color: '#222222',
          padding: '16px 0',
        },
      });
    }

    // Check for paragraphs
    const paragraphMatches = html.match(/<p[^>]*>([^<]*)<\/p>/g);
    if (paragraphMatches) {
      paragraphMatches.forEach((match) => {
        const text = match.replace(/<[^>]*>/g, '').trim();
        if (
          text &&
          !text.includes("You're receiving") &&
          !text.includes('Unsubscribe')
        ) {
          elements.push({
            id: generateId(),
            type: 'paragraph',
            content: text,
            style: {
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#333333',
              padding: '8px 0',
            },
          });
        }
      });
    }

    // If no elements were found, create a single paragraph with the content
    if (elements.length === 0 && html) {
      const cleanText = html.replace(/<[^>]*>/g, '').trim();
      if (cleanText) {
        elements.push({
          id: generateId(),
          type: 'paragraph',
          content: cleanText,
          style: {
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#333333',
            padding: '8px 0',
          },
        });
      }
    }

    return elements;
  };

  // ─── Load template ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!templateId) {
      setIsLoading(false);
      return;
    }

    const loadTemplate = async () => {
      try {
        const template = await emailTemplateService.getById(templateId);

        if (
          template.builderConfig?.elements &&
          template.builderConfig.elements.length > 0
        ) {
          // Template was created with the new builder - use stored elements
          setState((prev) => ({
            ...prev,
            elements: template.builderConfig.elements,
            title: template.title,
            subject: template.subject,
            category: template.category || 'transactional',
            tags: template.tags || [],
            status: template.status !== false,
            includeSignature: template.includeSignature || false,
            signatureConfig:
              template.signatureConfig || DEFAULT_STATE.signatureConfig,
            globalStyles:
              template.builderConfig?.globalStyles ||
              DEFAULT_STATE.globalStyles,
          }));
        } else {
          // Template was created with the old system - parse HTML to elements
          const content = template.content || '';
          const parsedElements = parseHtmlToElements(content);

          setState((prev) => ({
            ...prev,
            elements:
              parsedElements.length > 0
                ? parsedElements
                : [
                    {
                      id: generateId(),
                      type: 'paragraph',
                      content: content,
                      style: {
                        fontSize: '16px',
                        lineHeight: 1.6,
                        color: '#333333',
                        padding: '8px 0',
                      },
                    },
                  ],
            title: template.title,
            subject: template.subject,
            category: template.category || 'transactional',
            tags: template.tags || [],
            status: template.status !== false,
            includeSignature: template.includeSignature || false,
            signatureConfig:
              template.signatureConfig || DEFAULT_STATE.signatureConfig,
            globalStyles:
              template.builderConfig?.globalStyles ||
              DEFAULT_STATE.globalStyles,
          }));
        }
      } catch (err) {
        setError('Failed to load template');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  // ─── Preview generation ────────────────────────────────────────────────

  const generatePreviewHtml = useCallback(() => {
    const {
      globalStyles,
      elements,
      includeSignature,
      signatureConfig,
      subject,
    } = state;

    const renderElement = (el: EmailElement): string => {
      const styleStr = styleToCssString(el.style);

      switch (el.type) {
        case 'heading':
          return `<h2 style="${styleStr}">${el.content || ''}</h2>`;
        case 'paragraph':
          return `<p style="${styleStr}">${el.content || ''}</p>`;
        case 'list':
          return renderListHtml(el);
        case 'image':
          return `<div style="text-align:${el.style?.textAlign || 'center'};padding:4px 0;">
            <img src="${el.src || ''}" alt="${el.alt || ''}" style="${styleStr}" />
            ${el.settings?.caption ? `<p style="font-size:12px;color:#999;text-align:center;margin:4px 0;">${el.settings.caption}</p>` : ''}
          </div>`;
        case 'button':
          return `<div style="text-align:${el.style?.textAlign || 'center'};padding:8px 0;">
            <a href="${el.href || '#'}" target="${el.settings?.target || '_blank'}" style="${styleStr}">${el.content || 'Button'}</a>
          </div>`;
        case 'divider':
          return `<hr style="${styleStr}" />`;
        case 'spacer':
          return `<div style="${styleStr}"></div>`;
        case 'columns':
          if (!el.columns || el.columns.length === 0) return '';
          const gap = el.settings?.gap || 20;
          const colWidth =
            el.columns.length > 0
              ? `calc(${100 / el.columns.length}% - ${(gap * (el.columns.length - 1)) / el.columns.length}px)`
              : '100%';
          const colStyle = `flex:1;min-width:0;margin:0 ${gap / 2}px;`;
          const cols = el.columns
            .map(
              (col) => `<div style="${colStyle}">${renderElement(col)}</div>`,
            )
            .join('');
          return `<div style="display:flex;flex-wrap:wrap;${styleStr}">${cols}</div>`;
        case 'video':
          const aspectRatio = el.settings?.aspectRatio || '16:9';
          const [w, h] = aspectRatio.split(':').map(Number);
          const padBottom = (h / w) * 100;
          return `<div style="position:relative;padding-bottom:${padBottom}%;height:0;overflow:hidden;${styleStr}">
            <iframe src="${el.src || ''}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
          </div>`;
        case 'social':
          const platforms = el.settings?.platforms || [];
          const icons = platforms
            .map((p: any) =>
              p.url
                ? `<a href="${p.url}" target="_blank" style="display:inline-block;margin:0 8px;color:${globalStyles.primaryColor};text-decoration:none;font-size:20px;">${p.icon || '●'}</a>`
                : '',
            )
            .join('');
          return `<div style="${styleStr}">${icons}</div>`;
        case 'html':
          return `<div style="${styleStr}">${el.content || ''}</div>`;
        case 'features':
          return renderFeaturesHtml(el);
        default:
          return '';
      }
    };

    const renderListHtml = (el: EmailElement): string => {
      if (!el.items || el.items.length === 0) return '';

      const layout = el.listLayout || {
        bulletType: 'circle',
        bulletColor: '#506ee4',
        bulletSize: 'medium',
        showBullets: true,
        iconSize: 'medium',
        gap: 8,
      };

      const bulletType = layout.bulletType;
      const bulletColor = layout.bulletColor || '#506ee4';
      const bulletSize = layout.bulletSize || 'medium';
      const showBullets = layout.showBullets !== false;
      const iconSize = layout.iconSize || 'medium';
      const gap = layout.gap || 8;

      const sizeMap: Record<string, string> = {
        small: '12px',
        medium: '16px',
        large: '20px',
      };

      const iconSizeMap: Record<string, string> = {
        small: '16px',
        medium: '24px',
        large: '32px',
      };

      const bulletSizeStr = sizeMap[bulletSize] || '16px';
      const iconSizeStr = iconSizeMap[iconSize] || '24px';

      const getBulletHtml = (item: ListItem, index: number): string => {
        if (!showBullets) return '';

        const color = bulletColor;

        switch (bulletType) {
          case 'circle':
            return `<span style="display:inline-block;width:${bulletSizeStr};height:${bulletSizeStr};border-radius:50%;background:${color};flex-shrink:0;margin-top:4px;"></span>`;
          case 'square':
            return `<span style="display:inline-block;width:${bulletSizeStr};height:${bulletSizeStr};background:${color};flex-shrink:0;margin-top:4px;"></span>`;
          case 'disc':
            return `<span style="display:inline-block;width:${bulletSizeStr};height:${bulletSizeStr};border-radius:50%;background:${color};flex-shrink:0;margin-top:4px;"></span>`;
          case 'icon':
            return `<span style="font-size:${iconSizeStr};flex-shrink:0;">${item.icon || '•'}</span>`;
          case 'image':
            return item.image
              ? `<img src="${item.image}" style="width:${iconSizeStr};height:${iconSizeStr};object-fit:cover;border-radius:50%;flex-shrink:0;" />`
              : `<span style="display:inline-block;width:${iconSizeStr};height:${iconSizeStr};border-radius:50%;background:${color};flex-shrink:0;margin-top:4px;"></span>`;
          case 'number':
            return `<span style="font-weight:bold;color:${color};flex-shrink:0;min-width:${bulletSizeStr};text-align:center;">${index + 1}.</span>`;
          case 'check':
            return `<span style="color:${color};font-size:${iconSizeStr};flex-shrink:0;">✓</span>`;
          case 'star':
            return `<span style="color:${color};font-size:${iconSizeStr};flex-shrink:0;">★</span>`;
          case 'arrow':
            return `<span style="color:${color};font-size:${iconSizeStr};flex-shrink:0;">→</span>`;
          default:
            return `<span style="display:inline-block;width:${bulletSizeStr};height:${bulletSizeStr};border-radius:50%;background:${color};flex-shrink:0;margin-top:4px;"></span>`;
        }
      };

      const isOrdered = el.settings?.ordered || false;
      const itemsHtml = el.items
        .map((item: ListItem, index: number) => {
          const bulletHtml = getBulletHtml(item, index);
          const isNumber = bulletType === 'number' || isOrdered;
          const itemStyle = `display:flex;align-items:flex-start;gap:${gap}px;margin-bottom:${gap}px;`;

          return `<li style="${itemStyle}">
          ${bulletHtml}
          <span style="flex:1;word-break:break-word;">${item.content}</span>
        </li>`;
        })
        .join('');

      const listTag = isOrdered || bulletType === 'number' ? 'ol' : 'ul';
      return `<${listTag} style="list-style:none;padding:0;margin:0;${styleToCssString(el.style)}">
        ${itemsHtml}
      </${listTag}>`;
    };

    const renderFeaturesHtml = (el: EmailElement): string => {
      if (!el.features || el.features.length === 0) return '';

      const layout = el.featureLayout || {
        columns: 2,
        gap: 24,
        alignment: 'center',
        cardStyle: 'bordered',
        showDivider: false,
        imagePosition: 'top',
        imageSize: 'medium',
        showIcons: true,
      };
      const cols = layout.columns;
      const gap = layout.gap;
      const alignment = layout.alignment;
      const cardStyle = layout.cardStyle;
      const imagePosition = layout.imagePosition;
      const imageSize = layout.imageSize;
      const showIcons = layout.showIcons !== false;

      const cardStyles: Record<string, string> = {
        flat: 'border:none;padding:12px;',
        bordered: 'border:1px solid #eaeaea;border-radius:8px;padding:16px;',
        shadowed:
          'border:none;border-radius:8px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);',
        elevated:
          'border:none;border-radius:8px;padding:16px;box-shadow:0 4px 16px rgba(0,0,0,0.12);',
      };

      const imageSizeStyles: Record<string, string> = {
        small: 'width:40px;height:40px;',
        medium: 'width:64px;height:64px;',
        large: 'width:100px;height:100px;',
      };

      const textAlignMap: Record<string, string> = {
        left: 'text-align:left;',
        center: 'text-align:center;',
        right: 'text-align:right;',
      };

      const cardWidth = `calc(${100 / cols}% - ${(gap * (cols - 1)) / cols}px)`;

      const featuresHtml = el.features
        .map((feature: FeatureItem) => {
          const isLeftRight =
            imagePosition === 'left' || imagePosition === 'right';
          const flexDirection =
            imagePosition === 'left'
              ? 'row'
              : imagePosition === 'right'
                ? 'row-reverse'
                : 'column';
          const imageHtml = feature.image
            ? `<img src="${feature.image}" alt="${feature.headline}" style="${imageSizeStyles[imageSize]}object-fit:cover;border-radius:8px;flex-shrink:0;${imagePosition === 'top' ? 'margin-bottom:12px;' : isLeftRight ? 'margin-right:16px;' : ''}" />`
            : showIcons && feature.icon
              ? `<div style="font-size:${imageSize === 'large' ? '48px' : imageSize === 'medium' ? '36px' : '24px'};line-height:1;">${feature.icon}</div>`
              : '';

          const contentHtml = `
          ${feature.badge ? `<span style="display:inline-block;background:${globalStyles.primaryColor};color:#fff;font-size:11px;font-weight:600;padding:2px 12px;border-radius:20px;margin-bottom:8px;">${feature.badge}</span>` : ''}
          <h3 style="font-size:${imageSize === 'large' ? '22px' : imageSize === 'medium' ? '18px' : '16px'};font-weight:700;color:#222;margin:0 0 4px 0;">${feature.headline}</h3>
          ${feature.subHeadline ? `<p style="font-size:13px;color:#888;margin:0 0 8px 0;">${feature.subHeadline}</p>` : ''}
          <p style="font-size:14px;line-height:1.6;color:#555;margin:0;">${feature.description}</p>
          ${feature.ctaText && feature.ctaUrl ? `<a href="${feature.ctaUrl}" style="display:inline-block;margin-top:12px;color:${globalStyles.primaryColor};font-weight:600;text-decoration:none;">${feature.ctaText} →</a>` : ''}
        `;

          return `
          <div style="width:${cardWidth};margin-bottom:${gap}px;${cardStyles[cardStyle]}${textAlignMap[alignment]}${isLeftRight ? 'display:flex;' : ''}${isLeftRight && imagePosition === 'right' ? 'flex-direction:row-reverse;' : isLeftRight ? 'flex-direction:row;' : 'flex-direction:column;'}align-items:${isLeftRight ? 'center' : alignment};">
            ${imageHtml}
            <div style="${isLeftRight ? 'flex:1;' : ''}">${contentHtml}</div>
          </div>
        `;
        })
        .join('');

      const sectionTitle = el.settings?.showSectionTitle
        ? `
        <h2 style="font-size:28px;font-weight:700;color:#222;text-align:${alignment};margin:0 0 8px 0;">${el.settings?.title || 'Features'}</h2>
        ${el.settings?.subtitle ? `<p style="font-size:16px;color:#888;text-align:${alignment};margin:0 0 24px 0;">${el.settings.subtitle}</p>` : ''}
      `
        : '';

      return `
        <div style="${styleToCssString(el.style)}">
          ${sectionTitle}
          <div style="display:flex;flex-wrap:wrap;margin:0 -${gap / 2}px;">
            ${featuresHtml}
          </div>
          ${layout.showDivider ? `<hr style="border:none;border-top:1px solid #eaeaea;margin:8px 0 0;" />` : ''}
        </div>
      `;
    };

    const renderElements = (elements: EmailElement[]): string => {
      return elements.map((el) => renderElement(el)).join('');
    };

    const logoUrl =
      'https://pub-eab2790b2e94418f896b048a8e6658d0.r2.dev/logo/logo.png';
    const bodyContent = renderElements(elements);

    let signatureHtml = '';
    if (includeSignature && signatureConfig) {
      const {
        organizationName,
        fullName,
        title,
        phone,
        email,
        website,
        additionalInfo,
      } = signatureConfig;
      signatureHtml = `
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eaeaea;font-family:${globalStyles.fontFamily};">
          <strong style="font-size:16px;color:#222;display:block;margin-bottom:6px;">${organizationName || 'Bothell Select'}</strong>
          ${fullName ? `<div style="font-weight:600;color:#333;margin-bottom:2px;">${fullName}</div>` : ''}
          ${title ? `<div style="color:#666;font-size:14px;margin-bottom:8px;">${title}</div>` : ''}
          <div style="font-size:13px;color:#555;">
            ${phone ? `<div>📞 ${phone}</div>` : ''}
            ${email ? `<div>✉️ <a href="mailto:${email}" style="color:${globalStyles.linkColor};">${email}</a></div>` : ''}
            ${website ? `<div>🌐 <a href="${website}" style="color:${globalStyles.linkColor};">${website}</a></div>` : ''}
            ${additionalInfo ? `<div style="color:#888;font-size:12px;margin-top:6px;">${additionalInfo}</div>` : ''}
          </div>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject || 'Email'}</title>
  <style>
    body { font-family: ${globalStyles.fontFamily || 'system'}, -apple-system, sans-serif; margin: 0; padding: 0; background: ${globalStyles.backgroundColor || '#f6f6f6'}; color: ${globalStyles.textColor || '#333'}; }
    a { color: ${globalStyles.linkColor || '#506ee4'}; text-decoration: none; }
    img { max-width: 100%; height: auto; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .email-body { padding: 20px !important; }
      .col-2 { width: 100% !important; display: block !important; }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${globalStyles.backgroundColor || '#f6f6f6'};padding:20px 0;">
    <tr><td align="center">
      <div class="container" style="max-width:600px;margin:0 auto;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
          <tr><td style="padding:20px 30px;border-bottom:1px solid #eaeaea;">
            <img src="${logoUrl}" alt="Bothell Select" height="30" style="display:block;height:30px;" />
          </td></tr>
          <tr><td class="email-body" style="padding:30px;">
            ${bodyContent}
            ${signatureHtml}
          </td></tr>
          <tr><td style="padding:20px 30px;border-top:1px solid #eaeaea;text-align:center;font-size:12px;color:#999;">
            <p style="margin:0 0 8px;">You're receiving this because you're part of <strong>Bothell Select</strong>.</p>
            <p style="margin:0;">
              <a href="https://bothellselect.com/general-settings/notifications-settings" style="color:${globalStyles.linkColor || '#506ee4'};">Unsubscribe</a> •
              <a href="https://bothellselect.com/contact-us" style="color:${globalStyles.linkColor || '#506ee4'};">Contact Us</a> •
              <a href="https://bothellselect.com" style="color:${globalStyles.linkColor || '#506ee4'};">Website</a>
            </p>
          </td></tr>
        </table>
        <p style="text-align:center;font-size:11px;color:#bbb;margin:16px 0 0;">© ${new Date().getFullYear()} Bothell Select. All rights reserved.</p>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
  }, [state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewHtml(generatePreviewHtml());
    }, 200);
    return () => clearTimeout(timer);
  }, [generatePreviewHtml]);

  // ─── Drag & Drop ───────────────────────────────────────────────────────

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(state.elements);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setState((prev) => ({ ...prev, elements: items }));
  };

  // ─── Element Operations ───────────────────────────────────────────────

  const addElement = (type: ElementType) => {
    const newElement = createElement(type);
    setState((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
  };

  const duplicateElement = (id: string) => {
    const findAndDuplicate = (elements: EmailElement[]): EmailElement[] => {
      return elements.flatMap((el) => {
        if (el.id === id) {
          const copy = JSON.parse(JSON.stringify(el));
          copy.id = generateId();
          if (copy.features) {
            copy.features = copy.features.map((f: FeatureItem) => ({
              ...f,
              id: generateId(),
            }));
          }
          if (copy.items) {
            copy.items = copy.items.map((item: ListItem) => ({
              ...item,
              id: generateId(),
            }));
          }
          return [el, copy];
        }
        if (el.columns) {
          return [{ ...el, columns: findAndDuplicate(el.columns) }];
        }
        return [el];
      });
    };
    setState((prev) => ({
      ...prev,
      elements: findAndDuplicate(prev.elements),
    }));
  };

  const deleteElement = (id: string) => {
    const filterRecursive = (elements: EmailElement[]): EmailElement[] => {
      return elements
        .filter((el) => el.id !== id)
        .map((el) => {
          if (el.columns)
            return { ...el, columns: filterRecursive(el.columns) };
          return el;
        });
    };
    setState((prev) => ({ ...prev, elements: filterRecursive(prev.elements) }));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    const index = state.elements.findIndex((el) => el.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= state.elements.length) return;
    const items = Array.from(state.elements);
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    setState((prev) => ({ ...prev, elements: items }));
  };

  // Add a method to handle image uploads properly
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/email-templates/upload-temp-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        return result.data.url;
      }
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Update handleImageUpload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show loading state
    setIsSaving(true);

    const url = await uploadImage(file);
    if (url && selectedElementId) {
      updateElement(selectedElementId, { src: url });
    } else {
      setError('Failed to upload image');
    }

    setIsSaving(false);
    // Reset the input
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!state.title.trim()) {
      setError('Please enter a template title');
      return;
    }
    if (!state.subject.trim()) {
      setError('Please enter an email subject');
      return;
    }
    if (state.elements.length === 0) {
      setError('Please add at least one element to the template');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const htmlContent = generatePreviewHtml();

      const payload = {
        title: state.title.trim(),
        subject: state.subject.trim(),
        content: htmlContent,
        category: state.category,
        tags: state.tags,
        status: state.status,
        includeSignature: state.includeSignature,
        signatureConfig: state.signatureConfig,
        builderConfig: {
          elements: state.elements,
          globalStyles: state.globalStyles,
        },
        attachments: state.attachments,
      };

      let saved;
      if (templateId) {
        saved = await emailTemplateService.update(templateId, payload);
      } else {
        saved = await emailTemplateService.create(payload);
      }

      setSuccess('Template saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      onSave?.(saved);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || 'Failed to save template',
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ─── List Settings Panel ─────────────────────────────────────────────

  const renderListSettings = (el: EmailElement) => {
    if (!el.items || el.type !== 'list') return null;

    const layout = el.listLayout || {
      bulletType: 'circle',
      bulletColor: '#506ee4',
      bulletSize: 'medium',
      showBullets: true,
      iconSize: 'medium',
      gap: 8,
    };

    const bulletTypeOptions: {
      value: BulletType;
      label: string;
      icon: string;
    }[] = [
      { value: 'circle', label: 'Circle', icon: '●' },
      { value: 'disc', label: 'Disc', icon: '•' },
      { value: 'square', label: 'Square', icon: '■' },
      { value: 'icon', label: 'Icon', icon: '⭐' },
      { value: 'image', label: 'Image', icon: '🖼️' },
      { value: 'number', label: 'Number', icon: '1.' },
      { value: 'check', label: 'Check', icon: '✓' },
      { value: 'star', label: 'Star', icon: '★' },
      { value: 'arrow', label: 'Arrow', icon: '→' },
    ];

    return (
      <div className='list-settings'>
        <h6 className='settings-title'>List Settings</h6>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Bullet Type</Form.Label>
          <div className='bullet-type-selector'>
            <div className='d-flex flex-wrap gap-1'>
              {bulletTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    layout.bulletType === option.value
                      ? 'primary'
                      : 'outline-secondary'
                  }
                  size='sm'
                  onClick={() => {
                    updateElement(el.id, {
                      listLayout: { ...layout, bulletType: option.value },
                    });
                  }}
                  className='bullet-option-btn'
                  title={option.label}
                >
                  <span style={{ fontSize: '14px' }}>{option.icon}</span>
                </Button>
              ))}
            </div>
          </div>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Bullet Color</Form.Label>
          <div className='d-flex gap-2'>
            <input
              type='color'
              value={layout.bulletColor || '#506ee4'}
              onChange={(e) =>
                updateElement(el.id, {
                  listLayout: { ...layout, bulletColor: e.target.value },
                })
              }
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '2px',
              }}
            />
            <Form.Control
              type='text'
              size='sm'
              value={layout.bulletColor || ''}
              onChange={(e) =>
                updateElement(el.id, {
                  listLayout: { ...layout, bulletColor: e.target.value },
                })
              }
              placeholder='#506ee4'
            />
          </div>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Bullet Size</Form.Label>
          <Form.Select
            size='sm'
            value={layout.bulletSize || 'medium'}
            onChange={(e) =>
              updateElement(el.id, {
                listLayout: {
                  ...layout,
                  bulletSize: e.target.value as 'small' | 'medium' | 'large',
                },
              })
            }
          >
            <option value='small'>Small</option>
            <option value='medium'>Medium</option>
            <option value='large'>Large</option>
          </Form.Select>
        </Form.Group>

        {(layout.bulletType === 'icon' || layout.bulletType === 'image') && (
          <Form.Group className='mb-2'>
            <Form.Label className='small'>Icon/Image Size</Form.Label>
            <Form.Select
              size='sm'
              value={layout.iconSize || 'medium'}
              onChange={(e) =>
                updateElement(el.id, {
                  listLayout: {
                    ...layout,
                    iconSize: e.target.value as 'small' | 'medium' | 'large',
                  },
                })
              }
            >
              <option value='small'>Small</option>
              <option value='medium'>Medium</option>
              <option value='large'>Large</option>
            </Form.Select>
          </Form.Group>
        )}

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Gap (px)</Form.Label>
          <Form.Control
            type='number'
            size='sm'
            value={layout.gap || 8}
            onChange={(e) =>
              updateElement(el.id, {
                listLayout: {
                  ...layout,
                  gap: parseInt(e.target.value) || 8,
                },
              })
            }
            min='0'
            max='40'
          />
        </Form.Group>

        <Form.Check
          type='switch'
          label='Show Bullets'
          checked={layout.showBullets !== false}
          onChange={(e) =>
            updateElement(el.id, {
              listLayout: { ...layout, showBullets: e.target.checked },
            })
          }
          className='mb-2'
        />

        <Form.Check
          type='switch'
          label='Ordered List (Numbers)'
          checked={el.settings?.ordered || false}
          onChange={(e) =>
            updateElement(el.id, {
              settings: { ...el.settings, ordered: e.target.checked },
            })
          }
          className='mb-2'
        />

        <hr />
        <h6 className='settings-title'>List Items ({el.items.length})</h6>

        <div className='list-items'>
          {el.items.map((item: ListItem, index: number) => (
            <div key={item.id} className='border rounded p-2 mb-2'>
              <div className='d-flex justify-content-between align-items-center mb-2'>
                <span className='small fw-bold'>Item {index + 1}</span>
                <div className='d-flex gap-1'>
                  <Button
                    variant='outline-danger'
                    size='sm'
                    onClick={() => {
                      const updatedItems =
                        el.items?.filter((i: ListItem) => i.id !== item.id) ||
                        [];
                      updateElement(el.id, { items: updatedItems });
                    }}
                    title='Delete item'
                  >
                    <i className='ti ti-trash' style={{ fontSize: '12px' }}></i>
                  </Button>
                </div>
              </div>
              <Form.Group>
                <Form.Control
                  type='text'
                  size='sm'
                  value={item.content}
                  onChange={(e) => {
                    const updatedItems =
                      el.items?.map((i: ListItem) =>
                        i.id === item.id
                          ? { ...i, content: e.target.value }
                          : i,
                      ) || [];
                    updateElement(el.id, { items: updatedItems });
                  }}
                  placeholder='List item text'
                />
              </Form.Group>

              {layout.bulletType === 'icon' && (
                <Form.Group className='mt-1'>
                  <Form.Label className='small'>Icon</Form.Label>
                  <Form.Control
                    type='text'
                    size='sm'
                    value={item.icon || ''}
                    onChange={(e) => {
                      const updatedItems =
                        el.items?.map((i: ListItem) =>
                          i.id === item.id ? { ...i, icon: e.target.value } : i,
                        ) || [];
                      updateElement(el.id, { items: updatedItems });
                    }}
                    placeholder='⭐'
                  />
                </Form.Group>
              )}

              {layout.bulletType === 'image' && (
                <Form.Group className='mt-1'>
                  <Form.Label className='small'>Image URL</Form.Label>
                  <div className='d-flex gap-2'>
                    <Form.Control
                      type='text'
                      size='sm'
                      value={item.image || ''}
                      onChange={(e) => {
                        const updatedItems =
                          el.items?.map((i: ListItem) =>
                            i.id === item.id
                              ? { ...i, image: e.target.value }
                              : i,
                          ) || [];
                        updateElement(el.id, { items: updatedItems });
                      }}
                      placeholder='https://...'
                    />
                    <Button
                      variant='outline-secondary'
                      size='sm'
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              const updatedItems =
                                el.items?.map((i: ListItem) =>
                                  i.id === item.id
                                    ? { ...i, image: dataUrl }
                                    : i,
                                ) || [];
                              updateElement(el.id, { items: updatedItems });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      Upload
                    </Button>
                  </div>
                  {item.image && (
                    <div className='mt-1'>
                      <img
                        src={item.image}
                        alt={item.content}
                        style={{ maxHeight: '40px', borderRadius: '4px' }}
                      />
                    </div>
                  )}
                </Form.Group>
              )}
            </div>
          ))}
        </div>

        <Button
          variant='outline-primary'
          size='sm'
          className='w-100 mt-2'
          onClick={() => {
            const newItem: ListItem = {
              id: generateId(),
              content: `List item ${(el.items?.length || 0) + 1}`,
            };
            const updatedItems = [...(el.items || []), newItem];
            updateElement(el.id, { items: updatedItems });
          }}
        >
          <i className='ti ti-plus me-1'></i> Add List Item
        </Button>
      </div>
    );
  };

  // ─── Element Settings Panel ───────────────────────────────────────────

  const renderSettingsPanel = () => {
    const el = getSelectedElement();
    if (!el) {
      return (
        <div className='settings-empty'>
          <p className='text-muted'>Select an element to edit its settings</p>
        </div>
      );
    }

    // If it's a features element, render the feature settings
    if (el.type === 'features') {
      return renderFeatureSettings(el);
    }

    // If it's a list element, render list settings
    if (el.type === 'list') {
      return renderListSettings(el);
    }

    // Otherwise render regular settings
    return (
      <div className='settings-panel'>
        <h6 className='settings-title'>
          <span className='badge bg-primary me-2'>{el.type}</span>
          Element Settings
        </h6>

        {/* Content */}
        {['heading', 'paragraph', 'button', 'html'].includes(el.type) && (
          <Form.Group className='mb-3'>
            <Form.Label>Content</Form.Label>
            <Form.Control
              as='textarea'
              rows={4}
              value={el.content || ''}
              onChange={(e) =>
                updateElement(el.id, { content: e.target.value })
              }
            />
          </Form.Group>
        )}

        {/* Image */}
        {el.type === 'image' && (
          <>
            <Form.Group className='mb-3'>
              <Form.Label>Image URL</Form.Label>
              <div className='d-flex gap-2'>
                <Form.Control
                  type='text'
                  value={el.src || ''}
                  onChange={(e) =>
                    updateElement(el.id, { src: e.target.value })
                  }
                  placeholder='https://example.com/image.jpg'
                />
                <Button
                  variant='outline-secondary'
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          updateElement(el.id, {
                            src: ev.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                >
                  Upload
                </Button>
              </div>
            </Form.Group>
            {el.src && (
              <div className='mb-3'>
                <img
                  src={el.src}
                  alt='Preview'
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100px',
                    borderRadius: '4px',
                  }}
                />
              </div>
            )}
            <Form.Group className='mb-3'>
              <Form.Label>Alt Text</Form.Label>
              <Form.Control
                type='text'
                value={el.alt || ''}
                onChange={(e) => updateElement(el.id, { alt: e.target.value })}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Caption</Form.Label>
              <Form.Control
                type='text'
                value={el.settings?.caption || ''}
                onChange={(e) =>
                  updateElement(el.id, {
                    settings: { ...el.settings, caption: e.target.value },
                  })
                }
              />
            </Form.Group>
          </>
        )}

        {/* Button */}
        {el.type === 'button' && (
          <>
            <Form.Group className='mb-3'>
              <Form.Label>Button Text</Form.Label>
              <Form.Control
                type='text'
                value={el.content || ''}
                onChange={(e) =>
                  updateElement(el.id, { content: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Link URL</Form.Label>
              <Form.Control
                type='text'
                value={el.href || ''}
                onChange={(e) => updateElement(el.id, { href: e.target.value })}
                placeholder='https://example.com'
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Open in new tab</Form.Label>
              <Form.Check
                type='switch'
                checked={el.settings?.target === '_blank'}
                onChange={(e) =>
                  updateElement(el.id, {
                    settings: {
                      ...el.settings,
                      target: e.target.checked ? '_blank' : '_self',
                    },
                  })
                }
              />
            </Form.Group>
          </>
        )}

        {/* Video */}
        {el.type === 'video' && (
          <>
            <Form.Group className='mb-3'>
              <Form.Label>YouTube/Vimeo URL</Form.Label>
              <Form.Control
                type='text'
                value={el.src || ''}
                onChange={(e) => updateElement(el.id, { src: e.target.value })}
                placeholder='https://www.youtube.com/embed/...'
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Aspect Ratio</Form.Label>
              <Form.Select
                value={el.settings?.aspectRatio || '16:9'}
                onChange={(e) =>
                  updateElement(el.id, {
                    settings: { ...el.settings, aspectRatio: e.target.value },
                  })
                }
              >
                <option value='16:9'>16:9</option>
                <option value='4:3'>4:3</option>
                <option value='1:1'>1:1 (Square)</option>
                <option value='21:9'>21:9 (Ultrawide)</option>
              </Form.Select>
            </Form.Group>
          </>
        )}

        {/* Columns */}
        {el.type === 'columns' && (
          <>
            <Form.Group className='mb-3'>
              <Form.Label>Number of Columns</Form.Label>
              <Form.Select
                value={el.settings?.columnCount || 2}
                onChange={(e) => {
                  const count = parseInt(e.target.value);
                  const currentColumns = el.columns || [];
                  const newColumns = Array(count)
                    .fill(null)
                    .map((_, i) => {
                      if (i < currentColumns.length) return currentColumns[i];
                      return {
                        ...createElement('paragraph'),
                        id: generateId(),
                      };
                    });
                  updateElement(el.id, {
                    columns: newColumns,
                    settings: { ...el.settings, columnCount: count },
                  });
                }}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Column' : 'Columns'}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Gap (px)</Form.Label>
              <Form.Control
                type='number'
                value={el.settings?.gap || 20}
                onChange={(e) =>
                  updateElement(el.id, {
                    settings: {
                      ...el.settings,
                      gap: parseInt(e.target.value) || 20,
                    },
                  })
                }
              />
            </Form.Group>
          </>
        )}

        {/* Social */}
        {el.type === 'social' && (
          <div>
            {(el.settings?.platforms || []).map(
              (platform: any, index: number) => (
                <Form.Group key={index} className='mb-2'>
                  <Form.Label>{platform.name || 'Platform'}</Form.Label>
                  <Form.Control
                    type='text'
                    value={platform.url || ''}
                    onChange={(e) => {
                      const platforms = [...(el.settings?.platforms || [])];
                      platforms[index] = {
                        ...platforms[index],
                        url: e.target.value,
                      };
                      updateElement(el.id, {
                        settings: { ...el.settings, platforms },
                      });
                    }}
                    placeholder='https://...'
                  />
                </Form.Group>
              ),
            )}
            <Button
              variant='outline-secondary'
              size='sm'
              onClick={() => {
                const platforms = [...(el.settings?.platforms || [])];
                platforms.push({ name: 'New Platform', url: '', icon: '●' });
                updateElement(el.id, {
                  settings: { ...el.settings, platforms },
                });
              }}
            >
              + Add Platform
            </Button>
          </div>
        )}

        {/* Common Style Settings */}
        <hr />
        <h6 className='mb-2'>Style Settings</h6>

        <Form.Group className='mb-2'>
          <Form.Label>Text Alignment</Form.Label>
          <div className='d-flex gap-1'>
            {['left', 'center', 'right', 'justify'].map((align) => (
              <Button
                key={align}
                variant={
                  el.style?.textAlign === align
                    ? 'primary'
                    : 'outline-secondary'
                }
                size='sm'
                onClick={() =>
                  updateElement(el.id, {
                    style: { ...el.style, textAlign: align as any },
                  })
                }
              >
                {align === 'left' && '↞'}
                {align === 'center' && '↔'}
                {align === 'right' && '↠'}
                {align === 'justify' && '≡'}
              </Button>
            ))}
          </div>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Font Size</Form.Label>
          <Form.Control
            type='text'
            value={el.style?.fontSize || ''}
            onChange={(e) =>
              updateElement(el.id, {
                style: { ...el.style, fontSize: e.target.value },
              })
            }
            placeholder='16px'
          />
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Font Weight</Form.Label>
          <Form.Control
            type='text'
            value={el.style?.fontWeight || ''}
            onChange={(e) =>
              updateElement(el.id, {
                style: { ...el.style, fontWeight: e.target.value },
              })
            }
            placeholder='400 or bold'
          />
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Color</Form.Label>
          <div className='d-flex gap-2'>
            <input
              type='color'
              value={el.style?.color || '#333333'}
              onChange={(e) =>
                updateElement(el.id, {
                  style: { ...el.style, color: e.target.value },
                })
              }
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '2px',
              }}
            />
            <Form.Control
              type='text'
              value={el.style?.color || ''}
              onChange={(e) =>
                updateElement(el.id, {
                  style: { ...el.style, color: e.target.value },
                })
              }
            />
          </div>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Background Color</Form.Label>
          <div className='d-flex gap-2'>
            <input
              type='color'
              value={el.style?.backgroundColor || '#ffffff'}
              onChange={(e) =>
                updateElement(el.id, {
                  style: { ...el.style, backgroundColor: e.target.value },
                })
              }
              style={{
                width: '40px',
                height: '40px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '2px',
              }}
            />
            <Form.Control
              type='text'
              value={el.style?.backgroundColor || ''}
              onChange={(e) =>
                updateElement(el.id, {
                  style: { ...el.style, backgroundColor: e.target.value },
                })
              }
            />
          </div>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Padding</Form.Label>
          <Form.Control
            type='text'
            value={el.style?.padding || ''}
            onChange={(e) =>
              updateElement(el.id, {
                style: { ...el.style, padding: e.target.value },
              })
            }
            placeholder='8px 0'
          />
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Margin</Form.Label>
          <Form.Control
            type='text'
            value={el.style?.margin || ''}
            onChange={(e) =>
              updateElement(el.id, {
                style: { ...el.style, margin: e.target.value },
              })
            }
            placeholder='0 0 16px 0'
          />
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label>Border Radius</Form.Label>
          <Form.Control
            type='text'
            value={el.style?.borderRadius || ''}
            onChange={(e) =>
              updateElement(el.id, {
                style: { ...el.style, borderRadius: e.target.value },
              })
            }
            placeholder='8px'
          />
        </Form.Group>

        <div className='d-flex gap-2 mt-3'>
          <Button
            variant='outline-danger'
            size='sm'
            onClick={() => deleteElement(el.id)}
          >
            <i className='ti ti-trash me-1'></i> Delete
          </Button>
          <Button
            variant='outline-secondary'
            size='sm'
            onClick={() => duplicateElement(el.id)}
          >
            <i className='ti ti-copy me-1'></i> Duplicate
          </Button>
        </div>
      </div>
    );
  };

  // ─── Feature Settings Panel ───────────────────────────────────────────

  const renderFeatureSettings = (el: EmailElement) => {
    if (!el.features || el.type !== 'features') return null;

    const layout = el.featureLayout || {
      columns: 2,
      gap: 24,
      alignment: 'center',
      cardStyle: 'bordered',
      showDivider: false,
      imagePosition: 'top',
      imageSize: 'medium',
      showIcons: true,
    };

    return (
      <div className='feature-settings'>
        <h6 className='settings-title'>Features Layout</h6>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Section Title</Form.Label>
          <Form.Control
            type='text'
            size='sm'
            value={el.settings?.title || ''}
            onChange={(e) =>
              updateElement(el.id, {
                settings: { ...el.settings, title: e.target.value },
              })
            }
            placeholder='e.g. Our Features'
          />
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Section Subtitle</Form.Label>
          <Form.Control
            type='text'
            size='sm'
            value={el.settings?.subtitle || ''}
            onChange={(e) =>
              updateElement(el.id, {
                settings: { ...el.settings, subtitle: e.target.value },
              })
            }
            placeholder='e.g. What we offer'
          />
        </Form.Group>

        <Form.Check
          type='switch'
          label='Show Section Title'
          checked={el.settings?.showSectionTitle !== false}
          onChange={(e) =>
            updateElement(el.id, {
              settings: { ...el.settings, showSectionTitle: e.target.checked },
            })
          }
          className='mb-2'
        />

        <hr />

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Columns per row</Form.Label>
          <Form.Select
            size='sm'
            value={layout.columns}
            onChange={(e) =>
              updateElement(el.id, {
                featureLayout: {
                  ...layout,
                  columns: parseInt(e.target.value) as 1 | 2 | 3 | 4,
                },
              })
            }
          >
            <option value={1}>1 Column</option>
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
            <option value={4}>4 Columns</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Gap (px)</Form.Label>
          <Form.Control
            type='number'
            size='sm'
            value={layout.gap}
            onChange={(e) =>
              updateElement(el.id, {
                featureLayout: {
                  ...layout,
                  gap: parseInt(e.target.value) || 20,
                },
              })
            }
            min='0'
            max='60'
          />
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Alignment</Form.Label>
          <Form.Select
            size='sm'
            value={layout.alignment}
            onChange={(e) =>
              updateElement(el.id, {
                featureLayout: {
                  ...layout,
                  alignment: e.target.value as 'left' | 'center' | 'right',
                },
              })
            }
          >
            <option value='left'>Left</option>
            <option value='center'>Center</option>
            <option value='right'>Right</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Card Style</Form.Label>
          <Form.Select
            size='sm'
            value={layout.cardStyle}
            onChange={(e) =>
              updateElement(el.id, {
                featureLayout: {
                  ...layout,
                  cardStyle: e.target.value as
                    | 'flat'
                    | 'bordered'
                    | 'shadowed'
                    | 'elevated',
                },
              })
            }
          >
            <option value='flat'>Flat</option>
            <option value='bordered'>Bordered</option>
            <option value='shadowed'>Shadowed</option>
            <option value='elevated'>Elevated</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Image Position</Form.Label>
          <Form.Select
            size='sm'
            value={layout.imagePosition}
            onChange={(e) =>
              updateElement(el.id, {
                featureLayout: {
                  ...layout,
                  imagePosition: e.target.value as 'top' | 'left' | 'right',
                },
              })
            }
          >
            <option value='top'>Top</option>
            <option value='left'>Left</option>
            <option value='right'>Right</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className='mb-2'>
          <Form.Label className='small'>Image Size</Form.Label>
          <Form.Select
            size='sm'
            value={layout.imageSize}
            onChange={(e) =>
              updateElement(el.id, {
                featureLayout: {
                  ...layout,
                  imageSize: e.target.value as 'small' | 'medium' | 'large',
                },
              })
            }
          >
            <option value='small'>Small</option>
            <option value='medium'>Medium</option>
            <option value='large'>Large</option>
          </Form.Select>
        </Form.Group>

        <Form.Check
          type='switch'
          label='Show Icons'
          checked={layout.showIcons !== false}
          onChange={(e) =>
            updateElement(el.id, {
              featureLayout: { ...layout, showIcons: e.target.checked },
            })
          }
          className='mb-2'
        />

        <Form.Check
          type='switch'
          label='Show Divider'
          checked={layout.showDivider || false}
          onChange={(e) =>
            updateElement(el.id, {
              featureLayout: { ...layout, showDivider: e.target.checked },
            })
          }
          className='mb-2'
        />

        <hr />
        <h6 className='settings-title'>Features ({el.features.length})</h6>

        <div className='feature-list'>
          {el.features.map((feature: FeatureItem) => (
            <div key={feature.id} className='border rounded p-2 mb-2'>
              <div className='d-flex justify-content-between align-items-center'>
                <span className='small fw-bold'>
                  {feature.icon} {feature.headline}
                </span>
                <div className='d-flex gap-1'>
                  <Button
                    variant='outline-danger'
                    size='sm'
                    onClick={() => {
                      const updatedFeatures =
                        el.features?.filter(
                          (f: FeatureItem) => f.id !== feature.id,
                        ) || [];
                      updateElement(el.id, { features: updatedFeatures });
                    }}
                    title='Delete feature'
                  >
                    <i className='ti ti-trash' style={{ fontSize: '12px' }}></i>
                  </Button>
                </div>
              </div>
              <div className='mt-2'>
                <Row>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className='small'>Icon</Form.Label>
                      <Form.Control
                        type='text'
                        size='sm'
                        value={feature.icon || ''}
                        onChange={(e) => {
                          const updatedFeatures =
                            el.features?.map((f: FeatureItem) =>
                              f.id === feature.id
                                ? { ...f, icon: e.target.value }
                                : f,
                            ) || [];
                          updateElement(el.id, { features: updatedFeatures });
                        }}
                        placeholder='⭐'
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className='small'>Badge</Form.Label>
                      <Form.Control
                        type='text'
                        size='sm'
                        value={feature.badge || ''}
                        onChange={(e) => {
                          const updatedFeatures =
                            el.features?.map((f: FeatureItem) =>
                              f.id === feature.id
                                ? { ...f, badge: e.target.value }
                                : f,
                            ) || [];
                          updateElement(el.id, { features: updatedFeatures });
                        }}
                        placeholder='NEW'
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group>
                  <Form.Label className='small'>Headline</Form.Label>
                  <Form.Control
                    type='text'
                    size='sm'
                    value={feature.headline}
                    onChange={(e) => {
                      const updatedFeatures =
                        el.features?.map((f: FeatureItem) =>
                          f.id === feature.id
                            ? { ...f, headline: e.target.value }
                            : f,
                        ) || [];
                      updateElement(el.id, { features: updatedFeatures });
                    }}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className='small'>Sub-headline</Form.Label>
                  <Form.Control
                    type='text'
                    size='sm'
                    value={feature.subHeadline || ''}
                    onChange={(e) => {
                      const updatedFeatures =
                        el.features?.map((f: FeatureItem) =>
                          f.id === feature.id
                            ? { ...f, subHeadline: e.target.value }
                            : f,
                        ) || [];
                      updateElement(el.id, { features: updatedFeatures });
                    }}
                    placeholder='Optional subtitle'
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className='small'>Description</Form.Label>
                  <Form.Control
                    as='textarea'
                    size='sm'
                    rows={2}
                    value={feature.description}
                    onChange={(e) => {
                      const updatedFeatures =
                        el.features?.map((f: FeatureItem) =>
                          f.id === feature.id
                            ? { ...f, description: e.target.value }
                            : f,
                        ) || [];
                      updateElement(el.id, { features: updatedFeatures });
                    }}
                  />
                </Form.Group>
                <Row>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className='small'>CTA Text</Form.Label>
                      <Form.Control
                        type='text'
                        size='sm'
                        value={feature.ctaText || ''}
                        onChange={(e) => {
                          const updatedFeatures =
                            el.features?.map((f: FeatureItem) =>
                              f.id === feature.id
                                ? { ...f, ctaText: e.target.value }
                                : f,
                            ) || [];
                          updateElement(el.id, { features: updatedFeatures });
                        }}
                        placeholder='Learn More'
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className='small'>CTA URL</Form.Label>
                      <Form.Control
                        type='text'
                        size='sm'
                        value={feature.ctaUrl || ''}
                        onChange={(e) => {
                          const updatedFeatures =
                            el.features?.map((f: FeatureItem) =>
                              f.id === feature.id
                                ? { ...f, ctaUrl: e.target.value }
                                : f,
                            ) || [];
                          updateElement(el.id, { features: updatedFeatures });
                        }}
                        placeholder='https://...'
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group>
                  <Form.Label className='small'>Image URL</Form.Label>
                  <div className='d-flex gap-2'>
                    <Form.Control
                      type='text'
                      size='sm'
                      value={feature.image || ''}
                      onChange={(e) => {
                        const updatedFeatures =
                          el.features?.map((f: FeatureItem) =>
                            f.id === feature.id
                              ? { ...f, image: e.target.value }
                              : f,
                          ) || [];
                        updateElement(el.id, { features: updatedFeatures });
                      }}
                      placeholder='https://...'
                    />
                    <Button
                      variant='outline-secondary'
                      size='sm'
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              const updatedFeatures =
                                el.features?.map((f: FeatureItem) =>
                                  f.id === feature.id
                                    ? { ...f, image: dataUrl }
                                    : f,
                                ) || [];
                              updateElement(el.id, {
                                features: updatedFeatures,
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      Upload
                    </Button>
                  </div>
                </Form.Group>
                {feature.image && (
                  <div className='mt-1'>
                    <img
                      src={feature.image}
                      alt={feature.headline}
                      style={{ maxHeight: '60px', borderRadius: '4px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          variant='outline-primary'
          size='sm'
          className='w-100 mt-2'
          onClick={() => {
            const newFeature = createFeatureItem();
            const updatedFeatures = [...(el.features || []), newFeature];
            updateElement(el.id, { features: updatedFeatures });
          }}
        >
          <i className='ti ti-plus me-1'></i> Add Feature
        </Button>
      </div>
    );
  };

  // ─── Element Renderer (Builder Canvas) ──────────────────────────────

  const renderElementPreview = (el: EmailElement, index: number) => {
    const isSelected = selectedElementId === el.id;
    const style = el.style || {};

    const content = (() => {
      switch (el.type) {
        case 'heading':
          return (
            <h2 style={{ ...(style as React.CSSProperties), margin: 0 }}>
              {el.content || 'Heading'}
            </h2>
          );
        case 'paragraph':
          return (
            <p style={{ ...(style as React.CSSProperties), margin: 0 }}>
              {el.content || 'Paragraph text'}
            </p>
          );
        case 'list':
          return renderListPreview(el);
        case 'image':
          return (
            <div style={{ textAlign: style.textAlign || 'center' }}>
              {el.src ? (
                <img
                  src={el.src}
                  alt={el.alt || ''}
                  style={{
                    maxWidth: '100%',
                    ...(style as React.CSSProperties),
                  }}
                />
              ) : (
                <div
                  className='image-placeholder'
                  style={{
                    padding: '20px',
                    background: '#f0f0f0',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <i
                    className='ti ti-photo'
                    style={{ fontSize: '32px', color: '#aaa' }}
                  ></i>
                  <p className='text-muted small'>Click to add image</p>
                </div>
              )}
              {el.settings?.caption && (
                <p
                  style={{
                    fontSize: '12px',
                    color: '#999',
                    textAlign: 'center',
                    marginTop: '4px',
                  }}
                >
                  {el.settings.caption}
                </p>
              )}
            </div>
          );
        case 'button':
          return (
            <div style={{ textAlign: style.textAlign || 'center' }}>
              <a
                href='#'
                style={{
                  ...style,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {el.content || 'Button'}
              </a>
            </div>
          );
        case 'divider':
          return <hr style={style as React.CSSProperties} />;
        case 'spacer':
          return <div style={style as React.CSSProperties}></div>;
        case 'columns':
          const gap = el.settings?.gap || 20;
          const colWidth =
            el.columns && el.columns.length > 0
              ? `calc(${100 / el.columns.length}% - ${(gap * (el.columns.length - 1)) / el.columns.length}px)`
              : '100%';
          return (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                ...style,
                gap: `${gap}px`,
              }}
            >
              {el.columns?.map((col, i) => (
                <div key={i} style={{ flex: 1, minWidth: 0, width: colWidth }}>
                  {renderElementPreview(col, i)}
                </div>
              ))}
            </div>
          );
        case 'video':
          const aspectRatio = el.settings?.aspectRatio || '16:9';
          const [w, h] = aspectRatio.split(':').map(Number);
          const padBottom = (h / w) * 100;
          return (
            <div
              style={{
                position: 'relative',
                paddingBottom: `${padBottom}%`,
                height: 0,
                overflow: 'hidden',
                ...style,
              }}
            >
              {el.src ? (
                <iframe
                  src={el.src}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 0,
                  }}
                  title='Video'
                />
              ) : (
                <div
                  className='video-placeholder'
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <i
                    className='ti ti-video'
                    style={{ fontSize: '32px', color: '#aaa' }}
                  ></i>
                </div>
              )}
            </div>
          );
        case 'social':
          return (
            <div style={{ textAlign: style.textAlign || 'center', ...style }}>
              {(el.settings?.platforms || []).map((p: any, i: number) =>
                p.url ? (
                  <a
                    key={i}
                    href='#'
                    style={{
                      display: 'inline-block',
                      margin: '0 8px',
                      color: '#506ee4',
                      textDecoration: 'none',
                      fontSize: '20px',
                    }}
                  >
                    {p.icon || '●'}
                  </a>
                ) : (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      margin: '0 8px',
                      color: '#ccc',
                      fontSize: '20px',
                    }}
                  >
                    ●
                  </span>
                ),
              )}
            </div>
          );
        case 'html':
          return (
            <div
              dangerouslySetInnerHTML={{ __html: el.content || '' }}
              style={style}
            />
          );
        case 'features':
          return renderFeaturesPreview(el);
        default:
          return <div>Unknown element</div>;
      }
    })();

    return (
      <Draggable key={el.id} draggableId={el.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`builder-element ${isSelected ? 'selected' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
            onClick={() => setSelectedElementId(el.id)}
            style={{
              ...provided.draggableProps.style,
              position: 'relative',
              padding: '4px',
              border: isSelected
                ? '2px solid #506ee4'
                : '2px solid transparent',
              borderRadius: '4px',
              cursor: 'move',
              background: isSelected ? '#f8faff' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <div className='element-toolbar'>
              <span className='element-type-badge'>{el.type}</span>
              <div className='element-actions'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveElement(el.id, 'up');
                  }}
                  title='Move up'
                >
                  <i className='ti ti-chevron-up'></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveElement(el.id, 'down');
                  }}
                  title='Move down'
                >
                  <i className='ti ti-chevron-down'></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateElement(el.id);
                  }}
                  title='Duplicate'
                >
                  <i className='ti ti-copy'></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteElement(el.id);
                  }}
                  title='Delete'
                >
                  <i className='ti ti-trash'></i>
                </button>
              </div>
            </div>
            <div className='element-content'>{content}</div>
          </div>
        )}
      </Draggable>
    );
  };

  const renderListPreview = (el: EmailElement) => {
    if (!el.items || el.items.length === 0) {
      return (
        <div className='text-center p-3 text-muted'>
          <i className='ti ti-list' style={{ fontSize: '24px' }}></i>
          <p className='mb-0'>
            No list items added. Add items in the settings panel.
          </p>
        </div>
      );
    }

    const layout = el.listLayout || {
      bulletType: 'circle',
      bulletColor: '#506ee4',
      bulletSize: 'medium',
      showBullets: true,
      iconSize: 'medium',
      gap: 8,
    };

    const bulletType = layout.bulletType;
    const bulletColor = layout.bulletColor || '#506ee4';
    const bulletSize = layout.bulletSize || 'medium';
    const showBullets = layout.showBullets !== false;
    const iconSize = layout.iconSize || 'medium';
    const gap = layout.gap || 8;

    const sizeMap: Record<string, string> = {
      small: '12px',
      medium: '16px',
      large: '20px',
    };

    const iconSizeMap: Record<string, string> = {
      small: '16px',
      medium: '24px',
      large: '32px',
    };

    const bulletSizeStr = sizeMap[bulletSize] || '16px';
    const iconSizeStr = iconSizeMap[iconSize] || '24px';

    const getBulletElement = (item: ListItem, index: number) => {
      if (!showBullets) return null;

      const color = bulletColor;

      switch (bulletType) {
        case 'circle':
          return (
            <span
              style={{
                display: 'inline-block',
                width: bulletSizeStr,
                height: bulletSizeStr,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                marginTop: '4px',
              }}
            />
          );
        case 'square':
          return (
            <span
              style={{
                display: 'inline-block',
                width: bulletSizeStr,
                height: bulletSizeStr,
                background: color,
                flexShrink: 0,
                marginTop: '4px',
              }}
            />
          );
        case 'disc':
          return (
            <span
              style={{
                display: 'inline-block',
                width: bulletSizeStr,
                height: bulletSizeStr,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                marginTop: '4px',
              }}
            />
          );
        case 'icon':
          return (
            <span style={{ fontSize: iconSizeStr, flexShrink: 0 }}>
              {item.icon || '•'}
            </span>
          );
        case 'image':
          return item.image ? (
            <img
              src={item.image}
              style={{
                width: iconSizeStr,
                height: iconSizeStr,
                objectFit: 'cover',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              style={{
                display: 'inline-block',
                width: iconSizeStr,
                height: iconSizeStr,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                marginTop: '4px',
              }}
            />
          );
        case 'number':
          return (
            <span
              style={{
                fontWeight: 'bold',
                color: color,
                flexShrink: 0,
                minWidth: bulletSizeStr,
                textAlign: 'center',
              }}
            >
              {index + 1}.
            </span>
          );
        case 'check':
          return (
            <span
              style={{
                color: color,
                fontSize: iconSizeStr,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
          );
        case 'star':
          return (
            <span
              style={{
                color: color,
                fontSize: iconSizeStr,
                flexShrink: 0,
              }}
            >
              ★
            </span>
          );
        case 'arrow':
          return (
            <span
              style={{
                color: color,
                fontSize: iconSizeStr,
                flexShrink: 0,
              }}
            >
              →
            </span>
          );
        default:
          return (
            <span
              style={{
                display: 'inline-block',
                width: bulletSizeStr,
                height: bulletSizeStr,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                marginTop: '4px',
              }}
            />
          );
      }
    };

    const style = el.style || {};
    const isOrdered = el.settings?.ordered || false;
    const listStyle: React.CSSProperties = {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      ...style,
    };

    return (
      <div style={{ padding: '4px' }}>
        {isOrdered || bulletType === 'number' ? (
          <ol style={listStyle}>
            {el.items.map((item: ListItem, index: number) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: `${gap}px`,
                  marginBottom: `${gap}px`,
                }}
              >
                {getBulletElement(item, index)}
                <span style={{ flex: 1, wordBreak: 'break-word' }}>
                  {item.content}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <ul style={listStyle}>
            {el.items.map((item: ListItem, index: number) => (
              <li
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: `${gap}px`,
                  marginBottom: `${gap}px`,
                }}
              >
                {getBulletElement(item, index)}
                <span style={{ flex: 1, wordBreak: 'break-word' }}>
                  {item.content}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderFeaturesPreview = (el: EmailElement) => {
    if (!el.features || el.features.length === 0) {
      return (
        <div className='text-center p-3 text-muted'>
          <i className='ti ti-grid-dots' style={{ fontSize: '24px' }}></i>
          <p className='mb-0'>
            No features added. Add features in the settings panel.
          </p>
        </div>
      );
    }

    const layout = el.featureLayout || {
      columns: 2,
      gap: 24,
      alignment: 'center',
      cardStyle: 'bordered',
      showDivider: false,
      imagePosition: 'top',
      imageSize: 'medium',
      showIcons: true,
    };
    const cols = layout.columns;
    const gap = layout.gap;
    const alignment = layout.alignment;
    const cardStyle = layout.cardStyle;
    const imagePosition = layout.imagePosition;
    const imageSize = layout.imageSize;
    const showIcons = layout.showIcons !== false;

    const cardStyles: Record<string, React.CSSProperties> = {
      flat: { border: 'none', padding: '12px' },
      bordered: {
        border: '1px solid #eaeaea',
        borderRadius: '8px',
        padding: '16px',
      },
      shadowed: {
        border: 'none',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      elevated: {
        border: 'none',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      },
    };

    const imageSizeStyles: Record<string, React.CSSProperties> = {
      small: { width: '40px', height: '40px' },
      medium: { width: '64px', height: '64px' },
      large: { width: '100px', height: '100px' },
    };

    const textAlignMap: Record<string, React.CSSProperties> = {
      left: { textAlign: 'left' },
      center: { textAlign: 'center' },
      right: { textAlign: 'right' },
    };

    const cardWidth = `calc(${100 / cols}% - ${(gap * (cols - 1)) / cols}px)`;

    const sectionTitle =
      el.settings?.showSectionTitle !== false ? (
        <div style={{ textAlign: alignment as any, marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#222',
              margin: '0 0 4px 0',
            }}
          >
            {el.settings?.title || 'Features'}
          </h2>
          {el.settings?.subtitle && (
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
              {el.settings.subtitle}
            </p>
          )}
        </div>
      ) : null;

    return (
      <div style={{ padding: '4px' }}>
        {sectionTitle}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            margin: `0 -${gap / 2}px`,
          }}
        >
          {el.features.map((feature: FeatureItem) => {
            const isLeftRight =
              imagePosition === 'left' || imagePosition === 'right';
            const flexDirection =
              imagePosition === 'left'
                ? 'row'
                : imagePosition === 'right'
                  ? 'row-reverse'
                  : 'column';

            return (
              <div
                key={feature.id}
                style={{
                  width: cardWidth,
                  marginBottom: `${gap}px`,
                  padding: `0 ${gap / 2}px`,
                  ...cardStyles[cardStyle],
                  ...textAlignMap[alignment],
                  display: 'flex',
                  flexDirection: flexDirection as any,
                  alignItems: isLeftRight ? 'center' : (alignment as any),
                  backgroundColor: feature.backgroundColor || 'transparent',
                  color: feature.textColor || 'inherit',
                }}
              >
                {feature.image ? (
                  <img
                    src={feature.image}
                    alt={feature.headline}
                    style={{
                      ...imageSizeStyles[imageSize],
                      objectFit: 'cover',
                      borderRadius: '8px',
                      flexShrink: 0,
                      ...(imagePosition === 'top'
                        ? { marginBottom: '12px' }
                        : isLeftRight
                          ? { marginRight: '16px' }
                          : {}),
                    }}
                  />
                ) : showIcons && feature.icon ? (
                  <div
                    style={{
                      fontSize:
                        imageSize === 'large'
                          ? '48px'
                          : imageSize === 'medium'
                            ? '36px'
                            : '24px',
                      lineHeight: 1,
                      ...(imagePosition === 'top'
                        ? { marginBottom: '8px' }
                        : isLeftRight
                          ? { marginRight: '12px' }
                          : {}),
                    }}
                  >
                    {feature.icon}
                  </div>
                ) : null}

                <div style={{ flex: isLeftRight ? 1 : 'none' }}>
                  {feature.badge && (
                    <span
                      style={{
                        display: 'inline-block',
                        background: '#506ee4',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 10px',
                        borderRadius: '20px',
                        marginBottom: '6px',
                      }}
                    >
                      {feature.badge}
                    </span>
                  )}
                  <h3
                    style={{
                      fontSize:
                        imageSize === 'large'
                          ? '20px'
                          : imageSize === 'medium'
                            ? '17px'
                            : '15px',
                      fontWeight: 700,
                      color: '#222',
                      margin: '0 0 2px 0',
                    }}
                  >
                    {feature.headline}
                  </h3>
                  {feature.subHeadline && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#888',
                        margin: '0 0 6px 0',
                      }}
                    >
                      {feature.subHeadline}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: '#555',
                      margin: 0,
                    }}
                  >
                    {feature.description}
                  </p>
                  {feature.ctaText && feature.ctaUrl && (
                    <a
                      href='#'
                      style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        color: '#506ee4',
                        fontWeight: 600,
                        textDecoration: 'none',
                        fontSize: '13px',
                      }}
                    >
                      {feature.ctaText} →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {layout.showDivider && (
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid #eaeaea',
              margin: '8px 0 0',
            }}
          />
        )}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className='d-flex justify-content-center align-items-center'
        style={{ minHeight: '400px' }}
      >
        <Spinner animation='border' variant='primary' />
        <span className='ms-3'>Loading template...</span>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='email-builder-container'>
        {/* Header */}
        <div className='builder-header'>
          <div className='d-flex align-items-center gap-3'>
            {onCancel && (
              <Button variant='outline-secondary' onClick={onCancel}>
                <i className='ti ti-arrow-left me-1'></i> Back
              </Button>
            )}
            <h4 className='mb-0'>
              {templateId ? 'Edit Template' : 'Create Template'}
            </h4>
            {templateId && onNewTemplate && (
              <Button
                variant='outline-primary'
                size='sm'
                onClick={onNewTemplate}
                title='Create a new template'
              >
                <i className='ti ti-plus me-1'></i> New Template
              </Button>
            )}
          </div>
          <div className='d-flex gap-2'>
            <Button
              variant='outline-secondary'
              onClick={() => setShowPreview(true)}
            >
              <i className='ti ti-eye me-1'></i> Preview
            </Button>
            <Button variant='primary' onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner size='sm' animation='border' className='me-1' />
                  Saving...
                </>
              ) : (
                <>
                  <i className='ti ti-device-floppy me-1'></i> Save Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant='success' onClose={() => setSuccess(null)} dismissible>
            {success}
          </Alert>
        )}

        {/* Main Layout */}
        <div className='builder-layout'>
          {/* Left Panel - Element Toolbox */}
          <div className='builder-toolbox'>
            <h6 className='toolbox-title'>Add Elements</h6>
            <div className='toolbox-grid'>
              {[
                { type: 'heading', label: 'Heading', icon: 'ti ti-heading' },
                { type: 'paragraph', label: 'Text', icon: 'ti ti-text-size' },
                { type: 'image', label: 'Image', icon: 'ti ti-photo' },
                { type: 'button', label: 'Button', icon: 'ti ti-click' },
                { type: 'divider', label: 'Divider', icon: 'ti ti-line' },
                {
                  type: 'spacer',
                  label: 'Spacer',
                  icon: 'ti ti-arrows-vertical',
                },
                {
                  type: 'columns',
                  label: 'Columns',
                  icon: 'ti ti-layout-grid',
                },
                { type: 'video', label: 'Video', icon: 'ti ti-video' },
                { type: 'social', label: 'Social Links', icon: 'ti ti-share' },
                { type: 'html', label: 'HTML', icon: 'ti ti-code' },
                {
                  type: 'features',
                  label: 'Features',
                  icon: 'ti ti-grid-dots',
                },
                {
                  type: 'list',
                  label: 'List',
                  icon: 'ti ti-list',
                },
              ].map((item) => (
                <button
                  key={item.type}
                  className='toolbox-item'
                  onClick={() => addElement(item.type as ElementType)}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <hr />
            <h6 className='toolbox-title'>Template Settings</h6>
            <Form.Group className='mb-2'>
              <Form.Label className='small'>Title *</Form.Label>
              <Form.Control
                type='text'
                value={state.title}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder='Template name'
              />
            </Form.Group>
            <Form.Group className='mb-2'>
              <Form.Label className='small'>Subject *</Form.Label>
              <Form.Control
                type='text'
                value={state.subject}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder='Email subject line'
              />
            </Form.Group>
            <Form.Group className='mb-2'>
              <Form.Label className='small'>Category</Form.Label>
              <Form.Select
                value={state.category}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, category: e.target.value }))
                }
              >
                <option value='system'>System</option>
                <option value='marketing'>Marketing</option>
                <option value='transactional'>Transactional</option>
                <option value='notification'>Notification</option>
                <option value='other'>Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className='mb-2'>
              <Form.Label className='small'>Tags</Form.Label>
              <div className='d-flex gap-1 flex-wrap mb-1'>
                {state.tags.map((tag) => (
                  <Badge
                    key={tag}
                    bg='secondary'
                    className='d-flex align-items-center gap-1'
                  >
                    {tag}
                    <i
                      className='ti ti-x cursor-pointer'
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          tags: prev.tags.filter((t) => t !== tag),
                        }))
                      }
                    />
                  </Badge>
                ))}
              </div>
              <div className='d-flex gap-1'>
                <Form.Control
                  type='text'
                  size='sm'
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      setState((prev) => ({
                        ...prev,
                        tags: [...prev.tags, tagInput.trim()],
                      }));
                      setTagInput('');
                    }
                  }}
                  placeholder='Add tag'
                />
                <Button
                  size='sm'
                  variant='outline-secondary'
                  onClick={() => {
                    if (tagInput.trim()) {
                      setState((prev) => ({
                        ...prev,
                        tags: [...prev.tags, tagInput.trim()],
                      }));
                      setTagInput('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </Form.Group>
            <Form.Check
              type='switch'
              label='Active'
              checked={state.status}
              onChange={(e) =>
                setState((prev) => ({ ...prev, status: e.target.checked }))
              }
            />
            <Form.Check
              type='switch'
              label='Include Signature'
              checked={state.includeSignature}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  includeSignature: e.target.checked,
                }))
              }
            />
            {state.includeSignature && (
              <div className='signature-fields mt-2 p-2 border rounded'>
                <Form.Group className='mb-1'>
                  <Form.Label className='small'>Organization</Form.Label>
                  <Form.Control
                    type='text'
                    size='sm'
                    value={state.signatureConfig.organizationName}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        signatureConfig: {
                          ...prev.signatureConfig,
                          organizationName: e.target.value,
                        },
                      }))
                    }
                  />
                </Form.Group>
                <Form.Group className='mb-1'>
                  <Form.Label className='small'>Full Name</Form.Label>
                  <Form.Control
                    type='text'
                    size='sm'
                    value={state.signatureConfig.fullName}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        signatureConfig: {
                          ...prev.signatureConfig,
                          fullName: e.target.value,
                        },
                      }))
                    }
                  />
                </Form.Group>
                <Form.Group className='mb-1'>
                  <Form.Label className='small'>Title</Form.Label>
                  <Form.Control
                    type='text'
                    size='sm'
                    value={state.signatureConfig.title}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        signatureConfig: {
                          ...prev.signatureConfig,
                          title: e.target.value,
                        },
                      }))
                    }
                  />
                </Form.Group>
              </div>
            )}
          </div>

          {/* Center - Canvas */}
          <div className='builder-canvas'>
            <div className='canvas-header'>
              <span className='small text-muted'>
                Drag elements to reorder • Click to edit
              </span>
              <div className='d-flex gap-1'>
                <Button
                  size='sm'
                  variant={isMobilePreview ? 'primary' : 'outline-secondary'}
                  onClick={() => setIsMobilePreview(!isMobilePreview)}
                >
                  <i
                    className={`ti ti-${isMobilePreview ? 'device-desktop' : 'device-mobile'}`}
                  ></i>
                </Button>
              </div>
            </div>
            <div
              className={`canvas-body ${isMobilePreview ? 'mobile' : 'desktop'}`}
              style={{
                maxWidth: isMobilePreview ? '375px' : '100%',
                margin: '0 auto',
              }}
            >
              {state.elements.length === 0 ? (
                <div className='empty-canvas'>
                  <i
                    className='ti ti-box'
                    style={{ fontSize: '48px', color: '#ccc' }}
                  ></i>
                  <p className='text-muted'>
                    No elements yet. Click an element above to add it.
                  </p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId='canvas'>
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {state.elements.map((el, index) =>
                          renderElementPreview(el, index),
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </div>

          {/* Right Panel - Settings */}
          <div className='builder-settings'>{renderSettingsPanel()}</div>
        </div>

        {/* Preview Modal */}
        <Modal
          show={showPreview}
          size='lg'
          onHide={() => setShowPreview(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Email Preview</Modal.Title>
            <div className='d-flex gap-2'>
              <Button
                size='sm'
                variant='outline-secondary'
                onClick={() => {
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(previewHtml);
                    win.document.close();
                  }
                }}
              >
                <i className='ti ti-external-link me-1'></i> Open Full
              </Button>
              <Button
                size='sm'
                variant='outline-secondary'
                onClick={() => {
                  navigator.clipboard.writeText(previewHtml);
                  setSuccess('HTML copied to clipboard!');
                  setTimeout(() => setSuccess(null), 2000);
                }}
              >
                <i className='ti ti-copy me-1'></i> Copy HTML
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body>
            <div
              className='preview-container'
              style={{
                background: '#f6f6f6',
                padding: '20px',
                borderRadius: '8px',
              }}
            >
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <iframe
                  srcDoc={previewHtml}
                  title='Email Preview'
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#fff',
                  }}
                />
              </div>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default EmailTemplateBuilder;
