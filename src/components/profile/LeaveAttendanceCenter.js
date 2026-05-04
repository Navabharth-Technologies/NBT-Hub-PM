import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, Calendar, Clock, XCircle, Search, User, Check, X, Info, LogIn, LogOut, RefreshCw, MapPin, UserCheck, Coffee, AlertTriangle, Fingerprint, FileText, Table, ShieldCheck, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';

import { API_ENDPOINTS, TEAM_OFFICE_AUTH_TOKEN } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './PMDashboard.css';

export default function LeaveAttendanceCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'attendance');

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [showAllLedger, setShowAllLedger] = useState(false);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [viewAll, setViewAll] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [personalAttendance, setPersonalAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isProcessing, setIsProcessing] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allLeaveStats, setAllLeaveStats] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);

  const [userLocation, setUserLocation] = useState(localStorage.getItem('savedUserLocation') || 'Fetching location...');
  const [isLocating, setIsLocating] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterSubMode, setFilterSubMode] = useState(null); // 'name' or 'date'
  const dropdownRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const [showPunchEditModal, setShowPunchEditModal] = useState(false);
  const [punchEditData, setPunchEditData] = useState({ empId: '', empName: '', actualTime: '', newTime: '', date: new Date().toISOString().split('T')[0] });

  const [showLeaveEditModal, setShowLeaveEditModal] = useState(false);
  const [leaveEditData, setLeaveEditData] = useState({ 
    empId: '', 
    empName: '', 
    cl: 0, 
    lop: 0, 
    month: 4,
    year: 2026,
    available: 0,
    halfDays: 0,
    oldCl: 0,
    oldBalance: 0,
    remark: ''
  });


  const [isPunchFetching, setIsPunchFetching] = useState(false);
  const [showLateLoginsModal, setShowLateLoginsModal] = useState(false);
  const [showEarlyLogoutsModal, setShowEarlyLogoutsModal] = useState(false);
  const [lateLoginSearch, setLateLoginSearch] = useState('');
  const [earlyLogoutSearch, setEarlyLogoutSearch] = useState('');

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
      // Fallback: search in already-loaded attendanceLogs
      const targetDate = dateOverride || punchEditData.date;
      const log = (attendanceLogs || []).find(l => {
        const lDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0];
        return lDate === targetDate && String(l?.user_id || l?.Empcode || l?.EmpID || '') === String(empId);
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

  // Helper to calculate elapsed time
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

  // Timer Effect
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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Location detection on mount
  useEffect(() => {
    if (!localStorage.getItem('savedUserLocation')) {
      getUserCurrentLocation();
    }
  }, []);

  useEffect(() => {
    if (user?.token) {
      // Fetch Employees
      fetch(API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAllEmployees(data);
        })
        .catch(err => console.error("Error fetching users:", err));

      fetchAttendance();
      fetchLeaves();
      fetchLeaveStats();
    }
  }, [user, fromDate, toDate]);

  const handleLedgerExport = (type) => {
    const summaryData = allEmployees
      .filter(emp => String(emp.id || emp.EmpID) !== '20250')
      .map(emp => {
        const statsEntry = allLeaveStats.find(s => String(s.employee_id || s.user_id) === String(emp.id));
        let cl, lop, balance, year, halfDays;
        
        if (statsEntry) {
          cl = parseFloat(statsEntry.leaves_taken || 0);
          lop = parseFloat(statsEntry.LOP || statsEntry.lop || 0);
          balance = parseFloat(statsEntry.leaves_available || statsEntry.available_leaves || statsEntry.Available_Leaves || 0);
          year = statsEntry.year || new Date().getFullYear();
          halfDays = statsEntry.half_day || statsEntry.half_days || 0;
        } else {
          cl = 0;
          lop = 0;
          balance = 0;
          year = new Date().getFullYear();
          halfDays = 0;
        }
        
        return { 
          id: emp.id, 
          name: emp.name || emp.user_name, 
          year: year,
          cl: cl, 
          lop: lop, 
          halfDays: halfDays,
          taken: cl + lop, 
          available: balance 
        };
      });

    if (type === 'excel') {
      const wsData = summaryData.map(row => ({
        'Employee ID': row.id,
        'Name': row.name,
        'Year': row.year,
        'Casual Leaves': row.cl,
        'LOP Leaves': row.lop,
        'Half Days': row.halfDays,
        'Total Taken': row.taken,
        'Available Leaves': row.available
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leaves Summary");
      XLSX.writeFile(wb, "PManager_Leaves_Summary.xlsx");
    } else if (type === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Employee Leave Ledger", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      autoTable(doc, {
        startY: 35,
        head: [['ID', 'Employee Name', 'Year', 'CL', 'LOP', 'Half', 'Taken', 'Balance']],
        body: summaryData.map(r => [r.id, r.name, r.year, r.cl, r.lop, r.halfDays, r.taken, r.available + ' Days']),
        theme: 'grid',
        headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 20 },
          2: { cellWidth: 15 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 15 },
          6: { cellWidth: 15 },
          7: { cellWidth: 25, fontStyle: 'bold' }
        }
      });
      doc.save("PManager_Leaves_Summary.pdf");
    }
    setShowExportDropdown(false);
  };

  const fetchLeaves = async () => {
    try {
      setLeavesLoading(true);
      const res = await fetch(API_ENDPOINTS.LEAVES_GET, {
        headers: {
          'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      const responseData = await res.json();
      
      // Extremely robust parsing to find the leave array anywhere in the response
      let list = [];
      if (Array.isArray(responseData)) {
        list = responseData;
      } else if (responseData) {
        list = responseData.data || responseData.all || responseData.leaves || responseData.requests || [];
        // If data is an object containing an array (e.g., { data: { requests: [] } })
        if (!Array.isArray(list) && typeof list === 'object') {
          list = list.requests || list.leaves || list.all || Object.values(list).find(val => Array.isArray(val)) || [];
        }
      }

      // De-duplicate and filter out nulls
      const uniqueList = [];
      const seenIds = new Set();
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (!item) return;
          const itemId = item.id || item._id || item.EmpID || Math.random().toString();
          if (!seenIds.has(itemId)) {
            seenIds.add(itemId);
            uniqueList.push(item);
          }
        });
      }

      // Sort by date (newest first)
      uniqueList.sort((a, b) => {
        const dateA = new Date(a.created_at || a.start_date || a.PunchDate || 0);
        const dateB = new Date(b.created_at || b.start_date || b.PunchDate || 0);
        return dateB - dateA;
      });

      setLeaveRequests(uniqueList);

    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLeavesLoading(false);
    }
  };

  const fetchLeaveStats = async () => {
    if (!user?.token) return;
    try {
      const currentMonth = 4; // Specifically fetching 4th month as requested
      const currentYear = new Date().getFullYear();
      const res = await fetch(`${API_ENDPOINTS.ADMIN_LEAVE_STATS}?month=${currentMonth}&year=${currentYear}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.stats || data.data || []);
        setAllLeaveStats(list);
      }
    } catch (err) {
      console.error("Error fetching all leave stats:", err);
    }
  };

  const submitLeaveAdjustments = async () => {
    if (!user?.token || !leaveEditData.empId) return;
    setIsProcessing(true);
    try {
      const userRole = (user?.role || '').toUpperCase();
      const finalRole = userRole.includes('HR') ? 'HR' : (userRole.includes('ADMIN') || userRole.includes('CEO') || userRole.includes('PM') || userRole.includes('MANAGER') ? 'ADMIN' : 'PM');

      const response = await fetch(API_ENDPOINTS.ADMIN_LEAVE_STATS_UPDATE, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: leaveEditData.empId,
          employee_id: leaveEditData.empId,
          userId: leaveEditData.empId,
          EmpID: leaveEditData.empId,
          leaves_taken: leaveEditData.cl,
          leaves_available: leaveEditData.available,
          LOP: leaveEditData.lop,
          month: leaveEditData.month,
          year: leaveEditData.year,
          halfDays: leaveEditData.halfDays,
          remarks: leaveEditData.remark || 'Manual adjustment',
          role: finalRole,
          adminId: user?.id || user?.employee_id
        })
      });
      
      const result = await response.json().catch(() => ({}));
      if (response.ok || result.success) {
        alert(`✅ Leave adjustments for ${leaveEditData.empName} saved successfully!`);
        setShowLeaveEditModal(false);
        fetchLeaveStats(); // Refresh the table data
      } else {
        alert(`❌ Failed to save adjustments: ${result.message || result.error || 'Server Error (' + response.status + ')'}`);
      }
    } catch (err) {
      console.error("Error saving leave adjustments:", err);
      alert("❌ System error while saving adjustments.");
    } finally {
      setIsProcessing(false);
    }
  };

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
          // Normalized date comparison
          const logDate = (log?.punch_date || log?.PunchDate || log?.date || log?.created_at || '').split('T')[0];
          const isToday = logDate === todayStr;
          const isMe = String(log?.user_id) === String(user?.id) || String(log?.Empcode) === String(user?.id) || String(log?.EmpID) === String(user?.id) || log?.email === user?.email;
          return isToday && isMe;
        }).sort((a, b) => new Date(a?.created_at || a?.punch_time) - new Date(b?.created_at || b?.punch_time));

        if (myTodayLogs.length > 0) {
          // Robust session merging for biometric & manual punches
          const firstLog = myTodayLogs[0];
          const lastLog = myTodayLogs[myTodayLogs.length - 1];

          // Normalize times from all possible field names
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
      // 1. Get exact current location first
      let currentLoc = userLocation;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const locData = await locRes.json();

        // Official Office Geofence Mapping - Priority Descriptive Address
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
        fetchAttendance(); // Reload data
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
      // 1. Get exact current location first to ensure accuracy at the moment of logout
      let currentLoc = userLocation;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const locData = await locRes.json();

        // Official Office Geofence Mapping - Priority Descriptive Address
        currentLoc = locData.display_name || "Office Area";
        const lowerLoc = currentLoc.toLowerCase();
        if (lowerLoc.includes('navabharath') || lowerLoc.includes('chitrabhanu') || lowerLoc.includes('kuvempu nagara')) {
          currentLoc = "NAVABHARATH TECHNOLOGIES, 2nd Floor, 667/B, Chitrabhanu Road, Kuvempu Nagara, Mysuru, Karnataka 570023";
        }
        setUserLocation(currentLoc);
        localStorage.setItem('savedUserLocation', currentLoc);
      } catch (e) { console.log("Location refresh failed, using last known."); }

      // 2. Explicitly send OUT punch with fresh timestamp and precise location
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

    // --- Premium Header ---
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
        log.PunchIn_location || log.location || '----'
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Employee', 'ID', 'In Time', 'Out Time', 'Work Hrs', 'Status', 'Location']],
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
    const headers = ['Date', 'Employee', 'ID', 'In Time', 'Out Time', 'Work Hours', 'Status', 'Location'];

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
        log.PunchIn_location || log.location || '----'
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
      const logDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0];
      return logDate === todayStr;
    });
    const uniquePresentToday = new Set(todayLogs.map(l => String(l?.user_id || l?.Empcode || l?.EmpID || ''))).size;
    const presentCount = uniquePresentToday;

    const allReqs = leaveRequests || [];
    const totalLeaves = allReqs.length;
    const casualCount = allReqs.filter(r => String(r?.leave_type || r?.type || '').toUpperCase().includes('CASUAL')).length;
    const lopCount = allReqs.filter(r => String(r?.leave_type || r?.type || '').toUpperCase().includes('LOP')).length;
    const halfDays = allReqs.filter(r => String(r?.leave_type || r?.type || '').toUpperCase().includes('HALF')).length;
    const earnedCount = allReqs.filter(r => {
      const type = String(r?.leave_type || r?.type || '').toUpperCase();
      return type.includes('EARNED') || type.includes('EL');
    }).length;

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

    const earlyLogouts = (attendanceLogs || []).filter(l => {
      const pOut = parseTimeStr(l?.out_time || l?.OUTTime || l?.PunchOut || l?.punch_time_out || l?.out_time_biometric);
      if (pOut === -1) return false;
      return pOut < (17 * 60);
    });

    return { total: totalCount, present: presentCount, totalLeaves, halfDay: halfDays, casual: casualCount, lop: lopCount, earned: earnedCount, lateLogins, earlyLogouts };
  };

  const metrics = calculateMetrics();

  const displayedEmployees = (viewAll ? allEmployees : allEmployees.slice(0, 10)).filter(emp => {
    const term = searchTerm.toLowerCase();
    return !term || (emp.name || emp.user_name || '').toLowerCase().includes(term);
  });
  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />

      <main style={{ flex: 1, padding: winWidth < 768 ? '20px 15px 100px' : '30px 26px 30px', width: '100%', boxSizing: 'border-box', marginTop: winWidth < 768 ? '85px' : '110px', marginLeft: 'auto', marginRight: 'auto', maxWidth: '100%' }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#1d4ed8', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'flex-start', marginBottom: '32px', gap: '20px' }}>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '950', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.8px' }}>Attendance Dashboard</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                Biometric Syncing: Operational
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/my-leaves')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: 'white',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
                  transition: 'all 0.3s'
                }}
              >
                <Calendar size={18} /> My Leaves
              </button>

              <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', gap: '16px', alignItems: winWidth < 600 ? 'stretch' : 'center' }}>
                {/* Date Range Picker Pill */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '4px 14px', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', minHeight: '44px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '800', color: '#1e293b', width: '105px' }}
                    />
                  </div>

                  <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 4px' }}>TO</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '800', color: '#1e293b', width: '105px' }}
                    />

                    <button
                      onClick={() => { fetchAttendance(); fetchLeaves(); }}
                      style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#64748b', transition: '0.2s', padding: '4px' }}
                    >
                      <RefreshCw size={16} className={attendanceLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                <div ref={dropdownRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', width: '100%' }}
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


          {/* Biometric Check-in Card */}

          <div style={{ background: 'white', borderRadius: '24px', padding: winWidth < 768 ? '24px' : '32px', marginBottom: '32px', border: '1.5px solid #f1f5f9', boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                onClick={getUserCurrentLocation}
                style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '18px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bae6fd', cursor: 'pointer', transition: '0.3s' }}
              >
                <MapPin size={28} className={isLocating ? 'animate-bounce' : ''} />
              </div>
              <div>
                <div style={{ fontSize: winWidth < 768 ? '18px' : '20px', fontWeight: '950', color: '#0f172a', marginBottom: '1px' }}>Shift Management</div>
                <div style={{ fontSize: '11px', fontWeight: '950', color: (personalAttendance?.in_time && personalAttendance.in_time !== '----') ? '#16a34a' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                  STATUS: {(personalAttendance?.in_time && personalAttendance.in_time !== '----') ? 'IN OFFICE' : 'OFFLINE'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={13} color="#cbd5e1" /> {isLocating ? 'Determining location...' : (userLocation || 'Location access required')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', alignItems: winWidth < 600 ? 'stretch' : 'center', gap: '32px' }}>
              {/* General Calendar Display */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#f8fafc',
                padding: '10px 16px',
                borderRadius: '20px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '44px',
                  height: '46px',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ background: '#ef4444', height: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: '950', color: 'white', letterSpacing: '0.5px' }}>
                    {new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '950', color: '#1e293b', lineHeight: '1' }}>
                    {new Date().getDate()}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '13px', fontWeight: '950', color: '#1e293b' }}>
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} color="#94a3b8" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                </div>
              </div>

              {personalAttendance?.in_time && (!personalAttendance?.out_time || personalAttendance?.out_time === '--:--' || personalAttendance?.out_time === '----' || personalAttendance?.out_time === '00:00' || personalAttendance?.out_time === '00:00:00') && (
                <div style={{ textAlign: winWidth < 600 ? 'center' : 'right', minWidth: '120px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Shift Duration</div>
                  <div style={{ fontSize: '20px', fontWeight: '910', color: '#0f172a', fontFamily: '"JetBrains Mono", "Courier New", monospace', letterSpacing: '1px' }}>{elapsedTime}</div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {!(personalAttendance?.in_time && personalAttendance.in_time !== '----') ? (
                  <button
                    onClick={handleCheckIn}
                    disabled={isProcessing}
                    style={{
                      padding: '16px 52px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '950',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
                      transition: 'all 0.3s',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <Fingerprint size={22} /> {isProcessing ? 'SYNCING...' : 'PUNCH IN'}
                  </button>
                ) : (!personalAttendance.out_time || personalAttendance.out_time === '--:--' || personalAttendance.out_time === '----' || personalAttendance?.out_time === '00:00' || personalAttendance?.out_time === '00:00:00') ? (
                  <button
                    onClick={handleCheckOut}
                    disabled={isProcessing}
                    style={{
                      padding: '16px 52px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #be123c 100%)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '950',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
                      transition: 'all 0.3s',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <Fingerprint size={22} /> {isProcessing ? 'SAVING...' : 'PUNCH OUT'}
                  </button>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 36px',
                    borderRadius: '100px',
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

          {/* Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr 1fr' : (winWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)'), gap: '16px', marginBottom: '40px' }}>
            {[
              { label: 'PRESENT', value: metrics.present, icon: UserCheck, color: '#059669', bg: '#ecfdf5' },
              { label: 'LEAVES', value: metrics.totalLeaves, icon: Calendar, color: '#dc2626', bg: '#fef2f2' },
              { label: 'HALF DAYS', value: metrics.halfDay, icon: Clock, color: '#f97316', bg: '#fff7ed' },
              { label: 'Early logout', value: metrics.earlyLogouts.length, icon: Coffee, color: '#3b82f6', bg: '#eff6ff', isEarlyAction: true },
              { label: 'Late Login', value: metrics.lateLogins.length, icon: Sparkles, color: '#7c3aed', bg: '#f5f3ff', isLateAction: true },
              { label: 'Punch-in Edit', value: metrics.lop, icon: AlertTriangle, color: '#db2777', bg: '#fdf2f8', isAction: true }
            ].map((m, i) => (
              <div
                key={i}
                onClick={() => {
                if (m.isAction) setShowPunchEditModal(true);
                else if (m.isLateAction) setShowLateLoginsModal(true);
                else if (m.isEarlyAction) setShowEarlyLogoutsModal(true);
                else if (m.label === 'LEAVES') setActiveTab('leave');
              }}
                style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1.5px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', cursor: (m.isAction || m.isLateAction || m.isEarlyAction || m.label === 'LEAVES') ? 'pointer' : 'default', transition: 'all 0.2s' }}
                onMouseOver={e => (m.isAction || m.isLateAction || m.isEarlyAction || m.label === 'LEAVES') ? (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)') : null}
                onMouseOut={e => (m.isAction || m.isLateAction || m.isEarlyAction || m.label === 'LEAVES') ? (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.01)') : null}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: m.bg, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><m.icon size={20} /></div>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{m.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>{m.value}</div>
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
            <button onClick={() => setActiveTab('attendance')} style={{ padding: '0 0 12px 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'attendance' ? '3px solid #1d4ed8' : '3px solid transparent', color: activeTab === 'attendance' ? '#1d4ed8' : '#64748b', fontWeight: '800', fontSize: winWidth < 600 ? '13px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} > Attendance Log </button>
            <button onClick={() => setActiveTab('leave')} style={{ padding: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderBottom: activeTab === 'leave' ? '3px solid #1d4ed8' : '3px solid transparent', color: activeTab === 'leave' ? '#1d4ed8' : '#64748b', fontWeight: '800', fontSize: winWidth < 600 ? '13px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} > Leave Requests <span style={{ background: '#1d4ed8', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{leaveRequests.length}</span> </button>
            <button onClick={() => setActiveTab('summary')} style={{ padding: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderBottom: activeTab === 'summary' ? '3px solid #1d4ed8' : '3px solid transparent', color: activeTab === 'summary' ? '#1d4ed8' : '#64748b', fontWeight: '800', fontSize: winWidth < 600 ? '13px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }} > <Table size={14} /> Leaves Summary (XL) </button>

          </div>

          {activeTab === 'attendance' ? (
            <>
              <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'center', marginBottom: '24px', gap: '16px' }}>
                <div style={{ position: 'relative', width: winWidth < 1024 ? '100%' : '320px' }}>
                  <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                  <input type="text" placeholder="Filter employee, role or department..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', outline: 'none', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', gap: '12px', alignItems: 'stretch' }}>
                  <div ref={filterDropdownRef} style={{ position: 'relative', flex: 1 }}>
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '14px',
                        background: 'white',
                        color: '#64748b',
                        border: '1.5px solid #e2e8f0',
                        fontWeight: '900',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.3s',
                        width: '100%'
                      }}
                    >
                      <Filter size={16} /> Filter <ChevronDown size={14} className={showFilterDropdown ? 'rotate-180' : ''} style={{ transition: '0.3s' }} />
                    </button>

                    {showFilterDropdown && (
                      <div className="animate-fade-in" style={{ position: 'absolute', top: '55px', right: winWidth < 1024 ? 'auto' : 0, left: winWidth < 1024 ? 0 : 'auto', width: winWidth < 480 ? 'calc(100vw - 40px)' : '280px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 15px 30px -10px rgba(0,0,0,0.15)', zIndex: 100, overflow: 'hidden', padding: '12px' }}>
                        {!filterSubMode ? (
                          <>
                            <button
                              onClick={() => setFilterSubMode('date')}
                              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', color: '#1e293b', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'left', borderRadius: '12px', transition: '0.2s' }}
                              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Calendar size={18} color="#6366f1" /> Date Range
                            </button>
                            <button
                              onClick={() => setFilterSubMode('name')}
                              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', color: '#1e293b', fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'left', borderRadius: '12px', transition: '0.2s' }}
                              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <User size={18} color="#06b6d4" /> Name
                            </button>
                          </>
                        ) : filterSubMode === 'name' ? (
                          <div style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>FILTER BY NAME</span>
                              <button onClick={() => setFilterSubMode(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                            </div>
                            <input
                              type="text"
                              autoFocus
                              placeholder="Enter name..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: '700', outline: 'none', background: '#f8fafc' }}
                            />
                            <button onClick={() => setShowFilterDropdown(false)} style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>Apply Filter</button>
                          </div>
                        ) : (
                          <div style={{ padding: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>DATE RANGE</span>
                              <button onClick={() => setFilterSubMode(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>FROM DATE</label>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }} />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>TO DATE</label>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }} />
                              </div>
                            </div>
                            <button onClick={fetchAttendance} style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>Refresh Logs</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setViewAll(!viewAll)}
                    style={{
                      padding: '12px 28px',
                      borderRadius: '14px',
                      background: viewAll ? '#f1f5f9' : '#0f172a',
                      color: viewAll ? '#64748b' : 'white',
                      border: 'none',
                      fontWeight: '950',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      flex: 1
                    }}
                  >
                    {viewAll ? 'View Leaders Only' : 'View All Workforce'}
                  </button>
                </div>
              </div>

              <section style={{ background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.02)', overflowX: winWidth < 768 ? 'hidden' : 'auto' }}>
                {winWidth < 768 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                    {displayedEmployees.length > 0 ? (
                      displayedEmployees.map((emp, idx) => {
                        const log = (attendanceLogs || [])
                          .filter(l => {
                            if (!l) return false;
                            const logUserId = String(l?.user_id || l?.Empcode || l?.EmpID || '').trim();
                            const empId = String(emp?.id || '').trim();
                            return empId && logUserId && (logUserId === empId);
                          })
                          .sort((a, b) => {
                            const getD = x => new Date(x?.punch_date || x?.date || x?.created_at || 0).getTime();
                            return getD(b) - getD(a);
                          })[0];

                        const punchIn = log?.in_time || log?.INTime || log?.PunchIn || log?.punch_time || '----';
                        const punchOut = log?.out_time || log?.OUTTime || log?.PunchOut || (log?.in_time || log?.INTime ? '----' : log?.punch_time) || '----';
                        const workHrs = log?.work_time || log?.work_hrs || log?.WorkTime || '00:00';
                        const pDate = log?.punch_date || log?.date || log?.created_at;

                        return (
                          <div key={idx} style={{ background: '#f8fafc', borderRadius: '18px', padding: '16px', border: '1.5px solid #eef2ff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '950' }}>
                                {String(emp.name || emp.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>{emp.name || emp.user_name || 'Unknown User'}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>#{emp.id} • {emp.role || 'Employee'}</div>
                              </div>
                              <div onClick={() => navigate(`/attendance/detail/${emp.id}`)} style={{ padding: '8px', borderRadius: '10px', background: 'white', color: '#1d4ed8', cursor: 'pointer' }}><Info size={18} /></div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Date</div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>{pDate ? new Date(pDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '----'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Hours</div>
                                <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>{workHrs?.replace(/\s:\s/g, ':') || '00:00'} <span style={{ fontSize: '9px', color: '#94a3b8' }}>HRS</span></div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Punch In</div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{punchIn}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Punch Out</div>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{punchOut}</div>
                              </div>
                              <div style={{ gridColumn: 'span 2' }}>
                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Remark</div>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>{log?.remarks || log?.rm_remarks || log?.pm_remarks || '-'}</div>
                              </div>
                            </div>
                            
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <MapPin size={10} style={{ marginRight: '4px' }} /> {log?.in_location || log?.location || '----'}
                              </div>
                              {(() => {
                                const punchDate = log?.punch_date || log?.date || log?.created_at || new Date().toISOString();
                                const d = new Date(punchDate);
                                const isSunday = d.getDay() === 0;
                                const month = d.toLocaleDateString('en-US', { month: 'short' });
                                const dateDay = String(d.getDate()).padStart(2, '0');
                                const dayMonth = `${month} ${dateDay}`;
                                const holidays = ['Jan 01', 'Jan 26', 'Mar 04', 'Mar 19', 'Mar 21', 'Mar 26', 'Mar 31', 'Apr 03', 'May 01', 'May 27', 'Jun 26', 'Aug 15', 'Aug 26', 'Sep 04', 'Oct 02', 'Oct 20', 'Nov 08', 'Nov 24', 'Dec 25'];
                                const isHoliday = holidays.includes(dayMonth);
                                let rawStatus = String(log?.status || (punchIn !== '----' ? 'PRESENT' : 'ABSENT')).toUpperCase();
                                if (punchIn === '----' || rawStatus === 'ABSENT') {
                                  if (isSunday) rawStatus = 'WO';
                                  else if (isHoliday) rawStatus = 'NH';
                                  else rawStatus = 'ABSENT';
                                }
                                const isPresent = rawStatus.includes('PRESENT') || rawStatus === 'P';
                                const isWO = rawStatus === 'WO';
                                const isNH = rawStatus === 'NH';

                                return (
                                  <div style={{ padding: '4px 10px', borderRadius: '100px', background: isPresent ? '#f0fdf4' : (isWO || isNH ? '#eff6ff' : '#fef2f2'), border: `1px solid ${isPresent ? '#bbf7d0' : (isWO || isNH ? '#dbeafe' : '#fee2e2')}`, color: isPresent ? '#16a34a' : (isWO || isNH ? '#3b82f6' : '#ef4444'), fontSize: '10px', fontWeight: '900' }}>
                                    {rawStatus}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontWeight: '700' }}>No attendance records found</div>
                    )}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Employee</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Employee ID</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Log Date</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch In</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Punch Out</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Hrs</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Remark</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>PunchIn_location</th><th style={{ padding: '24px 20px', fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>PunchOut_location</th></tr>
                    </thead>
                    <tbody>
                      {displayedEmployees.length > 0 ? (
                        displayedEmployees.map((emp, idx) => {
                          const log = (attendanceLogs || [])
                            .filter(l => {
                              if (!l) return false;
                              const logUserId = String(l?.user_id || l?.Empcode || l?.EmpID || '').trim();
                              const empId = String(emp?.id || '').trim();
                              return empId && logUserId && (logUserId === empId);
                            })
                            .sort((a, b) => {
                              const getD = x => new Date(x?.punch_date || x?.date || x?.created_at || 0).getTime();
                              return getD(b) - getD(a);
                            })[0];

                          const punchIn = log?.in_time || log?.INTime || log?.PunchIn || log?.punch_time || '----';
                          const punchOut = log?.out_time || log?.OUTTime || log?.PunchOut || (log?.in_time || log?.INTime ? '----' : log?.punch_time) || '----';
                          const workHrs = log?.work_time || log?.work_hrs || log?.WorkTime || '00:00';
                          const pDate = log?.punch_date || log?.date || log?.created_at;

                          return (
                            <tr key={idx} style={{ borderBottom: '1.5px solid #f8fafc', transition: '0.2s' }}><td style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '950' }}>
                                  {String(emp.name || emp.user_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b', cursor: 'pointer' }} onClick={() => navigate(`/attendance/detail/${emp.id}`)}> {emp.name || emp.user_name || 'Unknown User'} </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>{emp.role || emp.department || 'Employee'}</div>
                                </div>
                              </div>
                            </td>
                              <td style={{ padding: '20px', fontSize: '13px', fontWeight: '900', color: '#3863a8' }}>#{emp.id || idx + 101}</td>
                              <td style={{ padding: '20px', fontSize: '13px', fontWeight: '800', color: '#64748b', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Calendar size={14} color="#cbd5e1" />
                                  {pDate ? new Date(pDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '----'}
                                </div>
                              </td>
                              <td style={{ padding: '20px', fontSize: '14px', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap' }}>{punchIn}</td>
                              <td style={{ padding: '20px', fontSize: '14px', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap' }}>{punchOut}</td>
                              <td style={{ padding: '20px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b' }}>
                                  {workHrs?.replace(/\s:\s/g, ':') || '00:00'} <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>HOURS</span>
                                </div>
                              </td>
                              <td style={{ padding: '20px', fontSize: '12px', fontWeight: '800', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log?.remarks || log?.rm_remarks || log?.pm_remarks || '-'}>
                                {log?.remarks || log?.rm_remarks || log?.pm_remarks || '-'}
                              </td>
                              <td style={{ padding: '20px' }}>
                                {(() => {
                                  const punchDate = log?.punch_date || log?.date || log?.created_at || new Date().toISOString();
                                  const d = new Date(punchDate);
                                  const isSunday = d.getDay() === 0;

                                  const month = d.toLocaleDateString('en-US', { month: 'short' });
                                  const dateDay = String(d.getDate()).padStart(2, '0');
                                  const dayMonth = `${month} ${dateDay}`;
                                  const holidays = ['Jan 01', 'Jan 26', 'Mar 04', 'Mar 19', 'Mar 21', 'Mar 26', 'Mar 31', 'Apr 03', 'May 01', 'May 27', 'Jun 26', 'Aug 15', 'Aug 26', 'Sep 04', 'Oct 02', 'Oct 20', 'Nov 08', 'Nov 24', 'Dec 25'];
                                  const isHoliday = holidays.includes(dayMonth);

                                  let rawStatus = String(log?.status || (punchIn !== '----' ? 'PRESENT' : 'ABSENT')).toUpperCase();
                                  if (punchIn === '----' || rawStatus === 'ABSENT') {
                                    if (isSunday) rawStatus = 'WO';
                                    else if (isHoliday) rawStatus = 'NH';
                                    else rawStatus = 'ABSENT';
                                  }

                                  const isPresent = rawStatus.includes('PRESENT') || rawStatus === 'P';
                                  const isWO = rawStatus === 'WO';
                                  const isNH = rawStatus === 'NH';

                                  return (
                                    <div style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px 14px',
                                      borderRadius: '100px',
                                      background: isPresent ? '#f0fdf4' : (isWO || isNH ? '#eff6ff' : '#fef2f2'),
                                      border: `1.5px solid ${isPresent ? '#bbf7d0' : (isWO || isNH ? '#dbeafe' : '#fee2e2')}`,
                                      color: isPresent ? '#16a34a' : (isWO || isNH ? '#3b82f6' : '#ef4444'),
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPresent ? '#22c55e' : (isWO || isNH ? '#3b82f6' : '#ef4444') }}></div>
                                      {rawStatus}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td style={{ padding: '20px', fontSize: '12px', fontWeight: '800', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log?.in_location || log?.location || '----'}>
                                {log?.in_location || log?.location || '----'}
                              </td>
                              <td style={{ padding: '20px', fontSize: '12px', fontWeight: '800', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log?.out_location || '----'}>
                                {log?.out_location || '----'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="9" style={{ textAlign: 'center', padding: '100px', color: '#64748b', fontWeight: '900' }}> No matching data found for selected range. </td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          ) : activeTab === 'summary' ? (
            <div className="animate-fade-in" style={{ background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.02)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '950', color: '#0f172a' }}>Employee Leave Ledger</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Comprehensive summary of all employee leave balances.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button 
                    onClick={() => setShowAllLedger(!showAllLedger)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '10px 20px', 
                      borderRadius: '12px', 
                      background: showAllLedger ? '#f1f5f9' : '#0f172a', 
                      color: showAllLedger ? '#475569' : 'white', 
                      border: 'none', 
                      fontWeight: '800', 
                      fontSize: '13px', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {showAllLedger ? 'View Less' : 'View All'}
                  </button>
                  <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button 
                      onClick={() => setShowExportDropdown(!showExportDropdown)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 20px', 
                        borderRadius: '12px', 
                        background: '#16a34a', 
                        color: 'white', 
                        border: 'none', 
                        fontWeight: '800', 
                        fontSize: '13px', 
                        cursor: 'pointer' 
                      }}
                    >
                      <Download size={16} /> Export <ChevronDown size={14} style={{ transform: showExportDropdown ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>
                    
                    {showExportDropdown && (
                      <div className="animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
                        <button 
                          onClick={() => handleLedgerExport('excel')}
                          style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: '#1e293b', fontWeight: '700', fontSize: '13px', cursor: 'pointer', textAlign: 'left', transition: '0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <FileText size={16} color="#16a34a" /> Export as Excel
                        </button>
                        <button 
                          onClick={() => handleLedgerExport('pdf')}
                          style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: '#1e293b', fontWeight: '700', fontSize: '13px', cursor: 'pointer', textAlign: 'left', transition: '0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <FileText size={16} color="#dc2626" /> Export as PDF
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>EMPLOYEE</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>ID</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>YEAR</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>CASUAL LEAVES</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>LOP LEAVES</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>HALF DAYS</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>TAKEN</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>AVAILABLE LEAVES</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllLedger ? allEmployees : allEmployees.slice(0, 7))
                      .filter(emp => String(emp.id || emp.EmpID) !== '20250')
                      .map((emp, idx) => {
                      // Prioritize data from leave_stats table (allLeaveStats)
                      const statsEntry = allLeaveStats.find(s => String(s.employee_id || s.user_id) === String(emp.id));
                      
                      let cl, lop, balance;
                      
                      if (statsEntry) {
                        cl = parseFloat(statsEntry.leaves_taken || 0);
                        lop = parseFloat(statsEntry.LOP || statsEntry.lop || 0);
                        balance = parseFloat(statsEntry.leaves_available || statsEntry.available_leaves || statsEntry.Available_Leaves || 0);
                      } else {
                        cl = 0;
                        lop = 0;
                        balance = 0;
                      }
                      
                      const taken = cl + lop;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '950' }}>
                                {String(emp.name || emp.user_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              {emp.name || emp.user_name}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#000000' }}>#{emp.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#64748b' }}>{statsEntry?.year || new Date().getFullYear()}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#000000' }}>{cl}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#000000' }}>{lop}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#000000' }}>{statsEntry?.half_day || statsEntry?.half_days || 0}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#000000' }}>{taken}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '950', color: '#16a34a' }}>{balance} Days</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button 
                              onClick={() => {
                                  setLeaveEditData({ 
                                    empId: emp.id, 
                                    empName: emp.name || emp.user_name, 
                                    cl, 
                                    lop, 
                                    month: 4,
                                    year: 2026,
                                    available: balance,
                                    halfDays: statsEntry?.half_day || statsEntry?.halfDays || 0,
                                    oldCl: cl,
                                    oldBalance: balance
                                  });
                                setShowLeaveEditModal(true);
                              }}
                              style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', color: '#475569', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
              {leavesLoading ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px', width: '100%' }}>
                  <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #f3f3f3', borderTop: '3px solid #1d4ed8', borderRadius: '50%', margin: '0 auto 16px' }}></div>
                  <p style={{ fontWeight: '800', color: '#64748b' }}>Fetching leave applications...</p>
                </div>
              ) : leaveRequests.length > 0 ? (
                leaveRequests.map(req => {
                  const rawStatus = String(req.status || 'PENDING').toUpperCase();
                  // STATUS PRECEDENCE: REJECTED > APPROVED > PENDING
                  let status = 'PENDING';
                  if (rawStatus.includes('REJECTED')) status = 'REJECTED';
                  else if (rawStatus.includes('APPROVED')) status = 'APPROVED';
                  else status = 'PENDING';

                  const sColor = status === 'APPROVED' ? '#10b981' : (status === 'REJECTED' ? '#ef4444' : '#f59e0b');
                  const sBg = status === 'APPROVED' ? '#ecfdf5' : (status === 'REJECTED' ? '#fef2f2' : '#fffbeb');
                  const displayDate = req.start_date ? new Date(req.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

                  return (
                    <div
                      key={req.id}
                      onClick={() => navigate(`/attendance/leave/${req.id}`)}
                      style={{
                        background: 'white',
                        borderRadius: '24px',
                        padding: '24px',
                        border: '1.5px solid #f1f5f9',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: '0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '280px'
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.05)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', minHeight: '75px', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                          <div style={{ width: '52px', height: '52px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: '#f8fafc', border: '1.5px solid #f1f5f9', color: '#475569' }}>
                            <User size={24} strokeWidth={2.5} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.employee_name || req.name}>{req.employee_name || req.name || 'Unknown'}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', fontWeight: '900', color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>ID: #{req.user_id || req.emp_id || req.id}</span>
                              <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>{req.leave_type || req.type || 'Leave'}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: '950', color: sColor, background: sBg, padding: '6px 14px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</span>
                      </div>

                      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                        <Calendar size={14} /> {displayDate}
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1.5px solid #f1f5f9', lineHeight: '1.4', minHeight: '80px', display: 'flex', alignItems: 'center' }}>
                          "{req.reason ? (req.reason.length > 90 ? req.reason.substring(0, 90) + '...' : req.reason) : 'No specific reason provided'}"
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', width: '100%' }}>
                  <Info size={40} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                  <p style={{ fontWeight: '900', color: '#94a3b8' }}>No pending or recent leave requests found.</p>
                </div>
              )}
            </div>
          )}



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
                                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{emp?.name || log?.user_name || 'Unknown Employee'}</div>
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
                                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{emp?.name || log?.user_name || 'Unknown Employee'}</div>
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

          {/* Leave Edit Modal (XL Sheet) */}
          {showLeaveEditModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
              <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                <button onClick={() => setShowLeaveEditModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f0f9ff', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Table size={24} /></div>
                  <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 8px 0' }}>Adjust Leave Ledger</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Editing leaves for <strong>{leaveEditData.empName} ({leaveEditData.empId})</strong></p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Month (1-12)</label>
                    <input type="number" min="1" max="12" value={leaveEditData.month} onChange={e => setLeaveEditData({...leaveEditData, month: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', background: '#f0f9ff' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Year</label>
                    <input type="number" value={leaveEditData.year} onChange={e => setLeaveEditData({...leaveEditData, year: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', background: '#f8fafc' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Leaves Taken</label>
                    <input type="number" value={leaveEditData.cl} onChange={e => setLeaveEditData({...leaveEditData, cl: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', background: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Leaves Available</label>
                    <input type="number" value={leaveEditData.available} onChange={e => setLeaveEditData({...leaveEditData, available: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', background: '#f0fdf4' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>LOP Leaves</label>
                    <input type="number" value={leaveEditData.lop} onChange={e => setLeaveEditData({...leaveEditData, lop: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', background: '#fff1f2' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Half Days</label>
                    <input type="number" value={leaveEditData.halfDays} onChange={e => setLeaveEditData({...leaveEditData, halfDays: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', background: '#fefce8' }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Adjustment Remark</label>
                  <textarea 
                    value={leaveEditData.remark} 
                    onChange={e => setLeaveEditData({...leaveEditData, remark: e.target.value})} 
                    placeholder="e.g. Corrected month stats"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '600', background: '#f8fafc', minHeight: '60px', resize: 'none', fontSize: '13px' }} 
                  />
                </div>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                  <button onClick={() => setShowLeaveEditModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                   <button 
                    onClick={submitLeaveAdjustments} 
                    disabled={isProcessing}
                    style={{ flex: 2, padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.2)', opacity: isProcessing ? 0.7 : 1 }}
                  >
                    {isProcessing ? 'Saving...' : 'Save Adjustments'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
      <AppFooter />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .pm-dashboard-container main { animation: fadeIn 0.4s ease-out; }
        .glow-button-primary:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(15, 23, 42, 0.5); }
        .glow-button-success:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.5); }
      `}</style>
    </div>
  );
}