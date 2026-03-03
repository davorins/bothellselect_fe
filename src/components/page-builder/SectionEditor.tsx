// src/components/page-builder/SectionEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { PageSection } from '../../types/page-builder-types';
import RichTextEditor from '../common/RichTextEditor';
import MediaUploader from '../common/MediaUploader';
import HtmlRenderer from '../common/HtmlRenderer';
import {
  X,
  Palette,
  Layout,
  Type,
  Image as ImageIcon,
  Save,
} from 'lucide-react';

interface SectionEditorProps {
  section: PageSection;
  onUpdate: (section: PageSection) => void;
  onClose: () => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  onUpdate,
  onClose,
}) => {
  const [editedSection, setEditedSection] = useState<PageSection>(section);
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'settings'>(
    'content'
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setEditedSection(section);
    setHasChanges(false);
  }, [section]);

  useEffect(() => {
    fetchAvailableForms();
  }, []);

  const fetchAvailableForms = async () => {
    try {
      setLoadingForms(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/forms/published`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableForms(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoadingForms(false);
    }
  };

  // Handle updates - mark as changed but don't auto-save
  const handleUpdate = useCallback(
    (updates: Partial<PageSection>) => {
      const updated = { ...editedSection, ...updates };
      setEditedSection(updated);
      setHasChanges(true);

      // AUTO-SAVE: Update parent immediately
      console.log('💾 SectionEditor: Auto-saving changes...');
      onUpdate(updated);
      setHasChanges(false); // Reset since we're auto-saving
    },
    [editedSection, onUpdate]
  );

  // Handle content change for text-based sections
  const handleContentChange = (html: string) => {
    if (
      section.type === 'welcome' ||
      section.type === 'text' ||
      section.type === 'custom'
    ) {
      handleUpdate({ content: html });
    }
  };
  // Handle style changes
  const handleStyleChange = (key: string, value: string) => {
    const updatedStyles = { ...editedSection.styles, [key]: value };
    handleUpdate({ styles: updatedStyles });
  };

  // Handle config changes
  const handleConfigChange = (key: string, value: any) => {
    const updatedConfig = { ...editedSection.config, [key]: value };
    handleUpdate({ config: updatedConfig });
  };

  // Handle input changes properly
  const handleInputChange = (
    field: keyof PageSection,
    value: string | boolean
  ) => {
    handleUpdate({ [field]: value });
  };

  // Render content editor based on section type
  const renderContentEditor = () => {
    const commonFields = (
      <>
        <div className='mb-3'>
          <label className='form-label'>Section Title</label>
          <input
            type='text'
            className='form-control'
            value={editedSection.title || ''}
            onChange={(e) => handleInputChange('title', e.target.value)}
          />
        </div>

        {/* Add Text Alignment Controls */}
        <div className='mb-3'>
          <label className='form-label'>Title Alignment</label>
          <div className='btn-group w-100' role='group'>
            {[
              { value: 'left', icon: '≡', label: 'Left' },
              { value: 'center', icon: '☰', label: 'Center' },
              { value: 'right', icon: '≡', label: 'Right' },
            ].map((alignment) => (
              <button
                key={alignment.value}
                type='button'
                className={`btn btn-outline-secondary ${
                  (editedSection.config?.titleAlignment || 'center') ===
                  alignment.value
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleConfigChange('titleAlignment', alignment.value)
                }
                title={alignment.label}
              >
                <span
                  style={{
                    transform:
                      alignment.value === 'left'
                        ? 'none'
                        : alignment.value === 'right'
                        ? 'scaleX(-1)'
                        : 'none',
                  }}
                >
                  {alignment.icon}
                </span>
                <span className='ms-1 d-none d-sm-inline'>
                  {alignment.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className='mb-3'>
          <label className='form-label'>Content Alignment</label>
          <div className='btn-group w-100' role='group'>
            {[
              { value: 'left', icon: '≡', label: 'Left' },
              { value: 'center', icon: '☰', label: 'Center' },
              { value: 'right', icon: '≡', label: 'Right' },
            ].map((alignment) => (
              <button
                key={alignment.value}
                type='button'
                className={`btn btn-outline-secondary ${
                  (editedSection.config?.contentAlignment || 'left') ===
                  alignment.value
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleConfigChange('contentAlignment', alignment.value)
                }
                title={alignment.label}
              >
                <span
                  style={{
                    transform:
                      alignment.value === 'left'
                        ? 'none'
                        : alignment.value === 'right'
                        ? 'scaleX(-1)'
                        : 'none',
                  }}
                >
                  {alignment.icon}
                </span>
                <span className='ms-1 d-none d-sm-inline'>
                  {alignment.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className='mb-3'>
          <label className='form-label'>Subtitle (Optional)</label>
          <input
            type='text'
            className='form-control'
            value={editedSection.subtitle || ''}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
          />
        </div>
        <div className='mb-3 form-check'>
          <input
            type='checkbox'
            className='form-check-input'
            checked={editedSection.config?.showTitle !== false}
            onChange={(e) => handleConfigChange('showTitle', e.target.checked)}
          />
          <label className='form-check-label'>Show Title on Page</label>
        </div>
      </>
    );

    switch (editedSection.type) {
      case 'welcome':
      case 'text':
        return (
          <div className='content-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Content</label>
              <RichTextEditor
                value={editedSection.content || ''}
                onChange={handleContentChange}
              />
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className='cta-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Button Text</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.buttonText || 'Get Started'}
                onChange={(e) =>
                  handleConfigChange('buttonText', e.target.value)
                }
                placeholder='e.g., Register Now'
              />
            </div>

            <div className='mb-3'>
              <label className='form-label'>Button Link</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.buttonLink || ''}
                onChange={(e) =>
                  handleConfigChange('buttonLink', e.target.value)
                }
                placeholder='e.g., /register or https://example.com'
              />
            </div>

            <div className='mb-3'>
              <label className='form-label'>Button Style</label>
              <select
                className='form-select'
                value={editedSection.config?.buttonStyle || 'primary'}
                onChange={(e) =>
                  handleConfigChange('buttonStyle', e.target.value)
                }
              >
                <option value='primary'>Primary (Solid)</option>
                <option value='secondary'>Secondary (Outline)</option>
                <option value='success'>Success (Green)</option>
                <option value='danger'>Danger (Red)</option>
                <option value='warning'>Warning (Yellow)</option>
                <option value='info'>Info (Blue)</option>
                <option value='light'>Light</option>
                <option value='dark'>Dark</option>
              </select>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Button Size</label>
              <select
                className='form-select'
                value={editedSection.config?.buttonSize || 'lg'}
                onChange={(e) =>
                  handleConfigChange('buttonSize', e.target.value)
                }
              >
                <option value='sm'>Small</option>
                <option value='md'>Medium</option>
                <option value='lg'>Large</option>
                <option value='xl'>Extra Large</option>
              </select>
            </div>

            <div className='mb-3 form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                checked={editedSection.config?.openInNewTab || false}
                onChange={(e) =>
                  handleConfigChange('openInNewTab', e.target.checked)
                }
              />
              <label className='form-check-label'>Open link in new tab</label>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Text Alignment</label>
              <select
                className='form-select'
                value={editedSection.config?.alignment || 'center'}
                onChange={(e) =>
                  handleConfigChange('alignment', e.target.value)
                }
              >
                <option value='left'>Left</option>
                <option value='center'>Center</option>
                <option value='right'>Right</option>
              </select>
            </div>

            <div className='mb-3'>
              <label className='form-label'>
                Background Image URL (Optional)
              </label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.backgroundImage || ''}
                onChange={(e) =>
                  handleConfigChange('backgroundImage', e.target.value)
                }
                placeholder='https://example.com/background.jpg'
              />
            </div>

            <div className='mb-3'>
              <label className='form-label'>Overlay Opacity</label>
              <input
                type='range'
                className='form-range'
                min='0'
                max='1'
                step='0.1'
                value={editedSection.config?.overlayOpacity || 0.5}
                onChange={(e) =>
                  handleConfigChange(
                    'overlayOpacity',
                    parseFloat(e.target.value)
                  )
                }
              />
              <small className='text-muted'>
                {(editedSection.config?.overlayOpacity || 0.5) * 100}% overlay
              </small>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className='image-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Image URL</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.media?.[0]?.url || ''}
                onChange={(e) => {
                  const media = editedSection.config?.media || [];
                  media[0] = { ...media[0], url: e.target.value };
                  handleConfigChange('media', media);
                }}
                placeholder='https://example.com/image.jpg'
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Image Alt Text</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.media?.[0]?.alt || ''}
                onChange={(e) => {
                  const media = editedSection.config?.media || [];
                  media[0] = { ...media[0], alt: e.target.value };
                  handleConfigChange('media', media);
                }}
                placeholder='Description for screen readers'
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Caption</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.media?.[0]?.caption || ''}
                onChange={(e) => {
                  const media = editedSection.config?.media || [];
                  media[0] = { ...media[0], caption: e.target.value };
                  handleConfigChange('media', media);
                }}
                placeholder='Optional caption text'
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Alignment</label>
              <select
                className='form-select'
                value={editedSection.config?.media?.[0]?.alignment || 'center'}
                onChange={(e) => {
                  const media = editedSection.config?.media || [];
                  media[0] = {
                    ...media[0],
                    alignment: e.target.value as
                      | 'left'
                      | 'right'
                      | 'center'
                      | 'full',
                  };
                  handleConfigChange('media', media);
                }}
              >
                <option value='left'>Left</option>
                <option value='center'>Center</option>
                <option value='right'>Right</option>
                <option value='full'>Full Width</option>
              </select>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className='video-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Video URL</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.videoUrl || ''}
                onChange={(e) => handleConfigChange('videoUrl', e.target.value)}
                placeholder='https://example.com/video.mp4 or YouTube/Vimeo URL'
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Thumbnail URL (Optional)</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.thumbnailUrl || ''}
                onChange={(e) =>
                  handleConfigChange('thumbnailUrl', e.target.value)
                }
                placeholder='https://example.com/thumbnail.jpg'
              />
            </div>
            <div className='row'>
              <div className='col-6'>
                <div className='mb-3 form-check'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={editedSection.config?.autoplay || false}
                    onChange={(e) =>
                      handleConfigChange('autoplay', e.target.checked)
                    }
                  />
                  <label className='form-check-label'>Autoplay</label>
                </div>
              </div>
              <div className='col-6'>
                <div className='mb-3 form-check'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={editedSection.config?.loop || false}
                    onChange={(e) =>
                      handleConfigChange('loop', e.target.checked)
                    }
                  />
                  <label className='form-check-label'>Loop</label>
                </div>
              </div>
            </div>
            <div className='row'>
              <div className='col-6'>
                <div className='mb-3 form-check'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={editedSection.config?.showControls !== false}
                    onChange={(e) =>
                      handleConfigChange('showControls', e.target.checked)
                    }
                  />
                  <label className='form-check-label'>Show Controls</label>
                </div>
              </div>
              <div className='col-6'>
                <div className='mb-3 form-check'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={editedSection.config?.muted || false}
                    onChange={(e) =>
                      handleConfigChange('muted', e.target.checked)
                    }
                  />
                  <label className='form-check-label'>Muted</label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'form':
        return (
          <div className='form-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Form Type</label>
              <div className='alert alert-info mb-3'>
                <small>
                  <strong>Note:</strong> This section will embed a form from the
                  Form Builder module. You can choose from published forms or
                  use a custom form ID.
                </small>
              </div>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Select Form</label>
              <select
                className='form-select'
                value={editedSection.config?.formId || ''}
                onChange={(e) => handleConfigChange('formId', e.target.value)}
              >
                <option value=''>-- Select a form --</option>
                {availableForms?.map((form: any) => (
                  <option key={form._id} value={form._id}>
                    {form.title} {form.isActive ? '(Active)' : '(Inactive)'}
                  </option>
                ))}
              </select>
              <small className='text-muted'>
                Only active forms are recommended for use
              </small>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Or Enter Form ID Manually</label>
              <input
                type='text'
                className='form-control font-monospace'
                value={editedSection.config?.formId || ''}
                onChange={(e) => handleConfigChange('formId', e.target.value)}
                placeholder='e.g., 658a1b2c3d4e5f6789012345'
              />
              <small className='text-muted'>
                Enter the exact Form ID from the Form Builder
              </small>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Custom Form Title (Optional)</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.formTitle || ''}
                onChange={(e) =>
                  handleConfigChange('formTitle', e.target.value)
                }
                placeholder='Leave empty to use form default title'
              />
            </div>

            <div className='mb-3'>
              <label className='form-label'>Form Container Style</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.styles?.className || ''}
                onChange={(e) => handleStyleChange('className', e.target.value)}
                placeholder='e.g., custom-form-container bg-light p-4 rounded'
              />
            </div>

            <div className='row mb-3'>
              <div className='col-6'>
                <div className='form-check'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={editedSection.config?.showFormTitle !== false}
                    onChange={(e) =>
                      handleConfigChange('showFormTitle', e.target.checked)
                    }
                  />
                  <label className='form-check-label'>Show Form Title</label>
                </div>
              </div>
              <div className='col-6'>
                <div className='form-check'>
                  <input
                    type='checkbox'
                    className='form-check-input'
                    checked={
                      editedSection.config?.showFormDescription !== false
                    }
                    onChange={(e) =>
                      handleConfigChange(
                        'showFormDescription',
                        e.target.checked
                      )
                    }
                  />
                  <label className='form-check-label'>
                    Show Form Description
                  </label>
                </div>
              </div>
            </div>

            {/* Add a preview button */}
            {editedSection.config?.formId && (
              <div className='mt-3'>
                <button
                  type='button'
                  className='btn btn-outline-info btn-sm'
                  onClick={() => {
                    // Open form preview in new tab
                    window.open(
                      `/forms/preview/${editedSection.config?.formId}`,
                      '_blank'
                    );
                  }}
                >
                  Preview Selected Form
                </button>
              </div>
            )}
          </div>
        );

      case 'spotlight':
        return (
          <div className='spotlight-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Number of Items to Show</label>
              <input
                type='number'
                className='form-control'
                min='1'
                max='12'
                value={editedSection.config?.limit || 3}
                onChange={(e) =>
                  handleConfigChange('limit', parseInt(e.target.value) || 3)
                }
              />
            </div>
            <div className='mb-3 form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                checked={editedSection.config?.showFeatured || false}
                onChange={(e) =>
                  handleConfigChange('showFeatured', e.target.checked)
                }
              />
              <label className='form-check-label'>
                Show Featured Items First
              </label>
            </div>
            <div className='mb-3 form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                checked={editedSection.config?.showViewAll || false}
                onChange={(e) =>
                  handleConfigChange('showViewAll', e.target.checked)
                }
              />
              <label className='form-check-label'>Show "View All" Link</label>
            </div>
            {editedSection.config?.showViewAll && (
              <div className='mb-3'>
                <label className='form-label'>View All Link</label>
                <input
                  type='text'
                  className='form-control'
                  value={editedSection.config?.viewAllLink || '/spotlight'}
                  onChange={(e) =>
                    handleConfigChange('viewAllLink', e.target.value)
                  }
                  placeholder='/spotlight'
                />
              </div>
            )}
          </div>
        );

      case 'custom':
        return (
          <div className='custom-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Custom HTML Content</label>
              <textarea
                className='form-control font-monospace'
                rows={10}
                value={editedSection.config?.htmlContent || ''}
                onChange={(e) =>
                  handleConfigChange('htmlContent', e.target.value)
                }
                placeholder='Enter custom HTML here...'
                style={{ fontSize: '12px' }}
              />
            </div>
            <div className='alert alert-info'>
              <small>
                <strong>Note:</strong> This HTML will be rendered directly. Make
                sure it's valid and secure.
              </small>
            </div>
          </div>
        );

      case 'sponsors':
        return (
          <div className='sponsors-editor'>
            {commonFields}
            <div className='mb-3'>
              <label className='form-label'>Sponsor Logos</label>
              <p className='small text-muted mb-2'>
                Upload or add sponsor logos and information.
              </p>
              <div className='sponsors-list mb-3'>
                {(editedSection.config?.media || []).map((sponsor, index) => (
                  <div key={index} className='sponsor-item card mb-2'>
                    <div className='card-body'>
                      <div className='d-flex justify-content-between align-items-center mb-2'>
                        <h6 className='mb-0'>Sponsor {index + 1}</h6>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-danger'
                          onClick={() => {
                            const media = [
                              ...(editedSection.config?.media || []),
                            ];
                            media.splice(index, 1);
                            handleConfigChange('media', media);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <div className='row g-2'>
                        <div className='col-12'>
                          <label className='form-label small'>Logo URL</label>
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            value={sponsor.url || ''}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                url: e.target.value,
                              };
                              handleConfigChange('media', media);
                            }}
                            placeholder='https://example.com/logo.png'
                          />
                        </div>
                        <div className='col-6'>
                          <label className='form-label small'>
                            Sponsor Name
                          </label>
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            value={sponsor.name || ''}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                name: e.target.value,
                              };
                              handleConfigChange('media', media);
                            }}
                            placeholder='Company Name'
                          />
                        </div>
                        <div className='col-6'>
                          <label className='form-label small'>
                            Website Link
                          </label>
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            value={sponsor.link || ''}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                link: e.target.value,
                              };
                              handleConfigChange('media', media);
                            }}
                            placeholder='https://company.com'
                          />
                        </div>
                        <div className='col-6'>
                          <label className='form-label small'>
                            Sponsor Level
                          </label>
                          <select
                            className='form-select form-select-sm'
                            value={sponsor.level || 'bronze'}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                level: e.target.value,
                              };
                              handleConfigChange('media', media);
                            }}
                          >
                            <option value='platinum'>Platinum</option>
                            <option value='gold'>Gold</option>
                            <option value='silver'>Silver</option>
                            <option value='bronze'>Bronze</option>
                          </select>
                        </div>
                        <div className='col-6'>
                          <label className='form-label small'>
                            Level Color
                          </label>
                          <select
                            className='form-select form-select-sm'
                            value={sponsor.levelColor || 'primary'}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                levelColor: e.target.value,
                              };
                              handleConfigChange('media', media);
                            }}
                          >
                            <option value='primary'>Blue (Primary)</option>
                            <option value='warning'>Gold</option>
                            <option value='secondary'>Silver</option>
                            <option value='danger'>Bronze</option>
                            <option value='success'>Green</option>
                            <option value='info'>Cyan</option>
                            <option value='dark'>Black</option>
                          </select>
                        </div>
                        <div className='col-12'>
                          <label className='form-label small'>
                            Description
                          </label>
                          <textarea
                            className='form-control form-control-sm'
                            rows={2}
                            value={sponsor.description || ''}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                description: e.target.value,
                              };
                              handleConfigChange('media', media);
                            }}
                            placeholder='Brief description of sponsorship'
                          />
                        </div>
                        <div className='col-6'>
                          <div className='form-check'>
                            <input
                              type='checkbox'
                              className='form-check-input'
                              checked={sponsor.grayscale || false}
                              onChange={(e) => {
                                const media = [
                                  ...(editedSection.config?.media || []),
                                ];
                                media[index] = {
                                  ...media[index],
                                  grayscale: e.target.checked,
                                };
                                handleConfigChange('media', media);
                              }}
                            />
                            <label className='form-check-label small'>
                              Grayscale
                            </label>
                          </div>
                        </div>
                        <div className='col-6'>
                          <label className='form-label small'>Opacity</label>
                          <input
                            type='range'
                            className='form-range'
                            min='0'
                            max='1'
                            step='0.1'
                            value={sponsor.opacity || 1}
                            onChange={(e) => {
                              const media = [
                                ...(editedSection.config?.media || []),
                              ];
                              media[index] = {
                                ...media[index],
                                opacity: parseFloat(e.target.value),
                              };
                              handleConfigChange('media', media);
                            }}
                          />
                          <small className='text-muted'>
                            {(sponsor.opacity || 1) * 100}%
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type='button'
                className='btn btn-outline-primary btn-sm w-100'
                onClick={() => {
                  const media = [...(editedSection.config?.media || [])];
                  media.push({
                    url: '',
                    name: '',
                    link: '',
                    level: 'bronze',
                    levelColor: 'primary',
                    description: '',
                    grayscale: false,
                    opacity: 1,
                  });
                  handleConfigChange('media', media);
                }}
              >
                + Add Sponsor
              </button>
            </div>
            <div className='mb-3'>
              <label className='form-label'>Logo Height</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.logoHeight || '80px'}
                onChange={(e) =>
                  handleConfigChange('logoHeight', e.target.value)
                }
                placeholder='80px'
              />
              <small className='text-muted'>
                Maximum height for sponsor logos (e.g., 60px, 80px, 100px)
              </small>
            </div>
            <div className='mb-3'>
              <label className='form-label'>Grid Columns (Desktop)</label>
              <select
                className='form-select'
                value={editedSection.config?.columns || 4}
                onChange={(e) =>
                  handleConfigChange('columns', parseInt(e.target.value))
                }
              >
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={6}>6 Columns</option>
              </select>
            </div>
            <div className='mb-3'>
              <label className='form-label'>Custom CSS Classes</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.className || ''}
                onChange={(e) =>
                  handleConfigChange('className', e.target.value)
                }
                placeholder='sponsor-grid custom-sponsor'
              />
            </div>
            <div className='mb-3 form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                checked={editedSection.config?.showTitle !== false}
                onChange={(e) =>
                  handleConfigChange('showTitle', e.target.checked)
                }
              />
              <label className='form-check-label'>Show Section Title</label>
            </div>
          </div>
        );

      default:
        return (
          <div className='content-editor'>
            {commonFields}
            <div className='alert alert-info'>
              Editor for "{editedSection.type}" sections coming soon.
            </div>
          </div>
        );
    }
  };

  const renderStyleEditor = () => (
    <div className='style-editor'>
      <h6 className='mb-3'>Typography</h6>
      <div className='row mb-3'>
        <div className='col-6'>
          <label className='form-label'>Title Size</label>
          <select
            className='form-select'
            value={editedSection.styles?.titleSize || '2rem'}
            onChange={(e) => handleStyleChange('titleSize', e.target.value)}
          >
            <option value='1.5rem'>Small (1.5rem)</option>
            <option value='2rem'>Medium (2rem)</option>
            <option value='2.5rem'>Large (2.5rem)</option>
            <option value='3rem'>Extra Large (3rem)</option>
            <option value='custom'>Custom</option>
          </select>
        </div>
        <div className='col-6'>
          <label className='form-label'>Title Weight</label>
          <select
            className='form-select'
            value={editedSection.styles?.titleWeight || 'bold'}
            onChange={(e) => handleStyleChange('titleWeight', e.target.value)}
          >
            <option value='normal'>Normal</option>
            <option value='500'>Medium</option>
            <option value='600'>Semi Bold</option>
            <option value='bold'>Bold</option>
            <option value='800'>Extra Bold</option>
          </select>
        </div>
      </div>

      <div className='row mb-3'>
        <div className='col-6'>
          <label className='form-label'>Title Color</label>
          <div className='d-flex align-items-center'>
            <input
              type='color'
              className='form-control form-control-color me-2'
              value={
                editedSection.styles?.titleColor ||
                editedSection.styles?.textColor ||
                '#333333'
              }
              onChange={(e) => handleStyleChange('titleColor', e.target.value)}
            />
            <input
              type='text'
              className='form-control'
              value={
                editedSection.styles?.titleColor ||
                editedSection.styles?.textColor ||
                ''
              }
              onChange={(e) => handleStyleChange('titleColor', e.target.value)}
              placeholder='#333333'
            />
          </div>
        </div>
        <div className='col-6'>
          <label className='form-label'>Title Font Family</label>
          <select
            className='form-select'
            value={editedSection.styles?.titleFontFamily || 'inherit'}
            onChange={(e) =>
              handleStyleChange('titleFontFamily', e.target.value)
            }
          >
            <option value='inherit'>Default (Inherit)</option>
            <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">
              Helvetica/Arial
            </option>
            <option value="Georgia, 'Times New Roman', Times, serif">
              Georgia/Times
            </option>
            <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">
              Segoe UI
            </option>
            <option value="'Roboto', 'Open Sans', sans-serif">
              Roboto/Open Sans
            </option>
            <option value="'Montserrat', sans-serif">Montserrat</option>
            <option value="'Poppins', sans-serif">Poppins</option>
          </select>
        </div>
      </div>

      <h6 className='mb-3'>Layout & Spacing</h6>
      <div className='mb-3'>
        <label className='form-label'>Layout Type</label>
        <select
          className='form-select'
          value={editedSection.styles?.layout || 'container'}
          onChange={(e) => handleStyleChange('layout', e.target.value)}
        >
          <option value='full-width'>Full Width</option>
          <option value='container'>Container (Centered)</option>
          <option value='boxed'>Boxed</option>
        </select>
      </div>

      <div className='row mb-3'>
        <div className='col-6'>
          <label className='form-label'>Padding Top</label>
          <input
            type='text'
            className='form-control'
            value={editedSection.styles?.paddingTop || ''}
            onChange={(e) => handleStyleChange('paddingTop', e.target.value)}
            placeholder='2rem'
          />
        </div>
        <div className='col-6'>
          <label className='form-label'>Padding Bottom</label>
          <input
            type='text'
            className='form-control'
            value={editedSection.styles?.paddingBottom || ''}
            onChange={(e) => handleStyleChange('paddingBottom', e.target.value)}
            placeholder='2rem'
          />
        </div>
      </div>

      <h6 className='mb-3 mt-4'>Colors</h6>
      <div className='mb-3'>
        <label className='form-label'>Background Color</label>
        <div className='d-flex align-items-center'>
          <input
            type='color'
            className='form-control form-control-color me-2'
            value={editedSection.styles?.backgroundColor || '#ffffff'}
            onChange={(e) =>
              handleStyleChange('backgroundColor', e.target.value)
            }
          />
          <input
            type='text'
            className='form-control'
            value={editedSection.styles?.backgroundColor || ''}
            onChange={(e) =>
              handleStyleChange('backgroundColor', e.target.value)
            }
            placeholder='#ffffff or transparent'
          />
        </div>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Text Color</label>
        <div className='d-flex align-items-center'>
          <input
            type='color'
            className='form-control form-control-color me-2'
            value={editedSection.styles?.textColor || '#333333'}
            onChange={(e) => handleStyleChange('textColor', e.target.value)}
          />
          <input
            type='text'
            className='form-control'
            value={editedSection.styles?.textColor || ''}
            onChange={(e) => handleStyleChange('textColor', e.target.value)}
            placeholder='#333333'
          />
        </div>
      </div>

      <h6 className='mb-3 mt-4'>Typography</h6>
      <div className='row mb-3'>
        <div className='col-6'>
          <label className='form-label'>Title Size</label>
          <input
            type='text'
            className='form-control'
            value={editedSection.styles?.titleSize || ''}
            onChange={(e) => handleStyleChange('titleSize', e.target.value)}
            placeholder='2rem'
          />
        </div>
        <div className='col-6'>
          <label className='form-label'>Content Size</label>
          <input
            type='text'
            className='form-control'
            value={editedSection.styles?.contentSize || ''}
            onChange={(e) => handleStyleChange('contentSize', e.target.value)}
            placeholder='1rem'
          />
        </div>
      </div>

      <h6 className='mb-3 mt-4'>Section Status</h6>
      <div className='mb-3 form-check'>
        <input
          type='checkbox'
          className='form-check-input'
          checked={editedSection.isActive}
          onChange={(e) => handleUpdate({ isActive: e.target.checked })}
        />
        <label className='form-check-label'>
          Section is Active (visible on page)
        </label>
      </div>
    </div>
  );

  const renderSettingsEditor = () => (
    <div className='settings-editor'>
      <h6 className='mb-3'>Identification</h6>
      <div className='mb-3'>
        <label className='form-label'>Section ID</label>
        <input
          type='text'
          className='form-control font-monospace'
          value={editedSection.id}
          readOnly
        />
        <small className='text-muted'>Unique identifier for this section</small>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Section Type</label>
        <input
          type='text'
          className='form-control font-monospace'
          value={editedSection.type}
          readOnly
        />
      </div>

      <h6 className='mb-3 mt-4'>Custom CSS Classes</h6>
      <div className='mb-3'>
        <label className='form-label'>Container Classes</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.className || ''}
          onChange={(e) => handleStyleChange('className', e.target.value)}
          placeholder='my-custom-class another-class'
        />
        <small className='text-muted'>
          Additional CSS classes for the section container
        </small>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Title Classes</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.titleClass || ''}
          onChange={(e) => handleStyleChange('titleClass', e.target.value)}
          placeholder='text-center text-primary fw-bold'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Content Classes</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.contentClass || ''}
          onChange={(e) => handleStyleChange('contentClass', e.target.value)}
          placeholder='bg-light p-3 rounded'
        />
      </div>

      <h6 className='mb-3 mt-4'>Borders & Shadows</h6>
      <div className='mb-3'>
        <label className='form-label'>Border Radius</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.borderRadius || ''}
          onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
          placeholder='0.5rem'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Box Shadow</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.boxShadow || ''}
          onChange={(e) => handleStyleChange('boxShadow', e.target.value)}
          placeholder='0 2px 4px rgba(0,0,0,0.1)'
        />
      </div>
    </div>
  );

  return (
    <div className='section-editor'>
      <div className='d-flex justify-content-between align-items-center mb-3'>
        <h5 className='mb-0'>Edit Section</h5>
        <div className='d-flex gap-2'>
          {hasChanges && (
            <span className='badge bg-warning'>Unsaved Changes</span>
          )}
          <button
            className='btn btn-sm btn-outline-secondary'
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className='mb-3'>
        <div className='d-flex border-bottom'>
          <button
            className={`btn btn-tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <Type size={16} className='me-1' />
            Content
          </button>
          <button
            className={`btn btn-tab ${activeTab === 'style' ? 'active' : ''}`}
            onClick={() => setActiveTab('style')}
          >
            <Palette size={16} className='me-1' />
            Style
          </button>
          <button
            className={`btn btn-tab ${
              activeTab === 'settings' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('settings')}
          >
            <Layout size={16} className='me-1' />
            Settings
          </button>
        </div>
      </div>

      <div className='editor-content'>
        {activeTab === 'content' && renderContentEditor()}
        {activeTab === 'style' && renderStyleEditor()}
        {activeTab === 'settings' && renderSettingsEditor()}
      </div>

      <div className='mt-3'>
        <button className='btn btn-primary w-100' onClick={onClose}>
          <Save size={16} className='me-1' />
          Done Editing
        </button>
        <small className='text-muted d-block mt-1 text-center'>
          Changes are saved automatically
        </small>
      </div>
    </div>
  );
};

export default SectionEditor;
