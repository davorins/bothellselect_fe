// services/emailTemplateService.ts

import axios from 'axios';
import type { EmailTemplate } from '../types/types';
import { generateEmailHTML, BuilderConfig } from '../utils/generateEmailHTML';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE_URL}/email-templates`;

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
});

// ── Helper: Generate signature HTML ──────────────────────────────────────────

export function generateSignatureHTML(
  sig: EmailTemplate['signatureConfig'],
): string {
  if (!sig) return '';
  const {
    organizationName = 'Bothell Select',
    fullName = '',
    title = '',
    phone = '',
    email = '',
    website = '',
    additionalInfo = '',
  } = sig;
  return `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eaeaea;">
  <strong style="font-size:15px;display:block;color:#222;margin-bottom:6px;">${organizationName}</strong>
  ${fullName ? `<div style="font-size:13px;font-weight:600;color:#333;margin-bottom:2px;">${fullName}</div>` : ''}
  ${title ? `<div style="font-size:12px;color:#666;margin-bottom:8px;">${title}</div>` : ''}
  <div style="font-size:13px;color:#555;">
    ${phone ? `<div style="margin-bottom:3px;">📞 ${phone}</div>` : ''}
    ${email ? `<div style="margin-bottom:3px;">✉️ <a href="mailto:${email}" style="color:#506ee4;">${email}</a></div>` : ''}
    ${website ? `<div style="margin-bottom:3px;">🌐 <a href="${website}" style="color:#506ee4;">${website}</a></div>` : ''}
    ${additionalInfo ? `<div style="margin-top:6px;color:#888;font-size:12px;">${additionalInfo}</div>` : ''}
  </div>
</div>`;
}

// ── Helper: Generate attachments HTML ────────────────────────────────────────

export function generateAttachmentsHTML(
  attachments: EmailTemplate['attachments'],
): string {
  if (!attachments?.length) return '';
  const items = attachments
    .map((a: any) => {
      if (!a?.filename) return '';
      const icon = a.mimeType?.startsWith('image/')
        ? '🖼️'
        : a.mimeType === 'application/pdf'
          ? '📄'
          : a.mimeType?.includes('word')
            ? '📝'
            : a.mimeType?.includes('excel')
              ? '📊'
              : '📎';
      const size = a.size ? `${(a.size / 1024).toFixed(1)} KB` : '';
      return `
        <div style="margin:10px 0;padding:12px;background:#f8f9fa;border-radius:6px;border-left:4px solid #506ee4;">
          <span style="font-size:20px;">${icon}</span>
          <strong style="display:block;font-size:13px;color:#333;margin-top:4px;">${a.filename}</strong>
          ${size ? `<span style="font-size:11px;color:#888;">${size}</span>` : ''}
          ${a.url ? `<div style="margin-top:6px;"><a href="${a.url}" style="color:#506ee4;font-size:12px;" target="_blank">Download</a></div>` : ''}
        </div>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `
<div style="margin-top:28px;padding-top:20px;border-top:2px solid #eaeaea;">
  <h3 style="font-size:16px;color:#333;margin:0 0 12px;">📎 Attachments (${attachments.length})</h3>
  ${items}
</div>`;
}

// ── Build complete HTML from template ────────────────────────────────────────

export function buildCompleteHTML(template: any): string {
  const cfg = template.builderConfig as BuilderConfig | undefined;

  const effectiveCfg: BuilderConfig = cfg || {
    layout: 'minimal',
    primaryColor: '#506ee4',
    backgroundColor: '#f0f4ff',
    headerBg: '#1e3a8a',
    ctaColor: '#506ee4',
    fontFamily: 'system',
    headerTitle: '',
    headerSubtitle: '',
    showLogo: true,
    logoUrl:
      'https://pub-eab2790b2e94418f896b048a8e6658d0.r2.dev/logo/logo.png',
    headerImage: '',
    inlineImage: '',
    backgroundImage: '',
    overlayOpacity: 0.55,
    imagePosition: 'center',
    imageCaption: '',
    ctaText: '',
    ctaUrl: '',
    footerText:
      "You're receiving this because you're part of <strong>Bothell Select</strong>.",
  };

  const signatureHTML =
    template.includeSignature && template.signatureConfig
      ? generateSignatureHTML(template.signatureConfig)
      : '';

  const attachmentsHTML = generateAttachmentsHTML(template.attachments || []);

  return generateEmailHTML(
    effectiveCfg,
    template.content || '<p>No content provided.</p>',
    template.subject || 'Email',
    signatureHTML,
    attachmentsHTML,
  );
}

// ── API calls ─────────────────────────────────────────────────────────────────

function sanitizePayload(template: any) {
  const {
    title,
    subject,
    content,
    status,
    variables,
    category,
    tags,
    includeSignature,
    signatureConfig,
    predefinedVariables,
    createdBy,
    lastUpdatedBy,
    attachments,
    builderConfig,
  } = template;

  const payload: any = {
    title,
    subject,
    content,
    status: status !== undefined ? status : true,
    variables: variables || [],
    category: category || 'transactional',
    tags: tags || [],
    includeSignature: includeSignature || false,
    signatureConfig: signatureConfig || {},
    predefinedVariables: predefinedVariables || [],
    builderConfig: builderConfig || null,
  };

  if (createdBy) payload.createdBy = createdBy;
  if (lastUpdatedBy) payload.lastUpdatedBy = lastUpdatedBy;
  if (attachments) payload.attachments = attachments;

  return payload;
}

export const emailTemplateService = {
  async getAll(): Promise<EmailTemplate[]> {
    const res = await axios.get(API_URL, getAuthHeaders());
    if (!res.data.success) throw new Error(res.data.error);
    return res.data.data;
  },

  async getAllActive(): Promise<EmailTemplate[]> {
    const res = await axios.get(`${API_URL}?status=true`, getAuthHeaders());
    return res.data.data || [];
  },

  async getById(id: string): Promise<EmailTemplate> {
    const res = await axios.get(`${API_URL}/${id}`, getAuthHeaders());
    return res.data.data;
  },

  async create(templateData: any): Promise<EmailTemplate> {
    const payload = sanitizePayload(templateData);
    const res = await axios.post(API_URL, payload, getAuthHeaders());
    return res.data.data;
  },

  async update(id: string, templateData: any): Promise<EmailTemplate> {
    const payload = sanitizePayload(templateData);
    const res = await axios.put(`${API_URL}/${id}`, payload, getAuthHeaders());
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
  },

  async uploadAttachment(templateId: string, file: File) {
    const form = new FormData();
    form.append('attachment', file);
    const res = await axios.post(`${API_URL}/${templateId}/attachments`, form, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  async deleteAttachment(templateId: string, attachmentId: string) {
    const res = await axios.delete(
      `${API_URL}/${templateId}/attachments/${attachmentId}`,
      getAuthHeaders(),
    );
    return res.data;
  },

  async sendTemplate(params: {
    templateId: string;
    parentId?: string;
    playerId?: string;
    to?: string;
  }) {
    const res = await axios.post(`${API_URL}/send`, params, getAuthHeaders());
    return res.data;
  },
};
