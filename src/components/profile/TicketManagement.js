import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './PMDashboard.css';
import { AlertCircle, CheckCircle, Clock, Search, Filter, Download, X, Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
        setTickets(list);
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

      <main style={{ flex: 1, padding: winWidth < 768 ? '20px 15px' : '40px 26px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', marginTop: '70px' }}>
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
          <div style={{ display: 'flex', gap: '12px', width: winWidth < 768 ? '100%' : 'auto' }}>
            <button
              className="btn-primary"
              onClick={handleExportPDF}
              style={{ flex: 1, background: 'white', color: '#3863a8', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <Download size={16} /> Export
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex-responsive-stack" style={{ marginBottom: '32px', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', width: winWidth < 768 ? '100%' : 'auto' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: 1, padding: '14px 16px', borderRadius: '15px', border: '2px solid #eef2f6', background: 'white', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
            >
              <option>All Status</option>
              <option value="Open">Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
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
                  </tr>
                </thead>
                <tbody className="animate-fade-in">
                  {loading ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Fetching support tickets...</td></tr>
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
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '100px', backgroundColor: '#fcfcfd' }}>
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
                      setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_id === ticketId) ? { ...t, action: manageResponse, response: manageResponse, status: 'Resolved' } : t));
                      setManageTicket(null);
                      setManageResponse('');
                    }
                  } catch (err) {
                    console.error('Response submission error:', err);
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
