import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import './PMDashboard.css';
import { AlertCircle, CheckCircle, Clock, Search, Filter, Download, X, Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import logo from '../../assets/logo.png';

export default function TicketManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');
  const [manageTicket, setManageTicket] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [manageResponse, setManageResponse] = useState('');
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [usersList, setUsersList] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [downloadingId, setDownloadingId] = useState(null);

  const triggerToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
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

    container.innerHTML = `
      <div style="position: absolute; top: 0; right: 0; width: 220px; height: 220px; pointer-events: none; z-index: 1;">
        <svg viewBox="0 0 200 200" style="width: 100%; height: 100%; display: block;">
          <polygon points="200,0 20,0 200,180" fill="#1d70b8" />
          <polygon points="200,0 80,0 200,120" fill="#1e1b4b" />
          <polygon points="200,0 140,0 200,60" fill="#0ea5e9" />
        </svg>
      </div>

      <div style="position: absolute; bottom: 0; left: 0; width: 300px; height: 300px; pointer-events: none; z-index: 1;">
        <svg viewBox="0 0 300 300" style="width: 100%; height: 100%; display: block;">
          <polygon points="0,300 100,300 0,200" fill="#0056b3" />
          <polygon points="0,200 150,300 120,300 0,220" fill="#1b2559" />
          <polygon points="0,150 200,300 170,300 0,170" fill="#007bff" />
          <polygon points="0,100 250,300 220,300 0,120" fill="#1b2559" />
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
            <h2 style="font-size: 26px; font-weight: 800; color: #1b2559; text-decoration: underline; text-underline-offset: 8px; letter-spacing: 1.5px; margin: 0; text-transform: uppercase;">SERVICE LETTER</h2>
          </div>

          <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 30px;">
            Date: ${issueDateStr}
          </div>

          <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 35px; letter-spacing: 0.5px;">
            TO WHOMSOEVER IT MAY CONCERN
          </div>

          <div style="font-size: 14px; line-height: 2.0; color: #334155; display: flex; flex-direction: column; gap: 24px; text-align: justify; font-weight: 500;">
            <p style="margin: 0;">
              This is to certify that Mr./Ms. <strong>${String(details.empName).toUpperCase()}</strong> has worked with us from <strong>${formattedDoj}</strong> to <strong>${formattedLwd}</strong>, As a <strong>${details.designation}</strong>.
            </p>
          </div>

          <div style="margin-top: 50px; font-size: 14px;">
            <div style="margin-top: 20px; font-weight: 800; color: #1b2559; line-height: 1.8; letter-spacing: 0.5px;">
              <p style="margin: 0; font-size: 16px; text-transform: uppercase;">ANISH V N</p>
              <p style="margin: 0; font-size: 13px; text-transform: uppercase;">PROJECT MANAGER</p>
              <p style="margin: 0; font-size: 13px; text-transform: uppercase;">NAVABHARATH TECHNOLOGIES</p>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; align-items: flex-end; margin-bottom: 20px; z-index: 10; position: relative;">
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12px; font-weight: 800; color: #0f172a;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 30px; height: 10px; background-color: #0056b3;"></div>
              <span>Phone: 0821-3128831</span>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 30px; height: 10px; background-color: #1b2559;"></div>
              <span>www.navabharathtechnologies.com</span>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 30px; height: 10px; background-color: #007bff;"></div>
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
      pdf.save(`Service_Letter_${details.empName.replace(/\s+/g, '_')}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadCertificate = async (tRecord) => {
    if (downloadingId) return;
    const ticketId = tRecord.id || tRecord.ticket_id;
    setDownloadingId(ticketId);
    try {
      const token = user?.token || localStorage.getItem('token');
      const cleanToken = token ? token.replace(/['"]+/g, '').trim() : '';
      const empId = tRecord.user_id || tRecord.userId || tRecord.employee_id;

      const profileRes = await fetch(`${BASE_URL}/api/employee-profile/${empId}`, {
        headers: { 'Authorization': `Bearer ${cleanToken}` }
      });

      let doj = 'N/A';
      let lwd = 'N/A';
      let empName = tRecord.requester || tRecord.requester_name || tRecord.user_name || tRecord.member_name || 'Employee';
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
        const exitRes = await fetch(`${BASE_URL}/api/exit-formalities/resignation/${tRecord.id || ticketId}`, {
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
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (manageTicket || viewTicket) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, [manageTicket, viewTicket]);

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.SUPPORT_TICKETS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || data.value || data.all || []);
        const currentUserId = String(user?.employee_id || user?.id || '').split(':')[0];
        const otherTickets = list.filter(t => {
          const ticketUserId = String(t.user_id || t.userId || t.employee_id || '').split(':')[0];
          return ticketUserId !== currentUserId;
        });
        setTickets(otherTickets);
      }
    } catch (err) {
      console.error('Ticket fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        setUsersList(await response.json());
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const filteredTickets = tickets.filter(ticket => {
    const requesterName = ticket.requester || ticket.requester_name || ticket.user_name || ticket.member_name ||
      usersList.find(u => String(u.id) === String(ticket.user_id || ticket.userId || ticket.employee_id))?.name ||
      'Anonymous';

    const searchStr = `${ticket.id} ${ticket.subject} ${requesterName} ${ticket.description}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All Status' || (ticket.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'All Priority' || (ticket.priority || '').toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return { bg: '#f0fdf4', text: '#166534', border: '#bcf0da', icon: <CheckCircle size={14} /> };
      case 'in progress':
        return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', icon: <Clock size={14} /> };
      case 'open':
      case 'pending':
        return { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', icon: <AlertCircle size={14} /> };
      default:
        return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', icon: <AlertCircle size={14} /> };
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'urgent':
        return { color: '#ef4444', label: 'HIGH' };
      case 'medium':
        return { color: '#f59e0b', label: 'MEDIUM' };
      case 'low':
        return { color: '#10b981', label: 'LOW' };
      default:
        return { color: '#64748b', label: priority?.toUpperCase() || 'NORMAL' };
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const today = new Date().toLocaleString();

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('TICKET MANAGEMENT', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('TICKET PERFORMANCE REPORT', 14, 28);
    doc.text(`Generated on: ${today}`, 14, 34);

    const tableColumn = ["Ticket ID", "Subject", "Requester", "Priority", "Status", "Created At"];
    const tableRows = filteredTickets.map((t, index) => {
      let dateVal = t.created_at || t.created_date || t.timestamp || t.time_stamp;

      const formatToDDMMYYYY = (dVal) => {
        if (!dVal) return 'Unknown';
        try {
          let clean = String(dVal).trim();
          if (clean.includes('Z20')) {
            clean = clean.split('Z')[0] + 'Z';
          }
          const d = new Date(clean);
          if (isNaN(d.getTime())) {
            const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) return `${match[3]}/${match[2]}/${match[1]}`;
            return clean.split('T')[0];
          }
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        } catch (e) {
          return 'Unknown';
        }
      };

      const formattedDate = formatToDDMMYYYY(dateVal);

      const rName = t.requester || t.requester_name || t.user_name || t.member_name ||
        usersList.find(u => String(u.id) === String(t.user_id || t.userId || t.employee_id))?.name ||
        'Anonymous';

      const statusStr = String(t.status || '').toUpperCase() === 'OPEN' ? 'Pending' : (t.status || 'Pending');
      const priorityStr = (t.priority || 'NORMAL').toUpperCase();

      return [
        `#${t.id || t.ticket_id || index + 1}`,
        t.subject || t.title || 'Untitled',
        rName,
        priorityStr,
        statusStr,
        formattedDate
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [56, 99, 168], fontSize: 10, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 28 }, // Ticket ID
        1: { cellWidth: 'auto' }, // Subject
        2: { cellWidth: 40 }, // Requester
        3: { cellWidth: 22, halign: 'center' }, // Priority
        4: { cellWidth: 22, halign: 'center' }, // Status
        5: { cellWidth: 30, halign: 'center' }  // Created At
      }
    });

    doc.save(`Ticket_Management_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />

      {toast.show && (
        <div style={{
          position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 30px', borderRadius: '15px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', fontSize: '14px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <main style={{ flex: 1, padding: winWidth < 768 ? '20px 15px 120px' : '40px 26px 160px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', marginTop: '70px' }}>
        <header style={{
          marginBottom: '32px',
          display: 'flex',
          flexDirection: winWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: winWidth < 768 ? 'flex-start' : 'flex-end',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: '40px', height: '40px', borderRadius: '12px', background: 'white', border: '1.5px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = '#3863a8'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '26px' : '32px', fontWeight: '950', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-1px' }}>Ticket Management</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: winWidth < 768 ? '14px' : '15px', fontWeight: '600', lineHeight: '1.5' }}></p>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="flex-responsive-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px', flexDirection: winWidth < 768 ? 'column' : 'row' }}>
          <div style={{ display: 'flex', gap: '12px', width: winWidth < 768 ? '100%' : 'auto' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: 1, padding: '14px 16px', borderRadius: '15px', border: '2px solid #eef2f6', background: 'white', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              <option>All Status</option>
              <option value="Open">Pending</option>
              <option>Resolved</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ flex: 1, padding: '14px 16px', borderRadius: '15px', border: '2px solid #eef2f6', background: 'white', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', width: winWidth < 768 ? '100%' : 'auto' }}>
            <button
              className="btn-primary"
              onClick={handleExportPDF}
              style={{ flex: 1, background: 'white', color: '#3863a8', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '15px', fontWeight: '800' }}
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <section style={{ background: winWidth < 768 ? 'transparent' : 'white', borderRadius: '24px', border: winWidth < 768 ? 'none' : '3px solid #cbd5e1', boxShadow: winWidth < 768 ? 'none' : '0 10px 25px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          {winWidth < 768 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '20px' }}>Fetching support tickets...</div>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket, index) => {
                  const status = getStatusStyle(ticket.status);
                  const priority = getPriorityStyle(ticket.priority);
                  const requesterName = ticket.requester || ticket.requester_name || ticket.user_name || ticket.member_name ||
                    usersList.find(u => String(u.id) === String(ticket.user_id || ticket.userId || ticket.employee_id))?.name ||
                    'Anonymous';

                  const dateVal = ticket.created_at || ticket.created_date || ticket.timestamp || ticket.time_stamp;
                  const formatToDDMMYYYY = (dVal) => {
                    if (!dVal) return 'N/A';
                    let clean = String(dVal).trim();
                    if (clean.includes('Z20')) clean = clean.split('Z')[0] + 'Z';
                    if (clean.includes('-') && clean.length === 10) {
                      const parts = clean.split('-');
                      if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    if (clean.includes('T') && clean.includes('-')) {
                      const datePart = clean.split('T')[0];
                      if (datePart.length === 10) {
                        const parts = datePart.split('-');
                        if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                      }
                    }
                    const d = new Date(clean);
                    if (isNaN(d.getTime())) return clean;
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    return `${day}-${month}-${year}`;
                  };
                  const formattedDate = formatToDDMMYYYY(dateVal);

                  return (
                    <div
                      key={ticket.id || index}
                      style={{
                        background: 'white',
                        padding: '24px',
                        borderRadius: '24px',
                        border: '1.5px solid #f1f5f9',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#3863a8';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(56, 99, 168, 0.08)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#f1f5f9';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#3863a8', backgroundColor: '#f0f4ff', padding: '4px 12px', borderRadius: '8px' }}>
                          #{String(ticket.id || index + 1)}
                        </span>
                        <span style={{
                          fontSize: '10px', fontWeight: '950', padding: '6px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.5px',
                          backgroundColor: status.bg, color: status.text, border: `1px solid ${status.border}`, display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          {status.icon} {String(ticket.status || '').toUpperCase() === 'OPEN' ? 'Pending' : (ticket.status || 'Pending')}
                        </span>
                      </div>

                      <div
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setViewTicket(ticket);
                        }}
                      >
                        <div style={{ fontWeight: '900', color: '#3863a8', fontSize: '16px', marginBottom: '6px', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Click to view full subject">{ticket.subject || 'No Subject'}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.description || 'No description provided.'}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#e0e7ff', color: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '900' }}>
                          {requesterName.charAt(0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{requesterName}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Requester</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', color: priority.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priority.color }}></span>
                            {priority.label}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontWeight: '700', fontSize: '12px' }}>
                            <Clock size={12} />
                            {formattedDate}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {String(ticket.subject || '').toLowerCase().includes('service letter') && (
                            <button
                              onClick={() => handleDownloadCertificate(ticket)}
                              disabled={downloadingId === (ticket.id || ticket.ticket_id)}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                background: 'white',
                                color: '#3863a8',
                                border: '1.5px solid #cbd5e1',
                                fontWeight: '800',
                                fontSize: '12px',
                                cursor: downloadingId === (ticket.id || ticket.ticket_id) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Download size={14} />
                              {downloadingId === (ticket.id || ticket.ticket_id) ? '...' : 'Download'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setManageTicket(ticket);
                              setManageResponse(ticket.response || '');
                            }}
                            style={{ padding: '8px 16px', borderRadius: '10px', background: '#3863a8', color: 'white', border: 'none', fontWeight: '800', fontSize: '12px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(56, 99, 168, 0.2)' }}
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '24px', border: '3px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '40px', marginBottom: '20px' }}>🎫</div>
                  <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>No Tickets Found</h3>
                  <p style={{ color: '#64748b' }}>Awaiting new support requests...</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Subject</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Requester</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Priority</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Created At</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Action</th>
                    <th style={{ padding: '20px 25px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Download</th>
                  </tr>
                </thead>
                <tbody className="animate-fade-in">
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Fetching support tickets...</td></tr>
                  ) : filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket, index) => {
                      const status = getStatusStyle(ticket.status);
                      const priority = getPriorityStyle(ticket.priority);
                      return (
                        <tr key={ticket.id || index} style={{ borderBottom: '1.5px solid #f8fafc', transition: '0.2s' }}>
                          <td style={{ padding: '20px 25px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#3863a8', backgroundColor: '#f0f4ff', padding: '4px 10px', borderRadius: '8px' }}>
                              {String(ticket.id || ticket.ticket_id || index + 1)}
                            </span>
                          </td>
                          <td
                            style={{ padding: '20px 25px', cursor: 'pointer' }}
                            onClick={() => {
                              setViewTicket(ticket);
                            }}
                          >
                            <div style={{ fontWeight: '800', color: '#3863a8', fontSize: '14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Click to view full subject">{ticket.subject || 'No Subject'}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{ticket.description || 'No description provided.'}</div>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {(() => {
                                const rName = ticket.requester || ticket.requester_name || ticket.user_name || ticket.member_name ||
                                  usersList.find(u => String(u.id) === String(ticket.user_id || ticket.userId || ticket.employee_id))?.name ||
                                  'Anonymous';
                                return (
                                  <>
                                    <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: '#e0e7ff', color: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' }}>
                                      {rName.charAt(0)}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>
                                      {rName}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '900', color: priority.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: priority.color }}></span>
                              {priority.label}
                            </div>
                          </td>
                          <td style={{ padding: '20px 25px', color: '#64748b', fontWeight: '600', fontSize: '12px' }}>
                            {(() => {
                              const dateVal = ticket.created_at || ticket.created_date || ticket.timestamp || ticket.time_stamp;
                              if (!dateVal) return 'Unknown';
                              let clean = String(dateVal).trim();
                              if (clean.includes('Z20')) clean = clean.split('Z')[0] + 'Z';
                              if (clean.includes('-') && clean.length === 10) {
                                const parts = clean.split('-');
                                if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                              }
                              if (clean.includes('T') && clean.includes('-')) {
                                const datePart = clean.split('T')[0];
                                if (datePart.length === 10) {
                                  const parts = datePart.split('-');
                                  if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                                }
                              }
                              const d = new Date(clean);
                              if (isNaN(d.getTime())) return clean;
                              const day = String(d.getDate()).padStart(2, '0');
                              const month = String(d.getMonth() + 1).padStart(2, '0');
                              const year = d.getFullYear();
                              return `${day}-${month}-${year}`;
                            })()}
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <span style={{
                              fontSize: '10px', fontWeight: '900', padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px',
                              backgroundColor: status.bg, color: status.text, border: `1px solid ${status.border}`, display: 'inline-flex', alignItems: 'center', gap: '6px'
                            }}>
                              {status.icon} {String(ticket.status || '').toUpperCase() === 'OPEN' ? 'Pending' : (ticket.status || 'Pending')}
                            </span>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            <button
                              className="btn-ghost"
                              style={{ color: '#3863a8', fontWeight: '800', fontSize: '12px', padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                              onClick={() => {
                                setManageTicket(ticket);
                                setManageResponse(ticket.response || '');
                              }}
                            >
                              Manage
                            </button>
                          </td>
                          <td style={{ padding: '20px 25px' }}>
                            {String(ticket.subject || '').toLowerCase().includes('service letter') ? (
                              <button
                                className="btn-ghost"
                                style={{
                                  color: '#3863a8',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                  padding: '6px 12px',
                                  border: '1.5px solid #e2e8f0',
                                  borderRadius: '8px',
                                  cursor: downloadingId === (ticket.id || ticket.ticket_id) ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: downloadingId === (ticket.id || ticket.ticket_id) ? '#f8fafc' : 'white'
                                }}
                                disabled={downloadingId === (ticket.id || ticket.ticket_id)}
                                onClick={() => handleDownloadCertificate(ticket)}
                              >
                                <Download size={14} />
                                {downloadingId === (ticket.id || ticket.ticket_id) ? 'Downloading...' : 'Download'}
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '100px', backgroundColor: '#fcfcfd' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>🎫</div>
                        <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>No Tickets Found</h3>
                        <p style={{ color: '#64748b' }}>Awaiting new support requests...</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <AppFooter />

      {/* MANAGE TICKET MODAL */}
      {manageTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-zoom-in" style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '100%', maxWidth: '550px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '3px solid #cbd5e1', position: 'relative' }}>

            <button
              onClick={() => setManageTicket(null)}
              style={{ position: 'absolute', right: '25px', top: '25px', width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>Manage Ticket</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0', fontWeight: '700' }}>#{manageTicket.id || 'TICKET'}</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9', marginBottom: '30px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Original Request</span>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px 0' }}>{manageTicket.subject || 'No Subject'}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>{manageTicket.description || 'No description provided.'}</p>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '15px' }}>Action Taken / Response</span>
              <textarea
                value={manageResponse}
                onChange={(e) => setManageResponse(e.target.value)}
                placeholder="Type your resolution or update here..."
                style={{
                  width: '100%', height: '140px', padding: '20px', borderRadius: '20px', border: '1.5px solid #e2e8f0', background: 'white',
                  fontSize: '14px', color: '#1e293b', fontWeight: '500', outline: 'none', resize: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#1d4ed8'; e.target.style.boxShadow = '0 0 0 4px rgba(29, 78, 216, 0.05)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '15px' }}>
              <button
                onClick={() => setManageTicket(null)}
                style={{ padding: '16px', borderRadius: '15px', background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', fontWeight: '800', cursor: 'pointer', fontSize: '14px', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#94a3b8'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!manageResponse.trim()) return;
                  const ticketId = manageTicket.id || manageTicket.ticket_id || manageTicket.ticket_number;
                  try {
                    const res = await fetch(`${API_ENDPOINTS.SUPPORT_TICKETS}/${encodeURIComponent(ticketId)}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                      body: JSON.stringify({
                        id: ticketId,
                        ticket_id: ticketId,
                        action: manageResponse,
                        response: manageResponse,
                        status: 'Resolved'
                      })
                    });
                    if (res.ok) {
                      triggerToast('Action submitted successfully');
                      setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_id === ticketId) ? { ...t, action: manageResponse, response: manageResponse, status: 'Resolved' } : t));
                      setManageTicket(null);
                      setManageResponse('');
                    } else {
                      // Fallback for different API structure
                      await fetch(`${API_ENDPOINTS.SUPPORT_TICKETS}/${encodeURIComponent(ticketId)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                        body: JSON.stringify({
                          id: ticketId,
                          ticket_id: ticketId,
                          action: manageResponse,
                          response: manageResponse,
                          status: 'Resolved'
                        })
                      });
                      triggerToast('Action submitted successfully');
                      setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_id === ticketId) ? { ...t, action: manageResponse, response: manageResponse, status: 'Resolved' } : t));
                      setManageTicket(null);
                      setManageResponse('');
                    }
                  } catch (err) {
                    console.error('Response submission error:', err);
                    triggerToast('Failed to submit action', 'error');
                  }
                }}
                disabled={!manageResponse.trim()}
                style={{
                  padding: '16px', borderRadius: '15px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: '800',
                  cursor: manageResponse.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: manageResponse.trim() ? '0 10px 15px -3px rgba(59, 130, 246, 0.3)' : 'none', opacity: manageResponse.trim() ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}
              >
                <Send size={18} /> Submit Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TICKET MODAL */}
      {viewTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-zoom-in" style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '100%', maxWidth: '550px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '3px solid #cbd5e1', position: 'relative' }}>

            <button
              onClick={() => setViewTicket(null)}
              style={{ position: 'absolute', right: '25px', top: '25px', width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <MessageCircle size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>View Ticket</h2>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0', fontWeight: '700' }}>#{viewTicket.id || 'TICKET'}</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>Original Request</span>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '0 0 6px 0' }}>{viewTicket.subject || 'No Subject'}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{viewTicket.description || 'No description provided.'}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-zoom-in { animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .btn-ghost:hover { background-color: #f8fafc; border-color: #3863a8; }
      `}</style>
    </div>
  );
}
