import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Search, Calendar, Filter, 
  Users, CheckCircle2, AlertCircle, Clock, FileText,
  RefreshCw, ChevronDown, User, Briefcase, MapPin,
  FileSpreadsheet, BarChart3, Clock3
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './PMDashboard.css';

export default function AttendanceReportScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // States for filters
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [team, setTeam] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data states
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [metrics, setMetrics] = useState({ present: 0, absent: 0, late: 0, halfDay: 0 });

  // Fetch teams for the dropdown
  useEffect(() => {
    if (user?.token) {
      fetch(API_ENDPOINTS.TEAMS || API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
      .then(res => res.json())
      .then(data => {
        const teamList = Array.isArray(data) ? data : (data?.data || []);
        const uniqueTeams = [...new Set(teamList.map(t => t.department || t.name || 'Unassigned'))];
        setTeams(uniqueTeams);
      })
      .catch(err => console.error("Error fetching teams:", err));
    }
  }, [user]);

  const fetchLogs = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (team !== 'ALL') params.append('team', team);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`${API_ENDPOINTS.ATTENDANCE_LOGS_GET}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` }
      });
      
      if (response.status === 401) {
        setError('Session expired or unauthorized. Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('navAuthUser');
          window.location.href = '/';
        }, 2000);
        setLoading(false);
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data || []);
        
        // Calculate metrics locally
        const rawData = result.data || [];
        const m = {
          present: rawData.filter(l => l.status === 'P' || l.status === 'PRESENT').length,
          absent: rawData.filter(l => l.status === 'A' || l.status === 'ABSENT').length,
          late: rawData.filter(l => l.status === 'L' || (l.remark && l.remark.includes('LT'))).length,
          halfDay: rawData.filter(l => l.status === 'HD' || l.status === 'HALF_DAY').length
        };
        setMetrics(m);
      } else {
        setError(result.message || 'Failed to fetch attendance logs');
      }
    } catch (err) {
      setError('System connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDate, team, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    return !term || 
           (log.name || log.EmployeeName || '').toLowerCase().includes(term) ||
           (log.user_id || log.Empcode || '').toString().includes(term);
  });

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'P' || s === 'PRESENT') return { label: 'Present', color: '#059669', bg: '#ecfdf5', border: '#10b981' };
    if (s === 'A' || s === 'ABSENT') return { label: 'Absent', color: '#dc2626', bg: '#fef2f2', border: '#ef4444' };
    if (s === 'L' || s === 'LATE') return { label: 'Late', color: '#d97706', bg: '#fffbeb', border: '#f59e0b' };
    if (s === 'HD' || s === 'HALF_DAY') return { label: 'Half Day', color: '#7c3aed', bg: '#f5f3ff', border: '#8b5cf6' };
    return { label: s || 'N/A', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' };
  };

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <AppHeader />
      
      <main style={{ padding: '120px 40px 60px', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', opacity: 0.8 }}>
          <button onClick={() => navigate('/attendance')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '800', color: '#3863a8' }}>
            <ArrowLeft size={16} /> Attendance Center
          </button>
          <span style={{ color: '#94a3b8', fontWeight: '900' }}>/</span>
          <span style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>Attendance Report</span>
        </div>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '38px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-1.5px' }}>Attendance Intelligence</h1>
            <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '700', margin: 0 }}>Advanced reporting and analytics for your entire workforce.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={fetchLogs}
              style={{ padding: '12px', borderRadius: '14px', background: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer', color: '#64748b', transition: '0.2s' }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#3863a8'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '16px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)' }}
                >
                  <Download size={18} /> Export Data
                </button>
                {showExportMenu && (
                    <>
                      <div onClick={() => setShowExportMenu(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                      <div style={{ position: 'absolute', top: '120%', right: 0, width: '220px', background: 'white', borderRadius: '20px', padding: '12px', border: '1.5px solid #f1f5f9', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', zIndex: 999 }}>
                         <button style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                           <FileText size={18} color="#ef4444" /> Export as PDF
                         </button>
                         <button style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                           <FileSpreadsheet size={18} color="#22c55e" /> Export as Excel
                         </button>
                      </div>
                    </>
                )}
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
           {[
             { label: 'PRESENT', value: metrics.present, color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
             { label: 'ABSENT', value: metrics.absent, color: '#dc2626', bg: '#fef2f2', icon: AlertCircle },
             { label: 'LATE ARRIVALS', value: metrics.late, color: '#d97706', bg: '#fffbeb', icon: Clock },
             { label: 'HALF DAYS', value: metrics.halfDay, color: '#7c3aed', bg: '#f5f3ff', icon: Clock3 }
           ].map((st, i) => (
             <div key={i} style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <st.icon size={24} />
                </div>
                <div>
                   <div style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{st.label}</div>
                   <div style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a' }}>{loading ? '...' : st.value}</div>
                </div>
             </div>
           ))}
        </div>

        {/* Filter Bar */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '20px', alignItems: 'flex-end' }}>
            
            {/* Date Range */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>DATE RANGE</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700', color: '#1e293b' }} 
                />
                <span style={{ color: '#94a3b8', fontWeight: '900' }}>TO</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700', color: '#1e293b' }} 
                />
              </div>
            </div>

            {/* Team Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>DEPARTMENT / TEAM</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={team}
                  onChange={e => setTeam(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700', color: '#1e293b', appearance: 'none', background: 'white' }}
                >
                  <option value="ALL">All Departments</option>
                  {teams.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>STATUS</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700', color: '#1e293b', appearance: 'none', background: 'white' }}
                >
                  <option value="ALL">Any Status</option>
                  <option value="P">Present</option>
                  <option value="A">Absent</option>
                  <option value="L">Late</option>
                  <option value="HD">Half Day</option>
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Search */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>SEARCH</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="ID or Name..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700', color: '#1e293b' }} 
                />
              </div>
            </div>

            <button 
              onClick={fetchLogs}
              style={{ padding: '12px 24px', height: '44px', borderRadius: '12px', background: '#3863a8', color: 'white', border: 'none', fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transform: 'translateY(-1px)', transition: '0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#1e293b'}
              onMouseOut={e => e.currentTarget.style.background = '#3863a8'}
            >
              <Filter size={16} /> APPLY
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ background: 'white', borderRadius: '28px', border: '1.5px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}>
                   <th style={{ padding: '24px 30px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Employee Details</th>
                   <th style={{ padding: '24px 30px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Log Date</th>
                   <th style={{ padding: '24px 30px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch Activity</th>
                   <th style={{ padding: '24px 30px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Session</th>
                   <th style={{ padding: '24px 30px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Status / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}>
                         <div className="animate-spin" style={{ margin: '0 auto', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%' }}></div>
                         <p style={{ marginTop: '20px', fontWeight: '800', color: '#64748b', fontSize: '14px' }}>Aggregating Attendance Intelligence...</p>
                      </td>
                    </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log, idx) => {
                    const badge = getStatusBadge(log.status);
                    return (
                      <tr key={idx} style={{ borderBottom: '1.5px solid #f8fafc', transition: '0.2s', cursor: 'pointer' }} onClick={() => navigate(`/attendance/detail/${log.user_id || log.Empcode}`)}>
                         <td style={{ padding: '20px 30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                               <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                                  <User size={20} />
                               </div>
                               <div>
                                  <div style={{ fontSize: '15px', fontWeight: '950', color: '#0f172a', marginBottom: '2px' }}>{log.name || log.EmployeeName || 'Employee Name'}</div>
                                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                     <Briefcase size={12} /> {log.department || 'Department'} • #{log.user_id || log.Empcode}
                                  </div>
                               </div>
                            </div>
                         </td>
                         <td style={{ padding: '20px 30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', color: '#475569' }}>
                               <Calendar size={16} color="#94a3b8" />
                               {log.punch_date ? new Date(log.punch_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </div>
                         </td>
                         <td style={{ padding: '20px 30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '900', color: '#3b82f6' }}>
                                  <LogIn size={13} /> {log.in_time || '----'}
                               </div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '900', color: '#64748b' }}>
                                  <LogOut size={13} /> {log.out_time || '----'}
                               </div>
                            </div>
                         </td>
                         <td style={{ padding: '20px 30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <BarChart3 size={16} color="#94a3b8" />
                               <div style={{ fontSize: '15px', fontWeight: '950', color: '#0f172a' }}>
                                  {log.work_time || '00:00'} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>HRS</span>
                                </div>
                            </div>
                         </td>
                         <td style={{ padding: '20px 30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                               <span style={{ 
                                 fontSize: '11px', fontWeight: '950', color: badge.color, background: badge.bg, 
                                 padding: '6px 14px', borderRadius: '12px', border: `1.5px solid ${badge.border}`, 
                                 textTransform: 'uppercase', letterSpacing: '0.8px', display: 'inline-flex', alignItems: 'center', gap: '6px' 
                               }}>
                                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: badge.color }}></div>
                                 {badge.label}
                               </span>
                               {log.remark && (
                                 <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                   <Info size={12} /> {log.remark}
                                 </div>
                               )}
                            </div>
                         </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '100px', textAlign: 'center' }}>
                       <AlertCircle size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                       <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>No reporting data found</h3>
                       <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700' }}>Try adjusting your filters or checking a different date range.</p>
                    </td>
                  </tr>
                )}
              </tbody>
           </table>
        </div>

      </main>
      <AppFooter />
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .pm-dashboard-container main { animation: fadeIn 0.4s ease-out; }
        .member-report-card:hover { transform: translateY(-3px); border-color: #3863a8 !important; }
        tr:hover { background-color: #f8fafc !important; }
      `}</style>
    </div>
  );
}
