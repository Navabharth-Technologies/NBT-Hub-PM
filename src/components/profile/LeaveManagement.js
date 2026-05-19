import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, Search, User, Info, FileText, Table, ChevronDown, CheckCircle, Clock, XCircle, AlertTriangle, UserCheck, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';

import { API_ENDPOINTS, BASE_URL } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import './PMDashboard.css';

export default function LeaveManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'leave');

  const [searchTerm, setSearchTerm] = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allLeaveStats, setAllLeaveStats] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);

  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [showAllLedger, setShowAllLedger] = useState(false);

  const [showLeaveEditModal, setShowLeaveEditModal] = useState(false);
  const [leaveEditData, setLeaveEditData] = useState({
    empId: '', empName: '', cl: 0, lop: 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), available: 0, halfDays: 0, remark: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [modalState, setModalState] = useState({ show: false, message: '', type: 'SUCCESS' });

  const handleModalClose = () => {
    setModalState({ show: false, message: '', type: 'SUCCESS' });
  };


  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (user?.token) {
      // Fetch master employee profiles for complete data including photos
      fetch(API_ENDPOINTS.EMPLOYEES || `${BASE_URL}/api/employee-profile`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data.data || []);
          if (Array.isArray(list)) {
            const sorted = [...list].sort((a, b) => {
              const idA = parseInt(String(a.employee_id || a.id || '').replace(/[^\d]/g, ''), 10) || 0;
              const idB = parseInt(String(b.employee_id || b.id || '').replace(/[^\d]/g, ''), 10) || 0;
              if (idA !== idB) return idA - idB;
              return String(a.employee_id || a.id || '').localeCompare(String(b.employee_id || b.id || ''));
            });
            setAllEmployees(sorted);
          }
        })
        .catch(err => console.error("Error fetching master employees:", err));

      fetchLeaves();
    }
  }, [user]);

  useEffect(() => {
    if (user?.token) {
      fetchLeaveStats();
    }
  }, [selectedMonth, selectedYear, user]);

  const fetchLeaves = async () => {
    try {
      setLeavesLoading(true);
      const res = await fetch(API_ENDPOINTS.LEAVES_GET, {
        headers: { 'Authorization': `Bearer ${user?.token}`, 'Accept': 'application/json' }
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.all || data?.data || data?.requests || []);
      setLeaveRequests(list);
    } finally { setLeavesLoading(false); }
  };

  const fetchLeaveStats = async () => {
    try {
      const endpointsToTry = [
        `${BASE_URL}/api/leave_stats?month=${selectedMonth}&year=${selectedYear}`,
        `${BASE_URL}/api/admin/leave_stats?month=${selectedMonth}&year=${selectedYear}`,
        `${BASE_URL}/api/leave-stats?month=${selectedMonth}&year=${selectedYear}`,
        `${API_ENDPOINTS.ADMIN_LEAVE_STATS}?month=${selectedMonth}&year=${selectedYear}`
      ];

      let bestStats = [];
      for (const ep of endpointsToTry) {
        try {
          const res = await fetch(ep, { headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` } });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.stats || data.data || []);
            if (list.length > 0) {
              bestStats = list;
              break; // Found data for this month/year
            }
          }
        } catch (err) { }
      }
      setAllLeaveStats(bestStats);
    } catch (err) { console.error("Error fetching stats:", err); }
  };

  const submitLeaveAdjustments = async () => {
    if (!user?.token || !leaveEditData.empId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(API_ENDPOINTS.ADMIN_LEAVE_STATS_UPDATE, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: leaveEditData.empId,
          leaves_taken: parseFloat(leaveEditData.cl || 0),
          leaves_available: parseFloat(leaveEditData.available || 0),
          LOP: parseFloat(leaveEditData.lop || 0),
          month: leaveEditData.month,
          year: leaveEditData.year,
          halfDays: leaveEditData.halfDays,
          remarks: leaveEditData.remark || 'Manual adjustment'
        })
      });
      if (res.ok) {
        setModalState({ show: true, message: 'Adjustments saved!', type: 'SUCCESS' });
        setShowLeaveEditModal(false);
        fetchLeaveStats();
      }
    } catch (err) {
      setModalState({ show: true, message: 'System error.', type: 'ERROR' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 40px' : '120px 26px 40px', width: '100%', boxSizing: 'border-box', margin: '0' }}>
        <div style={{ width: '100%' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '20px' }}>
            <ArrowLeft size={18} color="#64748b" />
          </button>

          <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'stretch' : 'flex-start', marginBottom: winWidth < 768 ? '24px' : '32px', gap: '20px' }}>
            <div style={{ textAlign: winWidth < 768 ? 'center' : 'left' }}>
              <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '950', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.8px' }}>Leave Management</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '600' }}>Review and manage employee leave applications.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: winWidth < 768 ? 'center' : 'flex-end' }}>
              <button onClick={() => navigate('/my-leaves')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: 'white', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}>
                <Calendar size={18} /> My Leaves
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: winWidth < 600 ? '12px' : '24px', borderBottom: '1.5px solid #e2e8f0', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button onClick={() => setActiveTab('leave')} style={{ padding: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderBottom: activeTab === 'leave' ? '3px solid #1d4ed8' : '3px solid transparent', color: activeTab === 'leave' ? '#1d4ed8' : '#64748b', fontWeight: '800', fontSize: winWidth < 600 ? '12px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              Leave Requests <span style={{ background: '#1d4ed8', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{leaveRequests.length}</span>
            </button>
            <button onClick={() => setActiveTab('summary')} style={{ padding: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', borderBottom: activeTab === 'summary' ? '3px solid #1d4ed8' : '3px solid transparent', color: activeTab === 'summary' ? '#1d4ed8' : '#64748b', fontWeight: '800', fontSize: winWidth < 600 ? '12px' : '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              <Table size={14} /> Leaves Summary (XL)
            </button>
          </div>

          {activeTab === 'summary' ? (
            <div style={{ background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.02)', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '950', color: '#0f172a' }}>Employee Leave Ledger</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Comprehensive summary of all employee leave balances.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexDirection: winWidth < 768 ? 'column' : 'row' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', height: '40px' }}>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '800', color: '#1e293b', cursor: 'pointer', padding: '4px 0' }}
                    >
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <div style={{ width: '1.5px', height: '14px', background: '#e2e8f0', margin: '0 8px' }}></div>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', fontWeight: '800', color: '#1e293b', cursor: 'pointer', padding: '4px 0' }}
                    >
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setShowAllLedger(!showAllLedger)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: showAllLedger ? '#f1f5f9' : '#0f172a', color: showAllLedger ? '#475569' : 'white', border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', height: '40px' }}>
                    {showAllLedger ? 'View Less' : 'View All'}
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>EMPLOYEE</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>ID</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>CASUAL LEAVES</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>LOP LEAVES</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>AVAILABLE LEAVES</th>
                      <th style={{ padding: '16px', fontWeight: '900', color: '#64748b' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllLedger ? allEmployees : allEmployees.slice(0, 7)).map((emp, idx) => {
                      const stats = allLeaveStats.find(s => String(s.employee_id || s.user_id) === String(emp.id));
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '950', overflow: 'hidden' }}>
                                {(() => {
                                  const pic = emp.profile_picture || emp.profile_pic || emp.photo || emp.ProfilePic || emp.Profile_Picture;
                                  const photoUrl = pic ? (pic.startsWith('http') || pic.startsWith('data:') ? pic : `${BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`) : `${BASE_URL}/api/users/${emp.id}/photo`;

                                  return (
                                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                      <img
                                        src={photoUrl}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                      />
                                      <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#eef2ff', color: '#4f46e5' }}>
                                        {String(emp.name || emp.user_name || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              {emp.name || emp.full_name || emp.employee_name || emp.user_name || emp.userName || emp.fullName || 'Employee'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#000000' }}>#{emp.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#000000' }}>{stats?.leaves_taken || 0}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '800', color: '#000000' }}>{stats?.LOP || 0}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '950', color: '#16a34a' }}>{stats?.leaves_available || 0} Days</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button onClick={() => { setLeaveEditData({ empId: emp.id, empName: emp.name || emp.full_name || emp.employee_name || emp.user_name || emp.userName || emp.fullName || 'Employee', cl: stats?.leaves_taken || 0, lop: stats?.LOP || 0, month: new Date().getMonth() + 1, year: new Date().getFullYear(), available: stats?.leaves_available || 0, halfDays: stats?.half_day || 0, remark: '' }); setShowLeaveEditModal(true); }} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', color: '#475569', cursor: 'pointer' }}>Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
              {leaveRequests.length > 0 ? (
                leaveRequests.map(req => {
                  const rawStatus = String(req.status || 'PENDING').toUpperCase();
                  const statusMatch = rawStatus.split(',')[0].trim();

                  let sColor = '#f59e0b'; // Orange for Pending
                  let sBg = '#fffbeb';
                  let displayStatus = 'PENDING';

                  if (statusMatch.includes('APPROVED')) {
                    sColor = '#10b981'; // Green for Approved
                    sBg = '#ecfdf5';
                    displayStatus = 'APPROVED';
                  } else if (statusMatch.includes('REJECTED')) {
                    sColor = '#ef4444'; // Red for Rejected
                    sBg = '#fef2f2';
                    displayStatus = 'REJECTED';
                  }

                  const displayDate = req.start_date ? new Date(req.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                  return (
                    <div key={req.id} onClick={() => navigate(`/attendance/leave/${req.id}`)} style={{ background: 'white', borderRadius: '24px', padding: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f8fafc', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', overflow: 'hidden', flexShrink: 0 }}>
                            {(() => {
                              const cleanId = (val) => String(val || '').replace(/[^0-9]/g, '').trim();
                              const empId = cleanId(req.user_id || req.emp_id || req.employee_id || req.id);
                              const emp = allEmployees.find(e => {
                                const eid = cleanId(e.id || e.EmpID || e.employee_id || e.userId || e.emp_id);
                                if (eid && empId && eid === empId) return true;
                                const eName = String(e.name || e.user_name || '').toLowerCase().trim();
                                const rName = String(req.employee_name || req.name || req.full_name || '').toLowerCase().trim();
                                return eName && rName && eName === rName;
                              });

                              const rawPic = emp?.profile_picture || emp?.profile_pic || emp?.ProfilePic || emp?.Profile_Picture || emp?.photo || req.profile_pic || req.profilePic;
                              const photoUrl = rawPic ? (rawPic.startsWith('http') || rawPic.startsWith('data:') ? rawPic : `${BASE_URL}${rawPic.startsWith('/') ? '' : '/'}${rawPic}`) : `${BASE_URL}/api/users/${empId}/photo`;

                              return (
                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                  <img
                                    src={photoUrl}
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                  />
                                  <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '950', color: '#1e293b' }}>
                              {req.employee_name || req.name || allEmployees.find(e => String(e.id) === String(req.user_id || req.employee_id))?.name || 'Unknown'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: '900', color: '#1d4ed8', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>#{req.user_id || req.id}</span>
                              <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{req.leave_type || 'Leave'}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: '950', color: sColor, background: sBg, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase' }}>{displayStatus}</span>
                      </div>
                      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: '600' }}><Calendar size={14} /> {displayDate}</div>
                      <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', flex: 1 }}>"{req.reason || 'No reason provided'}"</div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}><p style={{ fontWeight: '900', color: '#94a3b8' }}>No Leaves Available.</p></div>
              )}
            </div>
          )}
        </div>
      </main>

      {showLeaveEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1.5px solid #f1f5f9', position: 'relative' }}>
            <button onClick={() => setShowLeaveEditModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>✕</button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Table size={24} /></div>
              <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: '0 0 4px 0' }}>Adjust Leave Ledger</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Modifying balances for {leaveEditData.empName}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Casual Leaves</label>
                <input type="number" step="any" value={leaveEditData.cl} onChange={e => setLeaveEditData({ ...leaveEditData, cl: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: '700', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>LOP Leaves</label>
                <input type="number" step="any" value={leaveEditData.lop} onChange={e => setLeaveEditData({ ...leaveEditData, lop: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: '700', outline: 'none' }} />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Available Balance</label>
              <input type="number" step="any" value={leaveEditData.available} onChange={e => setLeaveEditData({ ...leaveEditData, available: e.target.value })} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #16a34a', fontSize: '14px', fontWeight: '700', outline: 'none', background: '#f0fdf4' }} />
            </div>
            <button onClick={submitLeaveAdjustments} disabled={isProcessing} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              {isProcessing ? 'Saving...' : 'Save Adjustments'}
            </button>
          </div>
        </div>
      )}
      <AppFooter />

      {/* Custom Alert Modal */}
      {modalState.show && (
        <>
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalSlideUp {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            animation: 'modalFadeIn 0.2s ease-out'
          }}>
            <div style={{
              background: 'white',
              width: '90%',
              maxWidth: '380px',
              borderRadius: '32px',
              padding: '32px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
              border: '1.5px solid #f1f5f9',
              textAlign: 'center',
              animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Outfit', sans-serif"
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '22px',
                background: modalState.type === 'SUCCESS' ? '#f0fdf4' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: `1.5px solid ${modalState.type === 'SUCCESS' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {modalState.type === 'SUCCESS' ? (
                  <CheckCircle size={32} color="#16a34a" />
                ) : (
                  <XCircle size={32} color="#ef4444" />
                )}
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '950',
                color: '#0f172a',
                margin: '0 0 8px 0'
              }}>
                {modalState.message}
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '0 0 24px 0',
                lineHeight: '1.5',
                fontWeight: '700'
              }}>
                {modalState.type === 'SUCCESS' 
                  ? 'The employee leave ledger adjustments have been successfully saved.' 
                  : 'Failed to update employee leave ledger statistics. Please check your network connection.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleModalClose}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: '16px',
                    border: 'none',
                    background: modalState.type === 'SUCCESS' ? '#16a34a' : '#ef4444',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: `0 8px 20px ${modalState.type === 'SUCCESS' ? 'rgba(22, 163, 74, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
