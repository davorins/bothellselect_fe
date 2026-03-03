// src/components/page-builder/PageBuilder.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from '@hello-pangea/dnd';
import { PageLayout, PageSection } from '../../types/page-builder-types';
import SectionEditor from './SectionEditor';
import TemplateSelector from './TemplateSelector';
import PageRenderer from './PageRenderer';
import PagesDirectory from './PagesDirectory';
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
  Home,
  FileText,
  Layout,
  ArrowLeft,
  List,
  ExternalLink,
  Download,
  Upload,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Globe,
  FileSearch,
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import './styles.css';

interface PageBuilderProps {
  initialPage?: PageLayout;
}

const PageBuilder: React.FC<PageBuilderProps> = ({ initialPage }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageLayout | null>(initialPage || null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<PageSection | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPagesDirectory, setShowPagesDirectory] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [pageHistory, setPageHistory] = useState<PageLayout[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use ref to track latest sections without causing re-renders
  const sectionsRef = useRef<PageSection[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Available section types
  const sectionTypes = [
    {
      id: 'text',
      name: 'Text Content',
      icon: <Type size={20} />,
      description: 'Rich text content',
      category: 'content',
    },
    {
      id: 'image',
      name: 'Image',
      icon: <ImageIcon size={20} />,
      description: 'Single image with caption',
      category: 'media',
    },
    {
      id: 'image-gallery',
      name: 'Image Gallery',
      icon: <Grid size={20} />,
      description: 'Multiple images grid',
      category: 'media',
    },
    {
      id: 'video',
      name: 'Video',
      icon: <Video size={20} />,
      description: 'Video player',
      category: 'media',
    },
    {
      id: 'spotlight',
      name: 'Spotlight',
      icon: <Star size={20} />,
      description: 'Dynamic spotlight content',
      category: 'dynamic',
    },
    {
      id: 'registration',
      name: 'Registration',
      icon: <Users size={20} />,
      description: 'Registration forms hub',
      category: 'forms',
    },
    {
      id: 'form',
      name: 'Embedded Form',
      icon: <FormInput size={20} />,
      description: 'Embedded form',
      category: 'forms',
    },
    {
      id: 'tournament',
      name: 'Tournament',
      icon: <Calendar size={20} />,
      description: 'Tournament information',
      category: 'dynamic',
    },
    {
      id: 'cta',
      name: 'Call to Action',
      icon: <Star size={20} />,
      description: 'Call to action button or banner',
      category: 'content',
    },
    {
      id: 'sponsors',
      name: 'Sponsors',
      icon: <Star size={20} />,
      description: 'Sponsor logos',
      category: 'content',
    },
  ];

  // Group sections by category
  const sectionCategories = {
    content: 'Content',
    media: 'Media',
    dynamic: 'Dynamic Content',
    forms: 'Forms',
    advanced: 'Advanced',
  };

  // Update ref whenever sections change
  useEffect(() => {
    sectionsRef.current = sections;
    console.log('🔄 sectionsRef updated with sections:', sections.length);
    sections.forEach((section, index) => {
      console.log(`  ${index}: "${section.title}" (${section.type})`);
    });
  }, [sections]);

  // Load page by ID
  useEffect(() => {
    if (id) {
      loadPage();
    } else if (initialPage) {
      setPage(initialPage);
      setSections(initialPage.sections || []);
      sectionsRef.current = initialPage.sections || [];
      setLoading(false);
      // Initialize history
      setPageHistory([initialPage]);
      setHistoryIndex(0);
    } else {
      // If no ID and no initial page, redirect to page list
      navigate('/admin/pages');
    }
  }, [id, initialPage, navigate]);

  // Load page from API
  const loadPage = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/edit/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Page not found');
        }
        throw new Error(`Failed to load page: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const loadedPage = data.data;
        setPage(loadedPage);
        setSections(loadedPage.sections || []);
        sectionsRef.current = loadedPage.sections || [];
        // Initialize history
        setPageHistory([loadedPage]);
        setHistoryIndex(0);
        setLastSaved(new Date(loadedPage.updatedAt || loadedPage.createdAt));
      } else {
        throw new Error(data.message || 'Failed to load page');
      }
    } catch (error: any) {
      console.error('Error loading page:', error);
      alert(error.message || 'Failed to load page');
      navigate('/admin/pages');
    } finally {
      setLoading(false);
    }
  };

  // Add to history after each save
  const addToHistory = useCallback(
    (pageData: PageLayout) => {
      setPageHistory((prev) => {
        const newHistory = [...prev.slice(0, historyIndex + 1), pageData];
        // Keep last 50 history states
        if (newHistory.length > 50) {
          return newHistory.slice(-50);
        }
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  // Undo action
  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevPage = pageHistory[prevIndex];
      setPage(prevPage);
      setSections(prevPage.sections || []);
      sectionsRef.current = prevPage.sections || [];
      setHistoryIndex(prevIndex);
      setSelectedSection(null);
      setIsEditing(false);
    }
  };

  // Redo action
  const redo = () => {
    if (historyIndex < pageHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextPage = pageHistory[nextIndex];
      setPage(nextPage);
      setSections(nextPage.sections || []);
      sectionsRef.current = nextPage.sections || [];
      setHistoryIndex(nextIndex);
      setSelectedSection(null);
      setIsEditing(false);
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
        updatedAt: new Date(),
      }));

      setSections(updatedItems);
      sectionsRef.current = updatedItems;
      setHasUnsavedChanges(true);

      // Auto-save after reordering
      if (page?._id) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          savePage(false);
          setHasUnsavedChanges(false);
        }, 1000);
      }
    },
    [sections, page]
  );

  // Add new section
  const addSection = (type: string) => {
    const newSection: PageSection = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      position: sections.length,
      title: '',
      subtitle: '',
      content: '',
      config: {},
      styles: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    sectionsRef.current = updatedSections;
    setSelectedSection(newSection);
    setIsEditing(true);
    setHasUnsavedChanges(true);

    // Auto-save after adding section
    if (page?._id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePage(false);
        setHasUnsavedChanges(false);
      }, 1000);
    }
  };

  // Update section - FIXED VERSION
  const updateSection = useCallback(
    (updatedSection: PageSection) => {
      console.log('🔄 PageBuilder: updateSection called');
      console.log('📥 Updated section title:', updatedSection.title);
      console.log(
        '📥 Updated section content:',
        updatedSection.content?.substring(0, 50) + '...'
      );

      setSections((prevSections) => {
        const newSections = prevSections.map((section) =>
          section.id === updatedSection.id
            ? {
                ...updatedSection,
                updatedAt: new Date(),
              }
            : section
        );

        console.log('✅ Sections after update (in setSections callback):');
        newSections.forEach((s, i) => {
          console.log(`  ${i}: "${s.title}" (${s.type})`);
        });

        return newSections;
      });

      sectionsRef.current = sectionsRef.current.map((section) =>
        section.id === updatedSection.id
          ? {
              ...updatedSection,
              updatedAt: new Date(),
            }
          : section
      );

      setSelectedSection(updatedSection);
      setIsEditing(true);
      setHasUnsavedChanges(true);

      // Auto-save after updating section
      if (page?._id) {
        console.log('⏱️ Auto-saving in 1 second...');
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          savePage(false);
          setHasUnsavedChanges(false);
        }, 1000);
      }
    },
    [page]
  );

  // Delete section
  const deleteSection = async (sectionId: string) => {
    const sectionToDelete = sections.find(
      (section) => section.id === sectionId
    );
    if (!sectionToDelete) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${
        sectionToDelete.title || `Untitled ${sectionToDelete.type} section`
      }"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      const updatedSections = sections.filter(
        (section) => section.id !== sectionId
      );
      setSections(updatedSections);
      sectionsRef.current = updatedSections;

      if (selectedSection?.id === sectionId) {
        setSelectedSection(null);
        setIsEditing(false);
      }
      setHasUnsavedChanges(true);

      // Auto-save after deletion
      if (page?._id) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          savePage(false);
          setHasUnsavedChanges(false);
        }, 500);
      }

      // Optional success message
      Swal.fire('Deleted!', 'The section has been deleted.', 'success');
    }
  };

  // Duplicate section
  const duplicateSection = (section: PageSection) => {
    const newSection: PageSection = {
      ...section,
      id: `${section.type}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      position: sections.length,
      title: `${section.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    sectionsRef.current = updatedSections;
    setSelectedSection(newSection);
    setIsEditing(true);
    setHasUnsavedChanges(true);

    // Auto-save after duplication
    if (page?._id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePage(false);
        setHasUnsavedChanges(false);
      }, 500);
    }
  };

  // Move section up
  const moveSectionUp = (index: number) => {
    if (index === 0) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[index - 1];
    newSections[index - 1] = temp;

    // Update positions
    const updatedSections = newSections.map((section, idx) => ({
      ...section,
      position: idx,
      updatedAt: new Date(),
    }));

    setSections(updatedSections);
    sectionsRef.current = updatedSections;
    setHasUnsavedChanges(true);

    // Auto-save after moving
    if (page?._id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePage(false);
        setHasUnsavedChanges(false);
      }, 500);
    }
  };

  // Move section down
  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[index + 1];
    newSections[index + 1] = temp;

    // Update positions
    const updatedSections = newSections.map((section, idx) => ({
      ...section,
      position: idx,
      updatedAt: new Date(),
    }));

    setSections(updatedSections);
    sectionsRef.current = updatedSections;
    setHasUnsavedChanges(true);

    // Auto-save after moving
    if (page?._id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePage(false);
        setHasUnsavedChanges(false);
      }, 500);
    }
  };

  // Save page
  const savePage = useCallback(
    async (showAlert = true) => {
      if (!page?._id) {
        console.error('❌ No page ID found');
        alert('Page not loaded properly');
        return;
      }

      console.log('🚀 ===== SAVE PAGE START =====');
      console.log('📝 Page ID:', page._id);

      // Use ref to get latest sections (not state which might be stale)
      const currentSections = sectionsRef.current;
      console.log('📋 Current sections from ref:', currentSections.length);

      // Debug: Show all section titles
      console.log('🔍 Section titles at save time:');
      currentSections.forEach((section, index) => {
        console.log(`  ${index}: "${section.title}" (${section.type})`);
      });

      setSaveStatus('saving');

      try {
        // Prepare sections data - using currentSections from ref
        const processedSections = currentSections.map((section, index) => {
          // Get all config properties (including new alignment and typography properties)
          const config = {
            ...section.config,
            // Ensure new properties are included
            titleAlignment: section.config?.titleAlignment,
            contentAlignment: section.config?.contentAlignment,
            subtitleAlignment: section.config?.subtitleAlignment,
            titleFontFamily: section.config?.titleFontFamily,
            titleFontSize: section.config?.titleFontSize,
            titleFontWeight: section.config?.titleFontWeight,
            titleColor: section.config?.titleColor,
          };

          return {
            id: section.id || `${section.type}-${Date.now()}-${index}`,
            type: section.type,
            position: index,
            title: section.title || '',
            subtitle: section.subtitle || '',
            content: section.content || '',
            config: config,
            styles: section.styles || {},
            isActive: section.isActive !== undefined ? section.isActive : true,
            createdAt: section.createdAt || new Date(),
            updatedAt: new Date(), // Always use current time
          };
        });

        console.log(
          '📦 Processed sections titles:',
          processedSections.map((s) => s.title)
        );

        const saveData = {
          sections: processedSections,
          pageTitle: page.pageTitle || 'Untitled Page',
          metaDescription: page.metaDescription || '',
          metaKeywords: page.metaKeywords || [],
          settings: {
            showHeader: page.settings?.showHeader !== false,
            showFooter: page.settings?.showFooter !== false,
            showSponsorBanner: page.settings?.showSponsorBanner !== false,
            sponsorBannerPosition:
              page.settings?.sponsorBannerPosition || 'bottom',
            containerMaxWidth: page.settings?.containerMaxWidth || '1200px',
            defaultSectionSpacing:
              page.settings?.defaultSectionSpacing || '3rem',
            backgroundColor: page.settings?.backgroundColor || '#ffffff',
            textColor: page.settings?.textColor || '#333333',
            accentColor: page.settings?.accentColor || '#594230',
            canonicalUrl: page.settings?.canonicalUrl || '',
            openGraphImage: page.settings?.openGraphImage || '',
            headerScripts: page.settings?.headerScripts || '',
            footerScripts: page.settings?.footerScripts || '',
          },
        };

        console.log('📤 Full save data:', JSON.stringify(saveData, null, 2));

        const token = localStorage.getItem('token');
        if (!token) {
          console.error('❌ No token found');
          alert('Please login again');
          window.location.href = '/login';
          return;
        }

        console.log(
          '🌐 Sending PUT request to:',
          `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${page._id}`
        );

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${page._id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(saveData),
          }
        );

        console.log('📥 Response status:', response.status);

        const data = await response.json();
        console.log('📥 Response data:', data);

        if (!response.ok) {
          console.error('❌ HTTP error:', response.status);
          console.error('❌ Error message:', data.message);
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          console.log('✅ Save successful!');
          console.log(
            '📊 Updated page sections:',
            data.data.sections?.map((s: PageSection) => s.title)
          );

          setSaveStatus('saved');
          setHasUnsavedChanges(false);
          const updatedPage = data.data;
          setPage(updatedPage);
          setSections(updatedPage.sections || []);
          sectionsRef.current = updatedPage.sections || [];
          setLastSaved(new Date());

          // Add to history
          addToHistory(updatedPage);

          if (showAlert) {
            console.log('✅ Showing success alert');
            // Show success message briefly
            setTimeout(() => setSaveStatus('idle'), 2000);
          } else {
            console.log('✅ Auto-save successful');
            // Just reset status without alert
            setTimeout(() => setSaveStatus('idle'), 1000);
          }
        } else {
          console.error('❌ API returned success: false');
          console.error('❌ Error:', data.message);
          setSaveStatus('error');
          if (showAlert) {
            alert(data.message || 'Error saving page');
          }
        }
      } catch (error: any) {
        console.error('❌ Catch block error:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);

        setSaveStatus('error');
        if (showAlert) {
          alert(error.message || 'Error saving page');
        }
      } finally {
        console.log('🏁 ===== SAVE PAGE END =====');
      }
    },
    [page, addToHistory]
  );

  // Auto-save on changes
  useEffect(() => {
    if (page?._id && sections.length > 0 && hasUnsavedChanges) {
      const autoSaveTimer = setTimeout(() => {
        if (saveStatus === 'idle') {
          savePage(false);
          setHasUnsavedChanges(false);
        }
      }, 5000); // 5 seconds

      return () => clearTimeout(autoSaveTimer);
    }
  }, [sections, page, saveStatus, hasUnsavedChanges, savePage]);

  // Publish page
  const publishPage = async () => {
    if (!page?._id) {
      alert('No page to publish');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login again');
        window.location.href = '/login';
        return;
      }

      // First save any unsaved changes
      await savePage(false);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${page._id}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      if (data.success) {
        Swal.fire({
          title: 'Published!',
          text: 'Page published successfully!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });

        loadPage();
      } else {
        Swal.fire({
          title: 'Error',
          text: data.message || 'Error publishing page',
          icon: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error publishing page:', error);
      alert(error.message || 'Error publishing page');
    }
  };

  // Unpublish page
  const unpublishPage = async () => {
    if (!page?._id) {
      alert('No page to unpublish');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login again');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${page._id}/unpublish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Unpublished',
          text: 'Page unpublished successfully!',
          confirmButtonColor: '#3085d6',
        });

        // Reload page to get updated published status
        loadPage();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Error unpublishing page',
          confirmButtonColor: '#d33',
        });
      }
    } catch (error: any) {
      console.error('Error unpublishing page:', error);
      alert(error.message || 'Error unpublishing page');
    }
  };

  // Apply template
  const applyTemplate = (templateSections: PageSection[]) => {
    const updatedSections = templateSections.map((section, index) => ({
      ...section,
      id: `${section.type}-${Date.now()}-${index}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      position: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    setSections(updatedSections);
    sectionsRef.current = updatedSections;
    setShowTemplateModal(false);
    setSelectedSection(null);
    setIsEditing(false);
    setHasUnsavedChanges(true);

    // Auto-save after applying template
    if (page?._id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePage(false);
        setHasUnsavedChanges(false);
      }, 1000);
    }
  };

  // Export page configuration
  const exportPage = () => {
    const pageConfig = {
      page: {
        pageType: page?.pageType,
        pageTitle: page?.pageTitle,
        metaDescription: page?.metaDescription,
        metaKeywords: page?.metaKeywords,
        settings: page?.settings,
      },
      sections: sectionsRef.current,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    const dataStr = JSON.stringify(pageConfig, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `${page?.pageSlug || 'page'}-config.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import page configuration
  const importPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);

        if (config.sections && Array.isArray(config.sections)) {
          const importedSections = config.sections.map(
            (section: PageSection, index: number) => ({
              ...section,
              id: `${section.type}-${Date.now()}-${index}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              position: index,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          );

          setSections(importedSections);
          sectionsRef.current = importedSections;
          setShowImportModal(false);
          setSelectedSection(null);
          setIsEditing(false);
          setHasUnsavedChanges(true);

          // Auto-save after import
          if (page?._id) {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
              savePage(false);
              setHasUnsavedChanges(false);
            }, 1000);
          }

          alert('Page configuration imported successfully!');
        } else {
          alert('Invalid configuration file format');
        }
      } catch (error) {
        console.error('Error importing page:', error);
        alert('Error importing page configuration');
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  // Update page settings
  const updatePageSetting = (key: string, value: any) => {
    if (!page) return;

    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          [key]: value,
        },
      };
    });

    setHasUnsavedChanges(true);

    // Auto-save after updating settings
    if (page?._id) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePage(false);
        setHasUnsavedChanges(false);
      }, 1000);
    }
  };

  // Reset page to default
  const resetPage = () => {
    if (
      window.confirm(
        'Are you sure you want to reset this page? All current sections will be removed.'
      )
    ) {
      setSections([]);
      sectionsRef.current = [];
      setSelectedSection(null);
      setIsEditing(false);
      setHasUnsavedChanges(true);

      // Auto-save after reset
      if (page?._id) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          savePage(false);
          setHasUnsavedChanges(false);
        }, 500);
      }
    }
  };

  // View live page
  const viewLivePage = () => {
    if (page?.pageSlug) {
      window.open(`/page/${page.pageSlug}`, '_blank');
    }
  };

  // Handle page selection from PagesDirectory
  const handlePageSelect = (pageId: string) => {
    navigate(`/admin/page-builder/edit/${pageId}`);
    setShowPagesDirectory(false);
  };

  // Format time for display
  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (loading && !page) {
    return (
      <div className='container-fluid py-5'>
        <div className='text-center'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='mt-3'>Loading page...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className='container-fluid py-5'>
        <div className='alert alert-danger'>
          <h4>Page Not Found</h4>
          <p>The page could not be loaded.</p>
          <button
            className='btn btn-primary'
            onClick={() => navigate('/admin/pages')}
          >
            Back to Pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='page-wrapper'>
        <div className='content content-two'>
          <div className='page-builder-container vh-100 d-flex flex-column'>
            {/* Builder Header */}
            <div className='builder-header p-3 d-flex justify-content-between align-items-center'>
              <div className='d-flex align-items-center'>
                <button
                  className='btn btn-outline-light btn-sm me-2'
                  onClick={() => navigate('/admin/pages')}
                  title='Back to Pages Directory'
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h4 className='mb-0 d-flex align-items-center'>
                    {page.pageTitle}
                    <span className='badge bg-secondary ms-2'>
                      {page.pageType.charAt(0).toUpperCase() +
                        page.pageType.slice(1)}
                    </span>
                    {page.publishedAt ? (
                      <span className='badge bg-success ms-1'>Published</span>
                    ) : (
                      <span className='badge bg-warning ms-1'>Draft</span>
                    )}
                    {!page.isActive && (
                      <span className='badge bg-danger ms-1'>Inactive</span>
                    )}
                  </h4>
                  <small className='text-muted'>
                    <Globe size={12} className='me-1' />
                    <a
                      href={`/page/${page.pageSlug}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-decoration-none'
                    >
                      /page/{page.pageSlug}
                    </a>
                    {lastSaved && (
                      <span className='ms-3'>
                        • Last saved: {formatTime(lastSaved)}
                      </span>
                    )}
                    {hasUnsavedChanges && (
                      <span className='ms-2 text-warning'>
                        • Unsaved changes
                      </span>
                    )}
                  </small>
                </div>
              </div>
              <div className='d-flex gap-2'>
                {/* History controls */}
                <div className='btn-group me-2'>
                  <button
                    className='btn btn-outline-light btn-sm'
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title='Undo (Ctrl+Z)'
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className='btn btn-outline-light btn-sm'
                    onClick={redo}
                    disabled={historyIndex >= pageHistory.length - 1}
                    title='Redo (Ctrl+Y)'
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* View live */}
                <button
                  className='btn btn-outline-light btn-sm'
                  onClick={viewLivePage}
                  title='View Live Page'
                >
                  <ExternalLink size={16} className='me-1' />
                  View Live
                </button>

                {/* Preview toggle */}
                <button
                  className='btn btn-outline-light btn-sm'
                  onClick={() => setPreviewMode(!previewMode)}
                  title={previewMode ? 'Edit Mode' : 'Preview Mode'}
                >
                  <Eye size={16} className='me-1' />
                  {previewMode ? 'Edit' : 'Preview'}
                </button>

                {/* More options */}
                <div className='dropdown'>
                  <button
                    className='btn btn-outline-light btn-sm dropdown-toggle'
                    type='button'
                    data-bs-toggle='dropdown'
                    title='More Options'
                  >
                    <MoreVertical size={16} />
                  </button>
                  <ul className='dropdown-menu dropdown-menu-end'>
                    <li>
                      <button
                        className='dropdown-item'
                        onClick={() => setShowTemplateModal(true)}
                      >
                        <Copy size={16} className='me-2' />
                        Templates
                      </button>
                    </li>
                    <li>
                      <button
                        className='dropdown-item'
                        onClick={() => setShowPagesDirectory(true)}
                      >
                        <FileSearch size={16} className='me-2' />
                        Browse All Pages
                      </button>
                    </li>
                    <li>
                      <button className='dropdown-item' onClick={exportPage}>
                        <Download size={16} className='me-2' />
                        Export
                      </button>
                    </li>
                    <li>
                      <button
                        className='dropdown-item'
                        onClick={() => setShowImportModal(true)}
                      >
                        <Upload size={16} className='me-2' />
                        Import
                      </button>
                    </li>
                    <li>
                      <hr className='dropdown-divider' />
                    </li>
                    {page.publishedAt ? (
                      <li>
                        <button
                          className='dropdown-item text-warning'
                          onClick={unpublishPage}
                        >
                          <RefreshCw size={16} className='me-2' />
                          Unpublish
                        </button>
                      </li>
                    ) : (
                      <li>
                        <button
                          className='dropdown-item text-success'
                          onClick={publishPage}
                        >
                          <RefreshCw size={16} className='me-2' />
                          Publish
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        className='dropdown-item text-danger'
                        onClick={resetPage}
                      >
                        <Trash2 size={16} className='me-2' />
                        Reset Page
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Save button */}
                <button
                  className='btn btn-primary btn-sm'
                  onClick={() => savePage(true)}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <span
                        className='spinner-border spinner-border-sm me-1'
                        role='status'
                      ></span>
                      Saving...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Save size={16} className='me-1' />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save size={16} className='me-1' />
                      Save
                    </>
                  )}
                </button>

                {/* Publish/Update button */}
                <button
                  className={`btn btn-sm ${
                    page.publishedAt ? 'btn-warning' : 'btn-success'
                  }`}
                  onClick={page.publishedAt ? unpublishPage : publishPage}
                  disabled={loading || saveStatus === 'saving'}
                >
                  {page.publishedAt ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className='builder-content flex-grow-1 overflow-hidden'>
              {previewMode ? (
                // Preview Mode
                <div className='preview-container h-100'>
                  <PageRenderer pageSlug={page.pageSlug} isEditing={false} />
                </div>
              ) : (
                // Edit Mode
                <div className='row g-0 h-100'>
                  {/* Left Sidebar - Available Sections */}
                  <div
                    className={`${
                      sidebarCollapsed ? 'col-md-1' : 'col-md-3'
                    } border-end h-100 overflow-auto`}
                  >
                    {!sidebarCollapsed ? (
                      <div className='p-3'>
                        <div className='d-flex justify-content-between align-items-center mb-3'>
                          <h5 className='mb-0'>Add Section</h5>
                          <button
                            className='btn btn-sm btn-outline-secondary'
                            onClick={() => setSidebarCollapsed(true)}
                            title='Collapse Sidebar'
                          >
                            <ChevronLeft size={16} />
                          </button>
                        </div>

                        {Object.entries(sectionCategories).map(
                          ([categoryKey, categoryName]) => {
                            const categorySections = sectionTypes.filter(
                              (type) => type.category === categoryKey
                            );

                            if (categorySections.length === 0) return null;

                            return (
                              <div key={categoryKey} className='mb-4'>
                                <h6 className='text-muted mb-2'>
                                  {categoryName}
                                </h6>
                                <div className='section-types-grid'>
                                  {categorySections.map((type) => (
                                    <button
                                      key={type.id}
                                      className='section-type-card btn btn-outline-primary text-start d-flex align-items-center mb-2 w-100'
                                      onClick={() => addSection(type.id)}
                                    >
                                      <div className='me-2'>{type.icon}</div>
                                      <div>
                                        <div className='fw-semibold'>
                                          {type.name}
                                        </div>
                                        <small className='text-muted'>
                                          {type.description}
                                        </small>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        )}

                        {/* Quick Actions */}
                        <div className='mt-4'>
                          <h6 className='text-muted mb-2'>Quick Actions</h6>
                          <div className='d-grid gap-2'>
                            <button
                              className='btn btn-outline-secondary btn-sm'
                              onClick={() => setShowTemplateModal(true)}
                            >
                              <Copy size={14} className='me-1' />
                              Load Template
                            </button>
                            <button
                              className='btn btn-outline-secondary btn-sm'
                              onClick={() =>
                                setShowSettingsPanel(!showSettingsPanel)
                              }
                            >
                              <Settings size={14} className='me-1' />
                              Page Settings
                            </button>
                          </div>
                        </div>

                        {/* Page Stats */}
                        <div className='mt-4 pt-3 border-top'>
                          <h6 className='text-muted mb-2'>Page Stats</h6>
                          <div className='small'>
                            <div className='d-flex justify-content-between mb-1'>
                              <span>Sections:</span>
                              <span className='fw-semibold'>
                                {sections.length}
                              </span>
                            </div>
                            <div className='d-flex justify-content-between mb-1'>
                              <span>Active:</span>
                              <span className='fw-semibold'>
                                {sections.filter((s) => s.isActive).length}
                              </span>
                            </div>
                            <div className='d-flex justify-content-between mb-1'>
                              <span>Last Auto-save:</span>
                              <span className='fw-semibold'>
                                {formatTime(lastSaved)}
                              </span>
                            </div>
                            <div className='d-flex justify-content-between'>
                              <span>History States:</span>
                              <span className='fw-semibold'>
                                {historyIndex + 1}/{pageHistory.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='p-3 text-center'>
                        <button
                          className='btn btn-sm btn-outline-secondary mb-3'
                          onClick={() => setSidebarCollapsed(false)}
                          title='Expand Sidebar'
                        >
                          <ChevronRight size={16} />
                        </button>
                        <div className='d-grid gap-2'>
                          {sectionTypes.slice(0, 8).map((type) => (
                            <button
                              key={type.id}
                              className='btn btn-outline-primary btn-sm'
                              onClick={() => addSection(type.id)}
                              title={type.name}
                            >
                              {type.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Main Content - Sections List & Editor */}
                  <div
                    className={`${
                      sidebarCollapsed ? 'col-md-11' : 'col-md-9'
                    } h-100 d-flex`}
                  >
                    {showSettingsPanel && !sidebarCollapsed ? (
                      // Page Settings Panel
                      <div className='col-md-4 bg-white border-end h-100 overflow-auto'>
                        <div className='p-3'>
                          <div className='d-flex justify-content-between align-items-center mb-3'>
                            <h5 className='mb-0'>Page Settings</h5>
                            <button
                              className='btn btn-sm btn-outline-secondary'
                              onClick={() => setShowSettingsPanel(false)}
                            >
                              ✕
                            </button>
                          </div>

                          <div className='mb-4'>
                            <label className='form-label'>Page Title</label>
                            <input
                              type='text'
                              className='form-control'
                              value={page.pageTitle}
                              onChange={(e) =>
                                setPage({ ...page, pageTitle: e.target.value })
                              }
                            />
                          </div>

                          <div className='mb-4'>
                            <label className='form-label'>
                              Meta Description
                            </label>
                            <textarea
                              className='form-control'
                              rows={3}
                              value={page.metaDescription || ''}
                              onChange={(e) =>
                                setPage({
                                  ...page,
                                  metaDescription: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className='mb-4'>
                            <label className='form-label'>
                              Container Max Width
                            </label>
                            <select
                              className='form-select'
                              value={
                                page.settings.containerMaxWidth || '1200px'
                              }
                              onChange={(e) =>
                                updatePageSetting(
                                  'containerMaxWidth',
                                  e.target.value
                                )
                              }
                            >
                              <option value='100%'>Full Width</option>
                              <option value='1400px'>1400px</option>
                              <option value='1200px'>1200px</option>
                              <option value='992px'>992px</option>
                              <option value='768px'>768px</option>
                            </select>
                          </div>

                          <div className='mb-4'>
                            <label className='form-label'>
                              Background Color
                            </label>
                            <input
                              type='color'
                              className='form-control form-control-color'
                              value={page.settings.backgroundColor || '#ffffff'}
                              onChange={(e) =>
                                updatePageSetting(
                                  'backgroundColor',
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className='mb-4'>
                            <label className='form-label'>Accent Color</label>
                            <input
                              type='color'
                              className='form-control form-control-color'
                              value={page.settings.accentColor || '#594230'}
                              onChange={(e) =>
                                updatePageSetting('accentColor', e.target.value)
                              }
                            />
                          </div>

                          <div className='mb-3'>
                            <div className='form-check'>
                              <input
                                type='checkbox'
                                className='form-check-input'
                                checked={page.settings.showHeader !== false}
                                onChange={(e) =>
                                  updatePageSetting(
                                    'showHeader',
                                    e.target.checked
                                  )
                                }
                              />
                              <label className='form-check-label'>
                                Show Header
                              </label>
                            </div>
                            <div className='form-check'>
                              <input
                                type='checkbox'
                                className='form-check-input'
                                checked={page.settings.showFooter !== false}
                                onChange={(e) =>
                                  updatePageSetting(
                                    'showFooter',
                                    e.target.checked
                                  )
                                }
                              />
                              <label className='form-check-label'>
                                Show Footer
                              </label>
                            </div>
                          </div>

                          <button
                            className='btn btn-primary w-100'
                            onClick={() => {
                              savePage(true);
                              setShowSettingsPanel(false);
                            }}
                          >
                            Save Settings
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Sections List & Editor */}
                    <div
                      className={`${
                        showSettingsPanel && !sidebarCollapsed
                          ? 'col-md-8'
                          : 'col-12'
                      } h-100 d-flex`}
                    >
                      <div className='col-md-8 h-100 overflow-auto p-3'>
                        <div className='d-flex justify-content-between align-items-center mb-3'>
                          <h5 className='mb-0'>
                            Page Sections ({sections.length})
                            {sections.filter((s) => !s.isActive).length > 0 && (
                              <span className='badge bg-warning ms-2'>
                                {sections.filter((s) => !s.isActive).length}{' '}
                                inactive
                              </span>
                            )}
                          </h5>
                          <div className='d-flex gap-2'>
                            <button
                              className='btn btn-sm btn-outline-secondary'
                              onClick={() => setShowTemplateModal(true)}
                            >
                              <Copy size={14} className='me-1' />
                              Template
                            </button>
                            <button
                              className='btn btn-sm btn-outline-secondary'
                              onClick={() =>
                                setShowSettingsPanel(!showSettingsPanel)
                              }
                            >
                              <Settings size={14} className='me-1' />
                              Settings
                            </button>
                          </div>
                        </div>

                        <DragDropContext onDragEnd={onDragEnd}>
                          <Droppable droppableId='sections'>
                            {(provided: DroppableProvided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className='sections-list'
                              >
                                {sections.length === 0 ? (
                                  <div className='text-center py-5 text-muted'>
                                    <div className='mb-3'>
                                      <Plus size={48} />
                                    </div>
                                    <h5>No sections yet</h5>
                                    <p className='mb-4'>
                                      Add sections from the left sidebar to
                                      build your page.
                                    </p>
                                    <button
                                      className='btn btn-primary'
                                      onClick={() => setShowTemplateModal(true)}
                                    >
                                      <Copy size={16} className='me-2' />
                                      Start with a Template
                                    </button>
                                  </div>
                                ) : (
                                  sections
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
                                            } ${
                                              !section.isActive
                                                ? 'opacity-50'
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
                                                        (t) =>
                                                          t.id === section.type
                                                      )?.icon
                                                    }
                                                  </div>
                                                  <div>
                                                    <h6 className='mb-0 d-flex align-items-center'>
                                                      {section.title ||
                                                        `Untitled ${section.type} Section`}
                                                      {!section.isActive && (
                                                        <span className='badge bg-secondary ms-2'>
                                                          Inactive
                                                        </span>
                                                      )}
                                                    </h6>
                                                    <small className='text-muted'>
                                                      {section.type
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        section.type.slice(
                                                          1
                                                        )}{' '}
                                                      • Position:{' '}
                                                      {section.position}
                                                    </small>
                                                  </div>
                                                </div>
                                                <div className='section-actions d-flex gap-1'>
                                                  <div className='btn-group btn-group-sm'>
                                                    <button
                                                      className='btn btn-outline-secondary'
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveSectionUp(index);
                                                      }}
                                                      disabled={index === 0}
                                                      title='Move Up'
                                                    >
                                                      ↑
                                                    </button>
                                                    <button
                                                      className='btn btn-outline-secondary'
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveSectionDown(index);
                                                      }}
                                                      disabled={
                                                        index ===
                                                        sections.length - 1
                                                      }
                                                      title='Move Down'
                                                    >
                                                      ↓
                                                    </button>
                                                  </div>
                                                  <button
                                                    className='btn btn-sm btn-outline-secondary'
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      duplicateSection(section);
                                                    }}
                                                    title='Duplicate'
                                                  >
                                                    <Copy size={14} />
                                                  </button>
                                                  <button
                                                    className='btn btn-sm btn-outline-danger'
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      deleteSection(section.id);
                                                    }}
                                                    title='Delete'
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              </div>
                                              <div className='mt-2'>
                                                {section.config?.showTitle && (
                                                  <span className='badge bg-info me-2'>
                                                    Shows Title
                                                  </span>
                                                )}
                                                {section.config?.limit && (
                                                  <span className='badge bg-secondary me-2'>
                                                    Limit:{' '}
                                                    {section.config.limit}
                                                  </span>
                                                )}
                                                {section.styles
                                                  ?.backgroundColor && (
                                                  <span
                                                    className='badge me-2'
                                                    style={{
                                                      backgroundColor:
                                                        section.styles
                                                          .backgroundColor,
                                                      color:
                                                        section.styles
                                                          .textColor || '#333',
                                                    }}
                                                  >
                                                    Custom Style
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>

                      {/* Right Sidebar - Section Editor */}
                      <div className='col-md-4 border-start h-100 overflow-auto p-3'>
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
                          <div className='text-center py-5 text-muted h-100 d-flex flex-column justify-content-center'>
                            <Settings size={48} className='mb-3 mx-auto' />
                            <h5>Select a Section</h5>
                            <p className='mb-4'>
                              Click on any section to edit its content and
                              settings.
                            </p>
                            <div className='small text-start'>
                              <h6 className='text-muted mb-2'>Tips:</h6>
                              <ul className='list-unstyled'>
                                <li className='mb-1'>
                                  • Click section to edit
                                </li>
                                <li className='mb-1'>• Drag to reorder</li>
                                <li className='mb-1'>
                                  • Use arrows to move up/down
                                </li>
                                <li>• Changes auto-save after 5 seconds</li>
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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

            {/* Import Modal */}
            {showImportModal && (
              <div className='modal-backdrop show d-flex align-items-center justify-content-center'>
                <div className='modal-dialog'>
                  <div className='modal-content'>
                    <div className='modal-header'>
                      <h5 className='modal-title'>Import Page Configuration</h5>
                      <button
                        type='button'
                        className='btn-close'
                        onClick={() => setShowImportModal(false)}
                      ></button>
                    </div>
                    <div className='modal-body'>
                      <div className='alert alert-warning'>
                        <strong>Warning:</strong> Importing will replace all
                        current sections. Make sure to export your current
                        configuration first if needed.
                      </div>
                      <input
                        type='file'
                        className='form-control'
                        accept='.json'
                        onChange={importPage}
                      />
                      <small className='text-muted d-block mt-2'>
                        Select a JSON file previously exported from the Page
                        Builder.
                      </small>
                    </div>
                    <div className='modal-footer'>
                      <button
                        type='button'
                        className='btn btn-outline-secondary'
                        onClick={() => setShowImportModal(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-save indicator */}
            {saveStatus === 'saving' && (
              <div className='position-fixed bottom-0 end-0 m-3'>
                <div
                  className='alert alert-info alert-dismissible fade show mb-0'
                  role='alert'
                >
                  <div className='d-flex align-items-center'>
                    <div
                      className='spinner-border spinner-border-sm me-2'
                      role='status'
                    >
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                    Auto-saving changes...
                  </div>
                </div>
              </div>
            )}

            {/* Save status indicator */}
            {saveStatus === 'saved' && (
              <div className='position-fixed bottom-0 end-0 m-3'>
                <div
                  className='alert alert-success alert-dismissible fade show mb-0'
                  role='status'
                >
                  <div className='d-flex align-items-center'>
                    <Save size={16} className='me-2' />
                    Changes saved successfully!
                    <button
                      type='button'
                      className='btn-close ms-2'
                      data-bs-dismiss='alert'
                      aria-label='Close'
                      onClick={() => setSaveStatus('idle')}
                    ></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pages Directory Modal */}
      {showPagesDirectory && (
        <div className='modal-backdrop show d-flex align-items-center justify-content-center p-4'>
          <div className='modal-dialog modal-xl modal-dialog-scrollable'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title'>Pages Directory</h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={() => setShowPagesDirectory(false)}
                ></button>
              </div>
              <div className='modal-body p-0'>
                <PagesDirectory
                  onPageSelect={handlePageSelect}
                  showCreateButton={false}
                />
              </div>
              <div className='modal-footer'>
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={() => setShowPagesDirectory(false)}
                >
                  Close
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => {
                    setShowPagesDirectory(false);
                    navigate('/admin/page-builder/new');
                  }}
                >
                  <Plus size={16} className='me-1' />
                  Create New Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PageBuilder;
