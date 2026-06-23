// components/EmailTemplateBuilder.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  emailTemplateService,
  buildCompleteHTML,
} from '../services/emailTemplateService';
import { generateEmailHTML, BuilderConfig } from '../utils/generateEmailHTML';
import type { EmailTemplate } from '../types/types';
import { ImagePicker } from './ImagePicker';
import { BackgroundPicker } from './BackgroundPicker';

// ── Types ─────────────────────────────────────────────────────────────────────

type LayoutStyle = BuilderConfig['layout'];
type ImagePos = BuilderConfig['imagePosition'];

interface TemplateMeta {
  title: string;
  subject: string;
  content: string;
  category: 'system' | 'marketing' | 'transactional' | 'notification' | 'other';
  status: boolean;
  tags: string[];
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
  variables: Array<{
    name: string;
    description: string;
    defaultValue?: string;
  }>;
  predefinedVariables: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LOGO_URL =
  'https://pub-eab2790b2e94418f896b048a8e6658d0.r2.dev/logo/logo.png';

const LAYOUTS: {
  id: LayoutStyle;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, text-first', icon: '📝' },
  {
    id: 'hero-banner',
    label: 'Hero Banner',
    desc: 'Bold image header',
    icon: '🖼️',
  },
  {
    id: 'card-centered',
    label: 'Card Center',
    desc: 'Floating card design',
    icon: '📇',
  },
  {
    id: 'sidebar-accent',
    label: 'Sidebar Accent',
    desc: 'Colorful sidebar',
    icon: '📑',
  },
  {
    id: 'full-bg',
    label: 'Full Background',
    desc: 'Immersive background',
    icon: '🌅',
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    desc: 'Classic newsletter',
    icon: '📰',
  },
  {
    id: 'split-column',
    label: 'Split Column',
    desc: '50/50 image & text',
    icon: '📐',
  },
  {
    id: 'feature-grid',
    label: 'Feature Grid',
    desc: 'Grid layout for features',
    icon: '📊',
  },
  {
    id: 'modern-dark',
    label: 'Modern Dark',
    desc: 'Dark theme design',
    icon: '🌙',
  },
];

const COLOR_PRESETS = [
  {
    name: 'Ocean Blue',
    primaryColor: '#506ee4',
    backgroundColor: '#f0f4ff',
    headerBg: '#1e3a8a',
    ctaColor: '#506ee4',
    textColor: '#1a2332',
  },
  {
    name: 'Forest Green',
    primaryColor: '#2d7d46',
    backgroundColor: '#f0f7f0',
    headerBg: '#1a4a2a',
    ctaColor: '#2d7d46',
    textColor: '#1a2a1a',
  },
  {
    name: 'Sunset Orange',
    primaryColor: '#e8751a',
    backgroundColor: '#fff5f0',
    headerBg: '#7a3a10',
    ctaColor: '#e8751a',
    textColor: '#3a1a0a',
  },
  {
    name: 'Royal Purple',
    primaryColor: '#6c3a9a',
    backgroundColor: '#f5f0ff',
    headerBg: '#3a1a5a',
    ctaColor: '#6c3a9a',
    textColor: '#2a1a3a',
  },
  {
    name: 'Rose Pink',
    primaryColor: '#d94a7a',
    backgroundColor: '#fff0f5',
    headerBg: '#7a1a3a',
    ctaColor: '#d94a7a',
    textColor: '#3a1a2a',
  },
  {
    name: 'Modern Dark',
    primaryColor: '#6c7a8a',
    backgroundColor: '#1a1a1a',
    headerBg: '#0a0a0a',
    ctaColor: '#8a9aaa',
    textColor: '#eaeaea',
  },
  {
    name: 'Clean White',
    primaryColor: '#506ee4',
    backgroundColor: '#ffffff',
    headerBg: '#f8f9fa',
    ctaColor: '#506ee4',
    textColor: '#1a2332',
  },
];

const FONT_OPTIONS = [
  { label: 'System Default', value: 'system' },
  { label: 'Georgia (Serif)', value: 'georgia' },
  { label: 'Verdana', value: 'verdana' },
  { label: 'Tahoma', value: 'tahoma' },
  { label: 'Trebuchet MS', value: 'trebuchet' },
  { label: 'Courier New', value: 'courier' },
  { label: 'Inter', value: 'inter' },
  { label: 'Roboto', value: 'roboto' },
  { label: 'Open Sans', value: 'open-sans' },
  { label: 'Lato', value: 'lato' },
];

const DEFAULT_CFG: BuilderConfig = {
  layout: 'minimal',
  primaryColor: '#506ee4',
  backgroundColor: '#f0f4ff',
  headerBg: '#1e3a8a',
  ctaColor: '#506ee4',
  fontFamily: 'system',
  headerTitle: '',
  headerSubtitle: '',
  showLogo: true,
  logoUrl: LOGO_URL,
  headerImage: '',
  inlineImage: '',
  backgroundImage: '',
  overlayOpacity: 0.55,
  imagePosition: 'center',
  imageCaption: '',
  ctaText: '',
  ctaUrl: 'https://bothellselect.com/dashboard',
  footerText:
    "You're receiving this because you're part of <strong>Bothell Select</strong>.",
  textColor: '#374151',
};

const DEFAULT_META: TemplateMeta = {
  title: '',
  subject: '',
  content: '<p>Dear [parent.fullName],</p>\n<p>Your message goes here.</p>',
  category: 'transactional',
  status: true,
  tags: [],
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
  variables: [],
  predefinedVariables: [
    'parent.fullName',
    'parent.email',
    'parent.phone',
    'player.fullName',
    'player.grade',
    'player.schoolName',
  ],
};

const TABS = [
  'Layout',
  'Design',
  'Images',
  'Background',
  'Content',
  'CTA & Footer',
  'Attachments',
] as const;
type Tab = (typeof TABS)[number];

// ── UI Helpers ──────────────────────────────────────────────────────────────

const s = {
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    display: 'block',
    marginBottom: 5,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 7,
    border: '1px solid #e2e8f0',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fff',
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 7,
    border: '1px solid #e2e8f0',
    fontSize: 13,
    background: '#fff',
    outline: 'none',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 7,
    border: '1px solid #e2e8f0',
    fontSize: 12,
    lineHeight: '1.5',
    resize: 'vertical',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
    outline: 'none',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: '1px solid #f0f0f0',
    margin: '4px 0',
  } as React.CSSProperties,
};

function Label({ children }: { children: React.ReactNode }) {
  return <label style={s.label}>{children}</label>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
      }}
    >
      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
        {label}
      </span>
      <button
        type='button'
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: checked ? '#506ee4' : '#e2e8f0',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background .2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            transition: 'left .2s',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          }}
        />
      </button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type='color'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 34,
            height: 34,
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            padding: 2,
            flexShrink: 0,
          }}
        />
        <input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '7px 10px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            fontSize: 12,
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
      </div>
    </Field>
  );
}

// ── Layout Card Component ────────────────────────────────────────────────────

const LayoutCard: React.FC<{
  id: LayoutStyle;
  label: string;
  desc: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}> = ({ id, label, desc, icon, selected, onClick }) => {
  return (
    <div
      className={`p-3 border rounded ${selected ? 'border-primary' : ''}`}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: selected ? '#eef2ff' : '#fff',
        borderColor: selected ? '#506ee4' : '#e2e8f0',
        boxShadow: selected ? '0 0 0 2px #506ee4' : 'none',
        textAlign: 'center',
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: '2rem', lineHeight: 1.2 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{desc}</div>
      {selected && (
        <div style={{ marginTop: 4 }}>
          <i className='ti ti-check-circle' style={{ color: '#506ee4' }}></i>
        </div>
      )}
    </div>
  );
};

// ── Color Preset Picker ──────────────────────────────────────────────────────

const ColorPresetPicker: React.FC<{
  onSelect: (preset: any) => void;
  selected: string;
}> = ({ onSelect, selected }) => {
  return (
    <div className='d-flex flex-wrap gap-2'>
      {COLOR_PRESETS.map((preset) => (
        <button
          key={preset.name}
          className={`border rounded p-2 ${selected === preset.name ? 'border-primary border-2' : ''}`}
          style={{
            background: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '60px',
          }}
          onClick={() => onSelect(preset)}
        >
          <div className='d-flex gap-1 justify-content-center'>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: preset.primaryColor,
              }}
            />
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: preset.backgroundColor,
                border: '1px solid #ddd',
              }}
            />
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: preset.headerBg,
              }}
            />
          </div>
          <div className='small text-center mt-1' style={{ fontSize: 9 }}>
            {preset.name}
          </div>
        </button>
      ))}
    </div>
  );
};

// ── Attachments Panel ─────────────────────────────────────────────────────────

function AttachmentsPanel({
  templateId,
  attachments,
  onUpdated,
}: {
  templateId: string | null;
  attachments: any[];
  onUpdated: (a: any[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templateId) return;
    setUploading(true);
    setErr('');
    try {
      const result = await emailTemplateService.uploadAttachment(
        templateId,
        file,
      );
      onUpdated([...attachments, result.attachment]);
    } catch {
      setErr('Upload failed. Save the template first.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!templateId || !window.confirm(`Remove "${filename}"?`)) return;
    try {
      await emailTemplateService.deleteAttachment(templateId, id);
      onUpdated(attachments.filter((a: any) => a._id !== id));
    } catch {
      setErr('Delete failed.');
    }
  };

  return (
    <div style={s.row}>
      {err && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fef2f2',
            borderRadius: 7,
            fontSize: 12,
            color: '#dc2626',
            border: '1px solid #fecaca',
          }}
        >
          {err}
        </div>
      )}
      {!templateId && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fef9c3',
            borderRadius: 7,
            fontSize: 12,
            color: '#854d0e',
          }}
        >
          Save the template first to enable file attachments.
        </div>
      )}
      <input
        ref={fileRef}
        type='file'
        onChange={handleUpload}
        disabled={!templateId || uploading}
        style={{ display: 'none' }}
      />
      <button
        type='button'
        onClick={() => fileRef.current?.click()}
        disabled={!templateId || uploading}
        style={{
          padding: '9px 16px',
          borderRadius: 7,
          border: '1px dashed #cbd5e1',
          background: '#f8fafc',
          color: '#475569',
          fontSize: 12,
          cursor: templateId ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {uploading ? 'Uploading…' : '⬆ Upload file'}
      </button>

      {attachments.map((a: any, i) => (
        <div
          key={a._id || i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            background: '#f8fafc',
            borderRadius: 7,
            border: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: 18 }}>
            {a.mimeType?.startsWith('image/')
              ? '🖼️'
              : a.mimeType === 'application/pdf'
                ? '📄'
                : a.mimeType?.includes('word')
                  ? '📝'
                  : '📎'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {a.filename}
            </div>
            {a.size && (
              <div style={{ fontSize: 10, color: '#94a3b8' }}>
                {(a.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>
          {a._id && (
            <button
              type='button'
              onClick={() => handleDelete(a._id, a.filename)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#dc2626',
                fontSize: 16,
                padding: 4,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {attachments.length === 0 && (
        <p
          style={{
            fontSize: 12,
            color: '#94a3b8',
            textAlign: 'center',
            margin: 0,
          }}
        >
          No attachments yet
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  templateId?: string | null;
  onSave?: (template: EmailTemplate) => void;
  onCancel?: () => void;
}

export default function EmailTemplateBuilder({
  templateId = null,
  onSave,
  onCancel,
}: Props) {
  const [meta, setMeta] = useState<TemplateMeta>(DEFAULT_META);
  const [cfg, setCfg] = useState<BuilderConfig>(DEFAULT_CFG);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [savedId, setSavedId] = useState<string | null>(templateId);

  const [activeTab, setActiveTab] = useState<Tab>('Layout');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!templateId);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<{ _id: string } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('');

  const setM = (k: keyof TemplateMeta, v: any) =>
    setMeta((p) => ({ ...p, [k]: v }));
  const setC = useCallback(
    <K extends keyof BuilderConfig>(k: K, v: BuilderConfig[K]) =>
      setCfg((p) => ({ ...p, [k]: v })),
    [],
  );
  const setSig = (k: string, v: string) =>
    setMeta((p) => ({
      ...p,
      signatureConfig: { ...p.signatureConfig, [k]: v },
    }));

  // ── Get current user ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }, []);

  // ── Load existing ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!templateId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const t = (await emailTemplateService.getById(templateId)) as any;
        setMeta({
          title: t.title || '',
          subject: t.subject || '',
          content: t.content || DEFAULT_META.content,
          category: t.category || 'transactional',
          status: t.status !== undefined ? t.status : true,
          tags: t.tags || [],
          includeSignature: t.includeSignature || false,
          signatureConfig: t.signatureConfig || DEFAULT_META.signatureConfig,
          variables: t.variables || [],
          predefinedVariables:
            t.predefinedVariables || DEFAULT_META.predefinedVariables,
        });
        if (t.builderConfig) setCfg(t.builderConfig);
        setAttachments(t.attachments || []);
        setSavedId(t._id);
      } catch (err) {
        console.error('Load error:', err);
        setError('Failed to load template.');
      } finally {
        setLoading(false);
      }
    })();
  }, [templateId]);

  // ── Live preview ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const mockTemplate = {
          _id: savedId || 'preview',
          title: meta.title,
          subject: meta.subject,
          content: meta.content,
          category: meta.category,
          status: meta.status,
          tags: meta.tags,
          includeSignature: meta.includeSignature,
          signatureConfig: meta.signatureConfig,
          attachments: attachments,
          builderConfig: cfg,
          variables: meta.variables || [],
          predefinedVariables: meta.predefinedVariables || [],
        };

        const html = buildCompleteHTML(mockTemplate);
        setPreviewHtml(html);
      } catch (e) {
        console.error('Preview error', e);
        setPreviewHtml(
          `<p style="color:red;padding:20px;">Preview error: ${e}</p>`,
        );
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [cfg, meta, attachments, savedId]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('');
    if (!meta.title.trim()) {
      setError('Template title is required.');
      return;
    }
    if (!meta.subject.trim()) {
      setError('Email subject is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: meta.title.trim(),
        subject: meta.subject.trim(),
        content: meta.content,
        category: meta.category,
        status: meta.status,
        tags: meta.tags || [],
        includeSignature: meta.includeSignature,
        signatureConfig: meta.signatureConfig,
        builderConfig: cfg,
        variables: meta.variables || [],
        predefinedVariables:
          meta.predefinedVariables || DEFAULT_META.predefinedVariables,
      };

      if (user?._id) {
        if (!savedId) {
          payload.createdBy = user._id;
        }
        payload.lastUpdatedBy = user._id;
      }

      if (savedId) {
        payload.attachments = attachments;
      }

      const saved = savedId
        ? await emailTemplateService.update(savedId, payload)
        : await emailTemplateService.create(payload);

      setSavedId((saved as any)._id);
      setToast('Template saved!');
      setTimeout(() => setToast(''), 3000);
      onSave?.(saved);
    } catch (e: any) {
      console.error('Save error:', e);
      setError(e?.response?.data?.error || e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previewHtml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !meta.tags.includes(t)) setM('tags', [...meta.tags, t]);
    setTagInput('');
  };

  const applyColorPreset = (preset: any) => {
    setCfg((prev) => ({
      ...prev,
      primaryColor: preset.primaryColor,
      backgroundColor: preset.backgroundColor,
      headerBg: preset.headerBg,
      ctaColor: preset.ctaColor,
      textColor: preset.textColor || '#374151',
    }));
    setSelectedPreset(preset.name);
  };

  const TEMPLATE_VARS = [
    '[parent.fullName]',
    '[parent.email]',
    '[parent.phone]',
    '[player.fullName]',
    '[player.firstName]',
    '[player.grade]',
    '[player.schoolName]',
    '[team.name]',
    '[team.grade]',
    '[tournament.name]',
    '[tournament.year]',
    '[tournament.fee]',
  ];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 400,
        }}
      >
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          Loading template…
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 80px)',
            minHeight: 600,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            background: '#f8fafc',
          }}
        >
          {/* ── Top bar ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {onCancel && (
              <button
                type='button'
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 8px',
                  borderRadius: 6,
                }}
              >
                ← Back
              </button>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
              {savedId ? 'Edit Template' : 'New Template'}
              {meta.title && (
                <span
                  style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}
                >
                  — {meta.title}
                </span>
              )}
            </span>

            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {toast && (
                <span style={{ fontSize: 12, color: '#16a34a' }}>
                  ✓ {toast}
                </span>
              )}
              {error && (
                <span style={{ fontSize: 12, color: '#dc2626', maxWidth: 260 }}>
                  {error}
                </span>
              )}

              <button
                type='button'
                onClick={handleCopy}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: '1px solid #e2e8f0',
                  background: copied ? '#16a34a' : '#f8fafc',
                  color: copied ? '#fff' : '#374151',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {copied ? '✓ Copied!' : '⎘ Copy HTML'}
              </button>

              <button
                type='button'
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '7px 18px',
                  borderRadius: 7,
                  border: 'none',
                  background: saving ? '#94a3b8' : '#506ee4',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {saving ? 'Saving…' : '💾 Save Template'}
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* ── Sidebar ── */}
            <div
              style={{
                width: 340,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRight: '1px solid #e2e8f0',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              {/* Tab pills */}
              <div
                style={{
                  padding: '10px 10px 0',
                  borderBottom: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    paddingBottom: 10,
                  }}
                >
                  {TABS.map((t) => (
                    <button
                      key={t}
                      type='button'
                      onClick={() => setActiveTab(t)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: 6,
                        border: '1px solid transparent',
                        background: activeTab === t ? '#506ee4' : '#f1f5f9',
                        color: activeTab === t ? '#fff' : '#475569',
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel scroll area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {/* ── LAYOUT ─────────────────────────────────────────────────────── */}
                {activeTab === 'Layout' && (
                  <div style={s.row}>
                    <div>
                      <Label>Choose a layout style</Label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 8,
                        }}
                      >
                        {LAYOUTS.map((l) => (
                          <LayoutCard
                            key={l.id}
                            id={l.id}
                            label={l.label}
                            desc={l.desc}
                            icon={l.icon}
                            selected={cfg.layout === l.id}
                            onClick={() => setC('layout', l.id)}
                          />
                        ))}
                      </div>
                    </div>

                    <hr style={s.divider} />

                    <Field label='Template title *'>
                      <input
                        style={s.input}
                        value={meta.title}
                        onChange={(e) => setM('title', e.target.value)}
                        placeholder='e.g. Welcome Email'
                      />
                    </Field>

                    <Field label='Email subject *'>
                      <input
                        style={s.input}
                        value={meta.subject}
                        onChange={(e) => setM('subject', e.target.value)}
                        placeholder='Subject line…'
                      />
                    </Field>

                    <Field label='Category'>
                      <select
                        style={s.select}
                        value={meta.category}
                        onChange={(e) =>
                          setM('category', e.target.value as any)
                        }
                      >
                        {[
                          'system',
                          'marketing',
                          'transactional',
                          'notification',
                          'other',
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Toggle
                      label='Active (visible in campaigns)'
                      checked={meta.status}
                      onChange={(v) => setM('status', v)}
                    />

                    <div>
                      <Label>Tags</Label>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          marginBottom: 6,
                        }}
                      >
                        {meta.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 20,
                              background: '#eef2ff',
                              color: '#506ee4',
                              fontSize: 11,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {tag}
                            <button
                              type='button'
                              onClick={() =>
                                setM(
                                  'tags',
                                  meta.tags.filter((t) => t !== tag),
                                )
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#506ee4',
                                padding: 0,
                                lineHeight: 1,
                                fontSize: 13,
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          style={{ ...s.input, marginBottom: 0 }}
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder='Add tag + Enter'
                        />
                        <button
                          type='button'
                          onClick={addTag}
                          style={{
                            padding: '7px 12px',
                            borderRadius: 7,
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            fontSize: 12,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── DESIGN ─────────────────────────────────────────────────────── */}
                {activeTab === 'Design' && (
                  <div style={s.row}>
                    <div>
                      <Label>Color presets</Label>
                      <ColorPresetPicker
                        onSelect={applyColorPreset}
                        selected={selectedPreset}
                      />
                    </div>

                    <ColorField
                      label='Primary / accent color'
                      value={cfg.primaryColor}
                      onChange={(v) => setC('primaryColor', v)}
                    />
                    <ColorField
                      label='Page background'
                      value={cfg.backgroundColor}
                      onChange={(v) => setC('backgroundColor', v)}
                    />
                    <ColorField
                      label='Header background'
                      value={cfg.headerBg}
                      onChange={(v) => setC('headerBg', v)}
                    />
                    <ColorField
                      label='CTA button color'
                      value={cfg.ctaColor}
                      onChange={(v) => setC('ctaColor', v)}
                    />
                    <ColorField
                      label='Text color'
                      value={cfg.textColor || '#374151'}
                      onChange={(v) => setC('textColor', v)}
                    />

                    <Field label='Font family'>
                      <select
                        style={s.select}
                        value={cfg.fontFamily}
                        onChange={(e) => setC('fontFamily', e.target.value)}
                      >
                        {FONT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <hr style={s.divider} />

                    <Field label='Header title'>
                      <input
                        style={s.input}
                        value={cfg.headerTitle}
                        onChange={(e) => setC('headerTitle', e.target.value)}
                        placeholder='Main headline…'
                      />
                    </Field>

                    <Field label='Header subtitle'>
                      <input
                        style={s.input}
                        value={cfg.headerSubtitle}
                        onChange={(e) => setC('headerSubtitle', e.target.value)}
                        placeholder='Supporting text…'
                      />
                    </Field>

                    <Toggle
                      label='Show logo'
                      checked={cfg.showLogo}
                      onChange={(v) => setC('showLogo', v)}
                    />
                    {cfg.showLogo && (
                      <Field label='Logo URL'>
                        <input
                          style={s.input}
                          value={cfg.logoUrl}
                          onChange={(e) => setC('logoUrl', e.target.value)}
                          placeholder='https://…'
                        />
                      </Field>
                    )}
                  </div>
                )}

                {/* ── IMAGES ─────────────────────────────────────────────────────── */}
                {activeTab === 'Images' && (
                  <div style={s.row}>
                    {[
                      'hero-banner',
                      'newsletter',
                      'split-column',
                      'feature-grid',
                      'modern-dark',
                    ].includes(cfg.layout) && (
                      <>
                        <ImagePicker
                          label='Hero / Banner Image'
                          value={cfg.headerImage}
                          onChange={(v: string) => setC('headerImage', v)}
                          onRemove={() => setC('headerImage', '')}
                          aspectRatio='16:9'
                          recommendedSize='1200x675px'
                        />
                        <hr style={s.divider} />
                      </>
                    )}

                    <ImagePicker
                      label='Inline Body Image'
                      value={cfg.inlineImage}
                      onChange={(v: string) => setC('inlineImage', v)}
                      onRemove={() => setC('inlineImage', '')}
                      aspectRatio='free'
                      recommendedSize='600x400px'
                    />

                    {cfg.inlineImage && (
                      <>
                        <Field label='Image alignment'>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(
                              ['left', 'center', 'right', 'full'] as ImagePos[]
                            ).map((pos) => (
                              <button
                                key={pos}
                                type='button'
                                onClick={() => setC('imagePosition', pos)}
                                style={{
                                  flex: 1,
                                  padding: '6px',
                                  borderRadius: 6,
                                  border:
                                    cfg.imagePosition === pos
                                      ? '2px solid #506ee4'
                                      : '1px solid #e2e8f0',
                                  background:
                                    cfg.imagePosition === pos
                                      ? '#eef2ff'
                                      : '#fff',
                                  color:
                                    cfg.imagePosition === pos
                                      ? '#506ee4'
                                      : '#64748b',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </button>
                            ))}
                          </div>
                        </Field>
                        <Field label='Image caption'>
                          <input
                            style={s.input}
                            value={cfg.imageCaption}
                            onChange={(e) =>
                              setC('imageCaption', e.target.value)
                            }
                            placeholder='Optional caption…'
                          />
                        </Field>
                      </>
                    )}
                  </div>
                )}

                {/* ── BACKGROUND ────────────────────────────────────────────────── */}
                {activeTab === 'Background' && (
                  <div style={s.row}>
                    <div className='p-3 bg-light rounded mb-3'>
                      <h6 className='mb-2'>Background Settings</h6>
                      <p className='small text-muted'>
                        Add a full-width background image to make your email
                        stand out. Works best with the "Full Background" layout.
                      </p>
                    </div>

                    <Field label='Background Image URL'>
                      <input
                        style={s.input}
                        value={cfg.backgroundImage}
                        onChange={(e) =>
                          setC('backgroundImage', e.target.value)
                        }
                        placeholder='https://example.com/background.jpg'
                      />
                    </Field>

                    {cfg.backgroundImage && (
                      <>
                        <div className='border rounded overflow-hidden'>
                          <img
                            src={cfg.backgroundImage}
                            alt='Background preview'
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://via.placeholder.com/400x120?text=Invalid+Image';
                            }}
                          />
                        </div>

                        <Field
                          label={`Overlay darkness: ${Math.round(cfg.overlayOpacity * 100)}%`}
                        >
                          <input
                            type='range'
                            min='0'
                            max='85'
                            step='5'
                            value={Math.round(cfg.overlayOpacity * 100)}
                            onChange={(e) =>
                              setC(
                                'overlayOpacity',
                                parseInt(e.target.value) / 100,
                              )
                            }
                            style={{ width: '100%' }}
                          />
                        </Field>

                        <div className='p-3 bg-info bg-opacity-10 rounded'>
                          <h6 className='mb-1'>💡 Tips</h6>
                          <ul className='small mb-0'>
                            <li>Use high-resolution images (1920x1080+)</li>
                            <li>Adjust overlay for text readability</li>
                            <li>Dark overlays work best with light text</li>
                            <li>Test with different email clients</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── CONTENT ────────────────────────────────────────────────────── */}
                {activeTab === 'Content' && (
                  <div style={s.row}>
                    <Field label='Email body (HTML)'>
                      <textarea
                        style={{ ...s.textarea, minHeight: 220 }}
                        value={meta.content}
                        onChange={(e) => setM('content', e.target.value)}
                      />
                    </Field>

                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#f0f4ff',
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#3b4eb8',
                          marginBottom: 6,
                        }}
                      >
                        Click to insert variable
                      </div>
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
                      >
                        {TEMPLATE_VARS.map((v) => (
                          <button
                            key={v}
                            type='button'
                            onClick={() => setM('content', meta.content + v)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: '1px solid #c7d2fe',
                              background: '#fff',
                              color: '#506ee4',
                              fontSize: 10,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Toggle
                      label='Include signature'
                      checked={meta.includeSignature}
                      onChange={(v) => setM('includeSignature', v)}
                    />

                    {meta.includeSignature && (
                      <div
                        style={{
                          padding: 12,
                          background: '#f8fafc',
                          borderRadius: 8,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {(
                          [
                            { key: 'organizationName', label: 'Organization' },
                            { key: 'fullName', label: 'Full name' },
                            { key: 'title', label: 'Title / role' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'email', label: 'Email' },
                            { key: 'website', label: 'Website' },
                            { key: 'additionalInfo', label: 'Additional info' },
                          ] as {
                            key: keyof typeof meta.signatureConfig;
                            label: string;
                          }[]
                        ).map(({ key, label }) => (
                          <Field key={key} label={label}>
                            <input
                              style={s.input}
                              value={meta.signatureConfig[key] || ''}
                              onChange={(e) => setSig(key, e.target.value)}
                            />
                          </Field>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CTA & FOOTER ───────────────────────────────────────────────── */}
                {activeTab === 'CTA & Footer' && (
                  <div style={s.row}>
                    <Field label='Button text'>
                      <input
                        style={s.input}
                        value={cfg.ctaText}
                        onChange={(e) => setC('ctaText', e.target.value)}
                        placeholder='e.g. Go to Dashboard'
                      />
                    </Field>
                    <Field label='Button URL'>
                      <input
                        style={s.input}
                        value={cfg.ctaUrl}
                        onChange={(e) => setC('ctaUrl', e.target.value)}
                        placeholder='https://…'
                      />
                    </Field>
                    <ColorField
                      label='Button color'
                      value={cfg.ctaColor}
                      onChange={(v) => setC('ctaColor', v)}
                    />

                    {cfg.ctaText && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: 14,
                          background: '#f8fafc',
                          borderRadius: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-block',
                            padding: '10px 24px',
                            background: cfg.ctaColor,
                            color: '#fff',
                            borderRadius: 7,
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {cfg.ctaText}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            marginTop: 6,
                          }}
                        >
                          Button preview
                        </div>
                      </div>
                    )}

                    <Field label='Footer text (HTML ok)'>
                      <textarea
                        style={{ ...s.textarea, minHeight: 70 }}
                        value={cfg.footerText}
                        onChange={(e) => setC('footerText', e.target.value)}
                      />
                    </Field>
                  </div>
                )}

                {/* ── ATTACHMENTS ────────────────────────────────────────────────── */}
                {activeTab === 'Attachments' && (
                  <div style={s.row}>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      Attached files appear both in the email body and as real
                      email attachments when sent via Resend.
                    </p>
                    <AttachmentsPanel
                      templateId={savedId}
                      attachments={attachments}
                      onUpdated={setAttachments}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Preview pane ── */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  background: '#fff',
                  borderBottom: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}
                >
                  Live Preview
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {[
                    { label: '🖥 Desktop', val: false },
                    { label: '📱 Mobile', val: true },
                  ].map((b) => (
                    <button
                      key={String(b.val)}
                      type='button'
                      onClick={() => setMobilePreview(b.val)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        background:
                          mobilePreview === b.val ? '#506ee4' : '#fff',
                        color: mobilePreview === b.val ? '#fff' : '#64748b',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 24,
                  background: '#e2e8f0',
                }}
              >
                <div
                  style={{
                    width: mobilePreview ? 375 : '100%',
                    maxWidth: mobilePreview ? 375 : 860,
                    transition: 'all .25s',
                    boxShadow: '0 4px 24px rgba(0,0,0,.14)',
                    borderRadius: mobilePreview ? 20 : 8,
                    overflow: 'hidden',
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {mobilePreview && (
                    <div
                      style={{
                        height: 24,
                        background: '#1a1a1a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 60,
                          height: 4,
                          borderRadius: 2,
                          background: '#444',
                        }}
                      />
                    </div>
                  )}
                  <iframe
                    srcDoc={previewHtml}
                    title='Email preview'
                    style={{
                      flex: 1,
                      width: '100%',
                      minHeight: mobilePreview ? 680 : 700,
                      border: 'none',
                      display: 'block',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
