import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';


import { 
  BarChart3, TrendingUp, PieChart, Activity, Download, 
  FileText, ChevronRight, Calendar, Filter, CheckCircle2, 
  Clock, Search, ShieldCheck, Target, Users, LayoutDashboard,
  AlertCircle, ArrowUpRight, Briefcase, ArrowLeft
} from 'lucide-react';
import './PMDashboard.css';

export default function ReportScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [teamsReporting, setTeamsReporting] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [individualLogs, setIndividualLogs] = useState([]);
  
  const searchParams = new URLSearchParams(window.location.search);
  const rawId = searchParams.get('id');
  const targetUserId = (rawId && String(rawId) !== 'undefined' && String(rawId) !== 'null') ? rawId : null;
  const isIndividualView = !!targetUserId;

  useEffect(() => {
    const loadReportData = async () => {
      if (!user?.token) return;
      setLoading(true);
      try {
        if (isIndividualView) {
          const res = await fetch(`${API_ENDPOINTS.TASKS}?userId=${targetUserId}`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (res.ok) setIndividualLogs(await res.json());
        } else {
          // Overview: Fetch Teams
          const teamRes = await fetch(API_ENDPOINTS.TEAMS, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (teamRes.ok) setTeamsReporting(await teamRes.json());
          
          // Latest global tasks as "Recent Updates"
          const updatesRes = await fetch(`${API_ENDPOINTS.TASKS}?limit=5`, {
             headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (updatesRes.ok) setRecentUpdates(await updatesRes.json());
        }
      } catch (err) {
        console.error('Report fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, [user, targetUserId, isIndividualView]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    container: { backgroundColor: '#f8fafc', minHeight: '100vh', padding: winWidth < 768 ? '80px 16px 120px' : '100px 26px 150px', width: '100%', boxSizing: 'border-box' },
    main: { width: '100%', margin: '0' },
    header: { marginBottom: '40px', textAlign: winWidth < 768 ? 'center' : 'left' },
    title: { fontSize: winWidth < 768 ? '28px' : '42px', fontWeight: '900', color: '#1e293b', letterSpacing: '-1.5px' },
    statsGrid: { display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' },
    statCard: { 
      backgroundColor: 'white', padding: '25px', borderRadius: '30px', 
      boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9',
      display: 'flex', flexDirection: 'column', gap: '10px'
    },
    teamGrid: { display: 'grid', gridTemplateColumns: winWidth < 1024 ? '1fr' : 'repeat(2, 1fr)', gap: '25px', marginBottom: '50px' },
    teamCard: { 
      backgroundColor: 'white', padding: '30px', borderRadius: '35px', 
      boxShadow: '0 15px 40px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9',
      display: 'flex', gap: '25px', alignItems: 'center', cursor: 'pointer', transition: 'all 0.3s ease'
    },
    pill: { padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }
  };

  const renderOverview = () => (
    <div className="animate-fade-in">
      <header style={{ ...styles.header, display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
        >
          <ArrowLeft size={18} color="#64748b" />
        </button>
        <div>
          <h1 style={styles.title}>Project Pulse</h1>
          <p style={{ color: '#64748b', fontWeight: '500', marginTop: '5px' }}>The heartbeat of your operations</p>
        </div>
      </header>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: '#eff6ff', borderRadius: '12px' }}><Users size={20} color="#3863a8" /></div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>TOTAL CAPACITY</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
            {(teamsReporting || []).reduce((acc, t) => acc + (t.members || 0), 0)} 
            <span style={{ fontSize: '14px', color: '#10b981' }}> Live</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '12px' }}><TrendingUp size={20} color="#10b981" /></div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>AVG COMPLETION</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
            {Math.round((teamsReporting || []).reduce((acc, t) => acc + (t.completion || t.progress || 0), 0) / ((teamsReporting || []).length || 1))}% 
            <span style={{ fontSize: '14px', color: '#3863a8' }}> On Target</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: '#fff7ed', borderRadius: '12px' }}><AlertCircle size={20} color="#f59e0b" /></div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>CRITICAL PENDING</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
            {(teamsReporting || []).reduce((acc, t) => acc + (t.pendingTasks || t.pending || 0), 0)} 
            <span style={{ fontSize: '14px', color: '#ef4444' }}> Review</span>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LayoutDashboard size={24} color="#3863a8" /> Teams
      </h2>
      
      <div style={styles.teamGrid}>
        {(teamsReporting || []).map(t => (
          <div key={t.id} onClick={() => navigate(`/teams/${encodeURIComponent(t.id)}`)} className="member-report-card" style={styles.teamCard}>
             <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={t.color || '#3863a8'} strokeWidth="3" strokeDasharray={`${t.completion || t.progress || 0}, 100`} strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: '900', fontSize: '16px', color: '#1e293b' }}>{t.completion || t.progress || 0}%</div>
             </div>
             <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                   <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{t.name}</h3>
                      <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>LEAD: {t.lead}</p>
                   </div>
                   <span style={{ 
                     ...styles.pill, 
                     backgroundColor: (t.status === 'Stable' || t.progress > 80) ? '#dcfce7' : (t.status === 'On Track' || t.progress > 50) ? '#eff6ff' : '#fef2f2',
                     color: (t.status === 'Stable' || t.progress > 80) ? '#166534' : (t.status === 'On Track' || t.progress > 50) ? '#3863a8' : '#ef4444'
                   }}>
                     {t.status || (t.progress > 80 ? 'Stable' : 'Active')}
                   </span>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginTop: '12px' }}>
                   <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '10px', borderRadius: '15px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{t.completedTasks || Math.floor((t.progress || 0) * 0.2)}</div>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>DONE</div>
                   </div>
                   <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '15px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '900', color: '#3863a8' }}>{t.pendingTasks || t.pending || 0}</div>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>PENDING</div>
                   </div>
                   <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3863a8', borderRadius: '12px', color: 'white' }}>
                      <ChevronRight size={20} />
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

    </div>
  );

  const renderIndividual = () => (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2 style={{ color: '#1e293b', fontWeight: '900' }}>Report No Longer Available</h2>
      <button 
        onClick={() => navigate(-1)} 
        style={{
          marginTop: '20px',
          background: 'white',
          padding: '10px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
      >
        <ArrowLeft size={18} color="#64748b" />
      </button>
    </div>
  );


  return (
    <div className="pm-dashboard-container">
      <AppHeader />
      <main style={styles.container}>
        <div style={styles.main}>
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
                <div className="animate-pulse" style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#e0e7ff', marginBottom: '20px' }} />
                <div style={{ fontWeight: '900', color: '#3863a8', letterSpacing: '1px' }}>SYNCHRONIZING DATA...</div>
             </div>
          ) : (
            isIndividualView ? renderIndividual() : renderOverview()
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
