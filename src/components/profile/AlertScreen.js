import React, { useState, useEffect } from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './PMDashboard.css';

export default function AlertScreen() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user?.token) return;
      try {
        const uid = user?.id || user?.empId || user?.employee_id || user?.userId;
        const endpoint = uid ? API_ENDPOINTS.NOTIFICATIONS_BY_USER(uid) : API_ENDPOINTS.ALERTS;
        
        const res = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (res.ok) {
          setAlerts(await res.json());
        }
      } catch (err) {
        console.error('Alert fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [user]);
  return (
    <div className="pm-dashboard-container" style={{backgroundColor: '#eaeff2', minHeight: '100vh'}}>
      <AppHeader />
      
      <main className="dashboard-content" style={{paddingBottom: '100px', maxWidth: '100%', padding: '40px', paddingTop: '125px'}}>
        <header className="section-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>

            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>System Alerts</h1>
              <p style={{ color: '#64748b', marginTop: '4px' }}>Real-time updates, warnings, and notifications.</p>
            </div>
          </div>
          <button style={{background: 'white', color: '#3863a8', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'}} onMouseOver={(e) => e.target.style.background = '#f1f5f9'} onMouseOut={(e) => e.target.style.background = 'white'}>Mark all as read</button>
        </header>

        <section className="dashboard-section animate-fade-in" style={{padding: 0, background: 'transparent', boxShadow: 'none', border: 'none'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div key={alert.id} style={{
                  background: 'white', borderRadius: '20px', padding: '24px', 
                  border: '1px solid #f1f5f9', display: 'flex', gap: '20px', alignItems: 'flex-start',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden',
                  transition: 'transform 0.2s ease', cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                    background: alert.type === 'critical' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : alert.type === 'success' ? '#10b981' : '#3b82f6'
                  }}></div>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '16px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    background: alert.type === 'critical' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : alert.type === 'success' ? '#ecfdf5' : '#eff6ff',
                    color: alert.type === 'critical' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : alert.type === 'success' ? '#10b981' : '#3b82f6'
                  }}>
                    {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : alert.type === 'success' ? '✅' : 'ℹ️'}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                      <h3 style={{fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: 0}}>{alert.title}</h3>
                      <span style={{fontSize: '12px', fontWeight: '700', color: '#94a3b8'}}>{alert.time}</span>
                    </div>
                    <p style={{fontSize: '14px', color: '#64748b', lineHeight: '1.5', margin: 0}}>{alert.desc}</p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '60px 20px', background: 'white', borderRadius: '30px', border: '1px dashed #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧘‍♂️</div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>All Clear!</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>You've caught up with all system signals. No new alerts at this time.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <AppFooter />
    </div>
  );
}
