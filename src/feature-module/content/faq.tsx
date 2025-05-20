import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { faq } from '../../core/common/selectoption/selectoption';
import Table from '../../core/common/dataTable/index';
import axios from 'axios';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Alert,
  Modal,
  Row,
  Form,
} from 'react-bootstrap';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

interface TableData {
  _id: string;
  questions: string;
  answers: string | string[];
  category: string;
}

interface FilterValues {
  question: string;
  section: string;
  category: string;
}

const Faq = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editingFaq, setEditingFaq] = useState<TableData | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<TableData | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filteredData, setFilteredData] = useState<TableData[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    question: '',
    section: '',
    category: '',
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        category: filters.category,
        question: filters.question,
      };
      const res = await axios.get(`${API_BASE_URL}/faqs`, { params });
      setFilteredData(res.data);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs.');
    } finally {
      setLoading(false);
    }
  }, [filters, API_BASE_URL]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFaqs();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchFaqs]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleFilterChange = (
    filterName: keyof FilterValues,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      question: '',
      section: '',
      category: '',
    });
  };

  const MobileFilterButton = () => (
    <Button
      variant='outline-secondary'
      className='d-lg-none mb-3'
      onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
    >
      <i className='ti ti-filter me-2' />
      {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
    </Button>
  );

  const FilterDropdown = () => (
    <>
      <div className='dropdown mb-3 me-2 d-none d-lg-block'>
        <Link
          to='#'
          className='btn btn-outline-light bg-white dropdown-toggle'
          data-bs-toggle='dropdown'
          data-bs-auto-close='outside'
        >
          <i className='ti ti-filter me-2' />
          Filter
        </Link>
        <div className='dropdown-menu drop-width'>
          <form onSubmit={(e) => e.preventDefault()}>
            <div className='d-flex align-items-center border-bottom p-3'>
              <h4>Filter</h4>
            </div>
            <div className='p-3 border-bottom'>
              <div className='row'>
                <div className='col-md-12'>
                  <div className='mb-0'>
                    <label className='form-label'>Category</label>
                    <select
                      className='form-select'
                      value={filters.category}
                      onChange={(e) =>
                        handleFilterChange('category', e.target.value)
                      }
                    >
                      <option value=''>All Categories</option>
                      {faq.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className='p-3 d-flex align-items-center justify-content-end'>
              <button
                type='button'
                className='btn btn-light me-3'
                onClick={resetFilters}
              >
                Reset
              </button>
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => {}}
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile filter panel */}
      {mobileFiltersOpen && (
        <div className='card mb-3 d-lg-none'>
          <div className='card-body'>
            <Form.Group className='mb-3'>
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value=''>All Categories</option>
                {faq.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <div className='d-flex justify-content-between'>
              <Button variant='light' onClick={resetFilters}>
                Reset
              </Button>
              <Button
                variant='primary'
                onClick={() => setMobileFiltersOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const SortDropdown = () => {
    const [sortOption, setSortOption] = useState<'asc' | 'desc'>('asc');

    const handleSort = async (option: 'asc' | 'desc') => {
      setSortOption(option);
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/faqs`, {
          params: {
            ...filters,
            sort: 'questions',
            order: option === 'asc' ? 'asc' : 'desc',
          },
        });
        setFilteredData(res.data);
      } catch (err) {
        console.error('Error sorting FAQs:', err);
        setError('Failed to sort FAQs.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className='dropdown mb-3'>
        <Link
          to='#'
          className='btn btn-outline-light bg-white dropdown-toggle'
          data-bs-toggle='dropdown'
        >
          <i className='ti ti-sort-ascending-2 me-2' />
          {sortOption === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
        </Link>
        <ul className='dropdown-menu p-3'>
          <li>
            <Link
              to='#'
              className={`dropdown-item rounded-1 ${
                sortOption === 'asc' ? 'active' : ''
              }`}
              onClick={() => handleSort('asc')}
            >
              Ascending (A-Z)
            </Link>
          </li>
          <li>
            <Link
              to='#'
              className={`dropdown-item rounded-1 ${
                sortOption === 'desc' ? 'active' : ''
              }`}
              onClick={() => handleSort('desc')}
            >
              Descending (Z-A)
            </Link>
          </li>
        </ul>
      </div>
    );
  };

  const columns = [
    {
      title: 'Questions',
      dataIndex: 'questions',
      width: '30%',
      ellipsis: true,
      render: (text: string) => (
        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {text}
        </div>
      ),
    },
    {
      title: 'Answers',
      dataIndex: 'answers',
      key: 'answers',
      width: '53%',
      ellipsis: true,
      render: (text: string) => (
        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          {text}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '12%',
    },
    ...(isAdmin
      ? [
          {
            title: 'Action',
            key: 'action',
            width: '5%',
            render: (_: any, record: TableData) => (
              <div className='d-flex align-items-center'>
                <div className='dropdown'>
                  <Link
                    to='#'
                    className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
                    data-bs-toggle='dropdown'
                    aria-expanded='false'
                  >
                    <i className='ti ti-dots-vertical fs-14' />
                  </Link>
                  <ul className='dropdown-menu dropdown-menu-right p-3'>
                    <li>
                      <Link
                        className='dropdown-item rounded-1'
                        to='#'
                        onClick={() => {
                          console.log('Editing record:', record);
                          setEditingFaq(record);
                          setEditCategory(record.category || '');
                          setEditQuestion(record.questions || '');
                          setEditAnswer(() => {
                            if (typeof record.answers === 'string')
                              return record.answers;
                            if (Array.isArray(record.answers))
                              return record.answers.join('\n');
                            return '';
                          });
                          setShowEditModal(true);
                        }}
                      >
                        <i className='ti ti-edit-circle me-2' /> Edit
                      </Link>
                    </li>
                    <li>
                      <Link
                        className='dropdown-item rounded-1'
                        to='#'
                        onClick={() => {
                          setDeletingFaq(record);
                          setShowDeleteModal(true);
                        }}
                      >
                        <i className='ti ti-trash-x me-2' /> Delete
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            ),
          },
        ]
      : []),
  ];

  const handleAddFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.trim() || !question.trim() || !answer.trim()) {
      alert('Please fill all fields.');
      return;
    }

    try {
      const postData = {
        category,
        questions: question,
        answers: answer,
      };

      const res = await axios.post(`${API_BASE_URL}/faqs`, postData);
      console.log('FAQ added:', res.data);

      await fetchFaqs();

      setCategory('');
      setQuestion('');
      setAnswer('');
      setShowAddModal(false);

      setSuccessMessage('FAQ added successfully!');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error adding FAQ:', err);
      setError('Failed to add FAQ.');
    }
  };

  const handleEditFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;

    if (!editCategory.trim() || !editQuestion.trim() || !editAnswer.trim()) {
      alert('Please fill all fields.');
      return;
    }

    try {
      const putData = {
        category: editCategory,
        questions: editQuestion,
        answers: editAnswer,
      };

      await axios.put(`${API_BASE_URL}/faqs/${editingFaq._id}`, putData);

      await fetchFaqs();

      setEditingFaq(null);
      setEditCategory('');
      setEditQuestion('');
      setEditAnswer('');
      setShowEditModal(false);

      setSuccessMessage('FAQ updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating FAQ:', err);
      setError('Failed to update FAQ.');
    }
  };

  const handleDeleteFaq = async () => {
    if (!deletingFaq) return;

    try {
      await axios.delete(`${API_BASE_URL}/faqs/${deletingFaq._id}`);
      await fetchFaqs();
      setDeletingFaq(null);
      setShowDeleteModal(false);

      setSuccessMessage('FAQ deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting FAQ:', err);
      setError('Failed to delete FAQ.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        {error && (
          <Alert variant='danger' onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            variant='success'
            onClose={() => setSuccessMessage(null)}
            dismissible
          >
            {successMessage}
          </Alert>
        )}

        <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
          <div className='my-auto mb-2'>
            <h3 className='page-title mb-1'>FAQ</h3>
          </div>
          <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
            <OverlayTrigger
              overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
            >
              <Button
                variant='outline-light'
                className='bg-white btn-icon me-2'
                onClick={() => fetchFaqs()}
              >
                <i className='ti ti-refresh' />
              </Button>
            </OverlayTrigger>
            {isAdmin && (
              <Button
                className='btn btn-primary d-flex align-items-center'
                onClick={() => setShowAddModal(true)}
              >
                <i className='ti ti-square-rounded-plus me-2' />
                Add FAQ
              </Button>
            )}
          </div>
        </div>

        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'>FAQ List</h4>
            <div className='d-flex align-items-center flex-wrap'>
              <MobileFilterButton />
              <FilterDropdown />
              <SortDropdown />
            </div>
          </div>
          <div className='card-body'>
            <div className='table-responsive'>
              <Table columns={columns} dataSource={filteredData} />
            </div>
          </div>
        </div>
      </div>

      {/* Add FAQ Modal */}
      <Modal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        size='xl'
      >
        <Modal.Header closeButton>
          <Modal.Title>Add FAQ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <div className='modal-body'>
              <div className='mb-3'>
                <label htmlFor='category' className='form-label'>
                  Category
                </label>
                <select
                  id='category'
                  className='form-select'
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value=''>Select category</option>
                  {faq.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='mb-3'>
                <label htmlFor='question' className='form-label'>
                  Question
                </label>
                <input
                  type='text'
                  id='question'
                  className='form-control'
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div className='mb-3'>
                <label htmlFor='answer' className='form-label'>
                  Answer
                </label>
                <textarea
                  id='answer'
                  className='form-control'
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  required
                />
              </div>
            </div>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <button
            type='button'
            className='btn btn-secondary me-2'
            data-bs-dismiss='modal'
            onClick={() => {
              setCategory('');
              setQuestion('');
              setAnswer('');
              setShowAddModal(false);
            }}
          >
            Cancel
          </button>
          <button
            type='submit'
            className='btn btn-primary'
            onClick={handleAddFaqSubmit}
          >
            Add FAQ
          </button>
        </Modal.Footer>
      </Modal>

      {/* Edit FAQ Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        size='xl'
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit FAQ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <div className='modal-body'>
              <div className='mb-3'>
                <label htmlFor='editCategory' className='form-label'>
                  Category
                </label>
                <select
                  id='editCategory'
                  className='form-select'
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  required
                >
                  <option value=''>Select category</option>
                  {faq.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className='mb-3'>
                <label htmlFor='editQuestion' className='form-label'>
                  Question
                </label>
                <input
                  type='text'
                  id='editQuestion'
                  className='form-control'
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  required
                />
              </div>
              <div className='mb-3'>
                <label htmlFor='editAnswer' className='form-label'>
                  Answer
                </label>
                <textarea
                  id='editAnswer'
                  className='form-control'
                  rows={3}
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  required
                />
              </div>
            </div>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <button
            type='button'
            className='btn btn-secondary me-2'
            data-bs-dismiss='modal'
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </button>
          <button
            type='submit'
            className='btn btn-success'
            onClick={handleEditFaqSubmit}
          >
            Update FAQ
          </button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal (Basic Skeleton) */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this FAQ?</Modal.Body>
        <Modal.Footer>
          <Button
            variant='secondary'
            onClick={() => setShowDeleteModal(false)}
            className='me-2'
          >
            Cancel
          </Button>
          <Button
            variant='danger'
            onClick={() => {
              handleDeleteFaq();
              setShowDeleteModal(false);
            }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Faq;
