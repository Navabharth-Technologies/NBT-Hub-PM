import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Send, History, ArrowLeft, CheckCircle, Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { motion, AnimatePresence } from 'framer-motion';

const BackButton = ({ onClick }) => {
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = winWidth < 768;

  if (!onClick) return null;

  return (
    <motion.button
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        width: isMobile ? '36px' : '45px',
        height: isMobile ? '36px' : '45px',
        borderRadius: isMobile ? '12px' : '15px',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #f1f5f9',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        flexShrink: 0,
        padding: 0,
        outline: 'none'
      }}
    >
      <ArrowLeft size={isMobile ? 18 : 20} color="#0f172a" strokeWidth={2.5} />
    </motion.button>
  );
};

export default function RaiseTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;

  const sanitizeId = (id) => String(id || '').split(':')[0];

  // Form State
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  // Custom Modal Alert State
  const [modalConfig, setModalConfig] = useState({ show: false, message: '', type: 'success' });

  const showModal = (message, type = 'success') => {
    setModalConfig({ show: true, message, type });
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    setDepartments(['Service letter', 'Payroll issues', 'payslips', 'ID card issues', 'Technical', 'HR']);
    setDepartment('');
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user?.id && !user?.employee_id) return;
    try {
      const token = localStorage.getItem('token');
      const sid = sanitizeId(user.employee_id || user.id);
      const emailVal = user?.email || '';
      const resp = await fetch(`${API_ENDPOINTS.SUPPORT_TICKETS}?userId=${sid}&employee_id=${sid}&email=${emailVal}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        setTickets(Array.isArray(data) ? data : (data.data || []));
      } else {
        setTickets([]);
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
      setTickets([]);
    }
  };

  const handleSubmit = async () => {
    if (!department) return showModal("Please select Category", "error");
    if (!subject.trim() || !description.trim()) return showModal("Please fill all fields", "error");
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const sid = sanitizeId(user.employee_id || user.id);
      const resp = await fetch(API_ENDPOINTS.SUPPORT_TICKETS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: sid,
          employee_id: user?.employee_id || sid,
          email: user?.email || '',
          name: user?.name || user?.employee_name || 'Unknown',
          employee_name: user?.name || user?.employee_name || user?.username || 'Unknown',
          subject: `[${department}] ${subject}`,
          description,
          priority,
          department,
          category: department
        })
      });
      if (resp.ok) {
        setSubject('');
        setDescription('');
        setDepartment('');
        fetchTickets();
        showModal("Ticket submitted successfully!", "success");
      } else {
        const errData = await resp.json().catch(() => ({}));
        showModal(errData.message || "Failed to submit ticket", "error");
      }
    } catch (err) {
      console.error("Submit ticket error:", err);
      showModal("Network error occurred while submitting ticket", "error");
    } finally {
      setLoading(false);
    }
  };

  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const s = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#eaeff2',
      paddingTop: winWidth < 768 ? '100px' : '120px',
      paddingBottom: '20px',
      fontFamily: "'Outfit', sans-serif"
    },
    main: {
      padding: isMobile ? '0 16px' : '0 26px'
    },
    backBtn: {
      padding: '0',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      marginBottom: '20px'
    },

    // FORM STYLES
    formCard: {
      backgroundColor: 'white',
      borderRadius: '32px',
      padding: winWidth < 768 ? '25px' : '50px',
      boxShadow: '0 15px 35px rgba(15, 23, 42, 0.08)',
      border: '1px solid #f1f5f9',
      marginBottom: '40px'
    },
    formHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '40px'
    },
    iconBox: {
      width: '56px',
      height: '56px',
      borderRadius: '18px',
      backgroundColor: '#fff7ed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f97316'
    },
    title: {
      fontSize: '28px',
      fontWeight: '900',
      color: '#0f172a',
      margin: '0 0 4px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      fontWeight: '600',
      margin: '0'
    },

    label: {
      fontSize: '11px',
      fontWeight: '900',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '15px',
      display: 'block'
    },
    input: {
      width: '100%',
      padding: '18px 24px',
      borderRadius: '20px',
      backgroundColor: '#f8fafc',
      border: '1.5px solid #f1f5f9',
      fontSize: '15px',
      color: '#0f172a',
      fontWeight: '600',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '30px'
    },
    selectInput: {
      width: '100%',
      padding: '18px 24px',
      borderRadius: '20px',
      backgroundColor: '#f8fafc',
      border: '1.5px solid #f1f5f9',
      fontSize: '15px',
      color: '#0f172a',
      fontWeight: '600',
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '30px',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230f172a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 24px center',
      backgroundSize: '16px',
      cursor: 'pointer'
    },
    textarea: {
      width: '100%',
      padding: '24px',
      borderRadius: '25px',
      backgroundColor: '#f8fafc',
      border: '1.5px solid #f1f5f9',
      fontSize: '15px',
      color: '#0f172a',
      fontWeight: '600',
      outline: 'none',
      boxSizing: 'border-box',
      minHeight: '180px',
      marginBottom: '30px',
      resize: 'none'
    },

    priorityGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: '15px',
      marginBottom: '40px'
    },
    priorityTab: (active) => ({
      padding: '16px',
      borderRadius: '16px',
      border: active ? 'none' : '1.5px solid #f1f5f9',
      backgroundColor: active ? '#0f172a' : 'white',
      color: active ? 'white' : '#0f172a',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }),

    submitBtn: {
      width: '100%',
      padding: '20px',
      borderRadius: '20px',
      backgroundColor: '#0f172a',
      color: 'white',
      border: 'none',
      fontSize: '15px',
      fontWeight: '800',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
      transition: 'transform 0.2s'
    },

    // LIST STYLES
    recentHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '25px'
    },
    recentTitle: {
      fontSize: '22px',
      fontWeight: '900',
      color: '#0f172a',
      margin: '0'
    },
    ticketItem: {
      backgroundColor: 'white',
      borderRadius: '24px',
      padding: '24px 35px',
      border: '1px solid #f1f5f9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      transition: 'all 0.3s ease'
    },
    tID: {
      fontSize: '12px',
      fontWeight: '800',
      color: '#0f172a',
      marginBottom: '6px'
    },
    tSubject: {
      fontSize: '16px',
      fontWeight: '900',
      color: '#0f172a',
      marginBottom: '6px'
    },
    tMeta: {
      fontSize: '13px',
      color: '#94a3b8',
      fontWeight: '600'
    },
    statusBadge: {
      padding: '8px 18px',
      borderRadius: '12px',
      backgroundColor: '#f0fdf4',
      color: '#16a34a',
      fontSize: '11px',
      fontWeight: '900',
      textTransform: 'uppercase'
    }
  };

  return (
    <div style={s.container}>
      <AppHeader />
      <div style={s.main}>
        {/* BACK BUTTON */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <BackButton onClick={() => navigate(-1)} />
        </div>

        {/* TICKET FORM */}
        <div style={s.formCard}>
          <div style={s.formHeader}>
            <div style={s.iconBox}><AlertTriangle size={28} /></div>
            <div>
              <h1 style={s.title}>Ticket Support</h1>
              <p style={s.subtitle}>Describe your issue and we'll resolve it swiftly.</p>
            </div>
          </div>

          <label style={s.label}>Department / Category</label>
          <select style={s.selectInput} value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">Please select Category</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <label style={s.label}>Issue Subject</label>
          <input style={s.input} placeholder="e.g., Access Denied to HR Portal" value={subject} onChange={e => setSubject(e.target.value)} />

          <label style={s.label}>Detailed Description</label>
          <textarea style={s.textarea} placeholder="Provide as much context as possible..." value={description} onChange={e => setDescription(e.target.value)} />

          <label style={s.label}>Priority Level</label>
          <div style={s.priorityGrid}>
            {priorities.map(p => (
              <div key={p} style={s.priorityTab(priority === p)} onClick={() => setPriority(p)}>{p}</div>
            ))}
          </div>

          <button
            style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
            onClick={handleSubmit}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(0.99)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? "Processing..." : (
              <>
                <Send size={18} /> Submit Issue Securely
              </>
            )}
          </button>
        </div>

        {/* RECENT ACTIVITY */}
        <div style={s.recentHeader}>
          <History size={24} color="#0f172a" />
          <h2 style={s.recentTitle}>Your Recent Support Tickets</h2>
        </div>

        <div style={s.recentList}>
          {tickets.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'white', borderRadius: '24px', color: '#94a3b8', fontWeight: '700', border: '1px solid #f1f5f9' }}>
              no recent support tickets found in your history.
            </div>
          ) : tickets.map(ticket => {
            let displayCategory = ticket.category || ticket.department || 'SUPPORT';
            let displaySubject = ticket.subject;

            if (displaySubject && displaySubject.startsWith('[')) {
              const closeBracketIndex = displaySubject.indexOf(']');
              if (closeBracketIndex !== -1) {
                displayCategory = displaySubject.substring(1, closeBracketIndex);
                displaySubject = displaySubject.substring(closeBracketIndex + 1).trim();
              }
            }

            return (
              <div key={ticket.id || ticket._id} style={s.ticketItem}>
                <div>
                  <div style={s.tID}>#{ticket.id || ticket._id}</div>
                  <div style={s.tSubject}>{displaySubject}</div>
                  <div style={{ ...s.tMeta, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '15px' : '30px', marginTop: '10px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {displayCategory}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        const rawDate = ticket.created_at || ticket.createdAt || ticket.timestamp || ticket.date || ticket.applied_on;
                        if (!rawDate) return 'N/A';
                        try {
                          const datePart = String(rawDate).split('T')[0].split(' ')[0];
                          const parts = datePart.split('-');
                          if (parts.length === 3) {
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          return datePart;
                        } catch (e) {
                          return 'N/A';
                        }
                      })()}
                      <span style={{ color: isMobile ? '#0f172a' : '#cbd5e1' }}>{isMobile ? '—' : '|'}</span>
                      {ticket.priority}
                    </span>
                    {ticket.action && (
                      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', marginRight: '4px' }}>ACTION:</span> {ticket.action}
                      </span>
                    )}
                    {(ticket.reply || ticket.hr_reply || ticket.response || ticket.resolution || ticket.remarks) && (
                      <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', marginTop: isMobile ? '5px' : '0' }}>
                        <span style={{ fontWeight: '800', marginRight: '4px' }}>HR REPLY:</span> 
                        {ticket.reply || ticket.hr_reply || ticket.response || ticket.resolution || ticket.remarks}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {(() => {
                    const statusUp = String(ticket.status || '').toUpperCase();
                    const isVerified = statusUp === 'APPROVED' || statusUp === 'RESOLVED' || statusUp === 'VERIFIED' ||
                      String(ticket.verify || '').toLowerCase() === 'verified';
                    return (
                      <div style={{
                        ...s.statusBadge,
                        backgroundColor: isVerified ? '#f0fdf4' : '#fffbeb',
                        color: isVerified ? '#16a34a' : '#d97706'
                      }}>
                        {isVerified ? 'Resolved' : 'PENDING'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <AppFooter />

      {/* Alert Modal Popup */}
      <AnimatePresence>
        {modalConfig.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999
            }}
            onClick={() => setModalConfig({ ...modalConfig, show: false })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              style={{
                backgroundColor: 'white',
                width: '90%',
                maxWidth: '400px',
                borderRadius: '30px',
                padding: '40px',
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                boxSizing: 'border-box'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '20px',
                  backgroundColor: modalConfig.type === 'success' ? '#dcfce7' : '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 25px'
                }}
              >
                {modalConfig.type === 'success' ? (
                  <CheckCircle size={30} color="#22c55e" />
                ) : (
                  <Info size={30} color="#ef4444" />
                )}
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '1000', color: '#0f172a' }}>
                {modalConfig.type === 'success' ? 'Submitted!' : 'Attention Needed'}
              </h3>
              <p style={{ margin: '0 0 25px 0', fontSize: '15px', color: '#64748b', fontWeight: '800', lineHeight: '1.5' }}>
                {modalConfig.message}
              </p>
              <button
                onClick={() => setModalConfig({ ...modalConfig, show: false })}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: '#0f172a',
                  color: 'white',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
              >
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
