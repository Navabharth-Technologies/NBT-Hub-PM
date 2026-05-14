import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './PMDashboard.css';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamLead, setEditTeamLead] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchTeamDetail = async () => {
      if (!user?.token) return;
      try {
        const response = await fetch(API_ENDPOINTS.TEAMS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (response.ok) {
          const responseData = await response.json();
          const allTeams = Array.isArray(responseData) ? responseData : (responseData.data || responseData.teams || []);
          const found = allTeams.find(t => t && String(t.id || t.ID || '').trim() === String(id).trim());
          if (found) {
            // Fetch users only for role resolution (Tasks removed per request)
            const usersData = await fetch(API_ENDPOINTS.USERS, { 
              headers: { 'Authorization': `Bearer ${user.token}` } 
            }).then(r => r.ok ? r.json() : []).catch(() => []);

            let roleMap = {};
            const usersList = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
            usersList.forEach(u => {
              if (u.name) roleMap[u.name.toLowerCase()] = u.role;
            });

            const rawMembers = Array.isArray(found.membersList) ? found.membersList : (Array.isArray(found.members) ? found.members : []);
            const enrichedMembers = rawMembers.map(m => ({
              ...m,
              role: roleMap[String(m.name || '').toLowerCase()] || m.role || 'Member'
            }));

            setTeam({
              ...found,
              members: enrichedMembers,
              tasks: found.tasks || []
            });
          }
        }
      } catch (err) {
        console.error('Fetch team error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamDetail();
  }, [id, user]);

  const handleDownloadReport = () => {
    try {
      const doc = new jsPDF();
      const today = new Date().toLocaleString();

      // 1. Header & Executive Summary
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Indigo-900
      doc.text(team.name.toUpperCase(), 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text('OPERATIONAL PERFORMANCE & ROSTER REPORT', 14, 28);
      doc.text(`Generated on: ${today}`, 14, 34);

      // Executive Metrics
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`PROJECT HEALTH: ${team.progress || 0}%`, 14, 45);
      doc.text(`TOTAL UNIT MEMBERS: ${team.members?.length || 0}`, 80, 45);

      // 2. Table: TEAM ROSTER
      doc.setFontSize(12);
      doc.setTextColor(56, 99, 168); // Titan Indigo
      doc.text('I. TEAM ROSTER', 14, 55);

      const rosterColumns = ["Member Name", "Designated Role", "Operational Status"];
      const rosterRows = (team.members || []).map(m => [
        m.name || 'Unknown',
        m.role || 'Member',
        m.status || 'Offline'
      ]);

      autoTable(doc, {
        head: [rosterColumns],
        body: rosterRows,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [56, 99, 168], halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { bottom: 20 }
      });

      // 3. Save
      doc.save(`Team_Report_${team.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('DEBUG: Team PDF Report Generated Successfully! 📄');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Check console.');
    }
  };

  const handleEditTeam = () => {
    setEditTeamName(team.name);
    const currentLead = team.lead || team.members.find(m => /lead|manager|head/i.test(m.role))?.name || '';
    setEditTeamLead(currentLead);
    setShowEditModal(true);
  };

  const handleSaveTeam = async () => {
    if (!editTeamName.trim() || !user?.token) return;
    setIsSaving(true);
    try {
      // The rename API might only accept names, but I'll include the lead just in case the backend supports it.
      // If the backend doesn't support lead update via this endpoint, we'd need another API.
      const response = await fetch(API_ENDPOINTS.TEAM_RENAME, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          oldName: team.name,
          newName: editTeamName,
          lead: editTeamLead
        })
      });

      if (response.ok) {
        setTeam(prev => ({ ...prev, name: editTeamName, lead: editTeamLead }));
        setShowEditModal(false);
      } else {
        const errorText = await response.text();
        console.error('Rename error response:', errorText);
        let errorMessage = 'Failed to update team.';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch { }
        alert(errorMessage + ' Please try again.');
      }
    } catch (err) {
      console.error('Save team error:', err);
      alert('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pm-dashboard-container">
        <AppHeader />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontWeight: '800', color: '#3863a8' }}>
          SYNCHRONIZING TEAM DATA...
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="pm-dashboard-container">
        <AppHeader />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontWeight: '800', color: '#ef4444' }}>
          TEAM NOT FOUND
        </div>
      </div>
    );
  }

  return (
    <div className="pm-dashboard-container">
      <AppHeader />

      <main className="dashboard-content" style={{ paddingBottom: '100px', paddingTop: winWidth < 768 ? '100px' : '120px', paddingLeft: winWidth < 768 ? '16px' : '26px', paddingRight: winWidth < 768 ? '16px' : '26px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%' }}>
          <header className="section-header" style={{
            flexDirection: winWidth < 768 ? 'column' : 'row',
            alignItems: winWidth < 768 ? 'flex-start' : 'center',
            gap: winWidth < 768 ? '20px' : '20px',
            marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button 
                onClick={() => navigate(-1)} 
                style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              >
                <ArrowLeft size={18} color="#64748b" />
              </button>
              <div>
                <h1 style={{ fontSize: winWidth < 768 ? '28px' : '24px', fontWeight: '800', color: '#1e293b' }}>{team.name}</h1>
                <p style={{ color: '#64748b', fontSize: winWidth < 768 ? '14px' : '15px' }}>Detailed performance and member analytics</p>
              </div>
            </div>
            <div className="quick-actions" style={{
              display: 'flex',
              gap: '10px',
              position: 'relative',
              width: winWidth < 768 ? '100%' : 'auto',
              flexWrap: winWidth < 768 ? 'wrap' : 'nowrap'
            }}>
              <button
                className="btn-primary"
                onClick={handleDownloadReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: winWidth < 768 ? '1' : 'initial',
                  justifyContent: 'center',
                  minWidth: winWidth < 768 ? '160px' : 'auto'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Download report
              </button>

              <button
                className="btn-primary"
                onClick={handleEditTeam}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: winWidth < 768 ? '1' : 'initial',
                  justifyContent: 'center',
                  minWidth: winWidth < 768 ? '120px' : 'auto'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Edit Team
              </button>
            </div>
          </header>

          <div className="main-dashboard-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '30px',
            width: '100%',
            overflowX: 'hidden'
          }}>
            <div className="dashboard-left" style={{ width: '100%', overflowX: 'hidden' }}>
              <section className="dashboard-section animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>

                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{team.members.length} Total People</span>
                </div>

                {/* LEADERSHIP SECTION */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Team Leadership</div>
                  {team.members.find(m => /lead|manager|head/i.test(m.role)) ? (
                    (() => {
                      const leader = team.members.find(m => /lead|manager|head/i.test(m.role));
                      return (
                        <div
                          className="member-report-card"
                          style={{
                            padding: winWidth < 480 ? '20px' : '24px',
                            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                            borderRadius: '24px', border: '2px solid #bae6fd',
                            display: 'flex',
                            flexDirection: winWidth < 480 ? 'column' : 'row',
                            alignItems: winWidth < 480 ? 'flex-start' : 'center',
                            gap: '20px', transition: 'all 0.3s',
                            boxShadow: '0 10px 25px -5px rgba(56,99,168,0.1)'
                          }}
                        >
                          <div style={{ position: 'relative' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900', boxShadow: '0 8px 16px rgba(56,99,168,0.2)', overflow: 'hidden' }}>
                              {leader.profile_pic || leader.profile_picture ? (
                                <img
                                  src={leader.profile_pic.startsWith('http') || leader.profile_pic.startsWith('data:') ? leader.profile_pic : `${BASE_URL}${leader.profile_pic.startsWith('/') ? '' : '/'}${leader.profile_pic}`}
                                  alt="Leader"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                leader.name.charAt(0)
                              )}
                            </div>
                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: '#f59e0b', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #f0f9ff', fontSize: '12px' }}>👑</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: winWidth < 480 ? 'column' : 'row',
                              alignItems: winWidth < 480 ? 'flex-start' : 'center',
                              gap: '8px',
                              marginBottom: '6px',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{
                                fontWeight: '900',
                                fontSize: winWidth < 480 ? '16px' : '18px',
                                color: '#1e293b',
                                wordBreak: 'break-word',
                                lineHeight: '1.2'
                              }}>{leader.name}</div>
                              <span style={{ padding: '3px 10px', background: '#3863a8', color: 'white', fontSize: '10px', fontWeight: '900', borderRadius: '50px', textTransform: 'uppercase' }}>TEAM LEADER</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#475569', fontWeight: '700' }}>{leader.role}</div>
                            <div style={{ fontSize: '12px', marginTop: '6px', color: (leader.status || 'Offline') === 'Online' ? '#10b981' : '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (leader.status || 'Offline') === 'Online' ? '#10b981' : '#cbd5e1' }}></div>
                              {leader.status || 'Offline'}
                            </div>
                          </div>
                          <div style={{ color: '#3863a8', fontSize: '20px', fontWeight: 'bold' }}>→</div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                      No designated leader assigned to this team.
                    </div>
                  )}
                </div>

                {/* MEMBERS GRID */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '17px' }}>Team Members</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit, minmax(${winWidth < 480 ? '160px' : '290px'}, 1fr))`,
                    gap: winWidth < 480 ? '12px' : '20px',
                    justifyContent: 'center'
                  }}>
                    {team.members
                      .filter(m => !(/lead|manager|head/i.test(m.role)))
                      .map((member, i) => (
                        <div
                          key={i}
                          className="member-report-card"
                          style={{
                            padding: winWidth < 480 ? '12px' : '16px',
                            background: 'white',
                            borderRadius: winWidth < 480 ? '16px' : '20px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: winWidth < 480 ? '10px' : '12px',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{
                            width: winWidth < 480 ? '36px' : '42px',
                            height: winWidth < 480 ? '36px' : '42px',
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            color: '#312e81',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: winWidth < 480 ? '14px' : '16px',
                            overflow: 'hidden'
                          }}>
                            {member.profile_pic || member.profile_picture ? (
                              <img
                                src={member.profile_pic.startsWith('http') || member.profile_pic.startsWith('data:') ? member.profile_pic : `${BASE_URL}${member.profile_pic.startsWith('/') ? '' : '/'}${member.profile_pic}`}
                                alt="Member"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              member.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: winWidth < 480 ? '13px' : '14px', color: '#1e293b' }}>{member.name}</div>
                            <div style={{ fontSize: winWidth < 480 ? '10px' : '11px', color: '#64748b', fontWeight: '600' }}>{member.role}</div>
                            <div style={{ fontSize: winWidth < 480 ? '8px' : '10px', marginTop: '4px', color: (member.status || 'Offline') === 'Online' ? '#10b981' : '#94a3b8', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ width: winWidth < 480 ? '5px' : '6px', height: winWidth < 480 ? '5px' : '6px', borderRadius: '50%', background: (member.status || 'Offline') === 'Online' ? '#10b981' : '#cbd5e1' }}></div>
                              {(member.status || 'Offline').toUpperCase()}
                            </div>
                          </div>
                        </div>
                      ))}
                    {team.members.filter(m => !(/lead|manager|head/i.test(m.role))).length === 0 && (
                      <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        No additional team members found.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

          </div> {/* Closes main-dashboard-grid at 376 */}
        </div> {/* Closes maxWidth div at 229 */}
      </main> {/* Closes dashboard-content main at 228 */}

      <AppFooter />

      {/* EDIT TEAM MODAL */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', width: '100%', maxWidth: '450px', borderRadius: '32px',
            padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Edit Team</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Modify team identity and settings</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#3863a8', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '4px' }}>Team Name</label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cleanVal = val.replace(/[0-9]/g, '');
                    setEditTeamName(cleanVal);
                  }}
                  placeholder="Enter team name..."
                  style={{
                    padding: '16px 20px', borderRadius: '16px', border: '2px solid #e2e8f0',
                    fontSize: '16px', fontWeight: '700', color: '#1e293b', outline: 'none',
                    transition: 'all 0.2s', background: '#f8fafc'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3863a8'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#3863a8', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '4px' }}>Designated Team Lead</label>
                <select
                  value={editTeamLead}
                  onChange={(e) => setEditTeamLead(e.target.value)}
                  style={{
                    padding: '16px 20px', borderRadius: '16px', border: '2px solid #e2e8f0',
                    fontSize: '16px', fontWeight: '700', color: '#1e293b', outline: 'none',
                    appearance: 'none', background: '#f8fafc', cursor: 'pointer'
                  }}
                >
                  <option value="">Select a Leader...</option>
                  {team.members.map(m => (
                    <option key={m.id || m.EmpID} value={m.name}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '20px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#3863a8', textTransform: 'uppercase', marginBottom: '10px' }}>Quick Stats</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Total Members</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{team.members?.length || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Active Tasks</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{team.tasks?.length || 0}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1, padding: '16px', borderRadius: '16px', background: 'white',
                    color: '#64748b', border: '1px solid #e2e8f0', fontWeight: '800',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >Cancel</button>
                <button
                  onClick={handleSaveTeam}
                  disabled={isSaving}
                  style={{
                    flex: 2, padding: '16px', borderRadius: '16px', background: '#3863a8',
                    color: 'white', border: 'none', fontWeight: '800',
                    cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 10px 15px -3px rgba(56,99,168,0.3)',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Updates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
