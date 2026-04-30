import React, { useState, useEffect } from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './PMDashboard.css';
import { AlertCircle, CheckCircle, Clock, Search, Filter, Download, X, Send, MessageCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TicketManagement() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');
  const [manageTicket, setManageTicket] = useState(null);
  const [manageResponse, setManageResponse] = useState('');
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    doc.text('TITAN SUPPORT HUB', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('OFFICIAL TICKET PERFORMANCE REPORT', 14, 28);
    doc.text(`Generated on: ${today}`, 14, 34);

    const tableColumn = ["Ticket ID", "Subject", "Requester", "Priority", "Status", "Created At"];
    const tableRows = filteredTickets.map(t => {
      let dateVal = t.created_at || t.created_date || t.timestamp || t.time_stamp;
      
      // Handle cases where the date might be doubled/concatenated in the DB
      if (typeof dateVal === 'string' && dateVal.includes('Z20')) {
        dateVal = dateVal.split('Z')[0] + 'Z';
      }

      const parsedDate = dateVal ? new Date(dateVal) : null;
      const formattedDate = (parsedDate && !isNaN(parsedDate.getTime())) 
        ? parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') 
        : (dateVal ? String(dateVal).split('T')[0] : 'N/A');
      
      const rName = t.requester || t.requester_name || t.user_name || t.member_name || 
                   usersList.find(u => String(u.id) === String(t.user_id || t.userId || t.employee_id))?.name || 
                   'Anonymous';

      return [
        t.id || t.ticket_id || 'N/A',
        t.subject || t.title || 'Untitled',
        rName,
        t.priority || 'Normal',
        t.status || 'Open',
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
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Titan_Ticket_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      
      <main style={{ flex: 1, padding: winWidth < 768 ? '20px 15px' : '40px', maxWidth: '100%', width: '100%', boxSizing: 'border-box', marginTop: '70px' }}>
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '900', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-1px' }}>Ticket Management</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '15px', fontWeight: '500' }}>Review and resolve support tickets from across the organization</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
               className="btn-primary" 
               onClick={handleExportPDF}
               style={{ background: 'white', color: '#3863a8', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}
             >
               <Download size={16} /> Export Report
             </button>
             <button className="btn-primary" onClick={() => fetchTickets()}>Refresh Feed</button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex-responsive-stack" style={{ marginBottom: '32px', gap: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
             <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={18} />
             <input 
               type="text" 
               placeholder="Search by ID, Subject, or Requester..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '15px', border: '2.5px solid #eef2f6', background: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
             />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '14px 20px', borderRadius: '15px', border: '2.5px solid #eef2f6', background: 'white', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
            >
                <option>All Status</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
                <option>Closed</option>
            </select>
            <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ padding: '14px 20px', borderRadius: '15px', border: '2.5px solid #eef2f6', background: 'white', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
            >
                <option>All Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
            </select>
          </div>
        </div>

        <section style={{ background: 'white', borderRadius: '24px', border: '1.5px solid #f1f5f9', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
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
                        <td style={{ padding: '20px 25px' }}>
                          <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px', maxWidth: '300px' }}>{ticket.subject || ticket.title || 'No Subject'}</div>
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
                            let dateVal = ticket.created_at || ticket.created_date || ticket.timestamp || ticket.time_stamp;
                            if (!dateVal) return 'Unknown';
                            
                            // Handle cases where the date might be doubled/concatenated in the DB
                            if (typeof dateVal === 'string' && dateVal.includes('Z20')) {
                              dateVal = dateVal.split('Z')[0] + 'Z';
                            }

                            const parsedDate = new Date(dateVal);
                            if (isNaN(parsedDate.getTime())) return String(dateVal).split('T')[0]; // Fallback to YYYY-MM-DD
                            
                            return parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
                          })()}
                        </td>
                        <td style={{ padding: '20px 25px' }}>
                          <span style={{ 
                            fontSize: '10px', fontWeight: '900', padding: '6px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px',
                            backgroundColor: status.bg, color: status.text, border: `1px solid ${status.border}`, display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}>
                            {status.icon} {ticket.status || 'Open'}
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
        </section>
      </main>

      <AppFooter />
      
      {/* MANAGE TICKET MODAL */}
      {manageTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-zoom-in" style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', position: 'relative' }}>
            
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
                        response: manageResponse,
                        status: 'Resolved'
                      })
                    });
                    if (res.ok) {
                      setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_id === ticketId) ? { ...t, response: manageResponse, status: 'Resolved' } : t));
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
                          response: manageResponse, 
                          status: 'Resolved' 
                        })
                      });
                      setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_id === ticketId) ? { ...t, response: manageResponse, status: 'Resolved' } : t));
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
