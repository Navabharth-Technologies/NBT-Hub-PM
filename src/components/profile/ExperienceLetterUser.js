import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../../assets/logo.png';
import {
    ArrowLeft, Send, FileText,
    CheckCircle, Clock, Info, Check, Package, X,
    ChevronDown, ShieldCheck, AlertCircle, Download
} from 'lucide-react';

export default function ExperienceLetterUser() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [winWidth, setWinWidth] = useState(window.innerWidth);
    const [resignationStatus, setResignationStatus] = useState(null);
    const [isExitCompleted, setIsExitCompleted] = useState(false);
    const [checkingResignation, setCheckingResignation] = useState(true);
    const [showEntrancePopup, setShowEntrancePopup] = useState(false);

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Custom centered popup (replaces native alert)
    const [popup, setPopup] = useState(null); // { msg, type: 'success'|'error' }
    const showPopup = (msg, type = 'success') => setPopup({ msg, type });
    const closePopup = () => setPopup(null);
    const [downloadingId, setDownloadingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        purpose: '',
        other_purpose: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Mapping the DB columns to UI Labels
    const hardwareItems = [
        { label: 'Optical Mouse', key: 'mouse' },
        { label: 'External Keyboard', key: 'keyboard' },
        { label: 'Laptop Stand', key: 'laptop_stand' },
        { label: 'Company Mobile', key: 'company_mobile' },
        { label: 'Earphones', key: 'earphone_headphone' },
        { label: 'External Camera', key: 'external_camera' },
        { label: 'Tablet', key: 'tablet' },
        { label: 'Pendrive / Storage', key: 'pendrive' },
        { label: 'Ref Pad / Notebook', key: 'ref_pad' },
    ];

    const [assetData, setAssetData] = useState({
        mouse: 0, keyboard: 0, laptop_stand: 0, company_mobile: 0,
        earphone_headphone: 0, external_camera: 0, tablet: 0,
        pendrive: 0, ref_pad: 0
    });

    const toggleAsset = (key) => {
        setAssetData(prev => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));
    };

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchMyRequests();
    }, [user]);

    useEffect(() => {
        const checkResignationAndExit = async () => {
            try {
                const token = localStorage.getItem('token') || user?.token;
                const cleanToken = (token && token !== 'undefined' && token !== 'null') ? token.replace(/['"]+/g, '').trim() : '';

                const url = `${BASE_URL}/api/resignations/my`;
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${cleanToken}` }
                });

                if (res.ok) {
                    const raw = await res.json();
                    let data = Array.isArray(raw) ? raw : (raw.data || raw.value || []);

                    const activeRes = data.find(r => (r.status || '').toUpperCase() !== 'REVOKED') || data[0];
                    if (activeRes) {
                        const statusUpper = (activeRes.status || '').toUpperCase();
                        setResignationStatus(statusUpper);
                        if (statusUpper !== 'APPROVED') {
                            setShowEntrancePopup(true);
                        }

                        const exitRes = await fetch(`${BASE_URL}/api/exit-formalities/resignation/${activeRes.id}`, {
                            headers: { 'Authorization': `Bearer ${cleanToken}` }
                        });
                        if (exitRes.ok) {
                            const exitData = await exitRes.json();
                            if (exitData && (exitData.id || (Array.isArray(exitData) && exitData.length > 0))) {
                                setIsExitCompleted(true);
                            } else {
                                setIsExitCompleted(false);
                            }
                        } else {
                            setIsExitCompleted(false);
                        }
                    } else {
                        setResignationStatus(null);
                        setIsExitCompleted(false);
                        setShowEntrancePopup(true);
                    }
                } else {
                    setResignationStatus(null);
                    setIsExitCompleted(false);
                    setShowEntrancePopup(true);
                }
            } catch (err) {
                console.warn("Error checking resignation & exit status:", err);
            } finally {
                setCheckingResignation(false);
            }
        };
        if (user) {
            checkResignationAndExit();
        }
    }, [user]);

    const fetchMyRequests = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const res = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_MY, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(Array.isArray(data) ? data : []);
            }
        } catch (error) { console.error('Fetch error:', error); }
        finally { setLoading(false); }
    };

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
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
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
        container.style.zIndex = '-9999';
        container.style.opacity = '1';

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
                            <div style="width: 14px; height: 14px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; border-radius: 2px; font-size: 8px;">📞</div>
                            <span>Phone: 0821-3128831</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 14px; height: 14px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; border-radius: 2px; font-size: 8px;">🌐</div>
                            <span>www.navabharathtechnologies.com</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 14px; height: 14px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; border-radius: 2px; font-size: 8px;">✉️</div>
                            <span>contact@navabharathtechnologies.com</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        try {
            const canvas = await html2canvas(container, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 794,
                height: 1123,
                scrollX: 0,
                scrollY: 0
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
            document.body.removeChild(container);
        }
    };

    const handleDownloadCertificate = async (req) => {
        if (downloadingId) return;
        setDownloadingId(req.id);
        try {
            const token = user?.token || localStorage.getItem('token');
            const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
            const empId = req.employee_id || user?.employee_id || user?.id;

            const profileRes = await fetch(`${BASE_URL}/api/employee-profile/${empId}`, {
                headers: { 'Authorization': `Bearer ${cleanToken}` }
            });

            let doj = 'N/A';
            let lwd = 'N/A';
            let empName = req.employee_name || req.name || user?.name || 'Employee';
            let designation = user?.designation || 'Software Engineer';

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

    const handleViewDetails = async (id) => {
        if (!user?.token) return;
        try {
            const res = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_SINGLE(id), {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedRequest(data);
                setShowDetailsModal(true);
            }
        } catch (error) { console.error('Fetch detail error:', error); }
    };

    const handleFormSubmit = async () => {
        const finalPurpose = formData.purpose === 'Other' ? formData.other_purpose : formData.purpose;
        if (!finalPurpose || !user?.token) {
            showPopup('Please select a purpose for your request.', 'error');
            return;
        }
        try {
            setSubmitting(true);
            const res = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_REQUEST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    employee_id: user.id || user.employee_id,
                    employee_name: user.name,
                    purpose: finalPurpose,
                    status: 'Pending',
                    laptop_details: formData.laptop_details,
                    serial_number: formData.serial_number,
                    ...assetData
                })
            });
            if (res.ok) {
                showPopup('Application submitted successfully! ✅', 'success');
                setFormData({ purpose: '', other_purpose: '' });
                fetchMyRequests();
            } else {
                showPopup('Submission failed. Please try again.', 'error');
            }
        } catch (error) { console.error('Submit error:', error); }
        finally { setSubmitting(false); }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            <AppHeader />

            {/* ── Custom Centered Popup Modal ── */}
            {popup && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)',
                    zIndex: 99999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '28px', padding: '40px 36px',
                        maxWidth: '420px', width: '100%', textAlign: 'center',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
                        animation: 'popupIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards'
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            margin: '0 auto 20px',
                            background: popup.type === 'success' ? '#f0fdf4' : '#fff1f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {popup.type === 'success'
                                ? <CheckCircle size={32} color="#22c55e" />
                                : <AlertCircle size={32} color="#ef4444" />}
                        </div>
                        <p style={{
                            fontSize: '16px', fontWeight: '800', color: '#0f172a',
                            margin: '0 0 28px', lineHeight: '1.5'
                        }}>{popup.msg}</p>
                        <button
                            onClick={closePopup}
                            style={{
                                padding: '14px 48px', borderRadius: '16px', border: 'none',
                                background: popup.type === 'success' ? '#0f172a' : '#ef4444',
                                color: 'white', fontWeight: '900', fontSize: '15px',
                                cursor: 'pointer', fontFamily: 'inherit',
                                boxShadow: popup.type === 'success'
                                    ? '0 8px 20px rgba(15,23,42,0.2)'
                                    : '0 8px 20px rgba(239,68,68,0.25)'
                            }}
                        >OK</button>
                    </div>
                </div>
            )}

            <main style={{ flex: 1, padding: winWidth < 768 ? '100px 15px 120px' : '100px 26px 40px', maxWidth: '100%', margin: '0 auto', width: '100%' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: winWidth < 768 ? '25px' : '40px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={18} color="#64748b" />
                    </button>
                    <div>
                        <h1 style={{ fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#0f172a', margin: 0 }}>Experience Letter</h1>
                        <p style={{ color: '#64748b', fontSize: winWidth < 768 ? '12px' : '14px', margin: '4px 0 0', fontWeight: '500' }}>Request official service certificate</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? '1fr' : 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: winWidth < 768 ? '20px' : '40px' }}>
                    {/* Left Column: Form */}
                    <div className="animate-fade-in" style={{ backgroundColor: 'white', borderRadius: '24px', padding: winWidth < 768 ? '25px 20px' : '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '30px' }}>
                            <FileText color="#0f172a" size={20} />
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Service Certificate Application</h2>
                        </div>

                        {checkingResignation ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                <div style={{ width: '24px', height: '24px', border: '3px solid #64748b40', borderTop: '3px solid #64748b', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }}></div>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>Checking clearance status...</div>
                            </div>
                        ) : (resignationStatus !== 'APPROVED' || !isExitCompleted) ? (
                            <div style={{
                                padding: '30px',
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                                borderRadius: '20px',
                                border: '1.5px solid #fca5a5',
                                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.03)',
                                color: '#b91c1c'
                            }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#dc2626' }}>
                                    <AlertCircle size={28} />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#991b1b', marginBottom: '8px' }}>Request Locked</h3>
                                <p style={{ fontSize: '13px', color: '#991b1b90', lineHeight: '1.5', margin: 0, fontWeight: '600' }}>
                                    Experience letter requests are only available after your resignation is approved by TL, PM, and HR, and exit formalities are fully completed.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '30px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Purpose of Request</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={formData.purpose}
                                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                            style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '14px', cursor: 'pointer', outline: 'none', appearance: 'none' }}
                                        >
                                            <option value="">Select Purpose</option>
                                            <option value="" disabled>Select Purpose</option>
                                            <option value="Higher Education">Higher Education</option>
                                            <option value="New Job Opportunity">New Job Opportunity</option>
                                            <option value="Personal Reasons">Personal Reasons</option>
                                            <option value="Other">Other (Specify below)</option>
                                        </select>
                                        <ChevronDown size={18} color="#94a3b8" style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    </div>
                                </div>

                                {formData.purpose === 'Other' && (
                                    <div className="animate-slide-up" style={{ marginBottom: '30px' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Specify Other Purpose</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your specific reason..."
                                            value={formData.other_purpose}
                                            onChange={(e) => setFormData({ ...formData, other_purpose: e.target.value })}
                                            style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '14px', outline: 'none' }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', background: '#f8fafc', padding: '24px', borderRadius: '20px', marginBottom: '30px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Position</label>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{user?.designation || 'Lead Software Engineer'}</p>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Employee ID</label>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{user?.id || user?.employee_id || '20251'}</p>
                                    </div>
                                </div>

                                {/* Professional Asset Declaration Section */}
                                <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '30px', padding: winWidth < 768 ? '20px' : '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '40px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                                        <Package size={22} color="#3163aa" />
                                        <h3 style={{ fontSize: winWidth < 768 ? '16px' : '18px', fontWeight: '950', color: '#1e293b', margin: 0 }}>Professional Asset Declaration</h3>
                                    </div>
                                    <p style={{ fontSize: winWidth < 768 ? '11px' : '12px', color: '#94a3b8', margin: winWidth < 768 ? '0 0 20px 0' : '0 0 25px 37px', fontWeight: '600' }}>Declare your company-provided hardware details for official records.</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr' : '1.5fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Laptop Brand / Model</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. RedmiBook 15 Pro, 8GB/256GB"
                                                value={formData.laptop_details || ''}
                                                onChange={(e) => setFormData({ ...formData, laptop_details: e.target.value })}
                                                style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Serial Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. PF5P6L2E"
                                                value={formData.serial_number || ''}
                                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                                style={{ width: '100%', padding: '16px 20px', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', color: '#0f172a', fontWeight: '700', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{ color: '#22c55e' }}><ShieldCheck size={20} /></div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Hardware Peripherals Submission</h4>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 480 ? 'repeat(2, 1fr)' : winWidth < 768 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: '12px' }}>
                                        {hardwareItems.map((item, idx) => (
                                            <div key={idx}
                                                onClick={() => toggleAsset(item.key)}
                                                style={{
                                                    background: assetData?.[item.key] ? '#f0fdf4' : '#f8fafc',
                                                    border: assetData?.[item.key] ? '1.5px solid #bbf7d0' : '1.5px solid #f1f5f9',
                                                    borderRadius: '16px', padding: winWidth < 768 ? '12px 5px' : '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                                                    cursor: 'pointer', transition: '0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: winWidth < 768 ? '28px' : '32px', height: winWidth < 768 ? '28px' : '32px', borderRadius: '50%',
                                                    background: assetData?.[item.key] ? '#22c55e' : '#f1f5f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {assetData?.[item.key] ? <Check size={16} color="white" /> : <Package size={16} color="#cbd5e1" />}
                                                </div>
                                                <span style={{ fontSize: winWidth < 768 ? '9px' : '10px', fontWeight: '800', color: assetData?.[item.key] ? '#166534' : '#94a3b8', textAlign: 'center' }}>
                                                    {item.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleFormSubmit}
                                    disabled={submitting}
                                    style={{
                                        width: '100%', padding: '20px', borderRadius: '24px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '900', fontSize: '16px', cursor: 'pointer',
                                        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    <Send size={18} /> {submitting ? 'Submitting Application...' : 'Submit Official Application'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Right Column: Guidelines & History */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Guidelines */}
                        <div className="animate-fade-in" style={{ backgroundColor: 'white', borderRadius: '24px', padding: '30px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                                <ShieldCheck color="#22c55e" size={20} />
                                <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Guidelines</h3>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    'Standard processing time is 3-5 working days.',
                                    'Certificates will be issued in digital (PDF) format.',
                                    'Tenure must be at least 6 months for experience letters.',
                                    'Management approval is required for all requests.'
                                ].map((item, i) => (
                                    <li key={i} style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', lineHeight: '1.4' }}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Request History */}
                        <div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                                <Clock color="#0f172a" size={18} />
                                <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Request History</h3>
                            </div>

                            {loading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', gap: '12px' }}>
                                    <Clock className="animate-spin" size={24} color="#94a3b8" />
                                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>Loading history...</p>
                                </div>
                            ) : requests.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
                                    <AlertCircle size={30} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>No previous applications found.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {requests.map((req, i) => {
                                        const isEitherApproved = (req.status || '').toLowerCase() === 'approved' || (req.pm_status || '').toLowerCase() === 'approved';
                                        const downloadUrl = req.certificate_url || req.file_path;
                                        return (
                                            <div key={i}
                                                onClick={() => handleViewDetails(req.id)}
                                                style={{ padding: '16px 20px', background: 'white', borderRadius: '18px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: '0.2s' }}
                                            >
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>{req.purpose}</p>
                                                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Applied on {new Date(req.created_at || Date.now()).toLocaleDateString()}</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '9px', fontWeight: '950', padding: '4px 10px', borderRadius: '8px', background: req.status === 'Approved' ? '#dcfce7' : '#fffbeb', color: req.status === 'Approved' ? '#15803d' : '#b45309', textTransform: 'uppercase' }}>{req.status}</span>
                                                    {isEitherApproved && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadCertificate(req); }}
                                                            disabled={downloadingId === req.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                background: '#0f172a',
                                                                color: 'white',
                                                                borderRadius: '8px',
                                                                width: '28px',
                                                                height: '28px',
                                                                cursor: 'pointer',
                                                                border: 'none',
                                                                transition: 'background-color 0.2s'
                                                            }}
                                                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                                                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                                                            title="Download Experience Letter"
                                                        >
                                                            {downloadingId === req.id ? (
                                                                <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                            ) : (
                                                                <Download size={14} />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="animate-slide-up" style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '40px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.3)' }}>

                        {/* Header */}
                        <div style={{ padding: '30px 40px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '22px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(49, 99, 170, 0.08)' }}>
                                    <Package size={28} color="#3163aa" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>Professional Asset Declaration</h2>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0', fontWeight: '600' }}>Your asset audit is complete. These details are now part of your official record.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailsModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '40px', overflowY: 'auto', flex: 1, background: '#fcfdfe' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
                                {/* PM Status & HR Status Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px 16px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>PM Status</div>
                                        {(() => {
                                            const ps = (selectedRequest.pm_status || 'Pending').toLowerCase();
                                            const c = ps === 'approved' ? { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' } : ps === 'rejected' ? { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' } : { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
                                            return <span style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'capitalize', display: 'inline-block' }}>{selectedRequest.pm_status || 'Pending'}</span>;
                                        })()}
                                    </div>
                                    <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px 16px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>HR Status</div>
                                        {(() => {
                                            const hs = (selectedRequest.status || 'Pending').toLowerCase();
                                            const c = hs === 'approved' ? { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' } : hs === 'rejected' ? { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' } : { bg: '#fef3c7', text: '#d97706', border: '#fde68a' };
                                            return <span style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'capitalize', display: 'inline-block' }}>{selectedRequest.status || 'Pending'}</span>;
                                        })()}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr' : '1.5fr 1fr', gap: '25px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Laptop Brand / Model</label>
                                        <div style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '18px', padding: '18px 25px', fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '800', color: '#334155' }}>
                                            {selectedRequest.laptop_details || 'RedmiBook 15 Pro, 8GB/256GB Serial No: NACharger: 08KD'}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Serial Number</label>
                                        <div style={{ background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '18px', padding: '18px 25px', fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '700', color: '#94a3b8' }}>
                                            {selectedRequest.serial_number || 'PF5P6L2E'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '30px', padding: winWidth < 768 ? '20px' : '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                        <div style={{ color: '#22c55e' }}><ShieldCheck size={22} /></div>
                                        <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Hardware Peripherals Verified</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 480 ? 'repeat(2, 1fr)' : winWidth < 768 ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: '15px' }}>
                                        {hardwareItems.map((item, idx) => (
                                            <div key={idx} style={{
                                                background: selectedRequest?.[item.key] ? '#f0fdf4' : '#f8fafc',
                                                border: selectedRequest?.[item.key] ? '1.5px solid #bbf7d0' : '1.5px solid #f1f5f9',
                                                borderRadius: '20px', padding: winWidth < 768 ? '15px 5px' : '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                                opacity: selectedRequest?.[item.key] ? 1 : 0.6
                                            }}>
                                                <div style={{
                                                    width: winWidth < 768 ? '30px' : '36px', height: winWidth < 768 ? '30px' : '36px', borderRadius: '50%',
                                                    background: selectedRequest?.[item.key] ? '#22c55e' : '#f1f5f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {selectedRequest?.[item.key] ? <Check size={18} color="white" /> : <Package size={18} color="#cbd5e1" />}
                                                </div>
                                                <span style={{ fontSize: winWidth < 768 ? '9px' : '11px', fontWeight: '800', color: selectedRequest?.[item.key] ? '#166534' : '#94a3b8', textAlign: 'center' }}>
                                                    {item.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '30px 40px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                style={{
                                    width: '100%', padding: '20px', borderRadius: '24px', border: 'none', background: '#94a3b8', color: 'white', fontWeight: '900', fontSize: '16px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: '0.2s', boxShadow: '0 8px 20px rgba(148, 163, 184, 0.25)'
                                }}
                            >
                                <ShieldCheck size={20} /> Update Hardware Declaration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AppFooter />

            {/* Entrance Warning Modal */}
            <AnimatePresence>
                {showEntrancePopup && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            style={{
                                background: 'white', borderRadius: '28px', padding: '40px 30px',
                                maxWidth: '480px', width: '100%', textAlign: 'center',
                                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                                border: '1px solid #f1f5f9',
                                display: 'flex', flexDirection: 'column', alignItems: 'center'
                            }}
                        >
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                backgroundColor: '#fee2e2', color: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '24px'
                            }}>
                                <AlertCircle size={32} />
                            </div>
                            <h3 style={{
                                fontSize: '20px', fontWeight: '900', color: '#0f172a',
                                marginBottom: '16px', lineHeight: '1.3'
                            }}>
                                Resignation Approval Required
                            </h3>
                            <p style={{
                                fontSize: '14px', color: '#475569', lineHeight: '1.6',
                                marginBottom: '32px', fontWeight: '600'
                            }}>
                                You should get approval for your resignation first then only you can apply for experience letter.
                            </p>
                            <button
                                onClick={() => setShowEntrancePopup(false)}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '16px',
                                    backgroundColor: '#0f172a', color: 'white', border: 'none',
                                    fontSize: '15px', fontWeight: '800', cursor: 'pointer',
                                    boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Okay
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-spin { animation: spin 2s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes popupIn { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
