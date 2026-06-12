import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import {
    ArrowLeft, Send, LogOut,
    Calendar, Info, AlertCircle,
    Clock, CheckCircle, ChevronDown
} from 'lucide-react';

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

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchMyRequests();
    }, [user]);

    const fetchMyRequests = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const employeeId = user.id || user.employee_id;
            const res = await fetch(`${API_ENDPOINTS.RESIGNATION_REQUEST}?employee_id=${employeeId}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(Array.isArray(data) ? data : []);
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
                fetchMyRequests();
                setActiveTab('history');
            } else {
                alert('Submission failed. Please try again.');
            }
        } catch (error) { console.error('Submit error:', error); }
        finally { setSubmitting(false); }
    };

    const tabList = [
        { id: 'submit', label: 'Submit Notice', icon: <Send size={16} /> },
        { id: 'history', label: 'Team notice', icon: <Clock size={16} /> }
    ];

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
                    <div className="animate-fade-in" style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>My Resignation History</h3>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Syncing history...</div>
                        ) : requests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '24px' }}>
                                <AlertCircle size={40} style={{ marginBottom: '15px', opacity: 0.3 }} />
                                <p style={{ margin: 0, fontWeight: '700' }}>No resignation records found.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '24px' }}>
                                {requests.map((req, i) => (
                                    <div key={i} style={{ padding: '30px', borderRadius: '24px', border: '1px solid #f1f5f9', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <LogOut color="#ef4444" size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '950', color: '#0f172a', fontSize: '15px' }}>Resignation Notice</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Submitted on {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}</div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '10px', fontWeight: '950', padding: '6px 12px', borderRadius: '10px', background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fffbeb', color: req.status === 'Approved' ? '#15803d' : req.status === 'Rejected' ? '#dc2626' : '#b45309', textTransform: 'uppercase', border: '1px solid currentColor', opacity: 0.8 }}>{req.status}</span>
                                        </div>

                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px dashed #e2e8f0', marginBottom: '20px' }}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reason & Effective Date</span>
                                                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{req.reason}</div>
                                                <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>LWD: {req.last_working_day ? new Date(req.last_working_day).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</div>
                                            </div>
                                            {req.letter_content && (
                                                <div>
                                                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Letter Content</span>
                                                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{req.letter_content}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Remarks section */}
                                        {(req.reporting_manager_remark || req.project_manager_remark || req.hr_remark) && (
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>Management Feedback</span>
                                                {req.reporting_manager_remark && (
                                                    <div style={{ fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '8px 12px', borderRadius: '10px' }}>
                                                        <strong style={{ color: '#0f172a' }}>Reporting Mgr:</strong> {req.reporting_manager_remark}
                                                    </div>
                                                )}
                                                {req.project_manager_remark && (
                                                    <div style={{ fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '8px 12px', borderRadius: '10px' }}>
                                                        <strong style={{ color: '#0f172a' }}>Project Mgr:</strong> {req.project_manager_remark}
                                                    </div>
                                                )}
                                                {req.hr_remark && (
                                                    <div style={{ fontSize: '12px', color: '#0369a1', background: '#f0f9ff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                                                        <strong style={{ color: '#0c4a6e' }}>HR:</strong> {req.hr_remark}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
            <AppFooter />
            <style>{`.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
