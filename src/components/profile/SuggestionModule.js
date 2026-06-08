import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { ArrowLeft, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './PMDashboard.css';

export default function SuggestionModule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('en-GB');

    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('NBT Suggestions Hub Report', 14, 22);

    // Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Submissions: ${submissions.length}`, 14, 30);

    doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 14, 42);

    const cleanText = (str) => {
      if (!str) return 'N/A';
      return String(str)
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
        .replace(/[^\x20-\x7E\s]/g, '') // remove non-ASCII
        .replace(/\s+/g, ' ')
        .trim();
    };

    const tableColumn = ["Submitted By", "Emp ID / Team", "Date", "Suggestion Content", "Engagement"];
    const tableRows = submissions.map(s => [
      cleanText(s.user),
      cleanText(s.team),
      cleanText(s.date),
      cleanText(s.content),
      cleanText(s.participation).toUpperCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 32 },                  // Submitted By
        1: { cellWidth: 24 },                  // Emp ID / Team
        2: { cellWidth: 24, halign: 'center' }, // Date (Expanded to prevent wrapping)
        3: { cellWidth: 78 },                  // Suggestion Content
        4: { cellWidth: 28, halign: 'center' }  // Engagement (Expanded to prevent header wrapping)
      },
      headStyles: { fillColor: [49, 99, 170], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 12, right: 12 }
    });

    doc.save(`Suggestions_Report_${today.replace(/\//g, '-')}.pdf`);
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      const token = user?.token || localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const fetchUrl = `${BASE_URL}/api/suggestions`;
        console.log('SuggestionModule: Fetching from', fetchUrl);
        console.log('SuggestionModule: Token', token ? 'Found' : 'Missing');

        const res = await fetch(fetchUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          console.log('SuggestionModule: Raw Data Received:', data);

          const list = Array.isArray(data) ? data : (data.data || data.suggestions || []);
          console.log('SuggestionModule: Processed List Length:', list.length);

          const mapped = list.map(s => {
            const rawDate = s.created_at || s.date;
            let formattedDate = 'Today';
            if (rawDate && rawDate !== 'Today') {
              if (typeof rawDate === 'string' && rawDate.includes('-') && rawDate.length === 10) {
                const parts = rawDate.split('-');
                if (parts[0].length === 4) {
                  formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else {
                  formattedDate = rawDate;
                }
              } else {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  formattedDate = `${day}-${month}-${year}`;
                } else {
                  formattedDate = rawDate;
                }
              }
            }
            return {
              user: s.employee_name || s.user_name || s.user || 'Anonymous',
              team: s.employee_id || s.department || s.team || 'N/A',
              date: formattedDate,
              content: s.suggestion || s.suggestion_text || s.message || s.content || 'No content provided.',
              participation: s.requirement || s.status || s.participation || 'Active',
              profile_pic: s.profile_pic || s.profile_picture || s.user_profile_pic || s.user_pic
            };
          });
          setSubmissions(mapped);
        } else {
          console.error('SuggestionModule: Fetch Failed', res.status, res.statusText);
        }
      } catch (err) {
        console.error('SuggestionModule: Error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user]);

  return (
    <div className="pm-dashboard-container suggestion-screen-container">
      <style>{`
        .suggestion-screen-container,
        .suggestion-screen-container * {
          font-family: 'Outfit', sans-serif !important;
        }
      `}</style>
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
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-color)' }}>Suggestion Hub</h1>
              <p style={{ color: 'var(--text-muted)' }}></p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              className="btn-outline"
              style={{
                background: 'white',
                color: 'var(--primary-color)',
                border: '2px solid #cbd5e1',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <Download size={16} /> Export PDF
            </button>
          </div>
        </header>

        <section className="dashboard-section animate-fade-in">
          <h2 className="section-title">Recent Submissions</h2>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontWeight: '800' }}>Fetching latest suggestions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--card-bg)', borderRadius: '20px', border: '1px dashed var(--border-color)' }}>
                <p style={{ fontWeight: '800' }}>No submissions found.</p>
                <p style={{ fontSize: '12px' }}>New suggestions will appear here once submitted.</p>
              </div>
            ) : (
              submissions.map((s, i) => (
                <div key={i} className="team-card" style={{ padding: '24px', borderLeft: '4px solid var(--primary-color)', cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '16px', fontWeight: '900', color: '#315A9E', position: 'relative' }}>
                        {(() => {
                          const isEmpId = /^\d+$/.test(String(s.team).trim());
                          const finalPicUrl = s.profile_pic ? (s.profile_pic.startsWith('http') || s.profile_pic.startsWith('data:') ? s.profile_pic : `${BASE_URL}${s.profile_pic.startsWith('/') ? '' : '/'}${s.profile_pic}`) : (isEmpId ? `${BASE_URL}/api/users/${String(s.team).trim()}/photo` : null);
                          return (
                            <>
                              {finalPicUrl && (
                                <img
                                  src={finalPicUrl}
                                  alt="User"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                                  onLoad={(e) => { if (e.target.nextSibling) e.target.nextSibling.style.display = 'none'; }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span>
                                {s.user.charAt(0)}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <span style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '15px', display: 'block' }}>{s.user}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>from <strong style={{ color: 'var(--primary-color)' }}>{s.team}</strong></span>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.date}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontWeight: '600' }}>
                    {s.content}
                  </p>
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Engagement:</span>
                      <span style={{ fontSize: '10px', background: 'rgba(56, 99, 168, 0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '12px', fontWeight: '800' }}>
                        {s.participation}
                      </span>
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
