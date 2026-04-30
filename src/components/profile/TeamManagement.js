import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './PMDashboard.css';

const Icons = {
  Team: () => <span>👥</span>,
  Members: () => <span>👤</span>,
  Tasks: () => <span>✅</span>,
  Arrow: () => <span>→</span>,
  Alert: () => <span>⚠️</span>,
  DragHandle: () => <span className="drag-handle">⠿</span>,
};

export default function TeamManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const isPendingFilter = queryParams.get('filter') === 'pending';
  const isCompletedFilter = queryParams.get('filter') === 'completed';
  const isAnyFilter = isPendingFilter || isCompletedFilter;

  const [isEditingAlignment, setIsEditingAlignment] = useState(false);
  const [teamsData, setTeamsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVisualOnboarding, setShowVisualOnboarding] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [usersList, setUsersList] = useState([]);
  const [newTeam, setNewTeam] = useState({ 
    teamName: '', 
    leadId: '', 
    memberIds: ['', '', '', ''] // Min 4 members
  });

  const addMemberRow = () => {
    if (newTeam.memberIds.length < 10) {
      setNewTeam({ ...newTeam, memberIds: [...newTeam.memberIds, ''] });
    }
  };

  const removeMemberRow = (index) => {
    if (newTeam.memberIds.length > 4) {
      const updated = [...newTeam.memberIds];
      updated.splice(index, 1);
      setNewTeam({ ...newTeam, memberIds: updated });
    }
  };

  const updateMember = (index, value) => {
    const updated = [...newTeam.memberIds];
    updated[index] = value;
    setNewTeam({ ...newTeam, memberIds: updated });
  };

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user?.token) return;
      try {
        const response = await fetch(API_ENDPOINTS.TEAMS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTeamsData(data);
        }
      } catch (err) {
        console.error('Teams fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      if (!user?.token) return;
      try {
        const response = await fetch(API_ENDPOINTS.USERS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUsersList(userData);
        }
      } catch (err) {
        console.error('Users fetch error:', err);
      }
    };

    fetchTeams();
    fetchUsers();
  }, [user]);

  useEffect(() => {
    // Check if user has opted out of the demo
    const isHidden = localStorage.getItem('hideAlignmentDemo') === 'true';
    
    // Show visual demo only at the "Total Teams" level when edit mode is manually toggled
    if (isEditingAlignment && !isHidden && !isAnyFilter) {
      setShowVisualOnboarding(true);
    }
  }, [isAnyFilter, isEditingAlignment]);

  const filterTeams = (team) => {
    if (isPendingFilter) return team.pending > 0;
    if (isCompletedFilter) {
      const isSafeRisk = team.risk === 'low' || team.risk === 'medium' || team.risk === 'none';
      const hasProgress = (team.progress > 0) || (team.membersList || []).some(m => m.completedTasks > 0);
      return isSafeRisk && hasProgress;
    }
    return true;
  };

  const dismissOnboarding = () => {
    if (dontShowAgain) {
      localStorage.setItem('hideAlignmentDemo', 'true');
    }
    setShowOnboarding(false);
    setShowVisualOnboarding(false);
  };

  const handleDragStart = (e, dragData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
  };

  const handleDrop = (e, targetTeamId) => {
    e.preventDefault();
    const dragDataJSON = e.dataTransfer.getData('application/json');
    if (!dragDataJSON) return;
    
    const dragData = JSON.parse(dragDataJSON);
    if (dragData.teamId === targetTeamId) return; // Dropped on the same team
    
    setTeamsData(prev => {
      const newTeams = [...prev];
      const sourceTeamIdx = newTeams.findIndex(t => t.id === dragData.teamId);
      const targetTeamIdx = newTeams.findIndex(t => t.id === targetTeamId);
      
      const sourceTeam = {...newTeams[sourceTeamIdx]};
      const targetTeam = {...newTeams[targetTeamIdx]};
      
      if (dragData.type === 'member') {
        const member = (sourceTeam.membersList || [])[dragData.memberIdx];
        sourceTeam.membersList = (sourceTeam.membersList || []).filter((_, i) => i !== dragData.memberIdx);
        targetTeam.membersList = [...(targetTeam.membersList || []), member];
        
        sourceTeam.members = sourceTeam.membersList.length;
        targetTeam.members = targetTeam.membersList.length;
      } else if (dragData.type === 'lead') {
        const tempLead = sourceTeam.lead;
        const tempLeadRole = sourceTeam.leadRole;
        
        sourceTeam.lead = targetTeam.lead;
        sourceTeam.leadRole = targetTeam.leadRole;
        
        targetTeam.lead = tempLead;
        targetTeam.leadRole = tempLeadRole;
      }
      
      newTeams[sourceTeamIdx] = sourceTeam;
      newTeams[targetTeamIdx] = targetTeam;
      return newTeams;
    });
  };

  const handleSaveAlignment = async () => {
    if (!user?.token) return;
    setSaving(true);
    try {
      // TEAM TABLE MAPPER: Explicitly linking UI team names to DB individual tables
      const tableMapper = {
        'Navabharatha': 'team_navabharatha',
        'MLM': 'team_mlm',
        'JKDMart Tokensboy': 'team_jkdmart_tokensboy',
        'Digital Field Marketing': 'team_digital_field_marketing',
        'Testing': 'team_testing',
        'Technical Support': 'team_technical_support'
      };

      // REFINED PAYLOAD: Exhaustive mapping for both 'users' table and individual 'team_xxx' tables
      const payload = {
        alignments: teamsData.map(t => {
          // Find target table by mapping or partial match
          const targetTable = tableMapper[t.name] || `team_${t.name.toLowerCase().replace(/\s+/g, '_')}`;
          
          return {
            team_id: t.id,
            team_name: t.name,
            target_table: targetTable, // EXPLICIT TABLE HINT FOR BACKEND
            lead: t.lead,
            lead_role: t.leadRole,
            members: (t.membersList || []).map(m => ({
              id: m.id || m.userid || m.employee_id || m.employeeId,
              name: m.name,
              role: m.role || 'Member'
            }))
          };
        }),
        audit: {
          user: user.name,
          user_id: user.id || user.userId,
          timestamp: new Date().toISOString(),
          app: 'PManager'
        }
      };

      const response = await fetch(API_ENDPOINTS.HIERARCHY_REALIGN, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsEditingAlignment(false);
        alert('Hierarchy Synced! Both Users and Individual Team tables updated successfully. 🚀');
      } else {
        const errorText = await response.text();
        console.error('Realignment Sync Error:', errorText);
        alert(`Failed to sync. Backend rejected individual table updates. Status: ${response.status}`);
      }
    } catch (err) {
      console.error('Alignment save error:', err);
      alert('Network error while saving alignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-dashboard-container">
      {/* CANDY CRUSH STYLE VISUAL ONBOARDING (Shows on Refresh) */}
      {showVisualOnboarding && (
        <div className="onboarding-overlay-v2">
          <div style={{ position: 'relative', width: '300px', height: '200px', marginBottom: '40px' }}>
            <div className="ghost-onboarding-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#1e293b' }}>Anish V N</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Lead Architect</div>
                </div>
              </div>
            </div>
            <div className="hand-cursor" style={{ top: '25px', left: '15px' }}>
              <span className="hand-emoji-animation">👆</span>
            </div>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'white', marginBottom: '15px' }}>Drag & Drop Teams</h2>
          <p style={{ fontSize: '18px', opacity: 0.9, maxWidth: '450px', lineHeight: '1.6', marginBottom: '20px' }}>
            Move team members and leads seamlessly across your organization by dragging their cards.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="checkbox" 
              id="dontShowAgainV2" 
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="dontShowAgainV2" style={{ color: 'white', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>Don't show this again</label>
          </div>

          <button 
            onClick={dismissOnboarding}
            style={{ padding: '12px 40px', borderRadius: '50px', background: 'white', color: '#1e293b', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
          >
            SKIP DEMO
          </button>
        </div>
      )}

      <AppHeader />
      
      <main className="dashboard-content" style={{paddingBottom: '100px'}}>
        <header className="section-header">
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>

            <div>
              <h1 style={{fontSize: '24px', fontWeight: '800', color: '#1e293b'}}>Total Teams</h1>
              <p style={{color: '#64748b'}}>Centralized control for all {teamsData.length} active project teams</p>
            </div>
          </div>
          <div className="team-header-actions">
            {!isAnyFilter && (
              <button 
                onClick={() => isEditingAlignment ? handleSaveAlignment() : setIsEditingAlignment(true)} 
                className="btn-primary" 
                style={{
                  backgroundColor: isEditingAlignment ? '#eff6ff' : 'white', 
                  color: isEditingAlignment ? '#3863a8' : '#3863a8', 
                  border: isEditingAlignment ? '2px solid #3863a8' : '1px solid #cbd5e1', 
                  transition: '0.2s background',
                  fontWeight: '800'
                }} 
                onMouseOver={(e) => {
                  if (!isEditingAlignment) e.currentTarget.style.backgroundColor = '#f1f5f9';
                }} 
                onMouseOut={(e) => {
                  if (!isEditingAlignment) e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                {saving ? 'Saving...' : (isEditingAlignment ? 'Save Allignment' : 'Edit Team Allignment')}
              </button>
            )}
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary" 
              style={{backgroundColor: '#e0e7ff', color: '#312e81', border: '1px solid #c7d2fe', cursor: 'pointer'}}
            >
              + Create New Team
            </button>
          </div>
        </header>

        <section className="dashboard-section animate-fade-in">
          <div className="team-grid" style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(${winWidth < 480 ? '280px' : '320px'}, 1fr))`, 
            gap: winWidth < 480 ? '16px' : '24px', 
            justifyContent: 'center'
          }}>
            {teamsData
              .filter(filterTeams)
              .map((team, idx) => (
              <div 
                key={team.id} 
                className={`team-card ${isEditingAlignment ? 'edit-mode-card' : ''}`} 
                style={{
                  animationDelay: `${idx * 0.1}s`, 
                  background: 'white', 
                  padding: winWidth < 480 ? '16px' : '24px', 
                  borderRadius: '24px', 
                  boxShadow: 'var(--shadow-md)', 
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: team.members > 0 ? (winWidth < 480 ? '260px' : '420px') : (winWidth < 480 ? '200px' : '300px'),
                  justifyContent: 'flex-start',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onClick={() => !isEditingAlignment && navigate(`/teams/${team.id}`)}
                onDragOver={(e) => {
                  if (isEditingAlignment) {
                    e.preventDefault();
                    e.currentTarget.style.outline = '2px dashed #3863a8';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onDragLeave={(e) => {
                  if (isEditingAlignment) {
                    e.currentTarget.style.outline = '2px dashed transparent';
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
                onDrop={(e) => {
                  if (isEditingAlignment) {
                    e.currentTarget.style.outline = '2px dashed transparent';
                    e.currentTarget.style.backgroundColor = 'white';
                    handleDrop(e, team.id);
                  }
                }}
              >
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  {/* FIXED HEIGHT HEADER CONTAINER */}
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: winWidth < 480 ? '12px' : '16px', alignItems: 'center', gap: '15px', minHeight: winWidth < 480 ? '36px' : '48px'}}>
                    <h3 style={{fontWeight: '800', fontSize: winWidth < 480 ? '16px' : '18px', lineHeight: '1.2', color: '#1e293b', flex: 1, margin: 0}}>{team.name}</h3>
                    <div style={{
                      fontSize: '10px', 
                      fontWeight: '900', 
                      textTransform: 'uppercase',
                      color: team.risk === 'high' ? '#dc2626' : team.risk === 'medium' ? '#ea580c' : '#0369a1',
                      letterSpacing: '0.8px',
                      whiteSpace: 'nowrap',
                      background: team.risk === 'high' ? '#fee2e2' : team.risk === 'medium' ? '#ffedd5' : '#e0f2fe',
                      padding: '5px 12px',
                      borderRadius: '10px',
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      {team.risk === 'none' ? 'ON TRACK' : `${team.risk || 'none'} RISK`}
                    </div>
                  </div>

                  {/* HIGHLIGHTED LEAD SECTION (NORMAL VIEW) */}
                  {!isEditingAlignment && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                      margin: winWidth < 480 ? '8px -16px 12px -16px' : '12px -24px 16px -24px', 
                      padding: winWidth < 480 ? '8px 16px' : '12px 24px',
                      borderTop: '1px solid #bae6fd',
                      borderBottom: '1px solid #bae6fd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minHeight: winWidth < 480 ? '48px' : '62px' // LOCK HEIGHT
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1}}>
                        <div style={{position: 'relative', flexShrink: 0}}>
                          <div style={{width: '32px', height: '32px', borderRadius: '10px', background: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900', boxShadow: '0 4px 8px rgba(56,99,168,0.1)'}}>
                            {(team.lead || 'M').charAt(0)}
                          </div>
                          <div style={{position: 'absolute', top: '-4px', right: '-4px', fontSize: '10px'}}>🏆</div>
                        </div>
                        <div style={{overflow: 'hidden'}}>
                          <div style={{
                            fontSize: '13px', fontWeight: '800', color: '#1e293b', 
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }} title={team.lead || 'Manager'}>
                            {team.lead || 'Manager'}
                          </div>
                          <div style={{fontSize: '10px', color: '#0369a1', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Team Leader</div>
                        </div>
                      </div>
                      <div style={{padding: '4px 8px', background: 'white', borderRadius: '8px', fontSize: '10px', fontWeight: '900', color: '#3863a8', border: '1px solid #bae6fd', flexShrink: 0, marginLeft: '8px'}}>ACTIVE</div>
                    </div>
                  )}
                </div>
                {isEditingAlignment ? (
                  <div className="alignment-view animate-fade-in" style={{marginTop: '16px'}}>
                    <div style={{background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0'}}>
                      <div style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px'}}>Team Lead</div>
                      <div 
                        draggable={isEditingAlignment}
                        onDragStart={(e) => handleDragStart(e, {type: 'lead', teamId: team.id})}
                        style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: isEditingAlignment ? 'grab' : 'default', padding: isEditingAlignment ? '8px' : '0', borderRadius: '8px'}}
                        className={isEditingAlignment ? 'pulse-edit-mode wiggle-animation' : ''}
                      >
                        <div style={{width: '36px', height: '36px', borderRadius: '10px', background: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 10px rgba(56,99,168,0.2)'}}>{(team.lead || 'M').charAt(0)}</div>
                        {isEditingAlignment && <Icons.DragHandle />}
                        <div>
                          <div style={{fontWeight: '800', fontSize: '14px', color: '#1e293b'}}>{team.lead || 'Manager'}</div>
                          <div style={{fontSize: '12px', color: '#64748b', fontWeight: '600'}}>{team.leadRole || 'Team Manager'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px'}}>
                      {isPendingFilter ? 'Members with Pending Tasks' : isCompletedFilter ? 'Members with Completed Tasks' : 'Team Members'}
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      {(team.membersList || [])
                        .filter(m => {
                          // Standardize names for comparison (remove whitespace/casing)
                          const isLead = String(m.name || '').trim().toLowerCase() === String(team.lead || '').trim().toLowerCase();
                          if (isLead) return false;

                          if (isPendingFilter) return m.pendingTasks && m.pendingTasks > 0;
                          if (isCompletedFilter) return m.completedTasks && m.completedTasks > 0;
                          return true;
                        })
                        .map((m, idx) => (
                        <div 
                          key={idx} 
                          draggable={isEditingAlignment && !isAnyFilter}
                          onDragStart={(e) => handleDragStart(e, {type: 'member', memberIdx: idx, teamId: team.id})}
                          style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '10px', 
                            background: 'white', 
                            border: isPendingFilter ? '1px solid #fed7aa' : isCompletedFilter ? '1px solid #bbf7d0' : '1px solid #f1f5f9', 
                            borderRadius: '10px', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
                            cursor: isEditingAlignment && !isAnyFilter ? 'grab' : 'default', 
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                          className={isEditingAlignment ? 'pulse-edit-mode wiggle-animation' : ''}
                          onMouseOver={(e) => {
                            if (isEditingAlignment && !isAnyFilter) e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={(e) => {
                            if (isEditingAlignment && !isAnyFilter) e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '8px', 
                            background: isPendingFilter ? '#fff7ed' : isCompletedFilter ? '#f0fdf4' : '#f1f5f9', 
                            color: isPendingFilter ? '#ea580c' : isCompletedFilter ? '#166534' : '#3863a8', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
                          }}>{m.name.charAt(0)}</div>
                          {isEditingAlignment && <Icons.DragHandle />}
                          <div style={{flex: 1}}>
                            <div style={{fontWeight: '800', fontSize: '13px', color: '#1e293b'}}>{m.name}</div>
                            <div style={{fontSize: '11px', color: '#64748b', fontWeight: '600'}}>{m.role}</div>
                          </div>
                          {isPendingFilter && m.pendingTasks > 0 && (
                            <div style={{background: '#ea580c', color: 'white', fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px', boxShadow: '0 2px 5px rgba(234,88,12,0.3)'}}>
                              {m.pendingTasks} Pending
                            </div>
                          )}
                          {isCompletedFilter && m.completedTasks > 0 && (
                            <div style={{background: '#166534', color: 'white', fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '6px', boxShadow: '0 2px 5px rgba(22,101,52,0.3)'}}>
                              {m.completedTasks} Done
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="normal-view animate-fade-in" style={{marginTop: '12px', display: 'flex', flexDirection: 'column', flex: 1}}>
                    {/* FIXED HEIGHT DESCRIPTION */}
                    <p style={{
                      fontSize: '13px', 
                      color: '#64748b', 
                      marginBottom: winWidth < 480 ? '12px' : '24px', 
                      lineHeight: '1.6',
                      display: winWidth < 480 ? 'none' : '-webkit-box', // Hide on small mobile to save vertical space
                      WebkitLineClamp: '3',
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: winWidth < 480 ? '0' : '62px' 
                    }} title={team.description}>
                      {team.description || 'Active operations and management for this specific team unit.'}
                    </p>
                    
                    {/* CONDITIONAL METRICS GRID (Only for teams with members) */}
                    {team.members > 0 && (
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: winWidth < 480 ? '8px' : '12px', marginBottom: winWidth < 480 ? '16px' : '20px'}}>
                        <div style={{
                          padding: winWidth < 480 ? '10px 12px' : '12px 16px', 
                          background: '#f8fafc', 
                          borderRadius: '16px', 
                          textAlign: 'center',
                          border: '1px solid #f1f5f9'
                        }}>
                          <div style={{fontSize: winWidth < 480 ? '16px' : '20px', fontWeight: '950', color: '#1e293b'}}>{team.members}</div>
                          <div style={{fontSize: winWidth < 480 ? '8px' : '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Members</div>
                        </div>
                        <div style={{
                          padding: winWidth < 480 ? '10px 12px' : '12px 16px', 
                          background: '#f8fafc', 
                          borderRadius: '16px', 
                          textAlign: 'center',
                          border: '1px solid #f1f5f9'
                        }}>
                          <div style={{fontSize: winWidth < 480 ? '16px' : '20px', fontWeight: '950', color: '#1e293b'}}>{team.pending}</div>
                          <div style={{fontSize: winWidth < 480 ? '8px' : '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Tasks</div>
                        </div>
                      </div>
                    )}

                    <div style={{marginBottom: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px'}}>
                      <span style={{color: '#94a3b8'}}>Overall Progress</span>
                      <span style={{color: '#3863a8'}}>{team.progress}%</span>
                    </div>
                    <div className="progress-bar-container" style={{height: winWidth < 480 ? '8px' : '12px', borderRadius: '50px', background: '#f1f5f9', marginBottom: winWidth < 480 ? '16px' : '24px', padding: '2px'}}>
                      <div className="progress-bar-fill" style={{width: `${team.progress}%`, borderRadius: '50px', background: 'linear-gradient(to right, #3863a8, #60a5fa)', boxShadow: '0 2px 5px rgba(56,99,168,0.3)'}}></div>
                    </div>

                    <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: winWidth < 480 ? '10px' : '15px', borderTop: '1px solid #f8fafc'}}>
                      <span style={{color: '#3863a8', fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s transform'}} onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                        View Team Roster <Icons.Arrow />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      
      {/* ONBOARDING DEMO MODAL */}
      {showOnboarding && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
          padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            backgroundColor: 'white', width: '100%', maxWidth: '400px',
            borderRadius: '30px', padding: '35px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>🖱️</div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '10px' }}>Did you know?</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px' }}>
              You can now <strong>drag and drop</strong> team leads and members to reorganize your teams. Shaking elements are ready to move!
            </p>

            <button 
              onClick={dismissOnboarding}
              style={{ width: '100%', padding: '14px', borderRadius: '50px', border: 'none', background: '#3863a8', color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(56,99,168,0.2)' }}
            >
              Got it, let's go!
            </button>
          </div>
        </div>
      )}

      <AppFooter />

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            backgroundColor: 'white', width: '100%', maxWidth: '480px',
            borderRadius: '40px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #f1f5f9', position: 'relative'
          }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: '25px', right: '25px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' }}
            >✕</button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#eff6ff', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 8px' }}>👥</div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>Establish Management Unit</h2>
            </div>

            <div style={{ paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Team Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>UNIT MISSION NAME</label>
                  <input 
                    type="text" placeholder="e.g. Backend Sigma Hub"
                    value={newTeam.teamName}
                    onChange={(e) => setNewTeam({...newTeam, teamName: e.target.value})}
                    style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '700', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Team Lead */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>ASSIGN UNIT LEAD</label>
                  <select 
                    value={newTeam.leadId}
                    onChange={(e) => setNewTeam({...newTeam, leadId: e.target.value})}
                    style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '700', fontSize: '13px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Leadership...</option>
                    {usersList
                      .filter(u => (u.role || '').toUpperCase().includes('LEAD') || (u.role || '').toUpperCase().includes('MANAGER'))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                  </select>
                </div>

                {/* Team Members */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>UNIT MEMBERS (4-10 REQUIRED)</label>
                   {newTeam.memberIds.map((memberId, index) => (
                     <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                       <div style={{ flex: 1 }}>
                         <input 
                           type="text"
                           placeholder={`Enter Member Name ${index + 1}...`}
                           value={memberId}
                           onChange={(e) => updateMember(index, e.target.value)}
                           style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '600', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                         />
                       </div>
                       {newTeam.memberIds.length > 4 && (
                         <button 
                           onClick={() => removeMemberRow(index)}
                           style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}
                         >✕</button>
                       )}
                     </div>
                   ))}
                   
                   {newTeam.memberIds.length < 10 && (
                     <button 
                       onClick={addMemberRow}
                       style={{ padding: '8px', borderRadius: '10px', border: '1.5px dashed #3863a8', background: 'transparent', color: '#3863a8', fontWeight: '700', cursor: 'pointer', fontSize: '11px', marginTop: '2px' }}
                     >+ Add Member</button>
                   )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '50px', border: '1.5px solid #eef2f6', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
              >Cancel</button>
              <button 
                onClick={() => { alert('Unit Established! ✅'); setShowCreateModal(false); }}
                style={{ flex: 2, padding: '12px', borderRadius: '50px', border: 'none', background: '#3863a8', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 12px rgba(56,99,168,0.2)' }}
              >Confirm Unit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
