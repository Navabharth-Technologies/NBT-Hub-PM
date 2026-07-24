import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Bell, X, Zap, Award, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

const formatDateToDDMMYYYY = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatReadableDatesInString = (str) => {
  if (!str) return '';
  
  let res = str;

  // 1. Convert YYYY-MM-DD to DD-MM-YYYY (e.g., 2026-06-08 to 08-06-2026)
  res = res.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, yyyy, mm, dd) => {
    return `${dd}-${mm}-${yyyy}`;
  });

  // 2. Convert standard JS Date strings
  const jsDateRegex = /[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{4} \d{2}:\d{2}:\d{2}(?: GMT[+-]\d{1,4}(?::\d{2})?(?: \([^)]+\))?)?/g;
  res = res.replace(jsDateRegex, (match) => {
    const cleanMatch = match.replace(/GMT[+-]\d{1,4}(?::\d{2})?(?: \([^)]+\))?/g, '').trim();
    const d = new Date(cleanMatch);
    return isNaN(d.getTime()) ? match : formatDateToDDMMYYYY(d);
  });

  // 3. Convert ISO timestamps
  const isoDateRegex = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g;
  res = res.replace(isoDateRegex, (match) => {
    const d = new Date(match);
    return isNaN(d.getTime()) ? match : formatDateToDDMMYYYY(d);
  });

  res = res.replace(/GMT[+-]\d{1,4}(?::\d{2})?(?: \([^)]+\))?/g, '').trim();
  return res;
};

// Calculate where to place the notification panel so it's always inside viewport
const calcPanelPosition = (iconRect, winWidth, winHeight, isMobile) => {
  const PANEL_W = isMobile ? Math.min(winWidth - 20, 340) : 360;
  const GAP = 12;

  const headerEl = document.querySelector('.app-header-container');
  const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : (isMobile ? 70 : 85);
  const footerEl = document.querySelector('.app-footer-wrapper');
  const footerTop = footerEl ? footerEl.getBoundingClientRect().top : winHeight - (isMobile ? 58 : 74);

  const spaceAbove = iconRect.top - headerBottom - GAP;
  const spaceBelow = footerTop - iconRect.bottom - GAP;

  const openBelow = spaceAbove < spaceBelow;

  const maxPanelH = openBelow
    ? Math.max(160, Math.min(420, spaceBelow))
    : Math.max(160, Math.min(420, spaceAbove));

  let panelRight = winWidth - iconRect.right;
  if (iconRect.right - PANEL_W < 8) {
    panelRight = winWidth - PANEL_W - 8;
  }

  const panelTop = openBelow ? iconRect.bottom + GAP : iconRect.top - maxPanelH - GAP;

  return { openBelow, maxPanelH, panelRight: Math.max(8, panelRight), panelTop, PANEL_W };
};

const TaskNotification = ({ onOpenTask }) => {
  const { user } = useAuth();
  const dragControls = useDragControls();
  const iconRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [expandedNotifs, setExpandedNotifs] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(() => {
    const saved = localStorage.getItem('nbt_dismissed_notifs');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [readIds, setReadIds] = useState(() => {
    try {
      const uid = user?.employee_id || user?.id || user?.EmpID || 'hr';
      return new Set(JSON.parse(localStorage.getItem(`read_hr_notifs_${uid}`)) || []);
    } catch { return new Set(); }
  });

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [winHeight, setWinHeight] = useState(window.innerHeight);
  const [dragConstraints, setDragConstraints] = useState({ left: -2000, right: 0, top: -2000, bottom: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ openBelow: false, maxPanelH: 420, panelRight: 10, panelTop: 0, PANEL_W: 360 });

  const isMobile = winWidth < 768;

  const markAsRead = async (id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      const uid = user?.employee_id || user?.id || user?.EmpID || 'hr';
      localStorage.setItem(`read_hr_notifs_${uid}`, JSON.stringify([...next].slice(-100)));
      return next;
    });
    try {
      if (user?.token) {
        await fetch(API_ENDPOINTS.NOTIFICATION_MARK_READ(id), {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  // Auto-dismiss visited notifications
  useEffect(() => {
    const path = location.pathname;
    setNotifications(prev => prev.filter(n => {
      const combine = (n.description || '').toLowerCase() + (n.title || '').toLowerCase();
      if (!n.isNew) return true;
      if (path.includes('/attendance') && combine.includes('leave')) return false;
      if (path.includes('/tickets') && combine.includes('ticket')) return false;
      if (path.includes('/threads') && combine.includes('thread')) return false;
      if (path.includes('/resignation-history') && combine.includes('resignation')) return false;
      if ((path.includes('/admin/certificates') || path.includes('/experience-letter-requests')) && combine.includes('certificate')) return false;
      if (path.includes('/job-applications') && combine.includes('job')) return false;
      if (path.includes('/assets') && combine.includes('asset')) return false;
      if (path.includes('/performance') && combine.includes('performance')) return false;
      if (path.includes('/courses') && combine.includes('course')) return false;
      if (path.includes('/awards') && combine.includes('award')) return false;
      if (path.includes('/new-joinees') && (combine.includes('joinee') || n.isBlockedAlert)) return false;
      return true;
    }));
  }, [location.pathname, dismissedIds]);

  // Disable text selection while dragging
  useEffect(() => {
    document.body.style.userSelect = isDragging ? 'none' : '';
    document.body.style.webkitUserSelect = isDragging ? 'none' : '';
    return () => { document.body.style.userSelect = ''; document.body.style.webkitUserSelect = ''; };
  }, [isDragging]);

  // Compute drag constraints (icon stays between header-bottom and footer-top)
  const updateDragConstraints = useCallback(() => {
    const mbl = window.innerWidth < 768;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const iconW = mbl ? 50 : 60;
    const iconH = mbl ? 110 : 60;

    let iconLeft = W - (mbl ? 10 : 30) - iconW;
    let iconTop  = H - (mbl ? 15 : 20) - iconH;
    if (iconRef.current) {
      const r = iconRef.current.getBoundingClientRect();
      iconLeft = r.left;
      iconTop  = r.top;
    }

    const headerEl = document.querySelector('.app-header-container');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : (mbl ? 70 : 85);
    const footerEl = document.querySelector('.app-footer-wrapper');
    const footerTop = footerEl ? footerEl.getBoundingClientRect().top : H - (mbl ? 58 : 74);

    const PAD = 6;
    setDragConstraints({
      top:    (headerBottom + PAD) - iconTop,
      bottom: (footerTop - iconH - PAD) - iconTop,
      left:   PAD - iconLeft,
      right:  (W - iconW - PAD) - iconLeft,
    });
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const ps = calcPanelPosition(rect, window.innerWidth, window.innerHeight, window.innerWidth < 768);
    setPanelStyle(ps);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { updateDragConstraints(); updatePanelPosition(); }, 120);
    return () => clearTimeout(t);
  }, [location.pathname, winWidth, winHeight, updateDragConstraints, updatePanelPosition]);

  useEffect(() => {
    const handleResize = () => {
      setWinWidth(window.innerWidth);
      setWinHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) updatePanelPosition();
  }, [isOpen, updatePanelPosition]);

  const syncNotifications = async () => {
    if (!user?.token) return;
    try {
      const uid = user.employee_id || user.id || user.EmpID;
      const response = await fetch(API_ENDPOINTS.NOTIFICATIONS_BY_USER(uid), {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      const aggregatedMap = new Map();
      const parseDate = (d) => {
        if (!d) return new Date();
        // The MSSQL driver adds +5:30 to IST-stored datetimes, producing an ISO UTC string
        // where the UTC components are actually the correct IST time. Strip timezone
        // marker and parse as local to display the correct IST time.
        const clean = String(d).replace(/Z|GMT.*|[+-]\d{2}:?\d{2}$/gi, '').trim();
        const r = new Date(clean);
        return isNaN(r.getTime()) ? new Date() : r;
      };
      const savedRead = JSON.parse(localStorage.getItem(`read_hr_notifs_${uid}`) || '[]');
      const readSet = new Set(savedRead);
      list.forEach(n => {
        const descText = n.message || n.description || '';
        const rawTitle = n.title || '';
        const dL = descText.toLowerCase();
        const tL = rawTitle.toLowerCase();
        let displayTitle = '';
        if (n.isBlockedAlert) displayTitle = 'ACCESS BLOCKED';
        else if (dL.includes('leave') || tL.includes('leave')) displayTitle = 'LEAVE REQUEST';
        else if (dL.includes('resignation') || tL.includes('resignation') || dL.includes('exit formalities') || tL.includes('exit formalities') || (n.type && n.type.toUpperCase() === 'RESIGNATION')) displayTitle = 'Resignation Updates';
        else if (dL.includes('certificate') || tL.includes('certificate')) displayTitle = 'SERVICE CERTIFICATE';
        else if (dL.includes('job') || tL.includes('job')) displayTitle = 'JOB APPLICATION';
        else if (dL.includes('task') || tL.includes('task')) displayTitle = 'TASK ASSIGNMENT';
        else if (dL.includes('ticket') || tL.includes('ticket')) displayTitle = 'SUPPORT TICKET';
        else if (dL.includes('asset') || tL.includes('asset')) displayTitle = 'ASSET ALLOCATION';
        else if (dL.includes('performance') || tL.includes('performance')) displayTitle = 'PERFORMANCE REVIEW';
        else if (dL.includes('course') || tL.includes('course')) displayTitle = 'COURSE ENROLLMENT';
        else if (dL.includes('award') || tL.includes('award') || dL.includes('recognition') || tL.includes('recognition')) displayTitle = 'AWARDS & RECOGNITION';
        else if (dL.includes('quiz') || tL.includes('quiz')) displayTitle = 'QUIZ CHALLENGE';
        else displayTitle = (rawTitle || n.type || 'NOTIFICATION').toUpperCase();

        const notif = {
          id: n.id || `notif-${Math.random()}`,
          title: displayTitle,
          description: formatReadableDatesInString(descText),
          rawDate: parseDate(n.created_at || n.timestamp),
          isNew: (n.is_read === 0 || n.is_read === false || !n.is_read) && !readSet.has(n.id),
          type: n.type || 'system',
          isBlockedAlert: n.isBlockedAlert || false,
          referenceId: n.reference_id || n.related_id || n.target_id || n.item_id || n.entity_id || n.leave_id || n.ticket_id || null,
          rawItem: n
        };
        const key = `${notif.id}|${notif.title}|${notif.description}`.toLowerCase().trim();
        if (!aggregatedMap.has(key)) aggregatedMap.set(key, notif);
      });
      const finalMapped = Array.from(aggregatedMap.values())
        .sort((a, b) => b.rawDate - a.rawDate)
        .map(n => ({
          ...n,
          time: n.rawDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          date: formatDateToDDMMYYYY(n.rawDate)
        }));
      setNotifications(finalMapped);
      if (finalMapped.some(n => n.isNew) && !isOpen) setHasUnread(true);
    } catch (err) {
      console.error('Unified Notification Sync Error:', err);
    }
  };

  useEffect(() => {
    localStorage.setItem('nbt_dismissed_notifs', JSON.stringify([...dismissedIds]));
  }, [dismissedIds]);

  useEffect(() => {
    syncNotifications();
    const poll = setInterval(syncNotifications, 15000);
    return () => clearInterval(poll);
  }, [user, dismissedIds, readIds]);

  const handleNotifClick = (notif) => {
    const desc  = (notif.description || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    let path = '/';
    if (notif.isBlockedAlert)                                               path = '/new-joinees#blocked';
    else if (desc.includes('leave')  || title.includes('leave'))            path = '/leaves';
    else if (desc.includes('resignation') || title.includes('resignation')) path = '/resignation-history';
    else if (desc.includes('certificate') || title.includes('certificate')) path = '/experience-letter-requests';
    else if (desc.includes('job')    || title.includes('job'))              path = '/job-applications';
    else if (desc.includes('ticket') || title.includes('ticket'))           path = '/tickets';
    else if (desc.includes('asset')  || title.includes('asset'))            path = '/assets';
    else if (desc.includes('performance') || title.includes('performance')) path = '/performance';
    else if (desc.includes('course') || title.includes('course'))           path = '/courses';
    else if (desc.includes('award')  || title.includes('award') || desc.includes('recognition')) path = '/awards';
    else if (desc.includes('quiz') || title.includes('quiz'))               path = '/quiz';
    else if (onOpenTask) { onOpenTask(); path = ''; }
    else path = '/alerts';

    markAsRead(notif.id);
    if (path) navigate(path);
    setIsOpen(false);
    setHasUnread(false);
  };

  const { openBelow, maxPanelH, panelRight, panelTop, PANEL_W } = panelStyle;

  return (
    <>
      {/* ── Notification Panel: position:fixed, always inside viewport ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: openBelow ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openBelow ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: panelTop,
              right: panelRight,
              width: PANEL_W,
              maxHeight: maxPanelH,
              zIndex: 6000,
              background: 'white',
              borderRadius: isMobile ? '20px' : (openBelow ? '4px 28px 28px 28px' : '28px 4px 28px 28px'),
              boxShadow: '0 30px 70px rgba(0,0,0,0.22)',
              border: '1.5px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: 'auto',
            }}
          >
            {/* Header bar */}
            <div style={{ padding: '18px 20px', background: '#3B5998', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={20} fill="white" />
                <span style={{ fontWeight: '1000', fontSize: '14px', letterSpacing: '0.5px' }}>NOTIFICATIONS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={async () => {
                    const allIds = notifications.map(n => n.id);
                    setDismissedIds(prev => new Set([...prev, ...allIds]));
                    setReadIds(prev => {
                      const next = new Set(prev);
                      allIds.forEach(id => next.add(id));
                      const uid = user?.employee_id || user?.id || user?.EmpID || 'hr';
                      localStorage.setItem(`read_hr_notifs_${uid}`, JSON.stringify([...next].slice(-100)));
                      return next;
                    });
                    setHasUnread(false);
                    try {
                      if (user?.token) {
                        const uid = user?.employee_id || user?.id || user?.EmpID;
                        await fetch(API_ENDPOINTS.NOTIFICATIONS_READ_ALL(uid), {
                          method: 'PUT',
                          headers: { 'Authorization': `Bearer ${user.token}` }
                        });
                      }
                    } catch (err) {
                      console.error('Failed to mark all read', err);
                    }
                  }}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '10px', fontWeight: '1000' }}
                >
                  MARK ALL READ
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc' }}>
              {notifications.length > 0 ? notifications.map((notif) => (
                <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '1000', color: '#94a3b8', marginLeft: '4px', marginBottom: '2px' }}>
                    {notif.date} at {notif.time}
                  </div>
                  <div
                    onClick={() => handleNotifClick(notif)}
                    style={{ background: notif.isNew ? '#f0f7ff' : '#ffffff', padding: '14px', borderRadius: '18px', border: notif.isNew ? '1.5px solid #3B599825' : '1.5px solid #f1f5f9', boxShadow: notif.isNew ? '0 6px 16px rgba(59,89,152,0.07)' : 'none', cursor: 'pointer', transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', gap: '12px' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = notif.isNew ? '#e8f2ff' : '#fafbfc'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = notif.isNew ? '#f0f7ff' : '#ffffff'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: notif.type === 'quiz' ? '#0d676c' : (notif.isNew ? '#3B5998' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: (notif.isNew || notif.type === 'quiz') ? 'white' : '#94a3b8', flexShrink: 0 }}>
                      {notif.type === 'quiz' ? <Zap size={17} fill="white" /> : notif.type === 'award' ? <Award size={17} /> : <Bell size={17} fill={notif.isNew ? 'white' : 'transparent'} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: notif.isNew ? '900' : '500', color: notif.isNew ? '#0B1E3F' : '#64748b', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</h4>
                      {!(notif.type === 'quiz' || String(notif.title || '').toLowerCase().includes('quiz')) && (() => {
                        const isExpanded = expandedNotifs.has(notif.id);
                        return (
                          <>
                            <p style={{ margin: 0, fontSize: '11.5px', color: notif.isNew ? '#3B5998' : '#94a3b8', fontWeight: notif.isNew ? '700' : '400', lineHeight: '1.4', display: isExpanded ? 'block' : '-webkit-box', WebkitLineClamp: isExpanded ? 'none' : 2, WebkitBoxOrient: 'vertical', overflow: isExpanded ? 'visible' : 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{notif.description}</p>
                            {notif.description && notif.description.length > 30 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNotifs(prev => {
                                    const next = new Set(prev);
                                    if (next.has(notif.id)) next.delete(notif.id);
                                    else next.add(notif.id);
                                    return next;
                                  });
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#3B5998',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '3px 0 0 0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  textTransform: 'none',
                                  textDecoration: 'underline'
                                }}
                              >
                                {isExpanded ? 'View Less' : 'View More'}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {/* Unread Blue dot and Delete Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {notif.isNew && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          style={{ width: '9px', height: '9px', backgroundColor: '#3B5998', borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 8px rgba(59,89,152,0.45)' }}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(notif.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          transition: 'all 0.2s',
                          opacity: 0.6
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.opacity = '0.6';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                  No new assignments yet.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Draggable Bell Icon ── */}
      <motion.div
        ref={iconRef}
        drag
        dragMomentum={false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={dragConstraints}
        onDragStart={() => { setIsDragging(true); updateDragConstraints(); }}
        onDragEnd={() => {
          setIsDragging(false);
          setTimeout(() => { updateDragConstraints(); updatePanelPosition(); }, 50);
        }}
        style={{
          position: 'fixed',
          bottom: isMobile ? '15px' : '20px',
          right: isMobile ? '10px' : '30px',
          zIndex: 5500,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {isMobile && (
          <motion.div
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onPointerDown={(e) => dragControls.start(e)}
            onClick={() => {
              if (!isDragging) {
                navigate('/awards');
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #facc15 0%, #f59e0b 100%)',
              color: '#0f172a',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              boxShadow: '0 18px 38px rgba(250,204,21,0.42)',
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Award size={22} color="#0f172a" />
          </motion.div>
        )}
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => {
            if (!isDragging) {
              const next = !isOpen;
              setIsOpen(next);
              if (next) { setHasUnread(false); updatePanelPosition(); }
            }
          }}
          style={{
            background: '#3B5998',
            color: 'white',
            width: isMobile ? '50px' : '60px',
            height: isMobile ? '50px' : '60px',
            borderRadius: '50%',
            boxShadow: '0 18px 38px rgba(59,89,152,0.42)',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <Bell size={isMobile ? 22 : 26} fill="white" />
          {hasUnread && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ position: 'absolute', top: isMobile ? '10px' : '14px', right: isMobile ? '10px' : '14px', width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}
            />
          )}
        </motion.div>
      </motion.div>
      {deleteConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '30px',
            borderRadius: '24px',
            width: '90%',
            maxWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Confirm Delete</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
              Are you sure you want to delete this notification?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(null);
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                }}
              >
                Cancel
              </button>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  const idToDelete = deleteConfirmId;
                  setDeleteConfirmId(null);
                  
                  const targetNotif = notifications.find(n => n.id === idToDelete);
                  if (targetNotif) {
                    // Optimistically update UI
                    setNotifications(prev => prev.filter(n => n.id !== idToDelete));
                    
                    if (user?.token) {
                      try {
                        const dbId = String(idToDelete);
                        await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${dbId}`, {
                          method: 'DELETE',
                          headers: { 'Authorization': `Bearer ${user.token}` }
                        });
                      } catch (err) {
                        console.error("Failed to delete notification from backend:", err);
                      }
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskNotification;
