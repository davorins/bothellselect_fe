// components/ImagePicker.tsx

import React, { useState, useRef } from 'react';
import { Button, Modal, Form, Row, Col } from 'react-bootstrap';

interface ImagePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  placeholder?: string;
  aspectRatio?: 'square' | '16:9' | '4:3' | '21:9' | 'free';
  showDimensions?: boolean;
  recommendedSize?: string;
}

const STOCK_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1546519638405-a2f9d98ba7dd?w=1200&q=80',
    label: 'Court Overhead',
    category: 'Sports',
  },
  {
    url: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=1200&q=80',
    label: 'Game Action',
    category: 'Sports',
  },
  {
    url: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=1200&q=80',
    label: 'Team Huddle',
    category: 'Sports',
  },
  {
    url: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=1200&q=80',
    label: 'Dribble',
    category: 'Sports',
  },
  {
    url: 'https://images.unsplash.com/photo-1505666287802-931dc83948e9?w=1200&q=80',
    label: 'Arena',
    category: 'Venue',
  },
  {
    url: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1200&q=80',
    label: 'Training',
    category: 'Sports',
  },
  {
    url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80',
    label: 'Sunset Game',
    category: 'Sports',
  },
  {
    url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&q=80',
    label: 'Team Celebration',
    category: 'Sports',
  },
];

export const ImagePicker: React.FC<ImagePickerProps> = ({
  label,
  value,
  onChange,
  onRemove,
  placeholder = 'Enter image URL or select from stock',
  aspectRatio = 'free',
  showDimensions = false,
  recommendedSize,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'stock' | 'upload'>('url');
  const [urlValue, setUrlValue] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredImages = STOCK_IMAGES.filter(
    (img) =>
      img.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      img.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onChange(base64);
        if (onRemove) onRemove();
        setShowModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const aspectRatioStyles: Record<string, { paddingBottom: string }> = {
    square: { paddingBottom: '100%' },
    '16:9': { paddingBottom: '56.25%' },
    '4:3': { paddingBottom: '75%' },
    '21:9': { paddingBottom: '42.85%' },
    free: { paddingBottom: '0' },
  };

  return (
    <div className='image-picker'>
      <label className='fw-semibold mb-2 d-block'>{label}</label>
      {recommendedSize && (
        <small className='text-muted d-block mb-2'>
          Recommended: {recommendedSize}
        </small>
      )}

      <div className='position-relative'>
        {value ? (
          <div className='position-relative'>
            <div
              className='border rounded overflow-hidden'
              style={{
                ...aspectRatioStyles[aspectRatio],
                background: '#f8f9fa',
                position: 'relative',
              }}
            >
              <img
                src={value}
                alt='Preview'
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/400x300?text=Invalid+Image';
                }}
              />
            </div>
            <div className='mt-2 d-flex gap-2'>
              <Button
                size='sm'
                variant='outline-primary'
                onClick={() => setShowModal(true)}
              >
                <i className='ti ti-pencil me-1'></i> Change
              </Button>
              {onRemove && (
                <Button size='sm' variant='outline-danger' onClick={onRemove}>
                  <i className='ti ti-trash me-1'></i> Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className='border rounded d-flex align-items-center justify-content-center flex-column p-4'
            style={{
              minHeight: '150px',
              background: '#f8f9fa',
              cursor: 'pointer',
              border: '2px dashed #dee2e6',
              transition: 'all 0.2s',
            }}
            onClick={() => setShowModal(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#506ee4';
              e.currentTarget.style.background = '#f0f4ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#dee2e6';
              e.currentTarget.style.background = '#f8f9fa';
            }}
          >
            <i
              className='ti ti-photo'
              style={{ fontSize: '3rem', color: '#adb5bd' }}
            ></i>
            <p className='text-muted mt-2 mb-0'>
              Click to add {label.toLowerCase()}
            </p>
          </div>
        )}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>Select {label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='mb-3'>
            <div className='btn-group w-100'>
              <Button
                variant={activeTab === 'url' ? 'primary' : 'outline-secondary'}
                onClick={() => setActiveTab('url')}
              >
                <i className='ti ti-link me-1'></i> URL
              </Button>
              <Button
                variant={
                  activeTab === 'stock' ? 'primary' : 'outline-secondary'
                }
                onClick={() => setActiveTab('stock')}
              >
                <i className='ti ti-gallery me-1'></i> Stock
              </Button>
              <Button
                variant={
                  activeTab === 'upload' ? 'primary' : 'outline-secondary'
                }
                onClick={() => setActiveTab('upload')}
              >
                <i className='ti ti-upload me-1'></i> Upload
              </Button>
            </div>
          </div>

          {activeTab === 'url' && (
            <div>
              <Form.Group>
                <Form.Label>Image URL</Form.Label>
                <Form.Control
                  type='text'
                  placeholder='https://example.com/image.jpg'
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
                <Button
                  variant='primary'
                  className='mt-2'
                  onClick={() => {
                    onChange(urlValue);
                    setShowModal(false);
                  }}
                >
                  Apply URL
                </Button>
              </Form.Group>
            </div>
          )}

          {activeTab === 'stock' && (
            <div>
              <Form.Group className='mb-3'>
                <Form.Control
                  type='text'
                  placeholder='Search images...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
              <Row>
                {filteredImages.map((img) => (
                  <Col key={img.url} xs={6} md={4} className='mb-3'>
                    <div
                      className='border rounded overflow-hidden'
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        onChange(img.url);
                        setShowModal(false);
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                        }}
                      />
                      <div className='p-2'>
                        <small className='d-block fw-medium'>{img.label}</small>
                        <small className='text-muted'>{img.category}</small>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className='text-center py-4'>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*'
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div
                className='border rounded p-5'
                style={{ cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = e.dataTransfer.files;
                  if (files.length) {
                    const file = files[0];
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string;
                      onChange(base64);
                      setShowModal(false);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              >
                <i
                  className='ti ti-cloud-upload'
                  style={{ fontSize: '3rem', color: '#506ee4' }}
                ></i>
                <p className='mt-3'>
                  Drag & drop an image here, or click to browse
                </p>
                <small className='text-muted'>
                  Supports JPG, PNG, GIF, WebP (Max 10MB)
                </small>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};
