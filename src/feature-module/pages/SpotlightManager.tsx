// pages/SpotlightManager.tsx
import React, { useState, useEffect } from 'react';
import { Alert, Space, Row, Col, Card, Modal } from 'antd';
import {
  SaveOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  FileImageOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { Spotlight, SpotlightForm } from '../../types/types';
import { useAuth } from '../../context/AuthContext';

const { confirm } = Modal;

const blank: SpotlightForm = {
  title: '',
  description: '',
  category: 'Team',
  playerNames: [],
  badges: [],
  images: [],
  files: [],
  date: new Date().toISOString().split('T')[0],
  featured: false,
};

const SpotlightManager = () => {
  const { getAuthToken } = useAuth();
  const [items, setItems] = useState<Spotlight[]>([]);
  const [form, setForm] = useState<SpotlightForm>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: string | null;
    title: string;
  }>({
    show: false,
    id: null,
    title: '',
  });
  const [deleting, setDeleting] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    fetchItems();
  }, []);

  const getAuthHeader = async () => {
    const token = await getAuthToken();
    return { Authorization: `Bearer ${token}` };
  };

  const getJsonHeaders = async () => {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const headers = await getJsonHeaders();
      const response = await axios.get(`${API_BASE_URL}/spotlight`, {
        headers,
      });
      setItems(response.data);
    } catch (err) {
      console.error('Error fetching spotlight items:', err);
      setError('Failed to load spotlight items');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setForm((prev) => ({ ...prev, files: prev.files.concat(files) }));
  };

  const handleRemoveExistingImage = (url: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((i) => i !== url),
    }));
  };

  const handleRemoveNewFile = (index: number) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('playerNames', JSON.stringify(form.playerNames));
      fd.append('badges', JSON.stringify(form.badges));
      fd.append('date', form.date);
      fd.append('featured', form.featured.toString());
      form.files.forEach((f) => fd.append('images', f));

      if (editingId) {
        const originalItem = items.find((i) => i._id === editingId);
        if (originalItem) {
          const removedImages = originalItem.images.filter(
            (img) => !form.images.includes(img),
          );
          if (removedImages.length > 0)
            fd.append('removeImages', JSON.stringify(removedImages));
        }
      }

      const headers = await getAuthHeader();
      if (editingId) {
        await axios.put(`${API_BASE_URL}/spotlight/${editingId}`, fd, {
          headers,
        });
      } else {
        await axios.post(`${API_BASE_URL}/spotlight`, fd, { headers });
      }

      setForm(blank);
      setEditingId(null);
      fetchItems();
    } catch (err: any) {
      console.error('Submission error:', err);
      if (err.response?.status === 401)
        setError('Authentication failed. Please log in again.');
      else if (err.response?.status === 403)
        setError(
          'Access denied. You do not have permission to manage spotlight items.',
        );
      else
        setError(err.response?.data?.message || 'Error saving spotlight item');
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (item: Spotlight) => {
    setEditingId(item._id);
    setForm({
      title: item.title,
      description: item.description,
      category: item.category,
      playerNames: item.playerNames || [],
      badges: item.badges || [],
      images: item.images || [],
      files: [],
      date: item.date
        ? item.date.split('T')[0]
        : new Date().toISOString().split('T')[0],
      featured: item.featured || false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (item: Spotlight) => {
    setDeleteModal({ show: true, id: item._id, title: item.title });
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      setDeleting(true);
      const headers = await getJsonHeaders();
      await axios.delete(`${API_BASE_URL}/spotlight/${deleteModal.id}`, {
        headers,
      });
      setDeleteModal({ show: false, id: null, title: '' });
      fetchItems();
    } catch (err: any) {
      if (err.response?.status === 401)
        setError('Authentication failed. Please log in again.');
      else if (err.response?.status === 403)
        setError(
          'Access denied. You do not have permission to delete spotlight items.',
        );
      else
        setError(
          err.response?.data?.message || 'Error deleting spotlight item',
        );
    } finally {
      setDeleting(false);
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) {
      const baseUrl =
        process.env.REACT_APP_API_BASE_URL?.replace('/api', '') ||
        'http://localhost:5001';
      return `${baseUrl}${imagePath}`;
    }
    return imagePath;
  };

  const clearForm = () => {
    setForm(blank);
    setEditingId(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div id='global-loader'>
            <div className='page-loader'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        {/* ── Form Card ── */}
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between'>
            <h4 className='mb-0'>
              {editingId ? (
                <>
                  <EditOutlined className='me-2 text-primary' />
                  Edit Spotlight Item
                </>
              ) : (
                <>
                  <StarOutlined className='me-2 text-warning' />
                  Create New Spotlight Item
                </>
              )}
            </h4>
            {editingId && <span className='badge bg-primary'>Editing</span>}
          </div>

          <div className='card-body'>
            {error && (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                closable
                onClose={() => setError(null)}
                className='mb-3'
              />
            )}

            <form onSubmit={submit}>
              <Row gutter={16}>
                <Col span={12}>
                  <div className='form-group mb-3'>
                    <label className='form-label fw-semibold'>Title</label>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className='form-control'
                      placeholder='Enter spotlight title'
                      required
                    />
                  </div>
                </Col>
                <Col span={6}>
                  <div className='form-group mb-3'>
                    <label className='form-label fw-semibold'>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value as
                            | 'Team'
                            | 'Player'
                            | 'Other',
                        })
                      }
                      className='form-select'
                    >
                      <option value='Team'>Team</option>
                      <option value='Player'>Player</option>
                      <option value='Other'>Other</option>
                    </select>
                  </div>
                </Col>
                <Col span={6}>
                  <div className='form-group mb-3'>
                    <label className='form-label fw-semibold'>Date</label>
                    <input
                      type='date'
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      className='form-control'
                    />
                  </div>
                </Col>
              </Row>

              <div className='form-group mb-3'>
                <label className='form-label fw-semibold'>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className='form-control'
                  rows={3}
                  placeholder='Enter spotlight description...'
                />
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <div className='form-group mb-3'>
                    <label className='form-label fw-semibold'>
                      Players{' '}
                      <small className='text-muted fw-normal'>
                        (comma separated)
                      </small>
                    </label>
                    <input
                      className='form-control'
                      value={form.playerNames.join(', ')}
                      onChange={(e) => {
                        const arr = e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        setForm({ ...form, playerNames: arr });
                      }}
                      placeholder='e.g. John Smith, Jane Doe'
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div className='form-group mb-3'>
                    <label className='form-label fw-semibold'>
                      Badges{' '}
                      <small className='text-muted fw-normal'>
                        (comma separated)
                      </small>
                    </label>
                    <input
                      className='form-control'
                      value={form.badges.join(', ')}
                      onChange={(e) => {
                        const arr = e.target.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean);
                        setForm({ ...form, badges: arr });
                      }}
                      placeholder='e.g. State Qualifier, MVP'
                    />
                  </div>
                </Col>
              </Row>

              {/* Images */}
              <div className='form-group mb-3'>
                <label className='form-label fw-semibold'>
                  <FileImageOutlined className='me-1' />
                  Images
                </label>

                {/* Existing images */}
                {form.images.length > 0 && (
                  <div className='mb-3'>
                    <p className='text-muted small mb-2'>
                      Existing images — click × to remove
                    </p>
                    <div className='d-flex gap-2 flex-wrap'>
                      {form.images.map((img, idx) => (
                        <div
                          key={idx}
                          className='position-relative'
                          style={{ width: 120 }}
                        >
                          <img
                            src={getImageUrl(img)}
                            className='rounded border w-100'
                            style={{ height: 80, objectFit: 'cover' }}
                            alt='existing'
                          />
                          <button
                            type='button'
                            className='btn btn-danger btn-sm position-absolute d-flex align-items-center justify-content-center'
                            style={{
                              top: 4,
                              right: 4,
                              width: 22,
                              height: 22,
                              padding: 0,
                              fontSize: 14,
                              lineHeight: 1,
                            }}
                            onClick={() => handleRemoveExistingImage(img)}
                            title='Remove image'
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New file upload */}
                <div className='border rounded p-3 bg-light'>
                  <input
                    type='file'
                    accept='image/*'
                    multiple
                    onChange={handleFileChange}
                    className='form-control mb-2'
                  />
                  <small className='text-muted'>
                    JPG, PNG, WEBP, GIF up to 5MB each · max 6 images
                  </small>

                  {form.files.length > 0 && (
                    <div className='d-flex gap-2 flex-wrap mt-2'>
                      {form.files.map((f, i) => (
                        <div
                          key={i}
                          className='position-relative'
                          style={{ width: 100 }}
                        >
                          <img
                            src={URL.createObjectURL(f)}
                            alt='preview'
                            className='rounded border w-100'
                            style={{ height: 70, objectFit: 'cover' }}
                          />
                          <button
                            type='button'
                            className='btn btn-danger btn-sm position-absolute d-flex align-items-center justify-content-center'
                            style={{
                              top: 4,
                              right: 4,
                              width: 20,
                              height: 20,
                              padding: 0,
                              fontSize: 12,
                              lineHeight: 1,
                            }}
                            onClick={() => handleRemoveNewFile(i)}
                            title='Remove'
                          >
                            ×
                          </button>
                          <small
                            className='d-block text-truncate text-muted mt-1'
                            style={{ fontSize: 10 }}
                          >
                            {f.name}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Featured */}
              <div className='form-check mb-4'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  id='featuredCheck'
                />
                <label className='form-check-label' htmlFor='featuredCheck'>
                  <StarOutlined className='me-1 text-warning' />
                  Featured — show at top of spotlight page
                </label>
              </div>

              <Space>
                <button
                  type='submit'
                  className='btn btn-primary d-flex align-items-center'
                  disabled={submitting}
                >
                  <SaveOutlined className='me-2' />
                  {submitting
                    ? 'Saving...'
                    : editingId
                      ? 'Update Spotlight'
                      : 'Create Spotlight'}
                </button>
                {editingId && (
                  <button
                    type='button'
                    className='btn btn-outline-secondary d-flex align-items-center'
                    onClick={clearForm}
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={clearForm}
                >
                  Clear Form
                </button>
              </Space>
            </form>
          </div>
        </div>

        {/* ── Items List ── */}
        <div className='card mt-4'>
          <div className='card-header d-flex align-items-center justify-content-between'>
            <h5 className='mb-0'>Spotlight Items</h5>
            <span className='badge bg-secondary'>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className='card-body'>
            {items.length === 0 ? (
              <div className='text-center py-5'>
                <FileImageOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p className='text-muted mt-3 mb-0'>No spotlight items yet.</p>
                <p className='text-muted small'>
                  Create one using the form above.
                </p>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col key={item._id} xs={24} sm={12} lg={8}>
                    <Card
                      className='h-100 shadow-sm'
                      styles={{ body: { padding: '12px 16px' } }}
                      cover={
                        item.images?.[0] ? (
                          <div className='position-relative'>
                            <img
                              alt={item.title}
                              src={getImageUrl(item.images[0])}
                              style={{
                                height: 200,
                                width: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                              }}
                            />
                            {item.featured && (
                              <span className='position-absolute top-0 start-0 m-2 badge bg-warning text-dark'>
                                <StarOutlined className='me-1' />
                                Featured
                              </span>
                            )}
                            {item.images.length > 1 && (
                              <span className='position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75'>
                                <FileImageOutlined className='me-1' />
                                {item.images.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            className='d-flex align-items-center justify-content-center bg-light position-relative'
                            style={{ height: 200 }}
                          >
                            <FileImageOutlined
                              style={{ fontSize: 48, color: '#ccc' }}
                            />
                            {item.featured && (
                              <span className='position-absolute top-0 start-0 m-2 badge bg-warning text-dark'>
                                <StarOutlined className='me-1' />
                                Featured
                              </span>
                            )}
                          </div>
                        )
                      }
                    >
                      <div className='d-flex align-items-start justify-content-between mb-1'>
                        <h6 className='mb-0 fw-semibold text-truncate me-2'>
                          {item.title}
                        </h6>
                        <span
                          className={`badge badge-soft-${item.category === 'Team' ? 'primary' : item.category === 'Player' ? 'success' : 'secondary'} flex-shrink-0`}
                        >
                          {item.category}
                        </span>
                      </div>

                      <small className='text-muted d-block mb-2'>
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </small>

                      <p
                        className='text-muted small mb-2'
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.description}
                      </p>

                      {item.badges?.length > 0 && (
                        <div className='d-flex flex-wrap gap-1 mb-2'>
                          {item.badges.map((badge, i) => (
                            <span
                              key={i}
                              className='badge bg-light text-dark border'
                              style={{ fontSize: 11 }}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.playerNames?.length > 0 && (
                        <small className='text-muted d-block mb-3'>
                          👤 {item.playerNames.join(', ')}
                        </small>
                      )}

                      <div className='d-flex gap-2 mt-auto pt-2 border-top'>
                        <button
                          type='button'
                          className='btn btn-outline-primary btn-sm flex-fill d-flex align-items-center justify-content-center'
                          onClick={() => edit(item)}
                        >
                          <EditOutlined className='me-1' /> Edit
                        </button>
                        <button
                          type='button'
                          className='btn btn-outline-danger btn-sm flex-fill d-flex align-items-center justify-content-center'
                          onClick={() => confirmDelete(item)}
                        >
                          <DeleteOutlined className='me-1' /> Delete
                        </button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      <div
        className={`modal fade ${deleteModal.show ? 'show d-block' : ''}`}
        tabIndex={-1}
        style={deleteModal.show ? { backgroundColor: 'rgba(0,0,0,0.5)' } : {}}
      >
        <div className='modal-dialog modal-dialog-centered'>
          <div className='modal-content'>
            <div className='modal-header border-0 pb-0'>
              <div className='d-flex align-items-center gap-2'>
                <div
                  className='rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center'
                  style={{ width: 40, height: 40 }}
                >
                  <DeleteOutlined style={{ color: '#dc3545', fontSize: 18 }} />
                </div>
                <h5 className='modal-title mb-0'>Delete Spotlight Item</h5>
              </div>
            </div>
            <div className='modal-body pt-3'>
              <p className='mb-1'>Are you sure you want to delete:</p>
              <p className='fw-semibold mb-0'>"{deleteModal.title}"</p>
              <p className='text-muted small mt-2 mb-0'>
                This will permanently delete the item and all its images from
                storage. This action cannot be undone.
              </p>
            </div>
            <div className='modal-footer border-0 pt-0'>
              <button
                type='button'
                className='btn btn-outline-secondary me-2'
                onClick={() =>
                  setDeleteModal({ show: false, id: null, title: '' })
                }
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type='button'
                className='btn btn-danger d-flex align-items-center gap-2'
                onClick={handleDelete}
                disabled={deleting}
              >
                <DeleteOutlined />
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotlightManager;
