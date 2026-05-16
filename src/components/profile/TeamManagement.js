import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
  const [success, setSuccess] = useState(null);
  const [talentSearch, setTalentSearch] = useState('');

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

  const handleCreateTeam = async () => {
    if (!newTeam.teamName) {
      alert('Required: Mission name is needed! ⚠️');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.TEAM_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          teamName: newTeam.teamName,
          lead_id: parseInt(newTeam.leadId || user?.id || '0'),
          member_ids: newTeam.memberIds.filter(m => String(m).trim() !== '')
        })
      });

      if (response.ok) {
        setSuccess('Unit Established Successfully! ✅');
        setShowCreateModal(false);
        setNewTeam({ teamName: '', leadId: '', memberIds: ['', '', '', ''] });
        
        // Refresh teams
        const teamRes = await fetch(API_ENDPOINTS.TEAMS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (teamRes.ok) setTeamsData(await teamRes.json());
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(`Establishment Failed: ${errData.error || 'Request rejected'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

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

  const getUnassignedUsers = () => {
    const assignedIds = new Set();
    const assignedNames = new Set();
    
    teamsData.forEach(t => {
      // Collect Leads
      if (t.lead_id) assignedIds.add(String(t.lead_id));
      if (t.lead) assignedNames.add(t.lead.toLowerCase().trim());
      
      // Collect Members
      (t.membersList || []).forEach(m => {
        const mId = m.id || m.userid || m.employee_id || m.employeeId;
        if (mId) assignedIds.add(String(mId));
        if (m.name) assignedNames.add(m.name.toLowerCase().trim());
      });
    });

    return usersList.filter(u => {
      const uId = String(u.id || u.userId || u.employee_id || '');
      const uName = (u.name || '').toLowerCase().trim();
      
      const isAssigned = (uId && assignedIds.has(uId)) || (uName && assignedNames.has(uName));
      
      if (isAssigned) return false;
      
      // Apply search filter if active
      if (talentSearch) {
        const search = talentSearch.toLowerCase().trim();
        return uName.includes(search) || uId.includes(search);
      }
      
      return true;
    });
  };

  const unassignedPool = getUnassignedUsers();

  const handleDropToPool = (e) => {
    e.preventDefault();
    const dragDataJSON = e.dataTransfer.getData('application/json');
    if (!dragDataJSON) return;
    
    const dragData = JSON.parse(dragDataJSON);
    if (dragData.type !== 'member' && dragData.type !== 'lead') return; 
    
    setTeamsData(prev => {
      const newTeams = [...prev];
      const sourceTeamIdx = newTeams.findIndex(t => t.id === dragData.teamId);
      if (sourceTeamIdx === -1) return prev;
      const sourceTeam = {...newTeams[sourceTeamIdx]};
      
      if (dragData.type === 'member') {
        sourceTeam.membersList = (sourceTeam.membersList || []).filter((_, i) => i !== dragData.memberIdx);
        sourceTeam.members = sourceTeam.membersList.length;
      } else if (dragData.type === 'lead') {
        sourceTeam.lead = 'Manager'; // Default label
        sourceTeam.leadRole = 'Team Manager';
        sourceTeam.lead_id = null;
      }
      
      newTeams[sourceTeamIdx] = sourceTeam;
      return newTeams;
    });
  };

  const handleDropFromPool = (e, targetTeamId) => {
    e.preventDefault();
    const dragDataJSON = e.dataTransfer.getData('application/json');
    if (!dragDataJSON) return;
    
    const dragData = JSON.parse(dragDataJSON);
    if (dragData.type !== 'unassigned') {
      handleDrop(e, targetTeamId);
      return;
    }
    
    setTeamsData(prev => {
      const newTeams = [...prev];
      const targetTeamIdx = newTeams.findIndex(t => t.id === targetTeamId);
      if (targetTeamIdx === -1) return prev;
      const targetTeam = {...newTeams[targetTeamIdx]};
      
      const user = unassignedPool.find(u => String(u.id) === String(dragData.userId));
      if (user) {
        if (dragData.isTargetingLead) {
          targetTeam.lead = user.name;
          targetTeam.lead_id = user.id;
          targetTeam.leadRole = user.role || user.designation || 'Team Leader';
        } else {
          targetTeam.membersList = [...(targetTeam.membersList || []), {
            id: user.id,
            name: user.name,
            role: user.role || user.designation || 'Member'
          }];
          targetTeam.members = targetTeam.membersList.length;
        }
      }
      
      newTeams[targetTeamIdx] = targetTeam;
      return newTeams;
    });
  };

  const handleDragStart = (e, dragData) => {
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
  };

  const handleDrop = (e, targetTeamId) => {
    e.preventDefault();
    const dragDataJSON = e.dataTransfer.getData('application/json');
    if (!dragDataJSON) return;
    
    const dragData = JSON.parse(dragDataJSON);
    if (dragData.teamId === targetTeamId) return; 
    
    setTeamsData(prev => {
      const newTeams = [...prev];
      const sourceTeamIdx = newTeams.findIndex(t => t.id === dragData.teamId);
      const targetTeamIdx = newTeams.findIndex(t => t.id === targetTeamId);
      
      if (sourceTeamIdx === -1 || targetTeamIdx === -1) return prev;
      
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
        setSuccess('Hierarchy Synced! Both Users and Individual Team tables updated successfully. 🚀');
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
      
      <main className="dashboard-content" style={{paddingBottom: '100px', paddingLeft: winWidth < 768 ? '16px' : '26px', paddingRight: winWidth < 768 ? '16px' : '26px', paddingTop: winWidth < 768 ? '100px' : '120px', width: '100%', boxSizing: 'border-box', margin: '0' }}>
        <header className="section-header" style={{ marginBottom: '20px' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <button 
              onClick={() => navigate(-1)} 
              style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div>
              <h1 style={{fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0}}>Total Teams</h1>
              <p style={{color: '#64748b', margin: '2px 0 0 0'}}>Centralized control for all {teamsData.length} active project teams</p>
            </div>
          </div>
          <div className="team-header-actions" style={{ display: 'flex', gap: '12px' }}>
            {!isAnyFilter && (
              <button 
                onClick={() => isEditingAlignment ? handleSaveAlignment() : setIsEditingAlignment(true)} 
                className="btn-primary" 
                style={{
                  backgroundColor: isEditingAlignment ? '#eff6ff' : 'white', 
                  color: isEditingAlignment ? '#3863a8' : '#3863a8', 
                  border: isEditingAlignment ? '2px solid #3863a8' : '1px solid #cbd5e1', 
                  transition: '0.2s background',
                  fontWeight: '800',
                  padding: '10px 20px',
                  borderRadius: '12px'
                }} 
              >
                {saving ? 'Saving...' : (isEditingAlignment ? 'Save Allignment' : 'Edit Team Allignment')}
              </button>
            )}
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary" 
              style={{backgroundColor: '#e0e7ff', color: '#312e81', border: '1px solid #c7d2fe', cursor: 'pointer', padding: '10px 20px', borderRadius: '12px', fontWeight: '800'}}
            >
              + Create New Team
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: winWidth < 1200 ? 'wrap' : 'nowrap' }}>
          <section className="dashboard-section animate-fade-in" style={{ flex: 1, minWidth: winWidth < 768 ? '100%' : '0' }}>
            <div className="team-grid" style={{
              display: 'grid',
              gridTemplateColumns: winWidth < 768 ? '1fr' : (winWidth < 1400 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), 
              gap: '24px'
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
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: team.members > 0 ? (winWidth < 480 ? '260px' : '420px') : (winWidth < 480 ? '200px' : '300px'),
                  justifyContent: 'flex-start',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={e => {
                  if (!isEditingAlignment) {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isEditingAlignment) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }
                }}
                onClick={() => !isEditingAlignment && navigate(`/teams/${encodeURIComponent(team.id)}`)}
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
                    handleDropFromPool(e, team.id);
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
                    <div 
                      style={{background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0'}}
                      onDragOver={(e) => {
                        if (isEditingAlignment) {
                          e.preventDefault();
                          e.currentTarget.style.backgroundColor = '#eff6ff';
                          e.currentTarget.style.borderColor = '#3863a8';
                        }
                      }}
                      onDragLeave={(e) => {
                        if (isEditingAlignment) {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }
                      }}
                      onDrop={(e) => {
                        if (isEditingAlignment) {
                          e.preventDefault();
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          
                          const dragDataJSON = e.dataTransfer.getData('application/json');
                          if (dragDataJSON) {
                            const dragData = JSON.parse(dragDataJSON);
                            dragData.isTargetingLead = true;
                            
                            if (dragData.type === 'unassigned') {
                              handleDropFromPool({ ...e, dataTransfer: { getData: () => JSON.stringify(dragData) } }, team.id);
                            } else if (dragData.type === 'member' || dragData.type === 'lead') {
                              // Handle member -> lead promotion or lead swap
                              setTeamsData(prev => {
                                const newTeams = [...prev];
                                const sourceIdx = newTeams.findIndex(t => t.id === dragData.teamId);
                                const targetIdx = newTeams.findIndex(t => t.id === team.id);
                                if (sourceIdx === -1 || targetIdx === -1) return prev;
                                
                                const source = {...newTeams[sourceIdx]};
                                const target = {...newTeams[targetIdx]};
                                
                                if (dragData.type === 'member') {
                                  const member = (source.membersList || [])[dragData.memberIdx];
                                  source.membersList = (source.membersList || []).filter((_, i) => i !== dragData.memberIdx);
                                  source.members = source.membersList.length;
                                  
                                  const oldLead = target.lead;
                                  const oldLeadRole = target.leadRole;
                                  const oldLeadId = target.lead_id;
                                  
                                  target.lead = member.name;
                                  target.lead_id = member.id;
                                  target.leadRole = member.role;
                                  
                                  // Push old lead to members if it wasn't just "Manager" placeholder
                                  if (oldLead && oldLead !== 'Manager') {
                                    target.membersList = [...(target.membersList || []), { id: oldLeadId, name: oldLead, role: oldLeadRole }];
                                    target.members = target.membersList.length;
                                  }
                                } else {
                                  // Lead swap
                                  const tempLead = source.lead;
                                  const tempRole = source.leadRole;
                                  const tempId = source.lead_id;
                                  
                                  source.lead = target.lead;
                                  source.leadRole = target.leadRole;
                                  source.lead_id = target.lead_id;
                                  
                                  target.lead = tempLead;
                                  target.leadRole = tempRole;
                                  target.lead_id = tempId;
                                }
                                
                                newTeams[sourceIdx] = source;
                                newTeams[targetIdx] = target;
                                return newTeams;
                              });
                            }
                          }
                        }
                      }}
                    >
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
                        .map((m, mapIdx) => {
                          // CRITICAL FIX: Find the ACTUAL index in the original membersList to avoid offset bugs caused by lead-filtering
                          const actualIdx = (team.membersList || []).findIndex(orig => orig === m);
                          
                          return (
                            <div 
                              key={m.id || m.userid || mapIdx} 
                              draggable={isEditingAlignment && !isAnyFilter}
                              onDragStart={(e) => handleDragStart(e, {type: 'member', memberIdx: actualIdx, teamId: team.id})}
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
                          );
                        })}
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
                      <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: winWidth < 480 ? '8px' : '12px', marginBottom: winWidth < 480 ? '16px' : '20px'}}>
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
                      </div>
                    )}

                    <div style={{marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: winWidth < 480 ? '10px' : '15px', borderTop: '1px solid #f8fafc'}}>
                      <span style={{color: '#3863a8', fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s transform'}} onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                         <Icons.Arrow />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* UNASSIGNED TALENT POOL SIDEBAR */}
        {isEditingAlignment && (
          <aside style={{
            width: winWidth < 1200 ? '100%' : '320px',
            position: winWidth < 1200 ? 'static' : 'sticky',
            top: '120px',
            background: 'white',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
            border: '1.5px solid #f1f5f9',
            maxHeight: winWidth < 1200 ? 'auto' : 'calc(100vh - 160px)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.5s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Talent Pool</h2>
              <div style={{ background: '#3863a8', color: 'white', fontSize: '11px', fontWeight: '900', padding: '4px 10px', borderRadius: '50px' }}>
                {unassignedPool.length} FREE
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '15px', lineHeight: '1.5' }}>
              Drag people from here into teams, or drop team members here to unassign them.
            </p>

            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <input 
                type="text"
                placeholder="Search by name or ID..."
                value={talentSearch}
                onChange={(e) => setTalentSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 35px',
                  borderRadius: '12px',
                  border: '1.5px solid #eef2f6',
                  background: '#f8fafc',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.5 }}>🔍</span>
              {talentSearch && (
                <button 
                  onClick={() => setTalentSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                >✕</button>
              )}
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropToPool}
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                padding: '10px',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '2px dashed #e2e8f0',
                minHeight: '200px'
              }}
            >
              {unassignedPool.length > 0 ? unassignedPool.map((u, idx) => (
                <div 
                  key={u.id || idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, { type: 'unassigned', userId: u.id })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    cursor: 'grab',
                    border: '1px solid #f1f5f9'
                  }}
                  className="pulse-edit-mode wiggle-animation"
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px',
                    background: '#f1f5f9', color: '#3863a8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '900'
                  }}>{u.name?.charAt(0) || '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{u.role || u.designation || 'Member'}</div>
                  </div>
                  <Icons.DragHandle />
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>✨</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>All clear!</div>
                  <div style={{ fontSize: '11px' }}>Everyone is assigned.</div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
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
            border: '3px solid #cbd5e1', position: 'relative'
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>UNIT MISSION NAME</label>
                  <input 
                    type="text" placeholder="e.g. Backend Sigma Hub"
                    value={newTeam.teamName}
                    onChange={(e) => setNewTeam({...newTeam, teamName: e.target.value})}
                    style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '700', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '50px', border: '1.5px solid #eef2f6', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
              >Cancel</button>
              <button 
                onClick={handleCreateTeam}
                disabled={saving}
                style={{ 
                  flex: 2, padding: '12px', borderRadius: '50px', border: 'none', 
                  background: saving ? '#94a3b8' : '#3863a8', 
                  color: 'white', fontWeight: '800', fontSize: '13px', 
                  cursor: saving ? 'not-allowed' : 'pointer', 
                  boxShadow: '0 8px 12px rgba(56,99,168,0.2)' 
                }}
              >
                {saving ? 'Establishing...' : 'Confirm Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
