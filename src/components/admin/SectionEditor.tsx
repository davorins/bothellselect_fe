import React, { useState, useEffect } from 'react';
import { PageSection } from '../../types/page-builder-types';
import RichTextEditor from '../common/RichTextEditor';
import MediaUploader from '../common/MediaUploader';
import { X, Palette, Layout, Type, Image as ImageIcon } from 'lucide-react';

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

  useEffect(() => {
    setEditedSection(section);
  }, [section]);

  const handleUpdate = (updates: Partial<PageSection>) => {
    const updated = { ...editedSection, ...updates };
    setEditedSection(updated);
    onUpdate(updated);
  };

  const handleContentChange = (content: string) => {
    if (
      section.type === 'welcome' ||
      section.type === 'text' ||
      section.type === 'custom'
    ) {
      handleUpdate({ content });
    }
  };

  const handleStyleChange = (key: string, value: string) => {
    const updatedStyles = { ...editedSection.styles, [key]: value };
    handleUpdate({ styles: updatedStyles });
  };

  const handleConfigChange = (key: string, value: any) => {
    const updatedConfig = { ...editedSection.config, [key]: value };
    handleUpdate({ config: updatedConfig });
  };

  // Render content editor based on section type
  const renderContentEditor = () => {
    switch (editedSection.type) {
      case 'welcome':
      case 'text':
        return (
          <div className='content-editor'>
            <div className='mb-3'>
              <label className='form-label'>Section Title</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.title || ''}
                onChange={(e) => handleUpdate({ title: e.target.value })}
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Subtitle (Optional)</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.subtitle || ''}
                onChange={(e) => handleUpdate({ subtitle: e.target.value })}
              />
            </div>
            <div className='mb-3'>
              <label className='form-label'>Content</label>
              <RichTextEditor
                value={editedSection.content || ''}
                onChange={handleContentChange}
              />
            </div>
          </div>
        );

      case 'image':
        return (
          <div className='image-editor'>
            <div className='mb-3'>
              <label className='form-label'>Image</label>
              <MediaUploader
                value={editedSection.config?.media?.[0]?.url || ''}
                onChange={(url: string) => {
                  const media = editedSection.config?.media || [];
                  media[0] = {
                    ...media[0],
                    url,
                    alt: media[0]?.alt || editedSection.title || '',
                  };
                  handleConfigChange('media', media);
                }}
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
              />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className='video-editor'>
            <div className='mb-3'>
              <label className='form-label'>Video URL</label>
              <input
                type='text'
                className='form-control'
                value={editedSection.config?.videoUrl || ''}
                onChange={(e) => handleConfigChange('videoUrl', e.target.value)}
                placeholder='https://example.com/video.mp4'
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
              />
            </div>
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
            <div className='mb-3 form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                checked={editedSection.config?.loop || false}
                onChange={(e) => handleConfigChange('loop', e.target.checked)}
              />
              <label className='form-check-label'>Loop</label>
            </div>
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
        );

      case 'form':
        return (
          <div className='form-editor'>
            <div className='mb-3'>
              <label className='form-label'>Select Form</label>
              <select
                className='form-select'
                value={editedSection.config?.formId || ''}
                onChange={(e) => handleConfigChange('formId', e.target.value)}
              >
                <option value=''>Select a form...</option>
                {/* Populate with available forms */}
              </select>
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
              <label className='form-check-label'>Show Form Title</label>
            </div>
          </div>
        );

      case 'spotlight':
        return (
          <div className='spotlight-editor'>
            <div className='mb-3'>
              <label className='form-label'>Number of Items</label>
              <input
                type='number'
                className='form-control'
                min='1'
                max='10'
                value={editedSection.config?.limit || 1}
                onChange={(e) =>
                  handleConfigChange('limit', parseInt(e.target.value))
                }
              />
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
          </div>
        );

      case 'custom':
        return (
          <div className='custom-editor'>
            <div className='mb-3'>
              <label className='form-label'>Custom HTML</label>
              <textarea
                className='form-control font-monospace'
                rows={10}
                value={editedSection.config?.htmlContent || ''}
                onChange={(e) =>
                  handleConfigChange('htmlContent', e.target.value)
                }
                placeholder='Enter custom HTML here...'
              />
            </div>
          </div>
        );

      default:
        return (
          <div className='alert alert-info'>
            Editor for "{editedSection.type}" sections coming soon.
          </div>
        );
    }
  };

  const renderStyleEditor = () => (
    <div className='style-editor'>
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

      <div className='mb-3'>
        <label className='form-label'>Layout</label>
        <select
          className='form-select'
          value={editedSection.styles?.layout || 'container'}
          onChange={(e) => handleStyleChange('layout', e.target.value)}
        >
          <option value='container'>Container (centered)</option>
          <option value='full-width'>Full Width</option>
          <option value='boxed'>Boxed</option>
        </select>
      </div>

      <div className='mb-3 form-check'>
        <input
          type='checkbox'
          className='form-check-input'
          checked={editedSection.isActive}
          onChange={(e) => handleUpdate({ isActive: e.target.checked })}
        />
        <label className='form-check-label'>Section is Active</label>
      </div>
    </div>
  );

  const renderSettingsEditor = () => (
    <div className='settings-editor'>
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
        <label className='form-label'>CSS Classes</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.className || ''}
          onChange={(e) => handleStyleChange('className', e.target.value)}
          placeholder='my-custom-class another-class'
        />
        <small className='text-muted'>Additional CSS classes for styling</small>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Title CSS Classes</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.titleClass || ''}
          onChange={(e) => handleStyleChange('titleClass', e.target.value)}
          placeholder='text-center text-primary'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Content CSS Classes</label>
        <input
          type='text'
          className='form-control'
          value={editedSection.styles?.contentClass || ''}
          onChange={(e) => handleStyleChange('contentClass', e.target.value)}
          placeholder='bg-light p-3 rounded'
        />
      </div>
    </div>
  );

  return (
    <div className='section-editor'>
      <div className='d-flex justify-content-between align-items-center mb-3'>
        <h5 className='mb-0'>Edit Section</h5>
        <button className='btn btn-sm btn-outline-secondary' onClick={onClose}>
          <X size={16} />
        </button>
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
        <button
          className='btn btn-primary w-100'
          onClick={() => onUpdate(editedSection)}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default SectionEditor;
