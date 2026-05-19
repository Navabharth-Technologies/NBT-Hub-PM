import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './AppFooter.css';

const FooterIcons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ),
  Tickets: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
  ),
  Add: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
  ),
  Thread: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
  ),
  Attendance: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  Leaves: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M8 18h8"/><path d="M8 14h8"/><path d="M8 10h4"/><path d="M12 2v4"/><path d="M12 18v4"/></svg>
  )
};

export default function AppFooter({ onCreateTeam }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({ leaves: -1, tickets: -1, threads: -1 });
  const [seenCounts, setSeenCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('footer_seen_counts');
      return saved ? JSON.parse(saved) : { leaves: 0, tickets: 0, threads: 0 };
    } catch (e) {
      return { leaves: 0, tickets: 0, threads: 0 };
    }
  });

  const fetchUnreadCounts = async () => {
    if (!user?.token) return;
    try {
      const uid = user?.id || user?.userId || user?.employee_id;
      
      const [leaveRes, ticketRes, notifRes] = await Promise.all([
        fetch(API_ENDPOINTS.LEAVES_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).catch(() => null),
        fetch(API_ENDPOINTS.SUPPORT_TICKETS, { headers: { 'Authorization': `Bearer ${user.token}` } }).catch(() => null),
        fetch(API_ENDPOINTS.NOTIFICATIONS_BY_USER(uid), { headers: { 'Authorization': `Bearer ${user.token}` } }).catch(() => null)
      ]);

      const updates = { leaves: 0, tickets: 0, threads: 0 };

      if (leaveRes?.ok) {
        const lData = await leaveRes.json();
        const lList = Array.isArray(lData) ? lData : (lData.all || lData.data || []);
        updates.leaves = lList.filter(l => String(l.status || '').toLowerCase().includes('pending')).length;
      }

      if (ticketRes?.ok) {
        const tData = await ticketRes.json();
        const tList = Array.isArray(tData) ? tData : (tData.data || tData.value || []);
        updates.tickets = tList.filter(t => String(t.status || '').toLowerCase() === 'open' || String(t.status || '').toLowerCase() === 'pending').length;
      }

      if (notifRes?.ok) {
        const nData = await notifRes.json();
        const nList = Array.isArray(nData) ? nData : (nData.data || []);
        updates.threads = nList.filter(n => (n.is_read === 0 || n.is_read === false) && (n.message + (n.title || '')).toLowerCase().includes('thread')).length;
      }

      setUnreadCounts(updates);
    } catch (e) {
      console.error("Footer counts fetch error:", e);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const poll = setInterval(fetchUnreadCounts, 15000);
    return () => clearInterval(poll);
  }, [user]);

  // Update seen counts when visiting the respective screens
  useEffect(() => {
    if (unreadCounts.leaves === -1 || unreadCounts.tickets === -1 || unreadCounts.threads === -1) {
      return;
    }
    setSeenCounts(prev => {
      const currentPath = location.pathname;
      const next = { ...prev };
      let changed = false;

      // Aggressive Sync: If on the page, the "seen" count must match the "live" count exactly.
      if (currentPath.startsWith('/leaves')) {
        if (next.leaves !== unreadCounts.leaves) {
          next.leaves = unreadCounts.leaves;
          changed = true;
        }
      } else if (unreadCounts.leaves < next.leaves) {
        // Sync Down: If count dropped elsewhere, match it to avoid negative badges
        next.leaves = unreadCounts.leaves;
        changed = true;
      }

      if (currentPath.startsWith('/tickets')) {
        if (next.tickets !== unreadCounts.tickets) {
          next.tickets = unreadCounts.tickets;
          changed = true;
        }
      } else if (unreadCounts.tickets < next.tickets) {
        next.tickets = unreadCounts.tickets;
        changed = true;
      }

      if (currentPath.startsWith('/engagement')) {
        if (next.threads !== unreadCounts.threads) {
          next.threads = unreadCounts.threads;
          changed = true;
        }
      } else if (unreadCounts.threads < next.threads) {
        next.threads = unreadCounts.threads;
        changed = true;
      }

      if (changed) {
        localStorage.setItem('footer_seen_counts', JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, [location.pathname, unreadCounts]);

  useEffect(() => {
    let timeout;

    const showFooterOnScroll = () => {
      setIsVisible(true);
      if (timeout) clearTimeout(timeout);

      // Hide after 6 seconds of no scrolling
      timeout = setTimeout(() => {
        setIsVisible(false);
      }, 6000);
    };

    // Listen to all scrolling behaviors universally
    window.addEventListener('scroll', showFooterOnScroll, { passive: true });
    window.addEventListener('wheel', showFooterOnScroll, { passive: true });
    window.addEventListener('touchmove', showFooterOnScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', showFooterOnScroll);
      window.removeEventListener('wheel', showFooterOnScroll);
      window.removeEventListener('touchmove', showFooterOnScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FooterIcons.Dashboard /> },
    { name: 'View tickets', path: '/tickets', icon: <FooterIcons.Tickets /> },
    { name: 'Create', path: '/dashboard', icon: <FooterIcons.Add />, isAction: true },
    { name: 'Leaves', path: '/leaves', icon: <FooterIcons.Leaves /> },
    { name: 'Thread', path: '/engagement', icon: <FooterIcons.Thread /> },
    { name: 'Attendance', path: '/attendance', icon: <FooterIcons.Attendance /> },
  ];

  const handleNavClick = (item) => {
    if (item.isAction) {
      setShowAddMenu(!showAddMenu);
    } else {
      navigate(item.path, { state: item.state });
      setShowAddMenu(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`app-footer-wrapper ${!isVisible && !showAddMenu ? 'app-footer-hidden' : ''}`}
      onMouseEnter={() => setIsVisible(true)}
    >
      <nav className="app-footer">
        {navItems.map((item) => (
          <div key={item.name} className="footer-item-container" style={{ position: 'relative' }}>
            {item.isAction && showAddMenu && (
              <div className="add-upward-menu footer-animate-slide-up">
                <button className="add-menu-item" onClick={(e) => { e.stopPropagation(); navigate('/courses'); setShowAddMenu(false); }}>
                  <span className="add-menu-icon">📚</span>
                  <span>Add Course</span>
                </button>
                <button className="add-menu-item" onClick={(e) => { e.stopPropagation(); navigate('/suggestions'); setShowAddMenu(false); }}>
                  <span className="add-menu-icon">💡</span>
                  <span>Review Suggestions</span>
                </button>
              </div>
            )}
            <button
              className={`footer-item ${isActive(item.path) ? 'active' : ''} ${item.isAction && showAddMenu ? 'action-active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <div className="footer-icon">
                {item.icon}
                {item.name === 'Leaves' && unreadCounts.leaves >= 0 && (unreadCounts.leaves - seenCounts.leaves) > 0 && !location.pathname.includes('/leaves') && <span className="footer-dot">{unreadCounts.leaves - seenCounts.leaves}</span>}
                {item.name === 'View tickets' && unreadCounts.tickets >= 0 && (unreadCounts.tickets - seenCounts.tickets) > 0 && !location.pathname.includes('/tickets') && <span className="footer-dot">{unreadCounts.tickets - seenCounts.tickets}</span>}
                {item.name === 'Thread' && unreadCounts.threads >= 0 && (unreadCounts.threads - seenCounts.threads) > 0 && !location.pathname.includes('/engagement') && <span className="footer-dot">{unreadCounts.threads - seenCounts.threads}</span>}
              </div>
              <span className="footer-label">{item.name}</span>
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}
