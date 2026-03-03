import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  Star,
  Users,
  Award,
  ArrowRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

interface SpotlightItem {
  _id: string;
  title: string;
  description: string;
  category: 'Team' | 'Player' | 'Other';
  playerNames: string[];
  badges: string[];
  images: string[];
  fullSizeImages?: string[];
  date: string;
  featured: boolean;
  createdBy: string;
}

interface SpotlightContentProps {
  limit?: number;
  showTitle?: boolean;
  title?: string;
  showViewAll?: boolean;
  viewAllLink?: string;
  featuredOnly?: boolean;
  showImageModal?: boolean;
  className?: string;
}

const SpotlightContent: React.FC<SpotlightContentProps> = ({
  limit = 1,
  showTitle = true,
  title = 'In The Spotlight',
  showViewAll = true,
  viewAllLink = '/in-the-spotlight',
  featuredOnly = true,
  showImageModal = true,
  className = '',
}) => {
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Spotlight state
  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);

  // Image modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModalState, setShowImageModalState] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Fetch spotlight items
  const fetchSpotlightItems = useCallback(async () => {
    try {
      setSpotlightLoading(true);
      setSpotlightError(null);

      const endpoint = featuredOnly
        ? `${API_BASE_URL}/spotlight?featured=true&limit=${limit}`
        : `${API_BASE_URL}/spotlight?limit=${limit}`;

      const response = await axios.get(endpoint);
      let items = response.data;

      // If no featured items and we requested featured only, get recent items
      if (featuredOnly && items.length === 0) {
        const recentResponse = await axios.get(
          `${API_BASE_URL}/spotlight?limit=${limit}`
        );
        items = recentResponse.data;
      }

      // Process images to ensure we have high-res versions
      const processedItems = items.map((item: SpotlightItem) => {
        // If fullSizeImages exist, use them; otherwise try to guess from images
        const fullSizeImages =
          item.fullSizeImages ||
          item.images.map((img) => {
            // Try to extract high-res version from image URL
            let highResImg = img;

            // Remove thumbnail indicators
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
          // Ensure we have at least one image
          images: item.images && item.images.length > 0 ? item.images : [''],
          fullSizeImages:
            fullSizeImages && fullSizeImages.length > 0 ? fullSizeImages : [''],
        };
      });

      setSpotlightItems(processedItems);
    } catch (err) {
      console.error('Error fetching spotlight items:', err);
      setSpotlightError('Failed to load spotlight content');
    } finally {
      setSpotlightLoading(false);
    }
  }, [API_BASE_URL, limit, featuredOnly]);

  useEffect(() => {
    fetchSpotlightItems();
  }, [fetchSpotlightItems]);

  // Image modal functions
  const handleImageClick = useCallback(
    (imageUrl: string, index: number) => {
      if (!showImageModal) return;

      const mainSpotlightItem = spotlightItems[0];
      if (!mainSpotlightItem) return;

      // Try to get the high-res version first
      const highResImage =
        mainSpotlightItem.fullSizeImages?.[index] || imageUrl;

      setSelectedImage(highResImage);
      setShowImageModalState(true);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });

      // Preload the high-res image for better experience
      const img = new Image();
      img.src = highResImage;
      img.onload = () => {
        console.log('High-res image loaded successfully:', highResImage);
      };
      img.onerror = () => {
        console.warn(
          'Failed to load high-res image, falling back to original:',
          highResImage
        );
        // If high-res fails, use the original image
        if (highResImage !== imageUrl) {
          setSelectedImage(imageUrl);
        }
      };

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    },
    [spotlightItems, showImageModal]
  );

  const handleCloseModal = useCallback(() => {
    setShowImageModalState(false);
    setSelectedImage(null);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleCloseModal();
      }
    },
    [handleCloseModal]
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
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut]
  );

  // Drag handlers
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
    [zoomLevel, position]
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && zoomLevel > 1) {
        e.preventDefault();

        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Get the image element dimensions
        const img = document.querySelector(
          '.image-container img'
        ) as HTMLImageElement;
        if (!img) return;

        // Get the container dimensions
        const container = document.querySelector(
          '.image-container'
        ) as HTMLDivElement;
        if (!container) return;

        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate visible area after zoom
        const scaledWidth = imgWidth * zoomLevel;
        const scaledHeight = imgHeight * zoomLevel;

        // Calculate maximum drag bounds
        const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
        const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

        // Apply bounds
        setPosition({
          x: Math.max(Math.min(newX, maxX), -maxX),
          y: Math.max(Math.min(newY, maxY), -maxY),
        });
      }
    },
    [isDragging, zoomLevel, dragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle ESC key press for modal
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

  // Render loading state
  if (spotlightLoading) {
    return (
      <div className={`spotlight-content ${className}`}>
        <div className='row mb-5'>
          <div className='col-12'>
            <div className='text-center py-4'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>
                  Loading spotlight content...
                </span>
              </div>
              <p className='mt-2 text-muted'>Loading spotlight content...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (spotlightError) {
    return (
      <div className={`spotlight-content ${className}`}>
        <div className='row mb-5'>
          <div className='col-12'>
            <div className='alert alert-warning text-center'>
              <p className='mb-0'>{spotlightError}</p>
              <Link
                to='/in-the-spotlight'
                className='btn btn-outline-primary mt-2'
              >
                Visit Spotlight Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render empty state
  if (spotlightItems.length === 0) {
    return (
      <div className={`spotlight-content ${className}`}>
        <div className='row mb-5'>
          <div className='col-12'>
            <div className='text-center py-4'>
              {showTitle && <h3>{title}</h3>}
              <p className='text-muted'>
                Check back soon for exciting updates and achievements!
              </p>
              {showViewAll && (
                <Link
                  to='/in-the-spotlight'
                  className='btn btn-outline-primary'
                >
                  View All Spotlight Items
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Display the first item prominently
  const mainSpotlightItem = spotlightItems[0];

  return (
    <div className={`spotlight-content ${className}`}>
      {/* Section Header */}
      <div className='row mb-2'>
        <div className='col-12'>
          <div className='d-flex justify-content-between align-items-center mb-3'>
            {showTitle && <h2 className='mb-0'>{title}</h2>}
            {showViewAll && (
              <Link
                to={viewAllLink}
                className='btn btn-outline-primary btn-sm d-flex align-items-center'
              >
                View All <ArrowRight size={16} className='ms-1' />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Spotlight Card */}
      <div className='card p-4'>
        <div className='d-flex align-items-center'>
          <div className='row'>
            {/* Main Spotlight Item - Image Column */}
            <div className='col-lg-5'>
              <div
                className='d-flex align-items-center justify-content-center'
                style={{
                  height: '100%',
                  minHeight: '200px',
                }}
              >
                {mainSpotlightItem.images && mainSpotlightItem.images[0] ? (
                  <div
                    className='spotlight-image-container cursor-pointer'
                    onClick={() =>
                      handleImageClick(mainSpotlightItem.images[0], 0)
                    }
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxWidth: '100%',
                      maxHeight: '200px',
                    }}
                  >
                    <img
                      src={mainSpotlightItem.images[0]}
                      alt={mainSpotlightItem.title}
                      className='img-fluid spotlight-image'
                      style={{
                        maxHeight: '200px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        transition: 'transform 0.2s ease',
                        margin: 'auto',
                        display: 'block',
                      }}
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2Yzc1N2QiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow =
                          '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    />
                    <div className='image-overlay'>
                      <div className='overlay-content'>
                        <ZoomIn size={24} className='text-white mb-1' />
                        <small className='text-white d-block'>
                          Click to enlarge
                        </small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className='bg-light rounded d-flex align-items-center justify-content-center'
                    style={{
                      height: '200px',
                      width: '100%',
                      minHeight: '200px',
                    }}
                  >
                    <Award size={48} className='text-muted' />
                  </div>
                )}
              </div>
            </div>

            {/* Main Spotlight Item - Content Column */}
            <div className='col-lg-7'>
              <div className='d-lg-flex align-items-center justify-content-center flex-wrap overflowy-auto'>
                <div className='w-100'>
                  <div className='d-flex align-items-center mb-2'>
                    {mainSpotlightItem.featured && (
                      <Star
                        className='text-warning me-2'
                        size={20}
                        fill='currentColor'
                      />
                    )}
                    <h3 className='mb-3 mt-4'>{mainSpotlightItem.title}</h3>
                  </div>

                  <div className='d-flex mb-3'>
                    <small className='text-muted me-3'>
                      <Calendar size={16} className='me-1' />
                      {new Date(mainSpotlightItem.date).toLocaleDateString()}
                    </small>
                    <small className='text-muted me-3'>
                      <Users size={16} className='me-1' />
                      {mainSpotlightItem.category}
                    </small>
                  </div>

                  <p className='mb-3'>{mainSpotlightItem.description}</p>

                  {/* Player Names */}
                  {mainSpotlightItem.playerNames.length > 0 && (
                    <div className='mb-3'>
                      <small className='text-muted'>
                        <strong>Players:</strong>{' '}
                        {mainSpotlightItem.playerNames.join(', ')}
                      </small>
                    </div>
                  )}

                  {/* Badges */}
                  {mainSpotlightItem.badges.length > 0 && (
                    <div className='mb-3'>
                      <div className='d-flex flex-wrap gap-2'>
                        {mainSpotlightItem.badges.map((badge, index) => (
                          <span
                            key={index}
                            className='badge bg-primary'
                            style={{ fontSize: '0.75rem' }}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModalState && selectedImage && (
        <div
          className='modal-backdrop show d-flex align-items-center justify-content-center'
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
          }}
          onClick={handleBackdropClick}
        >
          <div
            className='position-relative bg-transparent'
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              width: 'auto',
              height: 'auto',
            }}
            onWheel={handleWheel}
          >
            {/* Control Buttons */}
            <div
              className='position-absolute top-0 end-0 m-3 d-flex gap-2'
              style={{ zIndex: 10001 }}
            >
              <button
                className='btn btn-light btn-sm d-flex align-items-center justify-content-center'
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                title='Zoom In'
                style={{ width: '40px', height: '40px' }}
              >
                <ZoomIn size={20} />
              </button>
              <button
                className='btn btn-light btn-sm d-flex align-items-center justify-content-center'
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                title='Zoom Out'
                style={{ width: '40px', height: '40px' }}
              >
                <ZoomOut size={20} />
              </button>
              <button
                className='btn btn-light btn-sm d-flex align-items-center justify-content-center'
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
                title='Reset Zoom'
                style={{ width: '40px', height: '40px' }}
              >
                <RotateCcw size={20} />
              </button>
              <button
                className='btn btn-light btn-sm d-flex align-items-center justify-content-center'
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseModal();
                }}
                title='Close'
                style={{ width: '40px', height: '40px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Zoom Level Indicator */}
            <div
              className='position-absolute top-0 start-0 m-3'
              style={{ zIndex: 10001 }}
            >
              <div className='badge bg-dark text-white'>
                {Math.round(zoomLevel * 100)}%
              </div>
            </div>

            {/* Image Container */}
            <div
              className='image-container'
              style={{
                overflow: 'hidden',
                maxWidth: '95vw',
                maxHeight: '95vh',
                cursor:
                  zoomLevel > 1
                    ? isDragging
                      ? 'grabbing'
                      : 'grab'
                    : 'default',
                backgroundColor: 'transparent',
                touchAction: 'none',
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <img
                src={selectedImage}
                alt='Full size'
                className='img-fluid modal-full-size-image'
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'none',
                  display: 'block',
                  backgroundColor: 'transparent',
                  userSelect: 'none',
                }}
                onError={(e) => {
                  console.error(
                    'Failed to load modal image:',
                    e.currentTarget.src
                  );
                  e.currentTarget.src =
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2Yzc1N2QiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                }}
                draggable='false'
              />
            </div>

            {/* Instructions */}
            <div
              className='position-absolute bottom-0 start-0 m-3 text-white'
              style={{ zIndex: 10001 }}
            >
              <small className='d-block'>
                <strong>Zoom:</strong> Mouse wheel or buttons
              </small>
              <small className='d-block'>
                <strong>Pan:</strong> Click and drag (when zoomed)
              </small>
              <small className='d-block'>
                <strong>Close:</strong> ESC key or click outside
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotlightContent;
