import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { useThread } from '../../context/ThreadContext';
import { API_ENDPOINTS } from '../../config';
import TaskNotification from './TaskNotification';
import './PMDashboard.css';

// Mock icons as SVG components or simple strings for now
const Icons = {
  Teams: () => <span>👥</span>,
  Employees: () => <span>👤</span>,
  Tasks: () => <span>✅</span>,
  Fun: () => <span>🧩</span>,
  Compliance: () => <span>🛡️</span>,
  Alert: () => <span>🔔</span>,
  Asset: () => <span>📦</span>,
  Add: () => <span>+</span>,
};

export default function PMDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { threads } = useThread();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // New Team Form State
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

  // Task Assignment States
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadTask, setLeadTask] = useState({ assigneeId: '', task_name: '', description: '', deadline: '', attachment: null });
  const [employeeTask, setEmployeeTask] = useState({ assigneeId: '', task_name: '', description: '', deadline: '', attachment: null });
  const [usersList, setUsersList] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showTaskModal, setShowTaskModal] = useState(false); // We can remove this later, but for now just hide the modal block.

  const [newJoineesCount, setNewJoineesCount] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, leave: 0, late: 0 });
  const [teamUpdates, setTeamUpdates] = useState([]);
  const [projectSprints, setProjectSprints] = useState([]);
  const [quizStats, setQuizStats] = useState({ count: 0, topScorer: 'N/A', topScore: 0 });

  // Fetch Holidays, Tasks & Teams on Load
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.token) return;

      try {
        // Fetch Holidays
        const hRes = await fetch(API_ENDPOINTS.HOLIDAYS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        }).catch(() => null);
        if (hRes && hRes.ok) setHolidays(await hRes.json());

        // Fetch Total Users from 'user' table (REQUIRED for Name Resolution)
        const userRes = await fetch(API_ENDPOINTS.USERS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const currentUsers = userRes.ok ? await userRes.json() : [];
        if (userRes.ok) {
          setUsersList(currentUsers);
          setEmployeesCount(currentUsers.length);
        }

        // Redundancy-Safe Task Fetching: Combine multiple sources with strict 'id' deduplication
        const [rawAssigned, rawManager] = await Promise.all([
          fetch(API_ENDPOINTS.ASSIGNED_TASKS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : []),
          fetch(API_ENDPOINTS.MASTER_TASKS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : [])
        ]);

        const combinedTasks = [...(Array.isArray(rawAssigned) ? rawAssigned : []), ...(Array.isArray(rawManager) ? rawManager : [])];

        // 1. OPTIMIZED RESOLUTION: Pre-index users for lightning-fast O(1) lookup
        const userLookup = {};
        (Array.isArray(currentUsers) ? currentUsers : []).forEach(u => {
          const uid = String(u.id || u.empId || '').trim();
          if (uid) userLookup[uid] = u.name;
        });

        const uniqueTasksMap = new Map();
        combinedTasks.forEach((task, idx) => {
          // STRICT ID LOCK: Only use the database 'id' column
          const tid = task.id || `dash-${idx}`;
          if (!uniqueTasksMap.has(tid)) {
            // CLEANUP: Deduplicate doubled titles
            if (task.title && String(task.title).includes(',')) {
              const parts = String(task.title).split(',').map(p => p.trim());
              if (parts[0] === parts[1]) task.title = parts[0];
            }

            // RESOLVE: Use the optimized lookup map for instant name resolution
            const targetUid = String(task.assignee_id || '').trim();
            task.assignee_name = userLookup[targetUid] || task.assignee_name || task.member_name || 'Unassigned';

            uniqueTasksMap.set(tid, task);
          } else {
            const existing = uniqueTasksMap.get(tid);
            if (!existing.attachment_data && task.attachment_data) {
              uniqueTasksMap.set(tid, task);
            }
          }
        });

        const deduplicated = Array.from(uniqueTasksMap.values()).filter(t => t !== null);
        setRecentTasks(deduplicated);

        // Fetch Total Teams
        const teamRes = await fetch(API_ENDPOINTS.TEAMS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (teamRes.ok) {
          setTeams(await teamRes.json());
        }

        // Fetch Team Activity (Task Updates)
        const updatesRes = await fetch(API_ENDPOINTS.TASKS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (updatesRes.ok) {
          setTeamUpdates(await updatesRes.json());
        }

        // Fetch Project Sprints
        const sprintRes = await fetch(API_ENDPOINTS.PROJECT_SPRINTS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (sprintRes.ok) {
          setProjectSprints(await sprintRes.json());
        }

        // Fetch New Joinees Count
        const joineeRes = await fetch(API_ENDPOINTS.NEW_JOINEES, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (joineeRes.ok) {
          const joineeData = await joineeRes.json();
          setNewJoineesCount(joineeData.length);
        }

        // Fetch Leave Requests & All Metrics
        const leavesRes = await fetch(API_ENDPOINTS.LEAVES_GET, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (leavesRes.ok) {
          const lData = await leavesRes.json();
          const lList = Array.isArray(lData) ? lData : (lData?.data || lData?.all || lData?.leaves || lData?.requests || []);
          setLeaveRequests(Array.isArray(lList) ? lList : []);

          // Derive metrics safely - using includes to handle 'PENDING,PENDING' or varied formats
          const onLeaveCount = Array.isArray(lList) ? lList.filter(r => String(r?.status || '').toUpperCase().includes('APPROVED')).length : 0;
          setAttendanceStats(prev => ({ ...prev, leave: onLeaveCount }));
        }

        // Fetch Real-time Biometric Attendance Logs for Daily Metrics
        const attLogsRes = await fetch(API_ENDPOINTS.ATTENDANCE_LOGS_GET, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (attLogsRes.ok) {
          const logData = await attLogsRes.json();
          const masterLogs = logData.data || logData.attendance || logData.logs || logData;
          if (Array.isArray(masterLogs)) {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayLogs = masterLogs.filter(l => {
              const lDate = (l?.punch_date || l?.PunchDate || l?.date || '').split('T')[0];
              return lDate === todayStr;
            });
            const uniquePresentToday = new Set(todayLogs.map(l => l?.user_id || l?.Empcode || l?.EmpID)).size;
            setAttendanceStats(prev => ({ ...prev, present: uniquePresentToday }));
          }
        }

        // Fetch Quiz Data
        try {
          const [qRes, qLeaderRes] = await Promise.all([
            fetch(`${BASE_URL}/api/fun-quizzes?employee_id=${user?.id || user?.userId || 0}`, {
              headers: { 'Authorization': `Bearer ${user.token}` }
            }),
            fetch(`${BASE_URL}/api/fun-quizzes/leaderboard?employee_id=${user?.id || user?.userId || 0}`, {
              headers: { 'Authorization': `Bearer ${user.token}` }
            })
          ]);

          let qCount = 0;
          if (qRes.ok) {
            const qData = await qRes.json();
            const list = Array.isArray(qData) ? qData : (qData.data || []);
            qCount = list.length;
          }

          let topScorer = 'N/A';
          let topScore = 0;
          if (qLeaderRes.ok) {
            const lData = await qLeaderRes.json();
            const list = Array.isArray(lData) ? lData : (lData.data || []);
            if (list.length > 0) {
              const sorted = list.sort((a, b) => (b.total_score || b.score || 0) - (a.total_score || a.score || 0));
              topScorer = sorted[0].employee_name || sorted[0].name || 'User';
              topScore = sorted[0].total_score || sorted[0].score || 0;
            }
          }
          setQuizStats({ count: qCount, topScorer, topScore });
        } catch (e) {
          console.log('Quiz data sync error');
        }

      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      }
    };
    fetchDashboardData();
  }, [user]);

  // Dynamically calculate metrics from live data
  const dynamicMetrics = [
    { label: 'Total Teams', value: teams?.length || 'View', icon: <Icons.Teams />, color: '#6366f1', trend: 'Live', trendUp: true, path: '/teams' },
    { label: 'Total Employees', value: employeesCount || 'View', icon: <Icons.Employees />, color: '#8b5cf6', trend: 'Live', trendUp: true, path: '/employees' },
    { label: 'Personal Information', value: 'Manage', icon: <Icons.Employees />, color: '#315A9E', trend: 'Active', trendUp: true, path: '/personal-info' },
    {
      label: 'Fun and Quiz',
      value: quizStats.topScorer !== 'N/A' ? quizStats.topScorer : (quizStats.count > 0 ? `${quizStats.count} Quizzes` : 'Play Now'),
      icon: <Icons.Fun />,
      color: '#ec4899',
      trend: quizStats.topScorer !== 'N/A' ? 'Top Scorer' : 'Live',
      trendUp: true,
      path: '/quiz',
      subText: quizStats.topScorer !== 'N/A' ? `${quizStats.topScore} pts • ${quizStats.count} Qs` : (quizStats.count > 0 ? 'Be the first!' : '')
    },
    { label: 'Assets Management', value: 'Manage', icon: <span>📦</span>, color: '#f59e0b', trend: 'New', trendUp: true, path: '/assets' },
    { label: 'New Joinee', value: newJoineesCount || 'View', icon: <span>✨</span>, color: '#0ea5e9', trend: 'This Month', trendUp: true, path: '/new-joinees' },
  ];

  // Helper for PDF encoding
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleAssignTask = async (taskData) => {
    if (!taskData.assigneeId) {
      setToastMessage('Selection Required: Please choose an assignee! ⚠️');
      setToastType('error');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      let attachment_data = null;
      let attachment_name = null;

      if (taskData.attachment) {
        attachment_data = await fileToBase64(taskData.attachment);
        attachment_name = taskData.attachment.name;
      }

      const payload = {
        assigner_id: parseInt(user?.id || user?.userId || '0'),
        assignerId: parseInt(user?.id || user?.userId || '0'),
        assignee_id: parseInt(taskData.assigneeId),
        assigneeId: parseInt(taskData.assigneeId),
        owner_id: parseInt(user?.id || user?.userId || '0'),
        task_name: taskData.task_name,
        description: taskData.description || '',
        deadline: taskData.deadline,
        status: 'PENDING',
        priority: 'NORMAL',
        attachment_data,
        attachment_name
      };

      const response = await fetch(API_ENDPOINTS.ASSIGN_TASK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });

      const rawText = await response.text();
      let result = {};
      try {
        result = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Server returned non-JSON response.`);
      }

      if (response.ok) {
        setToastMessage('Task Successfully Synchronized! ✅');
        setToastType('success');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);

        setShowLeadModal(false);
        setShowEmployeeModal(false);
        setLeadTask({ assigneeId: '', task_name: '', description: '', deadline: '', attachment: null });
        setEmployeeTask({ assigneeId: '', task_name: '', description: '', deadline: '', attachment: null });

        // Refresh tasks
        const [aTasks, mTasks] = await Promise.all([
          fetch(API_ENDPOINTS.ASSIGNED_TASKS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : []),
          fetch(API_ENDPOINTS.MASTER_TASKS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : [])
        ]);

        const combined = [...(Array.isArray(aTasks) ? aTasks : []), ...(Array.isArray(mTasks) ? mTasks : [])];
        const uniqueMap = new Map();
        combined.forEach((t, i) => {
          const tid = t.task_id || t.id || `sync-${i}`;
          if (!uniqueMap.has(tid)) uniqueMap.set(tid, t);
        });
        setRecentTasks(Array.from(uniqueMap.values()));
      } else {
        setToastMessage(`Sync Failed: ${result.error || 'Request rejected'}`);
        setToastType('error');
        setShowSuccessToast(true);
      }
    } catch (err) {
      setToastMessage(`Error: ${err.message}`);
      setToastType('error');
      setShowSuccessToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pm-dashboard-container">
      <AppHeader />

      <main className="dashboard-content">
        <header className="section-header" style={{ marginBottom: winWidth < 768 ? '20px' : '40px', gap: winWidth < 768 ? '15px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '22px' : '24px', fontWeight: '800', color: '#1e293b' }}>Titan Dashboard</h1>
              <p style={{ color: '#64748b', fontSize: winWidth < 768 ? '12px' : '14px' }}>Strength and scale • {teams.length} Active Teams</p>
            </div>
          </div>

          <div className="quick-actions" style={{ position: 'relative', display: 'flex', gap: '8px', width: winWidth < 1024 ? '100%' : 'auto', flexDirection: winWidth < 600 ? 'column' : 'row' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <button
                className="btn-primary"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '8px 16px', whiteSpace: 'nowrap' }}
              >
                <Icons.Add /> {winWidth < 400 ? 'Task' : 'Assign Task'}
              </button>

              {showAssignDropdown && (
                <div
                  className="animate-slide-up"
                  style={{
                    position: 'absolute', top: '50px', left: winWidth < 600 ? '0' : 'auto', right: 0, width: winWidth < 480 ? '100%' : '200px', background: 'white',
                    border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
                    zIndex: 2100, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px'
                  }}
                >
                  <button className="add-menu-item" onClick={() => { setShowLeadModal(true); setShowAssignDropdown(false); }}>
                    <span style={{ fontSize: '16px' }}>👑</span> To Team Lead
                  </button>
                  <button className="add-menu-item" onClick={() => { setShowEmployeeModal(true); setShowAssignDropdown(false); }}>
                    <span style={{ fontSize: '16px' }}>👤</span> To Employee
                  </button>
                </div>
              )}
            </div>
            <button className="btn-primary" onClick={() => setShowCreateTeam(true)} style={{ flex: 1, backgroundColor: '#e0e7ff', color: '#312e81', border: '1px solid #c7d2fe', padding: '8px 16px', whiteSpace: 'nowrap' }}>Create Team</button>
            <button className="btn-primary" onClick={() => navigate('/reports')} style={{ flex: 1, backgroundColor: 'white', color: '#3863a8', border: '1.5px solid #3863a8', padding: '8px 16px', whiteSpace: 'nowrap' }}>Reports</button>
          </div>
        </header>

        <section className="metrics-grid-container" style={{ position: 'relative', marginBottom: winWidth < 768 ? '20px' : '40px' }}>
          {winWidth < 768 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 5px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Insights</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentMetricIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentMetricIndex === 0}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0',
                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', opacity: currentMetricIndex === 0 ? 0.3 : 1
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => setCurrentMetricIndex(prev => Math.min(dynamicMetrics.length - 1, prev + 1))}
                  disabled={currentMetricIndex === dynamicMetrics.length - 1}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0',
                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', opacity: currentMetricIndex === dynamicMetrics.length - 1 ? 0.3 : 1
                  }}
                >
                  →
                </button>
              </div>
            </div>
          )}

          <div style={{
            display: winWidth < 768 ? 'flex' : 'grid',
            gridTemplateColumns: winWidth < 768 ? 'none' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: winWidth < 768 ? '0' : '20px',
            overflow: winWidth < 768 ? 'hidden' : 'visible',
            width: '100%',
            padding: winWidth < 768 ? '10px 15px' : '0' // Added horizontal padding
          }}>
            {winWidth < 768 ? (
              <div style={{
                display: 'flex',
                gap: '15px',
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: `translateX(calc(-${currentMetricIndex} * (100% + 15px)))`,
                width: '100%',
                touchAction: 'pan-y'
              }}>
                {dynamicMetrics.map((m, i) => (
                  <div
                    key={i}
                    className="metric-card animate-fade-in"
                    style={{
                      flex: '0 0 100%',
                      boxSizing: 'border-box',
                      cursor: m.path ? 'pointer' : 'default',
                      margin: '0',
                      padding: '24px',
                      borderRadius: '24px',
                      background: 'white',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      minHeight: '150px'
                    }}
                    onClick={() => m.path && navigate(m.path)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="icon-wrapper" style={{
                        background: `${m.color}15`, color: m.color, width: '48px', height: '48px',
                        borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                      }}>
                        {m.icon}
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: '800', color: m.trendUp ? '#10b981' : '#f59e0b',
                        backgroundColor: m.trendUp ? '#ecfdf5' : '#fffbeb', padding: '4px 10px', borderRadius: '8px'
                      }}>{m.trend}</span>
                    </div>
                    <div>
                      <div className="label" style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>{m.label}</div>
                      <div className="value" style={{
                        fontSize: (typeof m.value === 'string' && isNaN(m.value)) ? '24px' : '32px',
                        fontWeight: '950',
                        color: '#1e293b',
                        lineHeight: 1
                      }}>{m.value}</div>
                      {m.subText && (
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#ec4899', marginTop: '4px' }}>{m.subText}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              dynamicMetrics.map((m, i) => (
                <div key={i} className="metric-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s`, cursor: m.path ? 'pointer' : 'default' }} onClick={() => m.path && navigate(m.path)}>
                  <div className="icon-wrapper" style={{ background: `${m.color}20`, color: m.color }}>{m.icon}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="label" style={{ fontSize: '14px' }}>{m.label}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', color: m.trendUp ? '#10b981' : '#f59e0b', backgroundColor: m.trendUp ? '#d1fae5' : '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>{m.trend}</span>
                  </div>
                  <span className="value" style={{ fontSize: (typeof m.value === 'string' && isNaN(m.value)) ? '26px' : '38px' }}>{m.value}</span>
                  {m.subText && (
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#ec4899', marginTop: '2px' }}>{m.subText}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <div className="main-dashboard-grid" style={{ gap: winWidth < 768 ? '20px' : '30px' }}>
          {/* Column 1: Team Overview (Spans 2 columns on Desktop) */}
          <section className="dashboard-section team-overview-section animate-fade-in" style={{ animationDelay: '0.4s', marginBottom: '0', position: 'relative' }}>
            <div className="section-header" style={{ marginBottom: winWidth < 768 ? '15px' : '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 className="section-title" style={{ fontSize: winWidth < 768 ? '18px' : '22px', margin: 0 }}>Team Overview</h2>
                <button style={{ background: 'none', border: 'none', color: '#3863a8', fontWeight: '800', cursor: 'pointer', fontSize: '13px', textAlign: 'left', padding: '4px 0' }} onClick={() => navigate('/teams')}>Manage</button>
              </div>

              {winWidth < 768 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentTeamIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentTeamIndex === 0}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0',
                      background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', opacity: currentTeamIndex === 0 ? 0.3 : 1
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentTeamIndex(prev => Math.min(teams.length - 1, prev + 1))}
                    disabled={currentTeamIndex === teams.length - 1}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e2e8f0',
                      background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', opacity: currentTeamIndex === teams.length - 1 ? 0.3 : 1
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            <div style={{
              overflow: winWidth < 768 ? 'hidden' : 'visible',
              width: '100%',
              padding: winWidth < 768 ? '10px 15px 20px 15px' : '0' // Added 15px horizontal padding
            }}>
              {winWidth < 768 ? (
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: `translateX(calc(-${currentTeamIndex} * (100% + 20px)))`,
                  width: '100%',
                  touchAction: 'pan-y' // Prevent horizontal scroll of the whole page
                }}>
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="team-card"
                      onClick={() => navigate(`/teams/${team.id}`)}
                      style={{
                        flex: '0 0 100%',
                        boxSizing: 'border-box',
                        borderLeft: `6px solid ${team.risk === 'high' ? '#ef4444' : team.risk === 'medium' ? '#f59e0b' : '#3863a8'}`,
                        cursor: 'pointer',
                        padding: '24px',
                        background: 'white',
                        borderRadius: '24px',
                        margin: '0',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                        <h3 style={{ fontWeight: '900', fontSize: '18px', margin: 0, color: '#1e293b' }}>{team.name}</h3>
                        <div style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '10px' }}>
                          <span style={{ fontSize: '13px', color: '#3863a8', fontWeight: '900' }}>{team.progress}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>Lead: <span style={{ color: '#1e293b', fontWeight: '700' }}>{team.lead}</span></div>

                      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3863a8' }}></span>
                          <div style={{ fontSize: '12px', color: '#64748b' }}><span style={{ fontWeight: '900', color: '#3863a8' }}>{team.members}</span> Members</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                          <div style={{ fontSize: '12px', color: '#64748b' }}><span style={{ fontWeight: '900', color: '#ef4444' }}>{team.pending}</span> Pending</div>
                        </div>
                      </div>

                      <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{ width: `${team.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3863a8, #1e40af)', borderRadius: '20px', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="team-grid">
                  {teams.map(team => (
                    <div key={team.id} className="team-card" onClick={() => navigate(`/teams/${team.id}`)} style={{ borderLeft: `6px solid ${team.risk === 'high' ? '#ef4444' : team.risk === 'medium' ? '#f59e0b' : '#3863a8'}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <h3 style={{ fontWeight: '900', fontSize: '14px', margin: 0 }}>{team.name}</h3>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '900' }}>{team.progress}%</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Lead: <span style={{ color: '#1e293b', fontWeight: '700' }}>{team.lead}</span></div>

                      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}><span style={{ fontWeight: '900', color: '#3863a8' }}>{team.members}</span> Mbrs</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}><span style={{ fontWeight: '900', color: '#ef4444' }}>{team.pending}</span> Pend</div>
                      </div>

                      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${team.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3863a8, #1e40af)', borderRadius: '10px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Column 2: Task Hub */}
          <section className="dashboard-section animate-fade-in" style={{ animationDelay: '0.6s', cursor: 'pointer', background: 'white' }} onClick={() => navigate('/tasks')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#3163aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)' }}>📅</div>
              <h2 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Task Command</h2>
            </div>

            <div style={{ marginBottom: '20px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Unit Sprints</span>
                <span style={{ fontSize: '10px', fontWeight: '900', color: '#3863a8', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '100px' }}>{recentTasks.length} Active</span>
              </div>
              {recentTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentTasks.slice(0, 6).map((task, i) => (
                    <div key={i} style={{ padding: '12px 18px', background: '#f8fafc', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', transition: '0.2s' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155', maxWidth: winWidth < 480 ? '120px' : '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title || task.task_name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>To: {task.assignee_name || 'Staff'}</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: '#3863a8' }}>{task.status === 'COMPLETED' ? 'DONE' : 'LIVE'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '24px', border: '1.5px dashed #e2e8f0' }}>Unit Sprints Neutralized</div>
              )}
            </div>
            <button className="animate-fade-in" style={{ width: '100%', padding: '14px', background: '#1e293b', borderRadius: '16px', color: 'white', fontWeight: '900', fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>Access Ops Hub <span>→</span></button>
          </section>

          {/* Column 3: Attendance Analytics */}
          <section className="dashboard-section animate-fade-in" style={{ animationDelay: '0.7s', background: 'white', cursor: 'pointer' }} onClick={() => navigate('/attendance')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1)' }}>🛡️</div>
              <h2 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Attendance Sync</h2>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
              <div style={{ flex: 1, padding: '18px', background: '#f0fdf4', borderRadius: '20px', border: '1.5px solid #dcfce7', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#059669', marginBottom: '8px', textTransform: 'uppercase' }}>Available</div>
                <div style={{ fontSize: '28px', fontWeight: '950', color: '#064e3b' }}>{attendanceStats.present || 0}</div>
              </div>
              <div style={{ flex: 1, padding: '18px', background: '#fff7ed', borderRadius: '20px', border: '1.5px solid #ffedd5', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#ea580c', marginBottom: '8px', textTransform: 'uppercase' }}>Offsite</div>
                <div style={{ fontSize: '28px', fontWeight: '950', color: '#7c2d12' }}>{attendanceStats.leave || 0}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px', flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Live Leave Submissions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leaveRequests.filter(r => String(r.status || '').toUpperCase().includes('PENDING')).slice(0, 4).length > 0 ? (
                  leaveRequests.filter(r => String(r.status || '').toUpperCase().includes('PENDING')).slice(0, 4).map((req, rid) => (
                    <div key={rid} onClick={(e) => { e.stopPropagation(); navigate(`/attendance/leave/${req.id}`); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', border: '1px solid #f1f5f9', borderRadius: '18px', background: 'white', transition: '0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>⏳</div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{req.employee_name || req.name || 'Unit Member'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{req.leave_type || 'Req'} • {req.total_days || 1}d</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#cbd5e1' }}>›</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', border: '1.5px dashed #f1f5f9', borderRadius: '24px' }}>Zero Pending Requests</div>
                )}
              </div>
            </div>
            <button style={{ width: '100%', padding: '14px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '16px', color: '#3863a8', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}>Manage Workforce</button>
          </section>
        </div>
      </main>
      <AppFooter onCreateTeam={() => setShowCreateTeam(true)} />

      {/* CREATE TEAM MODAL */}
      {showCreateTeam && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="animate-slide-up" style={{ backgroundColor: 'white', width: '100%', maxWidth: '480px', borderRadius: '40px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', position: 'relative' }}>
            <button onClick={() => setShowCreateTeam(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#eff6ff', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 8px' }}>👥</div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>Establish Management Unit</h2>
            </div>
            <div style={{ paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>UNIT MISSION NAME</label>
                  <input type="text" placeholder="e.g. Backend Sigma Hub" value={newTeam.teamName} onChange={(e) => setNewTeam({ ...newTeam, teamName: e.target.value })} style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '700', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>ASSIGN UNIT LEAD</label>
                  <select value={newTeam.leadId} onChange={(e) => setNewTeam({ ...newTeam, leadId: e.target.value })} style={{ width: '100%', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '700', fontSize: '13px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="">Select Leadership...</option>
                    {usersList.filter(u => String(u?.role || '').toUpperCase().includes('LEAD') || String(u?.role || '').toUpperCase().includes('MANAGER')).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', opacity: 0.7 }}>UNIT MEMBERS (4-10 REQUIRED)</label>
                  {newTeam.memberIds.map((memberId, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="text" placeholder={`Enter Member Name ${index + 1}...`} value={memberId} onChange={(e) => updateMember(index, e.target.value)} style={{ flex: 1, width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontWeight: '600', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                      {newTeam.memberIds.length > 4 && (
                        <button onClick={() => removeMemberRow(index)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>✕</button>
                      )}
                    </div>
                  ))}
                  {newTeam.memberIds.length < 10 && (
                    <button onClick={addMemberRow} style={{ padding: '8px', borderRadius: '10px', border: '1.5px dashed #3863a8', background: 'transparent', color: '#3863a8', fontWeight: '700', cursor: 'pointer', fontSize: '11px', marginTop: '2px' }}>+ Add Member</button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCreateTeam(false)} style={{ flex: 1, padding: '12px', borderRadius: '50px', border: '1.5px solid #eef2f6', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { alert('Unit Established! ✅'); setShowCreateTeam(false); }} style={{ flex: 2, padding: '12px', borderRadius: '50px', border: 'none', background: '#3863a8', color: 'white', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 8px 12px rgba(56,99,168,0.2)' }}>Confirm Unit</button>
            </div>
          </div>
        </div>
      )}

      {/* TO TEAM LEAD MODAL */}
      {showLeadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="animate-slide-up" style={{ backgroundColor: 'white', width: '100%', maxWidth: '450px', borderRadius: '40px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', position: 'relative' }}>
            <button onClick={() => setShowLeadModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#fff7ed', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 15px' }}>👑</div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.5px' }}>Assign to Team Lead</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '60vh', overflowY: 'auto', padding: '5px 15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>SELECT TEAM LEAD</label>
                <select value={leadTask.assigneeId} onChange={(e) => setLeadTask({ ...leadTask, assigneeId: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b', cursor: 'pointer' }}>
                  <option value="">Choose a Lead...</option>
                  {usersList.filter(u => String(u?.role || '').toUpperCase().includes('LEAD') || String(u?.role || '').toUpperCase().includes('MANAGER')).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))
                  }
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>TASK NAME</label>
                <input type="text" placeholder="e.g. Infrastructure Audit" value={leadTask.task_name} onChange={(e) => setLeadTask({ ...leadTask, task_name: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>DESCRIPTION</label>
                <textarea placeholder="e.g. Detailed task breakdown..." value={leadTask.description} onChange={(e) => setLeadTask({ ...leadTask, description: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b', minHeight: '100px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>ATTACH PDF</label>
                <input type="file" accept="application/pdf" onChange={(e) => setLeadTask({ ...leadTask, attachment: e.target.files[0] })} style={{ width: '100%', padding: '12px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', fontWeight: '600', outline: 'none', color: '#1e293b' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>DEADLINE</label>
                <input type="date" value={leadTask.deadline} onChange={(e) => setLeadTask({ ...leadTask, deadline: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b' }} />
              </div>
            </div>
            <div style={{ marginTop: '35px', display: 'flex', gap: '15px' }}>
              <button onClick={() => setShowLeadModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '50px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAssignTask(leadTask)} disabled={isSubmitting} style={{ flex: 2, padding: '16px', borderRadius: '50px', border: 'none', background: '#a7d6da', color: '#1e293b', fontWeight: '800', fontSize: '14px', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px rgba(167,214,218,0.2)', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Syncing...' : 'Confirm Assignment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* TO EMPLOYEE MODAL */}
      {showEmployeeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="animate-slide-up" style={{ backgroundColor: 'white', width: '100%', maxWidth: '450px', borderRadius: '40px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', position: 'relative' }}>
            <button onClick={() => setShowEmployeeModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 15px' }}>👤</div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.5px' }}>Assign to Employee</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '60vh', overflowY: 'auto', padding: '5px 15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>SELECT EMPLOYEE</label>
                <select value={employeeTask.assigneeId} onChange={(e) => setEmployeeTask({ ...employeeTask, assigneeId: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b', cursor: 'pointer' }}>
                  <option value="">Choose an Employee...</option>
                  {usersList.filter(u => !String(u?.role || '').toUpperCase().includes('LEAD') && !String(u?.role || '').toUpperCase().includes('MANAGER')).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role || 'Member'})</option>
                  ))
                  }
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>TASK NAME</label>
                <input type="text" placeholder="e.g. Frontend Implementation" value={employeeTask.task_name} onChange={(e) => setEmployeeTask({ ...employeeTask, task_name: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>DESCRIPTION</label>
                <textarea placeholder="e.g. Detailed task breakdown..." value={employeeTask.description} onChange={(e) => setEmployeeTask({ ...employeeTask, description: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b', minHeight: '100px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>ATTACH PDF</label>
                <input type="file" accept="application/pdf" onChange={(e) => setEmployeeTask({ ...employeeTask, attachment: e.target.files[0] })} style={{ width: '100%', padding: '12px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', fontWeight: '600', outline: 'none', color: '#1e293b' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', paddingLeft: '15px' }}>DEADLINE</label>
                <input type="date" value={employeeTask.deadline} onChange={(e) => setEmployeeTask({ ...employeeTask, deadline: e.target.value })} style={{ width: '100%', padding: '16px 25px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', outline: 'none', color: '#1e293b' }} />
              </div>
            </div>
            <div style={{ marginTop: '35px', display: 'flex', gap: '15px' }}>
              <button onClick={() => setShowEmployeeModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '50px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAssignTask(employeeTask)} disabled={isSubmitting} style={{ flex: 2, padding: '16px', borderRadius: '50px', border: 'none', background: '#a7d6da', color: '#1e293b', fontWeight: '800', fontSize: '14px', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 10px 20px rgba(167,214,218,0.2)', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Syncing...' : 'Confirm Assignment'}</button>
            </div>
          </div>
        </div>
      )}
      {showSuccessToast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '20px 40px', borderRadius: '25px', boxShadow: toastType === 'success' ? '0 15px 40px -10px rgba(16, 185, 129, 0.3)' : '0 15px 40px -10px rgba(239, 68, 68, 0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '20px', border: toastType === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', animation: 'slideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: toastType === 'success' ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{toastType === 'success' ? '✅' : '❌'}</div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '900', color: toastType === 'success' ? '#065f46' : '#991b1b', margin: 0 }}>{toastMessage}</h3>
            <p style={{ fontSize: '11px', color: toastType === 'success' ? '#059669' : '#b91c1c', fontWeight: '700', margin: 0 }}>NBT Hub Database System</p>
          </div>
        </div>
      )}
      <TaskNotification onOpenTask={() => navigate('/tasks')} />
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -100%); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
