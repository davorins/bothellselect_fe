// pages/InTheSpotlight.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Masonry from 'react-masonry-css';
import { Star, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import SpotlightCard from '../components/SpotlightCard';
import { Spotlight } from '../../types/types';
import './InTheSpotlight.css';

const InTheSpotlight = () => {
  const [items, setItems] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Image modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModalState, setShowImageModalState] = useState(false);

  // Guard so the very same click that opens the modal doesn't
  // immediately fire the backdrop's onClick and close it.
  const justOpenedRef = useRef(false);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0,
  });
  const [isImageLoading, setIsImageLoading] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSpotlightItems = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_BASE_URL}/spotlight`);

        // Derive fullSizeImages the same way SpotlightContent.tsx does.
        const processedItems = response.data.map((item: Spotlight) => {
          const fullSizeImages =
            item.fullSizeImages ||
            (item.images || []).map((img) => {
              let highResImg = img;
              highResImg = highResImg
                .replace(/thumbnail_/gi, '')
                .replace(/thumb_/gi, '')
                .replace(/small_/gi, '')
                .replace(/medium_/gi, '')
                .replace(/_thumb/gi, '')
                .replace(/_small/gi, '')
                .replace(/_medium/gi, '')
                .replace(/_200x200/gi, '')
                .replace(/_300x300/gi, '')
                .replace(/\/thumb\//gi, '/original/')
                .replace(/\/thumbnail\//gi, '/')
                .replace(/\/small\//gi, '/')
                .replace(/\/medium\//gi, '/large/');
              return highResImg;
            });

          return {
            ...item,
            images: item.images && item.images.length > 0 ? item.images : [''],
            fullSizeImages:
              fullSizeImages && fullSizeImages.length > 0
                ? fullSizeImages
                : [''],
          };
        });

        setItems(processedItems);
      } catch {
        setError('Failed to load spotlight items');
      } finally {
        setLoading(false);
      }
    };

    fetchSpotlightItems();
  }, [API_BASE_URL]);

  const handleImageClick = useCallback(
    (item: Spotlight, imageUrl: string, index: number) => {
      const highResImage = item.fullSizeImages?.[index] || imageUrl;

      setSelectedImage(highResImage);
      setShowImageModalState(true);

      // Mark as "just opened" for a beat so the same bubbling click
      // doesn't hit the overlay's onClick and instantly close it.
      justOpenedRef.current = true;
      window.setTimeout(() => {
        justOpenedRef.current = false;
      }, 250);

      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      setIsImageLoading(true);
      setImageNaturalSize({ width: 0, height: 0 });

      const img = new Image();
      img.onload = () => {
        setImageNaturalSize({ width: img.width, height: img.height });
        setIsImageLoading(false);
      };
      img.onerror = () => {
        if (highResImage !== imageUrl) {
          setSelectedImage(imageUrl);
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            setImageNaturalSize({
              width: fallbackImg.width,
              height: fallbackImg.height,
            });
            setIsImageLoading(false);
          };
          fallbackImg.src = imageUrl;
        } else {
          setIsImageLoading(false);
        }
      };
      img.src = highResImage;

      document.body.style.overflow = 'hidden';
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setShowImageModalState(false);
    setSelectedImage(null);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setImageNaturalSize({ width: 0, height: 0 });

    document.body.style.overflow = '';
  }, []);

  // Use mousedown so a click that started on the card image (and is still
  // bubbling) can't accidentally register as an overlay click.
  const handleBackdropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (justOpenedRef.current) return;
      if (e.target === e.currentTarget) {
        handleCloseModal();
      }
    },
    [handleCloseModal],
  );

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut],
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (zoomLevel > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
        e.preventDefault();
      }
    },
    [zoomLevel, position],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (
        isDragging &&
        zoomLevel > 1 &&
        containerRef.current &&
        imageNaturalSize.width
      ) {
        e.preventDefault();

        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const scaledWidth = imageNaturalSize.width * zoomLevel;
        const scaledHeight = imageNaturalSize.height * zoomLevel;

        const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
        const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

        setPosition({
          x: Math.max(Math.min(newX, maxX), -maxX),
          y: Math.max(Math.min(newY, maxY), -maxY),
        });
      }
    },
    [isDragging, zoomLevel, dragStart, imageNaturalSize],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showImageModalState) {
        handleCloseModal();
      }
    };

    if (showImageModalState) {
      window.addEventListener('keydown', handleEscKey);
    }

    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showImageModalState, handleCloseModal]);

  const breakpointCols = { default: 3, 1100: 2, 700: 1 };

  return (
    <>
      <div
        className='spotlight-glass-page'
        style={{
          backgroundImage: 'url(/assets/img/bg/spotlight.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className='spotlight-glass-container'>
          {/* Header Section */}
          <div className='text-center mb-5'>
            <h1 className='mb-3 display-4 fw-bold spotlight-glass-title'>
              In The Spotlight
            </h1>
            <h4 className='mb-5 spotlight-glass-subtitle'>
              Celebrating player achievements and team highlights.
            </h4>
          </div>

          {/* Content Section */}
          {loading ? (
            <div className='spotlight-glass-loading'>
              <div className='spotlight-glass-spinner'></div>
              <p>Loading spotlight content...</p>
            </div>
          ) : error ? (
            <div className='spotlight-glass-error'>
              <p>{error}</p>
              <button
                className='spotlight-glass-retry-btn'
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className='spotlight-glass-empty'>
              <h3>No spotlight items yet</h3>
              <p>Check back later for exciting updates!</p>
            </div>
          ) : (
            <Masonry
              breakpointCols={breakpointCols}
              className='spotlight-glass-masonry-grid'
              columnClassName='spotlight-glass-masonry-column'
            >
              {items.map((item) => (
                <SpotlightCard
                  key={item._id}
                  item={item}
                  onImageClick={(imageUrl, index) =>
                    handleImageClick(item, imageUrl, index)
                  }
                />
              ))}
            </Masonry>
          )}
        </div>
      </div>

      {/* Image Modal — portaled to document.body so it sits above everything
          and centers in the viewport regardless of ancestor transforms /
          backdrop-filters. */}
      {showImageModalState &&
        selectedImage &&
        createPortal(
          <div
            className='spotlight-modal-overlay'
            onMouseDown={handleBackdropMouseDown}
          >
            <div
              className='spotlight-modal-glass'
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className='spotlight-modal-header'>
                <div className='spotlight-modal-title'>
                  <Star size={16} />
                  <span>Image Preview</span>
                </div>
                <button
                  className='spotlight-modal-close'
                  onClick={handleCloseModal}
                >
                  <X size={20} />
                </button>
              </div>

              <div className='spotlight-modal-toolbar'>
                <button
                  className='spotlight-modal-tool-btn'
                  onClick={handleZoomIn}
                  title='Zoom In (Mouse wheel)'
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  className='spotlight-modal-tool-btn'
                  onClick={handleZoomOut}
                  title='Zoom Out (Mouse wheel)'
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  className='spotlight-modal-tool-btn'
                  onClick={handleResetZoom}
                  title='Reset Zoom'
                >
                  <RotateCcw size={18} />
                </button>
                <div className='spotlight-modal-zoom-level'>
                  {Math.round(zoomLevel * 100)}%
                </div>
              </div>

              <div className='spotlight-modal-image-wrapper'>
                <div
                  ref={containerRef}
                  className='spotlight-modal-image-container'
                  onWheel={handleWheel}
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  style={{
                    cursor:
                      zoomLevel > 1
                        ? isDragging
                          ? 'grabbing'
                          : 'grab'
                        : 'default',
                  }}
                >
                  {isImageLoading && (
                    <div className='spotlight-modal-loader'>
                      <div className='spinner-border text-light' role='status'>
                        <span className='visually-hidden'>Loading...</span>
                      </div>
                    </div>
                  )}
                  <img
                    ref={imageRef}
                    src={selectedImage}
                    alt='Full size preview'
                    className='spotlight-modal-image'
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                      transition: isDragging
                        ? 'none'
                        : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
                      opacity: isImageLoading ? 0 : 1,
                    }}
                    draggable='false'
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setImageNaturalSize({
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                      });
                      setIsImageLoading(false);
                    }}
                  />
                </div>
              </div>

              <div className='spotlight-modal-footer'>
                <div className='spotlight-modal-instructions'>
                  <span>
                    🖱️{' '}
                    {zoomLevel > 1 ? 'Click & drag to pan' : 'Scroll to zoom'}
                  </span>
                  <span>⎋ Press ESC to close</span>
                  <span>✕ Click outside to close</span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default InTheSpotlight;
