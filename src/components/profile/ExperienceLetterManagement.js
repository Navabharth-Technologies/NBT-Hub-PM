import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../../assets/logo.png';
import {
    ArrowLeft, FileText, CheckCircle, Clock,
    ExternalLink, Search, Filter, MoreHorizontal,
    Mail, User, Briefcase, Calendar, AlertCircle, X, Package, Check, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cleanEmpId = (id) => {
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

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return dateStr;
    }
};

export default function ExperienceLetterManagement() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showSubmittedAssetsOnly, setShowSubmittedAssetsOnly] = useState(false);

    // Modal states
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showAssets, setShowAssets] = useState(false);
    const [updatePayload, setUpdatePayload] = useState({
        status: '',
        admin_remark: '',
        certificate_url: ''
    });
    const [updating, setUpdating] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);

    const formatToDDMMYYYY = (dateStr) => {
        if (!dateStr) return 'N/A';
        const s = String(dateStr).trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
            return s;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, d] = s.split('-');
            return `${d}/${m}/${y}`;
        }
        if (s.includes('/')) {
            const parts = s.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
                }
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            }
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        }
        return s;
    };

    const generateExperienceLetterPDF = async (details) => {
        // Wrapper to keep container off-screen but renderable by html2canvas
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.top = '-9999px';
        wrapper.style.left = '-9999px';
        wrapper.style.width = '794px';
        wrapper.style.height = '1123px';
        wrapper.style.overflow = 'hidden';
        wrapper.style.zIndex = '-9999';
        document.body.appendChild(wrapper);

        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.width = '794px';
        container.style.height = '1123px';
        container.style.background = '#ffffff';
        container.style.boxSizing = 'border-box';
        container.style.padding = '80px 70px 60px 70px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'space-between';
        container.style.fontFamily = "'Outfit', sans-serif";
        container.style.color = '#0f172a';
        container.style.overflow = 'hidden';
        wrapper.appendChild(container);

        const issueDateStr = details.dateOfIssue || new Date().toLocaleDateString('en-GB');
        const formattedDoj = formatToDDMMYYYY(details.doj);
        const formattedLwd = formatToDDMMYYYY(details.lwd);
        const designationUpper = String(details.designation || 'SOFTWARE ENGINEER').toUpperCase();

        container.innerHTML = `
            <div style="position: absolute; top: 0; right: 0; width: 220px; height: 220px; pointer-events: none; z-index: 1;">
                <svg viewBox="0 0 200 200" style="width: 100%; height: 100%; display: block;">
                    <polygon points="200,0 20,0 200,180" fill="#1d70b8" />
                    <polygon points="200,0 80,0 200,120" fill="#1e1b4b" />
                    <polygon points="200,0 140,0 200,60" fill="#0ea5e9" />
                </svg>
            </div>

            <div style="position: absolute; bottom: 0; left: 0; width: 220px; height: 220px; pointer-events: none; z-index: 1;">
                <svg viewBox="0 0 200 200" style="width: 100%; height: 100%; display: block;">
                    <polygon points="0,200 0,20 180,200" fill="#1d70b8" />
                    <polygon points="0,200 0,80 120,200" fill="#1e1b4b" />
                    <polygon points="0,200 0,140 60,200" fill="#0ea5e9" />
                </svg>
            </div>

            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; width: 400px; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center;">
                <img src="${logo}" style="width: 100%; height: auto;" />
            </div>

            <div style="position: relative; z-index: 10; display: flex; flex-direction: column; height: 100%; justify-content: space-between; box-sizing: border-box;">
                <div>
                    <div style="display: flex; align-items: center; margin-bottom: 45px;">
                        <img src="${logo}" style="height: 80px; object-fit: contain;" />
                    </div>

                    <div style="text-align: center; margin-bottom: 50px;">
                        <h2 style="font-size: 24px; font-weight: 800; color: #1e3a8a; text-decoration: underline; text-underline-offset: 8px; letter-spacing: 1.5px; margin: 0;">EXPERIENCE LETTER</h2>
                    </div>

                    <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 30px;">
                        Date: ${issueDateStr}
                    </div>

                    <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 35px; letter-spacing: 0.5px;">
                        TO WHOMSOEVER IT MAY CONCERN
                    </div>

                    <div style="font-size: 14px; line-height: 2.0; color: #334155; display: flex; flex-direction: column; gap: 24px; text-align: justify; font-weight: 500;">
                        <p style="margin: 0;">
                            This is to certify that <strong>${String(details.empName).toUpperCase()}</strong>, holding the position of <strong>${details.designation}</strong>, was employed with Navabharath Technologies from <strong>${formattedDoj}</strong> to <strong>${formattedLwd}</strong>.
                        </p>
                        <p style="margin: 0;">
                            During their tenure with us, <strong>${String(details.empName).toUpperCase()} was responsible for ${details.designation}</strong>.
                        </p>
                        <p style="margin: 0;">
                            They demonstrated professionalism, dedication, skills and contributed positively to the team and organization.
                        </p>
                        <p style="margin: 0;">
                            We appreciate their efforts and wish them all the best in their future endeavors.
                        </p>
                    </div>

                    <div style="margin-top: 50px; font-size: 14px;">
                        <p style="margin: 0 0 45px 0; font-weight: 700; color: #1e293b;">For Navabharath Technologies.</p>
                        <div style="margin-top: 20px; font-weight: 800; color: #1e293b; line-height: 1.4;">
                            <p style="margin: 0; font-size: 15px;">Anish V N</p>
                            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700;">PROJECT MANAGER</p>
                            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700;">NAVABHARATH TECHNOLOGIES</p>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; align-items: flex-end;">
                    <div style="display: flex; flex-direction: column; gap: 10px; border-left: 3px solid #0ea5e9; padding-left: 14px; margin-bottom: 10px; font-size: 11px; font-weight: 800; color: #475569;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 14px; height: 14px; background: #0ea5e9; border-radius: 2px;"></div>
                            <span>Phone: 0821-3128831</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 14px; height: 14px; background: #0ea5e9; border-radius: 2px;"></div>
                            <span>www.navabharathtechnologies.com</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 14px; height: 14px; background: #0ea5e9; border-radius: 2px;"></div>
                            <span>contact@navabharathtechnologies.com</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1123,
                scrollX: 0,
                scrollY: 0,
                allowTaint: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            pdf.save(`Experience_Letter_${details.empName.replace(/\s+/g, '_')}.pdf`);
        } finally {
            document.body.removeChild(wrapper);
        }
    };


    const handleDownloadCertificate = async (req) => {
        if (downloadingId) return;
        setDownloadingId(req.id);
        try {
            const token = user?.token || localStorage.getItem('token');
            const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
            const empId = req.employee_id;

            const profileRes = await fetch(`${BASE_URL}/api/employee-profile/${empId}`, {
                headers: { 'Authorization': `Bearer ${cleanToken}` }
            });

            let doj = 'N/A';
            let lwd = 'N/A';
            let empName = req.employee_name || req.name || 'Employee';
            let designation = 'Software Engineer';

            if (profileRes.ok) {
                const profileData = await profileRes.json();
                const profile = profileData.data || profileData.profile || profileData.record || profileData;
                if (profile) {
                    doj = profile.doj || profile.joining_date || profile.date_of_joining || doj;
                    lwd = profile.lwd || profile.separation || profile.last_working_day || lwd;
                    empName = profile.emp_name || profile.name || empName;
                    designation = profile.designation || designation;
                }
            }

            if (doj === 'N/A' || lwd === 'N/A') {
                const exitRes = await fetch(`${BASE_URL}/api/exit-formalities/resignation/${req.id || req.resignation_id}`, {
                    headers: { 'Authorization': `Bearer ${cleanToken}` }
                });
                if (exitRes.ok) {
                    const exitData = await exitRes.json();
                    const exit = Array.isArray(exitData) ? exitData[0] : exitData;
                    if (exit) {
                        if (doj === 'N/A') doj = exit.date_of_joining || doj;
                        if (lwd === 'N/A') lwd = exit.last_working_day || lwd;
                    }
                }
            }

            await generateExperienceLetterPDF({
                empName,
                designation,
                doj,
                lwd,
                id: empId,
                dateOfIssue: new Date().toLocaleDateString('en-GB')
            });
        } catch (err) {
            console.error("Error generating experience letter:", err);
            alert("Failed to generate PDF experience letter.");
        } finally {
            setDownloadingId(null);
        }
    };

    useEffect(() => {
        const r = String(user?.role || user?.designation || '').toLowerCase();
        const isAuthorizedUser = r.includes('pm') || r.includes('project manager') || r.includes('ceo') || r.includes('admin') || r.includes('manager') || r.includes('hr');
        if (!isAuthorizedUser) {
            navigate('/performance');
            return;
        }
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const res = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATES_ADMIN, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const result = await res.json();
                console.log('Fetched admin requests:', result);

                let actualData = [];
                if (Array.isArray(result)) {
                    actualData = result;
                } else if (result.data && Array.isArray(result.data)) {
                    actualData = result.data;
                } else if (result.certificate_requests && Array.isArray(result.certificate_requests)) {
                    actualData = result.certificate_requests;
                } else if (result.requests && Array.isArray(result.requests)) {
                    actualData = result.requests;
                }

                setRequests(actualData);
            }
        } catch (error) {
            console.error('Fetch requests error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (request) => {
        setSelectedRequest(request);
        setShowAssets(false);
        setUpdatePayload({
            status: request.status || 'Pending',
            admin_remark: request.admin_remark || '',
            certificate_url: request.certificate_url || '',
            laptop_details: request.laptop_details || '',
            mouse: request.mouse || false,
            keyboard: request.keyboard || false,
            laptop_stand: request.laptop_stand || false,
            mobile: request.mobile || false,
            earphones: request.earphones || false,
            camera: request.camera || false,
            tablet: request.tablet || false,
            storage: request.storage || false,
            notebook: request.notebook || false
        });
    };

    const quickStatusUpdate = async (id, newStatus) => {
        if (!user?.token) return;
        try {
            // Optimistically update local state immediately so badge flips right away
            setRequests(prev => prev.map(r => r.id === id ? { ...r, pm_status: newStatus } : r));
            const res = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_UPDATE(id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ pm_status: newStatus })
            });
            if (res.ok) {
                fetchRequests();
            } else {
                // Revert optimistic update on failure
                fetchRequests();
            }
        } catch (error) {
            console.error('Quick update error:', error);
            fetchRequests();
        }
    };

    const handleSaveWithStatus = async (newStatus) => {
        if (!selectedRequest || !user?.token) return;

        try {
            setUpdating(true);
            const payload = showSubmittedAssetsOnly
                ? { pm_status: newStatus }
                : { ...updatePayload, status: newStatus };
            const res = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_UPDATE(selectedRequest.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSelectedRequest(null);
                fetchRequests();
            }
        } catch (error) {
            console.error('Update Request Error:', error);
        } finally {
            setUpdating(false);
        }
    };

    const hasAssets = (req) => {
        return !!(
            req.laptop_details ||
            req.mouse ||
            req.keyboard ||
            req.laptop_stand ||
            req.mobile ||
            req.earphones ||
            req.camera ||
            req.tablet ||
            req.storage ||
            req.notebook
        );
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = (req.employee_name || req.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.purpose || req.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || req.status === filterStatus;
        const matchesAssets = !showSubmittedAssetsOnly || hasAssets(req);
        return matchesSearch && matchesFilter && matchesAssets;
    });

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', leftBorder: '#22c55e' };
            case 'pending': return { bg: '#fffbeb', text: '#d97706', border: '#fef3c7', leftBorder: '#f59e0b' };
            case 'rejected': return { bg: '#fef2f2', text: '#dc2626', border: '#fee2e2', leftBorder: '#ef4444' };
            default: return { bg: '#fffbeb', text: '#d97706', border: '#fef3c7', leftBorder: '#f59e0b' };
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
            <AppHeader />

            <main style={{ flex: 1, padding: '100px 30px 40px', maxWidth: '100%', margin: '0 auto', width: '100%', fontFamily: "'Outfit', sans-serif" }}>
                <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: 'white',
                                border: 'none',
                                width: '45px',
                                height: '45px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <ArrowLeft size={20} color="#0f172a" />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Experience Letter History</h1>
                            <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0', fontWeight: '500' }}>View applied experience letter requests</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={() => setShowSubmittedAssetsOnly(!showSubmittedAssetsOnly)}
                            style={{
                                background: showSubmittedAssetsOnly ? '#0ea5e9' : 'white',
                                color: showSubmittedAssetsOnly ? 'white' : '#0ea5e9',
                                border: '2px solid #0ea5e9',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontWeight: '800',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s'
                            }}
                        >
                            <Package size={16} />
                            Submitted Assets
                        </button>

                        <div style={{ background: '#f0f9ff', padding: '8px 16px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} color="#0369a1" />
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0369a1' }}>
                                {requests.filter(r => r.status === 'Pending').length} Pending
                            </span>
                        </div>
                    </div>
                </header>

                <section style={{ background: 'transparent', padding: '0', border: 'none', boxShadow: 'none' }}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
                            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="Search by name or reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '14px', border: '1.5px solid #cbd5e1', outline: 'none', transition: '0.2s', fontSize: '14px', fontWeight: '600', background: 'white' }}
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ padding: '0 20px', borderRadius: '14px', border: '1.5px solid #cbd5e1', outline: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', background: 'white' }}
                        >
                            <option>All</option>
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '15px', fontWeight: '600', background: 'white', borderRadius: '24px' }}>Loading certificate requests...</div>
                    ) : filteredRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: '15px', fontWeight: '600', background: 'white', borderRadius: '24px', border: '1px solid #cbd5e1' }}>No requests found.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {filteredRequests.map(req => {
                                const pmStatus = req.pm_status || req.status || 'Pending';
                                const pmStatusStyle = getStatusColor(pmStatus);
                                const isBothApproved = (req.status || '').toLowerCase() === 'approved' || (req.pm_status || '').toLowerCase() === 'approved';
                                const downloadUrl = req.certificate_url || req.file_path;

                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => handleOpenReview(req)}
                                        style={{
                                            borderRadius: '20px',
                                            background: 'white',
                                            padding: '20px',
                                            cursor: 'pointer',
                                            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
                                            borderLeft: `6px solid ${pmStatusStyle.leftBorder || pmStatusStyle.text}`
                                        }}
                                        onMouseOver={e => {
                                            e.currentTarget.style.transform = 'translateY(-5px)';
                                            e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.08)';
                                        }}
                                        onMouseOut={e => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.03)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                                                    {showSubmittedAssetsOnly ? 'Asset Declaration' : (req.purpose || req.reason || 'Service Certificate')}
                                                </h3>
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                                    Req #{String(req.id).padStart(4, '0')}
                                                </span>
                                            </div>
                                            <span style={{
                                                background: pmStatusStyle.bg,
                                                color: pmStatusStyle.text,
                                                border: `1.5px solid ${pmStatusStyle.border}`,
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                textTransform: 'capitalize'
                                            }}>
                                                {pmStatus}
                                            </span>
                                        </div>

                                        <div style={{
                                            background: '#f8fafc',
                                            borderRadius: '16px',
                                            padding: '12px 16px',
                                            margin: '16px 0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: '#e2e8f0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <FileText size={18} color="#64748b" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
                                                    {req.employee_name || req.name || 'User'}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                                                    ID: {cleanEmpId(req.employee_id)}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: 'white',
                                                border: '1.5px solid #e2e8f0',
                                                borderRadius: '8px',
                                                padding: '4px 10px'
                                            }}>
                                                <Clock size={13} color="#64748b" />
                                                <span style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>
                                                    {formatDate(req.created_at || req.date)}
                                                </span>
                                            </div>
                                            {(() => {
                                                const canDownload = isBothApproved;
                                                return (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (canDownload) handleDownloadCertificate(req); }}
                                                        disabled={!canDownload || downloadingId === req.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: canDownload ? '#0f172a' : '#e2e8f0',
                                                            color: canDownload ? 'white' : '#94a3b8',
                                                            borderRadius: '8px',
                                                            width: '28px',
                                                            height: '28px',
                                                            cursor: canDownload ? 'pointer' : 'not-allowed',
                                                            border: 'none',
                                                            transition: 'background-color 0.2s',
                                                            boxShadow: canDownload ? '0 4px 10px rgba(15,23,42,0.15)' : 'none'
                                                        }}
                                                        onMouseOver={e => { if (canDownload) e.currentTarget.style.backgroundColor = '#1e293b'; }}
                                                        onMouseOut={e => { if (canDownload) e.currentTarget.style.backgroundColor = '#0f172a'; }}
                                                        title={canDownload ? 'Download Experience Letter' : 'Available once approved'}
                                                    >
                                                        {downloadingId === req.id ? (
                                                            <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                        ) : (
                                                            <Download size={14} />
                                                        )}
                                                    </button>
                                                );
                                            })()}
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
                {selectedRequest && (() => {
                    const pmStatus = selectedRequest.pm_status || selectedRequest.status || 'Pending';
                    const pmStatusStyle = getStatusColor(pmStatus);
                    const isBothApproved = (selectedRequest.status || '').toLowerCase() === 'approved' && (selectedRequest.pm_status || '').toLowerCase() === 'approved';

                    if (showSubmittedAssetsOnly) {
                        return (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    style={{
                                        background: 'white',
                                        borderRadius: '28px',
                                        width: '100%',
                                        maxWidth: '650px',
                                        position: 'relative',
                                        boxShadow: '0 30px 60px rgba(15, 23, 42, 0.25)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Header Section */}
                                    <div style={{
                                        padding: '24px',
                                        borderBottom: '1.5px solid #f1f5f9',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1.5px solid #cbd5e1' }}>
                                                <img
                                                    src={`${API_ENDPOINTS.USERS}/${cleanEmpId(selectedRequest.employee_id)}/photo`}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                                />
                                                <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#3b82f6', fontWeight: '800', fontSize: '18px' }}>
                                                    {(selectedRequest.employee_name || selectedRequest.name || 'U').charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', letterSpacing: '-0.5px' }}>
                                                    Asset Declaration
                                                </h2>
                                                <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 }}>
                                                    {selectedRequest.employee_name || selectedRequest.name || 'Employee'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedRequest(null)}
                                            style={{
                                                background: '#f1f5f9',
                                                border: 'none',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Body Section */}
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '65vh' }}>
                                        {/* Laptop Details Section */}
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.8px', marginBottom: '10px', textTransform: 'uppercase' }}>
                                                Laptop Details & Serial Number
                                            </div>
                                            {(() => {
                                                let modelName = selectedRequest.laptop_details || 'Laptop / Workstation';
                                                let serialNo = selectedRequest.serial_number || '';

                                                if (!serialNo) {
                                                    // extract serial number if in laptop_details
                                                    const snMatch = modelName.match(/(?:s\/n|serial\s*no|serial|sn)[:\s]+([a-z0-9-]+)/i);
                                                    if (snMatch) {
                                                        serialNo = snMatch[1];
                                                        modelName = modelName.replace(/(?:s\/n|serial\s*no|serial|sn)[:\s]+[a-z0-9-]+/i, '').replace(/[,;:\s]+$/, '').trim();
                                                    }
                                                }
                                                return (
                                                    <div style={{
                                                        background: '#f0f9ff',
                                                        borderRadius: '16px',
                                                        padding: '20px 24px',
                                                        border: '1px solid #bae6fd'
                                                    }}>
                                                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0369a1', marginBottom: '6px' }}>
                                                            {modelName}
                                                        </div>
                                                        <div style={{ fontSize: '14px', fontWeight: '750', color: '#0ea5e9' }}>
                                                            S/N: {serialNo || 'N/A'}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Hardware Peripherals Verified Section */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '16px' }}>
                                                <CheckCircle size={18} color="#10b981" />
                                                <span>Hardware Peripherals Verified</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                                                {[
                                                    { id: 'mouse', label: 'Optical Mouse', val: selectedRequest.mouse },
                                                    { id: 'keyboard', label: 'External Keyboard', val: selectedRequest.keyboard },
                                                    { id: 'laptop_stand', label: 'Laptop Stand', val: selectedRequest.laptop_stand },
                                                    { id: 'company_mobile', label: 'Company Mobile', val: selectedRequest.company_mobile || selectedRequest.mobile },
                                                    { id: 'earphone_headphone', label: 'Earphones', val: selectedRequest.earphone_headphone || selectedRequest.earphones },
                                                    { id: 'external_camera', label: 'External Camera', val: selectedRequest.external_camera || selectedRequest.camera },
                                                    { id: 'tablet', label: 'Tablet', val: selectedRequest.tablet },
                                                    { id: 'pendrive', label: 'Pendrive / Storage', val: selectedRequest.pendrive || selectedRequest.storage },
                                                    { id: 'ref_pad', label: 'Ref Pad / Notebook', val: selectedRequest.ref_pad || selectedRequest.notebook },
                                                ].filter(item => item.val === true || item.val === 'Yes' || item.val === 1 || item.val === '1' || item.val === 'true')
                                                    .map(item => (
                                                        <div
                                                            key={item.id}
                                                            style={{
                                                                background: '#ecfdf5',
                                                                border: '1.5px solid #a7f3d0',
                                                                padding: '18px 12px',
                                                                borderRadius: '16px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.03)'
                                                            }}
                                                        >
                                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                                <Check size={14} strokeWidth={4} />
                                                            </div>
                                                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#065f46', textAlign: 'center', lineHeight: '1.3' }}>
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                {[
                                                    { id: 'mouse', val: selectedRequest.mouse },
                                                    { id: 'keyboard', val: selectedRequest.keyboard },
                                                    { id: 'laptop_stand', val: selectedRequest.laptop_stand },
                                                    { id: 'company_mobile', val: selectedRequest.company_mobile || selectedRequest.mobile },
                                                    { id: 'earphone_headphone', val: selectedRequest.earphone_headphone || selectedRequest.earphones },
                                                    { id: 'external_camera', val: selectedRequest.external_camera || selectedRequest.camera },
                                                    { id: 'tablet', val: selectedRequest.tablet },
                                                    { id: 'pendrive', val: selectedRequest.pendrive || selectedRequest.storage },
                                                    { id: 'ref_pad', val: selectedRequest.ref_pad || selectedRequest.notebook },
                                                ].filter(item => item.val === true || item.val === 'Yes' || item.val === 1 || item.val === '1' || item.val === 'true').length === 0 && (
                                                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600', padding: '20px 0', border: '1.5px dashed #cbd5e1', borderRadius: '16px' }}>
                                                            No peripherals submitted
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons Footer */}
                                    {(() => {
                                        const isDecided = pmStatus.toLowerCase() !== 'pending';
                                        return (
                                            <div style={{ padding: '24px', borderTop: '1.5px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '15px' }}>
                                                <button
                                                    onClick={() => !isDecided && handleSaveWithStatus('Rejected')}
                                                    disabled={updating || isDecided}
                                                    style={{
                                                        background: isDecided ? '#f8fafc' : 'white',
                                                        color: isDecided ? '#94a3b8' : '#ef4444',
                                                        border: isDecided ? '2px solid #e2e8f0' : '2px solid #ef4444',
                                                        padding: '14px',
                                                        borderRadius: '30px',
                                                        fontWeight: '800',
                                                        fontSize: '16px',
                                                        cursor: isDecided ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        opacity: isDecided ? 0.7 : 1
                                                    }}
                                                    onMouseOver={e => { if (!isDecided) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                                    onMouseOut={e => { if (!isDecided) { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                                >
                                                    {updating ? 'Rejecting...' : isDecided && pmStatus.toLowerCase() === 'rejected' ? 'Rejected' : 'Reject Submission'}
                                                </button>
                                                <button
                                                    onClick={() => !isDecided && handleSaveWithStatus('Approved')}
                                                    disabled={updating || isDecided}
                                                    style={{
                                                        background: isDecided ? '#f1f5f9' : '#10b981',
                                                        color: isDecided ? '#94a3b8' : 'white',
                                                        padding: '14px',
                                                        borderRadius: '30px',
                                                        border: 'none',
                                                        fontWeight: '800',
                                                        fontSize: '16px',
                                                        cursor: isDecided ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        boxShadow: isDecided ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)',
                                                        transition: 'all 0.2s',
                                                        opacity: isDecided ? 0.7 : 1
                                                    }}
                                                    onMouseOver={e => { if (!isDecided) { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                                    onMouseOut={e => { if (!isDecided) { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                                >
                                                    <CheckCircle size={18} color={isDecided ? '#94a3b8' : 'white'} />
                                                    {updating ? 'Approving...' : isDecided && pmStatus.toLowerCase() === 'approved' ? 'Approved' : 'Approve Declaration'}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </motion.div>
                            </div>
                        );
                    }

                    // Otherwise, render standard Service Certificate Modal
                    return (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                style={{
                                    background: 'white',
                                    borderRadius: '28px',
                                    width: '100%',
                                    maxWidth: '520px',
                                    position: 'relative',
                                    boxShadow: '0 30px 60px rgba(15, 23, 42, 0.25)',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Dark Top Section */}
                                <div style={{
                                    background: '#1e293b',
                                    padding: '30px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    position: 'relative'
                                }}>
                                    <button
                                        onClick={() => setSelectedRequest(null)}
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            right: '20px',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            border: 'none',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}
                                    >
                                        <X size={16} />
                                    </button>

                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        borderRadius: '16px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '16px'
                                    }}>
                                        <FileText size={28} color="white" />
                                    </div>

                                    <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                                        Service Certificate
                                    </h2>
                                    <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600', margin: 0 }}>
                                        Request ID: #{selectedRequest.id}
                                    </p>
                                </div>

                                {/* White Bottom Section */}
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '65vh' }}>

                                    {/* Request Date & Status Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                Request Date
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                                                {formatDate(selectedRequest.created_at || selectedRequest.date)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                Status
                                            </div>
                                            <span style={{
                                                background: pmStatusStyle.bg,
                                                color: pmStatusStyle.text,
                                                border: `1.5px solid ${pmStatusStyle.border}`,
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                textTransform: 'capitalize',
                                                display: 'inline-block'
                                            }}>
                                                {pmStatus}
                                            </span>
                                        </div>
                                    </div>

                                    {/* PM Status & HR Status Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                PM Status
                                            </div>
                                            {(() => {
                                                const ps = (selectedRequest.pm_status || 'Pending').toLowerCase();
                                                const c = ps === 'approved' ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' } : ps === 'rejected' ? { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' } : { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
                                                return <span style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'capitalize', display: 'inline-block' }}>{selectedRequest.pm_status || 'Pending'}</span>;
                                            })()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                                HR Status
                                            </div>
                                            {(() => {
                                                const hs = (selectedRequest.status || 'Pending').toLowerCase();
                                                const c = hs === 'approved' ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' } : hs === 'rejected' ? { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' } : { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
                                                return <span style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'capitalize', display: 'inline-block' }}>{selectedRequest.status || 'Pending'}</span>;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Purpose of Verification Row */}
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                            Purpose of Verification
                                        </div>
                                        <div style={{
                                            background: '#f8fafc',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            border: '1px solid #f1f5f9',
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: '#1e293b'
                                        }}>
                                            {selectedRequest.purpose || selectedRequest.reason || 'Not Specified'}
                                        </div>
                                    </div>

                                    {/* HR Admin Remarks Row */}
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px', marginBottom: '6px', textTransform: 'uppercase' }}>
                                            PM Admin Remarks
                                        </div>
                                        <textarea
                                            placeholder="Enter internal notes or feedback..."
                                            value={updatePayload.admin_remark}
                                            onChange={(e) => setUpdatePayload(prev => ({ ...prev, admin_remark: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                border: '1.5px solid #cbd5e1',
                                                outline: 'none',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                minHeight: '80px',
                                                background: '#f8fafc',
                                                resize: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Approve & Reject Action Buttons Row / Download Button */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '5px' }}>
                                        {(() => {
                                            const isEitherApproved = (selectedRequest.status || '').toLowerCase() === 'approved' || (selectedRequest.pm_status || '').toLowerCase() === 'approved';
                                            return isEitherApproved ? (
                                            <button
                                                onClick={() => handleDownloadCertificate(selectedRequest)}
                                                disabled={downloadingId === selectedRequest.id}
                                                style={{
                                                    width: '100%',
                                                    padding: '14px',
                                                    borderRadius: '14px',
                                                    border: 'none',
                                                    background: '#0f172a',
                                                    color: 'white',
                                                    fontWeight: '800',
                                                    fontSize: '16px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                                                    transition: '0.2s'
                                                }}
                                            >
                                                {downloadingId === selectedRequest.id ? (
                                                    <>
                                                        <div style={{ width: '18px', height: '18px', border: '3px solid white', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                        Generating PDF...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download size={18} /> Download official PDF
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <button
                                                    onClick={() => handleSaveWithStatus('Approved')}
                                                    disabled={updating}
                                                    style={{
                                                        background: '#10b981',
                                                        color: 'white',
                                                        padding: '14px',
                                                        borderRadius: '14px',
                                                        border: 'none',
                                                        fontWeight: '800',
                                                        fontSize: '16px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                                        transition: '0.2s'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    {updating ? 'Saving...' : 'Approve'}
                                                </button>
                                                <button
                                                    onClick={() => handleSaveWithStatus('Rejected')}
                                                    disabled={updating}
                                                    style={{
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        padding: '14px',
                                                        borderRadius: '14px',
                                                        border: 'none',
                                                        fontWeight: '800',
                                                        fontSize: '16px',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                                                        transition: '0.2s'
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    {updating ? 'Saving...' : 'Reject'}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

            <AppFooter />

            <style>{`
                tr:hover td {
                    background: #f1f5f9 !important;
                }
                table {
                    border-collapse: separate;
                    border-spacing: 0 10px;
                }
                td {
                    border-top: 1px solid #f1f5f9;
                    border-bottom: 1px solid #f1f5f9;
                }
                td:first-child {
                    border-left: 1px solid #f1f5f9;
                }
                td:last-child {
                    border-right: 1px solid #f1f5f9;
                }
            `}</style>
        </div>
    );
}
