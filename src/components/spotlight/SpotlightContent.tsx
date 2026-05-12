import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import './Spotlight.css';

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
  embedded?: boolean;
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
  embedded = false,
}) => {
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [spotlightError, setSpotlightError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModalState, setShowImageModalState] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const fetchSpotlightItems = useCallback(async () => {
    try {
      setSpotlightLoading(true);
      setSpotlightError(null);

      const endpoint = featuredOnly
        ? `${API_BASE_URL}/spotlight?featured=true&limit=${limit}`
        : `${API_BASE_URL}/spotlight?limit=${limit}`;

      const response = await axios.get(endpoint);
      let items = response.data;

      if (featuredOnly && items.length === 0) {
        const recentResponse = await axios.get(
          `${API_BASE_URL}/spotlight?limit=${limit}`,
        );
        items = recentResponse.data;
      }

      const processedItems = items.map((item: SpotlightItem) => {
        const fullSizeImages =
          item.fullSizeImages ||
          item.images.map((img) => {
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

  const handleImageClick = useCallback(
    (imageUrl: string, index: number) => {
      if (!showImageModal) return;

      const mainSpotlightItem = spotlightItems[0];
      if (!mainSpotlightItem) return;

      const highResImage =
        mainSpotlightItem.fullSizeImages?.[index] || imageUrl;

      setSelectedImage(highResImage);
      setShowImageModalState(true);
      setIsModalOpen(true);

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
    [spotlightItems, showImageModal],
  );

  const handleCloseModal = useCallback(() => {
    setShowImageModalState(false);
    setIsModalOpen(false);
    setSelectedImage(null);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
    setImageNaturalSize({ width: 0, height: 0 });

    document.body.style.overflow = '';
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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

  if (spotlightLoading) {
    return (
      <div className={`spotlight-glass-container ${className}`}>
        <div className='spotlight-glass-card'>
          <div className='spotlight-glass-content'>
            <div className='text-center py-5'>
              <div className='spinner-border text-light' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
              <p className='mt-3 text-light opacity-75'>
                Loading spotlight content...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (spotlightError) {
    return (
      <div className={`spotlight-glass-container ${className}`}>
        <div className='spotlight-glass-card'>
          <div className='spotlight-glass-content'>
            <div className='text-center py-4'>
              <Award size={48} className='text-warning mb-3' />
              <p className='text-light mb-3'>{spotlightError}</p>
              <Link to={viewAllLink} className='spotlight-glass-btn'>
                Visit Spotlight Page
                <ArrowRight size={16} className='ms-2' />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (spotlightItems.length === 0) {
    return (
      <div className={`spotlight-glass-container ${className}`}>
        <div className='spotlight-glass-card'>
          <div className='spotlight-glass-content'>
            <div className='text-center py-5'>
              <Star size={48} className='text-warning mb-3' />
              {showTitle && <h3 className='text-light mb-3'>{title}</h3>}
              <p className='text-light opacity-75 mb-4'>
                Check back soon for exciting updates and achievements!
              </p>
              {showViewAll && (
                <Link to={viewAllLink} className='spotlight-glass-btn'>
                  View All Spotlight Items
                  <ArrowRight size={16} className='ms-2' />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mainSpotlightItem = spotlightItems[0];

  return (
    <>
      <div
        className={`spotlight-glass-container ${className} ${
          isModalOpen ? 'modal-open' : ''
        }`}
      >
        <div className='spotlight-glass-card'>
          <div className='spotlight-glass-overlay'></div>
          <div className='spotlight-glass-content'>
            {(showTitle || showViewAll) && (
              <div>
                {showTitle && (
                  <h2 className='spotlight-glass-title'>{title}</h2>
                )}
                {showViewAll && (
                  <Link to={viewAllLink} className='spotlight-glass-link'>
                    View All
                    <ArrowRight size={16} className='ms-1' />
                  </Link>
                )}
              </div>
            )}

            <div className='spotlight-glass-grid'>
              <div className='spotlight-glass-image-col'>
                {mainSpotlightItem.images && mainSpotlightItem.images[0] ? (
                  <div
                    className='spotlight-glass-image-wrapper'
                    onClick={() =>
                      handleImageClick(mainSpotlightItem.images[0], 0)
                    }
                  >
                    <img
                      src={mainSpotlightItem.images[0]}
                      alt={mainSpotlightItem.title}
                      className='spotlight-glass-image'
                      loading='lazy'
                    />
                    <div className='spotlight-glass-image-overlay'>
                      <ZoomIn size={32} className='text-white' />
                      <small className='text-white d-block mt-2'>
                        Click to enlarge
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className='spotlight-glass-image-placeholder'>
                    <Award size={64} className='opacity-50' />
                  </div>
                )}
              </div>

              <div className='spotlight-glass-content-col'>
                <div className='spotlight-glass-badge-wrapper'>
                  {mainSpotlightItem.featured && (
                    <span className='spotlight-glass-featured-badge'>
                      <Star size={14} fill='currentColor' />
                      Featured
                    </span>
                  )}
                  <span className='spotlight-glass-category-badge'>
                    <Users size={14} />
                    {mainSpotlightItem.category}
                  </span>
                </div>

                <h3 className='spotlight-glass-item-title'>
                  {mainSpotlightItem.title}
                </h3>

                <div className='spotlight-glass-meta'>
                  <span>
                    <Calendar size={14} />
                    {new Date(mainSpotlightItem.date).toLocaleDateString()}
                  </span>
                </div>

                <p className='spotlight-glass-description'>
                  {mainSpotlightItem.description}
                </p>

                {mainSpotlightItem.playerNames.length > 0 && (
                  <div className='spotlight-glass-players'>
                    <strong>Players:</strong>
                    <span>{mainSpotlightItem.playerNames.join(', ')}</span>
                  </div>
                )}

                {mainSpotlightItem.badges.length > 0 && (
                  <div className='spotlight-glass-badges'>
                    {mainSpotlightItem.badges.map((badge, index) => (
                      <span key={index} className='spotlight-glass-badge'>
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showImageModalState && selectedImage && (
        <div className='spotlight-modal-glass' onClick={handleBackdropClick}>
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
                🖱️ {zoomLevel > 1 ? 'Click & drag to pan' : 'Scroll to zoom'}
              </span>
              <span>⎋ Press ESC to close</span>
              <span>✕ Click outside to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SpotlightContent;
