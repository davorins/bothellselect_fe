// src/components/common/MediaUploader.tsx
import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface MediaUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  value = '',
  onChange,
  placeholder = 'Enter image URL or upload...',
}) => {
  const [imageUrl, setImageUrl] = useState(value);
  const [isUploading, setIsUploading] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    onChange(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Simulate upload (replace with actual upload logic)
    setTimeout(() => {
      const mockUrl = URL.createObjectURL(file);
      setImageUrl(mockUrl);
      onChange(mockUrl);
      setIsUploading(false);
    }, 1000);
  };

  const handleClear = () => {
    setImageUrl('');
    onChange('');
  };

  return (
    <div className='media-uploader'>
      {imageUrl ? (
        <div className='image-preview mb-3'>
          <div className='position-relative'>
            <img
              src={imageUrl}
              alt='Preview'
              className='img-fluid rounded border'
              style={{ maxHeight: '150px' }}
            />
            <button
              type='button'
              className='btn btn-sm btn-danger position-absolute top-0 end-0 m-1'
              onClick={handleClear}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className='upload-placeholder mb-3 text-center p-4 border rounded bg-light'>
          <ImageIcon size={48} className='text-muted mb-2' />
          <p className='text-muted mb-0'>No image selected</p>
        </div>
      )}

      <div className='mb-3'>
        <label className='form-label'>Image URL</label>
        <input
          type='text'
          className='form-control'
          value={imageUrl}
          onChange={handleUrlChange}
          placeholder={placeholder}
        />
      </div>

      <div className='mb-3'>
        <label className='form-label'>Or Upload File</label>
        <div className='input-group'>
          <input
            type='file'
            className='form-control'
            accept='image/*'
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          {isUploading && (
            <span className='input-group-text'>
              <span
                className='spinner-border spinner-border-sm'
                role='status'
              ></span>
            </span>
          )}
        </div>
      </div>

      <div className='alert alert-info small'>
        <small>
          <strong>Note:</strong> For now, paste a direct image URL. File upload
          functionality will be added soon.
        </small>
      </div>
    </div>
  );
};

export default MediaUploader;
