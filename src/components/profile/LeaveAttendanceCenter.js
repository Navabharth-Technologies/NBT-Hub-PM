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

  const [allEmployees, setAllEmployees] = useState([]);
  const [userLocation, setUserLocation] = useState(localStorage.getItem('savedUserLocation') || 'Fetching location...');
  const [isLocating, setIsLocating] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
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
    } catch (e) { return '00:00:00'; }
  };

  useEffect(() => {
    let interval;
    const isActive = personalAttendance?.in_time && (!personalAttendance?.out_time || personalAttendance?.out_time === '--:--' || personalAttendance?.out_time === '----' || personalAttendance?.out_time === '00:00');
    if (isActive) {
      interval = setInterval(() => {
        setElapsedTime(calculateElapsed(personalAttendance?.in_time || personalAttendance?.INTime));
      }, 1000);
    } else { setElapsedTime('00:00:00'); }
    return () => clearInterval(interval);
  }, [personalAttendance]);

  useEffect(() => {
    if (user?.token) {
      fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setAllEmployees(data); })
        .catch(err => console.error("Error fetching users:", err));
      fetchAttendance();
    }
  }, [user, fromDate, toDate]);

  const fetchAttendance = async () => {
    try {
      setAttendanceLoading(true);
      const queryParams = new URLSearchParams({ startDate: fromDate, endDate: toDate });
      const logsUrl = `${(API_ENDPOINTS.ATTENDANCE_LOGS_GET || 'http://localhost:3000/api/attendance_logs')}?${queryParams.toString()}`;
      const logsRes = await fetch(logsUrl, {
        headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token') || TEAM_OFFICE_AUTH_TOKEN}` }
      });
      const logsData = await logsRes.json();
      const masterLogs = logsData.data || logsData.attendance || logsData.logs || logsData;
      if (Array.isArray(masterLogs)) {
        setAttendanceLogs(masterLogs.filter(l => l !== null));
        const todayStr = new Date().toISOString().split('T')[0];
        const myTodayLogs = masterLogs.filter(log => {
          const logDate = (log?.punch_date || log?.PunchDate || log?.date || log?.created_at || '').split('T')[0];
          const isToday = logDate === todayStr;
          const isMe = String(log?.user_id) === String(user?.id) || log?.email === user?.email;
          return isToday && isMe;
        }).sort((a, b) => new Date(a?.created_at || a?.punch_time) - new Date(b?.created_at || b?.punch_time));
        if (myTodayLogs.length > 0) {
          const firstLog = myTodayLogs[0];
          const lastLog = myTodayLogs[myTodayLogs.length - 1];
          setPersonalAttendance({
            ...firstLog,
            in_time: firstLog?.in_time || firstLog?.PunchIn || firstLog?.punch_time,
            out_time: (lastLog && lastLog !== firstLog) ? (lastLog?.out_time || lastLog?.PunchOut || lastLog?.punch_time) : (firstLog?.out_time || '----')
          });
        } else { setPersonalAttendance(null); }
      }
    } catch (err) { setAttendanceError('Attendance system unreachable'); }
    finally { setAttendanceLoading(false); }
  };

  const handleCheckIn = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch((API_ENDPOINTS.ATTENDANCE_LOGS_GET || '').split('/api/')[0] + '/api/attendance_logs/punch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'P', remark: 'WEB_PUNCH', location: userLocation })
      });
      if (res.ok) fetchAttendance();
    } catch (err) { alert('Check-in error'); }
    finally { setIsProcessing(false); }
  };

  const handleCheckOut = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch((API_ENDPOINTS.ATTENDANCE_LOGS_GET || '').split('/api/')[0] + '/api/attendance_logs/punch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'O', remark: 'WEB_OUT', location: userLocation })
      });
      if (res.ok) fetchAttendance();
    } catch (err) { alert('Check-out error'); }
    finally { setIsProcessing(false); }
  };

  const getUserCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      setUserLocation(data.display_name || "Office Area");
      setIsLocating(false);
    }, () => setIsLocating(false));
  };

  const calculateMetrics = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = (attendanceLogs || []).filter(l => (l?.punch_date || l?.date || l?.created_at || '').split('T')[0] === todayStr);
    const presentCount = new Set(todayLogs.map(l => String(l?.user_id))).size;
    return { present: presentCount, late: 0, early: 0, half: 0 };
  };

  const metrics = calculateMetrics();
  const filteredEmployees = allEmployees.filter(emp => {
    const s = searchTerm.toLowerCase();
    return (emp.name || emp.user_name || '').toLowerCase().includes(s) ||
           String(emp.id).toLowerCase().includes(s) ||
           (emp.role || '').toLowerCase().includes(s) ||
           (emp.department || '').toLowerCase().includes(s);
  });

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 40px' : '120px 26px 40px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', marginBottom: '20px' }}>
            <ArrowLeft size={18} color="#64748b" />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.8px' }}>Attendance Hub</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span> Biometric Syncing: Operational
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>

              <button style={{ padding: '12px 24px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '800', fontSize: '13px' }}>Export</button>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '24px', padding: winWidth < 768 ? '20px' : '32px', marginBottom: '32px', border: '1.5px solid #f1f5f9', display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', gap: winWidth < 1024 ? '20px' : '0', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={28} />
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a' }}>Shift Status</div>
                <div style={{ fontSize: '10px', fontWeight: '950', color: personalAttendance?.in_time ? '#16a34a' : '#ef4444', textTransform: 'uppercase' }}>{personalAttendance?.in_time ? 'In Office' : 'Offline'}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{userLocation}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', alignItems: winWidth < 768 ? 'stretch' : 'center', gap: winWidth < 768 ? '16px' : '32px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: winWidth < 768 ? 'space-between' : 'flex-start', gap: '12px', background: '#f8fafc', padding: '8px 14px', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
                 <div style={{ width: '38px', height: '40px', background: 'white', borderRadius: '10px', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ background: '#ef4444', color: 'white', fontSize: '6px', fontWeight: '950', textAlign: 'center' }}>MAY</div>
                    <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: '950' }}>{new Date().getDate()}</div>
                 </div>
                 <div>
                   <div style={{ fontSize: '12px', fontWeight: '900' }}>MAY 2026</div>
                   <div style={{ fontSize: '10px', color: '#64748b' }}>THURSDAY</div>
                 </div>
               </div>
               {personalAttendance?.in_time && !personalAttendance?.out_time && (
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8' }}>SESSION</div>
                   <div style={{ fontSize: '20px', fontWeight: '900' }}>{elapsedTime}</div>
                 </div>
               )}
               <button onClick={personalAttendance?.in_time ? handleCheckOut : handleCheckIn} style={{ padding: '14px 32px', borderRadius: '100px', background: personalAttendance?.in_time ? '#ef4444' : '#0f172a', color: 'white', fontWeight: '950', border: 'none', width: winWidth < 768 ? '100%' : 'auto' }}>
                 {personalAttendance?.in_time ? 'PUNCH OUT' : 'PUNCH IN'}
               </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? 'repeat(2, 1fr)' : winWidth < 1024 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: winWidth < 768 ? '12px' : '20px', marginBottom: '40px' }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
               <div style={{ color: '#16a34a', marginBottom: '12px' }}><UserCheck size={18} /></div>
               <div style={{ fontSize: '24px', fontWeight: '950' }}>{metrics.present}</div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PRESENT</div>
            </div>
            <div onClick={() => navigate('/leaves')} style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9', cursor: 'pointer' }}>
               <div style={{ color: '#ef4444', marginBottom: '12px' }}><Calendar size={18} /></div>
               <div style={{ fontSize: '18px', fontWeight: '950' }}>VIEW</div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>LEAVES</div>
            </div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
               <div style={{ color: '#f97316', marginBottom: '12px' }}><Clock size={18} /></div>
               <div style={{ fontSize: '24px', fontWeight: '950' }}>0</div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>HALF DAYS</div>
            </div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
               <div style={{ color: '#3b82f6', marginBottom: '12px' }}><Coffee size={18} /></div>
               <div style={{ fontSize: '24px', fontWeight: '950' }}>0</div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>EARLY LOGOUT</div>
            </div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
               <div style={{ color: '#7c3aed', marginBottom: '12px' }}><Sparkles size={18} /></div>
               <div style={{ fontSize: '24px', fontWeight: '950' }}>0</div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>LATE LOGIN</div>
            </div>
            <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9' }}>
               <div style={{ color: '#db2777', marginBottom: '12px' }}><AlertTriangle size={18} /></div>
               <div style={{ fontSize: '18px', fontWeight: '950' }}>EDIT</div>
               <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PUNCH-IN EDIT</div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '950' }}>Attendance Log</h3>
               <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', height: '40px' }}>
                 <Search size={16} color="#94a3b8" />
                 <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0 8px', fontSize: '13px' }} />
               </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>EMPLOYEE</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>ID</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>DATE</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>PUNCH IN</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>PUNCH OUT</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>WORK HRS</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>STATUS</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>IN LOCATION</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>OUT LOCATION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp, i) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const logsForEmp = (attendanceLogs || [])
                      .filter(l => {
                        if (!l) return false;
                        const logUserId = String(l?.user_id || l?.Empcode || l?.EmpID || '').trim();
                        const empId = String(emp?.id || '').trim();
                        const logDate = (l?.punch_date || l?.date || l?.created_at || '').split('T')[0];
                        return empId && logUserId && (logUserId === empId) && (logDate === todayStr);
                      })
                      .sort((a, b) => new Date(a?.created_at || a?.punch_time) - new Date(b?.created_at || b?.punch_time));

                    const firstLog = logsForEmp[0];
                    const lastLog = logsForEmp.length > 1 ? logsForEmp[logsForEmp.length - 1] : null;

                    const log = firstLog ? {
                      ...firstLog,
                      in_time: firstLog?.in_time || firstLog?.INTime || firstLog?.PunchIn || firstLog?.punch_time,
                      out_time: lastLog ? (lastLog?.out_time || lastLog?.OUTTime || lastLog?.PunchOut || lastLog?.punch_time) : '----',
                      in_location: firstLog?.punchin_location || firstLog?.in_location || firstLog?.PunchIn_location || firstLog?.location,
                      out_location: lastLog ? (lastLog?.punchout_location || lastLog?.out_location || lastLog?.PunchOut_location || lastLog?.location) : '----',
                      work_time: lastLog ? (lastLog?.work_time || firstLog?.work_time || '00:00') : '00:00'
                    } : null;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>{emp.name[0]}</div>
                            <div style={{ fontSize: '14px', fontWeight: '800' }}>{emp.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>#{emp.id}</td>
                        <td style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>
                          {(() => {
                            const d = new Date(todayStr);
                            if (isNaN(d.getTime())) return todayStr;
                            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                            return `${todayStr} (${dayName})`;
                          })()}
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700' }}>{log?.in_time || '----'}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '700' }}>{log?.out_time || '----'}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '900', color: '#6366f1' }}>00:00</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            background: log ? '#f0fdf4' : '#fef2f2', 
                            color: log ? '#16a34a' : '#ef4444', 
                            fontSize: '11px', 
                            fontWeight: '900' 
                          }}>
                            {log ? 'Present' : 'Absent'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>{log?.in_location || '----'}</td>
                        <td style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>{log?.out_location || '----'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
