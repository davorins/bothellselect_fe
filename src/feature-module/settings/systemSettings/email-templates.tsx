import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Badge,
  Spinner,
  Alert,
  Modal,
  Form,
  Row,
  Col,
  Tabs,
  Tab,
} from 'react-bootstrap';
import ReactQuill, { ReactQuillProps } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios, { AxiosError } from 'axios';
import {
  EmailTemplate,
  ApiResponse,
  ApiErrorResponse,
  TempEmailAttachment,
  EmailAttachment,
} from '../../../types/types';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { isR2Url, getR2AttachmentUrl } from '../../../utils/r2Utils';

const QuillEditor = forwardRef<ReactQuill, ReactQuillProps>((props, ref) => (
  <ReactQuill {...props} ref={ref} />
));

QuillEditor.displayName = 'QuillEditor';

// R2 Logo URL
const R2_LOGO_URL = process.env.REACT_APP_R2_PUBLIC_URL
  ? `${process.env.REACT_APP_R2_PUBLIC_URL}/logo/logo.png`
  : 'https://bothellselect.com/assets/img/logo.png';

interface AvailableVariable {
  label: string;
  value: string;
}

const EmailTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplates, setActiveTemplates] = useState<EmailTemplate[]>([]);
  const [inactiveTemplates, setInactiveTemplates] = useState<EmailTemplate[]>(
    [],
  );
  const [newTemplate, setNewTemplate] = useState<{
    title: string;
    subject: string;
    content: string;
    status: boolean;
    category:
      | 'system'
      | 'marketing'
      | 'transactional'
      | 'notification'
      | 'other';
    tags: string[];
    variables: any[];
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
    attachments: (EmailAttachment | TempEmailAttachment)[];
  }>({
    title: '',
    subject: '',
    content: '',
    status: true,
    category: 'system',
    tags: [],
    variables: [],
    includeSignature: false,
    signatureConfig: {
      organizationName: '',
      title: '',
      fullName: '',
      phone: '',
      email: '',
      website: '',
      additionalInfo: '',
    },
    attachments: [],
  });

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
    null,
  );
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('active');
  const quillRef = useRef<ReactQuill>(null);
  const editQuillRef = useRef<ReactQuill>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});

  const availableVariables: AvailableVariable[] = [
    { label: "Parent's Full Name", value: '[parent.fullName]' },
    { label: "Parent's Email", value: '[parent.email]' },
    { label: "Parent's Phone", value: '[parent.phone]' },
    { label: "Player's Full Name", value: '[player.fullName]' },
    { label: "Player's First Name", value: '[player.firstName]' },
    { label: "Player's Grade", value: '[player.grade]' },
    { label: "Player's School", value: '[player.schoolName]' },
  ];

  // File upload handler
  const handleFileUpload = async (
    files: FileList,
    isEditModal: boolean = false,
  ) => {
    const token = localStorage.getItem('token');

    Array.from(files).forEach(async (file) => {
      try {
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File ${file.name} exceeds 10MB limit`);
          return;
        }

        // Validate file type
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'application/zip',
          'application/x-rar-compressed',
        ];

        if (!allowedTypes.includes(file.type)) {
          setError(`File type ${file.type} is not allowed`);
          return;
        }

        setUploadingFiles((prev) => [...prev, file]);

        const formData = new FormData();
        formData.append('attachment', file);

        // Determine which template to upload to
        const templateId =
          isEditModal && editingTemplate ? editingTemplate._id : null;

        // If we're in add mode, store file temporarily as base64
        if (!templateId) {
          // Read file as base64 for temporary storage
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const tempAttachment: TempEmailAttachment = {
              filename: file.name,
              size: file.size,
              mimeType: file.type,
              content: base64.split(',')[1], // Remove data URL prefix
              uploadedAt: new Date().toISOString(),
            };

            setNewTemplate((prev) => ({
              ...prev,
              attachments: [...prev.attachments, tempAttachment],
            }));
          };
          reader.readAsDataURL(file);

          // Remove from uploading files
          setUploadingFiles((prev) => prev.filter((f) => f !== file));
          return;
        }

        // Upload to existing template
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/email-templates/${templateId}/upload-attachment`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) /
                  (progressEvent.total || file.size),
              );
              setUploadProgress((prev) => ({
                ...prev,
                [file.name]: percentCompleted,
              }));
            },
          },
        );

        if (response.data.success) {
          const uploadedAttachment = response.data.data.attachment;

          if (isEditModal && editingTemplate) {
            setEditingTemplate((prev) => ({
              ...prev!,
              attachments: [...(prev!.attachments || []), uploadedAttachment],
            }));
          } else {
            setNewTemplate((prev) => ({
              ...prev,
              attachments: [...prev.attachments, uploadedAttachment],
            }));
          }
        }
      } catch (err) {
        const error = err as AxiosError<ApiErrorResponse>;
        setError(error.response?.data?.error || 'Failed to upload file');
      } finally {
        // Clean up
        setUploadingFiles((prev) => prev.filter((f) => f !== file));
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    });
  };

  // File removal handler
  const handleRemoveAttachment = async (
    attachmentId: string,
    isEditModal: boolean = false,
  ) => {
    try {
      const token = localStorage.getItem('token');

      // If we're in add mode (no template ID yet), just remove from state
      if (!isEditModal && !editingTemplate) {
        setNewTemplate((prev) => ({
          ...prev,
          attachments: prev.attachments.filter((att) =>
            // For temporary files, filter by filename
            // For uploaded files, filter by _id
            '_id' in att
              ? att._id !== attachmentId
              : att.filename !== attachmentId,
          ),
        }));
        return;
      }

      // For existing templates, call API if it has an _id
      const templateId =
        isEditModal && editingTemplate ? editingTemplate._id : null;

      if (templateId && !attachmentId.startsWith('temp_')) {
        // Only call API if it's a real attachment (has _id, not temp file)
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/email-templates/${templateId}/attachments/${attachmentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      // Update state
      if (isEditModal && editingTemplate) {
        setEditingTemplate((prev) => ({
          ...prev!,
          attachments: (prev!.attachments || []).filter((att) =>
            '_id' in att ? att._id !== attachmentId : true,
          ),
        }));
      } else {
        setNewTemplate((prev) => ({
          ...prev,
          attachments: prev.attachments.filter((att) =>
            '_id' in att
              ? att._id !== attachmentId
              : att.filename !== attachmentId,
          ),
        }));
      }
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(error.response?.data?.error || 'Failed to remove attachment');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'ti ti-photo';
    if (mimeType === 'application/pdf') return 'ti ti-file-text';
    if (mimeType.includes('word') || mimeType.includes('document'))
      return 'ti ti-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return 'ti ti-file-spreadsheet';
    if (mimeType === 'text/plain') return 'ti ti-file-text';
    if (mimeType.includes('zip') || mimeType.includes('rar'))
      return 'ti ti-file-zip';
    return 'ti ti-file';
  };

  // File Attachments Section Component
  const FileAttachmentsSection: React.FC<{
    attachments: (EmailAttachment | TempEmailAttachment)[];
    onRemove: (attachmentId: string) => void;
    onUpload: (files: FileList) => void;
    uploadingFiles?: File[];
    uploadProgress?: { [key: string]: number };
    isEditMode?: boolean;
  }> = ({
    attachments,
    onRemove,
    onUpload,
    uploadingFiles = [],
    uploadProgress = {},
    isEditMode = false,
  }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileInputClick = () => {
      fileInputRef.current?.click();
    };

    return (
      <div className='border rounded p-3 mt-5 mb-3'>
        <div className='d-flex align-items-center justify-content-between mb-3'>
          <div>
            <h5 style={{ margin: 0 }}>Email Attachments</h5>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6c757d' }}>
              Add files to be sent with this email template
            </p>
          </div>
          <div>
            <input
              type='file'
              ref={fileInputRef}
              multiple
              onChange={(e) => e.target.files && onUpload(e.target.files)}
              style={{ display: 'none' }}
            />
            <Button
              variant='outline-primary'
              size='sm'
              onClick={handleFileInputClick}
            >
              <i className='ti ti-paperclip me-1'></i>
              Add Files
            </Button>
          </div>
        </div>

        {/* Uploading files progress */}
        {uploadingFiles.length > 0 && (
          <div className='mb-3'>
            <h6>Uploading Files:</h6>
            {uploadingFiles.map((file) => (
              <div key={file.name} className='d-flex align-items-center mb-2'>
                <div className='flex-fill me-3'>
                  <div className='d-flex justify-content-between'>
                    <small>{file.name}</small>
                    <small>{uploadProgress[file.name] || 0}%</small>
                  </div>
                  <div className='progress' style={{ height: '4px' }}>
                    <div
                      className='progress-bar'
                      role='progressbar'
                      style={{ width: `${uploadProgress[file.name] || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attachments list */}
        {attachments.length > 0 ? (
          <div className='mt-3'>
            <h6>Attached Files ({attachments.length}):</h6>
            <div className='list-group'>
              {attachments.map((attachment, index) => {
                const isTempFile = !('_id' in attachment);
                const attachmentId = isTempFile
                  ? `temp_${attachment.filename}_${index}`
                  : attachment._id || `attachment_${index}`;
                const displayId = isTempFile
                  ? attachment.filename
                  : attachment._id || '';

                return (
                  <div
                    key={attachmentId}
                    className='list-group-item d-flex align-items-center justify-content-between'
                  >
                    <div className='d-flex align-items-center'>
                      <i
                        className={`${getFileIcon(attachment.mimeType)} me-2`}
                      ></i>
                      <div>
                        <div className='fw-medium'>{attachment.filename}</div>
                        <small className='text-muted'>
                          {formatFileSize(attachment.size)} •{' '}
                          {isTempFile
                            ? 'Not uploaded yet'
                            : new Date(
                                attachment.uploadedAt || '',
                              ).toLocaleDateString()}
                          {isTempFile && (
                            <span className='badge bg-warning ms-2'>
                              Pending
                            </span>
                          )}
                        </small>
                      </div>
                    </div>
                    <Button
                      variant='link'
                      size='sm'
                      className='text-danger'
                      onClick={() => onRemove(attachmentId)}
                    >
                      <i className='ti ti-trash'></i>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className='text-center py-3 text-muted'>
            <i
              className='ti ti-paperclip mb-2'
              style={{ fontSize: '2rem' }}
            ></i>
            <p>No files attached. Click "Add Files" to attach documents.</p>
          </div>
        )}

        {/* File requirements */}
        <div className='mt-3'>
          <small className='text-muted'>
            <i className='ti ti-info-circle me-1'></i>
            Supported: Images, PDF, Word, Excel, Text, ZIP/RAR (Max 10MB each)
          </small>
        </div>
      </div>
    );
  };

  // Separate templates into active and inactive
  useEffect(() => {
    const active = templates.filter((template) => template.status === true);
    const inactive = templates.filter((template) => template.status === false);
    setActiveTemplates(active);
    setInactiveTemplates(inactive);
  }, [templates]);

  // Apply email-friendly styles to HTML content
  function addEmailStyles(html: string): string {
    if (!html) return '';

    let styledHtml = html;

    // Add basic styles to paragraphs
    styledHtml = styledHtml.replace(
      /<p(\s[^>]*)?>/g,
      '<p style="margin: 0 0 16px; padding: 0; line-height: 1.6; color: #333;"$1>',
    );

    // Style headings
    styledHtml = styledHtml.replace(
      /<h1(\s[^>]*)?>/g,
      '<h1 style="font-size: 28px; font-weight: bold; margin: 0 0 20px; padding: 0; color: #222; line-height: 1.3;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<h2(\s[^>]*)?>/g,
      '<h2 style="font-size: 24px; font-weight: bold; margin: 0 0 18px; padding: 0; color: #222; line-height: 1.3;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<h3(\s[^>]*)?>/g,
      '<h3 style="font-size: 20px; font-weight: 600; margin: 0 0 16px; padding: 0; color: #222; line-height: 1.3;"$1>',
    );

    // Style lists
    styledHtml = styledHtml.replace(
      /<ul(\s[^>]*)?>/g,
      '<ul style="margin: 0 0 16px 20px; padding: 0; color: #333; line-height: 1.6;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<ol(\s[^>]*)?>/g,
      '<ol style="margin: 0 0 16px 20px; padding: 0; color: #333; line-height: 1.6;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<li(\s[^>]*)?>/g,
      '<li style="margin: 0 0 8px; padding: 0;"$1>',
    );

    // Style links
    styledHtml = styledHtml.replace(
      /<a(\s[^>]*)?>/g,
      '<a style="color: #506ee4; text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;"$1>',
    );

    // Style bold and italic
    styledHtml = styledHtml.replace(
      /<strong(\s[^>]*)?>/g,
      '<strong style="font-weight: bold;"$1>',
    );

    styledHtml = styledHtml.replace(
      /<em(\s[^>]*)?>/g,
      '<em style="font-style: italic;"$1>',
    );

    // Style blockquotes
    styledHtml = styledHtml.replace(
      /<blockquote(\s[^>]*)?>/g,
      '<blockquote style="margin: 20px 0; padding: 15px 20px; background-color: #f8f9fa; border-left: 4px solid #506ee4; color: #555; font-style: italic;"$1>',
    );

    return styledHtml;
  }

  // Generate email signature HTML
  const generateSignatureHTML = (signatureConfig: any) => {
    if (!signatureConfig) return '';

    const {
      organizationName = '',
      title = '',
      fullName = '',
      phone = '',
      email = '',
      website = '',
      additionalInfo = '',
    } = signatureConfig;

    return `
<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      <td style="padding: 0; vertical-align: top;">
        <div style="color: #333; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <strong style="color: #222; font-size: 16px; display: block; margin-bottom: 8px;">${organizationName}</strong>
          
          ${fullName ? `<div style="margin-bottom: 4px;"><strong>${fullName}</strong></div>` : ''}
          
          ${title ? `<div style="margin-bottom: 4px; color: #666; font-size: 14px;">${title}</div>` : ''}
          
          <div style="margin-top: 12px; font-size: 14px;">
            ${phone ? `<div style="margin-bottom: 4px;"><span style="color: #666;">Phone:</span> <span style="color: #333;">${phone}</span></div>` : ''}
            ${email ? `<div style="margin-bottom: 4px;"><span style="color: #666;">Email:</span> <a href="mailto:${email}" style="color: #506ee4; text-decoration: none;">${email}</a></div>` : ''}
            ${website ? `<div style="margin-bottom: 4px;"><span style="color: #666;">Website:</span> <a href="${website}" style="color: #506ee4; text-decoration: none;">${website}</a></div>` : ''}
            ${additionalInfo ? `<div style="margin-top: 8px; color: #666; font-size: 13px;">${additionalInfo}</div>` : ''}
          </div>
        </div>
      </td>
    </tr>
  </table>
</div>`;
  };

  // Function to get the complete email HTML with wrapper for sending
  const getCompleteEmailHTML = (
    content: string,
    includeSignature: boolean = false,
    signatureConfig: any = null,
    attachments: any[] = [],
  ) => {
    let styledContent = addEmailStyles(content);

    // Add attachments HTML if present
    if (attachments && attachments.length > 0) {
      styledContent += generateAttachmentsHTML(attachments);
    }

    // Add signature if enabled and configured
    if (includeSignature && signatureConfig) {
      const signatureHTML = generateSignatureHTML(signatureConfig);
      styledContent += signatureHTML;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 10px !important;
      }
      
      .email-body {
        padding: 30px 40px 0 40px !important;
      }
      
      .header-img {
        height: 30px !important;
      }
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="background-color: #f6f6f6; padding: 40px 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <!--[if (gte mso 9)|(IE)]>
        <table width="600" align="center" cellpadding="0" cellspacing="0" border="0">
        <tr>
        <td>
        <![endif]-->
        <div class="container" style="max-width: 600px; margin: 0 auto;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); overflow: hidden;">
            <!-- Header -->
            <tr>
              <td style="padding: 30px 30px 0;">
                <div style="text-align: left; border-bottom: 1px solid #eaeaea; padding-bottom: 20px;">
                  <img src="${R2_LOGO_URL}" alt="Bothell Select Logo" height="30" style="display: block; margin: 0; height: 30px;" 
                       onerror="this.onerror=null; this.src='https://bothellselect.com/assets/img/logo.png';" />
                </div>
              </td>
            </tr>
            
            <!-- Email Content -->
            <tr>
              <td class="email-body" style="padding: 30px;">
                <div style="max-width: 100%;">
                  ${styledContent}
                </div>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 0 30px;">
                <div style="text-align: center; font-size: 13px; color: #666; padding: 30px 0 20px; margin-top: 40px; border-top: 1px solid #eaeaea;">
                  <p style="margin: 0 0 8px;">You're receiving this email because you're part of <strong style="color: #333;">Bothell Select</strong>.</p>
                  <p style="margin: 0;">
                    <a href="https://bothellselect.com/general-settings/notifications-settings" style="color: #506ee4; text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;">
                      Unsubscribe
                    </a> • 
                    <a href="https://bothellselect.com/contact-us" style="color: #506ee4; text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;">
                      Contact Us
                    </a> • 
                    <a href="https://bothellselect.com" style="color: #506ee4; text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;">
                      Website
                    </a>
                  </p>
                </div>
              </td>
            </tr>
          </table>
          
          <!-- Additional footer info (outside the main card) -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #999;">
                  &copy; ${new Date().getFullYear()} Bothell Select. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </div>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
`;
  };

  // Generate attachments HTML for preview
  const generateAttachmentsHTML = (attachments: any[]): string => {
    if (!attachments || attachments.length === 0) return '';

    const getFileIcon = (mimeType: string) => {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType === 'application/pdf') return '📄';
      if (mimeType.includes('word') || mimeType.includes('document'))
        return '📝';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
        return '📊';
      if (mimeType === 'text/plain') return '📃';
      if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
      return '📎';
    };

    const formatFileSizePreview = (bytes: number) => {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const attachmentItems = attachments
      .map(
        (att) => `
      <div style="margin: 12px 0; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #506ee4;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px; line-height: 1;">${getFileIcon(
            att.mimeType,
          )}</div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${
              att.filename
            }</div>
            <div style="font-size: 12px; color: #666;">
              ${formatFileSizePreview(att.size)} • ${att.mimeType}
            </div>
          </div>
        </div>
        ${
          att.url
            ? `
          <div style="margin-top: 8px; font-size: 13px;">
            <a href="${att.url}" 
               style="color: #506ee4; text-decoration: none; border-bottom: 1px solid #506ee4; padding-bottom: 1px;"
               target="_blank" rel="noopener noreferrer">
              🔗 Direct download link
            </a>
          </div>
        `
            : ''
        }
      </div>
    `,
      )
      .join('');

    return `
      <div style="margin-top: 30px; padding-top: 25px; border-top: 2px solid #eaeaea;">
        <h3 style="color: #333; margin-bottom: 20px; font-size: 18px;">
          📎 Attachments (${attachments.length})
        </h3>
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          ${attachmentItems}
        </div>
      </div>
    `;
  };

  useEffect(() => {
    return () => {
      // Cleanup Quill instances
      [quillRef, editQuillRef].forEach((ref) => {
        if (ref.current) {
          const quill = ref.current.getEditor();
          quill.off('text-change');
        }
      });
    };
  }, []);

  // Load templates from API with proper error handling
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get<ApiResponse<EmailTemplate[]>>(
          `${process.env.REACT_APP_API_BASE_URL}/email-templates`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        // Ensure we always set an array, even if response.data.data is undefined
        setTemplates(
          Array.isArray(response.data?.data)
            ? response.data.data.map((t) => ({
                ...t,
                variables: t.variables || [],
                tags: t.tags || [],
                includeSignature: t.includeSignature || false,
                signatureConfig: t.signatureConfig || {
                  organizationName: '',
                  title: '',
                  fullName: '',
                  phone: '',
                  email: '',
                  website: '',
                  additionalInfo: '',
                },
                attachments: t.attachments || [],
              }))
            : [],
        );
      } catch (err) {
        const error = err as Error;
        setError(error.message || 'Failed to load templates');
        setTemplates([]); // Explicitly set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [navigate, refreshTrigger]);

  // Handle input changes with proper typing
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setNewTemplate((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Handle signature input changes
  const handleSignatureChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setNewTemplate((prev) => ({
      ...prev,
      signatureConfig: {
        ...prev.signatureConfig,
        [name]: value,
      },
    }));
  };

  // Handle tags input change
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    setNewTemplate((prev) => ({ ...prev, tags }));
  };

  // Content change handlers with null checks
  const handleContentChange = (content: string) => {
    setNewTemplate((prev) => ({ ...prev, content }));
  };

  const handleEditContentChange = (content: string) => {
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        content,
      });
    }
  };

  // Handle edit signature changes
  const handleEditSignatureChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        signatureConfig: {
          ...editingTemplate.signatureConfig,
          [name]: value,
        },
      });
    }
  };

  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate title
    const isDuplicate = templates.some(
      (template) =>
        template.title.toLowerCase().trim() ===
        newTemplate.title.toLowerCase().trim(),
    );

    if (isDuplicate) {
      setError(
        `A template with the title "${newTemplate.title}" already exists.`,
      );
      // Highlight the title field
      const titleInput = document.querySelector('input[name="title"]');
      titleInput?.classList.add('is-invalid');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');

      // DO NOT include signature in stored content - store only the message body
      const storedContent = newTemplate.content;

      // Separate base64 files from already uploaded files
      const base64Attachments = newTemplate.attachments.filter(
        (att) => 'content' in att,
      ) as TempEmailAttachment[];

      const uploadedAttachments = newTemplate.attachments.filter(
        (att) => '_id' in att,
      ) as EmailAttachment[];

      // Prepare payload for template creation
      const payload = {
        title: newTemplate.title.trim(),
        subject: newTemplate.subject.trim(),
        content: storedContent,
        status: newTemplate.status,
        category: newTemplate.category,
        tags: newTemplate.tags.filter((tag) => tag.trim() !== ''),
        variables:
          newTemplate.variables?.map((v) => ({
            name: v.name.trim(),
            description: v.description.trim(),
            defaultValue: v.defaultValue?.trim() || '',
          })) || [],
        includeSignature: newTemplate.includeSignature,
        signatureConfig: newTemplate.signatureConfig,
        attachments: uploadedAttachments.map((att) => ({
          filename: att.filename,
          url: att.url,
          size: att.size,
          mimeType: att.mimeType,
        })),
      };

      // Create the template
      const response = await axios.post<EmailTemplate>(
        `${process.env.REACT_APP_API_BASE_URL}/email-templates`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Upload base64 files after template creation
      const templateId = response.data._id;
      for (const tempAttachment of base64Attachments) {
        try {
          // Convert base64 to blob
          const byteCharacters = atob(tempAttachment.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: tempAttachment.mimeType });
          const file = new File([blob], tempAttachment.filename, {
            type: tempAttachment.mimeType,
          });

          const formData = new FormData();
          formData.append('attachment', file);

          await axios.post(
            `${process.env.REACT_APP_API_BASE_URL}/email-templates/${templateId}/upload-attachment`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            },
          );
        } catch (uploadError) {
          console.error(
            `Failed to upload ${tempAttachment.filename}:`,
            uploadError,
          );
        }
      }

      if (response.data) {
        setRefreshTrigger((prev) => prev + 1);
        resetNewTemplate();
        setShowAddModal(false);
        setSuccessMessage('Template created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to create template',
      );
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveEditedTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setIsSaving(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Store only the content, NOT with signature
      const storedContent = editingTemplate.content;

      // Filter out any temporary attachments (ones with content field)
      const validAttachments = (editingTemplate.attachments || []).filter(
        (att) => '_id' in att || 'url' in att,
      ) as EmailAttachment[];

      // Prepare attachments for backend
      const attachmentsForBackend = validAttachments.map((att) => ({
        filename: att.filename,
        url: att.url,
        size: att.size,
        mimeType: att.mimeType,
        // Include _id if it exists (for existing attachments)
        ...(att._id && { _id: att._id }),
        // Include uploadedAt if it exists
        ...(att.uploadedAt && { uploadedAt: att.uploadedAt }),
      }));

      // Create payload that matches backend expectations
      const payload = {
        title: editingTemplate.title.trim(),
        subject: editingTemplate.subject.trim(),
        content: storedContent, // Store only the content, NOT with signature
        status: editingTemplate.status,
        category: editingTemplate.category,
        tags: editingTemplate.tags.filter((tag) => tag.trim() !== ''),
        variables: (editingTemplate.variables || []).map((v) => ({
          name: v.name?.trim() || '',
          description: v.description?.trim() || '',
          defaultValue: v.defaultValue?.trim() || '',
        })),
        includeSignature: editingTemplate.includeSignature,
        signatureConfig: editingTemplate.signatureConfig,
        // Include attachments in payload
        attachments: attachmentsForBackend,
      };

      console.log('Saving template payload:', {
        title: payload.title,
        attachmentCount: attachmentsForBackend.length,
        attachments: attachmentsForBackend,
      });

      const response = await axios.put<EmailTemplate>(
        `${process.env.REACT_APP_API_BASE_URL}/email-templates/${editingTemplate._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data) {
        // Update the template in state with the response (which should include attachments)
        setTemplates((prev) =>
          prev.map((t) => (t._id === editingTemplate._id ? response.data : t)),
        );
        setRefreshTrigger((prev) => prev + 1);
        setEditingTemplate(null);
        setShowEditModal(false);
        setSuccessMessage('Template updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to update template';
      setError(errorMessage);

      console.error('Update Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/email-templates/${templateToDelete}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setTemplates((prev) => prev.filter((t) => t._id !== templateToDelete));
      setTemplateToDelete(null);
      setShowDeleteModal(false);
      setSuccessMessage('Template deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      setError(
        error.response?.data?.message ||
          error.message ||
          'Failed to delete template',
      );
    }
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      title: '',
      subject: '',
      content: '',
      status: true,
      category: 'system',
      tags: [],
      variables: [],
      includeSignature: false,
      signatureConfig: {
        organizationName: '',
        title: '',
        fullName: '',
        phone: '',
        email: '',
        website: '',
        additionalInfo: '',
      },
      attachments: [],
    });
  };

  // Rich text editor configuration
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'list',
    'bullet',
    'link',
    'image',
  ];

  const handleEditInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (editingTemplate) {
      if (name === 'includeSignature') {
        // Explicitly handle the boolean case
        setEditingTemplate({
          ...editingTemplate,
          includeSignature: type === 'checkbox' ? checked : value === 'true',
        });
      } else {
        // Handle other fields
        setEditingTemplate({
          ...editingTemplate,
          [name]: type === 'checkbox' ? checked : value,
        });
      }
    }
  };

  const handleEditTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    if (editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        tags: tags || [],
      });
    }
  };

  // Function to insert variable into Quill editor
  const insertVariable = (variable: string, isEditModal: boolean = false) => {
    const editor = isEditModal
      ? editQuillRef.current?.getEditor()
      : quillRef.current?.getEditor();

    if (editor) {
      const range = editor.getSelection();
      if (range) {
        editor.insertText(range.index, variable);
        editor.setSelection(range.index + variable.length, 0);
      } else {
        // If no selection, insert at the end
        const length = editor.getLength();
        editor.insertText(length - 1, variable);
        editor.setSelection(length - 1 + variable.length, 0);
      }
    }
  };

  // Helper function to detect and remove signature from content
  const removeSignatureFromContent = (content: string): string => {
    if (!content) return '';

    // Pattern 1: Look for the signature div with margin-top: 40px (from generateSignatureHTML)
    const signatureDivPattern =
      /<div[^>]*style="[^"]*margin-top: 40px[^"]*"[^>]*>[\s\S]*?<\/div>/i;

    // Pattern 2: Look for signature structure (organization name, phone, email, website in sequence)
    const signatureStructurePattern =
      /<table[^>]*cellpadding="0"[^>]*cellspacing="0"[^>]*>[\s\S]*?<strong[^>]*>.*?<\/strong>[\s\S]*?Phone:[\s\S]*?Email:[\s\S]*?Website:[\s\S]*?<\/table>/i;

    // Pattern 3: Look for border-top signature separator
    const borderTopPattern =
      /<div[^>]*style="[^"]*border-top: 1px solid #eaeaea[^"]*"[^>]*>[\s\S]*?<\/div>/i;

    let cleanedContent = content;

    // Try each pattern
    [signatureDivPattern, signatureStructurePattern, borderTopPattern].forEach(
      (pattern) => {
        cleanedContent = cleanedContent.replace(pattern, '').trim();
      },
    );

    // Also remove any empty divs that might be left after signature removal
    cleanedContent = cleanedContent.replace(/<div[^>]*><\/div>/g, '').trim();
    cleanedContent = cleanedContent.replace(/<div[^>]*>\s*<\/div>/g, '').trim();

    return cleanedContent;
  };

  // Extract main content from stored HTML for editing
  const extractContentForEditing = (storedHtml: string): string => {
    if (!storedHtml) return '';

    // Check if this is a full email template or just content
    const hasEmailWrapper =
      storedHtml.includes('email-body') ||
      storedHtml.includes('Bothell Select Logo') ||
      storedHtml.includes("You're receiving this email");

    if (!hasEmailWrapper) {
      // Already just content, return as is
      return storedHtml;
    }

    // Try to extract content from email-body
    const emailBodyRegex =
      /<td[^>]*class="email-body"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/td>/i;
    const match = storedHtml.match(emailBodyRegex);

    if (match && match[1]) {
      // Remove any wrapper divs and inline styles
      let content = match[1]
        .replace(/style="[^"]*"/g, '')
        .replace(/class="[^"]*"/g, '')
        .trim();

      // Clean up any remaining wrapper tags
      content = content.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');

      return content;
    }

    // Last resort: return the original HTML
    return storedHtml;
  };

  // Function to set editing template with cleaned content
  const startEditingTemplate = (template: EmailTemplate) => {
    // Extract just the main content for editing
    const cleanedContent = extractContentForEditing(template.content);

    setEditingTemplate({
      ...template,
      content: cleanedContent,
      variables: template.variables || [],
      tags: template.tags || [],
      includeSignature: template.includeSignature || false,
      signatureConfig: template.signatureConfig || {
        organizationName: '',
        title: '',
        fullName: '',
        phone: '',
        email: '',
        website: '',
        additionalInfo: '',
      },
      attachments: template.attachments || [],
    });
    setShowEditModal(true);
  };

  // Email Preview Component Props
  interface EmailPreviewProps {
    content: string;
    includeSignature?: boolean;
    signatureConfig?: any;
    attachments?: any[];
  }

  // Email Preview Component
  const EmailPreview: React.FC<EmailPreviewProps> = ({
    content,
    includeSignature = false,
    signatureConfig = null,
    attachments = [],
  }) => {
    const completeEmail = getCompleteEmailHTML(
      content,
      includeSignature,
      signatureConfig,
      attachments,
    );

    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '20px auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <iframe
            title='Email Preview'
            srcDoc={completeEmail}
            style={{
              width: '100%',
              height: '500px',
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>
    );
  };

  // Template List Component
  const TemplateList = ({ templates }: { templates: EmailTemplate[] }) => {
    return (
      <div className='row'>
        {templates.length > 0 ? (
          templates.map((template) => (
            <div
              className='col-xxl-4 col-md-6'
              key={`${template._id}-${
                template.updatedAt || template.createdAt
              }`}
            >
              <div className='d-flex align-items-center justify-content-between bg-white p-3 border rounded mb-3'>
                <div>
                  <h5 className='fs-15 fw-normal mb-1'>
                    {template.title}
                    {!template.status && (
                      <Badge bg='warning' className='ms-2'>
                        <i className='ti ti-ban me-1'></i>
                        Inactive
                      </Badge>
                    )}
                  </h5>
                  <small className='text-muted'>{template.category}</small>
                  <div className='mt-2'>
                    {(template.tags || []).map((tag, i) => (
                      <Badge key={i} bg='light' text='dark' className='me-1'>
                        {tag}
                      </Badge>
                    ))}
                    {template.includeSignature && (
                      <Badge bg='info' className='me-1'>
                        Signature
                      </Badge>
                    )}
                    {(template.attachments || []).length > 0 && (
                      <Badge bg='secondary' className='me-1'>
                        <i className='ti ti-paperclip me-1'></i>
                        {template.attachments?.length}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className='d-flex align-items-center'>
                  <Button
                    variant='outline-light'
                    className='bg-white btn-icon me-2'
                    onClick={() => startEditingTemplate(template)}
                  >
                    <i className='ti ti-edit' />
                  </Button>
                  <Button
                    variant='outline-light'
                    className='bg-white btn-icon'
                    onClick={() => {
                      setTemplateToDelete(template._id);
                      setShowDeleteModal(true);
                    }}
                  >
                    <i className='ti ti-trash' />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='col-12'>
            <div className='text-center py-4'>
              <p>
                {activeTab === 'active'
                  ? 'No active templates found.'
                  : 'No inactive templates found.'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {/* Success message display */}
        {successMessage && (
          <Alert
            variant='success'
            onClose={() => setSuccessMessage(null)}
            dismissible
          >
            {successMessage}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>Email Campaigns</h3>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <div className='pe-1 mb-2'>
              <OverlayTrigger
                overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
              >
                <Button
                  variant='outline-light'
                  className='bg-white btn-icon me-1'
                  onClick={() => setRefreshTrigger((prev) => prev + 1)}
                >
                  <i className='ti ti-refresh' />
                </Button>
              </OverlayTrigger>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-xxl-12 col-xl-12'>
            <div className='flex-fill border-start ps-3'>
              <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom pt-3 mb-3'>
                <div className='mb-3'>
                  <h5 className='mb-1'>Email Templates</h5>
                  <p>Create Email Templates</p>
                </div>
                <div className='mb-3'>
                  <Button
                    variant='outline-light'
                    className='bg-white btn-icon me-2'
                    onClick={() => setShowAddModal(true)}
                  >
                    <i className='ti ti-plus' />
                  </Button>
                </div>
              </div>

              <div className='d-md-flex'>
                <div className='flex-fill'>
                  <div className='card'>
                    <div className='card-body p-3 pb-0'>
                      <Tabs
                        activeKey={activeTab}
                        onSelect={(k) => setActiveTab(k || 'active')}
                        className='mb-3'
                        fill
                      >
                        <Tab
                          eventKey='active'
                          title={
                            <span className='text-primary'>
                              {activeTemplates.length} Active Templates
                            </span>
                          }
                        >
                          <div className='mt-3'>
                            <TemplateList templates={activeTemplates} />
                          </div>
                        </Tab>
                        <Tab
                          eventKey='inactive'
                          title={
                            <span className='text-primary'>
                              {inactiveTemplates.length} Inactive Templates
                            </span>
                          }
                        >
                          <div className='mt-3'>
                            <TemplateList templates={inactiveTemplates} />
                          </div>
                        </Tab>
                      </Tabs>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Email Template Modal */}
      <Modal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        size='lg'
        className='email-template-modal'
        dialogClassName='modal-90w'
      >
        <Modal.Header closeButton style={{ borderBottom: '1px solid #dee2e6' }}>
          <Modal.Title>Add Email Template</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            padding: 0,
            maxHeight: 'calc(100vh - 210px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '20px' }}>
            <Form onSubmit={addTemplate}>
              <Form.Group className='mb-3'>
                <Form.Label>Title*</Form.Label>
                <Form.Control
                  type='text'
                  name='title'
                  placeholder='Enter Title'
                  value={newTemplate.title}
                  onChange={handleInputChange}
                  required
                  className={
                    error?.includes('already exists') ? 'is-invalid' : ''
                  }
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Subject*</Form.Label>
                <Form.Control
                  type='text'
                  name='subject'
                  placeholder='Enter Subject'
                  value={newTemplate.subject}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  name='category'
                  value={newTemplate.category}
                  onChange={handleInputChange}
                >
                  <option value='system'>System</option>
                  <option value='marketing'>Marketing</option>
                  <option value='transactional'>Transactional</option>
                  <option value='notification'>Notification</option>
                  <option value='other'>Other</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Tags (comma separated)</Form.Label>
                <Form.Control
                  type='text'
                  name='tags'
                  placeholder='tag1, tag2, tag3'
                  value={newTemplate.tags.join(', ')}
                  onChange={handleTagsChange}
                />
              </Form.Group>

              <Form.Group className='mb-3'>
                <Form.Label>Available Variables</Form.Label>
                <div className='border p-3 rounded mb-3'>
                  {availableVariables.map((variable, index) => (
                    <Badge
                      key={index}
                      bg='light'
                      text='dark'
                      className='me-2 mb-2 cursor-pointer'
                      onClick={() => insertVariable(variable.value, false)}
                    >
                      {variable.label}
                    </Badge>
                  ))}
                </div>
              </Form.Group>

              <Form.Group className='mb-5'>
                <Form.Label>Template Content*</Form.Label>
                <QuillEditor
                  ref={quillRef}
                  theme='snow'
                  value={newTemplate.content}
                  onChange={handleContentChange}
                  modules={modules}
                  formats={formats}
                  style={{ height: '250px', marginBottom: '20px' }}
                />
              </Form.Group>

              {/* Add File Attachments Section */}
              <Form.Group className='mb-3'>
                <FileAttachmentsSection
                  attachments={newTemplate.attachments}
                  onRemove={(attachmentId) =>
                    handleRemoveAttachment(attachmentId, false)
                  }
                  onUpload={(files) => handleFileUpload(files, false)}
                  uploadingFiles={uploadingFiles}
                  uploadProgress={uploadProgress}
                />
              </Form.Group>

              {/* Email Signature Section */}
              <div className='border rounded p-3 mb-3'>
                <Form.Group className='mt-2 mb-3 d-flex align-items-center justify-content-between'>
                  <div>
                    <h5 style={{ margin: 0 }}>Email Signature</h5>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: '#6c757d',
                      }}
                    >
                      Include a professional email signature
                    </p>
                  </div>
                  <Form.Check
                    type='switch'
                    id='include-signature-switch'
                    label='Include Signature'
                    name='includeSignature'
                    checked={newTemplate.includeSignature}
                    onChange={(e) => {
                      setNewTemplate((prev) => ({
                        ...prev,
                        includeSignature: e.target.checked,
                      }));
                    }}
                  />
                </Form.Group>

                {newTemplate.includeSignature && (
                  <div className='mt-3'>
                    <Row className='mb-3'>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Organization Name</Form.Label>
                          <Form.Control
                            type='text'
                            name='organizationName'
                            placeholder='Your organization name'
                            value={newTemplate.signatureConfig.organizationName}
                            onChange={handleSignatureChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Full Name</Form.Label>
                          <Form.Control
                            type='text'
                            name='fullName'
                            placeholder='Enter your name'
                            value={newTemplate.signatureConfig.fullName}
                            onChange={handleSignatureChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row className='mb-3'>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Title/Position</Form.Label>
                          <Form.Control
                            type='text'
                            name='title'
                            placeholder='Enter your title'
                            value={newTemplate.signatureConfig.title}
                            onChange={handleSignatureChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Phone Number</Form.Label>
                          <Form.Control
                            type='text'
                            name='phone'
                            placeholder='(123) 456-7890'
                            value={newTemplate.signatureConfig.phone}
                            onChange={handleSignatureChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row className='mb-3'>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Email Address</Form.Label>
                          <Form.Control
                            type='email'
                            name='email'
                            placeholder='Enter email address'
                            value={newTemplate.signatureConfig.email}
                            onChange={handleSignatureChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Website</Form.Label>
                          <Form.Control
                            type='text'
                            name='website'
                            placeholder='Enter url'
                            value={newTemplate.signatureConfig.website}
                            onChange={handleSignatureChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className='mb-3'>
                      <Form.Label>Additional Information</Form.Label>
                      <Form.Control
                        as='textarea'
                        rows={2}
                        name='additionalInfo'
                        placeholder='Additional notes, social media links, etc.'
                        value={newTemplate.signatureConfig.additionalInfo}
                        onChange={handleSignatureChange}
                      />
                      <Form.Text className='text-muted'>
                        This will appear below your contact information
                      </Form.Text>
                    </Form.Group>
                  </div>
                )}
              </div>

              {/* Email Preview */}
              {newTemplate.content && (
                <Form.Group className='mb-3'>
                  <Form.Label>Preview</Form.Label>
                  <EmailPreview
                    content={newTemplate.content}
                    includeSignature={newTemplate.includeSignature}
                    signatureConfig={newTemplate.signatureConfig}
                    attachments={newTemplate.attachments}
                  />
                </Form.Group>
              )}

              <Form.Group className='mt-5 mb-3 d-flex align-items-center justify-content-between'>
                <div>
                  <h5 style={{ margin: 0 }}>Template Status</h5>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: '#6c757d',
                    }}
                  >
                    Change the Status by toggle
                  </p>
                </div>
                <Form.Check
                  type='switch'
                  id='status-switch'
                  label='Active'
                  name='status'
                  checked={newTemplate.status}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <div
                className='d-flex justify-content-end gap-2'
                style={{
                  marginTop: '20px',
                  paddingTop: '15px',
                  borderTop: '1px solid #dee2e6',
                }}
              >
                <Button
                  variant='secondary'
                  onClick={() => setShowAddModal(false)}
                  className='px-4'
                >
                  Cancel
                </Button>
                <Button
                  variant='primary'
                  type='submit'
                  disabled={
                    !newTemplate.title ||
                    !newTemplate.subject ||
                    !newTemplate.content ||
                    isSaving
                  }
                  className='px-4'
                >
                  {isSaving ? (
                    <>
                      <Spinner
                        as='span'
                        size='sm'
                        animation='border'
                        role='status'
                        aria-hidden='true'
                        className='me-2'
                      />
                      Creating...
                    </>
                  ) : (
                    'Create Template'
                  )}
                </Button>
              </div>
            </Form>
          </div>
        </Modal.Body>
      </Modal>

      {/* Edit Email Template Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size='lg'
        className='email-template-modal'
        dialogClassName='modal-90w'
      >
        <Modal.Header closeButton style={{ borderBottom: '1px solid #dee2e6' }}>
          <Modal.Title>Edit Email Template</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{
            padding: 0,
            maxHeight: 'calc(100vh - 210px)',
            overflowY: 'auto',
          }}
        >
          {editingTemplate && (
            <div style={{ padding: '20px' }}>
              <Form onSubmit={saveEditedTemplate}>
                <Form.Group className='mb-3'>
                  <Form.Label>Title*</Form.Label>
                  <Form.Control
                    type='text'
                    name='title'
                    placeholder='Enter Title'
                    value={editingTemplate.title}
                    onChange={handleEditInputChange}
                    required
                  />
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Subject*</Form.Label>
                  <Form.Control
                    type='text'
                    name='subject'
                    placeholder='Enter Subject'
                    value={editingTemplate.subject}
                    onChange={handleEditInputChange}
                    required
                  />
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    name='category'
                    value={editingTemplate.category}
                    onChange={handleEditInputChange}
                  >
                    <option value='system'>System</option>
                    <option value='marketing'>Marketing</option>
                    <option value='transactional'>Transactional</option>
                    <option value='notification'>Notification</option>
                    <option value='other'>Other</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Tags (comma separated)</Form.Label>
                  <Form.Control
                    type='text'
                    name='tags'
                    placeholder='tag1, tag2, tag3'
                    value={(editingTemplate.tags || []).join(', ')}
                    onChange={handleEditTagsChange}
                  />
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Available Variables</Form.Label>
                  <div className='border p-3 rounded mb-3'>
                    {availableVariables.map((variable, index) => (
                      <Badge
                        key={index}
                        bg='light'
                        text='dark'
                        className='me-2 mb-2 cursor-pointer'
                        onClick={() => insertVariable(variable.value, true)}
                      >
                        {variable.label}
                      </Badge>
                    ))}
                  </div>
                </Form.Group>

                <Form.Group className='mb-3'>
                  <Form.Label>Template Content*</Form.Label>
                  <QuillEditor
                    ref={editQuillRef}
                    theme='snow'
                    value={editingTemplate.content}
                    onChange={handleEditContentChange}
                    modules={modules}
                    formats={formats}
                    style={{ height: '250px', marginBottom: '20px' }}
                  />
                </Form.Group>

                {/* Add File Attachments Section for Edit Modal */}
                <Form.Group className='mb-3'>
                  <FileAttachmentsSection
                    attachments={editingTemplate.attachments || []}
                    onRemove={(attachmentId) =>
                      handleRemoveAttachment(attachmentId, true)
                    }
                    onUpload={(files) => handleFileUpload(files, true)}
                    uploadingFiles={uploadingFiles}
                    uploadProgress={uploadProgress}
                    isEditMode={true}
                  />
                </Form.Group>

                {/* Email Signature Section */}
                <div className='border rounded p-3 mb-3'>
                  <Form.Group className='mb-3 d-flex align-items-center justify-content-between'>
                    <div>
                      <h5 style={{ margin: 0 }}>Email Signature</h5>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          color: '#6c757d',
                        }}
                      >
                        Include a professional email signature
                      </p>
                    </div>
                    <Form.Check
                      type='switch'
                      id='edit-include-signature-switch'
                      label='Include Signature'
                      name='includeSignature'
                      checked={editingTemplate.includeSignature}
                      onChange={handleEditInputChange}
                    />
                  </Form.Group>

                  {editingTemplate.includeSignature && (
                    <div className='mt-3'>
                      <Row className='mb-3'>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Organization Name</Form.Label>
                            <Form.Control
                              type='text'
                              name='organizationName'
                              placeholder='Your organization name'
                              value={
                                editingTemplate.signatureConfig
                                  ?.organizationName || ''
                              }
                              onChange={handleEditSignatureChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control
                              type='text'
                              name='fullName'
                              placeholder='Enter your name'
                              value={
                                editingTemplate.signatureConfig?.fullName || ''
                              }
                              onChange={handleEditSignatureChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row className='mb-3'>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Title/Position</Form.Label>
                            <Form.Control
                              type='text'
                              name='title'
                              placeholder='Enter your position'
                              value={
                                editingTemplate.signatureConfig?.title || ''
                              }
                              onChange={handleEditSignatureChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Phone Number</Form.Label>
                            <Form.Control
                              type='text'
                              name='phone'
                              placeholder='(123) 456-7890'
                              value={
                                editingTemplate.signatureConfig?.phone || ''
                              }
                              onChange={handleEditSignatureChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Row className='mb-3'>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                              type='email'
                              name='email'
                              placeholder='Enter your email address'
                              value={
                                editingTemplate.signatureConfig?.email || ''
                              }
                              onChange={handleEditSignatureChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Website</Form.Label>
                            <Form.Control
                              type='text'
                              name='website'
                              placeholder='Your url'
                              value={
                                editingTemplate.signatureConfig?.website || ''
                              }
                              onChange={handleEditSignatureChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className='mb-3'>
                        <Form.Label>Additional Information</Form.Label>
                        <Form.Control
                          as='textarea'
                          rows={2}
                          name='additionalInfo'
                          placeholder='Additional notes, social media links, etc.'
                          value={
                            editingTemplate.signatureConfig?.additionalInfo ||
                            ''
                          }
                          onChange={handleEditSignatureChange}
                        />
                        <Form.Text className='text-muted'>
                          This will appear below your contact information
                        </Form.Text>
                      </Form.Group>
                    </div>
                  )}
                </div>

                {/* Email Preview */}
                {editingTemplate.content && (
                  <Form.Group className='mt-5'>
                    <Form.Label>Preview</Form.Label>
                    <EmailPreview
                      content={editingTemplate.content}
                      includeSignature={editingTemplate.includeSignature}
                      signatureConfig={editingTemplate.signatureConfig}
                      attachments={editingTemplate.attachments}
                    />
                  </Form.Group>
                )}

                <Form.Group className='mb-3 d-flex align-items-center justify-content-between'>
                  <div>
                    <h5 style={{ margin: 0 }}>Template Status</h5>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: '#6c757d',
                      }}
                    >
                      Change the Status by toggle
                    </p>
                  </div>
                  <Form.Check
                    type='switch'
                    id='edit-status-switch'
                    label='Active'
                    name='status'
                    checked={editingTemplate.status}
                    onChange={handleEditInputChange}
                  />
                </Form.Group>

                <div
                  className='d-flex justify-content-end gap-2'
                  style={{
                    marginTop: '20px',
                    paddingTop: '15px',
                    borderTop: '1px solid #dee2e6',
                  }}
                >
                  <Button
                    variant='secondary'
                    onClick={() => setShowEditModal(false)}
                    className='px-4'
                  >
                    Cancel
                  </Button>
                  <Button
                    variant='primary'
                    type='submit'
                    disabled={
                      !editingTemplate.title ||
                      !editingTemplate.subject ||
                      !editingTemplate.content ||
                      isSaving
                    }
                    className='px-4'
                  >
                    {isSaving ? (
                      <>
                        <Spinner
                          as='span'
                          size='sm'
                          animation='border'
                          role='status'
                          aria-hidden='true'
                          className='me-2'
                        />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this template? This action cannot be
          undone.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant='secondary'
            onClick={() => setShowDeleteModal(false)}
            className='me-2'
          >
            Cancel
          </Button>
          <Button variant='danger' onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EmailTemplates;
