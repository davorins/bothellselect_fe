import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Home,
  Star,
  Users,
  Calendar,
  Contact,
  Settings,
  Trash2,
  Eye,
  Edit,
  Copy,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Globe,
  FileQuestion,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

interface Page {
  _id: string;
  pageSlug: string;
  pageTitle: string;
  pageType: string;
  isActive: boolean;
  isTemplate: boolean;
  updatedAt: string;
  publishedAt?: string;
  sectionsCount?: number;
  settings?: {
    showHeader?: boolean;
    showFooter?: boolean;
  };
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface PagesDirectoryProps {
  onPageSelect?: (pageId: string) => void;
  showCreateButton?: boolean;
}

const PagesDirectory: React.FC<PagesDirectoryProps> = ({
  onPageSelect,
  showCreateButton = true,
}) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  // Page types configuration
  const pageTypes = [
    {
      value: 'home',
      label: 'Home',
      icon: <Home size={16} />,
      color: 'primary',
    },
    {
      value: 'about',
      label: 'About',
      icon: <FileText size={16} />,
      color: 'info',
    },
    {
      value: 'programs',
      label: 'Programs',
      icon: <Users size={16} />,
      color: 'success',
    },
    {
      value: 'tournaments',
      label: 'Tournaments',
      icon: <Calendar size={16} />,
      color: 'warning',
    },
    {
      value: 'contact',
      label: 'Contact',
      icon: <Contact size={16} />,
      color: 'danger',
    },
    {
      value: 'spotlight',
      label: 'Spotlight',
      icon: <Star size={16} />,
      color: 'purple',
    },
    {
      value: 'registration',
      label: 'Registration',
      icon: <Settings size={16} />,
      color: 'teal',
    },
    {
      value: 'custom',
      label: 'Custom',
      icon: <FileText size={16} />,
      color: 'secondary',
    },
  ];

  // System pages that should not be deleted
  const systemPages = ['home', 'in-the-spotlight'];

  useEffect(() => {
    fetchPages();
  }, [search, filterType, filterStatus, currentPage]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      setError(null);

      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }
      if (filterType && filterType !== 'all') {
        params.append('pageType', filterType);
      }
      if (filterStatus && filterStatus !== 'all') {
        params.append('isActive', filterStatus === 'active' ? 'true' : 'false');
      }

      const response = await fetch(
        `${API_BASE_URL}/page-builder/admin/pages?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setPages(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.pages || 1);
        }
      } else {
        throw new Error(data.message || 'Failed to load pages');
      }
    } catch (err: any) {
      console.error('Error fetching pages:', err);
      setError(err.message || 'Failed to load pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (
    pageId: string,
    pageTitle: string,
    pageSlug: string
  ) => {
    // Check if it's a system page
    if (systemPages.includes(pageSlug)) {
      // Replace alert() with SweetAlert
      await Swal.fire({
        title: 'Cannot Delete System Page',
        text: `"${pageTitle}" is a system page and cannot be deleted. You can only edit system pages.`,
        icon: 'info',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
      return;
    }

    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete "${pageTitle}". This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });

    if (!confirmDelete.isConfirmed) {
      return;
    }

    try {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/page-builder/admin/pages/${pageId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete page');
      }

      // Remove from selected pages if present
      setSelectedPages((prev) => prev.filter((id) => id !== pageId));

      // Refresh the list
      fetchPages();

      // Show success message
      alert(`"${pageTitle}" has been deleted successfully.`);
    } catch (err: any) {
      console.error('Error deleting page:', err);
      alert(err.message || 'Failed to delete page. Please try again.');
    }
  };

  const handleDuplicate = async (page: Page) => {
    const newTitle = `${page.pageTitle} (Copy)`;
    const newSlug = `${page.pageSlug}-copy-${Date.now()}`;

    if (!window.confirm(`Create a copy of "${page.pageTitle}"?`)) {
      return;
    }

    try {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/page-builder/admin/pages/${page._id}/duplicate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newSlug,
            newTitle,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to duplicate page');
      }

      if (data.success) {
        alert('Page duplicated successfully!');
        fetchPages();
      }
    } catch (err: any) {
      console.error('Error duplicating page:', err);
      alert(err.message || 'Failed to duplicate page. Please try again.');
    }
  };

  const handleToggleStatus = async (pageId: string, currentStatus: boolean) => {
    try {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/page-builder/admin/pages/${pageId}`,
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update page status');
      }

      fetchPages();
    } catch (err: any) {
      console.error('Error toggling page status:', err);
      alert(err.message || 'Failed to update page status. Please try again.');
    }
  };

  const handlePublish = async (pageId: string, pageTitle: string) => {
    const result = await Swal.fire({
      title: `Publish "${pageTitle}"?`,
      text: 'It will be visible to the public.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, publish',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/page-builder/admin/pages/${pageId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to publish page');
      }

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Page published successfully!',
          showConfirmButton: false,
          timer: 1500,
        });

        fetchPages();
      }
    } catch (err: any) {
      console.error('Error publishing page:', err);
      alert(err.message || 'Failed to publish page. Please try again.');
    }
  };

  const handleUnpublish = async (pageId: string, pageTitle: string) => {
    const { isConfirmed } = await Swal.fire({
      title: `Unpublish "${pageTitle}"?`,
      text: 'It will no longer be visible to the public.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, unpublish',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!isConfirmed) {
      return;
    }

    try {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/page-builder/admin/pages/${pageId}/unpublish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to unpublish page');
      }

      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Unpublished',
          text: 'Page unpublished successfully!',
          confirmButtonColor: '#3085d6',
        });

        fetchPages();
      }
    } catch (err: any) {
      console.error('Error unpublishing page:', err);
      alert(err.message || 'Failed to unpublish page. Please try again.');
    }
  };

  const handleBulkAction = async () => {
    if (selectedPages.length === 0 || !bulkAction) {
      alert('Please select pages and choose an action.');
      return;
    }

    const actionText =
      bulkAction === 'delete'
        ? 'delete'
        : bulkAction === 'activate'
        ? 'activate'
        : 'deactivate';

    const confirmAction = await Swal.fire({
      title: `Confirm ${actionText}`,
      text: `Are you sure you want to ${actionText} ${selectedPages.length} selected page(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `${
        actionText.charAt(0).toUpperCase() + actionText.slice(1)
      }`,
      cancelButtonText: 'Cancel',
    });

    if (!confirmAction.isConfirmed) {
      return;
    }

    try {
      const token =
        localStorage.getItem('token') || sessionStorage.getItem('token');

      // Execute bulk action for each selected page
      const promises = selectedPages.map((pageId) => {
        if (bulkAction === 'delete') {
          return fetch(`${API_BASE_URL}/page-builder/admin/pages/${pageId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          return fetch(`${API_BASE_URL}/page-builder/admin/pages/${pageId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              isActive: bulkAction === 'activate',
            }),
          });
        }
      });

      await Promise.all(promises);

      // Clear selection
      setSelectedPages([]);
      setBulkAction('');

      // Refresh the list
      fetchPages();

      alert(`Successfully ${actionText}d ${selectedPages.length} page(s).`);
    } catch (err: any) {
      console.error('Error performing bulk action:', err);
      alert(`Failed to ${actionText} pages. Please try again.`);
    }
  };

  const handleSelectAll = () => {
    const nonTemplatePages = pages.filter((page) => !page.isTemplate);
    if (selectedPages.length === nonTemplatePages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(nonTemplatePages.map((page) => page._id));
    }
  };

  const handleSelectPage = (pageId: string) => {
    setSelectedPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    );
  };

  const getPageTypeInfo = (type: string) => {
    const found = pageTypes.find((t) => t.value === type);
    return (
      found || {
        label: type,
        icon: <FileQuestion size={16} />,
        color: 'secondary',
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderGridView = () => (
    <div className='row'>
      {pages
        .filter((page) => !page.isTemplate)
        .map((page) => {
          const typeInfo = getPageTypeInfo(page.pageType);
          const isSystemPage = systemPages.includes(page.pageSlug);

          return (
            <div key={page._id} className='col-md-6 col-lg-4 col-xl-3 mb-4'>
              <div
                className={`card h-100 border ${
                  selectedPages.includes(page._id) ? 'border-primary' : ''
                }`}
              >
                <div className='card-body'>
                  <div className='d-flex justify-content-between align-items-start mb-3'>
                    <div className='d-flex align-items-center'>
                      <div
                        className={`bg-${typeInfo.color}-subtle rounded p-2 me-2`}
                      >
                        <span className={`text-${typeInfo.color}`}>
                          {typeInfo.icon}
                        </span>
                      </div>
                      <div>
                        <h6 className='mb-0'>{page.pageTitle}</h6>
                        <small className='text-muted'>{typeInfo.label}</small>
                      </div>
                    </div>
                    <div className='dropdown'>
                      <button
                        className='btn btn-sm btn-link text-muted'
                        type='button'
                        data-bs-toggle='dropdown'
                      >
                        <MoreVertical size={16} />
                      </button>
                      <ul className='dropdown-menu dropdown-menu-end'>
                        <li>
                          <button
                            className='dropdown-item'
                            onClick={() =>
                              navigate(`/admin/page-builder/edit/${page._id}`)
                            }
                          >
                            <Edit size={14} className='me-2' />
                            Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className='dropdown-item'
                            onClick={() => handleDuplicate(page)}
                          >
                            <Copy size={14} className='me-2' />
                            Duplicate
                          </button>
                        </li>
                        <li>
                          <a
                            className='dropdown-item'
                            href={`/page/${page.pageSlug}`}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            <Eye size={14} className='me-2' />
                            View Live
                          </a>
                        </li>
                        {page.publishedAt ? (
                          <li>
                            <button
                              className='dropdown-item text-warning'
                              onClick={() =>
                                handleUnpublish(page._id, page.pageTitle)
                              }
                            >
                              <XCircle size={14} className='me-2' />
                              Unpublish
                            </button>
                          </li>
                        ) : (
                          <li>
                            <button
                              className='dropdown-item text-success'
                              onClick={() =>
                                handlePublish(page._id, page.pageTitle)
                              }
                            >
                              <CheckCircle size={14} className='me-2' />
                              Publish
                            </button>
                          </li>
                        )}
                        <li>
                          <hr className='dropdown-divider' />
                        </li>
                        <li>
                          <div className='dropdown-item d-flex justify-content-between align-items-center'>
                            <span>Status</span>
                            <div className='form-check form-switch'>
                              <input
                                className='form-check-input'
                                type='checkbox'
                                role='switch'
                                checked={page.isActive}
                                onChange={() =>
                                  handleToggleStatus(page._id, page.isActive)
                                }
                              />
                            </div>
                          </div>
                        </li>
                        {!isSystemPage && (
                          <>
                            <li>
                              <hr className='dropdown-divider' />
                            </li>
                            <li>
                              <button
                                className='dropdown-item text-danger'
                                onClick={() =>
                                  handleDelete(
                                    page._id,
                                    page.pageTitle,
                                    page.pageSlug
                                  )
                                }
                              >
                                <Trash2 size={14} className='me-2' />
                                Delete
                              </button>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className='mb-3'>
                    <small className='text-muted d-block'>URL</small>
                    <code className='small'>/page/{page.pageSlug}</code>
                  </div>

                  <div className='mb-3'>
                    <div className='d-flex justify-content-between'>
                      <small className='text-muted'>Sections</small>
                      <span className='badge bg-light text-dark'>
                        {page.sectionsCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className='d-flex justify-content-between align-items-center'>
                    <div>
                      {isSystemPage ? (
                        <span className='badge bg-info'>System</span>
                      ) : page.publishedAt ? (
                        <span className='badge bg-success'>Published</span>
                      ) : (
                        <span className='badge bg-warning'>Draft</span>
                      )}
                      {!page.isActive && (
                        <span className='badge bg-danger ms-1'>Inactive</span>
                      )}
                    </div>
                    <small className='text-muted'>
                      {formatDate(page.updatedAt)}
                    </small>
                  </div>
                </div>
                <div className='card-footer bg-transparent border-top'>
                  <div className='form-check'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      checked={selectedPages.includes(page._id)}
                      onChange={() => handleSelectPage(page._id)}
                    />
                    <label className='form-check-label small'>
                      Select for bulk action
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );

  const renderListView = () => (
    <div className='table-responsive'>
      <table className='table table-hover'>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type='checkbox'
                className='form-check-input'
                checked={
                  selectedPages.length ===
                  pages.filter((p) => !p.isTemplate).length
                }
                onChange={handleSelectAll}
              />
            </th>
            <th>Page</th>
            <th>URL</th>
            <th>Type</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages
            .filter((page) => !page.isTemplate)
            .map((page) => {
              const typeInfo = getPageTypeInfo(page.pageType);
              const isSystemPage = systemPages.includes(page.pageSlug);

              return (
                <tr
                  key={page._id}
                  className={
                    selectedPages.includes(page._id) ? 'table-active' : ''
                  }
                >
                  <td>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      checked={selectedPages.includes(page._id)}
                      onChange={() => handleSelectPage(page._id)}
                    />
                  </td>
                  <td>
                    <div className='d-flex align-items-center'>
                      <div
                        className={`bg-${typeInfo.color}-subtle rounded p-1 me-2`}
                      >
                        <span className={`text-${typeInfo.color}`}>
                          {typeInfo.icon}
                        </span>
                      </div>
                      <div>
                        <div className='fw-semibold'>{page.pageTitle}</div>
                        <small className='text-muted'>
                          {page.sectionsCount || 0} sections
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className='small'>/page/{page.pageSlug}</code>
                    <br />
                    <a
                      href={`/page/${page.pageSlug}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-decoration-none small'
                    >
                      <ExternalLink size={12} className='me-1' />
                      View Live
                    </a>
                  </td>
                  <td>
                    <span className={`badge bg-${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {isSystemPage && (
                      <span className='badge bg-info ms-1'>System</span>
                    )}
                  </td>
                  <td>
                    <div className='d-flex align-items-center'>
                      <div className='form-check form-switch me-2'>
                        <input
                          className='form-check-input'
                          type='checkbox'
                          role='switch'
                          checked={page.isActive}
                          onChange={() =>
                            handleToggleStatus(page._id, page.isActive)
                          }
                        />
                      </div>
                      <div>
                        {page.publishedAt ? (
                          <span className='badge bg-success'>Published</span>
                        ) : (
                          <span className='badge bg-warning'>Draft</span>
                        )}
                        {!page.isActive && (
                          <div className='text-danger small mt-1'>Inactive</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(page.updatedAt)}</td>
                  <td>
                    <div className='btn-group btn-group-sm'>
                      <button
                        className='btn btn-outline-primary'
                        onClick={() =>
                          navigate(`/admin/page-builder/edit/${page._id}`)
                        }
                        title='Edit'
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className='btn btn-outline-secondary'
                        onClick={() => handleDuplicate(page)}
                        title='Duplicate'
                      >
                        <Copy size={14} />
                      </button>
                      {page.publishedAt ? (
                        <button
                          className='btn btn-outline-warning'
                          onClick={() =>
                            handleUnpublish(page._id, page.pageTitle)
                          }
                          title='Unpublish'
                        >
                          <XCircle size={14} />
                        </button>
                      ) : (
                        <button
                          className='btn btn-outline-success'
                          onClick={() =>
                            handlePublish(page._id, page.pageTitle)
                          }
                          title='Publish'
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {!isSystemPage && (
                        <button
                          className='btn btn-outline-danger'
                          onClick={() =>
                            handleDelete(
                              page._id,
                              page.pageTitle,
                              page.pageSlug
                            )
                          }
                          title='Delete'
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <nav aria-label='Page navigation'>
        <ul className='pagination justify-content-center'>
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className='page-link'
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
          </li>

          {startPage > 1 && (
            <>
              <li className='page-item'>
                <button className='page-link' onClick={() => setCurrentPage(1)}>
                  1
                </button>
              </li>
              {startPage > 2 && (
                <li className='page-item disabled'>
                  <span className='page-link'>...</span>
                </li>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <li
              key={page}
              className={`page-item ${currentPage === page ? 'active' : ''}`}
            >
              <button
                className='page-link'
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            </li>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <li className='page-item disabled'>
                  <span className='page-link'>...</span>
                </li>
              )}
              <li className='page-item'>
                <button
                  className='page-link'
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </button>
              </li>
            </>
          )}

          <li
            className={`page-item ${
              currentPage === totalPages ? 'disabled' : ''
            }`}
          >
            <button
              className='page-link'
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  if (loading && pages.length === 0) {
    return (
      <div className='container-fluid py-5'>
        <div className='text-center'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
          <p className='mt-3'>Loading pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container-fluid py-5'>
        <div className='alert alert-danger'>
          <div className='d-flex align-items-center'>
            <AlertCircle size={24} className='me-2' />
            <div>
              <h4>Error Loading Pages</h4>
              <p>{error}</p>
              <button className='btn btn-primary' onClick={fetchPages}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredPages = pages.filter((page) => !page.isTemplate);
  const hasPages = filteredPages.length > 0;

  return (
    <div className='container-fluid'>
      {/* Header */}
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <div>
          <h2 className='mb-0'>Page Management</h2>
          <p className='text-muted mb-0'>
            Manage all custom pages on your website
          </p>
        </div>
        <div>
          <button
            className='btn btn-primary'
            onClick={() => navigate('/admin/page-builder/new')}
          >
            <Plus size={18} className='me-2' />
            Create New Page
          </button>
        </div>
      </div>

      {/* System Pages Notice */}
      <div className='alert alert-info mb-4'>
        <div className='d-flex align-items-center'>
          <Globe size={20} className='me-3' />
          <div>
            <strong>System Pages:</strong> Home page (<code>/</code>) and
            Spotlight page (<code>/in-the-spotlight</code>) are managed as
            system pages. You can edit them but not delete them. Custom pages
            can be fully managed here.
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className='card mb-4'>
        <div className='card-body'>
          <div className='row g-3 align-items-center'>
            <div className='col-md-4'>
              <div className='input-group'>
                <span className='input-group-text'>
                  <Search size={16} />
                </span>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Search by title, slug, or description...'
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
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-md-3'>
              <select
                className='form-select'
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value=''>All Status</option>
                <option value='active'>Active Only</option>
                <option value='inactive'>Inactive Only</option>
                <option value='published'>Published</option>
                <option value='draft'>Draft</option>
              </select>
            </div>

            <div className='col-md-2'>
              <div className='btn-group'>
                <button
                  className={`btn ${
                    viewMode === 'grid'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => setViewMode('grid')}
                  title='Grid View'
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`btn ${
                    viewMode === 'list'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => setViewMode('list')}
                  title='List View'
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedPages.length > 0 && (
            <div className='row mt-3'>
              <div className='col-12'>
                <div className='card border-primary'>
                  <div className='card-body py-2'>
                    <div className='d-flex justify-content-between align-items-center'>
                      <div className='d-flex align-items-center'>
                        <span className='badge bg-primary me-3'>
                          {selectedPages.length} selected
                        </span>
                        <select
                          className='form-select form-select-sm me-2'
                          style={{ width: 'auto' }}
                          value={bulkAction}
                          onChange={(e) => setBulkAction(e.target.value)}
                        >
                          <option value=''>Choose action...</option>
                          <option value='activate'>Activate</option>
                          <option value='deactivate'>Deactivate</option>
                          <option value='delete'>Delete</option>
                        </select>
                        <button
                          className='btn btn-sm btn-primary'
                          onClick={handleBulkAction}
                          disabled={!bulkAction}
                        >
                          Apply
                        </button>
                      </div>
                      <button
                        className='btn btn-sm btn-link text-danger'
                        onClick={() => setSelectedPages([])}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pages Display */}
      <div className='card'>
        <div className='card-body'>
          {!hasPages ? (
            <div className='text-center py-5'>
              <FileText size={48} className='text-muted mb-3' />
              <h4>No Pages Found</h4>
              <p className='text-muted mb-4'>
                {search || filterType || filterStatus
                  ? 'No pages match your filters. Try changing your search criteria.'
                  : "You haven't created any custom pages yet."}
              </p>
              <button
                className='btn btn-primary'
                onClick={() => navigate('/admin/page-builder/new')}
              >
                <Plus size={18} className='me-2' />
                Create Your First Page
              </button>
            </div>
          ) : (
            <>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <div>
                  <span className='text-muted'>
                    Showing {filteredPages.length} page
                    {filteredPages.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className='text-muted small'>
                  Page {currentPage} of {totalPages}
                </div>
              </div>

              {viewMode === 'grid' ? renderGridView() : renderListView()}

              {renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className='row mt-4'>
        <div className='col-md-3'>
          <div className='card'>
            <div className='card-body text-center'>
              <h3 className='text-primary'>{filteredPages.length}</h3>
              <p className='text-muted mb-0'>Total Pages</p>
            </div>
          </div>
        </div>
        <div className='col-md-3'>
          <div className='card'>
            <div className='card-body text-center'>
              <h3 className='text-success'>
                {filteredPages.filter((p) => p.publishedAt).length}
              </h3>
              <p className='text-muted mb-0'>Published</p>
            </div>
          </div>
        </div>
        <div className='col-md-3'>
          <div className='card'>
            <div className='card-body text-center'>
              <h3 className='text-warning'>
                {filteredPages.filter((p) => !p.publishedAt).length}
              </h3>
              <p className='text-muted mb-0'>Drafts</p>
            </div>
          </div>
        </div>
        <div className='col-md-3'>
          <div className='card'>
            <div className='card-body text-center'>
              <h3 className='text-danger'>
                {filteredPages.filter((p) => !p.isActive).length}
              </h3>
              <p className='text-muted mb-0'>Inactive</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagesDirectory;
