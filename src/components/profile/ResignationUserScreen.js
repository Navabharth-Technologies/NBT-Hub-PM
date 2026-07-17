import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import logo from '../../assets/logo.png';
import {
    ArrowLeft, Send, LogOut,
    Calendar, Info, AlertCircle,
    Clock, CheckCircle, ChevronDown, User, X, CheckCircle2, FileText, Check, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cleanEmployeeId = (id) => {
    if (!id) return '';
    let s = String(id).split(',')[0].split(':')[0].trim();
    if (/^\d+$/.test(s)) {
        if (s.length >= 10 && s.length % 2 === 0) {
            const half = s.length / 2;
            if (s.substring(0, half) === s.substring(half)) {
                s = s.substring(0, half);
            }
        }
        return Number(s) || s;
    }
    return s;
};

const cleanResignationId = (id) => {
    if (!id) return '';
    let s = String(id).split(',')[0].split(':')[0].trim();
    if (/^\d+$/.test(s)) {
        return Number(s) || s;
    }
    return s;
};

const parseDateToISO = (dateStr) => {
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
        const parts = s.split('-');
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return s;
    }
    try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    } catch (e) {}
    return s;
};

export default function ResignationUserScreen({ defaultTab = 'submit' }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(defaultTab); // 'submit' or 'history'

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

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

    // Own resignation states
    const [myHistory, setMyHistory] = useState([]);
    const [exitCompleted, setExitCompleted] = useState(false);
    const [feedbackFilled, setFeedbackFilled] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [isEditingFeedback, setIsEditingFeedback] = useState(false);
    const [exitFeedback, setExitFeedback] = useState({
        overallExperience: 5,
        reasonForLeaving: '',
        whatLikedMost: '',
        areasForImprovement: '',
        recommend: 'Yes',
        additionalComments: ''
    });
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [alertModal, setAlertModal] = useState(null); // { message: '', title: '', type: 'error' | 'success', onClose: null }

    const [viewingEmployeeFeedback, setViewingEmployeeFeedback] = useState(null);
    const [editFeedbackData, setEditFeedbackData] = useState({
        id: '',
        employee_id: '',
        resignation_id: '',
        overall_experience: 5,
        what_liked_most: '',
        areas_for_improvement: '',
        recommend: 'Yes',
        additional_comments: '',
        employee_signature: '',
        employee_signature_date: '',
        hr_signature: '',
        hr_signature_date: '',
        manager_signature: '',
        manager_signature_date: ''
    });

    const formatDateDMY = (dateVal) => {
        if (!dateVal) return '';
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateVal)) return dateVal;
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return dateVal;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        } catch (e) {
            return dateVal;
        }
    };

    const sanitizeId = (id) => String(id || '').split(':')[0].trim();

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const checkExitAndFeedback = async (resignationList) => {
        if (!resignationList || resignationList.length === 0) {
            setExitCompleted(false);
            setFeedbackFilled(false);
            return;
        }
        const activeRes = resignationList.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || resignationList[0];
        if (!activeRes) return;

        const cleanEmployeeId = (id) => {
            if (!id) return '';
            let s = String(id).split(',')[0].split(':')[0].trim();
            if (/^\d+$/.test(s)) {
                if (s.length >= 10 && s.length % 2 === 0) {
                    const half = s.length / 2;
                    if (s.substring(0, half) === s.substring(half)) {
                        s = s.substring(0, half);
                    }
                }
                return Number(s) || s;
            }
            return s;
        };

        const cleanResignationId = (id) => {
            if (!id) return '';
            let s = String(id).split(',')[0].split(':')[0].trim();
            if (/^\d+$/.test(s)) {
                return Number(s) || s;
            }
            return s;
        };

        const rawUid = user?.id || user?.employee_id || user?.empId || user?.userId || activeRes.employee_id || activeRes.userId || activeRes.user_id;
        const cleanUid = cleanEmployeeId(rawUid);
        const cleanResId = cleanResignationId(activeRes.id);

        const feedbackKey = `exit_feedback_${cleanUid}_${cleanResId}`;
        let hasFeedback = false;
        try {
            const token = user?.token || localStorage.getItem('token');
            const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
            const fbRes = await fetch(`${BASE_URL}/api/exit-feedback/employee/${cleanUid}`, {
                headers: { 'Authorization': `Bearer ${cleanToken}` }
            });
            if (fbRes.ok) {
                const fbData = await fbRes.json();
                if (fbData && fbData.id) {
                    hasFeedback = true;
                    setFeedbackFilled(true);
                    setExitFeedback({
                        id: fbData.id,
                        overallExperience: fbData.overall_experience || fbData.overallExperience || 5,
                        reasonForLeaving: fbData.reason_for_leaving || fbData.reasonForLeaving || '',
                        whatLikedMost: fbData.what_liked_most || fbData.whatLikedMost || fbData.like_most || fbData.likeMost || '',
                        areasForImprovement: fbData.areas_for_improvement || fbData.areasForImprovement || fbData.improve_company || fbData.improveCompany || '',
                        recommend: fbData.recommend || 'Yes',
                        additionalComments: fbData.additional_comments || fbData.additionalComments || ''
                    });
                }
            }
        } catch (err) {
            console.warn("Failed to fetch exit feedback from backend:", err);
        }

        if (!hasFeedback) {
            const savedFeedback = localStorage.getItem(feedbackKey);
            if (savedFeedback) {
                setFeedbackFilled(true);
                try {
                    setExitFeedback(JSON.parse(savedFeedback));
                } catch (e) {}
            } else {
                setFeedbackFilled(false);
            }
        }

        if ((activeRes.status || '').toUpperCase() === 'APPROVED') {
            try {
                const exitRes = await fetch(`${API_ENDPOINTS.EXIT_FORMALITIES || `${BASE_URL}/api/exit-formalities`}/resignation/${cleanResId}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (exitRes.ok) {
                    const exitData = await exitRes.json();
                    if (exitData && (exitData.id || (Array.isArray(exitData) && exitData.length > 0))) {
                        setExitCompleted(true);
                    } else {
                        setExitCompleted(false);
                    }
                } else {
                    setExitCompleted(false);
                }
            } catch (err) {
                console.warn("Failed to check exit status:", err);
                setExitCompleted(false);
            }
        } else {
            setExitCompleted(false);
        }
    };

    const fetchMyResignations = async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(API_ENDPOINTS.RESIGNATION_MY || `${BASE_URL}/api/resignations/my`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const raw = await res.json();
                const data = Array.isArray(raw) ? raw : (raw.data || raw.value || []);
                setMyHistory(data);
                await checkExitAndFeedback(data);
            }
        } catch (e) {
            console.error("Fetch My Resignations Error:", e);
        }
    };

    useEffect(() => {
        if (user) {
            fetchMyResignations();
        }
    }, [user]);

    const isActionsDisabled = (() => {
        if (!selectedRequest) return false;

        const designation = String(selectedRequest.designation || '').toLowerCase();
        const role = String(selectedRequest.role || selectedRequest.employee_role || '').toLowerCase();

        const isExcluded =
            designation.includes('tl') || designation.includes('team lead') || designation.includes('teamleader') || designation.includes('lead') ||
            role.includes('tl') || role.includes('team lead') || role.includes('teamleader') || role.includes('lead') ||
            designation.includes('pm') || designation.includes('project manager') || designation.includes('project lead') ||
            role.includes('pm') || role.includes('project manager') || role.includes('project lead') ||
            designation.includes('hr') || designation.includes('human resource') ||
            role.includes('hr') || role.includes('human resource');

        if (isExcluded) {
            return false;
        }

        // Always require TL review for regular employees before enabling actions
        const hasTlReviewed = !!(selectedRequest.reviewed_by_tl || selectedRequest.reporting_manager_remark);
        return !hasTlReviewed;
    })();

    const [noticePeriodCard, setNoticePeriodCard] = useState(false);
    const [noticePeriodReason, setNoticePeriodReason] = useState('');
    const [noticeFromDate, setNoticeFromDate] = useState('');
    const [noticeToDate, setNoticeToDate] = useState('');
    const [noticePeriodSaved, setNoticePeriodSaved] = useState(false);
    const [noticePeriodToggle, setNoticePeriodToggle] = useState(null); // 'yes' | 'no' | null

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
            let usersRoleMap = {};
            let usersDesignationMap = {};
            let defaultHrName = 'HR Team';
            let defaultPmName = 'Project Manager';
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                if (Array.isArray(usersData)) {
                    usersData.forEach(u => {
                        usersMap[u.id || u.employee_id] = u.name || u.username;
                        usersRoleMap[u.id || u.employee_id] = u.role || '';
                        usersDesignationMap[u.id || u.employee_id] = u.designation || '';
                    });

                    let hrUser = usersData.find(u => (u.role || '').toLowerCase() === 'hr' || (u.designation || '').toLowerCase() === 'hr');
                    if (!hrUser) hrUser = usersData.find(u => (u.role || '').toLowerCase().includes('hr') || (u.designation || '').toLowerCase().includes('hr'));
                    if (!hrUser) hrUser = usersData.find(u => (u.role || '').toLowerCase().includes('human') || (u.designation || '').toLowerCase().includes('human'));
                    if (!hrUser) hrUser = usersData.find(u => (u.role || '').toLowerCase().includes('admin'));
                    if (hrUser) defaultHrName = hrUser.name || hrUser.username;

                    let pmUser = usersData.find(u => (u.role || '').toLowerCase() === 'pm' || (u.designation || '').toLowerCase() === 'pm');
                    if (!pmUser) pmUser = usersData.find(u => (u.role || '').toLowerCase().includes('pm') || (u.designation || '').toLowerCase().includes('pm'));
                    if (!pmUser) pmUser = usersData.find(u => (u.role || '').toLowerCase().includes('project manager') || (u.designation || '').toLowerCase().includes('project manager'));
                    if (pmUser) defaultPmName = pmUser.name || pmUser.username;
                }
            }

            if (res.ok) {
                const data = await res.json();
                let actualData = Array.isArray(data) ? data : (data.resignations || data.data || data.requests || []);
                
                let feedbacks = [];
                try {
                    const fbRes = await fetch(`${BASE_URL}/api/admin/exit-feedback`, {
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    });
                    if (fbRes.ok) {
                        const fbData = await fbRes.json();
                        feedbacks = Array.isArray(fbData) ? fbData : (fbData.data || []);
                    }
                } catch (e) {
                    console.warn("Batch exit feedback fetch failed:", e);
                }

                const mergedData = actualData.map(req => {
                    const fb = feedbacks.find(f => 
                        String(f.resignation_id) === String(req.id) || 
                        String(f.employee_id) === String(req.employee_id)
                    );
                    return {
                        ...req,
                        hr_name: usersMap[req.hr_id] || req.hr_name || defaultHrName,
                        pm_name: usersMap[req.pm_id] || usersMap[req.project_manager_id] || req.pm_name || req.project_manager_name || defaultPmName,
                        role: usersRoleMap[req.employee_id] || usersRoleMap[req.user_id] || usersRoleMap[req.userId] || req.role || '',
                        designation: usersDesignationMap[req.employee_id] || usersDesignationMap[req.user_id] || usersDesignationMap[req.userId] || req.designation || '',
                        feedback_submitted: !!fb,
                        feedback_data: fb || null
                    };
                });

                const requestsWithFeedback = await Promise.all(mergedData.map(async (req) => {
                    if (req.feedback_submitted) return req;
                    const empId = req.employee_id || req.user_id || req.userId;
                    if (!empId) return req;
                    try {
                        const fbRes = await fetch(`${BASE_URL}/api/exit-feedback/employee/${empId}`, {
                            headers: { 'Authorization': `Bearer ${user.token}` }
                        });
                        if (fbRes.ok) {
                            const fbData = await fbRes.json();
                            if (fbData && fbData.id) {
                                return {
                                    ...req,
                                    feedback_submitted: true,
                                    feedback_data: fbData
                                };
                            }
                        }
                    } catch (err) {
                        console.warn(`Error fetching feedback fallback for employee ${empId}:`, err);
                    }
                    return req;
                }));

                setRequests(requestsWithFeedback);
            }
        } catch (error) { console.error('Fetch error:', error); }
        finally { setLoading(false); }
    };

    const handleFormSubmit = async () => {
        if (!formData.last_working_day || !formData.primary_reason || !user?.token) {
            setAlertModal({ message: 'Please fill all required fields.', type: 'error' });
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
                setAlertModal({
                    message: 'Notice submitted successfully! ✅',
                    type: 'success',
                    onClose: () => {
                        setFormData({ resignation_date: new Date().toISOString().split('T')[0], last_working_day: '', primary_reason: '', letter_content: '' });
                        navigate('/resignation-history');
                    }
                });
            } else {
                setAlertModal({ message: 'Submission failed. Please try again.', type: 'error' });
            }
        } catch (error) { console.error('Submit error:', error); }
        finally { setSubmitting(false); }
    };

    const handleReviewSubmit = async (status, extraPayload = {}) => {
        if (!selectedRequest || !user?.token) return;

        try {
            setUpdating(true);

            const r = String(user?.role || user?.designation || '').toLowerCase();
            const isHR = r.includes('hr') || r.includes('human resource');
            const isPM = r.includes('pm') || r.includes('project manager') || r.includes('ceo') || r.includes('admin') || r.includes('manager');

            const payload = {
                status: status,
                project_manager_remark: `Updated to ${status} by Project Manager`,
                ...extraPayload
            };

            if (noticePeriodToggle) {
                payload.notice_period_applicable = noticePeriodToggle === 'yes' ? 'Yes' : 'No';
            } else if (selectedRequest && selectedRequest.notice_period_applicable) {
                payload.notice_period_applicable = selectedRequest.notice_period_applicable;
            }

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
                // Send notification to the employee
                let notifTitle = 'Resignation Update';
                let notifMessage = 'Your resignation is in waiting';
                if (status === 'Approved') {
                    notifTitle = 'Resignation Approved';
                    notifMessage = 'Your resignation is approved';
                } else if (status === 'Rejected') {
                    notifTitle = 'Resignation Rejected';
                    notifMessage = 'Your resignation is rejected';
                }

                try {
                    await fetch(API_ENDPOINTS.ALERTS || `${BASE_URL}/api/notifications`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        },
                        body: JSON.stringify({
                            target_user_id: selectedRequest.employee_id || selectedRequest.user_id,
                            title: notifTitle,
                            message: notifMessage,
                            type: 'RESIGNATION'
                        })
                    });
                } catch (notifErr) {
                    console.error("Failed to send resignation notification", notifErr);
                }

                setSelectedRequest(null);
                fetchTeamRequests();
            } else {
                setAlertModal({ message: 'Update failed. Please try again.', type: 'error' });
            }
        } catch (error) {
            console.error('Update Resignation Error:', error);
        } finally {
            setUpdating(false);
        }
    };

    // Step 1: Save notice period details to DB without approving
    const handleSaveNoticePeriod = async () => {
        if (!selectedRequest || !user?.token) return;
        try {
            setUpdating(true);
            const res = await fetch(API_ENDPOINTS.RESIGNATION_UPDATE(selectedRequest.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    notice_period_reason_by_pm: noticePeriodReason,
                    notice_period_from_date: noticeFromDate || null,
                    notice_period_to_date: noticeToDate || null,
                    notice_period_applicable: 'Yes'
                })
            });
            if (res.ok) {
                setNoticePeriodCard(false);   // close card, stay on review modal
                setNoticePeriodSaved(true);   // mark step 1 done — APPROVE now goes straight to approval
            } else {
                setAlertModal({ message: 'Failed to save notice period. Please try again.', type: 'error' });
            }
        } catch (error) {
            console.error('Save notice period error:', error);
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

    const handleSaveEmployeeFeedback = async () => {
        const token = user?.token || localStorage.getItem('token');
        if (!editFeedbackData.id || !token) return;
        try {
            setUpdating(true);
            const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';

            const cleanedEmpId = cleanEmployeeId(editFeedbackData.employee_id);
            const cleanedResId = cleanResignationId(editFeedbackData.resignation_id);

            const payload = {
                id: editFeedbackData.id,
                feedbackId: editFeedbackData.id,
                employee_id: cleanedEmpId,
                employeeId: cleanedEmpId,
                user_id: cleanedEmpId,
                userId: cleanedEmpId,
                resignation_id: cleanedResId,
                resignationId: cleanedResId,
                overall_experience: editFeedbackData.overall_experience,
                overallExperience: editFeedbackData.overall_experience,
                what_liked_most: editFeedbackData.what_liked_most,
                whatLikedMost: editFeedbackData.what_liked_most,
                like_most: editFeedbackData.what_liked_most,
                likeMost: editFeedbackData.what_liked_most,
                areas_for_improvement: editFeedbackData.areas_for_improvement,
                areasForImprovement: editFeedbackData.areas_for_improvement,
                improve_company: editFeedbackData.areas_for_improvement,
                improveCompany: editFeedbackData.areas_for_improvement,
                recommend: editFeedbackData.recommend,
                additional_comments: editFeedbackData.additional_comments,
                additionalComments: editFeedbackData.additional_comments,
                employee_signature: editFeedbackData.employee_signature,
                employeeSignature: editFeedbackData.employee_signature,
                employee_signature_date: parseDateToISO(editFeedbackData.employee_signature_date),
                employeeSignatureDate: parseDateToISO(editFeedbackData.employee_signature_date),
                hr_signature: editFeedbackData.hr_signature,
                hrSignature: editFeedbackData.hr_signature,
                hr_signature_date: parseDateToISO(editFeedbackData.hr_signature_date),
                hrSignatureDate: parseDateToISO(editFeedbackData.hr_signature_date),
                manager_signature: editFeedbackData.manager_signature,
                managerSignature: editFeedbackData.manager_signature,
                manager_signature_date: parseDateToISO(editFeedbackData.manager_signature_date),
                managerSignatureDate: parseDateToISO(editFeedbackData.manager_signature_date)
            };

            const res = await fetch(`${API_ENDPOINTS.EXIT_FEEDBACK || `${BASE_URL}/api/exit-feedback`}/${editFeedbackData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': cleanToken ? `Bearer ${cleanToken}` : ''
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setAlertModal({
                    title: 'Success',
                    message: 'Exit feedback updated successfully! ✅',
                    type: 'success',
                    onClose: () => {
                        setViewingEmployeeFeedback(null);
                        fetchTeamRequests();
                    }
                });
            } else {
                const errMsg = await res.text();
                setAlertModal({ message: `Failed to update exit feedback: ${errMsg}`, type: 'error' });
            }
        } catch (err) {
            console.error(err);
            setAlertModal({ message: 'Failed to update exit feedback due to network error.', type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    if (viewingEmployeeFeedback) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
                <AppHeader />
                <main style={{ flex: 1, padding: '100px 26px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <button 
                            onClick={() => setViewingEmployeeFeedback(null)} 
                            style={{ background: 'white', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: '800' }}
                        >
                            <ArrowLeft size={18} /> Back to Exits
                        </button>
                        <button
                            onClick={handleSaveEmployeeFeedback}
                            disabled={updating}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: updating ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                            }}
                        >
                            <Check size={18} /> {updating ? 'Saving...' : 'Save Feedback Changes'}
                        </button>
                    </div>

                    <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: winWidth < 768 ? '40px 20px 100px' : '100px 100px 150px', borderRadius: '4px', boxShadow: '0 0 50px rgba(0,0,0,0.06)', color: '#1e3a8a', fontSize: '15px', lineHeight: '2', minHeight: '900px', border: '1px solid #e2e8f0', maxWidth: '1000px', margin: '0 auto' }}>
                        {/* Top Right Triangle Graphics */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                                <polygon points="100,0 0,0 100,100" fill="#0ea5e9" />
                                <polygon points="100,0 40,0 100,60" fill="#1e1b4b" />
                            </svg>
                        </div>

                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04, zIndex: 0, pointerEvents: 'none', width: '500px', filter: 'grayscale(100%)' }}>
                            <img src={logo} alt="Watermark" style={{ width: '500px' }} />
                        </div>

                        <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <img src={logo} alt="Company Logo" style={{ height: '80px', marginBottom: '10px' }} />
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#1b2559', letterSpacing: '2px', marginTop: '5px' }}>
                                NAVABHARATH TECHNOLOGIES
                            </div>
                        </div>

                        <div style={{ position: 'relative', zIndex: 10, marginTop: '30px', color: '#1e3a8a', fontFamily: 'inherit' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px' }}>
                                7. Exit Feedback (Optional)
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px' }}>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>
                                        • What did you like most about working here?
                                    </div>
                                    <textarea
                                        value={editFeedbackData.what_liked_most}
                                        onChange={e => setEditFeedbackData({ ...editFeedbackData, what_liked_most: e.target.value })}
                                        placeholder="Enter employee response..."
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            border: 'none',
                                            borderBottom: '2px solid #1e3a8a',
                                            backgroundColor: 'transparent',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#1b2559',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '8px 0',
                                            fontFamily: 'inherit',
                                            lineHeight: '1.6'
                                        }}
                                    />
                                </div>

                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>
                                        • What can the company improve?
                                    </div>
                                    <textarea
                                        value={editFeedbackData.areas_for_improvement}
                                        onChange={e => setEditFeedbackData({ ...editFeedbackData, areas_for_improvement: e.target.value })}
                                        placeholder="Enter employee response..."
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            border: 'none',
                                            borderBottom: '2px solid #1e3a8a',
                                            backgroundColor: 'transparent',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#1b2559',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '8px 0',
                                            fontFamily: 'inherit',
                                            lineHeight: '1.6'
                                        }}
                                    />
                                </div>
                            </div>

                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px', marginTop: '40px' }}>
                                8. Signatures
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '40px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>
                                        • Employee Signature: 
                                        <input
                                            type="text"
                                            value={editFeedbackData.employee_signature}
                                            onChange={e => setEditFeedbackData({ ...editFeedbackData, employee_signature: e.target.value })}
                                            placeholder="Employee Name"
                                            style={{ border: 'none', borderBottom: '1px solid #1b2559', backgroundColor: 'transparent', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px', fontSize: '14px', fontWeight: '800', width: '200px', outline: 'none' }}
                                        />
                                    </span>
                                    <span>
                                        Date: 
                                        <input
                                            type="text"
                                            value={editFeedbackData.employee_signature_date}
                                            onChange={e => setEditFeedbackData({ ...editFeedbackData, employee_signature_date: e.target.value })}
                                            placeholder="dd-mm-yyyy"
                                            style={{ border: 'none', borderBottom: '1px solid #1b2559', backgroundColor: 'transparent', color: '#1b2559', padding: '0 5px', fontSize: '14px', fontWeight: '800', width: '120px', outline: 'none' }}
                                        />
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>
                                        • HR Signature: 
                                        <input
                                            type="text"
                                            value={editFeedbackData.hr_signature}
                                            onChange={e => setEditFeedbackData({ ...editFeedbackData, hr_signature: e.target.value })}
                                            placeholder="HR Representative"
                                            style={{ border: 'none', borderBottom: '1px solid #1b2559', backgroundColor: 'transparent', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px', fontSize: '14px', fontWeight: '800', width: '200px', outline: 'none' }}
                                        />
                                    </span>
                                    <span>
                                        Date: 
                                        <input
                                            type="text"
                                            value={editFeedbackData.hr_signature_date}
                                            onChange={e => setEditFeedbackData({ ...editFeedbackData, hr_signature_date: e.target.value })}
                                            placeholder="dd-mm-yyyy"
                                            style={{ border: 'none', borderBottom: '1px solid #1b2559', backgroundColor: 'transparent', color: '#1b2559', padding: '0 5px', fontSize: '14px', fontWeight: '800', width: '120px', outline: 'none' }}
                                        />
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>
                                        • Manager Signature: 
                                        <input
                                            type="text"
                                            value={editFeedbackData.manager_signature}
                                            onChange={e => setEditFeedbackData({ ...editFeedbackData, manager_signature: e.target.value })}
                                            placeholder="Project Manager"
                                            style={{ border: 'none', borderBottom: '1px solid #1b2559', backgroundColor: 'transparent', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px', fontSize: '14px', fontWeight: '800', width: '200px', outline: 'none' }}
                                        />
                                    </span>
                                    <span>
                                        Date: 
                                        <input
                                            type="text"
                                            value={editFeedbackData.manager_signature_date}
                                            onChange={e => setEditFeedbackData({ ...editFeedbackData, manager_signature_date: e.target.value })}
                                            placeholder="dd-mm-yyyy"
                                            style={{ border: 'none', borderBottom: '1px solid #1b2559', backgroundColor: 'transparent', color: '#1b2559', padding: '0 5px', fontSize: '14px', fontWeight: '800', width: '120px', outline: 'none' }}
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', marginBottom: '20px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 10, textAlign: 'right', color: '#1e3a8a', fontWeight: 'bold' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <span>Phone: 0821-3128831</span>
                                <div style={{ width: '30px', height: '10px', backgroundColor: '#0056b3' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <span>www.navabharathtechnologies.com</span>
                                <div style={{ width: '30px', height: '10px', backgroundColor: '#1b2559' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <span>hr@navabharathtechnologies.com</span>
                                <div style={{ width: '30px', height: '10px', backgroundColor: '#007bff' }}></div>
                            </div>
                        </div>

                        {/* Bottom Left Corner Graphic */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '140px', height: '140px', overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                                <polygon points="0,100 100,100 0,0" fill="#0ea5e9" />
                                <polygon points="0,100 60,100 0,40" fill="#1e1b4b" />
                            </svg>
                        </div>
                    </div>
                </main>
                <AppFooter />

                {alertModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            {alertModal.type === 'success' ? (
                                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                    <Check size={30} />
                                </div>
                            ) : (
                                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                    <AlertCircle size={30} />
                                </div>
                            )}
                            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>
                                {alertModal.title || (alertModal.type === 'success' ? 'Success' : 'Notice')}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '25px', lineHeight: '1.5' }}>{alertModal.message}</p>
                            <button 
                                onClick={() => {
                                    const onClose = alertModal.onClose;
                                    setAlertModal(null);
                                    if (onClose) onClose();
                                }} 
                                style={{ 
                                    width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', 
                                    backgroundColor: '#0f172a', color: 'white', fontWeight: '950', fontSize: '13px', 
                                    cursor: 'pointer', display: 'block', margin: '0 auto', minWidth: '120px',
                                    textTransform: 'uppercase', letterSpacing: '1px'
                                }}
                            >
                                OK
                            </button>
                        </motion.div>
                    </div>
                )}
            </div>
        );
    }

    if (showFeedbackForm) {
        const activeRes = myHistory.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || myHistory[0];
        const uid = sanitizeId(user?.id || user?.employee_id || user?.empId || user?.userId);
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
                <AppHeader />
                <main style={{ flex: 1, padding: '100px 26px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <button 
                            onClick={() => setShowFeedbackForm(false)} 
                            style={{ background: 'white', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: '800' }}
                        >
                            <ArrowLeft size={18} /> Back to Exits
                        </button>
                        <button
                            onClick={async () => {
                                if (feedbackFilled && !isEditingFeedback) {
                                    setIsEditingFeedback(true);
                                    return;
                                }

                                if (!activeRes) return;
                                
                                const cleanEmployeeId = (id) => {
                                    if (!id) return '';
                                    let s = String(id).split(',')[0].split(':')[0].trim();
                                    if (/^\d+$/.test(s)) {
                                        if (s.length >= 10 && s.length % 2 === 0) {
                                            const half = s.length / 2;
                                            if (s.substring(0, half) === s.substring(half)) {
                                                s = s.substring(0, half);
                                            }
                                        }
                                        return Number(s) || s;
                                    }
                                    return s;
                                };

                                const cleanResignationId = (id) => {
                                    if (!id) return '';
                                    let s = String(id).split(',')[0].split(':')[0].trim();
                                    if (/^\d+$/.test(s)) {
                                        return Number(s) || s;
                                    }
                                    return s;
                                };

                                const rawUid = user?.id || user?.employee_id || user?.empId || user?.userId || activeRes.employee_id || activeRes.userId || activeRes.user_id;
                                const cleanUid = cleanEmployeeId(rawUid);
                                const cleanResId = cleanResignationId(activeRes.id);
                                
                                const token = user?.token || localStorage.getItem('token');
                                const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';
                                
                                const payload = {
                                    resignation_id: cleanResId,
                                    resignationId: cleanResId,
                                    employee_id: cleanUid,
                                    employeeId: cleanUid,
                                    user_id: cleanUid,
                                    userId: cleanUid,
                                    overall_experience: exitFeedback.overallExperience || 5,
                                    overallExperience: exitFeedback.overallExperience || 5,
                                    reason_for_leaving: exitFeedback.reasonForLeaving || activeRes.reason || '',
                                    reasonForLeaving: exitFeedback.reasonForLeaving || activeRes.reason || '',
                                    what_liked_most: exitFeedback.whatLikedMost || '',
                                    whatLikedMost: exitFeedback.whatLikedMost || '',
                                    like_most: exitFeedback.whatLikedMost || '',
                                    likeMost: exitFeedback.whatLikedMost || '',
                                    areas_for_improvement: exitFeedback.areasForImprovement || '',
                                    areasForImprovement: exitFeedback.areasForImprovement || '',
                                    improve_company: exitFeedback.areasForImprovement || '',
                                    improveCompany: exitFeedback.areasForImprovement || '',
                                    recommend: exitFeedback.recommend || 'Yes',
                                    additional_comments: exitFeedback.additionalComments || '',
                                    additionalComments: exitFeedback.additionalComments || '',
                                    employee_signature: user?.name || '',
                                    employeeSignature: user?.name || '',
                                    employee_signature_date: new Date().toISOString().split('T')[0],
                                    employeeSignatureDate: new Date().toISOString().split('T')[0]
                                };

                                if (exitFeedback.id) {
                                    payload.id = exitFeedback.id;
                                    payload.feedbackId = exitFeedback.id;
                                }
                                
                                try {
                                    const method = exitFeedback.id || feedbackFilled ? 'PUT' : 'POST';
                                    const baseUrl = API_ENDPOINTS.EXIT_FEEDBACK || `${BASE_URL}/api/exit-feedback`;
                                    const url = (method === 'PUT' && exitFeedback.id) ? `${baseUrl}/${exitFeedback.id}` : baseUrl;
                                    const res = await fetch(url, {
                                        method: method,
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': cleanToken ? `Bearer ${cleanToken}` : ''
                                        },
                                        body: JSON.stringify(payload)
                                    });
                                    if (res.ok) {
                                        const savedObj = { ...exitFeedback };
                                        if (method === 'POST') {
                                            try {
                                                const resData = await res.json();
                                                if (resData && resData.id) {
                                                    savedObj.id = resData.id;
                                                }
                                            } catch (e) {}
                                        }
                                        localStorage.setItem(`exit_feedback_${cleanUid}_${cleanResId}`, JSON.stringify(savedObj));
                                        setExitFeedback(savedObj);
                                        setFeedbackFilled(true);
                                        setIsEditingFeedback(false);
                                        setAlertModal({
                                            title: 'Success',
                                            message: feedbackFilled ? 'Exit feedback updated successfully!' : 'Exit feedback submitted successfully! Thank you.',
                                            type: 'success',
                                            onClose: () => {
                                                if (!feedbackFilled) setShowFeedbackForm(false);
                                            }
                                        });
                                    } else {
                                        const errMsg = await res.text();
                                        setAlertModal({ message: `Failed to submit exit feedback: ${errMsg}`, type: 'error' });
                                    }
                                } catch (err) {
                                    console.error(err);
                                    setAlertModal({ message: 'Failed to submit exit feedback due to network error.', type: 'error' });
                                }
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: (!feedbackFilled || isEditingFeedback) ? '#16a34a' : '#1b2559',
                                color: 'white',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: (!feedbackFilled || isEditingFeedback) ? '0 4px 12px rgba(22, 163, 74, 0.25)' : '0 4px 12px rgba(27, 37, 89, 0.25)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {(!feedbackFilled || isEditingFeedback) ? (
                                <>
                                    <Check size={18} /> {feedbackFilled ? 'Save Feedback' : 'Submit Feedback'}
                                </>
                            ) : (
                                <>
                                    <Edit size={18} /> Edit Feedback
                                </>
                            )}
                        </button>
                    </div>

                    <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: winWidth < 768 ? '40px 20px 100px' : '100px 100px 150px', borderRadius: '4px', boxShadow: '0 0 50px rgba(0,0,0,0.06)', color: '#1e3a8a', fontSize: '15px', lineHeight: '2', minHeight: '900px', border: '1px solid #e2e8f0', maxWidth: '1000px', margin: '0 auto' }}>
                        <svg width="250" height="250" viewBox="0 0 250 250" style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none', zIndex: 1 }}>
                            <polygon points="120,0 250,130 250,0" fill="#0056b3" />
                            <polygon points="150,0 250,100 250,0" fill="#1b2559" />
                            <polygon points="50,0 250,200 250,160 90,0" fill="#007bff" />
                        </svg>

                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.04, zIndex: 0, pointerEvents: 'none', width: '500px', filter: 'grayscale(100%)' }}>
                            <img src={logo} alt="Watermark" style={{ width: '500px' }} />
                        </div>

                        <div style={{ marginBottom: '40px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <img src={logo} alt="Company Logo" style={{ height: '80px', marginBottom: '10px' }} />
                            <div style={{ fontSize: '14px', fontWeight: '900', color: '#1b2559', letterSpacing: '2px', marginTop: '5px' }}>
                                NAVABHARATH TECHNOLOGIES
                            </div>
                        </div>

                        <div style={{ position: 'relative', zIndex: 10, marginTop: '30px', color: '#1e3a8a', fontFamily: 'inherit' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px' }}>
                                7. Exit Feedback (Optional)
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginBottom: '40px' }}>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>
                                        • What did you like most about working here?
                                    </div>
                                    <textarea
                                        disabled={feedbackFilled && !isEditingFeedback}
                                        value={exitFeedback.whatLikedMost}
                                        onChange={e => setExitFeedback({ ...exitFeedback, whatLikedMost: e.target.value })}
                                        placeholder={feedbackFilled ? "" : "Your comments..."}
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            border: 'none',
                                            borderBottom: '2px solid #1e3a8a',
                                            backgroundColor: 'transparent',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#1b2559',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '8px 0',
                                            fontFamily: 'inherit',
                                            lineHeight: '1.6'
                                        }}
                                    />
                                </div>

                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '750', marginBottom: '10px', color: '#1b2559' }}>
                                        • What can the company improve?
                                    </div>
                                    <textarea
                                        disabled={feedbackFilled && !isEditingFeedback}
                                        value={exitFeedback.areasForImprovement}
                                        onChange={e => setExitFeedback({ ...exitFeedback, areasForImprovement: e.target.value })}
                                        placeholder={feedbackFilled ? "" : "Your comments..."}
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            border: 'none',
                                            borderBottom: '2px solid #1e3a8a',
                                            backgroundColor: 'transparent',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#1b2559',
                                            outline: 'none',
                                            resize: 'none',
                                            padding: '8px 0',
                                            fontFamily: 'inherit',
                                            lineHeight: '1.6'
                                        }}
                                    />
                                </div>
                            </div>

                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '5px', marginBottom: '25px', marginTop: '40px' }}>
                                8. Signatures
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', fontWeight: '800', color: '#1e3a8a', marginBottom: '40px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>• Employee Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{user?.name || '_______________________'}</span></span>
                                    <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{feedbackFilled ? new Date().toLocaleDateString('en-GB') : '___________'}</span></span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>• HR Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{feedbackFilled ? 'HR Team' : '_______________________'}</span></span>
                                    <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{feedbackFilled ? new Date().toLocaleDateString('en-GB') : '___________'}</span></span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>• Manager Signature: <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#1b2559', padding: '0 5px' }}>{feedbackFilled ? 'Project Manager' : '_______________________'}</span></span>
                                    <span>Date: <span style={{ color: '#1b2559', padding: '0 5px' }}>{feedbackFilled ? new Date().toLocaleDateString('en-GB') : '___________'}</span></span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', marginBottom: '20px', marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 10, textAlign: 'right', color: '#1e3a8a', fontWeight: 'bold' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <span>Phone: 0821-3128831</span>
                                <div style={{ width: '30px', height: '10px', backgroundColor: '#0056b3' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <span>www.navabharathtechnologies.com</span>
                                <div style={{ width: '30px', height: '10px', backgroundColor: '#1b2559' }}></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                <span>hr@navabharathtechnologies.com</span>
                                <div style={{ width: '30px', height: '10px', backgroundColor: '#007bff' }}></div>
                            </div>
                        </div>

                        <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: 'absolute', bottom: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
                            <polygon points="0,300 100,300 0,200" fill="#0056b3" />
                            <polygon points="0,200 150,300 120,300 0,220" fill="#1b2559" />
                            <polygon points="0,150 200,300 170,300 0,170" fill="#007bff" />
                            <polygon points="0,100 250,300 220,300 0,120" fill="#1b2559" />
                        </svg>
                    </div>
                </main>
                <AppFooter />

                {alertModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            {alertModal.type === 'success' ? (
                                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                    <Check size={30} />
                                </div>
                            ) : (
                                <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                    <AlertCircle size={30} />
                                </div>
                            )}
                            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>
                                {alertModal.title || (alertModal.type === 'success' ? 'Success' : 'Notice')}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '25px', lineHeight: '1.5' }}>{alertModal.message}</p>
                            <button 
                                onClick={() => {
                                    const onClose = alertModal.onClose;
                                    setAlertModal(null);
                                    if (onClose) onClose();
                                }} 
                                style={{ 
                                    width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', 
                                    backgroundColor: '#0f172a', color: 'white', fontWeight: '950', fontSize: '13px', 
                                    cursor: 'pointer', display: 'block', margin: '0 auto', minWidth: '120px',
                                    textTransform: 'uppercase', letterSpacing: '1px'
                                }}
                            >
                                OK
                            </button>
                        </motion.div>
                    </div>
                )}
            </div>
        );
    }

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
                    <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Resignation Management</h1>
                </div>

                {/* Tab bar hidden per user requirements to keep separate screens */}

                {activeTab === 'submit' ? (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Own resignation alerts / exit completed banners */}
                        {(() => {
                            const activeRes = myHistory.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || myHistory[0];
                            if (!activeRes) return null;
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {(activeRes.status || '').toUpperCase() === 'PENDING' && (
                                        <div style={{ padding: '18px 24px', backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: '#b45309' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <AlertCircle size={22} color="#d97706" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Waiting</div>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#b4530995' }}>Your resignation is in waiting</div>
                                            </div>
                                        </div>
                                    )}

                                    {(activeRes.status || '').toUpperCase() === 'REJECTED' && (
                                        <div style={{ padding: '18px 24px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: '#b91c1c' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <X size={22} color="#dc2626" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Rejected</div>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#b91c1c95' }}>Your resignation is rejected</div>
                                            </div>
                                        </div>
                                    )}

                                    {(activeRes.status || '').toUpperCase() === 'APPROVED' && (
                                        <>
                                            {!exitCompleted ? (
                                                <div style={{ padding: '18px 24px', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', color: '#15803d' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <CheckCircle2 size={22} color="#16a34a" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '2px' }}>Resignation Approved</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#15803d95' }}>Your resignation is approved</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '25px', color: 'white', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 12px 30px rgba(59, 130, 246, 0.2)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <FileText size={24} color="white" />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>Exit Formalities Completed</div>
                                                            <div style={{ fontSize: '13px', opacity: 0.9, fontWeight: '500', marginTop: '2px', lineHeight: '1.4' }}>
                                                                Your exit formalities are completed so view the Feedback form and fill out this
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
                                                        <button
                                                            onClick={() => setShowFeedbackForm(true)}
                                                            style={{
                                                                padding: '10px 20px',
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                backgroundColor: 'white',
                                                                color: '#4f46e5',
                                                                fontWeight: '800',
                                                                fontSize: '13px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                            }}
                                                        >
                                                            {feedbackFilled ? 'View Exit Feedback' : 'View Feedback Form'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })()}

                        <div style={{ backgroundColor: 'white', borderRadius: '30px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
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

                                            {/* Notice Period dates if set */}
                                            {(req.notice_period_from_date || req.notice_period_to_date) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '-8px' }}>
                                                    <Calendar size={11} color="#16a34a" />
                                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a' }}>
                                                        Notice: {req.notice_period_from_date ? formatDateDMY(req.notice_period_from_date) : '—'} → {req.notice_period_to_date ? formatDateDMY(req.notice_period_to_date) : '—'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Exit Formalities Button */}
                                            {(() => {
                                                const isApproved = req.status === 'Approved' || req.pm_status === 'Approved';
                                                let isEnabled = false;

                                                if (isApproved) {
                                                    const noticePeriodRequired = !(
                                                        String(req.notice_period_applicable || '').toLowerCase() === 'no' ||
                                                        req.notice_period_required === false ||
                                                        String(req.notice_period_required || '').toLowerCase() === 'no' ||
                                                        req.notice_period_days === 0 ||
                                                        req.notice_period_days === '0' ||
                                                        req.notice_period_days === null ||
                                                        req.notice_period_days === undefined
                                                    );
                                                    
                                                    const lwdVal = req.last_working_date || req.notice_period_to_date;

                                                    if (!noticePeriodRequired || !lwdVal) {
                                                        isEnabled = true;
                                                    } else {
                                                        const lwd = new Date(lwdVal);
                                                        const now = new Date();
                                                        const diffHours = (lwd.getTime() - now.getTime()) / (1000 * 60 * 60);
                                                        isEnabled = diffHours <= 48;
                                                    }
                                                }

                                                return (
                                                    <button
                                                        disabled={!isEnabled}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (isEnabled) {
                                                                navigate(`/exit-formalities/${req.id}`);
                                                            }
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            marginTop: '10px',
                                                            borderRadius: '10px',
                                                            border: 'none',
                                                            background: isEnabled 
                                                                ? 'linear-gradient(135deg, #0f172a, #334155)' 
                                                                : '#f1f5f9',
                                                            color: isEnabled ? 'white' : '#94a3b8',
                                                            fontWeight: '800',
                                                            fontSize: '11px',
                                                            cursor: isEnabled ? 'pointer' : 'not-allowed',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            boxShadow: isEnabled ? '0 4px 12px rgba(15,23,42,0.25)' : 'none',
                                                            transition: '0.2s',
                                                            opacity: isEnabled ? 1 : 0.6
                                                        }}
                                                    >
                                                        🏁 Exit Formalities
                                                    </button>
                                                );
                                            })()}

                                            {/* Submitted Feedback Form Button */}
                                            <button
                                                disabled={!req.feedback_submitted}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (req.feedback_submitted) {
                                                        setViewingEmployeeFeedback(req.feedback_data);
                                                        setEditFeedbackData({
                                                            id: req.feedback_data.id,
                                                            employee_id: cleanEmployeeId(req.feedback_data.employee_id || req.feedback_data.employeeId || req.employee_id || req.user_id || req.userId || ''),
                                                            resignation_id: cleanResignationId(req.feedback_data.resignation_id || req.feedback_data.resignationId || req.id || ''),
                                                            overall_experience: req.feedback_data.overall_experience || req.feedback_data.overallExperience || 5,
                                                            what_liked_most: req.feedback_data.what_liked_most || req.feedback_data.whatLikedMost || req.feedback_data.like_most || req.feedback_data.likeMost || '',
                                                            areas_for_improvement: req.feedback_data.areas_for_improvement || req.feedback_data.areasForImprovement || req.feedback_data.improve_company || req.feedback_data.improveCompany || '',
                                                            recommend: req.feedback_data.recommend || 'Yes',
                                                            additional_comments: req.feedback_data.additional_comments || req.feedback_data.additionalComments || '',
                                                            employee_signature: req.feedback_data.employee_signature || req.feedback_data.employeeSignature || '',
                                                            employee_signature_date: formatDateDMY(req.feedback_data.employee_signature_date || req.feedback_data.employeeSignatureDate || ''),
                                                            hr_signature: req.feedback_data.hr_signature || req.feedback_data.hrSignature || '',
                                                            hr_signature_date: formatDateDMY(req.feedback_data.hr_signature_date || req.feedback_data.hrSignatureDate || ''),
                                                            manager_signature: req.feedback_data.manager_signature || req.feedback_data.managerSignature || '',
                                                            manager_signature_date: formatDateDMY(req.feedback_data.manager_signature_date || req.feedback_data.managerSignatureDate || '')
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 14px',
                                                    marginTop: '10px',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: req.feedback_submitted 
                                                        ? 'linear-gradient(135deg, #1b2559, #4f46e5)' 
                                                        : '#f1f5f9',
                                                    color: req.feedback_submitted ? 'white' : '#94a3b8',
                                                    fontWeight: '800',
                                                    fontSize: '11px',
                                                    cursor: req.feedback_submitted ? 'pointer' : 'not-allowed',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: req.feedback_submitted ? '0 4px 12px rgba(27,37,89,0.25)' : 'none',
                                                    transition: '0.2s',
                                                    opacity: req.feedback_submitted ? 1 : 0.6
                                                }}
                                            >
                                                📝 Submitted Feedback Form
                                            </button>


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
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '80px 20px 20px' }}>
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
                                    <button onClick={() => { setSelectedRequest(null); setNoticePeriodSaved(false); }} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                        {(selectedRequest.reviewed_by_tl || selectedRequest.reporting_manager_remark) && (
                                            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px', fontWeight: '800', color: '#16a34a' }}>
                                                ✓ Review completed by TL: "{selectedRequest.reviewed_by_tl || selectedRequest.reporting_manager_remark}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer (Buttons) */}
                            <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={() => handleReviewSubmit('Pending')}
                                    disabled={updating || isActionsDisabled}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        background: isActionsDisabled ? '#f1f5f9' : '#fffbeb',
                                        color: isActionsDisabled ? '#94a3b8' : '#d97706',
                                        border: 'none', fontWeight: '900', fontSize: '12px',
                                        textTransform: 'uppercase', letterSpacing: '1px',
                                        cursor: (updating || isActionsDisabled) ? 'not-allowed' : 'pointer',
                                        opacity: (updating || isActionsDisabled) ? 0.6 : 1
                                    }}
                                >
                                    WAIT
                                </button>
                                <button
                                    onClick={() => handleReviewSubmit('Rejected')}
                                    disabled={updating || isActionsDisabled}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        background: isActionsDisabled ? '#f1f5f9' : '#fef2f2',
                                        color: isActionsDisabled ? '#94a3b8' : '#dc2626',
                                        border: 'none', fontWeight: '900', fontSize: '12px',
                                        textTransform: 'uppercase', letterSpacing: '1px',
                                        cursor: (updating || isActionsDisabled) ? 'not-allowed' : 'pointer',
                                        opacity: (updating || isActionsDisabled) ? 0.6 : 1
                                    }}
                                >
                                    REJECT
                                </button>
                                {(() => {
                                    const isApproved = selectedRequest.pm_status === 'Approved';
                                    const btnDisabled = updating || isActionsDisabled || isApproved;
                                    return (
                                        <button
                                            onClick={() => {
                                                if (isApproved) return;
                                                if (noticePeriodSaved) {
                                                    handleReviewSubmit('Approved');
                                                } else {
                                                    setNoticePeriodReason('');
                                                    setNoticeFromDate('');
                                                    setNoticeToDate('');
                                                    setNoticePeriodToggle(null);
                                                    setNoticePeriodCard(true);
                                                }
                                            }}
                                            disabled={btnDisabled}
                                            style={{
                                                flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                                                background: (isActionsDisabled || isApproved) ? '#f1f5f9' : (noticePeriodSaved ? 'linear-gradient(135deg, #16a34a, #22c55e)' : '#f0fdf4'),
                                                color: (isActionsDisabled || isApproved) ? '#94a3b8' : (noticePeriodSaved ? 'white' : '#16a34a'),
                                                fontWeight: '900', fontSize: '11px', textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                cursor: btnDisabled ? 'not-allowed' : 'pointer',
                                                opacity: btnDisabled ? 0.6 : 1,
                                                boxShadow: (!isActionsDisabled && !isApproved && noticePeriodSaved) ? '0 4px 14px rgba(22,163,74,0.35)' : 'none',
                                                transition: '0.3s'
                                            }}
                                        >
                                            {isApproved ? '✓ APPROVED' : (noticePeriodSaved ? 'Saved ✓ Tap to Approve' : 'APPROVE')}
                                        </button>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AppFooter />

            {/* Notice Period Card — appears when PM clicks APPROVE */}
            <AnimatePresence>
                {noticePeriodCard && selectedRequest && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.82, opacity: 0, y: 24 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.82, opacity: 0, y: 24 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            style={{
                                background: 'white',
                                borderRadius: '28px',
                                width: '100%',
                                maxWidth: '420px',
                                boxShadow: '0 40px 80px rgba(0,0,0,0.3)',
                                overflow: 'hidden',
                                fontFamily: "'Outfit', sans-serif"
                            }}
                        >
                            {/* Green top bar */}
                            <div style={{ height: '5px', background: 'linear-gradient(90deg, #10b981, #34d399)' }} />

                            <div style={{ padding: '28px 30px 30px' }}>

                                {/* Title row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '14px',
                                        background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <CheckCircle2 size={24} color="#16a34a" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.3px' }}>Notice Period Details</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Review before confirming approval</div>
                                    </div>
                                </div>

                                {/* Employee chip */}
                                <div style={{
                                    background: '#f8fafc', borderRadius: '12px',
                                    padding: '10px 14px', marginBottom: '18px',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{
                                        width: '30px', height: '30px', borderRadius: '9px',
                                        background: '#0f172a', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', color: 'white',
                                        fontSize: '12px', fontWeight: '900', flexShrink: 0
                                    }}>
                                        {(selectedRequest.employee_name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>{selectedRequest.employee_name || '—'}</div>
                                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>ID: {selectedRequest.employee_id || '—'}</div>
                                    </div>
                                </div>

                                {/* YES / NO Toggle — Notice period applicable? */}
                                <div style={{ marginBottom: '20px', padding: '14px 16px', background: '#f8fafc', borderRadius: '14px', border: '1.5px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Notice Period Applicable?</div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => setNoticePeriodToggle('yes')}
                                            style={{
                                                flex: 1, padding: '11px',
                                                borderRadius: '12px',
                                                border: `2px solid ${noticePeriodToggle === 'yes' ? '#16a34a' : '#cbd5e1'}`,
                                                background: noticePeriodToggle === 'yes' ? '#f0fdf4' : 'white',
                                                color: noticePeriodToggle === 'yes' ? '#16a34a' : '#64748b',
                                                fontWeight: '900', fontSize: '13px', cursor: 'pointer',
                                                transition: '0.2s',
                                                letterSpacing: '0.5px',
                                                boxShadow: noticePeriodToggle === 'yes' ? '0 2px 8px rgba(22,163,74,0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            ✓ YES
                                        </button>
                                        <button
                                            onClick={() => setNoticePeriodToggle('no')}
                                            style={{
                                                flex: 1, padding: '11px',
                                                borderRadius: '12px',
                                                border: `2px solid ${noticePeriodToggle === 'no' ? '#dc2626' : '#cbd5e1'}`,
                                                background: noticePeriodToggle === 'no' ? '#fef2f2' : 'white',
                                                color: noticePeriodToggle === 'no' ? '#dc2626' : '#64748b',
                                                fontWeight: '900', fontSize: '13px', cursor: 'pointer',
                                                transition: '0.2s',
                                                letterSpacing: '0.5px',
                                                boxShadow: noticePeriodToggle === 'no' ? '0 2px 8px rgba(220,38,38,0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            ✕ NO
                                        </button>
                                    </div>
                                </div>

                                {/* Show notice period details ONLY when YES is selected */}
                                {noticePeriodToggle === 'yes' && (
                                    <>
                                        {/* Notice Period Reason */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '7px' }}>Notice Period Reason</div>
                                            <textarea
                                                value={noticePeriodReason}
                                                onChange={(e) => setNoticePeriodReason(e.target.value)}
                                                rows={2}
                                                placeholder="Enter notice period reason..."
                                                style={{
                                                    width: '100%', boxSizing: 'border-box',
                                                    background: '#fffbeb', border: '1.5px solid #fcd34d',
                                                    borderRadius: '12px', padding: '11px 14px',
                                                    fontSize: '13px', fontWeight: '700', color: '#92400e',
                                                    lineHeight: '1.5', resize: 'none',
                                                    outline: 'none', fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>

                                        {/* Date Range FROM → TO */}
                                        <div style={{ marginBottom: '26px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Calendar size={11} /> Notice Period
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                <div style={{ flex: 1, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '12px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '8px', fontWeight: '900', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>FROM</div>
                                                    <input
                                                        type="date"
                                                        value={noticeFromDate}
                                                        onChange={(e) => setNoticeFromDate(e.target.value)}
                                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f172a', outline: 'none', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', flexShrink: 0, paddingTop: '18px' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                                                </div>
                                                <div style={{ flex: 1, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px', padding: '12px 10px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '8px', fontWeight: '900', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>TO (LWD)</div>
                                                    <input
                                                        type="date"
                                                        value={noticeToDate}
                                                        onChange={(e) => setNoticeToDate(e.target.value)}
                                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f172a', outline: 'none', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Buttons for YES path */}
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => setNoticePeriodCard(false)}
                                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Go Back
                                            </button>
                                            <button
                                                onClick={() => handleSaveNoticePeriod()}
                                                disabled={updating}
                                                style={{ flex: 1.6, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', fontWeight: '900', fontSize: '13px', cursor: updating ? 'not-allowed' : 'pointer', boxShadow: '0 6px 18px rgba(22,163,74,0.3)', opacity: updating ? 0.7 : 1 }}
                                            >
                                                {updating ? 'Processing...' : 'Confirm Approval ✓'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Show only confirm/cancel when NO is selected */}
                                {noticePeriodToggle === 'no' && (
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                        <button
                                            onClick={() => setNoticePeriodCard(false)}
                                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                // No notice period — approve directly without saving notice period
                                                handleReviewSubmit('Approved', { notice_period_applicable: 'No' });
                                                setNoticePeriodCard(false);
                                            }}
                                            disabled={updating}
                                            style={{ flex: 1.6, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', fontWeight: '900', fontSize: '13px', cursor: updating ? 'not-allowed' : 'pointer', boxShadow: '0 6px 18px rgba(22,163,74,0.3)', opacity: updating ? 0.7 : 1 }}
                                        >
                                            {updating ? 'Processing...' : 'Confirm Approval ✓'}
                                        </button>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            
            {alertModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ backgroundColor: 'white', borderRadius: '30px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        {alertModal.type === 'success' ? (
                            <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                <Check size={30} />
                            </div>
                        ) : (
                            <div style={{ width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                <AlertCircle size={30} />
                            </div>
                        )}
                        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>
                            {alertModal.title || (alertModal.type === 'success' ? 'Success' : 'Notice')}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginBottom: '25px', lineHeight: '1.5' }}>{alertModal.message}</p>
                        <button 
                            onClick={() => {
                                const onClose = alertModal.onClose;
                                setAlertModal(null);
                                if (onClose) onClose();
                            }} 
                            style={{ 
                                width: '100%', padding: '14px 20px', borderRadius: '14px', border: 'none', 
                                backgroundColor: '#0f172a', color: 'white', fontWeight: '950', fontSize: '13px', 
                                cursor: 'pointer', display: 'block', margin: '0 auto', minWidth: '120px',
                                textTransform: 'uppercase', letterSpacing: '1px'
                            }}
                        >
                            OK
                        </button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
