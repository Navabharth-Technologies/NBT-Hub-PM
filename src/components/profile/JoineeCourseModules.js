import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './PMDashboard.css';
import { Calendar, FileText, Video, ArrowLeft } from 'lucide-react';

export default function JoineeCourseModules() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Passed from NewJoineeModule
  const joineeName = location.state?.name || 'Employee';
  const hiredBy = location.state?.hiredBy || 'HR';
  const isHRHired = hiredBy.toUpperCase().includes('HR') || hiredBy.toUpperCase().includes('HUMAN');

  useEffect(() => {
    fetchCourses();
  }, [id, user, isHRHired]);

  const fetchCourses = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      
      let endpointsToTry = [];
      if (isHRHired) {
        endpointsToTry = [
          API_ENDPOINTS.NEW_JOINEE_COURSES, // /api/newjoinee_courses
          `${BASE_URL}/api/newjoinee-courses`,
          `${BASE_URL}/api/newjoinee_course`,
          `${BASE_URL}/api/new-joinee-courses`,
          `${BASE_URL}/api/newjoinee_courses/${id}`,
          `${BASE_URL}/api/newjoinee-courses/${id}`
        ];
      } else {
        endpointsToTry = [API_ENDPOINTS.COURSES];
      }

      let courseData = null;

      for (let endpoint of endpointsToTry) {
        try {
          const res = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            console.log(`Success on ${endpoint}`, data);
            
            let extracted = [];
            if (Array.isArray(data)) {
              extracted = data;
            } else if (data && typeof data === 'object') {
              extracted = data.courses || data.data || data.active || data.newjoinee_courses || data.result || [];
              if (!Array.isArray(extracted)) {
                 // Find the first array property in the object
                 const possibleArrays = Object.values(data).filter(v => Array.isArray(v));
                 if (possibleArrays.length > 0) extracted = possibleArrays[0];
              }
            }
            
            if (Array.isArray(extracted) && extracted.length > 0) {
              courseData = extracted;
              break; // Found our courses! Stop hunting.
            } else if (Array.isArray(extracted) && !courseData) {
              // Save empty array just in case all fail
              courseData = extracted;
            }
          }
        } catch (e) {
          console.log(`Endpoint failed: ${endpoint}`);
        }
      }

      setCourses(courseData || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  if (loading) {
    return (
      <div className="pm-dashboard-container">
        <AppHeader />
        <main className="dashboard-content" style={{textAlign: 'center', paddingTop: '150px'}}>
             <div className="animate-pulse" style={{ fontSize: '18px', color: '#64748b', fontWeight: 'bold'}}>Loading courses...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', background: '#ffffff' }}>
      <AppHeader />
      
      <main className="dashboard-content" style={{paddingBottom: '100px', maxWidth: '1400px', margin: '0 auto', padding: window.innerWidth < 768 ? '40px 15px' : '40px 26px'}}>
        <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
          <div>
            <h1 style={{fontSize: '32px', fontWeight: '900', color: '#1e293b', marginBottom: '4px'}}>Course Modules</h1>
            <p style={{color: '#64748b', fontSize: '15px', fontWeight: '600'}}>
              {isHRHired ? 'Universal New Joinee Knowledge Base' : 'Professional Technical Training Portal'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/new-joinees')}
            style={{
              background: 'white',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <ArrowLeft size={18} color="#64748b" />
          </button>
        </header>

        {courses.length === 0 ? (
           <div style={{padding: '60px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', fontSize: '15px', fontWeight: '600'}}>
              No courses available in this module.
           </div>
        ) : (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
              {courses.map((course, idx) => {
                const isCompleted = course.completed === 1 || course.completed === '1' || course.completed === true || course.completed === 'true' || course.status?.toLowerCase() === 'completed';
                const statusColor = isCompleted ? '#059669' : '#d97706';
                const statusBg = isCompleted ? '#d1fae5' : '#fef3c7';
                
                return (
                  <div key={course.id || idx} className="animate-fade-in" style={{
                    background: '#f8fafc', padding: '28px', borderRadius: '20px', position: 'relative',
                    animationDelay: `${idx * 0.1}s`,
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px'}}>
                      <span style={{
                        fontSize: '11px', fontWeight: '900', padding: '6px 14px', borderRadius: '20px', 
                        background: course.category === 'Policy' ? '#fee2e2' : '#e0e7ff', 
                        color: course.category === 'Policy' ? '#ef4444' : '#3863a8',
                        textTransform: 'uppercase', letterSpacing: '0.8px'
                      }}>
                        {course.category || 'POLICY'}
                      </span>
                      
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px'}}>
                        <Calendar size={14} /> Deadline: {course.deadline ? new Date(course.deadline).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <h3 style={{fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0}}>{course.title || course.course_name || 'Untitled Course'}</h3>
                      <span style={{
                        fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '12px', 
                        background: statusBg, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {isCompleted ? 'COMPLETED' : 'PENDING'}
                      </span>
                    </div>

                    <p style={{color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px', minHeight: '44px', fontWeight: '500'}}>
                      {course.description || 'No description provided.'}
                    </p>

                    <div style={{display: 'flex', gap: '12px'}}>
                      {course.pdf_url && (
                        <a href={getFullUrl(course.pdf_url)} target="_blank" rel="noopener noreferrer" 
                           style={{
                             display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                             flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0',
                             background: 'white', color: '#312e81', fontWeight: '800', fontSize: '14px',
                             textDecoration: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                           }}>
                          <FileText size={18} /> View PDF
                        </a>
                      )}
                      
                      {(course.video_url || course.video) && (
                        <a href={getFullUrl(course.video_url || course.video)} target="_blank" rel="noopener noreferrer" 
                           style={{
                             display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                             flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0',
                             background: 'white', color: '#be123c', fontWeight: '800', fontSize: '14px',
                             textDecoration: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                           }}>
                          <Video size={18} /> Watch Video
                        </a>
                      )}

                      {!course.pdf_url && !course.video_url && !course.video && (
                        <div style={{
                             display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                             width: '100%', padding: '12px', borderRadius: '14px', border: '2px dashed #e2e8f0',
                             background: 'transparent', color: '#94a3b8', fontWeight: '700', fontSize: '14px', boxSizing: 'border-box'
                           }}>
                          No Materials Available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
           </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
