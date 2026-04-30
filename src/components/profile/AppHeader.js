import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTheme } from '../../constants/Theme';
import { useNavigate } from 'react-router-dom';

import { BASE_URL, API_ENDPOINTS } from '../../config';

export default function AppHeader() {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = React.useState(window.innerWidth);
  const [fetchedRole, setFetchedRole] = React.useState('');

  React.useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    const getRole = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.USERS);
        if (res.ok) {
          const data = await res.json();
          const users = Array.isArray(data) ? data : (data.value || []);
          const target = users.find(u => String(u.employee_id || u.id || u.empId) === '20251');
          if (target) {
            setFetchedRole(target.role || target.Role);
          }
        }
      } catch (err) {
        console.error("Fetch Role Error:", err);
      }
    };
    getRole();
  }, []);

  const styles = {
    header: {
      height: winWidth < 768 ? '70px' : '85px',
      backgroundColor: '#a7d6da', // Pastel Teal Header Background
      borderBottom: '1.5px solid rgba(0, 0, 0, 0.05)', // Subtle contrast line
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center',
      padding: winWidth < 768 ? '0 15px' : '0 30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2000,
    },
    left: { display: 'flex', alignItems: 'center', gap: '12px' },
    center: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
    logoImg: { height: winWidth < 768 ? '35px' : '45px', objectFit: 'contain', filter: 'brightness(0) invert(1)' },
    userName: { color: '#1e293b', fontWeight: '800', fontSize: '16px' },
    designation: { color: '#4b5563', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase' },
    navActions: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' },
    badge: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      backgroundColor: '#ef4444',
      color: 'white',
      borderRadius: '50%',
      width: '18px',
      height: '18px',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      border: '2px solid #3863a8'
    }
  };

  return (
    <div style={styles.header}>
      <div style={{ ...styles.left, paddingRight: '20px' }}>
        <div 
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
           <img 
             src="/assets/logo.png" 
             alt="Navabharatha" 
             style={{ 
               height: winWidth < 768 ? '55px' : '75px', 
               width: 'auto', 
               objectFit: 'contain'
             }} 
           />
        </div>
      </div>

      <div style={styles.center}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '22px', 
          fontWeight: '950', 
          letterSpacing: '2px', 
          textTransform: 'uppercase',
          fontFamily: "'Outfit', sans-serif",
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          position: 'relative'
        }} className="hide-on-mobile">
          NBT HUB
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#3863a8',
            boxShadow: '0 0 10px rgba(56, 99, 168, 0.6)',
            animation: 'pulse-glow 2s infinite ease-in-out'
          }}></div>
        </div>
        <div className="hide-on-desktop" style={{ fontWeight: '950', fontSize: '18px', color: '#1e293b' }}>NBT</div>
      </div>

      <div style={styles.navActions}>

        {/* Reward/Award Icon */}
        <div 
           onClick={() => navigate('/awards')}
           style={{
             width: '44px', 
             height: '44px', 
             borderRadius: '14px', 
             background: 'rgba(255, 255, 255, 0.25)', 
             border: '1.5px solid rgba(255, 255, 255, 0.4)',
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             cursor: 'pointer',
             position: 'relative',
             transition: 'all 0.2s ease',
             backdropFilter: 'blur(4px)'
           }}
           onMouseOver={(e) => {
             e.currentTarget.style.transform = 'scale(1.05)';
             e.currentTarget.style.backgroundColor = 'white';
           }}
           onMouseOut={(e) => {
             e.currentTarget.style.transform = 'scale(1)';
             e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
           }}
        >
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="M8 21h8"></path>
             <path d="M12 17v4"></path>
             <path d="M7 4h10"></path>
             <path d="M17 4v8a5 5 0 0 1-10 0V4"></path>
             <path d="M15 9h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"></path>
             <path d="M9 9H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
           </svg>
           {/* Red Notification Dot on Trophy */}
           <div style={{
             position: 'absolute',
             top: '12px',
             right: '12px',
             width: '8px',
             height: '8px',
             borderRadius: '50%',
             backgroundColor: '#ef4444',
             border: '2px solid #e0f2f1', // Matches light teal background
             boxShadow: '0 0 4px rgba(0,0,0,0.1)'
           }} />
        </div>

        <div className="hide-on-mobile" style={{textAlign: 'right', lineHeight: '1.2'}}>
          <div style={styles.userName}>{user?.name || 'NBT User'}</div>
          <div style={styles.designation}>{fetchedRole || theme.label} • Manager</div>
        </div>
        
        <div 
           onClick={() => navigate('/performance')}
           style={{width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s transform', overflow: 'hidden'}}
           onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
           onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
           {user?.profile_pic || user?.profile_picture ? (
             <img 
               src={(user.profile_pic || user.profile_picture).startsWith('http') || (user.profile_pic || user.profile_picture).startsWith('data:') ? (user.profile_pic || user.profile_picture) : `${BASE_URL}${(user.profile_pic || user.profile_picture).startsWith('/') ? '' : '/'}${user.profile_pic || user.profile_picture}`} 
               alt="Profile" 
               style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
             />
           ) : (
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
           )}
        </div>
      </div>
    </div>
  );
}
