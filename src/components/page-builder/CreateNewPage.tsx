// src/components/page-builder/CreateNewPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const CreateNewPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    pageTitle: '',
    pageSlug: '',
    pageType: 'custom',
    metaDescription: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageTypes = [
    { value: 'home', label: 'Home Page' },
    { value: 'about', label: 'About Page' },
    { value: 'programs', label: 'Programs Page' },
    { value: 'tournaments', label: 'Tournaments Page' },
    { value: 'contact', label: 'Contact Page' },
    { value: 'spotlight', label: 'Spotlight Page' },
    { value: 'registration', label: 'Registration Page' },
    { value: 'custom', label: 'Custom Page' },
  ];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from page title
    if (name === 'pageTitle' && !formData.pageSlug) {
      const slug = value
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
      setFormData((prev) => ({ ...prev, pageSlug: slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login again');
        window.location.href = '/login';
        return;
      }

      console.log('📤 Sending page creation request:', {
        pageTitle: formData.pageTitle,
        pageSlug: formData.pageSlug,
        pageType: formData.pageType,
        metaDescription: formData.metaDescription,
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/page-builder/admin/pages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pageTitle: formData.pageTitle,
            pageSlug: formData.pageSlug,
            pageType: formData.pageType,
            metaDescription: formData.metaDescription,
            metaKeywords: [],
            sections: [],
            settings: {
              // Provide default settings to avoid empty object
              showHeader: true,
              showFooter: true,
              showSponsorBanner: true,
              sponsorBannerPosition: 'bottom',
              containerMaxWidth: '1200px',
              defaultSectionSpacing: '3rem',
              backgroundColor: '#ffffff',
              textColor: '#333333',
              accentColor: '#594230',
              canonicalUrl: '',
              openGraphImage: '',
              headerScripts: '',
              footerScripts: '',
            },
          }),
        }
      );

      console.log('📥 Response status:', response.status);

      // Try to parse response even if it's an error
      let data;
      try {
        data = await response.json();
        console.log('📥 Response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error(
          `Server returned invalid JSON. Status: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      if (data.success) {
        console.log(
          '✅ Page created successfully, redirecting to:',
          `/admin/page-builder/edit/${data.data._id}`
        );

        // Show SweetAlert success message
        await Swal.fire({
          title: 'Page created successfully!',
          icon: 'success',
          confirmButtonColor: '#d33',
          reverseButtons: true,
        });

        // Navigate after user confirms
        navigate(`/admin/page-builder/edit/${data.data._id}`);
      } else {
        throw new Error(data.message || 'Failed to create page');
      }
    } catch (err: any) {
      console.error('❌ Error creating page:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });

      setError(
        err.message || 'Failed to create page. Check console for details.'
      );

      // Show more detailed error to user
      alert(`Error: ${err.message}\n\nCheck browser console for more details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container-fluid'>
      <div className='d-flex align-items-center mb-4'>
        <button
          className='btn btn-outline-secondary me-3'
          onClick={() => navigate('/admin/pages')}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className='mb-0'>Create New Page</h2>
          <p className='text-muted mb-0'>Set up basic page information</p>
        </div>
      </div>

      <div className='row justify-content-center'>
        <div className='col-md-8'>
          <div className='card'>
            <div className='card-body'>
              {error && (
                <div className='alert alert-danger'>
                  <strong>Error:</strong> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className='mb-4'>
                  <label className='form-label'>Page Title *</label>
                  <input
                    type='text'
                    className='form-control form-control-lg'
                    name='pageTitle'
                    value={formData.pageTitle}
                    onChange={handleChange}
                    placeholder='Enter page title'
                    required
                  />
                  <small className='text-muted'>
                    This will appear in the browser tab and as the main heading
                  </small>
                </div>

                <div className='mb-4'>
                  <label className='form-label'>URL Slug *</label>
                  <div className='input-group'>
                    <span className='input-group-text'>/page/</span>
                    <input
                      type='text'
                      className='form-control'
                      name='pageSlug'
                      value={formData.pageSlug}
                      onChange={handleChange}
                      placeholder='my-new-page'
                      required
                    />
                  </div>
                  <small className='text-muted'>
                    URL-friendly version of the title. Use lowercase, hyphens,
                    no spaces.
                  </small>
                </div>

                <div className='mb-4'>
                  <label className='form-label'>Page Type *</label>
                  <select
                    className='form-select'
                    name='pageType'
                    value={formData.pageType}
                    onChange={handleChange}
                    required
                  >
                    {pageTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <small className='text-muted'>
                    This helps organize your pages and may affect default
                    templates
                  </small>
                </div>

                <div className='mb-4'>
                  <label className='form-label'>Meta Description</label>
                  <textarea
                    className='form-control'
                    name='metaDescription'
                    value={formData.metaDescription}
                    onChange={handleChange}
                    rows={3}
                    placeholder='Brief description for search engines'
                  />
                  <small className='text-muted'>
                    Optional. Helps with SEO. 150-160 characters recommended.
                  </small>
                </div>

                <div className='alert alert-info'>
                  <h6 className='alert-heading'>Next Steps</h6>
                  <p className='mb-0'>
                    After creating the page, you'll be redirected to the Page
                    Builder where you can add sections, customize layout, and
                    publish.
                  </p>
                </div>

                <div className='d-flex justify-content-between mt-4'>
                  <button
                    type='button'
                    className='btn btn-outline-secondary'
                    onClick={() => navigate('/admin/pages')}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    disabled={
                      loading || !formData.pageTitle || !formData.pageSlug
                    }
                  >
                    {loading ? (
                      <>
                        <span className='spinner-border spinner-border-sm me-2'></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save size={18} className='me-2' />
                        Create Page & Open Builder
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className='card mt-4'>
            <div className='card-header'>
              <h5 className='mb-0'>Tips for Successful Pages</h5>
            </div>
            <div className='card-body'>
              <ul className='mb-0'>
                <li>
                  <strong>Clear Titles:</strong> Make page titles descriptive
                  and concise
                </li>
                <li>
                  <strong>SEO-Friendly Slugs:</strong> Use lowercase, hyphens,
                  no special characters
                </li>
                <li>
                  <strong>Proper Page Type:</strong> Select the type that best
                  matches your content
                </li>
                <li>
                  <strong>Meta Descriptions:</strong> Write compelling summaries
                  for search results
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewPage;
