// src/components/page-builder/editors/CTAEditor.tsx
import React from 'react';
import { PageSection } from '../../../types/page-builder-types';

interface CTAEditorProps {
  section: PageSection;
  onUpdate: (section: PageSection) => void;
}

const CTAEditor: React.FC<CTAEditorProps> = ({ section, onUpdate }) => {
  const handleInputChange = (field: string, value: any) => {
    onUpdate({
      ...section,
      [field]: value,
      updatedAt: new Date(),
    });
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdate({
      ...section,
      config: {
        ...section.config,
        [key]: value,
      },
      updatedAt: new Date(),
    });
  };

  const handleStyleChange = (key: string, value: string) => {
    onUpdate({
      ...section,
      styles: {
        ...section.styles,
        [key]: value,
      },
      updatedAt: new Date(),
    });
  };

  return (
    <div className='cta-editor'>
      <div className='mb-3'>
        <label className='form-label'>CTA Title</label>
        <input
          type='text'
          className='form-control'
          value={section.title || ''}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder='e.g., Ready to Get Started?'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>CTA Subtitle</label>
        <textarea
          className='form-control'
          rows={3}
          value={section.subtitle || ''}
          onChange={(e) => handleInputChange('subtitle', e.target.value)}
          placeholder='e.g., Join our community today and start your journey!'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Button Text</label>
        <input
          type='text'
          className='form-control'
          value={section.config?.buttonText || 'Get Started'}
          onChange={(e) => handleConfigChange('buttonText', e.target.value)}
          placeholder='e.g., Register Now'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Button Link</label>
        <input
          type='text'
          className='form-control'
          value={section.config?.buttonLink || ''}
          onChange={(e) => handleConfigChange('buttonLink', e.target.value)}
          placeholder='e.g., /register or https://example.com'
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Button Style</label>
        <select
          className='form-select'
          value={section.config?.buttonStyle || 'primary'}
          onChange={(e) => handleConfigChange('buttonStyle', e.target.value)}
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
          value={section.config?.buttonSize || 'lg'}
          onChange={(e) => handleConfigChange('buttonSize', e.target.value)}
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
          checked={section.config?.openInNewTab || false}
          onChange={(e) => handleConfigChange('openInNewTab', e.target.checked)}
        />
        <label className='form-check-label'>Open link in new tab</label>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Background Color</label>
        <div className='d-flex align-items-center'>
          <input
            type='color'
            className='form-control form-control-color me-2'
            value={section.styles?.backgroundColor || '#f8f9fa'}
            onChange={(e) =>
              handleStyleChange('backgroundColor', e.target.value)
            }
          />
          <input
            type='text'
            className='form-control'
            value={section.styles?.backgroundColor || ''}
            onChange={(e) =>
              handleStyleChange('backgroundColor', e.target.value)
            }
            placeholder='e.g., #f8f9fa'
          />
        </div>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Text Alignment</label>
        <select
          className='form-select'
          value={section.config?.alignment || 'center'}
          onChange={(e) => handleConfigChange('alignment', e.target.value)}
        >
          <option value='left'>Left</option>
          <option value='center'>Center</option>
          <option value='right'>Right</option>
        </select>
      </div>

      <div className='mb-3'>
        <label className='form-label'>Custom CSS Classes</label>
        <input
          type='text'
          className='form-control'
          value={section.styles?.className || ''}
          onChange={(e) => handleStyleChange('className', e.target.value)}
          placeholder='e.g., cta-banner rounded shadow'
        />
      </div>

      <div className='mb-3 form-check'>
        <input
          type='checkbox'
          className='form-check-input'
          checked={section.config?.showTitle !== false}
          onChange={(e) => handleConfigChange('showTitle', e.target.checked)}
        />
        <label className='form-check-label'>Show Title</label>
      </div>

      <div className='mb-3 form-check'>
        <input
          type='checkbox'
          className='form-check-input'
          checked={section.config?.showSubtitle !== false}
          onChange={(e) => handleConfigChange('showSubtitle', e.target.checked)}
        />
        <label className='form-check-label'>Show Subtitle</label>
      </div>
    </div>
  );
};

export default CTAEditor;
