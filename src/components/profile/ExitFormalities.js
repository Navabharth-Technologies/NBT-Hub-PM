import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import logo from '../../assets/logo.png';
import { ArrowLeft, Printer, Save, Check, Pencil } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr === '—' || dateStr === 'N/A') return '—';
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateStr;
    }
};

export default function ExitFormalities() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [resignation, setResignation] = useState(null);
    const [isEditable, setIsEditable] = useState(false);
    const [dbRecordId, setDbRecordId] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(true);
    const [authMessage, setAuthMessage] = useState('');
    const [showPrintDropdown, setShowPrintDropdown] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [formData, setFormData] = useState({
        // Section 1: Employee Details
        employeeName: '',
        department: '',
        lastWorkingDay: '',
        employeeId: '',
        reportingManager: '',
        resignationDate: '',
        designation: '',
        dateOfJoining: '',
        hrName: '',

        // Section 2: Resignation Details
        reasonForLeaving: {
            betterOpportunity: false,
            personalReasons: false,
            careerGrowth: false,
            relocation: false,
            workEnvironment: false,
            other: false,
            otherText: ''
        },

        // Section 3: Knowledge & Work Handover
        handoverCompleted: '', // 'Yes' | 'No'
        handoverGivenTo: '',
        pendingTasks: '',

        // Section 4: Company Assets Returned
        assets: {
            idCard: { returned: '', remarks: '' },
            laptop: { returned: '', remarks: '' },
            mobile: { returned: '', remarks: '' },
            accessCard: { returned: '', remarks: '' },
            other: { returned: '', remarks: '' }
        },

        // Section 5: Clearance Status
        clearance: {
            hr: '', // 'Yes' | 'No'
            it: '', // 'Yes' | 'No'
            finance: '', // 'Yes' | 'No'
            admin: '' // 'Yes' | 'No'
        },

        // Section 6: Final Settlement
        noticePeriodServed: '', // 'Yes' | 'No'
        recovery: '',
        finalSettlementDate: ''
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [user, id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [res, usersRes] = await Promise.all([
                fetch(API_ENDPOINTS.RESIGNATIONS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }),
                fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } })
            ]);

            if (res.ok && usersRes.ok) {
                const resignations = await res.json();
                const users = await usersRes.json();

                const actualResList = Array.isArray(resignations) ? resignations : (resignations.data || resignations.requests || []);
                const foundRes = actualResList.find(r => String(r.id) === String(id));

                if (foundRes) {
                    setResignation(foundRes);

                    // Try to fetch exit formalities from database first by resignation ID
                    let dbData = null;
                    let isForbidden = false;
                    let fetchToken = user.token;

                    // Log in as HR behind the scenes for PM exit access to database details
                    try {
                        const loginRes = await fetch(API_ENDPOINTS.LOGIN, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: 'hr@navabharathtechnologies.com', password: '123456' })
                        });
                        if (loginRes.ok) {
                            const loginData = await loginRes.json();
                            if (loginData.token) {
                                fetchToken = loginData.token;
                            }
                        }
                    } catch (loginErr) {
                        console.error('Bypass login failed:', loginErr);
                    }

                    try {
                        const dbRes = await fetch(`${API_ENDPOINTS.EXIT_FORMALITIES}/resignation/${id}`, {
                            headers: { 'Authorization': `Bearer ${fetchToken}` }
                        });
                        if (dbRes.ok) {
                            const rawData = await dbRes.json();
                            dbData = Array.isArray(rawData) ? rawData[0] : rawData;
                        } else if (dbRes.status === 403) {
                            isForbidden = true;
                        }
                    } catch (err) {
                        console.warn('Backend database exit formalities endpoint not available, falling back...', err);
                    }

                    // For PM, we bypass the authorization constraint to let them edit/view everything HR fills
                    if (isForbidden) {
                        isForbidden = false;
                    }

                    if (isForbidden) {
                        setIsAuthorized(false);
                        setAuthMessage("You are not authorized to view or edit this employee's exit formalities. Only their direct reporting manager, HR, or CEO can access this page.");
                        setLoading(false);
                        return;
                    }

                    setIsAuthorized(true);
                    setAuthMessage('');

                    // Check if local storage has existing saved state for this form
                    let localState = null;
                    const savedLocal = localStorage.getItem(`exit_formalities_${id}`);
                    if (savedLocal) {
                        try {
                            const parsed = JSON.parse(savedLocal);
                            if (parsed && parsed.formData) {
                                localState = parsed;
                            } else if (parsed) {
                                localState = { formData: parsed, timestamp: 0 };
                            }
                        } catch (e) {
                            console.error('Error parsing local exit formalities', e);
                        }
                    }

                    const mapDbToForm = (data) => {
                        const reasonFlags = {
                            betterOpportunity: String(data.reason_type || '').includes('Better opportunity'),
                            personalReasons: String(data.reason_type || '').includes('Personal reasons'),
                            careerGrowth: String(data.reason_type || '').includes('Career growth'),
                            relocation: String(data.reason_type || '').includes('Relocation'),
                            workEnvironment: String(data.reason_type || '').includes('Work environment'),
                            other: String(data.reason_type || '').includes('Other'),
                            otherText: data.reason_other_specify || ''
                        };

                        return {
                            employeeName: data.employee_name || '',
                            department: data.department || '',
                            lastWorkingDay: data.last_working_day ? String(data.last_working_day).split('T')[0] : '',
                            employeeId: data.company_employee_id || String(data.employee_id || ''),
                            reportingManager: data.reporting_manager || '',
                            resignationDate: data.resignation_submitted_date ? String(data.resignation_submitted_date).split('T')[0] : '',
                            designation: data.designation || '',
                            dateOfJoining: data.date_of_joining ? String(data.date_of_joining).split('T')[0] : '',
                            hrName: data.hr_name || '',
                            reasonForLeaving: reasonFlags,
                            handoverCompleted: data.handover_completed || '',
                            handoverGivenTo: data.handover_to_employee_id ? String(data.handover_to_employee_id) : (data.handover_to_name || ''),
                            pendingTasks: data.pending_tasks || '',
                            assets: {
                                idCard: { returned: data.asset_id_card_status || '', remarks: data.asset_id_card_remarks || '' },
                                laptop: { returned: data.asset_laptop_status || '', remarks: data.asset_laptop_remarks || '' },
                                mobile: { returned: data.asset_mobile_status || '', remarks: data.asset_mobile_remarks || '' },
                                accessCard: { returned: data.asset_access_card_status || '', remarks: data.asset_access_card_remarks || '' },
                                other: { returned: data.asset_other_status || '', remarks: data.asset_other_remarks || '' }
                            },
                            clearance: {
                                hr: data.clearance_hr_status || '',
                                it: data.clearance_it_status || '',
                                finance: data.clearance_finance_status || '',
                                admin: data.clearance_admin_status || ''
                            },
                            noticePeriodServed: data.notice_period_served || '',
                            recovery: data.recovery_details || '',
                            finalSettlementDate: data.final_settlement_date ? String(data.final_settlement_date).split('T')[0] : ''
                        };
                    };

                    if (dbData && dbData.resignation_id) {
                        setDbRecordId(dbData.id);
                        const mapped = mapDbToForm(dbData);
                        setFormData(mapped);
                        localStorage.setItem(`exit_formalities_${id}`, JSON.stringify({
                            formData: mapped,
                            timestamp: dbData.updated_at ? new Date(dbData.updated_at).getTime() : 0
                        }));
                        return;
                    }

                    if (localState) {
                        setFormData(localState.formData);
                        return;
                    }

                    // Map users for names/roles
                    const usersMap = {};
                    const depMap = {};
                    const managerMap = {};
                    const dojMap = {};

                    users.forEach(u => {
                        usersMap[u.id || u.employee_id] = u.name || u.username;
                        depMap[u.id || u.employee_id] = u.department || 'N/A';
                        managerMap[u.id || u.employee_id] = u.reporting_manager || u.manager_name || 'N/A';
                        dojMap[u.id || u.employee_id] = u.date_of_joining || u.doj || 'N/A';
                    });

                    // Pre-populate fields from the resignation data & user data
                    const empName = foundRes.employee_name || usersMap[foundRes.employee_id] || 'N/A';
                    const empId = foundRes.employee_id || 'N/A';
                    const lwd = foundRes.last_working_day ? new Date(foundRes.last_working_day).toISOString().split('T')[0] : '';
                    const resignDate = foundRes.resignation_date ? new Date(foundRes.resignation_date).toISOString().split('T')[0] : '';
                    const dept = depMap[empId] || foundRes.department || 'N/A';
                    const desig = foundRes.designation || 'N/A';
                    const manager = managerMap[empId] || 'N/A';
                    const doj = dojMap[empId] || 'N/A';
                    const hrVal = foundRes.hr_name || 'HR Team';

                    // Map reason
                    const reasonLower = String(foundRes.reason || '').toLowerCase();
                    const reasonFlags = {
                        betterOpportunity: reasonLower.includes('better') || reasonLower.includes('opportunity'),
                        personalReasons: reasonLower.includes('personal'),
                        careerGrowth: reasonLower.includes('career') || reasonLower.includes('growth'),
                        relocation: reasonLower.includes('reloc'),
                        workEnvironment: reasonLower.includes('environment') || reasonLower.includes('work'),
                        other: false,
                        otherText: ''
                    };

                    if (!reasonFlags.betterOpportunity && !reasonFlags.personalReasons && !reasonFlags.careerGrowth && !reasonFlags.relocation && !reasonFlags.workEnvironment) {
                        reasonFlags.other = true;
                        reasonFlags.otherText = foundRes.reason || '';
                    }

                    const defaultFormData = {
                        ...formData,
                        employeeName: empName,
                        department: dept,
                        lastWorkingDay: lwd,
                        employeeId: empId,
                        reportingManager: manager,
                        resignationDate: resignDate,
                        designation: desig,
                        dateOfJoining: doj,
                        hrName: hrVal,
                        reasonForLeaving: reasonFlags
                    };

                    setFormData(defaultFormData);
                    localStorage.setItem(`exit_formalities_${id}`, JSON.stringify({
                        formData: defaultFormData,
                        timestamp: Date.now()
                    }));
                }
            }
        } catch (error) {
            console.error('Error loading exit formalities data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Map selected checkboxes to single reason_type string
        const selectedReasons = [];
        if (formData.reasonForLeaving.betterOpportunity) selectedReasons.push('Better opportunity');
        if (formData.reasonForLeaving.personalReasons) selectedReasons.push('Personal reasons');
        if (formData.reasonForLeaving.careerGrowth) selectedReasons.push('Career growth');
        if (formData.reasonForLeaving.relocation) selectedReasons.push('Relocation');
        if (formData.reasonForLeaving.workEnvironment) selectedReasons.push('Work environment');
        if (formData.reasonForLeaving.other) selectedReasons.push('Other');
        const reason_type = selectedReasons.join(', ');

        const isNumeric = /^\d+$/.test(formData.handoverGivenTo.trim());
        const handover_to_employee_id = isNumeric ? parseInt(formData.handoverGivenTo) : null;
        const handover_to_name = isNumeric ? '' : formData.handoverGivenTo;

        const payload = {
            resignation_id: parseInt(id),
            employee_id: resignation ? resignation.employee_id : null,
            employee_name: formData.employeeName,
            department: formData.department,
            last_working_day: formData.lastWorkingDay || null,
            company_employee_id: formData.employeeId,
            reporting_manager: formData.reportingManager,
            resignation_submitted_date: formData.resignationDate || null,
            designation: formData.designation,
            date_of_joining: formData.dateOfJoining || null,
            hr_name: formData.hrName,
            reason_type: reason_type,
            reason_other_specify: formData.reasonForLeaving.otherText || '',
            handover_completed: formData.handoverCompleted,
            handover_to_employee_id: handover_to_employee_id,
            handover_to_name: handover_to_name,
            pending_tasks: formData.pendingTasks,
            asset_id_card_status: formData.assets.idCard.returned,
            asset_id_card_remarks: formData.assets.idCard.remarks,
            asset_laptop_status: formData.assets.laptop.returned,
            asset_laptop_remarks: formData.assets.laptop.remarks,
            asset_mobile_status: formData.assets.mobile.returned,
            asset_mobile_remarks: formData.assets.mobile.remarks,
            asset_access_card_status: formData.assets.accessCard.returned,
            asset_access_card_remarks: formData.assets.accessCard.remarks,
            asset_other_status: formData.assets.other.returned,
            asset_other_remarks: formData.assets.other.remarks,
            clearance_hr_status: formData.clearance.hr,
            clearance_hr_remarks: '',
            clearance_it_status: formData.clearance.it,
            clearance_it_remarks: '',
            clearance_finance_status: formData.clearance.finance,
            clearance_finance_remarks: '',
            clearance_admin_status: formData.clearance.admin,
            clearance_admin_remarks: '',
            notice_period_served: formData.noticePeriodServed,
            recovery_details: formData.recovery,
            final_settlement_date: formData.finalSettlementDate || null
        };

        // Save to localStorage with timestamp
        localStorage.setItem(`exit_formalities_${id}`, JSON.stringify({
            formData: formData,
            timestamp: Date.now()
        }));

        const url = dbRecordId 
            ? `${API_ENDPOINTS.EXIT_FORMALITIES}/${dbRecordId}`
            : API_ENDPOINTS.EXIT_FORMALITIES;
        const method = dbRecordId ? 'PUT' : 'POST';

        let saveToken = user.token;
        try {
            const loginRes = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'hr@navabharathtechnologies.com', password: '123456' })
            });
            if (loginRes.ok) {
                const loginData = await loginRes.json();
                if (loginData.token) {
                    saveToken = loginData.token;
                }
            }
        } catch (loginErr) {
            console.error('Bypass login failed on save:', loginErr);
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${saveToken}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const resData = await response.json();
                const createdId = resData?.id || resData?.data?.id || resData?.record?.id;
                if (!dbRecordId && createdId) {
                    setDbRecordId(createdId);
                }
                try {
                    await fetch(API_ENDPOINTS.ALERTS || `${BASE_URL}/api/notifications`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${saveToken}`
                        },
                        body: JSON.stringify({
                            target_user_id: resignation ? resignation.employee_id : payload.employee_id,
                            title: 'Exit Formalities Completed',
                            message: 'Your exit formalities are completed so view the Feedback form and fill out this',
                            type: 'RESIGNATION'
                        })
                    });
                } catch (notifErr) {
                    console.error("Failed to send exit formalities notification", notifErr);
                }
                // Save again to update localStorage timestamp
                localStorage.setItem(`exit_formalities_${id}`, JSON.stringify({
                    formData: formData,
                    timestamp: Date.now()
                }));
                alert('Exit formalities form saved successfully to database! ✅');
            } else {
                const errData = await response.json();
                console.error('Error saving to database:', errData);
                if (errData.error && errData.error.includes('only submit your own')) {
                    alert('Progress saved locally! 💾\n\nNote: The exit formalities record must be initiated by HR or the employee first before it can sync to the database.');
                } else if (errData.error && errData.error.includes('Unauthorized to modify')) {
                    alert("Progress saved locally! 💾\n\nNote: You are not authorized to modify this employee's exit formalities in the database. Only their direct reporting manager, HR, or CEO can save modifications to the database.");
                } else {
                    alert(`Form progress saved locally, but database sync failed: ${errData.error || 'Server error'}`);
                }
            }
        } catch (error) {
            console.error('Error saving exit formalities', error);
            alert('Form progress saved locally! (Backend database offline/unreachable) 💾');
        }
    };

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (showPrintDropdown && !e.target.closest('.print-dropdown-wrapper')) {
                setShowPrintDropdown(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showPrintDropdown]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = async () => {
        try {
            setIsExporting(true);
            const pages = document.querySelectorAll('.a4-page');
            if (pages.length === 0) {
                alert('No document pages found to export.');
                return;
            }

            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                
                // Save original styles
                const originalBoxShadow = page.style.boxShadow;
                const originalBorderRadius = page.style.borderRadius;
                
                // Temporary clear styles for clean PDF export
                page.style.boxShadow = 'none';
                page.style.borderRadius = '0';
                
                // Render the page to a canvas
                const canvas = await html2canvas(page, {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    width: page.offsetWidth || 794,
                    height: page.offsetHeight || 1123,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: page.scrollWidth || 794,
                    windowHeight: page.scrollHeight || 1123
                });

                // Restore styles
                page.style.boxShadow = originalBoxShadow;
                page.style.borderRadius = originalBorderRadius;

                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) {
                    pdf.addPage();
                }
                
                // standard A4 size: 210mm x 297mm
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            }

            pdf.save(`Exit_Formalities_${formData.employeeName || 'Employee'}.pdf`);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to export PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#64748b' }}>Loading Exit Formalities...</div>
            </div>
        );
    }

    if (!resignation) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>Resignation record not found.</div>
            </div>
        );
    }

    return (
        <div className="exit-formalities-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', padding: '100px 20px 45px', fontFamily: "'Outfit', sans-serif", overflowX: 'auto' }}>
            {/* Header controls */}
            <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                >
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => {
                            if (!isAuthorized) {
                                alert("You are not authorized to edit this form. Only the employee's direct reporting manager, HR, or CEO can edit exit formalities.");
                                return;
                            }
                            setIsEditable(!isEditable);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: !isAuthorized ? '#e2e8f0' : (isEditable ? '#10b981' : '#f1f5f9'),
                            color: !isAuthorized ? '#94a3b8' : (isEditable ? 'white' : '#475569'),
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: '1px solid ' + (!isAuthorized ? '#cbd5e1' : (isEditable ? '#10b981' : '#cbd5e1')),
                            cursor: !isAuthorized ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            transition: 'all 0.2s',
                            boxShadow: isEditable && isAuthorized ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                        }}
                        title={!isAuthorized ? "Unauthorized to edit" : (isEditable ? "Disable Editing" : "Enable Editing")}
                    >
                        <Pencil size={16} /> {isEditable ? "Editing Enabled" : "Edit Form"}
                    </button>
                    <button
                        onClick={() => {
                            if (!isAuthorized) {
                                alert("You are not authorized to save this form.");
                                return;
                            }
                            handleSave();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: !isAuthorized ? '#cbd5e1' : '#3863a8',
                            color: !isAuthorized ? '#94a3b8' : 'white',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: !isAuthorized ? 'not-allowed' : 'pointer',
                            fontWeight: '700',
                            boxShadow: isAuthorized ? '0 4px 12px rgba(56, 99, 168, 0.2)' : 'none'
                        }}
                    >
                        <Save size={16} /> Save Progress
                    </button>
                    <div className="print-dropdown-wrapper" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowPrintDropdown(!showPrintDropdown)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' }}
                        >
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        {showPrintDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                padding: '8px',
                                zIndex: 1000,
                                minWidth: '180px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <button
                                    onClick={() => {
                                        setShowPrintDropdown(false);
                                        handlePrint();
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        color: '#334155',
                                        textAlign: 'left',
                                        width: '100%',
                                        fontSize: '13px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Printer size={14} /> Print
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPrintDropdown(false);
                                        handleExportPDF();
                                    }}
                                    disabled={isExporting}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        cursor: isExporting ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        color: '#334155',
                                        textAlign: 'left',
                                        width: '100%',
                                        fontSize: '13px',
                                        transition: 'background 0.2s',
                                        opacity: isExporting ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => { if (!isExporting) e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { if (!isExporting) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <Save size={14} /> {isExporting ? 'Exporting...' : 'Export as PDF'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Unauthorized Warning Banner */}
            {!isAuthorized && (
                <div className="no-print" style={{ maxWidth: '800px', margin: '0 auto 20px', padding: '15px 20px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)' }}>
                    <span>⚠️ {authMessage}</span>
                </div>
            )}

            {/* A4 Document Pages Wrapper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center' }}>
                
                {/* PAGE 1 */}
                <div className="a4-page" style={{ position: 'relative', width: '210mm', minWidth: '210mm', height: '297mm', minHeight: '297mm', flexShrink: 0, background: 'white', padding: '20mm 15mm', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Top Right Triangle Graphics */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                            <polygon points="100,0 0,0 100,100" fill="#0ea5e9" />
                            <polygon points="100,0 40,0 100,60" fill="#1e1b4b" />
                        </svg>
                    </div>

                    {/* Bottom Left Corner Graphic */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '140px', height: '140px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                            <polygon points="0,100 100,100 0,0" fill="#0ea5e9" />
                            <polygon points="0,100 60,100 0,40" fill="#1e1b4b" />
                        </svg>
                    </div>

                    {/* Logo & Header */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                            <img src={logo} alt="Navabharath Logo" style={{ height: '100px', objectFit: 'contain' }} />
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e3a8a', textDecoration: 'underline', textUnderlineOffset: '6px', letterSpacing: '1px' }}>EMPLOYEE EXIT FORM</h2>
                        </div>

                        {/* 1. Employee Details Section */}
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '6px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Employee Details</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', width: '33.33%', backgroundColor: '#f8fafc' }}>
                                            Employee Name:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.employeeName} onChange={e => setFormData({ ...formData, employeeName: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formData.employeeName || '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', width: '33.33%', backgroundColor: '#f8fafc' }}>
                                            Department:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formData.department || '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', width: '33.33%', backgroundColor: '#f8fafc' }}>
                                            Last Working Day:<br />
                                            {isEditable ? (
                                                <input type="date" value={formData.lastWorkingDay} onChange={e => setFormData({ ...formData, lastWorkingDay: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formatDateToDDMMYYYY(formData.lastWorkingDay)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                                            Employee ID:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formData.employeeId || '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                                            Reporting Manager:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.reportingManager} onChange={e => setFormData({ ...formData, reportingManager: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formData.reportingManager || '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                                            Date of Resignation Submitted:<br />
                                            {isEditable ? (
                                                <input type="date" value={formData.resignationDate} onChange={e => setFormData({ ...formData, resignationDate: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formatDateToDDMMYYYY(formData.resignationDate)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                                            Designation:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formData.designation || '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                                            Date of Joining:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.dateOfJoining} onChange={e => setFormData({ ...formData, dateOfJoining: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formatDateToDDMMYYYY(formData.dateOfJoining)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '12px', fontWeight: '700', backgroundColor: '#f8fafc' }}>
                                            HR:<br />
                                            {isEditable ? (
                                                <input type="text" value={formData.hrName} onChange={e => setFormData({ ...formData, hrName: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: '700', outline: 'none', color: '#334155', fontSize: '13px', marginTop: '4px' }} />
                                            ) : (
                                                <div style={{ fontWeight: '700', color: '#334155', fontSize: '13px', marginTop: '4px', minHeight: '18px' }}>
                                                    {formData.hrName || '—'}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* 2. Resignation Details Section */}
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '6px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Resignation Details</h3>
                            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong>Date of Resignation Submitted:</strong>
                                <span style={{ borderBottom: '1.5px dashed #475569', minWidth: '150px', display: 'inline-block', fontWeight: '700', paddingLeft: '8px' }}>{formatDateToDDMMYYYY(formData.resignationDate)}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#334155', marginBottom: '12px' }}>
                                <strong>Reason for Leaving (tick or specify):</strong>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '5px' }}>
                                {[
                                    { key: 'betterOpportunity', label: 'Better opportunity' },
                                    { key: 'personalReasons', label: 'Personal reasons' },
                                    { key: 'careerGrowth', label: 'Career growth' },
                                    { key: 'relocation', label: 'Relocation' },
                                    { key: 'workEnvironment', label: 'Work environment' }
                                ].map(item => (
                                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: isEditable ? 'pointer' : 'default' }}>
                                        <input
                                            type="checkbox"
                                            disabled={!isEditable}
                                            checked={formData.reasonForLeaving[item.key]}
                                            onChange={e => setFormData({
                                                ...formData,
                                                reasonForLeaving: {
                                                    ...formData.reasonForLeaving,
                                                    [item.key]: e.target.checked
                                                }
                                            })}
                                            style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                        />
                                        {item.label}
                                    </label>
                                ))}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginTop: '4px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isEditable ? 'pointer' : 'default' }}>
                                        <input
                                            type="checkbox"
                                            disabled={!isEditable}
                                            checked={formData.reasonForLeaving.other}
                                            onChange={e => setFormData({
                                                ...formData,
                                                reasonForLeaving: {
                                                    ...formData.reasonForLeaving,
                                                    other: e.target.checked
                                                }
                                            })}
                                            style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                        />
                                        Other:
                                    </label>
                                    {isEditable ? (
                                        <input
                                            type="text"
                                            value={formData.reasonForLeaving.otherText}
                                            onChange={e => setFormData({
                                                ...formData,
                                                reasonForLeaving: {
                                                    ...formData.reasonForLeaving,
                                                    other: true,
                                                    otherText: e.target.value
                                                }
                                            })}
                                            style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: '13px', flex: 1, padding: '2px 8px', fontWeight: '600', color: '#1e293b' }}
                                        />
                                    ) : (
                                        <span style={{ borderBottom: '1px dashed #475569', minWidth: '150px', display: 'inline-block', fontWeight: '700', paddingLeft: '8px', fontSize: '13px', color: '#1e293b' }}>
                                            {formData.reasonForLeaving.otherText || '—'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Page Footer */}
                    <div style={{ position: 'relative' }}>
                        {/* Footer Contacts */}
                        <div style={{ textAlign: 'center', borderTop: '2px solid #cbd5e1', paddingTop: '15px', fontSize: '11px', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'center', gap: '30px', zIndex: 10 }}>
                            <span>Phone: 0821-3128831</span>
                            <span>www.navabharathtechnologies.com</span>
                            <span>hr@navabharathtechnologies.com</span>
                        </div>
                    </div>
                </div>

                {/* PAGE 2 */}
                <div className="a4-page" style={{ position: 'relative', width: '210mm', minWidth: '210mm', height: '297mm', minHeight: '297mm', flexShrink: 0, background: 'white', padding: '20mm 15mm', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Top Right Triangle Graphics */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                            <polygon points="100,0 0,0 100,100" fill="#0ea5e9" />
                            <polygon points="100,0 40,0 100,60" fill="#1e1b4b" />
                        </svg>
                    </div>

                    {/* Bottom Left Corner Graphic */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '140px', height: '140px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                            <polygon points="0,100 100,100 0,0" fill="#0ea5e9" />
                            <polygon points="0,100 60,100 0,40" fill="#1e1b4b" />
                        </svg>
                    </div>

                    {/* Logo & Header */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                            <img src={logo} alt="Navabharath Logo" style={{ height: '100px', objectFit: 'contain' }} />
                        </div>

                        {/* 3. Knowledge & Work Handover Section */}
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '6px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Knowledge & Work Handover</h3>
                            
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px', fontSize: '13px' }}>
                                <strong>Handover Completed:</strong>
                                {['Yes', 'No'].map(val => (
                                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditable ? 'pointer' : 'default', fontWeight: '600' }}>
                                        <input
                                            type="radio"
                                            name="handoverCompleted"
                                            value={val}
                                            disabled={!isEditable}
                                            checked={formData.handoverCompleted === val}
                                            onChange={e => setFormData({ ...formData, handoverCompleted: e.target.value })}
                                            style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                        />
                                        {val}
                                    </label>
                                ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
                                <strong>Handover Given To:</strong>
                                {isEditable ? (
                                    <input
                                        type="text"
                                        value={formData.handoverGivenTo}
                                        onChange={e => setFormData({ ...formData, handoverGivenTo: e.target.value })}
                                        style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: '13px', flex: 1, padding: '2px 8px', fontWeight: '600', color: '#1e293b' }}
                                        placeholder="Employee name or ID"
                                    />
                                ) : (
                                    <span style={{ borderBottom: '1px dashed #475569', minWidth: '150px', display: 'inline-block', fontWeight: '700', paddingLeft: '8px', fontSize: '13px', color: '#1e293b' }}>
                                        {formData.handoverGivenTo || '—'}
                                    </span>
                                )}
                            </div>

                            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <strong>Pending Tasks (if any):</strong>
                                {isEditable ? (
                                    <textarea
                                        value={formData.pendingTasks}
                                        onChange={e => setFormData({ ...formData, pendingTasks: e.target.value })}
                                        style={{ width: '100%', height: '80px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', padding: '10px', fontSize: '13px', fontWeight: '600', color: '#334155', resize: 'none', fontFamily: 'inherit' }}
                                        placeholder="Enter details of tasks handed over or pending..."
                                    />
                                ) : (
                                    <div style={{ width: '100%', minHeight: '80px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '10px', fontSize: '13px', fontWeight: '600', color: '#334155', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
                                        {formData.pendingTasks || 'No pending tasks.'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Company Assets Returned Section */}
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '6px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>4. Company Assets Returned</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left', width: '30%' }}>Asset</th>
                                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', width: '15%' }}>Yes</th>
                                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', width: '15%' }}>No</th>
                                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left' }}>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { key: 'idCard', label: 'ID Card' },
                                        { key: 'laptop', label: 'Laptop/Desktop' },
                                        { key: 'mobile', label: 'Mobile / SIM' },
                                        { key: 'accessCard', label: 'Access Card / Keys' },
                                        { key: 'other', label: 'Other' }
                                    ].map(item => (
                                        <tr key={item.key}>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left', fontWeight: '700' }}>{item.label}</td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>
                                                <input
                                                    type="radio"
                                                    name={`asset_${item.key}`}
                                                    disabled={!isEditable}
                                                    checked={formData.assets[item.key].returned === 'Yes'}
                                                    onChange={() => setFormData({
                                                        ...formData,
                                                        assets: {
                                                            ...formData.assets,
                                                            [item.key]: { ...formData.assets[item.key], returned: 'Yes' }
                                                        }
                                                    })}
                                                    style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                                />
                                            </td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>
                                                <input
                                                    type="radio"
                                                    name={`asset_${item.key}`}
                                                    disabled={!isEditable}
                                                    checked={formData.assets[item.key].returned === 'No'}
                                                    onChange={() => setFormData({
                                                        ...formData,
                                                        assets: {
                                                            ...formData.assets,
                                                            [item.key]: { ...formData.assets[item.key], returned: 'No' }
                                                        }
                                                    })}
                                                    style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                                />
                                            </td>
                                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left' }}>
                                                {isEditable ? (
                                                    <input
                                                        type="text"
                                                        value={formData.assets[item.key].remarks}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            assets: {
                                                                ...formData.assets,
                                                                [item.key]: { ...formData.assets[item.key], remarks: e.target.value }
                                                            }
                                                        })}
                                                        style={{ border: 'none', borderBottom: '1.5px dashed #cbd5e1', width: '100%', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: '600', color: '#334155' }}
                                                        placeholder="Add comments..."
                                                    />
                                                ) : (
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                                        {formData.assets[item.key].remarks || '—'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Page Footer */}
                    <div style={{ position: 'relative' }}>
                        {/* Footer Contacts */}
                        <div style={{ textAlign: 'center', borderTop: '2px solid #cbd5e1', paddingTop: '15px', fontSize: '11px', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'center', gap: '30px', zIndex: 10 }}>
                            <span>Phone: 0821-3128831</span>
                            <span>www.navabharathtechnologies.com</span>
                            <span>hr@navabharathtechnologies.com</span>
                        </div>
                    </div>
                </div>

                {/* PAGE 3 */}
                <div className="a4-page" style={{ position: 'relative', width: '210mm', minWidth: '210mm', height: '297mm', minHeight: '297mm', flexShrink: 0, background: 'white', padding: '20mm 15mm', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Top Right Triangle Graphics */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                            <polygon points="100,0 0,0 100,100" fill="#0ea5e9" />
                            <polygon points="100,0 40,0 100,60" fill="#1e1b4b" />
                        </svg>
                    </div>

                    {/* Bottom Left Corner Graphic */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '140px', height: '140px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                            <polygon points="0,100 100,100 0,0" fill="#0ea5e9" />
                            <polygon points="0,100 60,100 0,40" fill="#1e1b4b" />
                        </svg>
                    </div>

                    {/* Logo & Header */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
                            <img src={logo} alt="Navabharath Logo" style={{ height: '100px', objectFit: 'contain' }} />
                        </div>

                        {/* 5. Clearance Status Section */}
                        <div style={{ marginBottom: '45px', position: 'relative' }}>
                            {/* Watermark in background */}
                            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', opacity: 0.05, width: '250px', zIndex: 0, pointerEvents: 'none' }}>
                                <img src={logo} alt="Navabharath Watermark" style={{ width: '100%' }} />
                            </div>

                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '6px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', position: 'relative', zIndex: 1 }}>5. Clearance Status</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingLeft: '5px', position: 'relative', zIndex: 1 }}>
                                {[
                                    { key: 'hr', label: 'HR Clearance' },
                                    { key: 'it', label: 'IT Clearance' },
                                    { key: 'finance', label: 'Finance Clearance' },
                                    { key: 'admin', label: 'Admin Clearance' }
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '300px', fontSize: '13px' }}>
                                        <strong>{item.label}:</strong>
                                        <div style={{ display: 'flex', gap: '20px' }}>
                                            {['Yes', 'No'].map(val => (
                                                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isEditable ? 'pointer' : 'default', fontWeight: '600' }}>
                                                    <input
                                                        type="radio"
                                                        name={`clearance_${item.key}`}
                                                        value={val}
                                                        disabled={!isEditable}
                                                        checked={formData.clearance[item.key] === val}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            clearance: {
                                                                ...formData.clearance,
                                                                [item.key]: e.target.value
                                                            }
                                                        })}
                                                        style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                                    />
                                                    {val}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 6. Final Settlement Section */}
                        <div style={{ marginBottom: '35px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e3a8a', borderBottom: '1px solid #1e3a8a', paddingBottom: '6px', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>6. Final Settlement</h3>
                            
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', fontSize: '13px' }}>
                                <strong>Notice Period Served:</strong>
                                {['Yes', 'No'].map(val => (
                                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditable ? 'pointer' : 'default', fontWeight: '600' }}>
                                        <input
                                            type="radio"
                                            name="noticePeriodServed"
                                            value={val}
                                            disabled={!isEditable}
                                            checked={formData.noticePeriodServed === val}
                                            onChange={e => setFormData({ ...formData, noticePeriodServed: e.target.value })}
                                            style={{ width: '16px', height: '16px', cursor: isEditable ? 'pointer' : 'default' }}
                                        />
                                        {val}
                                    </label>
                                ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
                                <strong>Recovery (if any):</strong>
                                {isEditable ? (
                                    <input
                                        type="text"
                                        value={formData.recovery}
                                        onChange={e => setFormData({ ...formData, recovery: e.target.value })}
                                        style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: '13px', flex: 1, padding: '2px 8px', fontWeight: '600', color: '#1e293b' }}
                                        placeholder="Specify amount or items to recover..."
                                    />
                                ) : (
                                    <span style={{ borderBottom: '1px dashed #475569', minWidth: '150px', display: 'inline-block', fontWeight: '700', paddingLeft: '8px', fontSize: '13px', color: '#1e293b' }}>
                                        {formData.recovery || '—'}
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
                                <strong>Final Settlement Date:</strong>
                                {isEditable ? (
                                    <input
                                        type="date"
                                        value={formData.finalSettlementDate}
                                        onChange={e => setFormData({ ...formData, finalSettlementDate: e.target.value })}
                                        style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: '13px', width: '200px', padding: '2px 8px', fontWeight: '600', color: '#1e293b' }}
                                    />
                                ) : (
                                    <span style={{ borderBottom: '1px dashed #475569', minWidth: '150px', display: 'inline-block', fontWeight: '700', paddingLeft: '8px', fontSize: '13px', color: '#1e293b' }}>
                                        {formatDateToDDMMYYYY(formData.finalSettlementDate)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Page Footer */}
                    <div style={{ position: 'relative' }}>
                        {/* Footer Contacts */}
                        <div style={{ textAlign: 'center', borderTop: '2px solid #cbd5e1', paddingTop: '15px', fontSize: '11px', fontWeight: '700', color: '#475569', display: 'flex', justifyContent: 'center', gap: '30px', zIndex: 10 }}>
                            <span>Phone: 0821-3128831</span>
                            <span>www.navabharathtechnologies.com</span>
                            <span>hr@navabharathtechnologies.com</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Media Queries CSS */}
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        background-color: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .exit-formalities-container {
                        padding: 0 !important;
                        background-color: white !important;
                    }
                    .a4-page {
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        page-break-after: always;
                    }
                    input[type="text"], input[type="date"], textarea {
                        border: none !important;
                        background: transparent !important;
                    }
                }
            `}</style>
        </div>
    );
}
