import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Play, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';

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
  const [lastIds, setLastIds] = useState(new Set());
  
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  // Auto-dismiss visited notifications (only if not "new" to prevent vanishing)
  useEffect(() => {
    const path = location.pathname;
    setNotifications(prev => prev.filter(n => {
       const msg = (n.description || '').toLowerCase();
       const title = (n.title || '').toLowerCase();
       const combine = msg + title;

       if (dismissedIds.has(n.id)) return false;
       
       // Only auto-dismiss if notification is NOT new and user is on the page
       const isOld = !n.isNew;
       if (!isOld) return true; 

       if (path.includes('/attendance') && combine.includes('leave')) return false;
       if (path.includes('/tasks') && combine.includes('task')) return false;
       if (path.includes('/tickets') && combine.includes('ticket')) return false;
       if (path.includes('/engagement') && combine.includes('thread')) return false;
       if (path.includes('/resignations') && combine.includes('resignation')) return false;
       if (path.includes('/service-certificates') && combine.includes('certificate')) return false;
       if (path.includes('/assets') && combine.includes('asset')) return false;
       if (path.includes('/performance') && combine.includes('performance')) return false;
       if (path.includes('/courses') && combine.includes('course')) return false;
       if (path.includes('/awards') && combine.includes('award')) return false;
       if (path.includes('/quiz') && (combine.includes('quiz') || combine.includes('fun'))) return false;
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
        const r = new Date(d);
        return isNaN(r.getTime()) ? new Date() : r;
      };

      list.forEach(n => {
        const notif = {
          id: n.id || `notif-${Math.random()}`,
          title: (n.title || n.type || 'NOTIFICATION').toUpperCase(),
          description: n.message || n.description || '',
          rawDate: parseDate(n.created_at || n.timestamp),
          isNew: n.is_read === 0 || n.is_read === false || !n.is_read,
          type: n.type || 'system',
          isBlockedAlert: n.isBlockedAlert || false
        };

        const key = `${notif.id}|${notif.title}|${notif.description}`.toLowerCase().trim();
        if (!aggregatedMap.has(key)) aggregatedMap.set(key, notif);
      });

      const finalMapped = Array.from(aggregatedMap.values())
        .filter(n => !dismissedIds.has(n.id))
        .sort((a, b) => b.rawDate - a.rawDate)
        .map(n => ({
          ...n,
          time: n.rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: n.rawDate.toLocaleDateString()
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
  }, [user, dismissedIds]);

  const isMobile = winWidth < 768;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: isMobile ? '145px' : '175px', 
      right: isMobile ? '10px' : '30px', 
      zIndex: 1000, 
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
              width: isMobile ? 'calc(100vw - 20px)' : '360px',
              maxHeight: '520px',
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
                  }}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', padding: '6px 12px', color: 'white', cursor: 'pointer', fontSize: '10px', fontWeight: '1000' }}
                >
                  CLEAR ALL
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc' }}>
              {notifications.length > 0 ? notifications.map((notif, idx) => {
                const isLeave = (notif.description || '').toLowerCase().includes('leave request');
                let leaveInfo = null;
                if (isLeave) {
                   const match = notif.description.match(/Leave Request from (.*?) \((.*?)\): (.*)/);
                   if (match) {
                     leaveInfo = { name: match[1], type: match[2], dates: match[3] };
                   }
                }

                return (
                <div key={notif.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '1000', color: '#94a3b8', marginLeft: '5px', marginBottom: '1px' }}>{notif.time.toUpperCase()} - {notif.date}</div>
                  <div style={{
                    background: notif.isNew ? '#ffffff' : '#f8fafc',
                    padding: '12px',
                    borderRadius: '16px 16px 16px 4px',
                    boxShadow: notif.isNew ? '0 4px 15px rgba(59, 89, 152, 0.12)' : 'none',
                    border: notif.isNew ? '1.5px solid #3B5998' : '1px solid #eef2f6',
                    position: 'relative'
                  }}>
                    {notif.isNew && (
                      <div style={{ position: 'absolute', top: '-8px', right: '10px', background: '#3B5998', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '8px', fontWeight: '1000' }}>URGENT</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: isLeave ? '8px' : '4px' }}>
                      <Bell size={12} color="#3B5998" />
                      <span style={{ fontWeight: '1000', fontSize: '12px', color: '#0B1E3F' }}>{notif.title}</span>
                    </div>

                    {isLeave && leaveInfo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>Leave Request: {leaveInfo.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Type: {leaveInfo.type}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Dates: {leaveInfo.dates}</div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4', margin: 0, fontWeight: '600' }}>{notif.description}</p>
                    )}
                    
                    {(notif.isNew || idx === 0) && (
                      <button
                        onClick={() => {
                          const desc = (notif.description || '').toLowerCase();
                          const title = (notif.title || '').toLowerCase();

                          if (notif.isBlockedAlert) {
                            navigate('/new-joinees#blocked');
                          } else if (desc.includes('leave') || title.includes('leave')) {
                            navigate('/attendance');
                          } else if (desc.includes('resignation') || title.includes('resignation')) {
                            navigate('/resignations');
                          } else if (desc.includes('certificate') || title.includes('certificate')) {
                            navigate('/service-certificates');
                          } else if (desc.includes('task') || title.includes('task')) {
                            navigate('/tasks');
                          } else if (desc.includes('ticket') || title.includes('ticket')) {
                            navigate('/tickets');
                          } else if (desc.includes('asset') || title.includes('asset')) {
                            navigate('/assets');
                          } else if (desc.includes('performance') || title.includes('performance')) {
                            navigate('/performance');
                          } else if (desc.includes('course') || title.includes('course')) {
                            navigate('/courses');
                          } else if (desc.includes('award') || title.includes('award') || desc.includes('recognition')) {
                            navigate('/awards');
                          } else if (desc.includes('quiz') || title.includes('quiz')) {
                            navigate('/quiz');
                          } else if (onOpenTask) {
                            onOpenTask();
                          } else {
                            navigate('/alerts');
                          }
                          setDismissedIds(prev => new Set([...prev, notif.id]));
                          setIsOpen(false);
                          setHasUnread(false);
                        }}
                        style={{
                          marginTop: '12px',
                          width: '100%',
                          background: notif.isBlockedAlert ? '#ef4444' : '#3B5998',
                          color: 'white',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '10px',
                          fontWeight: '1000',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: notif.isBlockedAlert ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
                        }}
                      >
                        <Play size={12} fill="white" /> {notif.isBlockedAlert ? 'MANAGE JOINEES' : 'VIEW ASSIGNMENT'}
                      </button>
                    )}
                  </div>
                </div>
                );
              }) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', fontWeight: '700' }}>
                   No new assignments yet.
                </div>
              )}
            </div>

            <div style={{ padding: '12px', background: 'white', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '11px', fontWeight: '1000', color: '#3B5998' }}>
              NBT HUB ASSISTANCE LIVE
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
