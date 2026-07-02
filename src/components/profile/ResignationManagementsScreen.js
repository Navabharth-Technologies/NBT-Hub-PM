import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import {
    ArrowLeft, FileText,
    Search, AlertCircle,
    LogOut, Calendar, Clock, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResignationManagement() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // Modal states
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [updatePayload, setUpdatePayload] = useState({
        status: '',
        reporting_manager_remark: '',
        project_manager_remark: '',
        hr_remark: ''
    });
    const [updating, setUpdating] = useState(false);
    const [noticePeriodCard, setNoticePeriodCard] = useState(false);

    useEffect(() => {
        const r = String(user?.role || user?.designation || '').toLowerCase();
        const isAuthorized = r.includes('hr') || r.includes('human resource') || r.includes('admin') || r.includes('pm') || r.includes('project manager') || r.includes('ceo') || r.includes('manager') || r.includes('founder');
        if (!isAuthorized) {
            navigate('/performance');
            return;
        }
        fetchRequests();
    }, [user]);

    useEffect(() => {
        if (selectedRequest) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
        };
    }, [selectedRequest]);

    const fetchRequests = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const [resResignations, resEmployees] = await Promise.all([
                fetch(API_ENDPOINTS.RESIGNATIONS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(API_ENDPOINTS.EMPLOYEES, { headers: { 'Authorization': `Bearer ${user.token}` } })
            ]);

            let emplMap = {};
            if (resEmployees.ok) {
                const empData = await resEmployees.json();
                if (Array.isArray(empData)) {
                    empData.forEach(e => {
                        emplMap[e.id || e.employee_id] = e;
                    });
                }
            }

            if (resResignations.ok) {
                const result = await resResignations.json();
                let actualData = [];
                if (Array.isArray(result)) actualData = result;
                else if (result.data && Array.isArray(result.data)) actualData = result.data;
                else if (result.resignations && Array.isArray(result.resignations)) actualData = result.resignations;
                else if (result.requests && Array.isArray(result.requests)) actualData = result.requests;

                if (actualData && actualData.length > 0) {
                    const mergedData = actualData.map(req => {
                        const emp = emplMap[req.employee_id];
                        return {
                            ...req,
                            employee_name: emp ? emp.name : req.employee_name || 'User',
                            designation: emp ? (emp.role || emp.designation) : req.designation || req.role
                        };
                    });
                    setRequests(mergedData);
                } else {
                    setRequests([]);
                }
            }
        } catch (error) {
            console.error('Fetch resignations error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (request) => {
        setSelectedRequest(request);
        setUpdatePayload({
            status: request.status || 'Pending',
            reporting_manager_remark: request.reporting_manager_remark || '',
            project_manager_remark: request.project_manager_remark || '',
            hr_remark: request.hr_remark || ''
        });
    };

    const handleRequestUpdate = async () => {
        if (!selectedRequest || !user?.token) return;

        try {
            setUpdating(true);
            const res = await fetch(API_ENDPOINTS.RESIGNATION_UPDATE(selectedRequest.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(updatePayload)
            });

            if (res.ok) {
                setSelectedRequest(null);
                fetchRequests();
                alert('Resignation review saved successfully! ✅');
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('Update Resignation Error:', errData);
                alert(`Failed to save: ${errData.error || 'Server error'}`);
            }
        } catch (error) {
            console.error('Update Resignation Error:', error);
            alert('Failed to save. Please check your connection.');
        } finally {
            setUpdating(false);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = (req.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.reason || req.reason_for_leaving || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || req.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
            case 'pending': return { bg: '#fffbeb', text: '#d97706', border: '#fef3c7' };
            case 'rejected': return { bg: '#fef2f2', text: '#dc2626', border: '#fee2e2' };
            default: return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
            <AppHeader />

            <main style={{ flex: 1, padding: '100px 20px 40px', maxWidth: '100%', margin: '0 auto', width: '100%', fontFamily: "'Outfit', sans-serif" }}>
                <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ArrowLeft size={18} color="#64748b" />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Resignation Notices</h1>
                            <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0', fontWeight: '500' }}>Process and manage official employee exit notices</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ background: '#fef2f2', padding: '8px 16px', borderRadius: '12px', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} color="#dc2626" />
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#dc2626' }}>
                                {requests.filter(r => r.status === 'Pending').length} Active Notices
                            </span>
                        </div>
                    </div>
                </header>

                <section style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0' }}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
                            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="Search by name or reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: 'white', outline: 'none', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '0 20px', borderRadius: '14px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                        >
                            <option>All</option>
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                    </div>


                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '15px', fontWeight: '600', background: 'white', borderRadius: '24px' }}>Loading resignation letters...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: '15px', fontWeight: '600', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9' }}>No resignation letters found.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {filteredRequests.map(req => {
                                const statusStyle = getStatusColor(req.status);
                                const primaryReason = req.reason || 'N/A';
                                const letterContent = req.letter_content || '';

                                return (
                                    <div key={req.id} style={{ borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', background: 'white' }}>
                                        <div style={{ height: '6px', background: 'linear-gradient(90deg, #ef4444, #fca5a5)' }} />
                                        <div style={{ padding: '36px' }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <LogOut color="#ef4444" size={22} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '18px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Resignation Letter</div>
                                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Formal Exit Documentation</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Submission Date</div>
                                                    <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '900' }}>
                                                        {req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Structured Read-Only Fields */}
                                            <div style={{ background: '#f8fafc', padding: '28px', borderRadius: '20px', border: '1px dashed #e2e8f0', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                                {/* FROM / TO row */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>FROM</div>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                                {req.employee_name || '—'}
                                                            </div>
                                                            <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>
                                                                ID: {req.employee_id || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>TO</div>
                                                        <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                            HR Department / Management Team
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dates row */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Resignation Date</div>
                                                        <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                            {req.resignation_date
                                                                ? new Date(req.resignation_date).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
                                                                : req.created_at
                                                                    ? new Date(req.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
                                                                    : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Proposed Last Working Day</div>
                                                        <div style={{ background: 'white', border: '1.5px solid #ef4444', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontWeight: '900', color: '#ef4444' }}>
                                                            {req.last_working_day
                                                                ? new Date(req.last_working_day).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
                                                                : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Reason to Resign */}
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Reason to Resign</div>
                                                    <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                                        {primaryReason}
                                                    </div>
                                                </div>

                                                {/* Formal Letter Content */}
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Formal Letter Content</div>
                                                    <div style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#334155', lineHeight: '1.7', whiteSpace: 'pre-wrap', minHeight: '60px' }}>
                                                        {letterContent || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No additional content provided.</span>}
                                                    </div>
                                                </div>

                                                {/* Management Remarks Display */}
                                                {(req.reporting_manager_remark || req.project_manager_remark || req.hr_remark) && (
                                                    <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Management Feedback</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                                            {req.reporting_manager_remark && (!(req.designation || '').toUpperCase().includes('LEAD') && !(req.designation || '').toUpperCase().includes('MANAGER')) && (
                                                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                                                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Reporting Mgr</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{req.reporting_manager_remark}</span>
                                                                </div>
                                                            )}
                                                            {req.project_manager_remark && (
                                                                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
                                                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Project Mgr</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>{req.project_manager_remark}</span>
                                                                </div>
                                                            )}
                                                            {req.hr_remark && (
                                                                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px' }}>
                                                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#0369a1', display: 'block', textTransform: 'uppercase' }}>HR Remark</span>
                                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#0c4a6e' }}>{req.hr_remark}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '950', textTransform: 'uppercase', background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}>
                                                    {req.status || 'Pending'}
                                                </span>
                                                <button
                                                    onClick={() => handleOpenReview(req)}
                                                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 28px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(15,23,42,0.2)', transition: '0.2s' }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <FileText size={16} /> Review & Respond
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* Review Modal */}
            <AnimatePresence>
                {selectedRequest && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '40px', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}
                        >
                            <button onClick={() => setSelectedRequest(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}>✕</button>

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <LogOut color="#ef4444" size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Resignation Letter</div>
                                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Formal Exit Documentation</div>
                                    </div>
                                </div>
                                <div>
                                    <span style={{
                                        padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '950',
                                        textTransform: 'uppercase',
                                        background: selectedRequest.status === 'Approved' ? '#f0fdf4' : selectedRequest.status === 'Rejected' ? '#fef2f2' : '#fffbeb',
                                        color: selectedRequest.status === 'Approved' ? '#16a34a' : selectedRequest.status === 'Rejected' ? '#dc2626' : '#d97706',
                                        border: `1px solid ${selectedRequest.status === 'Approved' ? '#bbf7d0' : selectedRequest.status === 'Rejected' ? '#fee2e2' : '#fef3c7'}`
                                    }}>{selectedRequest.status || 'Pending'}</span>
                                </div>
                            </div>

                            {/* Formal Letter Body */}
                            <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '20px', border: '1px dashed #e2e8f0', marginBottom: '30px' }}>
                                {/* TO / FROM / SUBJECT */}
                                <div style={{ marginBottom: '24px', paddingBottom: '18px', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>TO:</span>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>HR Department / Management Team</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>FROM:</span>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                                            {selectedRequest.employee_name} <span style={{ color: '#94a3b8', fontWeight: '600' }}>(ID: {selectedRequest.employee_id})</span>
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>DATE:</span>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                                            {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>SUBJECT:</span>
                                        <span style={{ fontSize: '13px', fontWeight: '950', color: '#ef4444', textTransform: 'uppercase' }}>Formal Resignation of Employment</span>
                                    </div>
                                </div>

                                {/* Body */}
                                <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', lineHeight: '1.8', margin: '0 0 16px 0' }}>Dear HR Team,</p>
                                <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', lineHeight: '1.8', margin: '0 0 16px 0' }}>
                                    Please accept this letter as formal notification that I am resigning from my position. I am submitting this request due to&nbsp;
                                    <span style={{ fontWeight: '900', color: '#0f172a' }}>
                                        {selectedRequest.reason || (selectedRequest.reason_for_leaving && selectedRequest.reason_for_leaving.includes(':') ? selectedRequest.reason_for_leaving.split(':')[0].trim() : (selectedRequest.reason_for_leaving || 'N/A'))}
                                    </span>.
                                </p>
                                <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', lineHeight: '1.8', margin: '0 0 16px 0' }}>
                                    My proposed last working day is&nbsp;
                                    <span style={{ fontWeight: '900', color: '#ef4444' }}>
                                        {selectedRequest.last_working_day ? new Date(selectedRequest.last_working_day).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                    </span>.
                                </p>

                                {/* Formal Letter Content */}
                                {(selectedRequest.letter_content || (selectedRequest.reason_for_leaving && selectedRequest.reason_for_leaving.includes(':'))) && (
                                    <div style={{ marginTop: '20px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Formal Letter Content</div>
                                        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', color: '#334155', fontWeight: '500', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                                            {selectedRequest.letter_content || selectedRequest.reason_for_leaving.split(':').slice(1).join(':').trim()}
                                        </div>
                                    </div>
                                )}

                                <p style={{ fontSize: '14px', color: '#334155', fontWeight: '500', margin: '24px 0 0 0' }}>
                                    Sincerely,<br />
                                    <span style={{ fontWeight: '900', color: '#0f172a' }}>{selectedRequest.employee_name}</span>
                                </p>
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Status Decision</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {['Pending', 'Approved', 'Rejected'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setUpdatePayload(prev => ({ ...prev, status }));
                                                    if (status === 'Approved') setNoticePeriodCard(true);
                                                }}
                                                style={{
                                                    flex: 1, padding: '12px', borderRadius: '12px', border: '2px solid',
                                                    borderColor: updatePayload.status === status ? '#0f172a' : '#f1f5f9',
                                                    background: updatePayload.status === status ? '#0f172a' : 'white',
                                                    color: updatePayload.status === status ? 'white' : '#64748b',
                                                    fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: '0.2s'
                                                }}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {(!(selectedRequest.designation || '').toUpperCase().includes('LEAD') && !(selectedRequest.designation || '').toUpperCase().includes('MANAGER')) && (
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Reporting Manager Remarks</label>
                                            <textarea
                                                placeholder="Remarks from reporting manager..."
                                                value={updatePayload.reporting_manager_remark}
                                                onChange={(e) => setUpdatePayload(prev => ({ ...prev, reporting_manager_remark: e.target.value }))}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: '600', minHeight: '60px', resize: 'none', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Project Manager Remarks</label>
                                        <textarea
                                            placeholder="Remarks from project manager..."
                                            value={updatePayload.project_manager_remark}
                                            onChange={(e) => setUpdatePayload(prev => ({ ...prev, project_manager_remark: e.target.value }))}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '13px', fontWeight: '600', minHeight: '60px', resize: 'none', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#0369a1', marginBottom: '8px', textTransform: 'uppercase' }}>HR Final Remarks</label>
                                        <textarea
                                            placeholder="Final HR decision remarks..."
                                            value={updatePayload.hr_remark}
                                            onChange={(e) => setUpdatePayload(prev => ({ ...prev, hr_remark: e.target.value }))}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #bae6fd', outline: 'none', fontSize: '13px', fontWeight: '600', minHeight: '60px', resize: 'none', fontFamily: 'inherit', background: '#f0f9ff' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '24px' }}>
                                <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                                <button
                                    onClick={handleRequestUpdate}
                                    disabled={updating}
                                    style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
                                >
                                    {updating ? 'Saving...' : 'Submit Review'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Notice Period Card — centered overlay shown when Approved is selected */}
            <AnimatePresence>
                {noticePeriodCard && selectedRequest && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                            style={{
                                background: 'white',
                                borderRadius: '28px',
                                width: '100%',
                                maxWidth: '440px',
                                boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
                                overflow: 'hidden',
                                fontFamily: "'Outfit', sans-serif"
                            }}
                        >
                            {/* Top accent bar */}
                            <div style={{ height: '5px', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />

                            <div style={{ padding: '32px' }}>
                                {/* Icon + Title */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                                    <div style={{
                                        width: '52px', height: '52px', borderRadius: '16px',
                                        background: '#f0fdf4', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        border: '1.5px solid #bbf7d0', flexShrink: 0
                                    }}>
                                        <CheckCircle2 size={26} color="#16a34a" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '17px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.3px' }}>Notice Period Details</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Approval confirmation summary</div>
                                    </div>
                                </div>

                                {/* Employee chip */}
                                <div style={{
                                    background: '#f8fafc', borderRadius: '12px',
                                    padding: '10px 14px', marginBottom: '20px',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: '900', flexShrink: 0 }}>
                                        {(selectedRequest.employee_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{selectedRequest.employee_name || '—'}</div>
                                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>ID: {selectedRequest.employee_id || '—'}</div>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Notice Period Reason</div>
                                    <div style={{
                                        background: '#fffbeb',
                                        border: '1.5px solid #fef3c7',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        color: '#92400e',
                                        lineHeight: '1.5'
                                    }}>
                                        {selectedRequest.reason || selectedRequest.reason_for_leaving || '—'}
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div style={{ marginBottom: '28px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={12} />
                                        Notice Period
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {/* FROM */}
                                        <div style={{
                                            flex: 1, background: '#f0fdf4',
                                            border: '1.5px solid #bbf7d0',
                                            borderRadius: '14px', padding: '14px',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '9px', fontWeight: '900', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>FROM</div>
                                            <div style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>
                                                {selectedRequest.resignation_date
                                                    ? new Date(selectedRequest.resignation_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : selectedRequest.created_at
                                                        ? new Date(selectedRequest.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : 'N/A'}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                            <Clock size={18} />
                                        </div>

                                        {/* TO */}
                                        <div style={{
                                            flex: 1, background: '#fef2f2',
                                            border: '1.5px solid #fecaca',
                                            borderRadius: '14px', padding: '14px',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '9px', fontWeight: '900', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>TO</div>
                                            <div style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>
                                                {selectedRequest.last_working_day
                                                    ? new Date(selectedRequest.last_working_day).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => {
                                            setNoticePeriodCard(false);
                                            setUpdatePayload(prev => ({ ...prev, status: 'Pending' }));
                                        }}
                                        style={{
                                            flex: 1, padding: '13px',
                                            borderRadius: '14px',
                                            border: '1.5px solid #e2e8f0',
                                            background: 'white',
                                            color: '#64748b',
                                            fontWeight: '800', fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Go Back
                                    </button>
                                    <button
                                        onClick={() => setNoticePeriodCard(false)}
                                        style={{
                                            flex: 1.5, padding: '13px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                            color: 'white',
                                            fontWeight: '900', fontSize: '13px',
                                            cursor: 'pointer',
                                            boxShadow: '0 6px 20px rgba(22,163,74,0.3)'
                                        }}
                                    >
                                        Confirm Approval
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AppFooter />


        </div>
    );
}
