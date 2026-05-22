import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
          const filtered = Array.isArray(data) ? data.filter(emp => String(emp.id || emp.EmpID || '').trim() !== '20250') : [];
          setEmployees(filtered);
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
    const matchesSearch = emp.name.toLowerCase().startsWith(searchTerm.toLowerCase());
    
    const matchesDept = selectedDept === 'All Roles' || 
      (emp.role && emp.role === selectedDept) ||
      (emp.team && emp.team === selectedDept);
      
    return matchesSearch && matchesDept;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('Employees of NBT', 14, 22);
    
    // Add Subtitle
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Staff Count: ${filteredEmployees.length}`, 14, 30);
    doc.text(`Report Type: Management Overview`, 14, 36);
    doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 14, 42);

    const cleanText = (str) => {
      if (!str) return 'N/A';
      return String(str)
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
        .replace(/[^\x20-\x7E\s]/g, '') // remove non-ASCII/weird character spacing
        .replace(/\s+/g, ' ')
        .trim();
    };

    const tableColumn = ["ID", "Name", "Role", "Team", "Email", "Status"];
    const tableRows = filteredEmployees.map(emp => [
      cleanText(emp.id),
      cleanText(emp.name),
      cleanText(emp.role),
      cleanText(emp.team),
      cleanText(emp.email),
      cleanText(emp.status || 'Active').toUpperCase()
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { 
        fontSize: 8.5, 
        cellPadding: { top: 5, bottom: 5, left: 3, right: 3 },
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, // ID
        1: { cellWidth: 32 },                  // Name
        2: { cellWidth: 35 },                  // Role
        3: { cellWidth: 32 },                  // Team
        4: { cellWidth: 54 },                  // Email
        5: { cellWidth: 18, halign: 'center' }  // Status
      },
      headStyles: { fillColor: [49, 99, 170], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 12, right: 12 }
    });

    doc.save('Employees_of_NBT.pdf');
  };

  return (
    <div className="pm-dashboard-container">
      <AppHeader />
      
      <main className="dashboard-content" style={{ padding: winWidth < 768 ? '100px 16px 120px' : '120px 26px 120px', width: '100%', boxSizing: 'border-box', margin: '0' }}>
        <header className="section-header" style={{ marginBottom: winWidth < 480 ? '15px' : '24px' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: winWidth < 480 ? '8px' : '15px', flexWrap: 'wrap'}}>
            <button 
              onClick={() => navigate(-1)} 
              style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div>
              <h1 style={{fontSize: winWidth < 480 ? '20px' : (winWidth < 600 ? '22px' : '26px'), fontWeight: '800', color: '#1e293b', margin: 0}}>Employees of NBT</h1>
              <p style={{color: '#64748b', fontSize: winWidth < 480 ? '11px' : (winWidth < 600 ? '13px' : '15px'), margin: '2px 0 0 0'}}>Manage all {employees.length} members</p>
            </div>
          </div>
          <div style={{display: 'flex', gap: '8px', width: winWidth < 600 ? '100%' : 'auto', marginTop: winWidth < 480 ? '12px' : '0'}}>
             <button 
               onClick={exportToPDF}
               className="btn-outline" 
               style={{ flex: winWidth < 600 ? 1 : 'none', justifyContent: 'center', padding: winWidth < 480 ? '8px' : '10px', fontSize: winWidth < 480 ? '12px' : '13px', background: 'white', color: '#312e81', border: '3px solid #cbd5e1', borderRadius: '12px', fontWeight: '800' }}
             >
               Export PDF
             </button>
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
                  borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', 
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
