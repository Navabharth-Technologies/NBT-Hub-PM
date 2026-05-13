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

  Compliance: () => <span>🛡️</span>,
  Alert: () => <span>🔔</span>,
  Asset: () => <span>📦</span>,
  Add: () => <span>+</span>,
  Quiz: () => <span>🎮</span>,
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
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);


  // Fetch Holidays, Tasks & Teams on Load
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.token) return;

      try {
        // Fetch Holidays
        const hRes = await fetch(API_ENDPOINTS.HOLIDAYS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        }).catch(() => null);
        if (hRes && hRes.ok) {
          const hData = await hRes.json();
          const hList = Array.isArray(hData) ? hData : (hData.data || []);
          const today = new Date();
          const currentMonth = today.getMonth();
          const currentDay = today.getDate();

          const processedH = hList.map(h => {
            const d = new Date(h.date || h.holiday_date);
            return { ...h, d, month: d.getMonth(), day: d.getDate() };
          }).filter(h => !isNaN(h.d.getTime()))
            .filter(h => h.month > currentMonth || (h.month === currentMonth && h.day >= currentDay))
            .sort((a, b) => a.d - b.d)
            .slice(0, 5);
          setHolidays(processedH);
        }

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

        // Fetch New Joinees & Interns Count (Combined & Filtered)
        const [joineeRes, internRes] = await Promise.all([
          fetch(API_ENDPOINTS.NEW_JOINEES, { headers: { 'Authorization': `Bearer ${user.token}` } }).catch(() => null),
          fetch(API_ENDPOINTS.INTERNS, { headers: { 'Authorization': `Bearer ${user.token}` } }).catch(() => null)
        ]);
        
        let totalActiveJoinees = 0;
        if (joineeRes && joineeRes.ok) {
          const jData = await joineeRes.json();
          const activeJoinees = (Array.isArray(jData) ? jData : []).filter(j => Number(j.is_blocked) !== 1);
          totalActiveJoinees += activeJoinees.length;
        }
        if (internRes && internRes.ok) {
          const iData = await internRes.json();
          const internsList = Array.isArray(iData) ? iData : (iData.data || []);
          const activeInterns = internsList.filter(i => Number(i.is_blocked) !== 1);
          totalActiveJoinees += activeInterns.length;
        }
        setNewJoineesCount(totalActiveJoinees);

        // Fetch Leave Requests & All Metrics
        const leavesRes = await fetch(API_ENDPOINTS.LEAVES_GET, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (leavesRes.ok) {
          const lData = await leavesRes.json();
          const lList = Array.isArray(lData) ? lData : (lData?.data || lData?.all || lData?.leaves || lData?.requests || []);
          
          // Name Resolution for Leave Requests
          const resolvedLeaves = (Array.isArray(lList) ? lList : []).map(req => {
            const uid = String(req.user_id || req.userId || req.empId || '').trim();
            return {
              ...req,
              employee_name: userLookup[uid] || req.employee_name || req.name || 'Member'
            };
          });
          setLeaveRequests(resolvedLeaves);

          // Derive metrics safely - using includes to handle 'PENDING,PENDING' or varied formats
          // Count all active leaves (Pending + Approved)
          const onLeaveCount = Array.isArray(lList) ? lList.filter(r => 
            ['PENDING', 'APPROVED'].includes(String(r?.status || '').toUpperCase())
          ).length : 0;
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
            const lateToday = todayLogs.filter(l => String(l?.status || '').toUpperCase().includes('LATE')).length;
            setAttendanceStats(prev => ({ ...prev, present: uniquePresentToday, late: lateToday }));
          }
        }

        // Fetch Upcoming Birthdays for Dashboard Preview
        try {
          const bRes = await fetch(API_ENDPOINTS.BIRTHDAYS, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (bRes.ok) {
            const bData = await bRes.json();
            const bList = Array.isArray(bData) ? bData : (bData.data || []);

            const today = new Date();
            const currentMonth = today.getMonth();
            const currentDay = today.getDate();

            const parseDate = (dateStr) => {
              if (!dateStr) return new Date(NaN);
              if (dateStr instanceof Date) return dateStr;
              const s = String(dateStr).trim();
              // Handle ISO YYYY-MM-DD
              if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
              // Handle DD-MM-YYYY or DD/MM/YYYY
              if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
                const [d, m, y] = s.split(/[-/]/);
                return new Date(y, m - 1, d);
              }
              // Handle DD-MM or DD/MM
              if (/^\d{1,2}[-/]\d{1,2}$/.test(s)) {
                const [d, m] = s.split(/[-/]/);
                return new Date(new Date().getFullYear(), m - 1, d);
              }
              return new Date(s);
            };

            const processed = bList.map(emp => {
              const dob = parseDate(emp.dob || emp.birthday || emp.date || emp.date_of_birth || emp.birthday_date);
              let displayDate = 'N/A';
              if (!isNaN(dob.getTime())) {
                displayDate = dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              }
              return { ...emp, month: dob.getMonth(), day: dob.getDate(), dobDate: dob, displayDate };
            }).filter(emp => !isNaN(emp.dobDate.getTime()))
              .filter(emp => emp.month > currentMonth || (emp.month === currentMonth && emp.day >= currentDay));

            const sorted = processed.sort((a, b) => {
              if (a.month !== b.month) return a.month - b.month;
              return a.day - b.day;
            });
            setUpcomingBirthdays(sorted.slice(0, 5));
          }
        } catch (e) {
          console.log('Birthdays sync error');
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
    { label: 'Employees of NBT', value: employeesCount || 'View', icon: <Icons.Employees />, color: '#8b5cf6', trend: 'Live', trendUp: true, path: '/employees' },
    { label: 'Personal Information', value: 'Manage', icon: <Icons.Employees />, color: '#315A9E', trend: 'Active', trendUp: true, path: '/personal-info' },

    { label: 'Assets Management', value: 'Manage', icon: <span>📦</span>, color: '#f59e0b', trend: 'New', trendUp: true, path: '/assets' },
    { label: 'New Joinee', value: newJoineesCount || 'View', icon: <span>✨</span>, color: '#0ea5e9', trend: 'This Month', trendUp: true, path: '/new-joinees' },
    { label: 'Fun and Quiz', value: 'Play', icon: <Icons.Quiz />, color: '#ec4899', trend: 'Active', trendUp: true, path: '/quiz' },
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
        setToastMessage('Task assigned Successfully ✅');
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
      <main style={{
        flex: 1,
        padding: winWidth < 768 ? '20px 16px 40px' : '40px 26px 40px',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: winWidth < 768 ? '85px' : '100px'
      }}>
        <header className="section-header" style={{
          marginBottom: winWidth < 768 ? '24px' : '32px',
          display: 'flex',
          flexDirection: winWidth < 1024 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: winWidth < 1024 ? 'stretch' : 'center',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '950', color: '#0f172a', margin: '0', letterSpacing: '-1px' }}>Dashboard</h1>
              <p style={{ color: '#64748b', fontSize: winWidth < 768 ? '12px' : '14px', fontWeight: '700', margin: '4px 0 0 0' }}>Strength and scale • {teams.length} Active Teams</p>
            </div>
          </div>

          <div className="quick-actions" style={{ position: 'relative', display: 'flex', gap: '8px', width: winWidth < 1024 ? '100%' : 'auto', flexDirection: winWidth < 480 ? 'column' : 'row', flexWrap: 'wrap' }}>
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


          </div>
        </header>

        <section style={{ marginBottom: winWidth < 768 ? '32px' : '40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: winWidth < 640 ? 'repeat(2, 1fr)' : winWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
            gap: winWidth < 768 ? '12px' : '20px'
          }}>
            {dynamicMetrics.map((m, i) => (
              <div
                key={i}
                className="metric-card animate-fade-in"
                style={{
                  cursor: m.path ? 'pointer' : 'default',
                  padding: winWidth < 768 ? '16px' : '24px',
                  borderRadius: '24px',
                  background: 'white',
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: '0.2s transform, 0.2s box-shadow'
                }}
                onClick={() => m.path && navigate(m.path)}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    background: `${m.color}15`, color: m.color, width: winWidth < 768 ? '36px' : '48px', height: winWidth < 768 ? '36px' : '48px',
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: winWidth < 768 ? '18px' : '24px'
                  }}>
                    {m.icon}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: winWidth < 768 ? '11px' : '13px', color: '#64748b', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                  <div style={{
                    fontSize: winWidth < 768 ? '20px' : '28px',
                    fontWeight: '950',
                    color: '#0f172a',
                    lineHeight: 1
                  }}>{m.value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="main-dashboard-grid">
          {/* Column 1: Team Overview (Spans 2 columns on Desktop) */}
          <section className="dashboard-section team-overview-section animate-fade-in" style={{
            animationDelay: '0.4s',
            position: 'relative',
            borderRadius: '32px',
            width: winWidth < 600 ? 320 : '100%',
            marginLeft: 'auto',
            marginRight: '20px',
            boxSizing: 'border-box'
          }}>
            <div className="section-header" style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 className="section-title" style={{ margin: 0, fontSize: '22px' }}>Team Overview</h2>
                <button style={{ background: 'none', border: 'none', color: '#3863a8', fontWeight: '800', cursor: 'pointer', fontSize: '13px', textAlign: 'left', padding: '4px 0' }} onClick={() => navigate('/teams')}>Manage Hub</button>
              </div>

              {winWidth < 768 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentTeamIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentTeamIndex === 0}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #e2e8f0',
                      background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', opacity: currentTeamIndex === 0 ? 0.3 : 1, fontSize: '14px'
                    }}
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setCurrentTeamIndex(prev => Math.min(teams.length - 1, prev + 1))}
                    disabled={currentTeamIndex === teams.length - 1}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #e2e8f0',
                      background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', opacity: currentTeamIndex === teams.length - 1 ? 0.3 : 1, fontSize: '14px'
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            <div style={{
              overflow: winWidth < 768 ? 'hidden' : 'visible',
              width: '100%'
            }}>
              {winWidth < 768 ? (
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: `translateX(calc(-${currentTeamIndex} * (100% + 20px)))`,
                  width: '100%',
                  touchAction: 'pan-y'
                }}>
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="team-card"
                      onClick={() => navigate(`/teams/${team.id}`)}
                      style={{
                        flex: '0 0 100%',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0 5px',
                        cursor: 'pointer',
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
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>Lead: <span style={{ color: '#1e293b', fontWeight: '700' }}>{team.lead}</span></div>

                      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3863a8' }}></span>
                          <div style={{ fontSize: '12px', color: '#64748b' }}><span style={{ fontWeight: '900', color: '#3863a8' }}>{team.members}</span> Members</div>
                        </div>
                      </div>

                      <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '20px', overflow: 'hidden' }}>
                        <div style={{ width: `${team.progress}%`, height: '100%', background: 'linear-gradient(90deg, #3863a8, #1e40af)', borderRadius: '20px', transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  {teams.map(team => (
                    <div key={team.id}
                      style={{
                        padding: '20px',
                        borderRadius: '24px',
                        background: '#ffffff',
                        border: '3px solid #cbd5e1',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        cursor: 'pointer',
                        transition: '0.3s transform'
                      }}
                      onClick={() => navigate(`/teams/${team.id}`)}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1.5px solid #e2e8f0' }}>🛡️</div>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>{team.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{team.members || 0} Operatives</div>
                          </div>
                        </div>
                        <div style={{ padding: '4px 10px', borderRadius: '8px', background: '#eff6ff', color: '#3863a8', fontSize: '10px', fontWeight: '900' }}> {team.id}</div>
                      </div>
                      {/* Removed Sprints/Progress stats row as per user request */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${team.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #3863a8, #1e40af)', borderRadius: '10px' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Column 2: Task Hub */}
          <section className="dashboard-section animate-fade-in" style={{
            animationDelay: '0.6s',
            cursor: 'default',
            marginBottom: winWidth < 768 ? '15px' : '0',
            padding: winWidth < 768 ? '12px' : '32px',
            width: winWidth < 600 ? '92%' : '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '10px' : '15px', marginBottom: winWidth < 768 ? '16px' : '25px' }}>
              <div style={{ width: winWidth < 768 ? '38px' : '48px', height: winWidth < 768 ? '38px' : '48px', borderRadius: '14px', background: '#eff6ff', color: '#3163aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: winWidth < 768 ? '16px' : '22px', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.1)', flexShrink: 0 }}>📅</div>
              <h2 style={{ fontSize: winWidth < 768 ? '16px' : winWidth < 1024 ? '18px' : '22px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Task Command</h2>
            </div>

            <div style={{ marginBottom: '20px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Unit Sprints</span>
                <span style={{ fontSize: '10px', fontWeight: '900', color: '#3863a8', backgroundColor: '#eff6ff', padding: '4px 12px', borderRadius: '100px' }}>{recentTasks.length} Active</span>
              </div>
              {recentTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentTasks.slice(0, 4).map((task, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px',
                      borderRadius: '16px', background: '#ffffff', border: '3px solid #cbd5e1',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'default', transition: '0.2s', width: '100%', boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>✅</div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title || task.task_name || 'Active Task'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{task.assignee_name || 'Staff'} • {task.status || 'Active'}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '800', flexShrink: 0, marginLeft: '8px' }}>›</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '24px', border: '3px dashed #cbd5e1' }}>Unit Sprints Neutralized</div>
              )}
            </div>
            <button className="animate-fade-in" onClick={() => navigate('/tasks')} style={{
              width: '100%',
              padding: winWidth < 768 ? '14px 10px' : '14px',
              background: '#0f172a',
              borderRadius: '16px',
              color: 'white',
              fontWeight: '900',
              fontSize: winWidth < 768 ? '13px' : '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.15)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}>Open Task Management <span>→</span></button>
          </section>

          {/* Column 3: Attendance Analytics */}
          <section className="dashboard-section animate-fade-in" style={{
            animationDelay: '0.7s',
            cursor: 'pointer',
            borderRadius: winWidth < 768 ? '35px' : '32px',
            padding: winWidth < 768 ? '12px' : '32px',
            width: winWidth < 500 ? '320px' : '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }} onClick={() => navigate('/attendance')}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: winWidth < 768 ? '20px' : '25px',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: winWidth < 768 ? '10px' : '15px' }}>
                <div style={{ width: winWidth < 768 ? '38px' : '48px', height: winWidth < 768 ? '38px' : '48px', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: winWidth < 768 ? '16px' : '22px', flexShrink: 0 }}>📅</div>
                <h2 style={{ fontSize: winWidth < 768 ? '16px' : '22px', fontWeight: '950', color: '#1e293b', margin: 0, lineHeight: 1.2 }}>Leave/Attendance<br /> Management</h2>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: '#3863a8', fontWeight: '800', cursor: 'pointer', fontSize: winWidth < 768 ? '12px' : '13px', paddingTop: '4px' }}
                onClick={(e) => { e.stopPropagation(); navigate('/leaves'); }}
              >
                Leaves
              </button>
              <button
                style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: '800', cursor: 'pointer', fontSize: winWidth < 768 ? '12px' : '13px', paddingTop: '4px', marginLeft: '12px' }}
                onClick={(e) => { e.stopPropagation(); navigate('/attendance'); }}
              >
                Attendance
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: winWidth < 768 ? '6px' : '20px',
              marginBottom: '32px',
              width: '100%',
              boxSizing: 'border-box',
              justifyContent: 'space-between'
            }}>
              {[
                { label: 'Present', count: attendanceStats.present, bg: '#f0fdf4', border: '#dcfce7', color: '#15803d', countColor: '#166534' },
                { label: 'Total Leaves', count: attendanceStats.leave, bg: '#fffbeb', border: '#fef3c7', color: '#b45309', countColor: '#92400e' }
              ].map((stat, idx) => (
                <div key={idx}
                  onClick={(e) => {
                    if (stat.label === 'Total Leaves') {
                      e.stopPropagation();
                      navigate('/leaves');
                    } else if (stat.label === 'Present' || stat.label === 'Late Login') {
                      e.stopPropagation();
                      navigate('/attendance');
                    }
                  }}
                  style={{
                    padding: winWidth < 768 ? '10px 4px' : '24px',
                    flex: 1,
                    background: stat.bg,
                    borderRadius: winWidth < 768 ? '12px' : '24px',
                    border: `1px solid ${stat.border}`,
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                    minWidth: 0,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: winWidth < 768 ? '8px' : '11px', fontWeight: '900', color: stat.color, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: winWidth < 768 ? '0px' : '1px' }}>{stat.label}</div>
                  <div style={{ fontSize: winWidth < 768 ? '18px' : '36px', fontWeight: '950', color: stat.countColor, lineHeight: 1 }}>{stat.count || 0}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '20px', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Pending Requests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaveRequests.filter(r => String(r.status || '').toUpperCase().includes('PENDING')).slice(0, 3).length > 0 ? (
                  leaveRequests.filter(r => String(r.status || '').toUpperCase().includes('PENDING')).slice(0, 3).map((req, rid) => (
                    <div key={rid} onClick={(e) => { e.stopPropagation(); navigate(`/attendance/leave/${req.id}`); }} style={{
                      display: 'flex', alignItems: 'center', padding: winWidth < 768 ? '10px' : '16px',
                      borderRadius: winWidth < 768 ? '18px' : '24px', background: '#ffffff', border: '1px solid #cbd5e1',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer', transition: '0.2s', width: '100%', boxSizing: 'border-box',
                      gap: winWidth < 768 ? '8px' : '12px'
                    }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🕒</div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <div style={{ fontSize: '15px', fontWeight: '950', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.employee_name || req.name}</div>
                          <div style={{ padding: '3px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: '50px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Pending</div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.leave_type || 'Leave'} • {(req.date || req.start_date || '').split('T')[0].split('-').reverse().join('-') || 'N/A'}
                        </div>
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '18px', fontWeight: '300' }}>›</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '2px dashed #cbd5e1', borderRadius: '24px' }}>Zero Pending Requests</div>
                )}
              </div>
            </div>
            <button style={{ width: '100%', padding: '14px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px', color: '#3863a8', fontWeight: '900', fontSize: '14px', cursor: 'pointer', transition: '0.2s' }}>Manage Workforce</button>
          </section>

          {/* Upcoming Birthdays Section */}
          <section className="dashboard-section animate-fade-in" style={{ animationDelay: '0.8s', cursor: 'pointer', width: winWidth < 600 ? '92%' : '100%', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }} onClick={() => navigate('/birthdays')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="section-title">🎂 Upcoming Birthdays</h2>
              <button className="btn-ghost" style={{ fontSize: '12px', background: 'none', border: 'none', color: '#3863a8', fontWeight: '800', cursor: 'pointer' }}>View All</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingBirthdays.length > 0 ? upcomingBirthdays.map((bday, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '15px', padding: '14px',
                  borderRadius: '16px', background: '#ffffff', border: '3px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ background: '#fdf2f8', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    🎈
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '950', color: '#0f172a' }}>{bday.name || bday.employee_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{bday.role || bday.designation || 'Member'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '950', color: '#ec4899' }}>
                      {bday.displayDate}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>WISH</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '2px dashed #cbd5e1', borderRadius: '24px' }}>
                  No upcoming birthdays found
                </div>
              )}
            </div>
          </section>



          {/* List of Holidays Section */}
          <section className="dashboard-section animate-fade-in" style={{ animationDelay: '1.0s', cursor: 'pointer', width: winWidth < 600 ? '92%' : '100%', marginLeft: 'auto', marginRight: 'auto', boxSizing: 'border-box' }} onClick={() => navigate('/holidays')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="section-title">🏖️ List of Holidays</h2>
              <button className="btn-ghost" style={{ fontSize: '12px', background: 'none', border: 'none', color: '#3863a8', fontWeight: '800', cursor: 'pointer' }}>View All</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {holidays.length > 0 ? holidays.map((holiday, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '15px', padding: '14px',
                  borderRadius: '16px', background: '#f8fafc', border: '3px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ background: '#ffffff', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', fontSize: '20px' }}>
                    📅
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b' }}>{holiday.name || holiday.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{holiday.day || holiday.d?.toLocaleDateString('en-US', { weekday: 'long' }) || 'Holiday'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '950', color: '#3863a8' }}>{holiday.date || holiday.d?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>2026</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '2px dashed #cbd5e1', borderRadius: '24px' }}>
                  No upcoming holidays found
                </div>
              )}
            </div>
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
          <div className="animate-slide-up" style={{ backgroundColor: 'white', width: '100%', maxWidth: '520px', borderRadius: '40px', padding: '25px 40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', position: 'relative' }}>
            <button onClick={() => setShowLeadModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#fff7ed', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 10px' }}>👑</div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.5px' }}>Assign to Team Lead</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto', padding: '5px 15px' }}>
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
          <div className="animate-slide-up" style={{ backgroundColor: 'white', width: '100%', maxWidth: '520px', borderRadius: '40px', padding: '25px 40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', position: 'relative' }}>
            <button onClick={() => setShowEmployeeModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: '#f8fafc', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 10px' }}>👤</div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.5px' }}>Assign to Employee</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '60vh', overflowY: 'auto', padding: '5px 15px' }}>
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
            <p style={{ fontSize: '11px', color: toastType === 'success' ? '#059669' : '#b91c1c', fontWeight: '700', margin: 0 }}></p>
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