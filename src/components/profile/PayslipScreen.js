import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import { ChevronLeft, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function PayslipScreen() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [payslipData, setPayslipData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [winWidth, setWinWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWinWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchPayslip();
    }, [user]);

    const fetchPayslip = async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const employeeId = user.id || user.employee_id;
            const res = await fetch(`${API_ENDPOINTS.PAYSLIPS_GET}?employee_id=${employeeId}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPayslipData(Array.isArray(data) ? data[0] : data);
            }
        } catch (error) { console.error('Fetch error:', error); }
        finally { setLoading(false); }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById('payslip-document');
        if (!element) return;

        try {
            // High quality scale for crisp text
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Payslip_${user?.employee_id || 'Employee'}_${new Date().getTime()}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Error generating PDF. Please try again.');
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
            <AppHeader />
            
            <main style={{ flex: 1, padding: winWidth < 768 ? '100px 10px 100px' : '100px 20px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 600 ? 'flex-start' : 'center', marginBottom: '30px', gap: '20px' }} className="no-print">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            onClick={() => navigate(-1)}
                            style={{ background: 'white', border: 'none', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                        >
                            <ChevronLeft size={20} color="#0f172a" />
                        </button>
                        <h1 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Monthly Pay Slip</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', width: winWidth < 600 ? '100%' : 'auto' }}>
                        <button onClick={handlePrint} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                            <Printer size={16} /> Print
                        </button>
                        <button 
                            onClick={handleDownloadPDF} 
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 15px', background: '#0f172a', border: 'none', color: 'white', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            <Download size={16} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Payslip Document */}
                <div id="payslip-document" style={{ background: 'white', padding: winWidth < 768 ? '30px 15px' : '50px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                    
                    {/* Corner Accents */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: winWidth < 768 ? '100px' : '150px', height: winWidth < 768 ? '70px' : '100px', background: 'linear-gradient(225deg, #1e40af 50%, transparent 50%)' }}></div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: winWidth < 768 ? '70px' : '100px', height: winWidth < 768 ? '70px' : '100px', background: 'linear-gradient(45deg, #3b82f6 50%, transparent 50%)' }}></div>

                    {/* Logo & Header */}
                    <div style={{ textAlign: 'center', marginBottom: winWidth < 768 ? '20px' : '40px' }}>
                        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
                            <img src="/assets/logo.png" alt="Company Logo" style={{ height: winWidth < 768 ? '50px' : '70px', objectFit: 'contain' }} />
                        </div>
                        <h2 style={{ fontSize: winWidth < 768 ? '22px' : '36px', fontWeight: '900', color: '#062c64', margin: '20px 0 5px', letterSpacing: '-0.5px' }}>NAVABHARATH TECHNOLOGIES</h2>
                        <p style={{ margin: 0, fontSize: winWidth < 768 ? '11px' : '14px', color: '#1e40af', fontWeight: '700' }}>Smarter Solutions for Better Future</p>
                    </div>

                    {/* Slip Month Title */}
                    <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '12px 0', textAlign: 'center', marginBottom: winWidth < 768 ? '20px' : '30px' }}>
                        <h3 style={{ margin: 0, fontSize: winWidth < 768 ? '13px' : '16px', fontWeight: '900', color: '#062c64', textTransform: 'uppercase', letterSpacing: '1px' }}>PAY SLIP FOR THE MONTH OF 4 - 2026</h3>
                    </div>

                    {/* Employee Profile Table */}
                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr 1fr' : '1fr 1fr 1fr 1fr', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                        {[
                            { label: 'EMPLOYEE CODE', value: user?.employee_id || '20253' },
                            { label: 'DEPARTMENT', value: user?.department || 'Information Technology' },
                            { label: 'EMPLOYEE NAME', value: user?.name || 'Santhosha A Doddamallappanavara' },
                            { label: 'DESIGNATION', value: user?.designation || 'Lead Software Engineer' }
                        ].map((item, idx) => (
                            <div key={idx} style={{ padding: winWidth < 768 ? '10px' : '15px', borderRight: (idx + 1) % (winWidth < 768 ? 2 : 4) === 0 ? 'none' : '1px solid #e2e8f0', borderBottom: winWidth < 768 && idx < 2 ? '1px solid #e2e8f0' : 'none' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '8px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</p>
                                <p style={{ margin: 0, fontSize: winWidth < 768 ? '10px' : '11px', fontWeight: '900', color: '#0f172a' }}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Attendance Summary Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr 1fr' : 'repeat(4, 1fr)', border: '1px solid #e2e8f0', marginBottom: winWidth < 768 ? '30px' : '40px' }}>
                        {[
                            { label: 'PRESENT DAYS', value: '0' },
                            { label: 'WEEKLY OFFS', value: '0' },
                            { label: 'PUBLIC HOLIDAYS', value: '0' },
                            { label: 'CASUAL LEAVES', value: '0' },
                            { label: 'ABSENT DAYS', value: '0' },
                            { label: 'WORK + OVERTIME', value: '0:00' },
                            { label: 'OVERTIME HOURS', value: '0:00' },
                            { label: 'REFERENCE AMOUNT', value: '0' }
                        ].map((item, idx) => (
                            <div key={idx} style={{ padding: winWidth < 768 ? '10px' : '12px 15px', borderBottom: idx < (winWidth < 768 ? 6 : 4) ? '1px solid #e2e8f0' : 'none', borderRight: (idx + 1) % (winWidth < 768 ? 2 : 4) === 0 ? 'none' : '1px solid #e2e8f0' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '8px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</p>
                                <p style={{ margin: 0, fontSize: winWidth < 768 ? '11px' : '12px', fontWeight: '900', color: '#0f172a' }}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Earning & Deduction Side-by-Side */}
                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', gap: '0', border: '1px solid #e2e8f0', marginBottom: winWidth < 768 ? '40px' : '80px' }}>
                        {/* Earning Column */}
                        <div style={{ borderRight: winWidth < 768 ? 'none' : '1px solid #e2e8f0', borderBottom: winWidth < 768 ? '1px solid #e2e8f0' : 'none' }}>
                            <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#062c64' }}>EARNING</h4>
                            </div>
                            {[
                                { name: 'Basic', value: '0' },
                                { name: 'HRA', value: '0' },
                                { name: 'Conveyance', value: '0' },
                                { name: 'Special Allowance', value: '0' },
                                { name: 'Bonus', value: '0' }
                            ].map((row, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: winWidth < 768 ? '12px' : '14px', fontWeight: '500', color: '#475569' }}>{row.name}</span>
                                    <span style={{ fontSize: winWidth < 768 ? '12px' : '14px', fontWeight: '700', color: '#0f172a' }}>{row.value}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 15px', background: '#f8fafc' }}>
                                <span style={{ fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '900', color: '#062c64' }}>Total Earning</span>
                                <span style={{ fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '900', color: '#062c64' }}>0</span>
                            </div>
                        </div>

                        {/* Deduction Column */}
                        <div>
                            <div style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#062c64' }}>DEDUCTION</h4>
                            </div>
                            {[
                                { name: 'PF', value: '0' },
                                { name: 'ESI', value: '0' },
                                { name: 'PT', value: '0' },
                                { name: 'LWF', value: '0' },
                                { name: 'Income Tax', value: '0' }
                            ].map((row, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: winWidth < 768 ? '12px' : '14px', fontWeight: '500', color: '#475569' }}>{row.name}</span>
                                    <span style={{ fontSize: winWidth < 768 ? '12px' : '14px', fontWeight: '700', color: '#0f172a' }}>{row.value}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '900', color: '#062c64' }}>Total Deduct.</span>
                                <span style={{ fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '900', color: '#062c64' }}>0</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 15px', background: '#f8fafc' }}>
                                <span style={{ fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '900', color: '#062c64' }}>Net Payable</span>
                                <span style={{ fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '900', color: '#062c64' }}>0</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Section */}
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', fontStyle: 'italic', marginBottom: '40px' }}>
                        This is a computer generated payslip and does not require a physical signature.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', textAlign: 'right', borderTop: '2px solid #062c64', paddingTop: '15px' }}>
                        <div>
                            <p style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: '900', color: '#062c64' }}>Phone: 0821-3128831</p>
                            <p style={{ margin: '0 0 5px', fontSize: '12px', fontWeight: '900', color: '#062c64' }}>www.navabharathtechnologies.com</p>
                            <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#062c64' }}>contact@navabharathtechnologies.com</p>
                        </div>
                    </div>
                </div>
            </main>
            <AppFooter />
            <style>
                {`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; padding: 0; }
                    main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                    #payslip-document { box-shadow: none !important; border: none !important; padding: 20px !important; }
                }
                `}
            </style>
        </div>
    );
}
