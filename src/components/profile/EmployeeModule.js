import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './PMDashboard.css';

export default function EmployeeModule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('All Roles');
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user?.token) return;
      try {
        const response = await fetch(API_ENDPOINTS.EMPLOYEES, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error('Employee fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, [user]);

  const uniqueRoles = ['All Roles', ...new Set(employees.map(emp => emp.role).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.team && emp.team.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDept = selectedDept === 'All Roles' || 
      (emp.role && emp.role === selectedDept) ||
      (emp.team && emp.team === selectedDept);
      
    return matchesSearch && matchesDept;
  });

  return (
    <div className="pm-dashboard-container">
      <AppHeader />
      
      <main className="dashboard-content" style={{paddingBottom: '100px', padding: winWidth < 768 ? '15px' : '26px'}}>
        <header className="section-header" style={{ marginBottom: winWidth < 480 ? '15px' : '24px' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: winWidth < 480 ? '8px' : '15px', flexWrap: 'wrap'}}>
            <button 
              onClick={() => navigate(-1)} 
              className="btn-outline"
              style={{ padding: winWidth < 480 ? '6px 10px' : '8px 12px', fontSize: winWidth < 480 ? '12px' : '14px', borderRadius: '12px', border: '3px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
            >
              ←
            </button>
            <div>
              <h1 style={{fontSize: winWidth < 480 ? '20px' : (winWidth < 600 ? '22px' : '26px'), fontWeight: '800', color: '#1e293b', margin: 0}}>Workforce Directory</h1>
              <p style={{color: '#64748b', fontSize: winWidth < 480 ? '11px' : (winWidth < 600 ? '13px' : '15px'), margin: '2px 0 0 0'}}>Manage all {employees.length} members</p>
            </div>
          </div>
          <div style={{display: 'flex', gap: '8px', width: winWidth < 600 ? '100%' : 'auto', marginTop: winWidth < 480 ? '12px' : '0'}}>
             <button className="btn-outline" style={{ flex: winWidth < 600 ? 1 : 'none', justifyContent: 'center', padding: winWidth < 480 ? '8px' : '10px', fontSize: winWidth < 480 ? '12px' : '13px', background: 'white', color: '#312e81', border: '3px solid #cbd5e1', borderRadius: '12px', fontWeight: '800' }}>Export CSV</button>
          </div>
        </header>

        {/* Search & Filter Bar */}
        <div style={{marginBottom: winWidth < 480 ? '16px' : '32px', display: 'flex', gap: winWidth < 480 ? '8px' : '16px', flexDirection: winWidth < 600 ? 'column' : 'row'}}>
           <div style={{flex: winWidth < 600 ? 'unset' : '1 1 300px', width: '100%', position: 'relative'}}>
              <span style={{position: 'absolute', left: '16px', top: winWidth < 480 ? '10px' : '14px', fontSize: winWidth < 480 ? '14px' : '18px'}}>🔍</span>
              <input 
                type="text" 
                placeholder="Search name, role, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '44px',
                  paddingTop: winWidth < 480 ? '10px' : '14px',
                  paddingBottom: winWidth < 480 ? '10px' : '14px',
                  borderRadius: '16px', border: '3px solid #cbd5e1', background: 'white', 
                  outline: 'none', fontSize: winWidth < 480 ? '13px' : '14px', 
                  boxShadow: 'var(--shadow-sm)', boxSizing: 'border-box'
                }}
              />
           </div>
           <select 
             value={selectedDept}
             onChange={(e) => setSelectedDept(e.target.value)}
             style={{
               width: winWidth < 600 ? '100%' : 'auto', 
               padding: winWidth < 480 ? '10px' : '12px', 
               borderRadius: '16px', border: '1px solid #1e293b', 
               background: 'white', fontWeight: 'bold', color: '#1e293b', 
               boxSizing: 'border-box', minWidth: '200px',
               fontSize: winWidth < 480 ? '13px' : '14px'
             }}
           >
              {uniqueRoles.map((role, idx) => (
                <option key={idx} value={role}>{role}</option>
              ))}
           </select>
        </div>

        {/* Employee Grid */}
        <section className="dashboard-section animate-fade-in" style={{padding: '0', background: 'transparent', border: 'none', boxShadow: 'none'}}>
            <div style={{
               display: 'grid', 
               gridTemplateColumns: winWidth > 1400 
                ? 'repeat(4, 1fr)' 
                : (winWidth > 1100 ? 'repeat(3, 1fr)' : `repeat(auto-fit, minmax(${winWidth < 480 ? '100%' : '300px'}, 1fr))`), 
               gap: '24px', 
               justifyContent: 'center',
               width: '100%',
               maxWidth: '100%',
               margin: '0 auto'
            }}>
              {filteredEmployees.map((emp, i) => (
                <div key={i} className="team-card" style={{background: 'white', padding: winWidth < 480 ? '12px' : '20px', position: 'relative', overflow: 'hidden'}}>
                   <div style={{display: 'flex', alignItems: 'center', gap: winWidth < 480 ? '10px' : '12px', marginBottom: winWidth < 480 ? '10px' : '15px'}}>
                      <div style={{
                        width: winWidth < 480 ? '38px' : '48px', 
                        height: winWidth < 480 ? '38px' : '48px', 
                        borderRadius: winWidth < 480 ? '12px' : '14px', 
                        background: '#e0e7ff', color: '#3863a8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: winWidth < 480 ? '16px' : '19px', fontWeight: '900'
                      }}>
                        {emp.name.charAt(0)}
                      </div>
                      <div style={{overflow: 'hidden'}}>
                         <h3 style={{fontSize: winWidth < 480 ? '14px' : '16px', fontWeight: '800', color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{emp.name}</h3>
                         <div style={{fontSize: winWidth < 480 ? '9px' : '11px', fontWeight: '700', color: '#312e81'}}>{emp.role}</div>
                      </div>
                      <div style={{
                        marginLeft: 'auto', padding: '2px 8px', borderRadius: '5px', fontSize: winWidth < 480 ? '8px' : '9px', fontWeight: '900',
                        background: emp.status === 'Active' ? '#f0fdf4' : '#f8fafc',
                        color: emp.status === 'Active' ? '#166534' : '#64748b',
                        border: `1px solid ${emp.status === 'Active' ? '#bcf0da' : '#e2e8f0'}`,
                        flexShrink: 0
                      }}>
                        {(emp.status || 'Active').toUpperCase()}
                      </div>
                   </div>

                   <div style={{display: 'flex', flexDirection: 'column', gap: winWidth < 480 ? '5px' : '8px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: winWidth < 480 ? '11px' : '12px', color: '#64748b'}}>
                         <span style={{fontSize: winWidth < 480 ? '12px' : '13px', flexShrink: 0}}>🏢</span> <span style={{fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{emp.team}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: winWidth < 480 ? '11px' : '12px', color: '#64748b'}}>
                         <span style={{fontSize: winWidth < 480 ? '12px' : '13px', flexShrink: 0}}>📧</span> <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{emp.email}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: winWidth < 480 ? '10px' : '12px', color: '#64748b'}}>
                         <span style={{fontSize: winWidth < 480 ? '12px' : '13px', flexShrink: 0}}>🆔</span> <span>{emp.id}</span>
                      </div>
                   </div>



                   <button 
                     onClick={() => navigate(`/focus-logs?id=${emp.id || emp.EmpID}`)}
                     style={{
                      marginTop: winWidth < 480 ? '8px' : '10px', 
                      width: '100%', 
                      padding: winWidth < 480 ? '8px' : '10px', 
                      borderRadius: '10px', 
                      border: '1.5px solid #eef2f6', 
                      background: '#f8fafc', 
                      color: '#312e81',
                      fontWeight: '800', 
                      fontSize: winWidth < 480 ? '9px' : '10px', 
                      cursor: 'pointer', 
                      transition: 'all 0.2s',
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px'
                    }}>
                      View Focus Report
                    </button>

                </div>
              ))}
           </div>
        </section>
      </main>
      
      <AppFooter />
      
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
