import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { 
  Calendar, Clock, CheckCircle, XCircle, 
  ChevronLeft, Plus, Info, AlertCircle,
  FileText, Briefcase, User, Send,
  ArrowRight, Filter, Download
} from 'lucide-react';

export default function MyLeaves() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [leaveStats, setLeaveStats] = useState({
    cl_available: 0,
    cl_taken: 0,
    lop_taken: 0,
    half_days: 0
  });
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);


  const [formData, setFormData] = useState({
    leave_type: 'Casual Leave',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false
  });

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMyLeaves = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.LEAVES_GET, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || data.all || []);
        
        // Filter for current user by ID or EmpCode
        const myData = list.filter(l => 
          String(l.user_id || l.employee_id) === String(user.id) || 
          String(l.Empcode || l.employee_id) === String(user.emp_id || user.id)
        );
        setLeaves(myData.sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date)));
      }
    } catch (err) {
      console.error('Fetch leaves error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveStats = async () => {
    if (!user?.token) return;
    try {
      const empId = user.employee_id || user.emp_id || user.id;
      const res = await fetch(`${API_ENDPOINTS.LEAVE_STATS_MY}?userId=${empId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Handle both { stats: [...] } and direct array response
        const list = Array.isArray(data.stats) ? data.stats : (Array.isArray(data) ? data : (data.stats ? [data.stats] : [data]));
        
        // Find current month's record or use the last one
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const latestStats = list.find(s => parseInt(s.month) === currentMonth && parseInt(s.year) === currentYear) || list[list.length - 1] || {};

        setLeaveStats({
          cl_available: latestStats.leaves_available || 0,
          cl_taken: latestStats.leaves_taken || 0,
          lop_taken: latestStats.LOP || latestStats.lop || 0,
          half_days: latestStats.half_days || 0
        });
      }
    } catch (err) {
      console.error('Fetch leave stats error:', err);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
    fetchLeaveStats();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.reason) {
      alert('Please fill all required fields');
      return;
    }

    const finalEndDate = formData.end_date || formData.start_date;
    const start = new Date(formData.start_date);
    const end = new Date(finalEndDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Create DD-MM-YYYY versions for legacy compatibility
    const startDMY = formData.start_date.split('-').reverse().join('-');
    const endDMY = finalEndDate.split('-').reverse().join('-');

    try {
      setSubmitting(true);
      const res = await fetch(API_ENDPOINTS.LEAVE_REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          // Primary IDs
          employee_id: user.employee_id || user.id,
          emp_id: user.employee_id || user.id,
          user_id: user.id,
          EmpID: user.id,
          
          // Basic Info
          employee_name: user.name,
          leave_type: formData.leave_type,
          
          // YYYY-MM-DD format
          start_date: formData.start_date,
          end_date: finalEndDate,
          
          // DD-MM-YYYY format aliases
          from_date: startDMY,
          to_date: endDMY,
          from: startDMY,
          to: endDMY,
          
          // Reason
          reason: formData.reason,
          description: formData.reason,
          
          // Status & Ledger Counts
          status: 'Pending',
          total_days: totalDays,
          cl: formData.leave_type.includes('Casual') ? totalDays : 0,
          lop: formData.leave_type.includes('LOP') ? totalDays : 0,
          
          // Flags
          is_half_day: formData.is_half_day ? 1 : 0,
          half_day: formData.is_half_day ? 1 : 0
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowModal(false);
        setFormData({
          leave_type: 'Casual Leave',
          start_date: '',
          end_date: '',
          reason: '',
          is_half_day: false
        });
        fetchMyLeaves();
        fetchLeaveStats();
      } else {
        alert(data.message || data.error || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('Submit leave error:', err);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    const s = String(status || 'PENDING').toUpperCase();
    if (s.includes('APPROVED')) return { bg: '#f0fdf4', color: '#166534', icon: <CheckCircle size={14} /> };
    if (s.includes('REJECTED')) return { bg: '#fef2f2', color: '#991b1b', icon: <XCircle size={14} /> };
    return { bg: '#fff7ed', color: '#ea580c', icon: <Clock size={14} /> };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const clCount = leaves.filter(l => String(l.leave_type || '').toUpperCase().includes('CASUAL') && String(l.status || '').toUpperCase().includes('APPROVED')).length;
  const lopCount = leaves.filter(l => String(l.leave_type || '').toUpperCase().includes('LOP') && String(l.status || '').toUpperCase().includes('APPROVED')).length;
  const balance = 12 - clCount;

  const stats = [
    { label: 'Available Leaves', value: `${leaveStats.cl_available} Days`, icon: <Calendar size={20} color="#ec4899" />, bg: '#fdf2f8' },
    { label: 'Total taken leaves', value: leaveStats.cl_taken, icon: <CheckCircle size={20} color="#22c55e" />, bg: '#f0fdf4' },
    { label: 'LOP Leaves', value: leaveStats.lop_taken, icon: <Clock size={20} color="#f59e0b" />, bg: '#fffbeb' },
  ];


  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      
      <main style={{ flex: 1, padding: winWidth < 768 ? '15px' : '30px 26px', marginTop: winWidth < 768 ? '80px' : '100px' }}>
        {/* Breadcrumb & Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <button 
              onClick={() => navigate(-1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '8px', padding: 0 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>My Leaves</h1>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', 
              borderRadius: '14px', background: '#0f172a', color: 'white', border: 'none', 
              fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={18} /> Request Leave
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ background: stat.bg, padding: '10px', borderRadius: '12px' }}>{stat.icon}</div>
              </div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Leaves Table/List */}
        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Leave History</h2>

          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #0f172a', borderRadius: '50%', margin: '0 auto 15px', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Fetching your leaves...</p>
            </div>
          ) : leaves.length > 0 ? (
            <div style={{ overflowX: winWidth < 768 ? 'hidden' : 'auto' }}>
              {winWidth < 768 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: '#f8fafc' }}>
                  {leaves.map((l, i) => {
                    const style = getStatusStyle(l.status);
                    return (
                      <div 
                        key={i} 
                        onClick={() => {
                          setSelectedLeave(l);
                          setShowDetailModal(true);
                        }}
                        style={{ background: 'white', padding: '20px', borderRadius: '24px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Briefcase size={18} color="#64748b" />
                            </div>
                            <div>
                              <div style={{ fontWeight: '900', color: '#0f172a', fontSize: '15px' }}>{l.leave_type}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>#{l.id || 'N/A'}</div>
                            </div>
                          </div>
                          <div style={{ 
                            padding: '6px 12px', borderRadius: '100px', 
                            background: style.bg, color: style.color, 
                            fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>
                            {String(l.status).split(',')[0]}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>From</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{formatDate(l.start_date)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>To</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{l.end_date ? formatDate(l.end_date) : formatDate(l.start_date)}</div>
                          </div>
                        </div>

                        <div style={{ height: '1.5px', background: '#f1f5f9', margin: '0 -20px 16px' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color="#94a3b8" /> {l.is_half_day ? 'Half Day' : 'Full Day'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#3863a8', fontWeight: '900' }}>View Details ›</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Leave Type</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Duration</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Reason</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Remark</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l, i) => {
                      const style = getStatusStyle(l.status);
                      return (
                        <tr 
                          key={i} 
                          onClick={() => {
                            setSelectedLeave(l);
                            setShowDetailModal(true);
                          }}
                          style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', cursor: 'pointer' }} 
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} 
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '10px' }}><Briefcase size={16} color="#64748b" /></div>
                              <span style={{ fontWeight: '700', color: '#1e293b' }}>{l.leave_type}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '13px' }}>
                                {formatDate(l.start_date)} {l.end_date ? `to ${formatDate(l.end_date)}` : ''}
                              </span>
                              {l.is_half_day && <span style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '800' }}>Half Day</span>}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.reason}>{l.reason || '-'}</p>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: '700', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.remarks || l.rm_remarks || l.pm_remarks}>
                              {l.remarks || l.rm_remarks || l.pm_remarks || '-'}
                            </p>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', 
                              borderRadius: '100px', background: style.bg, color: style.color, fontSize: '11px', fontWeight: '900' 
                            }}>
                              {style.icon}
                              {String(l.status).split(',')[0]}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                            {formatDate(l.created_at || l.start_date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ background: '#f8fafc', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Calendar size={30} color="#94a3b8" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>No leave requests yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '300px', margin: '0 auto 20px' }}>You haven't submitted any leave requests. Your leave history will appear here.</p>
              <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', borderRadius: '12px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>Apply for Leave</button>
            </div>
          )}
        </div>
      </main>

      <AppFooter />

      {/* Leave Request Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '30px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Request New Leave</h2>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Leave Type</label>
                <select 
                  value={formData.leave_type}
                  onChange={e => setFormData({...formData, leave_type: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '14px', outline: 'none' }}
                >
                  <option value="Casual Leave">Casual Leaves</option>
                  <option value="LOP (Loss of Pay)">LOP Leaves</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>From Date</label>
                  <input 
                    type="date" 
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '14px', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>To Date (Optional)</label>
                  <input 
                    type="date" 
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: '700', fontSize: '14px', outline: 'none' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="halfday" 
                  checked={formData.is_half_day}
                  onChange={e => setFormData({...formData, is_half_day: e.target.checked})}
                />
                <label htmlFor="halfday" style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>Apply as Half Day</label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Reason for Leave</label>
                <textarea 
                  rows="3" 
                  placeholder="Explain why you need leave..."
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontWeight: '600', fontSize: '14px', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: '#0f172a', 
                    color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', gap: '8px' 
                  }}
                >
                  {submitting ? 'Sending...' : <><Send size={18} /> Submit Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {showDetailModal && selectedLeave && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '20px' }}>
          <div className="animate-slide-up" style={{ background: 'white', borderRadius: '32px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            {/* Header / Background Glow */}
            <div style={{ height: '120px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 32px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at 20% 30%, #3b82f6 0%, transparent 70%)' }}></div>
              <button onClick={() => setShowDetailModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>✕</button>
              <div style={{ zIndex: 1 }}>
                <h2 style={{ fontSize: '22px', fontWeight: '950', color: 'white', margin: 0, letterSpacing: '-0.5px' }}>Leave Details</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Request ID: #{selectedLeave.id || 'N/A'}</p>
              </div>
            </div>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Type & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f8fafc', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Briefcase size={22} /></div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Category</div>
                    <div style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a' }}>{selectedLeave.leave_type}</div>
                  </div>
                </div>
                <div style={{ 
                  padding: '8px 16px', borderRadius: '100px', 
                  background: getStatusStyle(selectedLeave.status).bg, 
                  color: getStatusStyle(selectedLeave.status).color,
                  fontSize: '11px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px',
                  display: 'flex', alignItems: 'center', gap: '6px', border: `1.5px solid ${getStatusStyle(selectedLeave.status).color}20`
                }}>
                  {getStatusStyle(selectedLeave.status).icon} {String(selectedLeave.status).split(',')[0]}
                </div>
              </div>

              {/* Dates */}
              <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '20px', border: '1.5px solid #f1f5f9', display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Duration</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '950', fontSize: '14px' }}>
                    <Calendar size={16} color="#3b82f6" />
                    {formatDate(selectedLeave.start_date)} {selectedLeave.end_date ? `— ${formatDate(selectedLeave.end_date)}` : ''}
                  </div>
                  {selectedLeave.is_half_day && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#0ea5e9', fontWeight: '850', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> Half Day Request
                    </div>
                  )}
                </div>
                <div style={{ width: '1.5px', background: '#e2e8f0' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Applied On</div>
                  <div style={{ color: '#1e293b', fontWeight: '950', fontSize: '14px' }}>
                    {formatDate(selectedLeave.created_at || selectedLeave.start_date)}
                  </div>
                </div>
              </div>

              {/* Reason Section */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Reason for Leave
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1.5px solid #f1f5f9', color: '#475569', fontSize: '14px', fontWeight: '600', lineHeight: '1.5', fontStyle: 'italic' }}>
                  "{selectedLeave.reason || 'No specific reason provided.'}"
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={14} /> Admin Remarks
                </div>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1.5px solid #f1f5f9', color: '#0f172a', fontSize: '14px', fontWeight: '700', lineHeight: '1.5' }}>
                  {selectedLeave.remarks || selectedLeave.rm_remarks || selectedLeave.pm_remarks || selectedLeave.remark || '-'}
                </div>
              </div>

              <button 
                onClick={() => setShowDetailModal(false)}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '950', fontSize: '14px', cursor: 'pointer', transition: '0.2s', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.2)', marginTop: '8px' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
