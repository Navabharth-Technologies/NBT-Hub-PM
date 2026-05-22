import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import logo from '../../assets/logo.png';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function SalaryStatements() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePayslipForDownload, setActivePayslipForDownload] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);
    const [winWidth, setWinWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchSalaryStatements();
    }, [user]);

    const formatCurrency = (val) => {
        if (val === undefined || val === null || val === '') return '0';
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return num.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        });
    };

    const fetchSalaryStatements = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const loggedInEmpId = String(user.employee_id || user.id || user.empId || '').trim();
            const loggedInUserId = String(user.id || '').trim().toLowerCase();
            const loggedInName = String(user.name || '').trim().toLowerCase();

            let fetchUrl = API_ENDPOINTS.PAYSLIPS_GET || `${BASE_URL}/api/payslips`;
            if (loggedInEmpId) {
                fetchUrl += `${fetchUrl.includes('?') ? '&' : '?'}employee_id=${encodeURIComponent(loggedInEmpId)}`;
            }

            let res = await fetch(fetchUrl, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            let data = [];
            if (res.ok) {
                data = await res.json();
            } else {
                const fallbackRes = await fetch(API_ENDPOINTS.PAYSLIPS_GET || `${BASE_URL}/api/payslips`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (fallbackRes.ok) {
                    data = await fallbackRes.json();
                }
            }
            
            const rawList = Array.isArray(data) ? data : (data ? [data] : []);

            const filtered = rawList.filter(p => {
                if (!p) return false;
                const payslipEmpId = String(p.employee_id || p.id || p.employeeId || '').trim().toLowerCase();
                const payslipEmpName = String(p.emp_name || p.employee_name || p.employeeName || '').trim().toLowerCase();

                const isMatch = (
                    (loggedInEmpId && (payslipEmpId === loggedInEmpId.toLowerCase() || payslipEmpName === loggedInEmpId.toLowerCase())) ||
                    (loggedInUserId && (payslipEmpId === loggedInUserId || payslipEmpName === loggedInUserId)) ||
                    (loggedInName && (payslipEmpId === loggedInName || payslipEmpName === loggedInName))
                );
                return isMatch;
            });
            
            filtered.sort((a, b) => {
                const yearA = parseInt(a.year, 10) || 0;
                const yearB = parseInt(b.year, 10) || 0;
                if (yearB !== yearA) return yearB - yearA;
                const monthA = parseInt(a.month, 10) || 0;
                const monthB = parseInt(b.month, 10) || 0;
                return monthB - monthA;
            });

            setPayslips(filtered);
        } catch (error) {
            console.error('Fetch salary statements error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getMonthName = (monthStr) => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const idx = parseInt(monthStr, 10);
        if (!isNaN(idx) && idx >= 1 && idx <= 12) {
            return months[idx - 1];
        }
        return monthStr || '';
    };

    const formatMonthYear = (monthStr, yearStr) => {
        return `${getMonthName(monthStr)} ${yearStr || ''}`;
    };

    const handleDownloadPDF = async (payslip) => {
        if (!payslip) return;
        const payslipId = payslip._id || payslip.id;
        setDownloadingId(payslipId);
        setActivePayslipForDownload(payslip);

        // Wait a short time for React to render the off-screen template in the DOM
        setTimeout(async () => {
            const element = document.getElementById('payslip-document-hidden');
            if (!element) {
                setDownloadingId(null);
                setActivePayslipForDownload(null);
                return;
            }

            try {
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const canvasWidthMm = 210; // Standard A4 width in mm
                const canvasHeightMm = (canvas.height * canvasWidthMm) / canvas.width;

                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'mm',
                    format: [canvasWidthMm, canvasHeightMm]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, canvasWidthMm, canvasHeightMm);
                pdf.save(`Payslip_${user?.name || 'Employee'}_${getMonthName(payslip.month)}_${payslip.year || ''}.pdf`);
            } catch (error) {
                console.error('PDF Generation Error:', error);
                alert('Failed to generate PDF statement.');
            } finally {
                setDownloadingId(null);
                setActivePayslipForDownload(null);
            }
        }, 300);
    };

    // Styling helpers
    const cardGridStyle = {
        display: 'grid',
        gridTemplateColumns: winWidth < 600 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
        marginTop: '24px'
    };

    const cardStyle = {
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        border: '1px solid #f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default'
    };

    const cardHeaderStyle = {
        fontSize: '13px',
        fontWeight: '700',
        color: '#64748b',
        margin: 0
    };

    const salaryAmountStyle = {
        fontSize: '28px',
        fontWeight: '900',
        color: '#0f172a',
        margin: '4px 0'
    };

    const viewBtnStyle = {
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: '800',
        color: '#334155',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'center',
        transition: 'background 0.2s, color 0.2s'
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            <div className="no-print">
                <AppHeader />
            </div>

            <main style={{ flex: 1, padding: winWidth < 768 ? '20px 16px 80px' : '40px 40px 40px', marginTop: winWidth < 768 ? '85px' : '110px', width: '100%', boxSizing: 'border-box' }}>
                <div className="no-print" style={{ width: '100%', maxWidth: '100%' }}>
                    {/* Top Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifycontent: 'center',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                color: '#64748b',
                                cursor: 'pointer',
                                transition: '0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{ fontSize: winWidth < 768 ? '22px' : '28px', fontWeight: '950', color: '#0f172a', margin: 0 }}>Salary Statements</h1>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: '#64748b', fontWeight: '600', fontSize: '14px' }}>Loading statements...</p>
                        </div>
                    ) : payslips.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', background: '#ffffff', borderRadius: '24px', border: '1px dashed #cbd5e1', padding: '40px' }}>
                            <FileText size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
                            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800', color: '#334155' }}>No Salary Statements</h3>
                            <p style={{ margin: 0, color: '#64748b', textAlign: 'center', maxWidth: '360px', fontSize: '14px' }}>There are no payslips added to your payroll record yet.</p>
                        </div>
                    ) : (
                        <div style={cardGridStyle}>
                            {payslips.map((payslip) => (
                                <div
                                    key={payslip._id || payslip.id}
                                    style={cardStyle}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                                    }}
                                >
                                    <p style={cardHeaderStyle}>{formatMonthYear(payslip.month, payslip.year)}</p>
                                    <h2 style={salaryAmountStyle}>₹ {formatCurrency(payslip.net_payable || payslip.netPayable)}</h2>
                                    <button
                                        onClick={() => handleDownloadPDF(payslip)}
                                        disabled={downloadingId !== null}
                                        style={{
                                            ...viewBtnStyle,
                                            opacity: downloadingId !== null ? 0.6 : 1,
                                            cursor: downloadingId !== null ? 'not-allowed' : 'pointer',
                                            transition: 'background 0.2s, color 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (downloadingId === null) {
                                                e.currentTarget.style.background = '#0f172a';
                                                e.currentTarget.style.color = '#ffffff';
                                                e.currentTarget.style.borderColor = '#0f172a';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (downloadingId === null) {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.color = '#334155';
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                            }
                                        }}
                                    >
                                        <Download size={14} />
                                        {downloadingId === (payslip._id || payslip.id) ? 'Downloading...' : 'Download PDF'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <div className="no-print">
                <AppFooter />
            </div>

            {/* Off-screen hidden container for PDF rendering */}
            {activePayslipForDownload && (
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '850px', zIndex: -9999 }}>
                    <div id="payslip-document-hidden" style={{ background: 'white', padding: '25px 40px', position: 'relative', overflow: 'hidden', border: '1px solid #e2e8f0', width: '850px', boxSizing: 'border-box' }}>
                        {/* Decorative Corners */}
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'linear-gradient(225deg, #3b82f6 50%, transparent 50%)' }}></div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'linear-gradient(45deg, #3b82f6 50%, transparent 50%)' }}></div>

                        {/* Company Branding */}
                        <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative', zIndex: 2 }}>
                            <img src={logo} alt="Company Logo" style={{ width: '50px', marginBottom: '15px' }} />
                            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: '0 0 5px 0', letterSpacing: '-1px' }}>NAVABHARATH TECHNOLOGIES</h1>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Smarter Solutions for Better Future</p>
                            <div style={{ width: '100%', height: '1.5px', background: '#f1f5f9', margin: '20px 0' }}></div>
                            <h2 style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1.5px solid #e2e8f0', display: 'inline-block', paddingBottom: '10px', marginBottom: '10px' }}>
                                PAY SLIP FOR THE MONTH OF {getMonthName(activePayslipForDownload.month).toUpperCase()} - {activePayslipForDownload.year || ''}
                            </h2>
                        </div>

                        {/* Employee Details Grid */}
                        <div style={{ border: '1.5px solid #e2e8f0', marginBottom: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid #e2e8f0' }}>
                                <div style={{ padding: '12px 15px', borderRight: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '950', color: '#475569' }}>EMPCODE</span>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{activePayslipForDownload.employee_id || ''}</span>
                                </div>
                                <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '950', color: '#475569' }}>DEPARTMENT</span>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{activePayslipForDownload.department || ''}</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                <div style={{ padding: '12px 15px', borderRight: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '950', color: '#475569' }}>EMP. NAME</span>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{activePayslipForDownload.emp_name || user?.name || ''}</span>
                                </div>
                                <div style={{ padding: '12px 15px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '950', color: '#475569' }}>DESIGNATION</span>
                                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{activePayslipForDownload.designation || user?.designation || user?.role || ''}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Statistics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '1.5px solid #e2e8f0', marginBottom: '20px', fontSize: '9px' }}>
                            {[
                                { l: 'TOT. PRE:', v: activePayslipForDownload.total_present || '0' },
                                { l: 'TOT. WO:-', v: activePayslipForDownload.total_weekly_off || '0' },
                                { l: 'TOT. HL:-', v: activePayslipForDownload.total_holidays || '0' },
                                { l: 'TOT. LEAVE:-', v: activePayslipForDownload.total_leaves || '0' },
                                { l: 'TOTAL ABSENT', v: activePayslipForDownload.total_absent || '0' },
                                { l: 'TOTAL WORK+OT', v: activePayslipForDownload.total_work_ot || '0' },
                                { l: 'TOTAL OT', v: activePayslipForDownload.total_ot_hours || '0' },
                                { l: 'AVAILABLE LEAVE', v: activePayslipForDownload.available_leaves || '0' },
                                { l: 'LOP COUNT', v: activePayslipForDownload.lop || '0' },
                                { l: 'BS/REF AMT.', v: formatCurrency(activePayslipForDownload.basic_salary) }
                            ].map((item, i) => {
                                const isRightMost = (i + 1) % 5 === 0;
                                const isBottomRow = i >= 5;
                                return (
                                    <div key={i} style={{
                                        padding: '10px 12px',
                                        borderRight: isRightMost ? 'none' : '1.5px solid #e2e8f0',
                                        borderBottom: isBottomRow ? 'none' : '1.5px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: '900', color: '#475569', fontSize: '8px' }}>{item.l}</span>
                                        <span style={{ fontWeight: '950', color: '#0f172a' }}>{item.v}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Earnings & Deductions Tables */}
                        <div style={{ display: 'flex', flexDirection: 'row', border: '1px solid #e2e8f0', fontSize: '10px' }}>
                            {/* Earnings Column */}
                            <div style={{ flex: 1, borderRight: '1px solid #e2e8f0' }}>
                                <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '950' }}>EARNING</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {[
                                        { l: 'Basic', v: activePayslipForDownload.basic_salary },
                                        { l: 'HRA', v: activePayslipForDownload.hra },
                                        { l: 'Conveyance', v: activePayslipForDownload.conveyance },
                                        { l: 'Special Allowance', v: activePayslipForDownload.special_allowance }
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <span>{item.l}</span>
                                            <span style={{ fontWeight: '800' }}>{formatCurrency(item.v)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', marginTop: 'auto', borderTop: '2px solid #e2e8f0', fontWeight: '950', background: '#f8fafc' }}>
                                    <span>Total Earning</span>
                                    <span>{formatCurrency(activePayslipForDownload.total_earnings)}</span>
                                </div>
                            </div>

                            {/* Incentives Column */}
                            <div style={{ flex: 1, borderRight: '1px solid #e2e8f0' }}>
                                <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '950' }}>INCENTIVES</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {[
                                        { l: 'Performance', v: activePayslipForDownload.performance_incentive },
                                        { l: 'Yearly Incentive', v: activePayslipForDownload.yearly_incentive }
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <span>{item.l}</span>
                                            <span style={{ fontWeight: '800' }}>{formatCurrency(item.v)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', marginTop: 'auto', borderTop: '2px solid #e2e8f0', fontWeight: '950', background: '#f8fafc' }}>
                                    <span>Total Incent.</span>
                                    <span>{formatCurrency(activePayslipForDownload.total_incentives)}</span>
                                </div>
                            </div>

                            {/* Deductions Column */}
                            <div style={{ flex: 1 }}>
                                <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '950' }}>DEDUCTION</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {[
                                        { l: 'PF', v: activePayslipForDownload.pf_deduction },
                                        { l: 'ESI', v: activePayslipForDownload.esi_deduction },
                                        { l: 'PT', v: activePayslipForDownload.pt_deduction },
                                        { l: 'LWF', v: activePayslipForDownload.lwf_deduction },
                                        { l: 'Income Tax', v: activePayslipForDownload.income_tax },
                                        { l: 'LOP Deduction', v: activePayslipForDownload.lop_deduction }
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                            <span>{item.l}</span>
                                            <span style={{ fontWeight: '800' }}>{formatCurrency(item.v)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderTop: '2px solid #e2e8f0', fontWeight: '950', background: '#f8fafc' }}>
                                    <span>Total Deduct.</span>
                                    <span>{formatCurrency(activePayslipForDownload.total_deductions)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderTop: '1px solid #e2e8f0', fontWeight: '950' }}>
                                    <span>Net Payable</span>
                                    <span style={{ color: '#16a34a', fontWeight: '950', fontSize: '13px' }}>₹ {formatCurrency(activePayslipForDownload.net_payable || activePayslipForDownload.netPayable)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '40px', position: 'relative', zIndex: 10 }}>
                            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '600' }}>
                                    This is a computer generated payslip and does not require a physical signature.
                                </p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }}>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.3' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '850', color: '#0f3a78' }}>Phone: 0821-3128831</span>
                                    <span style={{ fontSize: '12px', fontWeight: '850', color: '#0f3a78' }}>www.navabharathtechnologies.com</span>
                                    <span style={{ fontSize: '12px', fontWeight: '850', color: '#0f3a78' }}>contact@navabharathtechnologies.com</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
}
