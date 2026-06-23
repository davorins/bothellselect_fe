// components/BackgroundPicker.tsx

import React, { useState } from 'react';
import { Button, Form, Row, Col } from 'react-bootstrap';
import { ImagePicker } from './ImagePicker';

interface BackgroundPickerProps {
  backgroundImage: string;
  overlayOpacity: number;
  backgroundColor: string;
  onBackgroundImageChange: (url: string) => void;
  onOverlayOpacityChange: (opacity: number) => void;
  onBackgroundColorChange: (color: string) => void;
}

const BACKGROUND_PATTERNS = [
  { name: 'None', value: '' },
  { name: 'Subtle Dots', value: 'dots' },
  { name: 'Lines', value: 'lines' },
  { name: 'Grid', value: 'grid' },
  { name: 'Circles', value: 'circles' },
  { name: 'Triangles', value: 'triangles' },
];

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  backgroundImage,
  overlayOpacity,
  backgroundColor,
  onBackgroundImageChange,
  onOverlayOpacityChange,
  onBackgroundColorChange,
}) => {
  const [usePattern, setUsePattern] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState('');

  return (
    <div className='background-picker p-3 border rounded'>
      <h6 className='mb-3'>Background Settings</h6>

      <Form.Group className='mb-3'>
        <Form.Label>Background Type</Form.Label>
        <div className='d-flex gap-2'>
          <Button
            variant={!usePattern ? 'primary' : 'outline-secondary'}
            size='sm'
            onClick={() => setUsePattern(false)}
          >
            <i className='ti ti-photo me-1'></i> Image
          </Button>
          <Button
            variant={usePattern ? 'primary' : 'outline-secondary'}
            size='sm'
            onClick={() => setUsePattern(true)}
          >
            <i className='ti ti-pattern me-1'></i> Pattern
          </Button>
        </div>
      </Form.Group>

      {!usePattern ? (
        <>
          <ImagePicker
            label='Background Image'
            value={backgroundImage}
            onChange={onBackgroundImageChange}
            onRemove={() => onBackgroundImageChange('')}
            aspectRatio='free'
            recommendedSize='1920x1080px'
          />

          <Form.Group className='mt-3'>
            <Form.Label>
              Overlay Opacity: {Math.round(overlayOpacity * 100)}%
            </Form.Label>
            <Form.Range
              min={0}
              max={100}
              value={overlayOpacity * 100}
              onChange={(e) =>
                onOverlayOpacityChange(parseInt(e.target.value) / 100)
              }
            />
          </Form.Group>
        </>
      ) : (
        <Row>
          {BACKGROUND_PATTERNS.map((pattern) => (
            <Col key={pattern.value} xs={4} className='mb-2'>
              <div
                className={`border rounded p-2 text-center ${
                  selectedPattern === pattern.value
                    ? 'border-primary border-2'
                    : ''
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPattern(pattern.value)}
              >
                <div
                  className='bg-pattern-preview'
                  style={{
                    height: '60px',
                    background: pattern.value
                      ? `url('/patterns/${pattern.value}.svg')`
                      : backgroundColor,
                  }}
                ></div>
                <small>{pattern.name}</small>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Form.Group className='mt-3'>
        <Form.Label>Background Color</Form.Label>
        <div className='d-flex gap-2 align-items-center'>
          <input
            type='color'
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            style={{
              width: '40px',
              height: '40px',
              padding: '2px',
              borderRadius: '4px',
            }}
          />
          <Form.Control
            type='text'
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </Form.Group>
    </div>
  );
};
