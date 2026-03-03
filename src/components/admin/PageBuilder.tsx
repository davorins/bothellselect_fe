import React, { useState, useEffect, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from 'react-beautiful-dnd';
import {
  PageLayout,
  PageSection,
  PageType,
} from '../../types/page-builder-types';
import SectionEditor from './SectionEditor';
import TemplateSelector from './TemplateSelector';
import PageRenderer from '../page-builder/PageRenderer';
import {
  Save,
  Eye,
  Trash2,
  Copy,
  Settings,
  Plus,
  Grid,
  Type,
  Image as ImageIcon,
  Video,
  FormInput,
  Users,
  Calendar,
  Star,
} from 'lucide-react';

interface PageBuilderProps {
  initialPage?: PageLayout;
  pageSlug?: string;
}

const PageBuilder: React.FC<PageBuilderProps> = ({ initialPage, pageSlug }) => {
  const [page, setPage] = useState<PageLayout | null>(initialPage || null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<PageSection | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Available section types
  const sectionTypes = [
    {
      id: 'welcome',
      name: 'Welcome Text',
      icon: <Type size={20} />,
      description: 'Text content with title',
    },
    {
      id: 'text',
      name: 'Text Content',
      icon: <Type size={20} />,
      description: 'Rich text content',
    },
    {
      id: 'image',
      name: 'Image',
      icon: <ImageIcon size={20} />,
      description: 'Single image with caption',
    },
    {
      id: 'image-gallery',
      name: 'Image Gallery',
      icon: <Grid size={20} />,
      description: 'Multiple images grid',
    },
    {
      id: 'video',
      name: 'Video',
      icon: <Video size={20} />,
      description: 'Video player',
    },
    {
      id: 'spotlight',
      name: 'Spotlight',
      icon: <Star size={20} />,
      description: 'Dynamic spotlight content',
    },
    {
      id: 'registration',
      name: 'Registration',
      icon: <Users size={20} />,
      description: 'Registration forms hub',
    },
    {
      id: 'form',
      name: 'Form',
      icon: <FormInput size={20} />,
      description: 'Embedded form',
    },
    {
      id: 'tournament',
      name: 'Tournament',
      icon: <Calendar size={20} />,
      description: 'Tournament information',
    },
    {
      id: 'custom',
      name: 'Custom HTML',
      icon: <Settings size={20} />,
      description: 'Custom HTML content',
    },
  ];

  // Load page if slug provided
  useEffect(() => {
    if (pageSlug && !initialPage) {
      loadPage();
    }
  }, [pageSlug]);

  // Load page from API
  const loadPage = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${pageSlug}`
      );
      const data = await response.json();
      if (data.success) {
        setPage(data.data);
        setSections(data.data.sections || []);
      }
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag and drop
  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const items = Array.from(sections);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Update positions
      const updatedItems = items.map((item, index) => ({
        ...item,
        position: index,
      }));

      setSections(updatedItems);
    },
    [sections]
  );

  // Add new section
  const addSection = (type: string) => {
    const newSection: PageSection = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      position: sections.length,
      title: '',
      content: '',
      config: {},
      styles: {},
      isActive: true,
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    setSelectedSection(newSection);
    setIsEditing(true);
  };

  // Update section
  const updateSection = (updatedSection: PageSection) => {
    const updatedSections = sections.map((section) =>
      section.id === updatedSection.id ? updatedSection : section
    );
    setSections(updatedSections);
    setSelectedSection(updatedSection);
  };

  // Delete section
  const deleteSection = (sectionId: string) => {
    const updatedSections = sections.filter(
      (section) => section.id !== sectionId
    );
    setSections(updatedSections);
    if (selectedSection?.id === sectionId) {
      setSelectedSection(null);
      setIsEditing(false);
    }
  };

  // Duplicate section
  const duplicateSection = (section: PageSection) => {
    const newSection: PageSection = {
      ...section,
      id: `${section.type}-${Date.now()}`,
      position: sections.length,
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    setSelectedSection(newSection);
    setIsEditing(true);
  };

  // Save page
  const savePage = async () => {
    try {
      setLoading(true);
      const updatedPage = {
        ...page,
        sections,
        updatedAt: new Date(),
      };

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${page?._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPage),
        }
      );

      if (response.ok) {
        alert('Page saved successfully!');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Error saving page');
    } finally {
      setLoading(false);
    }
  };

  // Publish page
  const publishPage = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${page?._id}/publish`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        alert('Page published successfully!');
      }
    } catch (error) {
      console.error('Error publishing page:', error);
      alert('Error publishing page');
    }
  };

  // Apply template
  const applyTemplate = (templateSections: PageSection[]) => {
    const updatedSections = templateSections.map((section, index) => ({
      ...section,
      id: `${section.type}-${Date.now()}-${index}`,
      position: index,
    }));

    setSections(updatedSections);
    setShowTemplateModal(false);
  };

  if (loading && !page) {
    return (
      <div className='text-center py-5'>
        <div className='spinner-border text-primary' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='page-builder-container'>
      {/* Builder Header */}
      <div className='builder-header bg-dark text-white p-3 d-flex justify-content-between align-items-center'>
        <div>
          <h4 className='mb-0'>Page Builder: {page?.pageTitle}</h4>
          <small className='text-muted'>{page?.pageSlug}</small>
        </div>
        <div className='d-flex gap-2'>
          <button
            className='btn btn-outline-light btn-sm'
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye size={16} className='me-1' />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          <button
            className='btn btn-outline-light btn-sm'
            onClick={() => setShowTemplateModal(true)}
          >
            <Copy size={16} className='me-1' />
            Templates
          </button>
          <button
            className='btn btn-primary btn-sm'
            onClick={savePage}
            disabled={loading}
          >
            <Save size={16} className='me-1' />
            Save
          </button>
          <button
            className='btn btn-success btn-sm'
            onClick={publishPage}
            disabled={loading}
          >
            Publish
          </button>
        </div>
      </div>

      <div className='builder-content'>
        {previewMode ? (
          // Preview Mode
          <div className='preview-container'>
            <PageRenderer
              pageSlug={page?.pageSlug || 'home'}
              isEditing={false}
            />
          </div>
        ) : (
          // Edit Mode
          <div className='row g-0'>
            {/* Left Sidebar - Available Sections */}
            <div className='col-md-3 bg-light border-end p-3'>
              <h5 className='mb-3'>Add Section</h5>
              <div className='section-types-grid'>
                {sectionTypes.map((type) => (
                  <button
                    key={type.id}
                    className='section-type-card btn btn-outline-primary text-start d-flex align-items-center mb-2 w-100'
                    onClick={() => addSection(type.id)}
                  >
                    <div className='me-2'>{type.icon}</div>
                    <div>
                      <div className='fw-semibold'>{type.name}</div>
                      <small className='text-muted'>{type.description}</small>
                    </div>
                  </button>
                ))}
              </div>

              {/* Page Settings */}
              <div className='mt-4'>
                <h5 className='mb-3'>Page Settings</h5>
                <div className='card'>
                  <div className='card-body'>
                    <div className='mb-3'>
                      <label className='form-label'>Page Title</label>
                      <input
                        type='text'
                        className='form-control'
                        value={page?.pageTitle || ''}
                        onChange={(e) =>
                          setPage((prev) =>
                            prev ? { ...prev, pageTitle: e.target.value } : null
                          )
                        }
                      />
                    </div>
                    <div className='mb-3'>
                      <label className='form-label'>Meta Description</label>
                      <textarea
                        className='form-control'
                        rows={3}
                        value={page?.metaDescription || ''}
                        onChange={(e) =>
                          setPage((prev) =>
                            prev
                              ? { ...prev, metaDescription: e.target.value }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Sections List */}
            <div className='col-md-6 p-3'>
              <h5 className='mb-3'>Page Sections</h5>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId='sections'>
                  {(provided: DroppableProvided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className='sections-list'
                    >
                      {sections
                        .sort((a, b) => a.position - b.position)
                        .map((section, index) => (
                          <Draggable
                            key={section.id}
                            draggableId={section.id}
                            index={index}
                          >
                            {(provided: DraggableProvided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`section-item card mb-3 ${
                                  selectedSection?.id === section.id
                                    ? 'border-primary'
                                    : ''
                                }`}
                                onClick={() => {
                                  setSelectedSection(section);
                                  setIsEditing(true);
                                }}
                              >
                                <div className='card-body'>
                                  <div className='d-flex justify-content-between align-items-center'>
                                    <div className='d-flex align-items-center'>
                                      <div className='me-3'>
                                        {
                                          sectionTypes.find(
                                            (t) => t.id === section.type
                                          )?.icon
                                        }
                                      </div>
                                      <div>
                                        <h6 className='mb-0'>
                                          {section.title ||
                                            `Untitled ${section.type} Section`}
                                        </h6>
                                        <small className='text-muted'>
                                          {section.type} • Position:{' '}
                                          {section.position}
                                        </small>
                                      </div>
                                    </div>
                                    <div className='section-actions'>
                                      <button
                                        className='btn btn-sm btn-outline-secondary me-1'
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          duplicateSection(section);
                                        }}
                                      >
                                        <Copy size={14} />
                                      </button>
                                      <button
                                        className='btn btn-sm btn-outline-danger'
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSection(section.id);
                                        }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className='mt-2'>
                                    {section.isActive ? (
                                      <span className='badge bg-success'>
                                        Active
                                      </span>
                                    ) : (
                                      <span className='badge bg-secondary'>
                                        Inactive
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {sections.length === 0 && (
                <div className='text-center py-5 text-muted'>
                  <div className='mb-3'>
                    <Plus size={48} />
                  </div>
                  <h5>No sections yet</h5>
                  <p>Add sections from the left sidebar to build your page.</p>
                </div>
              )}
            </div>

            {/* Right Sidebar - Section Editor */}
            <div className='col-md-3 bg-light border-start p-3'>
              {selectedSection && isEditing ? (
                <SectionEditor
                  section={selectedSection}
                  onUpdate={updateSection}
                  onClose={() => {
                    setIsEditing(false);
                    setSelectedSection(null);
                  }}
                />
              ) : (
                <div className='text-center py-5 text-muted'>
                  <Settings size={48} className='mb-3' />
                  <h5>Select a Section</h5>
                  <p>Click on any section to edit its content and settings.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateSelector
          onSelect={applyTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
};

export default PageBuilder;
