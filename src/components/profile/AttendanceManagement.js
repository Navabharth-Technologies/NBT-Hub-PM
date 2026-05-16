import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, CheckCircle, Calendar, Clock, XCircle, Search, User, Check, X, Info, LogIn, LogOut, RefreshCw, MapPin, UserCheck, Coffee, AlertTriangle, Fingerprint, FileText, Table, ShieldCheck, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';

import { API_ENDPOINTS, TEAM_OFFICE_AUTH_TOKEN } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './PMDashboard.css';

export default function AttendanceManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [personalAttendance, setPersonalAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'raw'

  const [allEmployees, setAllEmployees] = useState([]);
  const [userLocation, setUserLocation] = useState(localStorage.getItem('savedUserLocation') || 'Fetching location...');
  const [isLocating, setIsLocating] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(localStorage.getItem('nbtAttendanceFromDate') || '2026-01-01');
  const [toDate, setToDate] = useState(() => {
    const saved = localStorage.getItem('nbtAttendanceToDate');
    const today = getTodayStr();
    return (saved && saved < today) ? today : (saved || today);
  });

  useEffect(() => {
    localStorage.setItem('nbtAttendanceFromDate', fromDate);
  }, [fromDate]);

  useEffect(() => {
    localStorage.setItem('nbtAttendanceToDate', toDate);
  }, [toDate]);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [showLateLoginsModal, setShowLateLoginsModal] = useState(false);
  const [showEarlyLogoutsModal, setShowEarlyLogoutsModal] = useState(false);
  const [lateLoginSearch, setLateLoginSearch] = useState('');
  const [earlyLogoutSearch, setEarlyLogoutSearch] = useState('');
  const [showHalfDaysModal, setShowHalfDaysModal] = useState(false);
  const [halfDaySearch, setHalfDaySearch] = useState('');
  const [showPunchEditModal, setShowPunchEditModal] = useState(false);
  const [punchEditData, setPunchEditData] = useState({ empId: '', empName: '', actualTime: '', newTime: '', date: new Date().toISOString().split('T')[0] });

  const [isPunchFetching, setIsPunchFetching] = useState(false);


  const handlePunchEditEmpChange = async (empId, dateOverride) => {
    const targetDate = dateOverride || punchEditData.date;
    const emp = allEmployees.find(e => String(e.id) === String(empId));
    setPunchEditData(prev => ({ ...prev, empId, empName: emp?.name || emp?.user_name || '', actualTime: 'Loading...', date: targetDate }));

    if (!empId) return;

    setIsPunchFetching(true);
    try {
      const url = `${API_ENDPOINTS.ATTENDANCE_LOGS_GET}?startDate=${targetDate}&endDate=${targetDate}&user_id=${empId}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await res.json();
      const logs = data?.data || data?.attendance || data?.logs || data || [];
      const empLogs = Array.isArray(logs) ? logs.filter(l => {
        const lid = String(l?.user_id || l?.Empcode || l?.EmpID || '');
        return lid === String(empId);
      }) : [];
      const log = empLogs[0];
      const actualTime = log?.in_time || log?.INTime || log?.PunchIn || log?.punch_time || 'Not Punched Yet';
      setPunchEditData(prev => ({ ...prev, actualTime }));
    } catch (e) {
      const todayStr = new Date().toISOString().split('T')[0];
      const log = (attendanceLogs || []).find(l => {
        const lDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0];
        return lDate === todayStr && String(l?.user_id || l?.Empcode || l?.EmpID || '') === String(empId);
      });
      const actualTime = log?.in_time || log?.INTime || log?.PunchIn || log?.punch_time || 'Not found';
      setPunchEditData(prev => ({ ...prev, actualTime }));
    } finally {
      setIsPunchFetching(false);
    }
  };

  const submitPunchInEdit = async () => {
    if (!punchEditData.empId || !punchEditData.newTime) {
      alert("Please select an employee and enter the new time.");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.ATTENDANCE_PUNCH_UPDATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: punchEditData.empId,
          EmpID: punchEditData.empId,
          in_time: punchEditData.newTime,
          punch_in: punchEditData.newTime,
          punch_date: punchEditData.date,
          date: punchEditData.date
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Punch-in time updated to ${punchEditData.newTime} for ${punchEditData.empName}!`);
        setShowPunchEditModal(false);
        setPunchEditData({ empId: '', empName: '', actualTime: '', newTime: '', date: new Date().toISOString().split('T')[0] });
        fetchAttendance();
      } else {
        alert(`Failed to update: ${data?.message || 'Server error'}`);
      }
    } catch (err) {
      alert('Network error. Please try again.');
      console.error('Punch-in update error:', err);
    }
  };


  const calculateElapsed = (startTimeStr) => {
    if (!startTimeStr || startTimeStr === '--:--' || startTimeStr === '----') return '00:00:00';
    try {
      const now = new Date();
      const parts = startTimeStr.split(' ');
      const time = parts[0];
      const modifier = parts[1];

      let [hours, minutes] = time.split(':');
      if (hours === '12' && modifier === 'AM') hours = '00';
      if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;

      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);

      const diff = now - startDate;
      if (diff < 0) return '00:00:00';

      const seconds = Math.floor((diff / 1000) % 60);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const hrs = Math.floor((diff / 1000 / 60 / 60));

      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch (e) {
      return '00:00:00';
    }
  };

  useEffect(() => {
    let interval;
    const isActive = personalAttendance?.in_time &&
      (!personalAttendance?.out_time ||
        personalAttendance?.out_time === '--:--' ||
        personalAttendance?.out_time === '----' ||
        personalAttendance?.out_time === '00:00');

    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime(calculateElapsed(personalAttendance?.in_time || personalAttendance?.INTime));
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => clearInterval(interval);
  }, [personalAttendance]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('savedUserLocation')) {
      getUserCurrentLocation();
    }
  }, []);

  useEffect(() => {
    if (user?.token) {
      fetch(API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllEmployees(data);
        })
        .catch(err => console.error("Error fetching users:", err));

      fetchAttendance();
    }
  }, [user, fromDate, toDate]);

  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const queryParams = new URLSearchParams({ startDate: fromDate, endDate: toDate });
      if (user?.department) queryParams.append('team', user.department);

      const logsUrl = `${(API_ENDPOINTS.ATTENDANCE_LOGS_GET || 'http://localhost:3000/api/attendance_logs')}?${queryParams.toString()}`;

      const logsRes = await fetch(logsUrl, {
        headers: {
          'Authorization': `Bearer ${user?.token || localStorage.getItem('token') || TEAM_OFFICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (logsRes.status === 401) {
        setAttendanceError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        return;
      }

      const logsData = await logsRes.json();
      const masterLogs = logsData.data || logsData.attendance || logsData.logs || logsData;

      if (Array.isArray(masterLogs)) {
        const validLogs = masterLogs.filter(l => l !== null);
        setAttendanceLogs(validLogs);

        const todayStr = new Date().toISOString().split('T')[0];
        const myTodayLogs = validLogs.filter(log => {
          let logDate = (log?.punch_date || log?.PunchDate || log?.date || log?.created_at || '').split('T')[0].split(' ')[0];
          // Handle DD-MM-YYYY or other formats
          if (logDate.includes('-') && logDate.split('-')[0].length !== 4) {
            const parts = logDate.split('-');
            if (parts.length === 3) logDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          const isToday = logDate === todayStr;
          const isMe = String(log?.user_id || log?.Empcode || log?.EmpID || '') === String(user?.id || '') || log?.email === user?.email;
          return isToday && isMe;
        }).sort((a, b) => new Date(a?.created_at || a?.punch_time || 0) - new Date(b?.created_at || b?.punch_time || 0));

        if (myTodayLogs.length > 0) {
          const firstLog = myTodayLogs[0];
          const lastLog = myTodayLogs[myTodayLogs.length - 1];

          const in_time = firstLog?.in_time || firstLog?.INTime || firstLog?.PunchIn || firstLog?.punch_time || firstLog?.PunchTime;
          let out_time = '----';

          if (lastLog && lastLog !== firstLog) {
            out_time = lastLog?.out_time || lastLog?.OUTTime || lastLog?.PunchOut || lastLog?.punch_time || lastLog?.PunchTime || '----';
          } else if (firstLog?.out_time && firstLog?.out_time !== '----') {
            out_time = firstLog.out_time;
          }

          setPersonalAttendance({
            ...firstLog,
            in_time: in_time && in_time !== '----' ? in_time : null,
            out_time: out_time || '----',
            PunchOut_location: lastLog?.out_location || lastLog?.PunchOut_location || lastLog?.location || firstLog?.out_location || '----'
          });
        } else {
          setPersonalAttendance(null);
        }
      }
      setAttendanceError(null);
    } catch (err) {
      if (!attendanceLogs.length) {
        setAttendanceError('Attendance system unreachable');
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsProcessing(true);
    try {
      let currentLoc = userLocation;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const locData = await locRes.json();

        currentLoc = locData.display_name || "Office Area";
        const lowerLoc = currentLoc.toLowerCase();
        if (lowerLoc.includes('navabharath') || lowerLoc.includes('chitrabhanu') || lowerLoc.includes('kuvempu nagara')) {
          currentLoc = "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023";
        }
        setUserLocation(currentLoc);
        localStorage.setItem('savedUserLocation', currentLoc);
      } catch (e) { console.log("Location refresh failed, using last known."); }

      const res = await fetch((API_ENDPOINTS.ATTENDANCE_LOGS_GET || '').split('/api/')[0] + '/api/attendance_logs/punch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'P', remark: 'WEB_PUNCH', location: currentLoc })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic update for immediate feedback
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        setPersonalAttendance(prev => ({
          ...prev,
          in_time: timeStr,
          out_time: '----',
          punch_date: now.toISOString()
        }));
        fetchAttendance();
      } else {
        alert(data.message || 'Check-in failed');
      }
    } catch (err) {
      alert('System error during check-in');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);
    try {
      let currentLoc = userLocation;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const locData = await locRes.json();

        currentLoc = locData.display_name || "Office Area";
        const lowerLoc = currentLoc.toLowerCase();
        if (lowerLoc.includes('navabharath') || lowerLoc.includes('chitrabhanu') || lowerLoc.includes('kuvempu nagara')) {
          currentLoc = "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023";
        }
        setUserLocation(currentLoc);
        localStorage.setItem('savedUserLocation', currentLoc);
      } catch (e) { console.log("Location refresh failed, using last known."); }

      const res = await fetch((API_ENDPOINTS.ATTENDANCE_LOGS_GET || '').split('/api/')[0] + '/api/attendance_logs/punch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token || localStorage.getItem('token') || TEAM_OFFICE_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'O',
          remark: 'MANUAL_WEB_OUT',
          location: currentLoc,
          punch_time: new Date().toLocaleTimeString('en-GB', { hour12: false })
        })
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic update for immediate feedback
        const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        setPersonalAttendance(prev => ({
          ...prev,
          out_time: timeStr
        }));
        fetchAttendance();
      } else {
        alert(data.message || 'Check-out failed');
      }
    } catch (err) {
      alert('System error during check-out');
    } finally {
      setIsProcessing(false);
    }
  };

  const getUserCurrentLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation("Location blocked");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          let locationName = data.display_name || "Office Area";

          if (locationName.toLowerCase().includes('navabharath') || locationName.toLowerCase().includes('chitrabhanu')) {
            locationName = "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023";
          }

          setUserLocation(locationName);
          localStorage.setItem('savedUserLocation', locationName);
        } catch (err) {
          setUserLocation("GPS Verified");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setUserLocation("GPS Permission Denied");
        setIsLocating(false);
      }
    );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const formatDate = (dateStr) => {
      if (!dateStr) return '----';
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        return String(dateStr).split('T')[0];
      }
    };

    const dateRangeDisplay = `${fromDate} to ${toDate}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Organization Attendance Report", 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${today} | Period: ${dateRangeDisplay}`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Total Records: ${attendanceLogs.length} | Departments: ${user?.department || 'Organization-wide'}`, 14, 38);

    const allLogs = [...(attendanceLogs || [])]
      .filter(l => l !== null)
      .sort((a, b) => new Date(b.punch_date || b.date || b.created_at).getTime() - new Date(a.punch_date || a.date || a.created_at).getTime());

    const rows = allLogs.map(log => {
      const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
      const emp = allEmployees.find(e => String(e.id).trim() === empId);

      return [
        formatDate(log.punch_date || log.date || log.created_at),
        emp?.name || emp?.user_name || log?.user_name || 'Employee',
        `#${empId || 'N/A'}`,
        log.in_time || log.INTime || '----',
        log.out_time || log.OUTTime || '----',
        log.work_time || log.work_hrs || '00:00',
        (log.in_time || log.INTime) ? (log.status || 'PRESENT') : 'ABSENT',
        log.punchin_location || log.in_location || log.PunchIn_location || log.location || '----',
        log.punchout_location || log.out_location || log.PunchOut_location || '----'
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Employee', 'ID', 'In Time', 'Out Time', 'Work Hrs', 'Status', 'In Location', 'Out Location']],
      body: rows,
      startY: 52,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 52 },
    });

    doc.save(`Workforce_Report_${fromDate}_to_${toDate}.pdf`);
    setShowExportDropdown(false);
  };

  const handleExportExcel = () => {
    const headers = ['Date', 'Employee', 'ID', 'In Time', 'Out Time', 'Work Hours', 'Status', 'In Location', 'Out Location'];

    const allLogs = [...(attendanceLogs || [])]
      .filter(l => l !== null)
      .sort((a, b) => new Date(b.punch_date || b.date || b.created_at).getTime() - new Date(a.punch_date || a.date || a.created_at).getTime());

    const rows = allLogs.map(log => {
      const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
      const emp = allEmployees.find(e => String(e.id).trim() === empId);
      const logDate = (log.punch_date || log.date || log.created_at || '').split('T')[0];

      return [
        logDate,
        emp?.name || emp?.user_name || log?.user_name || 'Employee',
        empId,
        log.in_time || log.INTime || '----',
        log.out_time || log.OUTTime || '----',
        log.work_time || log.work_hrs || '00:00',
        (log.in_time || log.INTime) ? (log.status || 'PRESENT') : 'ABSENT',
        log.punchin_location || log.in_location || log.PunchIn_location || log.location || '----',
        log.punchout_location || log.out_location || log.PunchOut_location || '----'
      ];
    });

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${fromDate}_to_${toDate}.csv`;
    a.click();
    setShowExportDropdown(false);
  };

  const calculateMetrics = () => {
    const totalCount = allEmployees.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = (attendanceLogs || []).filter(l => {
      let logDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0].split(' ')[0];
      if (logDate.includes('-') && logDate.split('-')[0].length !== 4) {
        const parts = logDate.split('-');
        if (parts.length === 3) logDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return logDate === todayStr;
    });
    const uniquePresentToday = new Set(todayLogs.map(l => String(l?.user_id || l?.Empcode || l?.EmpID || ''))).size;
    const presentCount = uniquePresentToday;

    const parseTimeStr = (tStr) => {
      if (!tStr || tStr === '----' || tStr === '--:--' || tStr.includes('00:00')) return -1;
      let s = String(tStr).trim();
      let isPM = s.toUpperCase().includes('PM');
      let isAM = s.toUpperCase().includes('AM');
      s = s.replace(/[^\d:]/g, '');
      let parts = s.split(':');
      if (parts.length < 2) return -1;
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return -1;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h * 60 + m;
    };

    const lateLogins = (attendanceLogs || []).filter(l => {
      const pIn = parseTimeStr(l?.in_time || l?.INTime || l?.PunchIn || l?.punch_time);
      if (pIn === -1) return false;
      return pIn > (9 * 60 + 30);
    });

    const halfDayLogs = (attendanceLogs || []).filter(l => {
      const pIn = parseTimeStr(l?.in_time || l?.INTime || l?.PunchIn || l?.punch_time);
      const pOut = parseTimeStr(l?.out_time || l?.OUTTime || l?.PunchOut || l?.punch_time_out || l?.out_time_biometric);
      if (pIn !== -1 && pIn > (13 * 60 + 30)) return true;
      if (pOut !== -1 && pOut > (14 * 60 + 30) && pOut < (17 * 60)) return true;
      return false;
    });

    const earlyLogouts = (attendanceLogs || []).filter(l => {
      const pOut = parseTimeStr(l?.out_time || l?.OUTTime || l?.PunchOut || l?.punch_time_out || l?.out_time_biometric);
      if (pOut === -1) return false;
      return pOut < (17 * 60);
    });

    return { total: totalCount, present: presentCount, halfDay: halfDayLogs.length, lateLogins, earlyLogouts, halfDayLogs };
  };

  const metrics = calculateMetrics();

  const displayedEmployees = allEmployees.filter(emp => {
    const s = searchTerm.toLowerCase();
    return (emp.name || emp.user_name || '').toLowerCase().includes(s) ||
      String(emp.id).toLowerCase().includes(s) ||
      (emp.role || '').toLowerCase().includes(s) ||
      (emp.department || '').toLowerCase().includes(s);
  });

  return (
    <div className="hr-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />

      <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 200px' : '120px 26px 110px', width: '100%', boxSizing: 'border-box', margin: '0' }}>
        <div style={{ width: '100%' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '20px' }}
          >
            <ArrowLeft size={18} color="#64748b" />
          </button>

          <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'flex-start', marginBottom: winWidth < 768 ? '24px' : '32px', gap: '20px' }}>
            <div style={{ textAlign: winWidth < 768 ? 'center' : 'left' }}>
              <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '950', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.8px' }}>Attendance Hub</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'center' : 'flex-start', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                Biometric Syncing: Operational
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>


              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexDirection: winWidth < 640 ? 'column' : 'row' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '4px 14px', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', height: '44px', width: winWidth < 640 ? '100%' : 'auto', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: '800', color: '#1e293b', width: '95px' }}
                    />
                  </div>

                  <div style={{ width: '1.5px', height: '16px', background: '#e2e8f0' }}></div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: '800', color: '#1e293b', width: '95px', textAlign: 'right' }}
                    />
                  </div>
                </div>

                <div ref={dropdownRef} style={{ position: 'relative', width: winWidth < 640 ? '100%' : 'auto' }}>
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)', width: '100%' }}
                  >
                    <Download size={18} /> Export
                  </button>

                  {showExportDropdown && (
                    <div style={{ position: 'absolute', top: '55px', right: 0, width: '200px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 15px 30px -10px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden', padding: '8px' }}>
                      <button onClick={handleExportPDF} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', color: '#1e293b', fontWeight: '800', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '10px', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <FileText size={18} color="#ef4444" /> Export as PDF
                      </button>
                      <button onClick={handleExportExcel} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', color: '#1e293b', fontWeight: '800', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '10px', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <Table size={18} color="#10b981" /> Export as Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>


          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: winWidth < 768 ? '20px' : '32px',
            marginBottom: '32px',
            border: '1.5px solid #f1f5f9',
            boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: winWidth < 1024 ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: winWidth < 1024 ? 'stretch' : 'center',
            gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 480 ? '12px' : '24px' }}>
              <div
                onClick={getUserCurrentLocation}
                style={{
                  width: winWidth < 768 ? '44px' : '56px',
                  height: winWidth < 768 ? '44px' : '56px',
                  borderRadius: '16px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #bae6fd',
                  cursor: 'pointer',
                  transition: '0.3s',
                  flexShrink: 0
                }}
              >
                <MapPin size={winWidth < 768 ? 22 : 28} className={isLocating ? 'animate-bounce' : ''} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: winWidth < 768 ? '17px' : '20px', fontWeight: '950', color: '#0f172a', marginBottom: '1px' }}>Shift Status</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '10px', fontWeight: '950', color: (personalAttendance?.in_time && personalAttendance.in_time !== '----') ? '#16a34a' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    {(personalAttendance?.in_time && personalAttendance.in_time !== '----') ? 'In Office' : 'Offline'}
                  </div>
                  {(personalAttendance?.in_time && personalAttendance.in_time !== '----') && (
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#1e293b' }}>
                      Punch in: {personalAttendance.in_time}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', maxWidth: '100%' }}>
                  <MapPin size={11} color="#cbd5e1" /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isLocating ? 'Locating...' : (userLocation || 'Location required')}</span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: winWidth < 768 ? '15px' : '32px',
              flexDirection: winWidth < 480 ? 'column' : 'row',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#f8fafc',
                padding: '8px 14px',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                width: winWidth < 480 ? '100%' : 'auto'
              }}>
                <div style={{
                  width: '38px',
                  height: '40px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <div style={{ background: '#ef4444', height: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: '950', color: 'white' }}>
                    {new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '950', color: '#1e293b' }}>
                    {new Date().getDate()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</div>
                </div>
              </div>

              {personalAttendance?.in_time && (!personalAttendance?.out_time || personalAttendance?.out_time === '--:--' || personalAttendance?.out_time === '----' || personalAttendance?.out_time === '00:00' || personalAttendance?.out_time === '00:00:00') && (
                <div style={{ textAlign: winWidth < 480 ? 'center' : 'right', minWidth: winWidth < 480 ? '100%' : '140px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Session</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace' }}>{elapsedTime}</div>
                </div>
              )}

              <div style={{ width: winWidth < 480 ? '100%' : 'auto' }}>
                {!(personalAttendance?.in_time && personalAttendance.in_time !== '----') ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={isProcessing}
                    style={{
                      width: winWidth < 480 ? '100%' : 'auto',
                      padding: '14px 32px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '950',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
                      transition: 'all 0.3s'
                    }}
                  >
                    <Fingerprint size={20} /> {isProcessing ? '...' : 'PUNCH IN'}
                  </button>
                ) : (!personalAttendance.out_time || personalAttendance.out_time === '--:--' || personalAttendance.out_time === '----' || personalAttendance?.out_time === '00:00' || personalAttendance?.out_time === '00:00:00') ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={isProcessing}
                    style={{
                      width: winWidth < 480 ? '100%' : 'auto',
                      padding: '14px 32px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #be123c 100%)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '950',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
                      transition: 'all 0.3s'
                    }}
                  >
                    <LogOut size={20} /> {isProcessing ? '...' : 'PUNCH OUT'}
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    color: '#475569',
                    fontWeight: '950',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <ShieldCheck size={20} color="#64748b" /> SHIFT CLOSED
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? 'repeat(2, 1fr)' : (winWidth < 1200 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)'), gap: winWidth < 768 ? '12px' : '20px', marginBottom: '40px' }}>
            {[
              { label: 'PRESENT', value: metrics.present, icon: UserCheck, color: '#059669', bg: '#ecfdf5' },

              { label: 'HALF DAYS', value: metrics.halfDay, icon: Clock, color: '#f97316', bg: '#fff7ed' },
              { label: 'Early logout', value: metrics.earlyLogouts.length, icon: Coffee, color: '#3b82f6', bg: '#eff6ff', isEarlyAction: true },
              { label: 'Late Login', value: metrics.lateLogins.length, icon: Sparkles, color: '#7c3aed', bg: '#f5f3ff', isLateAction: true },
              { label: 'Punch-in Edit', value: 'EDIT', icon: AlertTriangle, color: '#db2777', bg: '#fdf2f8', isAction: true }
            ].map((m, i) => (
              <div
                key={i}
                onClick={() => {
                  if (m.isAction) setShowPunchEditModal(true);
                  else if (m.isLateAction) setShowLateLoginsModal(true);
                  else if (m.isEarlyAction) setShowEarlyLogoutsModal(true);
                  else if (m.label === 'HALF DAYS') setShowHalfDaysModal(true);
                  else if (m.isLeaveAction) navigate('/leaves');
                }}
                style={{ background: 'white', padding: winWidth < 768 ? '16px' : '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', cursor: (m.isAction || m.isLateAction || m.isEarlyAction || m.isLeaveAction || m.label === 'HALF DAYS') ? 'pointer' : 'default', transition: 'all 0.2s' }}
                onMouseOver={e => (m.isAction || m.isLateAction || m.isEarlyAction || m.isLeaveAction || m.label === 'HALF DAYS') ? (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)') : null}
                onMouseOut={e => (m.isAction || m.isLateAction || m.isEarlyAction || m.isLeaveAction || m.label === 'HALF DAYS') ? (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.01)') : null}
              >
                <div style={{ width: winWidth < 768 ? '38px' : '48px', height: winWidth < 768 ? '38px' : '48px', borderRadius: '12px', background: m.bg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><m.icon size={winWidth < 768 ? 18 : 22} /></div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                  <div style={{ fontSize: winWidth < 768 ? '18px' : '24px', fontWeight: '950', color: '#1e293b' }}>{m.value}</div>
                </div>
              </div>
            ))}
          </div>

          {attendanceError && (
            <div style={{ padding: '16px', background: '#fef2f2', border: '1.5px solid #fee2e2', borderRadius: '12px', color: '#dc2626', fontSize: '14px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={18} /> {attendanceError}
            </div>
          )}

          <div style={{ display: 'flex', gap: winWidth < 600 ? '12px' : '24px', borderBottom: '1.5px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button 
              onClick={() => setViewMode('summary')}
              style={{ padding: '0 0 12px 0', background: 'transparent', border: 'none', borderBottom: '3px solid #1d4ed8', color: '#1d4ed8', fontWeight: '800', fontSize: winWidth < 600 ? '12px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            > 
              Daily Summary 
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'center', marginBottom: '24px', gap: '16px' }}>
            <div style={{ position: 'relative', width: winWidth < 1024 ? '100%' : '320px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input type="text" placeholder="Filter employee, role or department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', outline: 'none', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }} />
            </div>
          </div>

          <section style={{ background: winWidth < 768 ? 'transparent' : 'white', borderRadius: '24px', border: winWidth < 768 ? 'none' : '1.5px solid #f1f5f9', boxShadow: winWidth < 768 ? 'none' : '0 4px 20px -5px rgba(0,0,0,0.02)', overflowX: winWidth < 768 ? 'hidden' : 'auto' }}>
            {winWidth < 768 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {displayedEmployees.length > 0 ? (
                  displayedEmployees.map((emp, idx) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const dayLogsForEmp = (attendanceLogs || [])
                      .filter(l => {
                        if (!l) return false;
                        const logUserId = String(l?.user_id || l?.Empcode || l?.EmpID || '').trim();
                        const empId = String(emp?.id || '').trim();
                        return empId && logUserId && (logUserId === empId);
                      })
                      .sort((a, b) => {
                        const getT = x => new Date(x?.created_at || x?.punch_time || 0).getTime();
                        return getT(b) - getT(a);
                      });
                    
                    const log = dayLogsForEmp[0]; // Latest log for basic info
                    const firstLogForDay = dayLogsForEmp[dayLogsForEmp.length - 1];
                    const lastLogForDay = dayLogsForEmp.length > 1 ? dayLogsForEmp[0] : null;

                    const todayLog = (attendanceLogs || []).find(l => {
                      if (!l) return false;
                      const logUserId = String(l?.user_id || l?.Empcode || l?.EmpID || '').trim();
                      const empId = String(emp?.id || '').trim();
                      let logDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0].split(' ')[0];
                      if (logDate.includes('-') && logDate.split('-')[0].length !== 4) {
                        const p = logDate.split('-');
                        if (p.length === 3) logDate = `${p[2]}-${p[1]}-${p[0]}`;
                      }
                      return empId && logUserId && logUserId === empId && logDate === todayStr;
                    });

                    const isMultiLog = (attendanceLogs || []).filter(l => {
                      if (!l) return false;
                      const logUserId = String(l?.user_id || l?.Empcode || l?.EmpID || '').trim();
                      const empId = String(emp?.id || '').trim();
                      let logDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0].split(' ')[0];
                      if (logDate.includes('-') && logDate.split('-')[0].length !== 4) {
                        const p = logDate.split('-');
                        if (p.length === 3) logDate = `${p[2]}-${p[1]}-${p[0]}`;
                      }
                      return empId && logUserId && (logUserId === empId) && (logDate === todayStr);
                    }).length > 1;

                    const punchIn = firstLogForDay?.in_time || firstLogForDay?.INTime || firstLogForDay?.PunchIn || firstLogForDay?.punch_time || '----';
                    const punchOut = (todayLog || (isMultiLog && lastLogForDay)) ? (lastLogForDay?.out_time || lastLogForDay?.OUTTime || lastLog?.PunchOut || lastLogForDay?.punch_time || lastLogForDay?.PunchIn || lastLogForDay?.in_time || '----') : '----';
                    
                    // Manual work time calculation if missing
                    let workHrs = log?.work_time || log?.work_hrs || log?.WorkTime;
                    if ((!workHrs || workHrs === '00:00') && punchIn !== '----' && punchOut !== '----') {
                      const parse = (t) => {
                        const s = String(t).replace(/[^\d:]/g, '');
                        const [h, m] = s.split(':').map(Number);
                        return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
                      };
                      const start = parse(punchIn);
                      const end = parse(punchOut);
                      if (start !== null && end !== null && end > start) {
                        const diff = end - start;
                        workHrs = `${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`;
                      }
                    }
                    if (!workHrs) workHrs = '00:00';
                    const pDate = log?.punch_date || log?.date || log?.created_at;

                    return (
                      <div key={idx} style={{ background: 'white', borderRadius: '24px', padding: '20px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '950' }}>
                            {String(emp.name || emp.user_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div
                            onClick={() => navigate(`/attendance/detail/${emp.id}`)}
                            style={{ flex: 1, cursor: 'pointer' }}
                          >
                            <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{emp.name || emp.user_name || 'Unknown'}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>#{emp.id} • {emp.role || 'Employee'}</div>
                          </div>
                          <button
                            onClick={() => navigate(`/attendance/detail/${emp.id}`)}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#3b82f6' }}
                          >
                            <Info size={18} />
                          </button>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '0 -20px 16px' }}></div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Date</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{pDate ? new Date(pDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '----'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Hours</div>
                            <div style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b' }}>
                              {workHrs?.replace(/\s:\s/g, ':') || '00:00'} <span style={{ fontSize: '10px', color: '#94a3b8' }}>HRS</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Punch In</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{punchIn}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Punch Out</div>
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{punchOut}</div>
                          </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Remark</div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            {log?.remarks || log?.rm_remarks || log?.pm_remarks || '-'}
                          </div>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '0 -20px 16px' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', fontWeight: '700', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={12} /> {log?.in_location || log?.location || '----'}
                          </div>
                          {(() => {
                            const todayPunchIn = todayLog?.in_time || todayLog?.INTime || todayLog?.PunchIn || todayLog?.punch_time;
                            const today = new Date();
                            const isSunday = today.getDay() === 0;
                            const month = today.toLocaleDateString('en-US', { month: 'short' });
                            const dateDay = String(today.getDate()).padStart(2, '0');
                            const dayMonth = `${month} ${dateDay}`;
                            const holidays = ['Jan 01', 'Jan 26', 'Mar 04', 'Mar 19', 'Mar 21', 'Mar 26', 'Mar 31', 'Apr 03', 'May 01', 'May 27', 'Jun 26', 'Aug 15', 'Aug 26', 'Sep 04', 'Oct 02', 'Oct 20', 'Nov 08', 'Nov 24', 'Dec 25'];
                            const isHoliday = holidays.includes(dayMonth);

                            const hasValidPunchIn = todayPunchIn && todayPunchIn !== '----' && todayPunchIn !== '--:--' && todayPunchIn !== '00:00';
                            let rawStatus = hasValidPunchIn ? 'Present' : 'Absent';
                            if (!hasValidPunchIn) {
                              if (isSunday) rawStatus = 'WO';
                              else if (isHoliday) rawStatus = 'NH';
                              else rawStatus = 'Absent';
                            }

                            const isPresent = rawStatus.toUpperCase().includes('PRESENT');
                            const isWO = rawStatus === 'WO';
                            const isNH = rawStatus === 'NH';

                            return (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 14px',
                                borderRadius: '100px',
                                background: isPresent ? '#f0fdf4' : (isWO || isNH ? '#eff6ff' : '#fef2f2'),
                                border: `1.5px solid ${isPresent ? '#bbf7d0' : (isWO || isNH ? '#dbeafe' : '#fee2e2')}`,
                                color: isPresent ? '#16a34a' : (isWO || isNH ? '#3b82f6' : '#ef4444'),
                                fontWeight: '950'
                              }}>
                                {rawStatus}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
                    <p style={{ color: '#64748b', fontWeight: '900' }}>No matching records found.</p>
                  </div>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Employee</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch In</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch Out</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Hrs</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>IN Location</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>OUT Location</th></tr>
                </thead>
                <tbody>
                  {displayedEmployees.length > 0 ? (
                    displayedEmployees.map((emp, idx) => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const logsForEmp = (attendanceLogs || [])
                        .filter(l => {
                          if (!l) return false;
                          const logId = String(l?.user_id || l?.Empcode || l?.EmpID || l?.userId || l?.UserId || '').trim();
                          const empId = String(emp?.id || '').trim();
                          let logDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0].split(' ')[0];
                          if (logDate.includes('-') && logDate.split('-')[0].length !== 4) {
                            const parts = logDate.split('-');
                            if (parts.length === 3) logDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                          }
                          return empId && logId && (logId === empId) && (logDate >= fromDate && logDate <= toDate);
                        })
                        .sort((a, b) => new Date(a?.created_at || a?.punch_time) - new Date(b?.created_at || b?.punch_time));

                      // 1. Group logs by date to prevent cross-day data leaking
                      const groupedByDate = (logsForEmp || []).reduce((acc, log) => {
                        let d = (log.punch_date || log.date || log.created_at || '').split('T')[0].split(' ')[0];
                        // Normalize format for grouping consistency
                        if (d.includes('-') && d.split('-')[0].length !== 4) {
                          const p = d.split('-');
                          if (p.length === 3) d = `${p[2]}-${p[1]}-${p[0]}`;
                        }
                        if (d && d !== '----') {
                          if (!acc[d]) acc[d] = [];
                          acc[d].push(log);
                        }
                        return acc;
                      }, {});

                      // 2. Get the latest date available in the range for this employee
                      const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
                      const latestDate = dates[0];
                      const latestDayLogs = groupedByDate[latestDate] || [];

                      // 3. Sort logs within THAT day only
                      const sortedDayLogs = latestDayLogs.sort((a, b) => new Date(a.created_at || a.punch_time) - new Date(b.created_at || b.punch_time));

                      const firstLog = sortedDayLogs[0];
                      const lastLog = sortedDayLogs.length > 1 ? sortedDayLogs[sortedDayLogs.length - 1] : null;

                      const log = firstLog ? {
                        ...firstLog,
                        punch_date: latestDate,
                        in_time: firstLog?.in_time || firstLog?.INTime || firstLog?.PunchIn || firstLog?.punch_time || '----',
                        out_time: (latestDate === todayStr && sortedDayLogs.length === 1) ? '----' : (lastLog?.out_time || lastLog?.OUTTime || lastLog?.PunchOut || lastLog?.punch_time || lastLog?.PunchIn || lastLog?.in_time || '----'),
                        in_location: firstLog?.punchin_location || firstLog?.in_location || '----',
                        out_location: (latestDate === todayStr && sortedDayLogs.length === 1) ? '----' : (lastLog?.punchout_location || lastLog?.out_location || lastLog?.in_location || lastLog?.location || '----'),
                        work_hrs: (latestDate === todayStr && sortedDayLogs.length === 1) ? '00:00' : (lastLog?.work_hrs || firstLog?.work_hrs || '00:00')
                      } : null;

                      const getCleanAttendance = (record) => {
                        if (!record) return { displayInTime: '----', displayOutTime: '----', displayWorkTime: '00:00' };
                        const today = new Date().toISOString().split('T')[0];
                        const recordDate = record?.punch_date || '';
                        const isToday = recordDate === today;
                        const isMissing = (t) => !t || t === '--:--' || t === '00:00' || t === 'null' || t === '----';
                        
                        const rawIn = record?.in_time;
                        const rawOut = record?.out_time;
                        let rawWork = record?.work_hrs;

                        // Manual calculation fallback for work hours
                        if ((!rawWork || rawWork === '00:00') && !isMissing(rawIn) && !isMissing(rawOut)) {
                          const parse = (t) => {
                            const s = String(t).replace(/[^\d:]/g, '');
                            const [h, m] = s.split(':').map(Number);
                            return (isNaN(h) || isNaN(m)) ? null : h * 60 + m;
                          };
                          const start = parse(rawIn);
                          const end = parse(rawOut);
                          if (start !== null && end !== null && end > start) {
                            const diff = end - start;
                            rawWork = `${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`;
                          }
                        }

                        return {
                          displayInTime: isMissing(rawIn) ? '----' : rawIn,
                          displayOutTime: (isToday && sortedDayLogs.length < 2) || isMissing(rawOut) ? '----' : rawOut,
                          displayWorkTime: (isToday && sortedDayLogs.length < 2) || isMissing(rawWork) ? '00:00' : (rawWork || '00:00')
                        };
                      };
                      const cleanLog = getCleanAttendance(log);


                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                          <td
                            onClick={() => navigate(`/attendance/detail/${emp.id}`)}
                            style={{ padding: '20px', fontWeight: '800', color: '#1e293b', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '950' }}>
                                {String(emp?.name || emp?.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span style={{ borderBottom: '1px solid transparent' }} onMouseOver={e => e.currentTarget.style.borderBottom = '1px solid #1e293b'} onMouseOut={e => e.currentTarget.style.borderBottom = '1px solid transparent'}>
                                {emp?.name || emp?.user_name || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '20px', fontWeight: '700', color: '#64748b' }}>#{emp?.id}</td>
                          <td style={{ padding: '20px', fontWeight: '700', color: '#475569' }}>
                            {(() => {
                              const dateStr = log ? (log.punch_date || log.date || '').split('T')[0] : (fromDate === toDate ? fromDate : '----');
                              if (dateStr === '----' || !dateStr) return dateStr;
                              const d = new Date(dateStr);
                              if (isNaN(d.getTime())) return dateStr;
                              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                              return `${dateStr} (${dayName})`;
                            })()}
                          </td>
                          <td style={{ padding: '20px', fontWeight: '900', color: '#1e293b' }}>
                            {cleanLog.displayInTime}
                          </td>
                          <td style={{ padding: '20px', fontWeight: '900', color: '#1e293b' }}>
                            {cleanLog.displayOutTime}
                          </td>
                          <td style={{ padding: '20px', fontWeight: '800', color: '#6366f1' }}>
                            {cleanLog.displayWorkTime}
                          </td>
                          <td style={{ padding: '20px' }}>
                            <div style={{
                              display: 'inline-flex',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: (log && cleanLog.displayInTime !== '----') ? '#f0fdf4' : '#fef2f2',
                              color: (log && cleanLog.displayInTime !== '----') ? '#16a34a' : '#ef4444',
                              fontSize: '11px',
                              fontWeight: '950'
                            }}>
                              {(log && cleanLog.displayInTime !== '----') ? 'Present' : 'Absent'}
                            </div>
                          </td>
                          <td style={{ padding: '20px', fontSize: '12px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log?.in_location || '----'}>
                            {log?.in_location || '----'}
                          </td>
                          <td style={{ padding: '20px', fontSize: '12px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log?.out_location || '----'}>
                            {log?.out_location || '----'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '800' }}>
                        Loading.....
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        </div>



        {/* Late Logins Modal */}
        {showLateLoginsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', position: 'relative', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setShowLateLoginsModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s' }}>✕</button>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Sparkles size={24} /></div>
                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0' }}>Late Login Reports</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Employees logged in after 09:30 today.</p>
              </div>

              {/* Filter Controls Start Here */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search by ID, Name or Role..."
                    value={lateLoginSearch}
                    onChange={(e) => setLateLoginSearch(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #eef2f6', background: 'white', boxSizing: 'border-box', outline: 'none', fontSize: '13px', fontWeight: '700' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #eef2f6', outline: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #eef2f6', outline: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}
                  />
                </div>
              </div>
              {/* Filter Controls End Here */}

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {(() => {
                  const pool = lateLoginSearch
                    ? metrics.lateLogins.filter(log => {
                      const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
                      const emp = allEmployees.find(e => String(e.id).trim() === empId);
                      const s = lateLoginSearch.toLowerCase();
                      return empId.toLowerCase().includes(s) ||
                        (emp?.name || log?.user_name || '').toLowerCase().includes(s) ||
                        (emp?.role || '').toLowerCase().includes(s);
                    })
                    : metrics.lateLogins;
                  return pool.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pool.map((log, idx) => {
                        const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
                        const emp = allEmployees.find(e => String(e.id).trim() === empId);
                        const logDate = (log?.punch_date || log?.date || log?.created_at || '').split('T')[0];
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '950' }}>
                                {String(emp?.name || log?.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{emp?.name || log?.user_name || 'Unknown'}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: #{empId} {logDate ? `· ${logDate}` : ''}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: '950', color: '#ef4444' }}>{String(log.in_time || log.INTime || log.PunchIn || log.punch_time || '----').trim()}</div>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Punch In</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <p style={{ fontWeight: '800' }}>{lateLoginSearch ? `No records found for "${lateLoginSearch}"` : 'No late logins in selected range. 🎉'}</p>
                    </div>
                  );
                })()}
              </div>

              <button onClick={() => setShowLateLoginsModal(false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Close Report</button>
            </div>
          </div>
        )}
        {/* Early Logouts Modal */}
        {showEarlyLogoutsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', position: 'relative', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setShowEarlyLogoutsModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s' }}>✕</button>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Coffee size={24} /></div>
                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0' }}>Early Logout Reports</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Employees logged out before 17:00 (5 PM) today.</p>
              </div>

              {/* Filter Controls Start Here */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search by ID, Name or Role..."
                    value={earlyLogoutSearch}
                    onChange={(e) => setEarlyLogoutSearch(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #eef2f6', background: 'white', boxSizing: 'border-box', outline: 'none', fontSize: '13px', fontWeight: '700' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #eef2f6', outline: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #eef2f6', outline: 'none', background: 'white', fontSize: '13px', fontWeight: '700', color: '#1e293b' }}
                  />
                </div>
              </div>
              {/* Filter Controls End Here */}

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {(() => {
                  const pool = earlyLogoutSearch
                    ? metrics.earlyLogouts.filter(log => {
                      const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
                      const emp = allEmployees.find(e => String(e.id).trim() === empId);
                      const s = earlyLogoutSearch.toLowerCase();
                      return empId.toLowerCase().includes(s) ||
                        (emp?.name || log?.user_name || '').toLowerCase().includes(s) ||
                        (emp?.role || '').toLowerCase().includes(s);
                    })
                    : metrics.earlyLogouts;
                  return pool.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pool.map((log, idx) => {
                        const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
                        const emp = allEmployees.find(e => String(e.id).trim() === empId);
                        const logDate = (log?.punch_date || log?.date || log?.created_at || '').split('T')[0];
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '950' }}>
                                {String(emp?.name || log?.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{emp?.name || log?.user_name || 'Unknown'}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: #{empId} {logDate ? `· ${logDate}` : ''}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: '950', color: '#3b82f6' }}>{String(log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric || '----').trim()}</div>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Punch Out</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <p style={{ fontWeight: '800' }}>{earlyLogoutSearch ? `No records found for "${earlyLogoutSearch}"` : 'No early logouts in selected range. 🏢'}</p>
                    </div>
                  );
                })()}
              </div>

              <button onClick={() => setShowEarlyLogoutsModal(false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Close Report</button>
            </div>
          </div>
        )}

        {/* Half Days Modal */}
        {showHalfDaysModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', position: 'relative', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setShowHalfDaysModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s' }}>✕</button>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Clock size={24} /></div>
                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0' }}>Half Day Reports</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>In: {'>'}13:30 OR Out: 14:30-17:00</p>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search ID, Name or Role..."
                    value={halfDaySearch}
                    onChange={(e) => setHalfDaySearch(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #eef2f6', background: 'white', boxSizing: 'border-box', outline: 'none', fontSize: '13px', fontWeight: '700' }}
                  />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {(() => {
                  const pool = halfDaySearch
                    ? metrics.halfDayLogs.filter(log => {
                      const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
                      const emp = allEmployees.find(e => String(e.id).trim() === empId);
                      const s = halfDaySearch.toLowerCase();
                      return empId.toLowerCase().includes(s) ||
                        (emp?.name || log?.user_name || '').toLowerCase().includes(s) ||
                        (emp?.role || '').toLowerCase().includes(s);
                    })
                    : metrics.halfDayLogs;
                  return pool.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pool.map((log, idx) => {
                        const empId = String(log?.user_id || log?.Empcode || log?.EmpID || '').trim();
                        const emp = allEmployees.find(e => String(e.id).trim() === empId);
                        const logDate = (log?.punch_date || log?.date || log?.created_at || '').split('T')[0];
                        const pIn = String(log.in_time || log.INTime || log.PunchIn || log.punch_time || '----').trim();
                        const pOut = String(log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric || '----').trim();

                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '950' }}>
                                {String(emp?.name || log?.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{emp?.name || log?.user_name || 'Unknown'}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: #{empId} {logDate ? `· ${logDate}` : ''}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '13px', fontWeight: '950', color: '#f97316' }}>{pIn} - {pOut}</div>
                              <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Punch In / Out</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <p style={{ fontWeight: '800' }}>{halfDaySearch ? `No records for "${halfDaySearch}"` : 'No half days in selected range. ☀️'}</p>
                    </div>
                  );
                })()}
              </div>

              <button onClick={() => setShowHalfDaysModal(false)} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Close Report</button>
            </div>
          </div>
        )}

        {showPunchEditModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', position: 'relative' }}>
              <button onClick={() => setShowPunchEditModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s' }}>✕</button>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><AlertTriangle size={24} /></div>
                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0' }}>Edit Punch-In Time</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Modify the arrival log for selected date.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 1: Select Employee</label>
                  <select value={punchEditData.empId} onChange={(e) => handlePunchEditEmpChange(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Choose an employee...</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name || emp.user_name} ({emp.role || 'Member'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 2: Select Date</label>
                  <input type="date" value={punchEditData.date} onChange={(e) => handlePunchEditEmpChange(punchEditData.empId, e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual Punch-In</label>
                  <input type="text" readOnly value={punchEditData.actualTime || '--:--'} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f1f5f9', fontSize: '15px', fontWeight: '900', color: '#64748b', outline: 'none', opacity: 0.8 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Punch-In Time</label>
                  <input type="time" value={punchEditData.newTime} onChange={(e) => setPunchEditData({ ...punchEditData, newTime: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #fbcfe8', background: '#fff1f2', fontSize: '15px', fontWeight: '900', color: '#be185d', outline: 'none', cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setShowPunchEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={submitPunchInEdit} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #db2777 0%, #9d174d 100%)', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(219, 39, 119, 0.3)' }}>Update Time</button>
              </div>
            </div>
          </div>
        )}




      </main>
      <AppFooter />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .hr-dashboard-container main { animation: fadeIn 0.4s ease-out; }
        .glow-button-primary:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(15, 23, 42, 0.5); }
        .glow-button-success:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.5); }
      `}</style>
    </div>
  );
}