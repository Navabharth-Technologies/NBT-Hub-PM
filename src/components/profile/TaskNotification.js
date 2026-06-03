import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Play, Clock, Zap, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

const formatReadableDatesInString = (str) => {
  if (!str) return '';
  const jsDateRegex = /[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{4} \d{2}:\d{2}:\d{2}(?: GMT[+-]\d{1,4}(?::\d{2})?(?: \([^)]+\))?)?/g;
  let res = str.replace(jsDateRegex, (match) => {
    // Strip out timezone part before passing to Date if it fails to parse
    const cleanMatch = match.replace(/GMT[+-]\d{1,4}(?::\d{2})?(?: \([^)]+\))?/g, '').trim();
    const d = new Date(cleanMatch);
    return isNaN(d.getTime()) ? match : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;
  res = res.replace(isoDateRegex, (match) => {
    const d = new Date(match);
    return isNaN(d.getTime()) ? match : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  // Catch-all to remove any dangling standalone timezone strings like "GMT+5:30 (India Standard Time)"
  res = res.replace(/GMT[+-]\d{1,4}(?::\d{2})?(?: \([^)]+\))?/g, '').trim();

  return res;
};

const TaskNotification = ({ onOpenTask }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    const saved = localStorage.getItem('nbt_dismissed_notifs');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [readIds, setReadIds] = useState(() => {
    try {
      const uid = user?.employee_id || user?.id || user?.EmpID || 'hr';
      return new Set(JSON.parse(localStorage.getItem(`read_hr_notifs_${uid}`)) || []);
    } catch {
      return new Set();
    }
  });
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  const markAsRead = (id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      const uid = user?.employee_id || user?.id || user?.EmpID || 'hr';
      localStorage.setItem(`read_hr_notifs_${uid}`, JSON.stringify([...next].slice(-100)));
      return next;
    });
  };

  // Auto-dismiss visited notifications (only if not "new" to prevent vanishing)
  useEffect(() => {
    const path = location.pathname;
    setNotifications(prev => prev.filter(n => {
      const msg = (n.description || '').toLowerCase();
      const title = (n.title || '').toLowerCase();
      const combine = msg + title;

      // Only auto-dismiss if notification is NOT new and user is on the page
      const isOld = !n.isNew;
      if (!isOld) return true;

      if (path.includes('/attendance') && combine.includes('leave')) return false;
      if (path.includes('/tickets') && combine.includes('ticket')) return false;
      if (path.includes('/threads') && combine.includes('thread')) return false;
      if (path.includes('/admin/resignations') && combine.includes('resignation')) return false;
      if (path.includes('/admin/certificates') && combine.includes('certificate')) return false;
      if (path.includes('/job-applications') && combine.includes('job')) return false;
      if (path.includes('/assets') && combine.includes('asset')) return false;
      if (path.includes('/performance') && combine.includes('performance')) return false;
      if (path.includes('/courses') && combine.includes('course')) return false;
      if (path.includes('/awards') && combine.includes('award')) return false;
      if (path.includes('/new-joinees') && (combine.includes('joinee') || n.isBlockedAlert)) return false;

      return true;
    }));
  }, [location.pathname, dismissedIds]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // Strip out 'Z' and any other timezone indicators to force the browser 
        // to parse it as local time, preventing unwanted +5:30 shifts.
        const cleanDateStr = String(d).replace(/Z|GMT.*|[+-]\d{2}:?\d{2}$/gi, '').trim();
        const r = new Date(cleanDateStr);
        return isNaN(r.getTime()) ? new Date() : r;
      };

      const savedRead = JSON.parse(localStorage.getItem(`read_hr_notifs_${uid}`) || '[]');
      const readSet = new Set(savedRead);

      list.forEach(n => {
        const descText = n.message || n.description || '';
        const rawTitle = n.title || '';

        let displayTitle = '';
        const descLower = descText.toLowerCase();
        const titleLower = rawTitle.toLowerCase();

        if (n.isBlockedAlert) {
          displayTitle = 'ACCESS BLOCKED';
        } else if (descLower.includes('leave') || titleLower.includes('leave')) {
          displayTitle = 'LEAVE REQUEST';
        } else if (descLower.includes('resignation') || titleLower.includes('resignation')) {
          displayTitle = 'RESIGNATION';
        } else if (descLower.includes('certificate') || titleLower.includes('certificate')) {
          displayTitle = 'SERVICE CERTIFICATE';
        } else if (descLower.includes('job') || titleLower.includes('job')) {
          displayTitle = 'JOB APPLICATION';
        } else if (descLower.includes('task') || titleLower.includes('task')) {
          displayTitle = 'TASK ASSIGNMENT';
        } else if (descLower.includes('ticket') || titleLower.includes('ticket')) {
          displayTitle = 'SUPPORT TICKET';
        } else if (descLower.includes('asset') || titleLower.includes('asset')) {
          displayTitle = 'ASSET ALLOCATION';
        } else if (descLower.includes('performance') || titleLower.includes('performance')) {
          displayTitle = 'PERFORMANCE REVIEW';
        } else if (descLower.includes('course') || titleLower.includes('course')) {
          displayTitle = 'COURSE ENROLLMENT';
        } else if (descLower.includes('award') || titleLower.includes('award') || descLower.includes('recognition') || titleLower.includes('recognition')) {
          displayTitle = 'AWARDS & RECOGNITION';
        } else if (descLower.includes('quiz') || titleLower.includes('quiz')) {
          displayTitle = 'QUIZ CHALLENGE';
        } else {
          displayTitle = (rawTitle || n.type || 'NOTIFICATION').toUpperCase();
        }

        const notif = {
          id: n.id || `notif-${Math.random()}`,
          title: displayTitle,
          description: descText,
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
          date: n.rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));

      setNotifications(finalMapped);
      if (finalMapped.some(n => n.isNew) && !isOpen) setHasUnread(true);

    } catch (err) {
      console.error("Unified Notification Sync Error:", err);
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

  const isMobile = winWidth < 768;

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? '40px' : '50px',
      right: isMobile ? '10px' : '30px',
      zIndex: 5000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '15px'
    }}>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            style={{
              background: 'white',
              width: isMobile ? 'calc(100% - 20px)' : '360px',
              maxHeight: '420px',
              borderRadius: isMobile ? '20px' : '28px 28px 4px 28px',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.2)',
              border: '1.5px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px', background: '#3B5998', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={20} fill="white" />
                <span style={{ fontWeight: '1000', fontSize: '14px', letterSpacing: '0.5px' }}>NOTIFICATIONS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc' }}>
              {notifications.length > 0 ? notifications.map((notif, idx) => (
                <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '1000', color: '#94a3b8', marginLeft: '5px', marginBottom: '2px' }}>
                    {notif.date} at {notif.time}
                  </div>
                  <div
                    onClick={() => {
                      const desc = (notif.description || '').toLowerCase();
                      const title = (notif.title || '').toLowerCase();

                      let path = '/';
                      if (notif.isBlockedAlert) {
                        path = '/new-joinees#blocked';
                      } else if (desc.includes('leave') || title.includes('leave')) {
                        path = '/leaves';
                      } else if (desc.includes('resignation') || title.includes('resignation')) {
                        path = '/admin/resignations';
                      } else if (desc.includes('certificate') || title.includes('certificate')) {
                        path = '/admin/certificates';
                      } else if (desc.includes('job') || title.includes('job')) {
                        path = '/job-applications';
                      } else if (desc.includes('ticket') || title.includes('ticket')) {
                        path = '/tickets';
                      } else if (desc.includes('asset') || title.includes('asset')) {
                        path = '/assets';
                      } else if (desc.includes('performance') || title.includes('performance')) {
                        path = '/performance';
                      } else if (desc.includes('course') || title.includes('course')) {
                        path = '/courses';
                      } else if (desc.includes('award') || title.includes('award') || desc.includes('recognition')) {
                        path = '/awards';
                      } else if (onOpenTask) {
                        onOpenTask();
                        path = '';
                      } else {
                        path = '/alerts';
                      }

                      markAsRead(notif.id);
                      if (path) navigate(path);
                      setIsOpen(false);
                      setHasUnread(false);
                    }}
                    style={{
                      background: notif.isNew ? '#f0f7ff' : '#ffffff',
                      padding: '16px',
                      borderRadius: '20px',
                      border: notif.isNew ? '1.5px solid #3B599820' : '1.5px solid #f1f5f9',
                      boxShadow: notif.isNew ? '0 8px 20px rgba(59, 89, 152, 0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = notif.isNew ? '#e8f2ff' : '#fafbfc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notif.isNew ? '#f0f7ff' : '#ffffff';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    {/* Left Icon Box */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: notif.type === 'quiz' ? '#0d676c' : (notif.isNew ? '#3B5998' : '#f1f5f9'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: (notif.isNew || notif.type === 'quiz') ? 'white' : '#94a3b8',
                      flexShrink: 0,
                      transition: 'all 0.3s ease'
                    }}>
                      {notif.type === 'quiz' ? <Zap size={18} fill="white" /> : notif.type === 'award' ? <Award size={18} /> : <Bell size={18} fill={notif.isNew ? 'white' : 'transparent'} />}
                    </div>

                    {/* Text details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: notif.isNew ? '1000' : '500',
                        color: notif.isNew ? '#0B1E3F' : '#64748b',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'all 0.3s ease'
                      }}>{notif.title}</h4>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: notif.isNew ? '#3B5998' : '#94a3b8',
                        fontWeight: notif.isNew ? '800' : '400',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                      }}>{notif.description}</p>
                    </div>

                    {/* Unread Blue dot */}
                    {notif.isNew && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#3B5998',
                          borderRadius: '50%',
                          flexShrink: 0,
                          boxShadow: '0 0 10px rgba(59, 89, 152, 0.4)'
                        }}
                      />
                    )}
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

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setHasUnread(false);
        }}
        style={{
          background: '#3B5998',
          color: 'white',
          width: isMobile ? '50px' : '60px',
          height: isMobile ? '50px' : '60px',
          borderRadius: '50%',
          boxShadow: '0 20px 40px rgba(59, 89, 152, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0
        }}
      >
        <Bell size={isMobile ? 22 : 26} fill="white" />
        {hasUnread && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              position: 'absolute',
              top: isMobile ? '10px' : '15px',
              right: isMobile ? '10px' : '15px',
              width: '12px',
              height: '12px',
              background: '#ef4444',
              borderRadius: '50%',
              border: '2px solid white'
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TaskNotification;
