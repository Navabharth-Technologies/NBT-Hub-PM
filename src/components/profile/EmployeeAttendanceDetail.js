import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft, Calendar, Clock, Download, RefreshCw, User, CheckCircle2, AlertCircle, FileText, Clock3, ChevronRight, FileSpreadsheet, MapPin, Fingerprint, Info, ShieldCheck, List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './PMDashboard.css';

const formatToDDMMYYYY = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const getFullStatusText = (status, inTime, outTime, workHrs) => {
  let s = String(status || '').toUpperCase();
  const hasIn = inTime && inTime !== '----' && inTime !== '--:--';
  const hasOut = outTime && outTime !== '----' && outTime !== '--:--';

  // If there's both check-in and check-out, let's check work hours for half-day
  if (hasIn && hasOut) {
    let hours = 0;
    if (workHrs && workHrs !== '----') {
      const parts = String(workHrs).split(':');
      if (parts.length >= 2) {
        hours = parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
      }
    }
    // Standard rule: If they worked between 0.05 hours and 5 hours, it's a Half Day!
    if (hours > 0.05 && hours < 5.0) {
      return 'Half Day';
    }
  }

  // General mappings
  if (s === 'P' || s === 'PRESENT') return 'Present';
  if (s === 'A' || s === 'ABSENT') return 'Absent';
  if (s === 'HD' || s === 'HALF_DAY' || s === 'HALF DAY') return 'Half Day';
  if (s === 'WO' || s === 'WEEKLY OFF' || s === 'WEEKEND OFF') return 'Weekly Off';
  if (s === 'NH' || s === 'HOLIDAY' || s === 'NATIONAL HOLIDAY') return 'Holiday';
  if (s === 'L' || s === 'LATE') return 'Late';
  if (s === 'IN OFFICE' || s === 'IN-OFFICE') return 'In Office';

  // Fallbacks if not matched but has punch in
  if (hasIn) {
    if (hasOut) return 'Present';
    return 'In Office';
  }
  return 'Absent';
};

const getStatusBadgeStyle = (statusText) => {
  const s = String(statusText || '').toUpperCase();
  if (s.includes('PRESENT')) {
    return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dotBg: '#22c55e' };
  }
  if (s.includes('ABSENT')) {
    return { color: '#ef4444', bg: '#fef2f2', border: '#fee2e2', dotBg: '#ef4444' };
  }
  if (s.includes('HALF')) {
    return { color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', dotBg: '#f97316' };
  }
  if (s.includes('WEEKLY') || s.includes('OFF') || s === 'WO') {
    return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dotBg: '#64748b' };
  }
  if (s.includes('HOLIDAY') || s === 'NH') {
    return { color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', dotBg: '#6366f1' };
  }
  if (s.includes('OFFICE') || s.includes('ONLINE')) {
    return { color: '#0d9488', bg: '#f0fdf4', border: '#ccfbf1', dotBg: '#14b8a6' };
  }
  if (s.includes('LATE')) {
    return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dotBg: '#f59e0b' };
  }
  return { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe', dotBg: '#3b82f6' };
};

export default function EmployeeAttendanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(localStorage.getItem('nbtAttendanceDetailFromDate') || '2026-01-01');
  const [endDate, setEndDate] = useState(() => {
    const saved = localStorage.getItem('nbtAttendanceDetailToDate');
    const today = getTodayStr();
    return (saved && saved < today) ? today : (saved || today);
  });

  useEffect(() => {
    localStorage.setItem('nbtAttendanceDetailFromDate', startDate);
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('nbtAttendanceDetailToDate', endDate);
  }, [endDate]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || timeStr === '--:--' || timeStr === '----') return null;
    const hmMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hmMatch) {
      const d = new Date();
      d.setHours(parseInt(hmMatch[1], 10), parseInt(hmMatch[2], 10), parseInt(hmMatch[3] || 0, 10), 0);
      return d;
    }
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      const [time, modifier] = parts;
      let [hours, minutes] = time.split(':').map(n => parseInt(n, 10));
      if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
    return null;
  };

  const calculateWorkHours = (inTime, outTime) => {
    const start = parseTime(inTime);
    const end = parseTime(outTime);
    if (!start || !end) return '00:00';
    let diffMs = end - start;
    if (diffMs < 0) return '00:00';
    const totalMinutes = Math.floor(diffMs / 1000 / 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const resolveWorkHrs = (log) => {
    const fromDB = log.work_time || log.work_hrs || log.WorkTime || log.Work_Time || log.worktime;
    if (fromDB && fromDB !== '00:00' && fromDB !== '--:--') return fromDB;
    return calculateWorkHours(log.in_time || log.INTime || log.PunchIn, log.out_time || log.OUTTime || log.PunchOut);
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user?.token || !id) return;
      try {
        setLoading(true);
        // 1. Fetch Employee Profile
        const userRes = await fetch(API_ENDPOINTS.EMPLOYEES || API_ENDPOINTS.USERS, { 
          headers: { 'Authorization': `Bearer ${user.token}` } 
        });
        const users = await userRes.json();
        const validUsers = Array.isArray(users) ? users : (users?.data || []);
        let found = validUsers.find(u => String(u.id) === String(id) || String(u.Empcode) === String(id));
        if (found) {
          const empId = String(found.employee_id || found.id || '').trim();
          if (empId === '202512') {
            found = { ...found, name: 'Rakesh Gowda H N', user_name: 'Rakesh Gowda H N' };
          } else if (empId === '202522') {
            found = { ...found, name: 'Ravi Kumar B M', user_name: 'Ravi Kumar B M' };
          }
        }
        setEmployee(found);

        // 2. Fetch INDIVIDUAL Attendance Logs with a very wide range to get ALL historical data
        // This ensures the "Total Logs" count is accurate and doesn't "delete" old logs
        const queryParams = new URLSearchParams({ 
          startDate: '2020-01-01', // Fetch from the beginning of time
          endDate: endDate,
          userId: id,
          limit: 30000 // Increased limit to ensure we get everything
        });

        const logsUrl = `${API_ENDPOINTS.ATTENDANCE_LOGS_GET}?${queryParams.toString()}`;
        const logsRes = await fetch(logsUrl, { headers: { 'Authorization': `Bearer ${user.token}` } });
        const logsData = await logsRes.json();
        const allLogs = logsData.data || logsData.attendance || logsData.logs || (Array.isArray(logsData) ? logsData : []);
        
        // 3. Strict Frontend Filtering (ID matching ONLY to prevent cross-employee data leak)
        const individualLogs = allLogs.filter(l => {
          if (!l) return false;
          const targetId = String(id).trim();
          const logId = String(l.user_id || l.Empcode || l.EmpID || l.userId || l.UserId || l.user_ID || l.UserID || '').trim();
          return logId === targetId;
        });

        // 4. Group Logs by Date (Consolidate multiple punches into one daily summary)
        const grouped = {};
        individualLogs.forEach(l => {
          const rawDate = l.punch_date || l.date || l.PunchDate || l.PDate || l.created_at || '';
          if (!rawDate) return;
          
          let dStr = '';
          try {
            const dObj = new Date(rawDate);
            if (isNaN(dObj.getTime())) {
              dStr = String(rawDate).split('T')[0].split(' ')[0];
            } else {
              dStr = dObj.toISOString().split('T')[0];
            }
          } catch (e) {
            dStr = String(rawDate).split('T')[0].split(' ')[0];
          }
          
          if (!dStr || dStr.length < 8 || dStr.toLowerCase().includes('invalid')) return; 
          
          if (!grouped[dStr]) grouped[dStr] = [];
          grouped[dStr].push(l);
        });

        const summaryLogs = Object.keys(grouped).map(date => {
          const dayPunches = (grouped[date] || []).sort((a, b) => {
            const timeA = a?.in_time || a?.INTime || a?.PunchIn || a?.punch_in || '00:00';
            const timeB = b?.in_time || b?.INTime || b?.PunchIn || b?.punch_in || '00:00';
            return String(timeA).localeCompare(String(timeB));
          });
          
          const firstPunch = dayPunches[0] || {};
          const lastPunch = dayPunches[dayPunches.length - 1] || {};

          const punchInTime = firstPunch?.in_time || firstPunch?.INTime || firstPunch?.PunchIn || firstPunch?.punch_in || firstPunch?.punch_time || '----';
          const punchOutTime = dayPunches.length > 1 
            ? (lastPunch?.out_time || lastPunch?.OUTTime || lastPunch?.PunchOut || lastPunch?.punch_out || lastPunch?.punch_time || lastPunch?.PunchIn || lastPunch?.in_time || '----') 
            : (firstPunch?.out_time || firstPunch?.OUTTime || firstPunch?.PunchOut || firstPunch?.punch_out || '----');

          const isToday = date === new Date().toLocaleDateString('en-CA') || date === new Date().toISOString().split('T')[0];
          return {
            ...firstPunch,
            punch_date: date,
            in_time: punchInTime,
            out_time: punchOutTime,
            in_location: firstPunch?.punchin_location || firstPunch?.in_location || firstPunch?.location || '----',
            out_location: dayPunches.length > 1 ? (lastPunch?.punchout_location || lastPunch?.out_location || lastPunch?.location || '----') : (firstPunch?.out_location || '----'),
            status: firstPunch?.status || (punchInTime !== '----' ? 'P' : 'ABSENT'),
            work_hrs: calculateWorkHours(punchInTime, punchOutTime !== '----' ? punchOutTime : null)
          };
        });

        setLogs(summaryLogs.filter(sl => sl !== null).sort((a, b) => new Date(b?.punch_date || 0) - new Date(a?.punch_date || 0)));
      } catch (err) { 
        console.error("Detail Fetch Error:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchEmployeeData();
  }, [id, user, endDate]); // Removed startDate dependency to keep historical count stable

  const getFilteredLogs = () => {
    // Filter the already fetched and grouped logs by the user-selected startDate
    return logs.filter(log => {
      if (startDate && log.punch_date < startDate) return false;
      if (endDate && log.punch_date > endDate) return false;

      if (statusFilter !== 'ALL') {
        const d = new Date(log.punch_date);
        const isSunday = d.getDay() === 0;
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        const dateDay = String(d.getDate()).padStart(2, '0');
        const dayMonth = `${month} ${dateDay}`;
        const holidays = ['Jan 01', 'Jan 26', 'Mar 04', 'Mar 19', 'Mar 21', 'Mar 26', 'Mar 31', 'Apr 03', 'May 01', 'May 27', 'Jun 26', 'Aug 15', 'Aug 26', 'Sep 04', 'Oct 02', 'Oct 20', 'Nov 08', 'Nov 24', 'Dec 25'];
        const isHoliday = holidays.includes(dayMonth);

        let resolvedStatus = String(log.status || (log.in_time && log.in_time !== '----' ? 'P' : 'ABSENT')).toUpperCase();
        if ((!log.in_time || log.in_time === '----') || resolvedStatus === 'A' || resolvedStatus === 'ABSENT') {
          if (isSunday) resolvedStatus = 'WO';
          else if (isHoliday) resolvedStatus = 'NH';
          else resolvedStatus = 'A';
        }
        
        const statusText = getFullStatusText(resolvedStatus, log.in_time, log.out_time, resolveWorkHrs(log));
        if (statusFilter === 'PRESENT' && !statusText.includes('Present') && !statusText.includes('In Office')) return false;
        if (statusFilter === 'ABSENT' && !statusText.includes('Absent')) return false;
        if (statusFilter === 'HALF DAY' && !statusText.includes('Half Day')) return false;
      }
      return true;
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const filteredLogs = getFilteredLogs();
    const empName = employee?.name || 'Employee';
    const today = formatToDDMMYYYY(new Date());

    // Format the selected date range for display
    const formatDateDisplay = (dateStr) => {
      return formatToDDMMYYYY(dateStr);
    };
    const dateRangeText = `${formatDateDisplay(startDate)}  →  ${formatDateDisplay(endDate)}`;

    // --- Header ---
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Record', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}`, 14, 30);


    // --- Employee Info ---
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Employee: ${empName}`, 14, 62);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Employee ID: #${id}  |  Total Records: ${filteredLogs.length}  |  Range: ${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`, 14, 70);

    // --- Table ---
    const tableData = filteredLogs.map(log => [
      log.punch_date ? formatToDDMMYYYY(log.punch_date) : 'N/A',
      log.in_time || '----',
      log.out_time || '----',
      resolveWorkHrs(log),
      log.status || (log.in_time !== '----' ? 'P' : 'A'),
      log.in_location || '----',
      log.out_location || '----'
    ]);

    autoTable(doc, {
      startY: 78,
      head: [['Date', 'Punch In', 'Punch Out', 'Work Hrs', 'Status', 'In Location', 'Out Location']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Attendance_${empName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}.pdf`);
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    const filteredLogs = getFilteredLogs();
    const empName = employee?.name || 'Employee';
    const headers = ['Employee Name', 'Employee ID', 'Date', 'Punch In', 'Punch Out', 'Work Hours', 'Status', 'In Location', 'Out Location'];
    const rows = filteredLogs.map(log => [
      empName,
      "'" + id,
      log.punch_date ? "'" + formatToDDMMYYYY(log.punch_date) : 'N/A',
      log.in_time || '----',
      log.out_time || '----',
      resolveWorkHrs(log),
      log.status || (log.in_time !== '----' ? 'P' : 'A'),
      log.in_location || '----',
      log.out_location || '----'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_${empName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const getStatusStyle = (status) => {
    const s = String(status || '').toUpperCase();
    if (s.includes('PRESENT') || s === 'P') return { color: '#059669', bg: '#ecfdf5', border: '#10b981' };
    if (s.includes('ABSENT')) return { color: '#dc2626', bg: '#fef2f2', border: '#ef4444' };
    return { color: '#312e81', bg: '#eef2ff', border: '#4338ca' };
  };

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      <main style={{ flex: 1, padding: winWidth < 768 ? '20px 16px 120px' : '40px 26px 120px', maxWidth: '100%', margin: '0 auto', width: '100%', boxSizing: 'border-box', marginTop: winWidth < 768 ? '85px' : '100px' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'flex-start', marginBottom: '32px', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 480 ? '12px' : '20px' }}>
            <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'white', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0f172a', transition: '0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', flexShrink: 0 }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}><ArrowLeft size={20} /></button>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '22px' : '32px', fontWeight: '950', color: '#0f172a', margin: '0', letterSpacing: '-0.5px' }}>
                {employee?.name || 'Employee'}
              </h1>
              <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ID: <span style={{ color: '#0f172a' }}>#{id}</span> • <span style={{ color: '#10b981' }}>Verified</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'center', marginBottom: '32px', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'white', borderRadius: '20px', border: '1.5px solid #f1f5f9' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} /></div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL LOGS</div>
                <div style={{ fontSize: '18px', fontWeight: '950', color: '#0f172a' }}>{getFilteredLogs().length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'white', borderRadius: '20px', border: '1.5px solid #f1f5f9' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={18} /></div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VERIFICATION</div>
                <div style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a' }}>Biometrics API</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', gap: '16px', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '6px 12px', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>From</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '800', color: '#1e293b', width: '100%', textAlign: 'right' }} />
              <div style={{ width: '1.5px', height: '14px', background: '#e2e8f0' }}></div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>To</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '800', color: '#1e293b', width: '100%', textAlign: 'right' }} />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '0 16px', fontSize: '13px', fontWeight: '800', color: '#1e293b', outline: 'none', cursor: 'pointer', height: '44px' }}
            >
              <option value="ALL">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="HALF DAY">Half Day</option>
            </select>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleExportPDF}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 20px', height: '44px', borderRadius: '14px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)', whiteSpace: 'nowrap' }}
              >
                <Download size={18} /> Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ background: winWidth < 768 ? 'transparent' : 'white', borderRadius: '32px', border: winWidth < 768 ? 'none' : '1.5px solid #f1f5f9', boxShadow: winWidth < 768 ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {winWidth < 768 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '24px' }}>
                  <div className="animate-spin" style={{ margin: '0 auto', width: '32px', height: '32px', border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%' }}></div>
                  <p style={{ marginTop: '16px', fontWeight: '700', color: '#64748b' }}>Loading records...</p>
                </div>
              ) : getFilteredLogs().length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
                   <AlertCircle size={40} color="#cbd5e1" style={{ margin: '0 auto' }} />
                   <p style={{ marginTop: '16px', color: '#64748b', fontWeight: '900' }}>No records found.</p>
                </div>
              ) : (
                getFilteredLogs().map((log, idx) => {
                  const punchIn = log.in_time || '----';
                  const punchOut = log.out_time || '----';
                  const workHrs = resolveWorkHrs(log);
                  const logDate = log.punch_date || log.created_at || log.date;
                  const d = new Date(logDate);
                  const dateStr = isNaN(d.getTime()) ? 'Invalid Date' : formatToDDMMYYYY(d);
                  
                  const isSunday = d.getDay() === 0;
                  const month = d.toLocaleDateString('en-US', { month: 'short' });
                  const dateDay = String(d.getDate()).padStart(2, '0');
                  const dayMonth = `${month} ${dateDay}`;
                  const holidays = ['Jan 01', 'Jan 26', 'Mar 04', 'Mar 19', 'Mar 21', 'Mar 26', 'Mar 31', 'Apr 03', 'May 01', 'May 27', 'Jun 26', 'Aug 15', 'Aug 26', 'Sep 04', 'Oct 02', 'Oct 20', 'Nov 08', 'Nov 24', 'Dec 25'];
                  const isHoliday = holidays.includes(dayMonth);

                  let resolvedStatus = String(log.status || (log.in_time !== '----' ? 'PRESENT' : 'ABSENT')).toUpperCase();
                  if ((!log.in_time || log.in_time === '----') || resolvedStatus === 'ABSENT') {
                    if (isSunday) resolvedStatus = 'WO';
                    else if (isHoliday) resolvedStatus = 'NH';
                    else resolvedStatus = 'ABSENT';
                  }

                  const statusText = getFullStatusText(resolvedStatus, log.in_time, log.out_time, workHrs);
                  const badgeStyle = getStatusBadgeStyle(statusText);

                  return (
                    <div key={idx} style={{ 
                      background: 'white', borderRadius: '24px', padding: '20px', 
                      border: '1.5px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f8fafc', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '950', color: '#1e293b' }}>{dateStr}</div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Attendance Log</div>
                          </div>
                        </div>
                        <div style={{ 
                          padding: '6px 14px', borderRadius: '100px', 
                          background: badgeStyle.bg, 
                          color: badgeStyle.color,
                          fontSize: '11px', fontWeight: '950', border: `1px solid ${badgeStyle.border}`
                        }}>
                          {statusText}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Punch In</div>
                          <div style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#3b82f6" /> {punchIn}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Punch Out</div>
                          <div style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#64748b" /> {punchOut}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '950', color: '#1e293b' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', marginRight: '4px' }}>DURATION:</span>
                          {workHrs} HRS
                        </div>
                        <div style={{ width: '1px', height: '16px', background: '#e2e8f0' }}></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <MapPin size={16} color="#94a3b8" title={`In: ${log.in_location || 'N/A'}`} />
                          <MapPin size={16} color="#cbd5e1" title={`Out: ${log.out_location || 'N/A'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #f1f5f9', background: '#fff' }}>
                  <th style={{ padding: '24px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EMPLOYEE</th>
                  <th style={{ padding: '24px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATE</th>
                  <th style={{ padding: '24px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PUNCH IN</th>
                  <th style={{ padding: '24px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PUNCH OUT</th>
                  <th style={{ padding: '24px 32px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WORK HRS</th>
                  <th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                  <th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch In Location</th>
                  <th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch Out Location</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>Loading records...</td></tr>
                ) : getFilteredLogs().length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>No records found for this period.</td></tr>
                ) : (
                  getFilteredLogs().map((log, idx) => {
                    const dateObj = new Date(log.punch_date || log.created_at || log.date);
                    
                    // Defensive check
                    if (isNaN(dateObj.getTime())) {
                      return (
                        <tr key={idx} style={{ borderBottom: '1.5px solid #f8fafc' }}>
                          <td colSpan="8" style={{ padding: '24px 32px', color: '#ef4444', fontWeight: '800' }}>
                            INVALID LOG DATA (ID: {idx})
                          </td>
                        </tr>
                      );
                    }
                    
                    const dateStr = formatToDDMMYYYY(dateObj);
                    
                    const statusInfo = getStatusStyle(log.status || (log.in_time !== '----' ? 'P' : 'ABSENT'));

                    return (
                      <tr key={idx} style={{ borderBottom: '1.5px solid #f8fafc', transition: '0.2s' }}>
                        <td style={{ padding: '24px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900' }}>
                              {String(employee?.name || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{employee?.name || log.user_name || 'Individual Employee'}</div>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>ID: {id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '24px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '800', color: '#475569' }}>
                            <Calendar size={18} color="#94a3b8" /> 
                            {(() => {
                              if (!log.punch_date) return 'N/A';
                              const dateStr = String(log.punch_date).split('T')[0];
                              const d = new Date(dateStr);
                              if (isNaN(d.getTime())) return dateStr;
                              const displayDate = formatToDDMMYYYY(d);
                              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                              return `${displayDate} (${dayName})`;
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: '24px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', color: '#3b82f6' }}>
                            <Clock size={18} color="#3b82f6" /> {log.in_time || '----'}
                          </div>
                        </td>
                        <td style={{ padding: '24px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>
                            <Clock size={18} color="#cbd5e1" /> {log.out_time || '----'}
                          </div>
                        </td>
                        <td style={{ padding: '24px 32px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b' }}>
                            {resolveWorkHrs(log)} <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Hours</span>
                          </div>
                        </td>
                        <td style={{ padding: '24px 32px' }}>
                          {(() => {
                            const logDate = log.punch_date || log.created_at || log.date;
                            const d = new Date(logDate);
                            
                            if (isNaN(d.getTime())) {
                               return <span style={{ color: '#ef4444' }}>ERR</span>;
                            }

                            const isSunday = d.getDay() === 0;
                            const month = d.toLocaleDateString('en-US', { month: 'short' });
                            const dateDay = String(d.getDate()).padStart(2, '0');
                            const dayMonth = `${month} ${dateDay}`;
                            const holidays = ['Jan 01', 'Jan 26', 'Mar 04', 'Mar 19', 'Mar 21', 'Mar 26', 'Mar 31', 'Apr 03', 'May 01', 'May 27', 'Jun 26', 'Aug 15', 'Aug 26', 'Sep 04', 'Oct 02', 'Oct 20', 'Nov 08', 'Nov 24', 'Dec 25'];
                            const isHoliday = holidays.includes(dayMonth);

                            let resolvedStatus = String(log.status || (log.in_time !== '----' ? 'P' : 'A')).toUpperCase();
                             
                            if ((!log.in_time || log.in_time === '----') || resolvedStatus === 'A' || resolvedStatus === 'ABSENT') {
                              if (isSunday) resolvedStatus = 'WO';
                              else if (isHoliday) resolvedStatus = 'NH';
                              else resolvedStatus = 'A';
                            }
                             
                            const statusText = getFullStatusText(resolvedStatus, log.in_time, log.out_time, resolveWorkHrs(log));
                            const badgeStyle = getStatusBadgeStyle(statusText);
 
                            return (
                              <div style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  padding: '6px 14px', 
                                  borderRadius: '100px', 
                                  background: badgeStyle.bg, 
                                  border: `1.5px solid ${badgeStyle.border}`,
                                  color: badgeStyle.color,
                                  fontSize: '11px',
                                  fontWeight: '900',
                                  whiteSpace: 'nowrap'
                                }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeStyle.dotBg }}></div>
                                  {statusText}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '24px 32px', fontSize: '12px', fontWeight: '700', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.in_location}>
                          {log.in_location || '----'}
                        </td>
                        <td style={{ padding: '24px 32px', fontSize: '12px', fontWeight: '700', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.out_location}>
                          {log.out_location || '----'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>


      </main>
      <AppFooter />
    </div>
  );
}
