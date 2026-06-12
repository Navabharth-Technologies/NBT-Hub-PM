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

const parseLogDate = (log) => {
  const rawDate = log?.punch_date || log?.PunchDate || log?.date || log?.created_at || '';
  if (!rawDate) return '';
  const dateStr = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    if (dateStr.includes('T') || dateStr.includes(' ')) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) { }
    }
    return dateStr.split('T')[0].split(' ')[0];
  }
  const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;
  const match = dateStr.match(dmyRegex);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) { }
  return '';
};

const parseTime = (timeStr, baseDate = new Date()) => {
  if (!timeStr || timeStr === '----' || timeStr === '--:--' || timeStr === '00:00' || timeStr === '00:00:00') return null;
  try {
    const cleanStr = String(timeStr).trim();
    const isPM = cleanStr.toUpperCase().includes('PM');
    const isAM = cleanStr.toUpperCase().includes('AM');

    const timeOnly = cleanStr.replace(/[^\d:]/g, '');
    const parts = timeOnly.split(':');
    if (parts.length < 2) return null;

    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    let seconds = parts[2] ? parseInt(parts[2], 10) : 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const d = new Date(baseDate);
    d.setHours(hours, minutes, seconds, 0);
    return d;
  } catch (e) {
    return null;
  }
};

const getWorkHrs = (inTime, outTime, recordDate) => {
  const isMissing = (t) => !t || t === '--:--' || t === '00:00' || t === 'null' || t === '----';
  if (isMissing(inTime)) return '00:00';

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const cleanRecordDate = parseLogDate({ punch_date: recordDate });
  const isToday = cleanRecordDate === todayStr;

  const inDate = parseTime(inTime);
  if (!inDate) return '00:00';

  let outDate = null;
  if (!isMissing(outTime)) {
    outDate = parseTime(outTime);
  }

  if (!outDate) {
    if (isToday) {
      const now = new Date();
      const diffMs = now - inDate;
      if (diffMs <= 0) return '00:00';
      const diffMins = Math.floor(diffMs / 60000);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      return '00:00';
    }
  }

  const diffMs = outDate - inDate;
  if (diffMs <= 0) return '00:00';
  const diffMins = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [allEmployees, setAllEmployees] = useState([]);
  const [userLocation, setUserLocation] = useState(localStorage.getItem('savedUserLocation') || 'Fetching location...');
  const [isLocating, setIsLocating] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const dropdownRef = useRef(null);
  const getTodayStr = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };
  const [fromDate, setFromDate] = useState(() => getTodayStr());
  const [toDate, setToDate] = useState(() => getTodayStr());

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
  const [showPunchOutEditModal, setShowPunchOutEditModal] = useState(false);
  const [punchOutEditData, setPunchOutEditData] = useState({ empId: '', empName: '', actualTime: '', newTime: '', date: new Date().toISOString().split('T')[0] });

  const [alertState, setAlertState] = useState({ show: false, message: '' });

  useEffect(() => {
    const hasActiveModal = showLateLoginsModal || showEarlyLogoutsModal || showHalfDaysModal || showPunchEditModal || showPunchOutEditModal || alertState.show;
    if (hasActiveModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, [showLateLoginsModal, showEarlyLogoutsModal, showHalfDaysModal, showPunchEditModal, showPunchOutEditModal, alertState.show]);
  const showAlert = (msg) => setAlertState({ show: true, message: String(msg) });

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
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const log = (attendanceLogs || []).find(l => {
        const lDate = parseLogDate(l);
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
      showAlert("Please select an employee and enter the new time.");
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
        try {
          await fetch((API_ENDPOINTS.ATTENDANCE_LOGS_GET || '').split('/api/')[0] + '/api/attendance_logs/punch', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: punchEditData.empId,
              EmpID: punchEditData.empId,
              status: 'P',
              remark: 'MANUAL_EDIT_IN',
              punch_time: punchEditData.newTime,
              punch_date: punchEditData.date
            })
          });
        } catch (err) { console.error('Failed to log in attendance_logs', err); }

        showAlert(`✅ Punch-in time updated to ${punchEditData.newTime} for ${punchEditData.empName}!`);
        setShowPunchEditModal(false);
        setPunchEditData({ empId: '', empName: '', actualTime: '', newTime: '', date: new Date().toISOString().split('T')[0] });
        fetchAttendance();
      } else {
        showAlert(`Failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      showAlert("Network error updating punch-in.");
    }
  };

  const handlePunchOutEditEmpChange = async (empId, dateOverride) => {
    const targetDate = dateOverride || punchOutEditData.date;
    const emp = allEmployees.find(e => String(e.id) === String(empId));
    setPunchOutEditData(prev => ({ ...prev, empId, empName: emp?.name || emp?.user_name || '', actualTime: 'Loading...', date: targetDate }));

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
      const actualTime = log?.out_time || log?.OUTTime || log?.PunchOut || log?.punch_time_out || log?.out_time_biometric || 'Not Punched Yet';
      setPunchOutEditData(prev => ({ ...prev, actualTime: typeof actualTime === 'string' && actualTime.trim() === '' ? 'Not Punched Yet' : actualTime }));
    } catch (err) {
      console.error(err);
      setPunchOutEditData(prev => ({ ...prev, actualTime: 'Error loading' }));
    } finally {
      setIsPunchFetching(false);
    }
  };

  const submitPunchOutEdit = async () => {
    if (!punchOutEditData.empId || !punchOutEditData.newTime) {
      showAlert("Please select an employee and enter the new time.");
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
          user_id: punchOutEditData.empId,
          EmpID: punchOutEditData.empId,
          out_time: punchOutEditData.newTime,
          punch_out: punchOutEditData.newTime,
          punch_date: punchOutEditData.date,
          date: punchOutEditData.date
        })
      });
      const data = await res.json();
      if (res.ok) {
        try {
          await fetch((API_ENDPOINTS.ATTENDANCE_LOGS_GET || '').split('/api/')[0] + '/api/attendance_logs/punch', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${user?.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: punchOutEditData.empId,
              EmpID: punchOutEditData.empId,
              status: 'O',
              remark: 'MANUAL_EDIT_OUT',
              punch_time: punchOutEditData.newTime,
              punch_date: punchOutEditData.date
            })
          });
        } catch (err) { console.error('Failed to log out attendance_logs', err); }

        showAlert(`✅ Punch-out time updated to ${punchOutEditData.newTime} for ${punchOutEditData.empName}!`);
        setShowPunchOutEditModal(false);
        setPunchOutEditData({ empId: '', empName: '', actualTime: '', newTime: '', date: new Date().toISOString().split('T')[0] });
        fetchAttendance();
      } else {
        showAlert(`Failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      showAlert("Network error updating punch-out.");
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
          if (Array.isArray(data)) {
            const filtered = data.filter(emp => String(emp.employee_id || emp.id || '').trim() !== '20250');
            const sorted = [...filtered].sort((a, b) => {
              const idA = parseInt(String(a.employee_id || a.id || '').replace(/[^\d]/g, ''), 10) || 0;
              const idB = parseInt(String(b.employee_id || b.id || '').replace(/[^\d]/g, ''), 10) || 0;
              if (idA !== idB) return idA - idB;
              return String(a.employee_id || a.id || '').localeCompare(String(b.employee_id || b.id || ''));
            });
            setAllEmployees(sorted);
          }
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
        localStorage.removeItem('navAuthUser');
        window.location.href = './';
        return;
      }

      const logsData = await logsRes.json();
      const masterLogs = logsData.data || logsData.attendance || logsData.logs || logsData;

      if (Array.isArray(masterLogs)) {
        const validLogs = masterLogs.filter(l => l !== null && String(l?.user_id || l?.Empcode || l?.EmpID || '').trim() !== '20250');
        setAttendanceLogs(validLogs);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const myTodayLogs = validLogs.filter(log => {
          const logDate = parseLogDate(log);
          const isToday = logDate === todayStr;
          const isMe = String(log?.user_id || log?.Empcode || log?.EmpID || '') === String(user?.id || '') || log?.email === user?.email;
          return isToday && isMe;
        }).sort((a, b) => new Date(a?.created_at || a?.punch_time || 0) - new Date(b?.created_at || b?.punch_time || 0));

        if (myTodayLogs.length > 0) {
          const checkHasPunchOut = (record) => {
            if (!record) return null;
            const outVal = record.out_time || record.OUTTime || record.PunchOut || record.punch_time_out || record.out_time_biometric || record.PunchTime || record.punch_time;
            return (outVal && outVal !== '----' && outVal !== '--:--' && outVal !== '00:00' && outVal !== '00:00:00') ? outVal : null;
          };

          const latestInLog = [...myTodayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_IN' || (!log.remark?.includes('OUT') && !checkHasPunchOut(log))) || myTodayLogs[0];
          const latestOutLog = [...myTodayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_OUT' || (checkHasPunchOut(log) && log.remark !== 'MANUAL_EDIT_IN'));

          const extractTime = (log) => {
            if (!log) return '----';
            const t = log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime || log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric;
            if (t && t !== '----' && t !== '--:--' && t !== '00:00' && t !== '00:00:00') return t;
            if (log.created_at) {
              const d = new Date(log.created_at);
              if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            }
            return '----';
          };

          const in_time = extractTime(latestInLog);
          const out_time = latestOutLog ? extractTime(latestOutLog) : '----';

          const outLocVal = (logRec) => {
            if (!logRec) return null;
            const locVal = logRec.punchout_location || logRec.out_location || logRec.location || logRec.PunchOut_location || logRec.in_location || logRec.punchin_location;
            return (locVal && locVal !== '----') ? locVal : null;
          };

          setPersonalAttendance({
            ...latestInLog,
            in_time: in_time && in_time !== '----' ? in_time : null,
            out_time: out_time || '----',
            PunchOut_location: outLocVal(latestOutLog) || outLocVal(latestInLog) || '----'
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
        showAlert(data.message || 'Check-in failed');
      }
    } catch (err) {
      showAlert('System error during check-in');
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
        showAlert(data.message || 'Check-out failed');
      }
    } catch (err) {
      showAlert('System error during check-out');
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

  const getExportRows = (forExcel = false) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const getDatesInRange = (startDate, endDate) => {
      const dates = [];
      let currentDate = new Date(startDate);
      const end = new Date(endDate);
      while (currentDate <= end) {
        const dd = String(currentDate.getDate()).padStart(2, '0');
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const yyyy = currentDate.getFullYear();
        dates.push(`${yyyy}-${mm}-${dd}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates.sort((a, b) => new Date(b) - new Date(a));
    };

    const dateRange = getDatesInRange(fromDate, toDate);
    const rows = [];

    dateRange.forEach(targetDate => {
      displayedEmployees.forEach(emp => {
        const logsForEmp = (attendanceLogs || [])
          .filter(l => {
            if (!l) return false;
            const logId = String(l?.user_id || l?.Empcode || l?.EmpID || l?.userId || l?.UserId || '').trim();
            const empId = String(emp?.id || '').trim();
            const extractDate = (record) => {
              if (!record) return null;
              const dStr = record.punch_date || record.date || record.created_at || '';
              return String(dStr).split('T')[0];
            };
            const logDate = extractDate(l);
            return empId && logId && (logId === empId) && (logDate === targetDate);
          })
          .sort((a, b) => new Date(a?.created_at || a?.punch_time) - new Date(b?.created_at || b?.punch_time));

        const checkHasPunchOut = (record) => {
          if (!record) return false;
          const outVal = record.out_time || record.OUTTime || record.PunchOut || record.punch_time_out || record.out_time_biometric;
          return outVal && outVal !== '----' && outVal !== '--:--' && outVal !== '00:00' && outVal !== '00:00:00';
        };

        const dayPunchInLog = [...logsForEmp].reverse().find(log => log.remark === 'MANUAL_EDIT_IN' || (!log.remark?.includes('OUT') && !checkHasPunchOut(log))) || logsForEmp[0];
        const dayPunchOutLog = [...logsForEmp].reverse().find(log => log.remark === 'MANUAL_EDIT_OUT' || (checkHasPunchOut(log) && log.remark !== 'MANUAL_EDIT_IN'));

        const extractTime = (log) => {
          if (!log) return '----';
          const t = log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime || log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric;
          if (t && t !== '----' && t !== '--:--' && t !== '00:00' && t !== '00:00:00') return t;
          if (log.created_at) {
            const d = new Date(log.created_at);
            if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
          }
          return '----';
        };

        const inTime = extractTime(dayPunchInLog);
        const outTime = logsForEmp.length > 0 ? ((targetDate === todayStr && !dayPunchOutLog) ? '----' : (dayPunchOutLog ? extractTime(dayPunchOutLog) : '----')) : '----';

        let displayStatus = 'Absent';
        if (logsForEmp.length > 0) {
          const pIn = parseTimeStr(inTime);
          const pOut = parseTimeStr(outTime);
          let rawStatus = String(logsForEmp[0].status || logsForEmp[0].Status || 'PRESENT').trim().toUpperCase();
          if (inTime !== '----' && inTime !== '--:--' && rawStatus === 'ABSENT') rawStatus = 'PRESENT';

          if (rawStatus === 'PRESENT' || rawStatus === 'P' || rawStatus === 'IN OFFICE' || rawStatus === 'IN-OFFICE') {
            displayStatus = 'In Office';
          } else if (rawStatus === 'ABSENT' || rawStatus === 'A') {
            displayStatus = 'Absent';
          } else if (rawStatus === 'HALF_DAY' || rawStatus === 'HD' || rawStatus === 'HALF DAY') {
            displayStatus = 'Half Day';
          } else if (rawStatus === 'LATE' || rawStatus === 'L') {
            displayStatus = 'Late';
          } else {
            displayStatus = logsForEmp[0].status || 'In Office';
          }
        }

        if (activeFilter !== 'ALL') {
          if (activeFilter === 'PRESENT' && displayStatus === 'Absent') return;
          if (activeFilter === 'ABSENT' && displayStatus !== 'Absent') return;
          if (activeFilter === 'HALF DAYS' && displayStatus !== 'Half Day') return;
          if (activeFilter === 'Late Login') {
            const pIn = parseTimeStr(inTime);
            if (!(pIn !== -1 && pIn > (9 * 60 + 30))) return;
          }
          if (activeFilter === 'Early logout') {
            const pOut = parseTimeStr(outTime);
            if (!(pOut !== -1 && pOut < (17 * 60))) return;
          }
        }

        const inLoc = dayPunchInLog ? (dayPunchInLog.punchin_location || dayPunchInLog.in_location || '----') : '----';
        const outLoc = dayPunchOutLog ? (dayPunchOutLog.punchout_location || dayPunchOutLog.out_location || '----') : '----';
        const workHrs = logsForEmp.length > 0 ? getWorkHrs(inTime, outTime, targetDate) : '00:00';

        const formatToDDMMYYYY = (dStr) => {
          if (!dStr || dStr === '----') return '----';
          const parts = dStr.split('-');
          if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
          return dStr;
        };

        rows.push([
          forExcel ? "'" + formatToDDMMYYYY(targetDate) : formatToDDMMYYYY(targetDate),
          emp?.name || emp?.user_name || 'Employee',
          forExcel ? "'" + String(emp?.id || 'N/A') : `#${emp?.id || 'N/A'}`,
          inTime,
          outTime,
          workHrs,
          displayStatus,
          inLoc,
          outLoc
        ]);
      });
    });

    return rows;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayFormatted = `${dd}-${mm}-${yyyy}`;

    const formatToDDMMYYYY = (dStr) => {
      if (!dStr || dStr === '----') return '----';
      const parts = dStr.split('-');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return dStr;
    };

    const dateRangeDisplay = `${formatToDDMMYYYY(fromDate)} to ${formatToDDMMYYYY(toDate)}`;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Organization Attendance Report", 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${todayFormatted} | Period: ${dateRangeDisplay}`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Total Records: ${displayedEmployees.length} | Departments: ${user?.department || 'IT'}`, 14, 38);

    const rows = getExportRows(false);

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
    const rows = getExportRows(true);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${fromDate}_to_${toDate}.csv`;
    a.click();
    setShowExportDropdown(false);
  };

  const calculateMetrics = () => {
    const totalCount = allEmployees.length;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const presentEmpIds = new Set();
    const lateLoginEmpIds = new Set();
    const earlyLogoutEmpIds = new Set();
    const halfDayEmpIds = new Set();

    const lateLogins = [];
    const earlyLogouts = [];
    const halfDayLogs = [];

    allEmployees.forEach(emp => {
      const empIdStr = String(emp.id || '').trim();
      const logsForEmp = (attendanceLogs || [])
        .filter(l => {
          if (!l) return false;
          const logId = String(l?.user_id || l?.Empcode || l?.EmpID || l?.userId || l?.UserId || '').trim();
          return empIdStr && logId && (logId === empIdStr);
        });

      if (logsForEmp.length > 0) {
        // Group logs by date to prevent cross-day data leaking
        const groupedByDate = (logsForEmp || []).reduce((acc, log) => {
          const d = parseLogDate(log);
          if (d) {
            if (!acc[d]) acc[d] = [];
            acc[d].push(log);
          }
          return acc;
        }, {});

        // Get the latest date available in the range for this employee
        const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));
        const latestDate = dates[0];
        const latestDayLogs = groupedByDate[latestDate] || [];

        // Sort logs within THAT day only
        const sortedDayLogs = latestDayLogs.sort((a, b) => new Date(a.created_at || a.punch_time || 0) - new Date(b.created_at || b.punch_time || 0));

        if (sortedDayLogs.length > 0) {
          const firstLog = sortedDayLogs[0];
          const checkHasPunchOut = (record) => {
            if (!record) return false;
            const outVal = record.out_time || record.OUTTime || record.PunchOut || record.punch_time_out || record.out_time_biometric;
            return outVal && outVal !== '----' && outVal !== '--:--' && outVal !== '00:00' && outVal !== '00:00:00';
          };
          const dayPunchInLog = [...sortedDayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_IN' || (!log.remark?.includes('OUT') && !checkHasPunchOut(log))) || firstLog;
          const dayPunchOutLog = [...sortedDayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_OUT' || (checkHasPunchOut(log) && log.remark !== 'MANUAL_EDIT_IN'));

          const extractTime = (log) => {
            if (!log) return '----';
            const t = log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime || log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric;
            if (t && t !== '----' && t !== '--:--' && t !== '00:00' && t !== '00:00:00') return t;
            if (log.created_at) {
              const d = new Date(log.created_at);
              if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            }
            return '----';
          };

          const punchIn = extractTime(dayPunchInLog);
          const punchOut = (latestDate === todayStr && !dayPunchOutLog) ? '----' : (dayPunchOutLog ? extractTime(dayPunchOutLog) : '----');

          const hasValidPunchIn = punchIn && punchIn !== '----' && punchIn !== '--:--' && punchIn !== '00:00';
          const status = String(firstLog?.status || firstLog?.Status || '').toUpperCase();
          const isPresent = hasValidPunchIn || status.includes('PRESENT') || status.includes('IN OFFICE') || status.includes('HALF') || status.includes('LATE') || status === 'P';

          const log = {
            ...firstLog,
            punch_date: latestDate,
            in_time: punchIn,
            out_time: punchOut,
            in_location: dayPunchInLog?.punchin_location || dayPunchInLog?.in_location || '----',
            out_location: dayPunchOutLog?.punchout_location || dayPunchOutLog?.out_location || '----',
            work_hrs: (latestDate === todayStr && !dayPunchOutLog) ? '00:00' : (dayPunchOutLog?.work_hrs || firstLog?.work_hrs || '00:00')
          };

          if (isPresent && !status.includes('ABSENT')) {
            presentEmpIds.add(empIdStr);
          }

          // Late Login check on the first punch-in of the latest day
          const pIn = parseTimeStr(punchIn);
          if (pIn !== -1 && pIn > (9 * 60 + 30)) {
            lateLoginEmpIds.add(empIdStr);
            lateLogins.push(log);
          }

          // Early Logout check
          const pOut = parseTimeStr(punchOut);
          if (pOut !== -1 && pOut < (17 * 60)) {
            earlyLogoutEmpIds.add(empIdStr);
            earlyLogouts.push(log);
          }

          // Half Day check
          const st = String(firstLog?.status || '').toUpperCase().trim();
          const isHalfDayStatus = st === 'HALF_DAY' || st === 'HD' || st === 'HALF DAY' || st === 'HALF-DAY';
          if (isHalfDayStatus) {
            halfDayEmpIds.add(empIdStr);
            halfDayLogs.push(log);
          }
        }
      }
    });

    const presentCount = presentEmpIds.size;

    return {
      total: totalCount,
      present: presentCount,
      absent: Math.max(0, totalCount - presentCount),
      halfDay: halfDayEmpIds.size,
      lateLogins,
      earlyLogouts,
      halfDayLogs,
      presentEmpIds,
      lateLoginEmpIds,
      earlyLogoutEmpIds,
      halfDayEmpIds
    };
  };

  const metrics = calculateMetrics();

  const displayedEmployees = allEmployees.filter(emp => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!(emp.name || emp.user_name || '').toLowerCase().startsWith(s)) return false;
    }
    return true;
  });

  return (
    <div className="hr-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />

      <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 300px' : '120px 26px 160px', width: '100%', boxSizing: 'border-box', margin: '0' }}>
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
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>From</span>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: '800', color: '#1e293b', width: '90px', textAlign: 'right' }}
                      />
                    </div>

                    <div style={{ width: '1.5px', height: '16px', background: '#e2e8f0' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>To</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', fontWeight: '800', color: '#1e293b', width: '90px', textAlign: 'right' }}
                      />
                    </div>
                  </div>

                <div style={{ display: 'flex', gap: '8px', width: winWidth < 640 ? '100%' : 'auto' }}>
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    style={{ padding: '0 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: '800', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '13px', height: '44px', width: winWidth < 640 ? '100%' : 'auto' }}
                  >
                    <option value="ALL">All Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF DAYS">Half Day</option>
                    <option value="Late Login">Late Login</option>
                    <option value="Early logout">Early Logout</option>
                  </select>
                  <button
                    onClick={handleExportPDF}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)', height: '44px', width: winWidth < 640 ? '100%' : 'auto', transition: 'all 0.3s' }}
                  >
                    <Download size={18} /> Export PDF
                  </button>
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
                <div style={{
                  fontSize: '10px',
                  fontWeight: '950',
                  color: (() => {
                    if (!personalAttendance?.in_time || personalAttendance.in_time === '----') return '#ef4444';
                    const hasOut = personalAttendance.out_time &&
                      personalAttendance.out_time !== '----' &&
                      personalAttendance.out_time !== '--:--' &&
                      personalAttendance.out_time !== '00:00' &&
                      personalAttendance.out_time !== '00:00:00';
                    if (hasOut) {
                      const pIn = parseTimeStr(personalAttendance.in_time);
                      const pOut = parseTimeStr(personalAttendance.out_time);
                      if ((pIn !== -1 && pIn > (13 * 60 + 30)) || (pOut !== -1 && pOut >= (14 * 60 + 30) && pOut < (17 * 60))) {
                        return '#f97316';
                      }
                      return '#64748b';
                    }
                    return '#16a34a';
                  })(),
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: '4px'
                }}>
                  {(() => {
                    if (!personalAttendance?.in_time || personalAttendance.in_time === '----') return 'Offline';
                    const hasOut = personalAttendance.out_time &&
                      personalAttendance.out_time !== '----' &&
                      personalAttendance.out_time !== '--:--' &&
                      personalAttendance.out_time !== '00:00' &&
                      personalAttendance.out_time !== '00:00:00';
                    if (hasOut) {
                      const pIn = parseTimeStr(personalAttendance.in_time);
                      const pOut = parseTimeStr(personalAttendance.out_time);
                      if ((pIn !== -1 && pIn > (13 * 60 + 30)) || (pOut !== -1 && pOut >= (14 * 60 + 30) && pOut < (17 * 60))) {
                        return 'Half Day';
                      }
                      return 'Shift Closed';
                    }
                    return 'In Office';
                  })()}
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

              {personalAttendance?.in_time && (
                <div style={{ textAlign: winWidth < 480 ? 'center' : 'right', minWidth: winWidth < 480 ? '100%' : '140px' }}>
                  {(!personalAttendance?.out_time || personalAttendance?.out_time === '--:--' || personalAttendance?.out_time === '----' || personalAttendance?.out_time === '00:00' || personalAttendance?.out_time === '00:00:00') ? (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Session</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace' }}>{elapsedTime}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Work Hours</div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', fontFamily: 'monospace' }}>
                        {getWorkHrs(personalAttendance.in_time, personalAttendance.out_time, personalAttendance.punch_date || personalAttendance.created_at)}
                      </div>
                    </>
                  )}
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
                    background: (() => {
                      const pIn = parseTimeStr(personalAttendance?.in_time);
                      const pOut = parseTimeStr(personalAttendance?.out_time);
                      if ((pIn !== -1 && pIn > (13 * 60 + 30)) || (pOut !== -1 && pOut >= (14 * 60 + 30) && pOut < (17 * 60))) {
                        return '#fff7ed';
                      }
                      return '#f8fafc';
                    })(),
                    border: (() => {
                      const pIn = parseTimeStr(personalAttendance?.in_time);
                      const pOut = parseTimeStr(personalAttendance?.out_time);
                      if ((pIn !== -1 && pIn > (13 * 60 + 30)) || (pOut !== -1 && pOut >= (14 * 60 + 30) && pOut < (17 * 60))) {
                        return '1.5px solid #fed7aa';
                      }
                      return '1.5px solid #e2e8f0';
                    })(),
                    color: (() => {
                      const pIn = parseTimeStr(personalAttendance?.in_time);
                      const pOut = parseTimeStr(personalAttendance?.out_time);
                      if ((pIn !== -1 && pIn > (13 * 60 + 30)) || (pOut !== -1 && pOut >= (14 * 60 + 30) && pOut < (17 * 60))) {
                        return '#f97316';
                      }
                      return '#475569';
                    })(),
                    fontWeight: '950',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    {(() => {
                      const pIn = parseTimeStr(personalAttendance?.in_time);
                      const pOut = parseTimeStr(personalAttendance?.out_time);
                      if ((pIn !== -1 && pIn > (13 * 60 + 30)) || (pOut !== -1 && pOut >= (14 * 60 + 30) && pOut < (17 * 60))) {
                        return (
                          <>
                            <Clock size={20} color="#f97316" /> HALF DAY
                          </>
                        );
                      }
                      return (
                        <>
                          <ShieldCheck size={20} color="#64748b" /> SHIFT CLOSED
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(135px, 1fr))', gap: winWidth < 768 ? '12px' : '20px', marginBottom: '40px' }}>
            {[
              { label: 'PRESENT', value: metrics.present, icon: UserCheck, color: '#059669', bg: '#ecfdf5' },
              { label: 'ABSENT', value: metrics.absent, icon: XCircle, color: '#ef4444', bg: '#fef2f2' },
              { label: 'HALF DAYS', value: metrics.halfDay, icon: Clock, color: '#f97316', bg: '#fff7ed' },
              { label: 'Early logout', value: metrics.earlyLogouts.length, icon: Coffee, color: '#3b82f6', bg: '#eff6ff', isEarlyAction: true },
              { label: 'Late Login', value: metrics.lateLogins.length, icon: Sparkles, color: '#7c3aed', bg: '#f5f3ff', isLateAction: true },
              { label: 'Punch-in Edit', value: 'EDIT', icon: AlertTriangle, color: '#db2777', bg: '#fdf2f8', isAction: true },
              { label: 'Punch-out Edit', value: 'EDIT', icon: AlertTriangle, color: '#0ea5e9', bg: '#f0f9ff', isOutAction: true }
            ].map((m, i) => (
              <div
                key={i}
                onClick={() => {
                  if (m.isAction) setShowPunchEditModal(true);
                  else if (m.isOutAction) setShowPunchOutEditModal(true);
                  else if (m.isLeaveAction) navigate('/leaves');
                  else if (activeFilter === m.label) setActiveFilter('ALL');
                  else setActiveFilter(m.label);
                }}
                style={{ background: 'white', padding: winWidth < 768 ? '16px' : '24px', borderRadius: '24px', border: activeFilter === m.label ? `1.5px solid ${m.color}` : '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : '20px', boxShadow: activeFilter === m.label ? `0 4px 12px ${m.color}33` : '0 4px 6px -1px rgba(0,0,0,0.01)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = activeFilter === m.label ? `0 10px 15px ${m.color}40` : '0 10px 15px -3px rgba(0,0,0,0.05)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = activeFilter === m.label ? `0 4px 12px ${m.color}33` : '0 4px 6px -1px rgba(0,0,0,0.01)'; }}
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
            <button style={{ padding: '0 0 12px 0', background: 'transparent', border: 'none', borderBottom: '3px solid #1d4ed8', color: '#1d4ed8', fontWeight: '800', fontSize: winWidth < 600 ? '12px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} > Attendance Log </button>
          </div>

          <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'center', marginBottom: '24px', gap: '16px' }}>
            <div style={{ position: 'relative', width: winWidth < 1024 ? '100%' : '320px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input type="text" placeholder="Filter employee, role or department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', outline: 'none', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }} />
            </div>
          </div>
          {(() => {
            const getDatesInRangeTable = (startDate, endDate) => {
              const dates = [];
              let currentDate = new Date(startDate);
              const end = new Date(endDate);
              while (currentDate <= end) {
                const dd = String(currentDate.getDate()).padStart(2, '0');
                const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                const yyyy = currentDate.getFullYear();
                dates.push(`${yyyy}-${mm}-${dd}`);
                currentDate.setDate(currentDate.getDate() + 1);
              }
              return dates.sort((a, b) => new Date(b) - new Date(a));
            };
            const dateRangeList = getDatesInRangeTable(fromDate, toDate);
            const flattenedRows = [];
            dateRangeList.forEach(targetDate => {
              displayedEmployees.forEach(emp => {
                const logsForEmp = (attendanceLogs || [])
                  .filter(l => {
                    if (!l) return false;
                    const logId = String(l?.user_id || l?.Empcode || l?.EmpID || l?.userId || l?.UserId || '').trim();
                    const empId = String(emp?.id || '').trim();
                    const logDate = parseLogDate(l);
                    return empId && logId && (logId === empId) && (logDate === targetDate);
                  })
                  .sort((a, b) => new Date(a?.created_at || a?.punch_time || 0) - new Date(b?.created_at || b?.punch_time || 0));

                const checkHasPunchOut = (record) => {
                  if (!record) return false;
                  const outVal = record.out_time || record.OUTTime || record.PunchOut || record.punch_time_out || record.out_time_biometric;
                  return outVal && outVal !== '----' && outVal !== '--:--' && outVal !== '00:00' && outVal !== '00:00:00';
                };

                const dayPunchInLog = [...logsForEmp].reverse().find(log => log.remark === 'MANUAL_EDIT_IN' || (!log.remark?.includes('OUT') && !checkHasPunchOut(log))) || logsForEmp[0];
                const dayPunchOutLog = [...logsForEmp].reverse().find(log => log.remark === 'MANUAL_EDIT_OUT' || (checkHasPunchOut(log) && log.remark !== 'MANUAL_EDIT_IN'));

                const extractTime = (log, isOut = false) => {
                  if (!log) return '----';
                  const t = isOut
                    ? (log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric || log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime)
                    : (log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime || log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric);
                  if (t && t !== '----' && t !== '--:--' && t !== '00:00' && t !== '00:00:00') return t;
                  return '----';
                };

                const todayStr = getTodayStr();
                const punchIn = extractTime(dayPunchInLog, false);
                const punchOut = logsForEmp.length > 0 ? ((targetDate === todayStr && !dayPunchOutLog) ? '----' : (dayPunchOutLog ? extractTime(dayPunchOutLog, true) : '----')) : '----';

                let displayStatus = 'Absent';
                if (logsForEmp.length > 0) {
                  let rawStatus = String(logsForEmp[0].status || logsForEmp[0].Status || 'PRESENT').trim().toUpperCase();
                  if (punchIn !== '----' && punchIn !== '--:--' && rawStatus === 'ABSENT') rawStatus = 'PRESENT';
                  if (rawStatus === 'PRESENT' || rawStatus === 'P' || rawStatus === 'IN OFFICE' || rawStatus === 'IN-OFFICE') displayStatus = 'In Office';
                  else if (rawStatus === 'ABSENT' || rawStatus === 'A') displayStatus = 'Absent';
                  else if (rawStatus === 'HALF_DAY' || rawStatus === 'HD' || rawStatus === 'HALF DAY') displayStatus = 'Half Day';
                  else if (rawStatus === 'LATE' || rawStatus === 'L') displayStatus = 'Late';
                  else displayStatus = logsForEmp[0].status || 'In Office';
                }

                if (activeFilter !== 'ALL') {
                  if (activeFilter === 'PRESENT' && displayStatus === 'Absent') return;
                  if (activeFilter === 'ABSENT' && displayStatus !== 'Absent') return;
                  if (activeFilter === 'HALF DAYS' && displayStatus !== 'Half Day') return;
                  if (activeFilter === 'Late Login') {
                    const pIn = parseTimeStr(punchIn);
                    if (!(pIn !== -1 && pIn > (9 * 60 + 30))) return;
                  }
                  if (activeFilter === 'Early logout') {
                    const pOut = parseTimeStr(punchOut);
                    if (!(pOut !== -1 && pOut < (17 * 60))) return;
                  }
                }

                flattenedRows.push({ emp, targetDate });
              });
            });

            return (
              <section style={{ background: winWidth < 768 ? 'transparent' : 'white', borderRadius: '24px', border: winWidth < 768 ? 'none' : '1.5px solid #f1f5f9', boxShadow: winWidth < 768 ? 'none' : '0 4px 20px -5px rgba(0,0,0,0.02)', overflowX: winWidth < 768 ? 'hidden' : 'auto' }}>
                {winWidth < 768 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {flattenedRows.length > 0 ? (
                      flattenedRows.map((rowItem, idx) => {
                        const emp = rowItem.emp;
                        const targetDate = rowItem.targetDate;
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const logsForEmp = (attendanceLogs || [])
                          .filter(l => {
                            if (!l) return false;
                            const logId = String(l?.user_id || l?.Empcode || l?.EmpID || l?.userId || l?.UserId || '').trim();
                            const empId = String(emp?.id || '').trim();
                            const logDate = parseLogDate(l);
                            return empId && logId && (logId === empId) && (logDate === targetDate);
                          })
                          .sort((a, b) => new Date(a?.created_at || a?.punch_time || 0) - new Date(b?.created_at || b?.punch_time || 0));

                        const sortedDayLogs = logsForEmp;

                        const checkHasPunchOut = (record) => {
                          if (!record) return false;
                          const outVal = record.out_time || record.OUTTime || record.PunchOut || record.punch_time_out || record.out_time_biometric;
                          return outVal && outVal !== '----' && outVal !== '--:--' && outVal !== '00:00' && outVal !== '00:00:00';
                        };
                        const dayPunchInLog = [...sortedDayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_IN' || (!log.remark?.includes('OUT') && !checkHasPunchOut(log))) || sortedDayLogs[0];
                        const dayPunchOutLog = [...sortedDayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_OUT' || (checkHasPunchOut(log) && log.remark !== 'MANUAL_EDIT_IN'));
                        const hasDayPunchOut = !!dayPunchOutLog;
                        const extractTime = (log, isOut = false) => {
                          if (!log) return '----';
                          const t = isOut
                            ? (log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric || log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime)
                            : (log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime || log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric);
                          if (t && t !== '----' && t !== '--:--' && t !== '00:00' && t !== '00:00:00') return t;
                          if (log.created_at) {
                            const d = new Date(log.created_at);
                            if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                          }
                          return '----';
                        };

                        const punchIn = extractTime(dayPunchInLog, false);
                        const punchOut = logsForEmp.length > 0 ? ((targetDate === todayStr && !hasDayPunchOut) ? '----' : (dayPunchOutLog ? extractTime(dayPunchOutLog, true) : '----')) : '----';
                        const pDate = targetDate;
                        const workHrs = logsForEmp.length > 0 ? ((targetDate === todayStr && !hasDayPunchOut) ? '00:00' : (dayPunchOutLog?.work_hrs || sortedDayLogs[0]?.work_hrs || '00:00')) : '00:00';

                        const log = sortedDayLogs[0] ? {
                          ...sortedDayLogs[0],
                          punch_date: targetDate,
                          in_time: punchIn,
                          out_time: punchOut,
                          in_location: dayPunchInLog?.punchin_location || dayPunchInLog?.in_location || '----',
                          out_location: (targetDate === todayStr && !hasDayPunchOut) ? '----' : (dayPunchOutLog?.punchout_location || dayPunchOutLog?.out_location || '----'),
                          work_hrs: workHrs
                        } : null;

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
                                const todayPunchIn = log?.in_time;
                                const todayPunchOut = log?.out_time;
                                const pIn = parseTimeStr(todayPunchIn);
                                const pOut = parseTimeStr(todayPunchOut);
                                const rawStatus = (log?.status || log?.Status || '').trim();
                                if (rawStatus) {
                                  let displayStatus = rawStatus;
                                  if (rawStatus.toUpperCase() === 'PRESENT' || rawStatus.toUpperCase() === 'IN OFFICE' || rawStatus.toUpperCase() === 'IN-OFFICE') displayStatus = 'In Office';
                                  else if (rawStatus.toUpperCase() === 'ABSENT') displayStatus = 'Absent';
                                  else if (rawStatus.toUpperCase() === 'HALF_DAY' || rawStatus.toUpperCase() === 'HD') displayStatus = 'Half Day';
                                  else if (rawStatus.toUpperCase() === 'LATE' || rawStatus.toUpperCase() === 'L') displayStatus = 'Late';

                                  const s = rawStatus.toUpperCase();
                                  let bg = '#fef2f2';
                                  let color = '#ef4444';
                                  let border = '#fee2e2';

                                  if (s.includes('PRESENT') || s === 'P' || s.includes('IN OFFICE') || s.includes('IN-OFFICE')) {
                                    bg = '#f1f5f9';
                                    color = '#000000';
                                    border = '#cbd5e1';
                                  } else if (s.includes('LATE') || s === 'L') {
                                    bg = '#fffbeb';
                                    color = '#d97706';
                                    border = '#f59e0b';
                                  } else if (s.includes('WO') || s.includes('OFF')) {
                                    bg = '#f1f5f9';
                                    color = '#64748b';
                                    border = '#cbd5e1';
                                  } else if (s.includes('NH') || s.includes('HOLIDAY')) {
                                    bg = '#eff6ff';
                                    color = '#3b82f6';
                                    border = '#dbeafe';
                                  } else if (s.includes('HALF') || s === 'HD') {
                                    bg = '#fff7ed';
                                    color = '#f97316';
                                    border = '#fed7aa';
                                  }

                                  return (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 14px',
                                      borderRadius: '100px',
                                      background: bg,
                                      border: `1.5px solid ${border}`,
                                      color: color,
                                      fontWeight: '950'
                                    }}>
                                      {displayStatus}
                                    </div>
                                  );
                                }

                                // Fallback if no backend status is set
                                const hasValidPunchIn = todayPunchIn && todayPunchIn !== '----' && todayPunchIn !== '--:--' && todayPunchIn !== '00:00';
                                let fallbackStatus = hasValidPunchIn ? 'In Office' : 'Absent';
                                if (!hasValidPunchIn) {
                                  fallbackStatus = 'Absent';
                                }

                                const isPresent = fallbackStatus === 'In Office' || fallbackStatus.toUpperCase().includes('PRESENT');

                                return (
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    borderRadius: '100px',
                                    background: isPresent ? '#f1f5f9' : '#fef2f2',
                                    border: `1.5px solid ${isPresent ? '#cbd5e1' : '#fee2e2'}`,
                                    color: isPresent ? '#000000' : '#ef4444',
                                    fontWeight: '950'
                                  }}>
                                    {fallbackStatus}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
                        <p style={{ color: '#64748b', fontWeight: '900' }}>
                          {attendanceLoading ? 'Loading.....' : (activeFilter === 'ALL' ? 'No matching records found.' : `There is no ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1).toLowerCase().replace('_', ' ')}s`)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Employee</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Date</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch In</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch Out</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Hrs</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>IN Location</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>OUT Location</th></tr>
                    </thead>
                    <tbody>
                      {flattenedRows.length > 0 ? (
                        flattenedRows.map((rowItem, idx) => {
                          const emp = rowItem.emp;
                          const targetDate = rowItem.targetDate;
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                          const logsForEmp = (attendanceLogs || [])
                            .filter(l => {
                              if (!l) return false;
                              const logId = String(l?.user_id || l?.Empcode || l?.EmpID || l?.userId || l?.UserId || '').trim();
                              const empId = String(emp?.id || '').trim();
                              const logDate = parseLogDate(l);
                              return empId && logId && (logId === empId) && (logDate === targetDate);
                            })
                            .sort((a, b) => new Date(a?.created_at || a?.punch_time || 0) - new Date(b?.created_at || b?.punch_time || 0));

                          const sortedDayLogs = logsForEmp;

                          const checkHasPunchOut = (record) => {
                            if (!record) return false;
                            const outVal = record.out_time || record.OUTTime || record.PunchOut || record.punch_time_out || record.out_time_biometric;
                            return outVal && outVal !== '----' && outVal !== '--:--' && outVal !== '00:00' && outVal !== '00:00:00';
                          };
                          const dayPunchInLog = [...sortedDayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_IN' || (!log.remark?.includes('OUT') && !checkHasPunchOut(log))) || sortedDayLogs[0];
                          const dayPunchOutLog = [...sortedDayLogs].reverse().find(log => log.remark === 'MANUAL_EDIT_OUT' || (checkHasPunchOut(log) && log.remark !== 'MANUAL_EDIT_IN'));
                          const hasDayPunchOut = !!dayPunchOutLog;
                          const extractTime = (log, isOut = false) => {
                            if (!log) return '----';
                            const t = isOut
                              ? (log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric || log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime)
                              : (log.punch_time || log.in_time || log.INTime || log.PunchIn || log.PunchTime || log.out_time || log.OUTTime || log.PunchOut || log.punch_time_out || log.out_time_biometric);
                            if (t && t !== '----' && t !== '--:--' && t !== '00:00' && t !== '00:00:00') return t;
                            if (log.created_at) {
                              const d = new Date(log.created_at);
                              if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                            }
                            return '----';
                          };

                          const punchIn = extractTime(dayPunchInLog, false);
                          const punchOut = logsForEmp.length > 0 ? ((targetDate === todayStr && !hasDayPunchOut) ? '----' : (dayPunchOutLog ? extractTime(dayPunchOutLog, true) : '----')) : '----';
                          const pDate = targetDate;
                          const workHrs = logsForEmp.length > 0 ? ((targetDate === todayStr && !hasDayPunchOut) ? '00:00' : (dayPunchOutLog?.work_hrs || sortedDayLogs[0]?.work_hrs || '00:00')) : '00:00';

                          const log = sortedDayLogs[0] ? {
                            ...sortedDayLogs[0],
                            punch_date: targetDate,
                            in_time: punchIn,
                            out_time: punchOut,
                            in_location: dayPunchInLog?.punchin_location || dayPunchInLog?.in_location || '----',
                            out_location: (targetDate === todayStr && !hasDayPunchOut) ? '----' : (dayPunchOutLog?.punchout_location || dayPunchOutLog?.out_location || '----'),
                            work_hrs: workHrs
                          } : null;

                          const getCleanAttendance = (record) => {
                            if (!record) return { displayInTime: '----', displayOutTime: '----', displayWorkTime: '00:00' };
                            const recordDate = record?.punch_date || record?.date || record?.created_at || '';
                            const isMissing = (t) => !t || t === '--:--' || t === '00:00' || t === 'null' || t === '----';
                            const rawIn = record?.in_time || record?.INTime;
                            const rawOut = record?.out_time || record?.OUTTime || record?.PunchOut;
                            return {
                              displayInTime: isMissing(rawIn) ? '----' : rawIn,
                              displayOutTime: isMissing(rawOut) ? '----' : rawOut,
                              displayWorkTime: getWorkHrs(rawIn, rawOut, recordDate)
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
                                  const parts = dateStr.split('-');
                                  const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateStr;
                                  return `${formattedDate} (${dayName})`;
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
                                {(() => {
                                  const todayPunchIn = log?.in_time || log?.INTime || log?.PunchIn || log?.punch_time;
                                  const todayPunchOut = log?.out_time || log?.OUTTime || log?.PunchOut || log?.punch_time_out || log?.out_time_biometric;
                                  const pIn = parseTimeStr(todayPunchIn);
                                  const pOut = parseTimeStr(todayPunchOut);
                                  const rawStatus = (log?.status || log?.Status || '').trim();
                                  if (rawStatus) {
                                    let displayStatus = rawStatus;
                                    if (rawStatus.toUpperCase() === 'PRESENT' || rawStatus.toUpperCase() === 'IN OFFICE' || rawStatus.toUpperCase() === 'IN-OFFICE') displayStatus = 'In Office';
                                    else if (rawStatus.toUpperCase() === 'ABSENT') displayStatus = 'Absent';
                                    else if (rawStatus.toUpperCase() === 'HALF_DAY' || rawStatus.toUpperCase() === 'HD') displayStatus = 'Half Day';
                                    else if (rawStatus.toUpperCase() === 'LATE' || rawStatus.toUpperCase() === 'L') displayStatus = 'Late';

                                    const s = rawStatus.toUpperCase();
                                    let bg = '#fef2f2';
                                    let color = '#ef4444';
                                    let border = '#fee2e2';

                                    if (s.includes('PRESENT') || s === 'P' || s.includes('IN OFFICE') || s.includes('IN-OFFICE')) {
                                      bg = '#f1f5f9';
                                      color = '#000000';
                                      border = '#cbd5e1';
                                    } else if (s.includes('LATE') || s === 'L') {
                                      bg = '#fffbeb';
                                      color = '#d97706';
                                      border = '#f59e0b';
                                    } else if (s.includes('WO') || s.includes('OFF')) {
                                      bg = '#f1f5f9';
                                      color = '#64748b';
                                      border = '#cbd5e1';
                                    } else if (s.includes('NH') || s.includes('HOLIDAY')) {
                                      bg = '#eff6ff';
                                      color = '#3b82f6';
                                      border = '#dbeafe';
                                    } else if (s.includes('HALF') || s === 'HD') {
                                      bg = '#fff7ed';
                                      color = '#f97316';
                                      border = '#fed7aa';
                                    }

                                    return (
                                      <div style={{
                                        display: 'inline-flex',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        background: bg,
                                        border: `1.5px solid ${border}`,
                                        color: color,
                                        fontSize: '11px',
                                        fontWeight: '950'
                                      }}>
                                        {displayStatus}
                                      </div>
                                    );
                                  }

                                  // Fallback if no backend status is set
                                  const hasPunchIn = log && cleanLog.displayInTime !== '----';
                                  return (
                                    <div style={{
                                      display: 'inline-flex',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      background: hasPunchIn ? '#f1f5f9' : '#fef2f2',
                                      border: `1.5px solid ${hasPunchIn ? '#cbd5e1' : '#fee2e2'}`,
                                      color: hasPunchIn ? '#000000' : '#ef4444',
                                      fontSize: '11px',
                                      fontWeight: '950'
                                    }}>
                                      {hasPunchIn ? 'In Office' : 'Absent'}
                                    </div>
                                  );
                                })()}
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
                            {attendanceLoading ? 'Loading.....' : (activeFilter === 'ALL' ? 'No matching records found.' : `There is no ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1).toLowerCase().replace('_', ' ')}s`)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })()}
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
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: #{empId} {logDate ? `\u00B7 ${logDate}` : ''}</div>
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
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: #{empId} {logDate ? `\u00B7 ${logDate}` : ''}</div>
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
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ID: #{empId} {logDate ? `\u00B7 ${logDate}` : ''}</div>
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
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}></p>
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

        {showPunchOutEditModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', position: 'relative' }}>
              <button onClick={() => setShowPunchOutEditModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: '0.2s' }}>✕</button>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f0f9ff', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><AlertTriangle size={24} /></div>
                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0' }}>Edit Punch-Out Time</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}></p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 1: Select Employee</label>
                  <select value={punchOutEditData.empId} onChange={(e) => handlePunchOutEditEmpChange(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }}>
                    <option value="">Choose an employee...</option>
                    {allEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name || emp.user_name} ({emp.role || 'Member'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Step 2: Select Date</label>
                  <input type="date" value={punchOutEditData.date} onChange={(e) => handlePunchOutEditEmpChange(punchOutEditData.empId, e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual Punch-Out</label>
                  <input type="text" readOnly value={punchOutEditData.actualTime || '--:--'} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f1f5f9', fontSize: '15px', fontWeight: '900', color: '#64748b', outline: 'none', opacity: 0.8 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Punch-Out Time</label>
                  <input type="time" value={punchOutEditData.newTime} onChange={(e) => setPunchOutEditData({ ...punchOutEditData, newTime: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #bae6fd', background: '#f0f9ff', fontSize: '15px', fontWeight: '900', color: '#0369a1', outline: 'none', cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button onClick={() => setShowPunchOutEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={submitPunchOutEdit} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(14, 165, 233, 0.3)' }}>Update Time</button>
              </div>
            </div>
          </div>
        )}

        {alertState.show && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
            <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: alertState.message.includes('✅') ? '#ecfdf5' : '#fff1f2', color: alertState.message.includes('✅') ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                {alertState.message.includes('✅') ? (
                  <CheckCircle size={28} />
                ) : (
                  <AlertTriangle size={28} />
                )}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 10px 0' }}>
                {alertState.message.includes('✅') ? 'Success' : 'Notification'}
              </h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', fontWeight: '600', lineHeight: '1.5' }}>
                {alertState.message.replace('✅', '').trim()}
              </p>
              <button onClick={() => setAlertState({ show: false, message: '' })} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: alertState.message.includes('✅') ? '#10b981' : '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: alertState.message.includes('✅') ? '0 4px 10px rgba(16, 185, 129, 0.25)' : 'none' }}>
                OK
              </button>
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
