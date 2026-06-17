import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import {
    ArrowLeft, Send, LogOut,
    Calendar, Info, AlertCircle,
    Clock, CheckCircle, ChevronDown, User, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResignationUserScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'history'
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        resignation_date: new Date().toISOString().split('T')[0],
        last_working_day: '',
        primary_reason: '',
        letter_content: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Modal state
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (activeTab === 'history') {
            fetchTeamRequests();
        }
    }, [user, activeTab]);

    const fetchTeamRequests = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const [res, usersRes] = await Promise.all([
                fetch(API_ENDPOINTS.RESIGNATIONS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } })
            ]);

            let usersMap = {};
            let defaultHrName = 'HR Team';
            let defaultPmName = 'Project Manager';
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                if (Array.isArray(usersData)) {
                    usersData.forEach(u => {
                        usersMap[u.id || u.employee_id] = u.name || u.username;
                    });

                    let hrUser = usersData.find(u => (u.role||'').toLowerCase() === 'hr' || (u.designation||'').toLowerCase() === 'hr');
                    if (!hrUser) hrUser = usersData.find(u => (u.role||'').toLowerCase().includes('hr') || (u.designation||'').toLowerCase().includes('hr'));
                    if (!hrUser) hrUser = usersData.find(u => (u.role||'').toLowerCase().includes('human') || (u.designation||'').toLowerCase().includes('human'));
                    if (!hrUser) hrUser = usersData.find(u => (u.role||'').toLowerCase().includes('admin'));
                    if (hrUser) defaultHrName = hrUser.name || hrUser.username;

                    let pmUser = usersData.find(u => (u.role||'').toLowerCase() === 'pm' || (u.designation||'').toLowerCase() === 'pm');
                    if (!pmUser) pmUser = usersData.find(u => (u.role||'').toLowerCase().includes('pm') || (u.designation||'').toLowerCase().includes('pm'));
                    if (!pmUser) pmUser = usersData.find(u => (u.role||'').toLowerCase().includes('project manager') || (u.designation||'').toLowerCase().includes('project manager'));
                    if (pmUser) defaultPmName = pmUser.name || pmUser.username;
                }
            }

            if (res.ok) {
                const data = await res.json();
                let actualData = Array.isArray(data) ? data : (data.resignations || data.data || data.requests || []);
                const mergedData = actualData.map(req => ({
                    ...req,
                    hr_name: usersMap[req.hr_id] || req.hr_name || defaultHrName,
                    pm_name: usersMap[req.pm_id] || usersMap[req.project_manager_id] || req.pm_name || req.project_manager_name || defaultPmName
                }));
                setRequests(mergedData);
            }
        } catch (error) { console.error('Fetch error:', error); }
        finally { setLoading(false); }
    };

    const handleFormSubmit = async () => {
        if (!formData.last_working_day || !formData.primary_reason || !user?.token) {
            alert('Please fill all required fields.');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch(API_ENDPOINTS.RESIGNATION_REQUEST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    resignation_date: formData.resignation_date,
                    reason: formData.primary_reason,
                    letter_content: formData.letter_content,
                    last_working_day: formData.last_working_day,
                    status: 'Pending'
                })
            });
            if (res.ok) {
                alert('Notice submitted successfully! ✅');
                setFormData({ resignation_date: new Date().toISOString().split('T')[0], last_working_day: '', primary_reason: '', letter_content: '' });
                setActiveTab('history');
            } else {
                alert('Submission failed. Please try again.');
            }
        } catch (error) { console.error('Submit error:', error); }
        finally { setSubmitting(false); }
    };

    const handleReviewSubmit = async (status) => {
        if (!selectedRequest || !user?.token) return;

        try {
            setUpdating(true);
            
            const r = String(user?.role || user?.designation || '').toLowerCase();
            const isHR = r.includes('hr') || r.includes('human resource');
            const isPM = r.includes('pm') || r.includes('project manager') || r.includes('ceo') || r.includes('admin') || r.includes('manager');

            const payload = {
                status: status,
                project_manager_remark: `Updated to ${status} by Project Manager`
            };
            
            if (isHR) payload.hr_status = status;
            if (isPM) payload.pm_status = status;

            const res = await fetch(API_ENDPOINTS.RESIGNATION_UPDATE(selectedRequest.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSelectedRequest(null);
                fetchTeamRequests();
            } else {
                alert('Update failed. Please try again.');
            }
        } catch (error) {
            console.error('Update Resignation Error:', error);
        } finally {
            setUpdating(false);
        }
    };

    const tabList = [
        { id: 'submit', label: 'Resignation Letter', icon: <Send size={16} /> },
        { id: 'history', label: 'History of Resignations', icon: <Clock size={16} /> }
    ];

    const getStatusStyle = (status) => {
        const s = (status || '').toUpperCase();
        if (s === 'APPROVED') return { bg: '#f0fdf4', text: '#16a34a' };
        if (s === 'REJECTED') return { bg: '#fef2f2', text: '#dc2626' };
        return { bg: '#fffbeb', text: '#d97706' };
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            <AppHeader />

            <main style={{ flex: 1, padding: '100px 26px 40px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={18} color="#64748b" />
                    </button>
                    <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Exit Management</h1>
                </div>

                <div style={{ display: 'flex', gap: '8px', background: '#d1d9e0', padding: '6px', borderRadius: '14px', width: 'fit-content', marginBottom: '40px' }}>
                    {tabList.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '800', transition: '0.3s',
                                background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? '#0f172a' : '#64748b',
                                boxShadow: activeTab === tab.id ? '0 4px 6px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'submit' ? (
                    <div className="animate-fade-in" style={{ backgroundColor: 'white', borderRadius: '30px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ height: '6px', background: 'linear-gradient(90deg, #ef4444 0%, #fca5a5 100%)' }} />
                        <div style={{ padding: '32px 40px', display: 'flex', gap: '20px', alignItems: 'center', paddingBottom: '28px', borderBottom: '1.5px solid #f1f5f9', marginBottom: '28px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LogOut color="#ef4444" size={24} /></div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Resignation Request</div>
                                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: 0, letterSpacing: '-0.4px' }}>Resignation Letter</h2>
                                <p style={{ color: '#64748b', fontSize: '13px', margin: '3px 0 0', fontWeight: '600' }}>Formalize your exit notice here.</p>
                            </div>
                        </div>

                        <div style={{ padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Resignation Date</label>
                                <input
                                    type="date"
                                    readOnly
                                    value={formData.resignation_date}
                                    style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#64748b', fontWeight: '700', fontSize: '14px', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Proposed Last Working Day <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="date"
                                    value={formData.last_working_day}
                                    onChange={(e) => setFormData({ ...formData, last_working_day: e.target.value })}
                                    style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #cbd5e1', background: 'white', color: '#0f172a', fontWeight: '700', fontSize: '14px', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '0 40px', marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Reason to Resign <span style={{ color: '#ef4444' }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={formData.primary_reason}
                                    onChange={(e) => setFormData({ ...formData, primary_reason: e.target.value })}
                                    style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #cbd5e1', background: 'white', color: formData.primary_reason ? '#0f172a' : '#94a3b8', fontWeight: '700', fontSize: '14px', cursor: 'pointer', outline: 'none', appearance: 'none', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                                >
                                    <option value="" disabled style={{ color: '#94a3b8' }}>Select a reason</option>
                                    <option value="Better Opportunity" style={{ color: '#0f172a' }}>Better Opportunity</option>
                                    <option value="Career Growth" style={{ color: '#0f172a' }}>Career Growth</option>
                                    <option value="Personal Reasons" style={{ color: '#0f172a' }}>Personal Reasons</option>
                                    <option value="Health Issues" style={{ color: '#0f172a' }}>Health Issues</option>
                                    <option value="Relocation" style={{ color: '#0f172a' }}>Relocation</option>
                                    <option value="Higher Education" style={{ color: '#0f172a' }}>Higher Education</option>
                                </select>
                                <ChevronDown size={18} color="#94a3b8" style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            </div>
                        </div>

                        <div style={{ padding: '0 40px', marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Formal Letter Content</label>
                            <textarea
                                placeholder="Write your formal letter..."
                                value={formData.letter_content}
                                onChange={(e) => setFormData({ ...formData, letter_content: e.target.value })}
                                style={{ width: '100%', padding: '18px 20px', borderRadius: '16px', border: '1.5px solid #cbd5e1', background: 'white', color: '#0f172a', fontWeight: '600', fontSize: '14px', outline: 'none', minHeight: '160px', resize: 'none', fontFamily: 'inherit', lineHeight: '1.7', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                            />
                        </div>

                        <div style={{ padding: '0 40px 40px' }}>
                            <button
                                onClick={handleFormSubmit}
                                disabled={submitting}
                                style={{
                                    width: '100%', padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #090808ff 0%, #1b1818ff 100%)', color: 'white', fontWeight: '900', fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: submitting ? 0.7 : 1,
                                    textTransform: 'uppercase', letterSpacing: '1px'
                                }}
                            >
                                <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Resignation Letter'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        <h3 style={{ fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Team Resignation History</h3>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Syncing history...</div>
                        ) : requests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '24px', background: 'white' }}>
                                <AlertCircle size={40} style={{ marginBottom: '15px', opacity: 0.3 }} />
                                <p style={{ margin: 0, fontWeight: '700' }}>No resignation records found.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                                {requests.map((req, i) => {
                                    const style = getStatusStyle(req.status);
                                    let borderColor = '#f1f5f9';
                                    if (req.status === 'Approved') borderColor = '#22c55e';
                                    else if (req.status === 'Pending') borderColor = '#f59e0b';
                                    else if (req.status === 'Rejected') borderColor = '#ef4444';

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedRequest(req)}
                                            style={{
                                                width: '300px',
                                                padding: '24px',
                                                borderRadius: '20px',
                                                background: 'white',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                                borderLeft: `4px solid ${borderColor}`,
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                position: 'relative'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'; }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={18} color="#64748b" />
                                                </div>
                                                <div style={{ background: style.bg, color: style.text, padding: '4px 12px', borderRadius: '8px', fontSize: '9px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {req.status || 'PENDING'}
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '24px' }}>
                                                <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', marginBottom: '4px' }}>
                                                    {req.employee_name || 'Unknown Employee'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                                                    ID: {req.employee_id || 'N/A'}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', borderRadius: '8px', width: 'fit-content' }}>
                                                <Calendar size={12} color="#64748b" />
                                                <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>
                                                    {req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Review Modal */}
            <AnimatePresence>
                {selectedRequest && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '640px', padding: '0', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                        <LogOut size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a' }}>Resignation Letter</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Formal Exit Documentation</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ ...getStatusStyle(selectedRequest.status), padding: '6px 14px', borderRadius: '8px', fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {selectedRequest.status || 'PENDING'}
                                    </div>
                                    <button onClick={() => setSelectedRequest(null)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '32px', maxHeight: '60vh', overflowY: 'auto' }}>
                                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px dashed #e2e8f0', marginBottom: '24px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', letterSpacing: '0.5px' }}>TO:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>HR Department</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', letterSpacing: '0.5px' }}>FROM:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{selectedRequest.employee_name || 'Unknown'}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', letterSpacing: '0.5px' }}>SUBJECT:</span>
                                        <span style={{ fontSize: '12px', fontWeight: '950', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FORMAL RESIGNATION</span>
                                    </div>

                                    <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', margin: '0 0 16px 0' }}>Dear HR Team,</p>
                                    <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', margin: '0 0 16px 0' }}>
                                        Resigning due to <span style={{ fontWeight: '900', color: '#0f172a' }}>{selectedRequest.reason || selectedRequest.reason_for_leaving || 'N/A'}</span>.
                                        LWD: <span style={{ fontWeight: '900', color: '#ef4444' }}>{selectedRequest.last_working_day ? new Date(selectedRequest.last_working_day).toLocaleDateString('en-GB') : 'N/A'}</span>.
                                    </p>

                                    {selectedRequest.letter_content && (
                                        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569', fontWeight: '500', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
                                            {selectedRequest.letter_content}
                                        </div>
                                    )}

                                    <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', margin: '0' }}>
                                        Sincerely,<br />
                                        <span style={{ fontWeight: '900', color: '#0f172a', display: 'block', marginTop: '4px' }}>{selectedRequest.employee_name || 'Unknown'}</span>
                                    </p>

                                    {/* Official Verification */}
                                    <div style={{ marginTop: '30px', paddingTop: '20px', paddingBottom: '20px', borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Official Verification</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}><strong style={{ color: '#0f172a', fontWeight: '950' }}>HR APPROVAL</strong> (<strong style={{ color: '#0f172a', fontWeight: '950' }}>{String(selectedRequest.hr_name || '').toUpperCase()}</strong>)</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: selectedRequest.hr_status === 'Approved' ? '#16a34a' : selectedRequest.hr_status === 'Rejected' ? '#dc2626' : '#d97706' }}>
                                                        {selectedRequest.hr_status || 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}><strong style={{ color: '#0f172a', fontWeight: '950' }}>PM APPROVAL</strong> (<strong style={{ color: '#0f172a', fontWeight: '950' }}>{String(selectedRequest.pm_name || '').toUpperCase()}</strong>)</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: selectedRequest.pm_status === 'Approved' ? '#16a34a' : selectedRequest.pm_status === 'Rejected' ? '#dc2626' : '#d97706' }}>
                                                        {selectedRequest.pm_status || 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer (Buttons) */}
                            <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={() => handleReviewSubmit('Pending')}
                                    disabled={updating}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#fffbeb', color: '#d97706', border: 'none', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1 }}
                                >
                                    WAIT
                                </button>
                                <button
                                    onClick={() => handleReviewSubmit('Rejected')}
                                    disabled={updating}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: 'none', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1 }}
                                >
                                    REJECT
                                </button>
                                <button
                                    onClick={() => handleReviewSubmit('Approved')}
                                    disabled={updating}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', border: 'none', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1 }}
                                >
                                    APPROVED
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AppFooter />
            <style>{`.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
