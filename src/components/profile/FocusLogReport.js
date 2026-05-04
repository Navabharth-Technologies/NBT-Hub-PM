import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { Calendar, Download, ChevronLeft, Search, Filter, Clock, FileText, CheckCircle2, ShieldCheck, Trophy, Star, Award, Zap } from 'lucide-react';
import { API_ENDPOINTS } from '../../config';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FocusLogs({ onBack, userId: propUserId, title: propTitle, subtitle: propSubtitle }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlId = searchParams.get('id');

  const rawId = propUserId || urlId || user?.id || user?.userId || user?.empId || user?.employee_id;
  const effectiveUserId = (rawId && String(rawId) !== 'undefined' && String(rawId) !== 'null') ? rawId : null;


  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [rewardHistory, setRewardHistory] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [rewardsLoading, setRewardsLoading] = useState(true);

  
  // Default range: Start of month to now
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  useEffect(() => {
    fetchLogs();
    resolveUserName();
    fetchUserRewards();
  }, [effectiveUserId]);

  const fetchUserRewards = async () => {
    if (!effectiveUserId || !user?.token) return;
    setRewardsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.USER_REWARDS(effectiveUserId), {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Backend Structure: Returns an Object containing history (the array) and totalPoints.
        setRewardHistory(data.history || []); 
        setTotalPoints(data.totalPoints || 0);
      }
    } catch (err) {
      console.error("Error fetching user rewards:", err);
    } finally {
      setRewardsLoading(false);
    }
  };

  const resolveUserName = async () => {
    if (!effectiveUserId) return;
    
    // If it's the current user, we already have it in AuthContext
    const currentUid = user?.id || user?.userId || user?.empId || user?.employee_id;
    if (String(effectiveUserId) === String(currentUid)) {
       setResolvedName(user?.name || "Team Member");
       return;
    }

    // Otherwise fetch list of users
    try {
      const res = await fetch(API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const users = await res.json();
        const found = users.find(u => String(u.id) === String(effectiveUserId));
        if (found) setResolvedName(found.name);
      }
    } catch (err) {
      console.error('Error resolving user name:', err);
    }
  };



  useEffect(() => {
    filterData();
  }, [startDate, endDate, logs]);

  const fetchLogs = async () => {
    if (!effectiveUserId) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_ENDPOINTS.TASKS}?userId=${effectiveUserId}`);
      if (resp.ok) {
        const data = await resp.json();
        const logsArray = Array.isArray(data) ? data : (data.value || data.data || []);
        // Absolute Personal Isolation Layer: Filter to ensure ZERO data leakage from team reports
        const personalLogs = logsArray.filter(log => 
          String(log.userId) === String(effectiveUserId) || 
          String(log.employeeId) === String(effectiveUserId) ||
          String(log.employee_id) === String(effectiveUserId)
        );
        setLogs(personalLogs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };


  const filterData = () => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);

    const filtered = logs.filter(log => {
      const d = new Date(log.timestamp);
      return d >= s && d <= e;
    });
    setFilteredLogs(filtered);
  };

  const handleClear = () => {
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const downloadSpreadsheet = () => {
    if (filteredLogs.length === 0) return alert("No logs to download");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Status,Tasks\n";
    filteredLogs.forEach(log => {
      const d = new Date(log.timestamp);
      const dateStr = d.toLocaleDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const status = log.overallStatus || "PENDING";
      const tasksStr = (log.tasks || []).map(t => t.text).join('; ');
      
      const row = `"${dateStr}","${timeStr}","${status}","${tasksStr}"`;
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `focus_logs_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setShowDownloadMenu(false);
  };

  const downloadPDF = () => {
    if (filteredLogs.length === 0) return alert("No logs to download");
    const doc = new jsPDF();
    doc.text(`Personal Focus Logs: ${startDate} to ${endDate}`, 14, 15);
    
    const tableColumn = ["Date", "Time", "Status", "Tasks"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const d = new Date(log.timestamp);
      const logData = [
        d.toLocaleDateString(),
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        log.overallStatus || "PENDING",
        (log.tasks || []).map(t => t.text).join('\n')
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 3: { cellWidth: 100 } }
    });
    
    doc.save(`focus_logs_${startDate}_to_${endDate}.pdf`);
    setShowDownloadMenu(false);
  };

  const s = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '40px 26px', fontFamily: "'Inter', sans-serif" },
    main: { maxWidth: '1100px', margin: '70px auto 0 auto' },
    
    header: { marginBottom: '40px' },
    title: { fontSize: '32px', fontWeight: '900', color: '#0B1E3F', marginBottom: '8px' },
    subtitle: { fontSize: '15px', color: '#64748b', fontWeight: '600' },

    /* Filter Bar */
    filterBar: { 
      backgroundColor: 'white', 
      borderRadius: '30px', 
      padding: '12px 30px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px', 
      boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
      marginBottom: '32px',
      flexWrap: 'wrap'
    },
    label: { fontSize: '12px', fontWeight: '900', color: '#0B1E3F', display: 'flex', alignItems: 'center', gap: '10px' },
    dateInputBox: { 
      padding: '10px 18px', 
      backgroundColor: '#f8fafc', 
      borderRadius: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px',
      border: '1px solid #f1f5f9'
    },
    input: { border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' },
    toText: { fontSize: '12px', fontWeight: '900', color: '#cbd5e1' },
    clearBtn: { fontSize: '13px', fontWeight: '800', color: '#3B5998', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', marginLeft: 'auto' },
    downloadBtn: { 
      backgroundColor: '#1e293b', 
      color: 'white', 
      padding: '12px 24px', 
      borderRadius: '16px', 
      border: 'none', 
      fontWeight: '800', 
      fontSize: '14px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      cursor: 'pointer',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
    },

    /* Main Log Card */
    logCard: { backgroundColor: 'white', borderRadius: '40px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
    logHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
    logTitle: { fontSize: '22px', fontWeight: '800', color: '#3B5998', display: 'flex', alignItems: 'center', gap: '14px' },
    countBadge: { padding: '6px 14px', borderRadius: '10px', backgroundColor: '#eff6ff', fontSize: '11px', fontWeight: '900', color: '#2563eb' },

    /* Entry List */
    entry: { padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px', alignItems: 'flex-start' },
    dateBox: { minWidth: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', borderRadius: '20px', backgroundColor: '#f8fafc' },
    day: { fontSize: '24px', fontWeight: '900', color: '#0B1E3F' },
    month: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
    
    content: { flex: 1 },
    timeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
    reportText: { fontSize: '15px', color: '#1e293b', fontWeight: '600', lineHeight: '1.7' },
    statusTag: { padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' },

    emptyState: { padding: '80px 0', textAlign: 'center' },
    emptyTitle: { fontSize: '16px', fontWeight: '700', color: '#64748b', marginBottom: '10px' },
    viewHistory: { color: '#3B5998', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textDecoration: 'none' },

    dropdownMenu: { position: 'absolute', top: '100%', right: '0', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px', marginTop: '8px' },
    dropdownItem: { padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#1e293b', backgroundColor: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'background-color 0.2s', display: 'flex', gap: '10px', alignItems: 'center' }
  };

  return (
    <div style={s.container}>
      <AppHeader />
      <main style={s.main}>
        
        <header style={s.header}>
          <h1 style={s.title}>{propTitle || (String(effectiveUserId) === String(user?.id) ? "Your Focus Logs" : "Individual Performance Logs")}</h1>
          <p style={s.subtitle}>{propSubtitle || `Detailed focus tracking for ${resolvedName || 'Team Member'}.`}</p>
        </header>

        {/* User Rewards Section */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', 
            gap: '20px', 
            marginBottom: '40px' 
        }}>
            <div style={{ ...s.logCard, padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '15px' }}>
                    <Trophy size={28} color="#d97706" />
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Reputation</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F' }}>{totalPoints} REP</div>
                </div>
            </div>
            <div style={{ ...s.logCard, padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '15px' }}>
                    <ShieldCheck size={28} color="#059669" />
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Rank</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F' }}>{totalPoints > 1000 ? 'Expert' : 'Rising Star'}</div>
                </div>
            </div>
            <div style={{ ...s.logCard, padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '15px' }}>
                    <Zap size={28} color="#2563eb" />
                </div>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Recent Award</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0B1E3F' }}>
                        {rewardHistory.length > 0 ? rewardHistory[0].reward_type : 'No Awards Yet'}
                    </div>
                </div>
            </div>
        </div>

        {/* Recognition Timeline */}
        {rewardHistory.length > 0 && (
            <div style={{ ...s.logCard, padding: '30px', marginBottom: '40px' }}>
                <div style={{ ...s.logTitle, marginBottom: '25px' }}><Award size={24} /> Recognition & Badges</div>
                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {rewardHistory.map((reward, rid) => (
                        <div key={rid} style={{ 
                            flex: '0 0 200px', 
                            background: '#f8fafc', 
                            padding: '20px', 
                            borderRadius: '24px', 
                            border: '1.5px solid #f1f5f9',
                            textAlign: 'center'
                        }}>
                            <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <Star size={24} color="#facc15" fill="#facc15" />
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{reward.reward_type}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginTop: '4px' }}>{new Date(reward.created_at).toLocaleDateString()}</div>
                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#0369a1', marginTop: '10px', textTransform: 'uppercase' }}>+{reward.points} REP</div>
                        </div>
                    ))}
                </div>
            </div>
        )}



        {/* Filter Bar */}
        <div style={s.filterBar}>
          <div style={s.label}><Calendar size={18} /> DATE RANGE</div>
          
          <div style={s.dateInputBox}>
            <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B5998'}} />
            <input type="date" style={s.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <span style={s.toText}>TO</span>

          <div style={s.dateInputBox}>
            <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981'}} />
            <input type="date" style={s.input} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          <button style={s.clearBtn} onClick={handleClear}>Clear</button>
          
          <div style={{ position: 'relative' }}>
            <button style={s.downloadBtn} onClick={() => setShowDownloadMenu(!showDownloadMenu)}>
              <Download size={18} /> Download Logs
            </button>
            {showDownloadMenu && (
              <div style={s.dropdownMenu}>
                <button 
                  style={s.dropdownItem} 
                  onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                  onClick={downloadSpreadsheet}
                >
                  <FileText size={16} color="#059669" /> Download Spreadsheet
                </button>
                <button 
                  style={s.dropdownItem}
                  onMouseEnter={e => e.target.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.target.style.backgroundColor = 'white'}
                  onClick={downloadPDF}
                >
                  <FileText size={16} color="#e11d48" /> Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Log Card */}
        <div style={s.logCard}>
          <div style={s.logHeader}>
            <div style={s.logTitle}><Clock size={24} /> Day-by-Day Focus Logs</div>
            <div style={s.countBadge}>{filteredLogs.length} RECORDS FOUND</div>
          </div>

          <div>
            {loading ? (
              <div style={s.emptyState}>Fetching your logs...</div>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => {
                const d = new Date(log.timestamp);
                return (
                  <div key={log.id || `log-${idx}`} style={s.entry}>
                    <div style={s.dateBox}>
                      <div style={s.day}>{d.getDate()}</div>
                      <div style={s.month}>{d.toLocaleString('default', { month: 'short' })}</div>
                    </div>
                    <div style={s.content}>
                      <div style={s.timeRow}>
                        <Clock size={14} color="#94a3b8" />
                        <span style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8'}}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div style={{
                          ...s.statusTag, 
                          backgroundColor: log.overallStatus === 'Completed' ? '#dcfce7' : '#fef9c3',
                          color: log.overallStatus === 'Completed' ? '#16a34a' : '#a16207',
                        }}>
                          {log.overallStatus || 'PENDING'}
                        </div>
                      </div>
                      <div style={s.reportText}>
                        {log.tasks?.map((t, i) => (
                           <div key={i} style={{marginBottom: '4px', display:'flex', gap:'8px'}}>
                             <CheckCircle2 size={16} color="#3B5998" /> {t.text}
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={s.emptyState}>
                <ShieldCheck size={48} color="#f1f5f9" style={{marginBottom: '20px'}} />
                <div style={s.emptyTitle}>No logs found for this date range.</div>
                <button onClick={handleClear} style={s.viewHistory}>View All History</button>
              </div>
            )}
          </div>
        </div>

      </main>
      <AppFooter />
    </div>
  );
}
