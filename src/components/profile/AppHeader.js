import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTheme } from '../../constants/Theme';
import { useNavigate } from 'react-router-dom';

import { BASE_URL, API_ENDPOINTS } from '../../config';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const theme = getTheme(user?.role);
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = React.useState(window.innerWidth);
  const [fetchedRole, setFetchedRole] = React.useState('');
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

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
          const currentId = user?.employee_id || user?.id || user?.empId || '20251';
          const target = users.find(u => String(u.employee_id || u.id || u.empId) === String(currentId));
          if (target) {
            setFetchedRole(target.Role || target.role);
          }
        }
      } catch (err) {
        console.error("Fetch Role Error:", err);
      }
    };
    getRole();
  }, [user]);

  const styles = {
    header: {
      height: winWidth < 768 ? '70px' : '85px',
      backgroundColor: '#a7d6da', // Pastel Teal Header Background
      borderBottom: '1.5px solid rgba(0, 0, 0, 0.05)', // Subtle contrast line
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center',
      padding: winWidth < 768 ? '0 16px' : '0 26px',
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
             src={`${process.env.PUBLIC_URL}/image.png`}
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
          fontSize: '35px', 
          fontWeight: '950', 
          letterSpacing: '0px', 
          textTransform: 'uppercase',
          fontFamily: "'Outfit', sans-serif",
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          position: 'relative'
        }} className="hide-on-mobile">
          NBT HUB
        </div>
        <div className="hide-on-desktop" style={{ fontWeight: '950', fontSize: '18px', color: '#1e293b', letterSpacing: '1px' }}>NBT HUB</div>
      </div>

      <div style={styles.navActions}>

        {/* Reward/Award Icon - Hidden on mobile for parity with HR */}
        {winWidth >= 768 && (
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
        )}

        <div className="hide-on-mobile" style={{textAlign: 'right', lineHeight: '1.2'}}>
          <div style={styles.userName}>{user?.name || 'NBT User'}</div>
          <div style={styles.designation}>{fetchedRole || theme.label} </div>
        </div>
        
        <div 
           onClick={() => navigate('/performance')}
           style={{
             width: winWidth < 768 ? '38px' : '48px', 
             height: winWidth < 768 ? '38px' : '48px', 
             borderRadius: '12px', 
             background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)', 
             display: 'flex', alignItems: 'center', justifyContent: 'center', 
             cursor: 'pointer', transition: '0.2s transform', overflow: 'hidden', position: 'relative'
           }}
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
             <svg width={winWidth < 768 ? "18" : "22"} height={winWidth < 768 ? "18" : "22"} viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
           )}

           <div 
             onClick={(e) => {
               e.stopPropagation();
               setShowLogoutModal(true);
             }}
             style={{
               position: 'absolute',
               bottom: '0',
               right: '0',
               background: '#ef4444',
               width: winWidth < 768 ? '18px' : '22px',
               height: winWidth < 768 ? '18px' : '22px',
               borderRadius: '5px 0 0 0',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
               cursor: 'pointer',
               zIndex: 10
             }}
             title="Logout"
           >
             <LogOut size={winWidth < 768 ? 10 : 12} color="white" strokeWidth={3} />
           </div>
        </div>
      </div>

      {/* Custom Logout Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            transform: 'scale(1)',
            animation: 'modalIn 0.3s ease-out'
          }}>
            <div style={{ 
              width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 20px', color: '#ef4444' 
            }}>
              <LogOut size={32} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Confirm Logout</h2>
            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600', marginBottom: '32px' }}>
              Are you sure you want to log out of your NBT HUB account?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowLogoutModal(false)}
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', 
                  background: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '16px', border: 'none', 
                  background: '#ef4444', color: 'white', fontWeight: '800', cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                  transition: '0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
