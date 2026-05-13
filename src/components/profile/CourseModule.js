import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import './PMDashboard.css';
import { FileText, Video, Plus, X, Calendar, BookOpen, AlertCircle, Trash2, ArrowLeft, Upload, CheckCircle } from 'lucide-react';

export default function CourseModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCourses, setActiveCourses] = useState([]);
  const [atRiskEmployees, setAtRiskEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    deadline: '',
    assigned_to: 'All Employees',
    completed: 0
  });

  const [files, setFiles] = useState({
    pdf: null,
    video: null
  });

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.COURSES, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setActiveCourses(data);
        } else if (data) {
          setActiveCourses(data.active || []);
          setAtRiskEmployees(data.atRisk || []);
        }
      }
    } catch (err) {
      console.error('Course fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user?.token) return;

    setSubmitting(true);
    setError(null);
    setUploadProgress(0);

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (files.pdf) data.append('pdf', files.pdf);
    if (files.video) data.append('video', files.video);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_ENDPOINTS.COURSES, true);
    xhr.setRequestHeader('Authorization', `Bearer ${user.token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setSubmitting(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setShowModal(false);
        resetForm();
        fetchCourses();
        setSuccess('Course created successfully with uploaded files!');
      } else {
        try {
          const resp = JSON.parse(xhr.responseText);
          setError(resp.message || 'Failed to create course');
        } catch (e) {
          setError('Server error during upload');
        }
      }
    };

    xhr.onerror = () => {
      setSubmitting(false);
      setError('Connection refused. Please check if backend is running.');
    };

    xhr.send(data);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Technical',
      deadline: '',
      assigned_to: 'All Employees',
      completed: 0
    });
    setFiles({ pdf: null, video: null });
    setUploadProgress(0);
  };

  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'No deadline') return dateStr;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    // Optimistically remove from frontend
    setActiveCourses(prev => prev.filter(c => c.id !== id && c._id !== id));
    
    try {
      const res = await fetch(`${API_ENDPOINTS.COURSES}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        // Refresh to ensure sync
        fetchCourses();
      } else {
        console.error('Failed to delete on backend');
        fetchCourses(); // Revert on failure
      }
    } catch (err) {
      console.error('Delete error:', err);
      fetchCourses(); // Revert on failure
    }
  };

  if (loading && activeCourses.length === 0) {
    return (
      <div className="pm-dashboard-container">
        <AppHeader />
        <main className="dashboard-content" style={{ textAlign: 'center', paddingTop: '150px' }}>
          <div className="animate-pulse">Loading courses...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="pm-dashboard-container">
      <AppHeader />

      <main className="dashboard-content" style={{ paddingBottom: '100px' }}>
        <header className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'white',
                padding: '10px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
              title="Go Back"
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>Course Compliance</h1>
              <p style={{ color: '#64748b' }}>Track and manage professional development certifications </p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '8px' }} /> Add New Course
          </button>
        </header>

        <section className="dashboard-section animate-fade-in">
          <h2 className="section-title"><BookOpen size={20} color="#3863a8" /> Active Courses</h2>
          {activeCourses.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', marginTop: '20px' }}>
              No active courses found. Click "Add New Course" to get started.
            </div>
          ) : (
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {activeCourses.map(c => (
                <div key={c.id} className="team-card" style={{ padding: '24px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '800', padding: '4px 10px', borderRadius: '10px',
                      background: c.category === 'Policy' ? '#fee2e2' : '#e0e7ff',
                      color: c.category === 'Policy' ? '#ef4444' : '#3863a8',
                      textTransform: 'uppercase'
                    }}>
                      {c.category || 'General'}
                    </span>
                    <button className="btn-ghost" onClick={() => handleDeleteCourse(c.id || c._id)} style={{ color: '#94a3b8' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#1e293b' }}>{c.title}</h3>
                  <p className="course-card-description">{c.description || 'No description provided.'}</p>

                  <div style={{ marginBottom: '12px', fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={12} /> Deadline: {formatDate(c.deadline) || 'No deadline'}
                  </div>

                  <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: '600', color: '#64748b' }}>Completion Progress</span>
                    <span style={{ fontWeight: '900', color: '#3863a8' }}>
                      {typeof c.completed === 'number' && typeof c.assigned_to === 'number' ?
                        `${Math.round((c.completed / c.assigned_to) * 100)}%` :
                        (c.completed && c.assigned_to ? 'In Progress' : '0%')
                      }
                    </span>
                  </div>
                  <div className="progress-bar-container" style={{ height: '10px', borderRadius: '5px' }}>
                    <div className="progress-bar-fill" style={{
                      width: typeof c.completed === 'number' && typeof c.assigned_to === 'number' ? `${(c.completed / c.assigned_to) * 100}%` : '0%',
                      background: c.category === 'Policy' ? '#ef4444' : 'linear-gradient(90deg, #3863a8, #5c85d6)'
                    }}></div>
                  </div>

                  <div className="course-action-buttons">
                    {c.pdf_url && (
                      <a href={getFullUrl(c.pdf_url)} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>
                        <FileText size={14} /> PDF
                      </a>
                    )}
                    {c.video_url && (
                      <a href={getFullUrl(c.video_url)} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}>
                        <Video size={14} /> Video
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modal for adding course */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <header className="modal-header">
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}><Plus size={20} /> Create New Course</h2>
                <button className="btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
              </header>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div style={{ padding: '12px', background: '#fef2f2', color: '#ef4444', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}
                  <div className="form-group">
                    <label>Course Title</label>
                    <input name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Cybersecurity Essentials" required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Brief summary of the course..." rows="3" />
                  </div>
                  <div className="modal-grid">
                    <div className="form-group">
                      <label>Category</label>
                      <select name="category" value={formData.category} onChange={handleInputChange}>
                        <option>Technical</option>
                        <option>Policy</option>
                        <option>Soft Skills</option>
                        <option>Leadership</option>
                        <option>Compliance</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Deadline</label>
                      <input type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} required />
                    </div>
                  </div>

                  <div className="modal-grid" style={{ marginTop: '10px' }}>
                    <div className="form-group">
                      <label>PDF Material</label>
                      <label className="file-upload-label">
                        <Upload size={18} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {files.pdf ? files.pdf.name : 'Choose PDF'}
                        </span>
                        <input type="file" name="pdf" className="file-upload-input" accept=".pdf" onChange={handleFileChange} />
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Video Tutorial</label>
                      <label className="file-upload-label">
                        <Video size={18} />
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {files.video ? files.video.name : 'Choose Video'}
                        </span>
                        <input type="file" name="video" className="file-upload-input" accept="video/*" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>

                  {submitting && (
                    <div className="upload-progress-container">
                      <div className="upload-status">
                        <span>{uploadProgress < 100 ? 'Uploading Course Materials...' : 'Finalizing...'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="upload-progress-bar">
                        <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {uploadProgress === 100 && !submitting && !error && (
                    <div style={{ marginTop: '15px', padding: '10px', background: '#d1fae5', color: '#065f46', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                      <CheckCircle size={18} /> Upload Complete!
                    </div>
                  )}
                </div>
                <footer className="modal-footer">
                  <button type="button" className="btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Please wait...' : 'Create Course'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </main>

      <AppFooter />

      {/* Success Popup */}
      {success && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', padding: '40px', borderRadius: '30px',
            maxWidth: '400px', width: '90%', textAlign: 'center',
            border: '3px solid #cbd5e1', boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7',
              color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: '40px'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>Success!</h2>
            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600', lineHeight: '1.6', marginBottom: '30px' }}>
              {success}
            </p>
            <button
              onClick={() => setSuccess(null)}
              style={{
                width: '100%', padding: '14px', background: '#3863a8', color: 'white',
                border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer',
                fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#5c85d6'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#3863a8'}
            >
              Great, thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
