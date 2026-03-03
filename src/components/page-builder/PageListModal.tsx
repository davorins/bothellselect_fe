// src/components/page-builder/PageListModal.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Plus,
  Check,
  X as XIcon,
} from 'lucide-react';

interface Page {
  _id: string;
  pageSlug: string;
  pageTitle: string;
  pageType: string;
  isActive: boolean;
  updatedAt: string;
  publishedAt?: string;
  sectionsCount?: number;
}

interface PageListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (pageId: string) => void;
  selectionMode?: boolean;
}

const PageListModal: React.FC<PageListModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
}) => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pageTypes = [
    'home',
    'about',
    'programs',
    'tournaments',
    'contact',
    'spotlight',
    'registration',
    'custom',
  ];

  useEffect(() => {
    if (isOpen) {
      fetchPages();
    }
  }, [isOpen, search, filterType, filterActive]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType) params.append('pageType', filterType);
      if (filterActive) params.append('isActive', filterActive);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/list?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPages(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pageId: string, pageTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${pageTitle}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(pageId);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${pageId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchPages();
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = (pageId: string) => {
    if (selectionMode && onSelect) {
      onSelect(pageId);
      onClose();
    }
  };

  const handleToggleActive = async (pageId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages/${pageId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: !currentStatus,
          }),
        }
      );

      if (response.ok) {
        fetchPages();
      }
    } catch (error) {
      console.error('Error toggling page status:', error);
    }
  };

  const getPageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      home: 'primary',
      about: 'info',
      programs: 'success',
      tournaments: 'warning',
      contact: 'danger',
      spotlight: 'purple',
      registration: 'teal',
      custom: 'secondary',
    };
    return colors[type] || 'secondary';
  };

  if (!isOpen) return null;

  return (
    <div className='modal-backdrop show d-flex align-items-center justify-content-center'>
      <div className='modal-dialog modal-xl'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>
              {selectionMode ? 'Select Page' : 'Page Management'}
            </h5>
            <button
              type='button'
              className='btn-close'
              onClick={onClose}
            ></button>
          </div>
          <div className='modal-body'>
            {/* Search and Filters */}
            <div className='row mb-4'>
              <div className='col-md-6'>
                <div className='input-group'>
                  <span className='input-group-text'>
                    <Search size={18} />
                  </span>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='Search pages...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className='col-md-3'>
                <select
                  className='form-select'
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value=''>All Types</option>
                  {pageTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className='col-md-3'>
                <select
                  className='form-select'
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                >
                  <option value=''>All Status</option>
                  <option value='true'>Active</option>
                  <option value='false'>Inactive</option>
                </select>
              </div>
            </div>

            {/* Pages List */}
            <div className='table-responsive'>
              <table className='table table-hover'>
                <thead>
                  <tr>
                    {selectionMode && <th></th>}
                    <th>Title</th>
                    <th>URL</th>
                    <th>Type</th>
                    <th>Sections</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={selectionMode ? 8 : 7}
                        className='text-center py-4'
                      >
                        <div
                          className='spinner-border text-primary'
                          role='status'
                        >
                          <span className='visually-hidden'>Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : pages.length === 0 ? (
                    <tr>
                      <td
                        colSpan={selectionMode ? 8 : 7}
                        className='text-center py-4'
                      >
                        <div className='text-muted'>
                          <i className='ti ti-file-text fs-1 mb-3 d-block'></i>
                          No pages found
                          {search || filterType || filterActive ? (
                            <p className='mb-0'>Try changing your filters</p>
                          ) : (
                            <>
                              <p className='mb-2'>Create your first page</p>
                              <Link
                                to='/admin/page-builder/new'
                                className='btn btn-sm btn-primary'
                                onClick={onClose}
                              >
                                <Plus size={16} className='me-1' />
                                Create New Page
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pages.map((page) => (
                      <tr
                        key={page._id}
                        className={
                          selectedPage === page._id ? 'table-active' : ''
                        }
                      >
                        {selectionMode && (
                          <td>
                            <div className='form-check'>
                              <input
                                className='form-check-input'
                                type='radio'
                                name='selectedPage'
                                checked={selectedPage === page._id}
                                onChange={() => setSelectedPage(page._id)}
                              />
                            </div>
                          </td>
                        )}
                        <td>
                          <div className='fw-semibold'>{page.pageTitle}</div>
                          <small className='text-muted'>
                            ID: {page._id.substring(0, 8)}...
                          </small>
                        </td>
                        <td>
                          <code>/page/{page.pageSlug}</code>
                          <br />
                          <a
                            href={`/page/${page.pageSlug}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-decoration-none small'
                          >
                            <Eye size={12} className='me-1' />
                            View Live
                          </a>
                        </td>
                        <td>
                          <span
                            className={`badge bg-${getPageTypeColor(
                              page.pageType
                            )}`}
                          >
                            {page.pageType}
                          </span>
                        </td>
                        <td>
                          <span className='badge bg-light text-dark'>
                            {page.sectionsCount || 0} sections
                          </span>
                        </td>
                        <td>
                          <div className='form-check form-switch d-inline-block'>
                            <input
                              className='form-check-input'
                              type='checkbox'
                              role='switch'
                              checked={page.isActive}
                              onChange={() =>
                                handleToggleActive(page._id, page.isActive)
                              }
                            />
                          </div>
                          <small className='ms-2'>
                            {page.isActive ? 'Active' : 'Inactive'}
                          </small>
                        </td>
                        <td>
                          {new Date(page.updatedAt).toLocaleDateString()}
                          <br />
                          <small className='text-muted'>
                            {new Date(page.updatedAt).toLocaleTimeString()}
                          </small>
                        </td>
                        <td>
                          <div className='btn-group btn-group-sm'>
                            <Link
                              to={`/admin/page-builder/edit/${page._id}`}
                              className='btn btn-outline-primary'
                              title='Edit'
                              onClick={selectionMode ? undefined : onClose}
                            >
                              <Edit size={14} />
                            </Link>
                            <button
                              className='btn btn-outline-danger'
                              onClick={() =>
                                handleDelete(page._id, page.pageTitle)
                              }
                              title='Delete'
                              disabled={deletingId === page._id}
                            >
                              {deletingId === page._id ? (
                                <span className='spinner-border spinner-border-sm'></span>
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className='modal-footer'>
            {selectionMode ? (
              <>
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => handleSelect(selectedPage!)}
                  disabled={!selectedPage}
                >
                  Select Page
                </button>
              </>
            ) : (
              <>
                <Link
                  to='/admin/page-builder/new'
                  className='btn btn-primary'
                  onClick={onClose}
                >
                  <Plus size={18} className='me-1' />
                  Create New Page
                </Link>
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={onClose}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageListModal;
