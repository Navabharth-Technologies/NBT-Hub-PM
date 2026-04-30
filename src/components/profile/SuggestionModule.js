import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import './PMDashboard.css';

export default function SuggestionModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const token = user?.token || localStorage.getItem('token');
      console.log('Fetching suggestions with token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('Hitting endpoints:', API_ENDPOINTS.SUGGESTIONS, API_ENDPOINTS.SUGGESTIONS_ADMIN);
        
        const [res1, res2] = await Promise.allSettled([
          fetch(API_ENDPOINTS.SUGGESTIONS, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(API_ENDPOINTS.SUGGESTIONS_ADMIN, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        let combinedData = [];

        if (res1.status === 'fulfilled' && res1.value.ok) {
          const d1 = await res1.value.json();
          console.log('Suggestions response 1:', d1);
          const list1 = Array.isArray(d1) ? d1 : (d1.data || d1.suggestions || d1.value || []);
          combinedData = [...list1];
        } else {
          console.warn('Suggestions endpoint 1 failed:', res1.status === 'fulfilled' ? res1.value.status : res1.reason);
        }

        if (res2.status === 'fulfilled' && res2.value.ok) {
          const d2 = await res2.value.json();
          console.log('Suggestions response 2:', d2);
          const list2 = Array.isArray(d2) ? d2 : (d2.data || d2.suggestions || d2.value || []);
          list2.forEach(item => {
            const isDuplicate = combinedData.some(existing => 
              (existing.suggestion || existing.content) === (item.suggestion || item.content) &&
              (existing.employee_id || existing.user_id) === (item.employee_id || item.user_id)
            );
            if (!isDuplicate) combinedData.push(item);
          });
        } else {
          console.warn('Suggestions endpoint 2 failed:', res2.status === 'fulfilled' ? res2.value.status : res2.reason);
        }

        console.log('Combined suggestions count:', combinedData.length);

        const mapped = combinedData.map(s => ({
          user: s.employee_name || s.user_name || s.user || 'Anonymous',
          team: s.employee_id || s.department || s.team || 'N/A',
          date: s.created_at ? new Date(s.created_at).toLocaleDateString() : (s.date || 'Today'),
          content: s.suggestion || s.suggestion_text || s.message || s.content || 'No content provided.',
          participation: s.requirement || s.status || s.participation || 'Active',
          profile_pic: s.profile_pic || s.profile_picture || s.user_profile_pic || s.user_pic
        }));
        setSubmissions(mapped);
      } catch (err) {
        console.error('Suggestion fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user]);
  return (
    <div className="pm-dashboard-container">
      <AppHeader />

      <main className="dashboard-content" style={{ paddingBottom: '100px' }}>
        <header className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => navigate(-1)}
              className="btn-outline"
              style={{ padding: '8px 12px' }}
            >
              ← Back
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-color)' }}>Innovation Hub</h1>
              <p style={{ color: 'var(--text-muted)' }}>Collaborative space for internal suggestions & workflow improvements.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-outline" 
              style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              🔄 Refresh
            </button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-color)' }}>84%</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>PARTICIPATION RATE</div>
            </div>
          </div>
        </header>

        <section className="dashboard-section animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="section-title">Recent Submissions</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{submissions.length} Total Submissions</span>
          </div>
          
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontWeight: '800', fontSize: '16px', marginBottom: '8px' }}>Syncing with Database...</p>
                <p style={{ fontSize: '12px' }}>This may take a moment depending on network speed.</p>
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>📭</div>
                <p style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)', marginBottom: '8px' }}>No submissions found.</p>
                <p style={{ fontSize: '13px', maxWidth: '300px', margin: '0 auto' }}>
                  If you expect to see suggestions here, please ensure you have the correct permissions or try refreshing the page.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="btn-primary" 
                  style={{ marginTop: '20px', padding: '10px 24px' }}
                >
                  Check Again
                </button>
              </div>
            ) : (
              submissions.map((s, i) => (
                <div key={i} className="team-card" style={{ padding: '24px', borderLeft: '4px solid var(--primary-color)', cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '16px', fontWeight: '900', color: '#315A9E' }}>
                        {s.profile_pic ? (
                          <img 
                            src={s.profile_pic.startsWith('http') || s.profile_pic.startsWith('data:') ? s.profile_pic : `${BASE_URL}${s.profile_pic.startsWith('/') ? '' : '/'}${s.profile_pic}`} 
                            alt="User" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          s.user.charAt(0)
                        )}
                      </div>
                      <div>
                        <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '15px', display: 'block' }}>{s.user}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>from <strong style={{ color: 'var(--primary-color)' }}>{s.team}</strong></span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.date}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                    "{s.content}"
                  </p>
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Engagement:</span>
                      <span style={{ fontSize: '10px', background: 'rgba(56, 99, 168, 0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '12px', fontWeight: '800' }}>
                        {s.participation}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-ghost" style={{ fontSize: '12px', padding: '8px 16px', color: 'var(--text-muted)' }}>Archive</button>
                      <button className="btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>Review Input</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
