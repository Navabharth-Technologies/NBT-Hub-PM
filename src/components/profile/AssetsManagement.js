import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import {
  Package, Search, Filter, Edit3, Save, X, Plus, ChevronRight,
  Laptop, MousePointer, Keyboard, Smartphone,
  Camera, Headphones, Tablet as TabletIcon, HardDrive, ScrollText, Calendar,
  ShieldCheck, Sparkles, Check
} from 'lucide-react';

export default function AssetsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [editModal, setEditModal] = useState({ show: false, employee: null, isReadOnly: false });
  const [availableAssetsModal, setAvailableAssetsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  // Asset Form State
  const [form, setForm] = useState({
    employee_name: '',
    employee_id: '',
    designation: '',
    joining_date: '',
    last_working_date: '',
    laptop_details: '',
    mouse: '',
    keyboard: '',
    laptop_stand: '',
    ruf_pad: '',
    pendrive: '',
    mobile: '',
    camera: '',
    earphone: '',
    tablet: ''
  });

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const assetMap = {};
      const headers = { 'Authorization': `Bearer ${user.token}` };

      // 1. Fetch Employees
      try {
        const empRes = await fetch(API_ENDPOINTS.EMPLOYEES, { headers });
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(Array.isArray(empData) ? empData : (empData.recordset || empData.data || []));
        }
      } catch (e) { console.error('Emp fetch failed:', e); }

      // 2. Fetch Assets
      try {
        const assetRes = await fetch(API_ENDPOINTS.ASSETS || `${API_ENDPOINTS.EMPLOYEES}/assets`, { headers });
        if (assetRes.ok) {
          const assetData = await assetRes.json();
          const list = Array.isArray(assetData) ? assetData : (assetData.recordset || assetData.data || []);
          list.forEach(a => { 
            const id = a.employee_id || a.EmpID || a.employeeId || a.id;
            if (id) assetMap[id] = a; 
          });
        }
      } catch (e) { console.error('Asset fetch failed:', e); }

      // 3. Fetch Service Certificates (Try Primary and Alt endpoints)
      const fetchCerts = async (url) => {
        if (!url) return [];
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : (data.recordset || data.data || data.value || []);
          }
        } catch (e) { console.error(`Fetch failed for ${url}:`, e); }
        return [];
      };

      try {
        const [certs1, certs2] = await Promise.all([
          fetchCerts(API_ENDPOINTS.SERVICE_CERTIFICATES_GET),
          fetchCerts(API_ENDPOINTS.SERVICE_CERTIFICATES_ALT)
        ]);

        const combinedCerts = [...certs1, ...certs2];
        console.log('Combined Certificate Data:', combinedCerts);
        
        combinedCerts.forEach(c => {
          const id = c.employee_id || c.EmpID || c.employeeId || c.user_id || c.id;
          if (!id) return;

          // Helper to convert 1/0 or boolean to Yes/No
          const mapBinary = (val) => (val === 1 || val === '1' || val === true || val === 'true' || val === 'Yes') ? 'Yes' : 'No';

          // Merge into assetMap (avoid overwriting if already exists and is from a newer request)
          assetMap[id] = {
            ...(assetMap[id] || {}),
            ...c,
            employee_name: c.employee_name || c.name || assetMap[id]?.employee_name || 'Certificate Employee',
            employee_id: id,
            laptop_details: c.laptop_details || c.laptop_unit_details || assetMap[id]?.laptop_details,
            mouse: mapBinary(c.mouse),
            keyboard: mapBinary(c.keyboard),
            laptop_stand: mapBinary(c.laptop_stand),
            ruf_pad: mapBinary(c.ref_pad),
            pendrive: mapBinary(c.pendrive),
            mobile: mapBinary(c.company_mobile),
            camera: mapBinary(c.external_camera),
            earphone: mapBinary(c.earphone_headphone),
            tablet: mapBinary(c.tablet),
            is_from_certificate: true
          };
        });
      } catch (e) { console.error('Cert merge error:', e); }

      console.log('Final Asset Map keys:', Object.keys(assetMap));
      setAssets(assetMap);
    } catch (err) {
      console.error('Fatal fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '--') return dateStr;
    // Handle ISO format like 2025-10-10T00:00:00
    if (dateStr.includes('T')) {
      const dateOnly = dateStr.split('T')[0];
      const [y, m, d] = dateOnly.split('-');
      return `${d}-${m}-${y}`;
    }
    // Handle YYYY-MM-DD
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [y, m, d] = dateStr.split('-');
      return `${d}-${m}-${y}`;
    }
    return dateStr;
  };

  const handleEdit = (emp, readOnly = false, assetOverride = null) => {
    const empId = emp.id || emp.EmpID;
    const currentAsset = assetOverride || assets[empId] || assets[emp.id] || assets[emp.EmpID] || {};
    
    // Find employee in the full list to get the latest Role/Position
    const fullEmp = employees.find(e => {
      const eId = String(e.id || e.EmpID || '').trim();
      const targetId = String(empId || '').trim();
      return eId === targetId && eId !== '';
    });
    
    console.log('[POSITION DEBUG]', { empId, fullEmp, asset: currentAsset });
    
    // Strictly prioritize the 'Role' column from the employees list as requested
    let position = '';
    if (fullEmp) {
      position = fullEmp.Role || fullEmp.role || fullEmp.Position || fullEmp.designation || '';
    }
    
    // If not found in employee list, only then fall back to asset/emp data
    if (!position) {
      position = currentAsset.designation || currentAsset.role || emp.role || '';
    }

    const toYesNo = (val, status) => {
      if (val === 'Yes' || status === 'Yes' || Number(val) === 1 || val === true || val === 'true') return 'Yes';
      if (val === 'No' || status === 'No' || Number(val) === 0 || val === false || val === 'false') return 'No';
      return '';
    };

    setForm({
      employee_name: emp.name || currentAsset.name || currentAsset.employee_name || fullEmp?.name || '',
      employee_id: emp.id || emp.EmpID || currentAsset.employee_id || currentAsset.employeeId || '',
      designation: position,
      joining_date: formatDate(currentAsset.joining_date || currentAsset.doj || currentAsset.joining_date_iso || currentAsset.JoinDate || fullEmp?.joining_date || ''),
      last_working_date: formatDate(currentAsset.last_working_date || currentAsset.lwd || currentAsset.lwd_iso || ''),
      laptop_details: currentAsset.laptop_details || currentAsset.laptop || currentAsset.laptop_unit_details || '',
      mouse: toYesNo(currentAsset.mouse, currentAsset.mouse_unit || currentAsset.mouse_status),
      keyboard: toYesNo(currentAsset.keyboard, currentAsset.keyboard_unit || currentAsset.keyboard_status),
      laptop_stand: toYesNo(currentAsset.laptop_stand, currentAsset.stand_unit),
      ruf_pad: toYesNo(currentAsset.ruf_pad || currentAsset.ref_pad, currentAsset.ref_pad),
      pendrive: toYesNo(currentAsset.pendrive, currentAsset.pendrive_unit),
      mobile: toYesNo(currentAsset.mobile || currentAsset.company_mobile, currentAsset.company_mobile),
      camera: toYesNo(currentAsset.camera || currentAsset.external_camera, currentAsset.external_camera),
      earphone: toYesNo(currentAsset.earphone || currentAsset.earphone_headphone, currentAsset.earphone_headphone),
      tablet: toYesNo(currentAsset.tablet, currentAsset.tablet_unit)
    });

    setEditModal({ 
      show: true, 
      employee: emp, 
      isReadOnly: readOnly,
      assetId: currentAsset.id || currentAsset.EmpID || currentAsset.employee_id,
      isCertificate: !!currentAsset.is_from_certificate,
      certificateData: currentAsset.is_from_certificate ? currentAsset : null
    });
  };

  const handleCertificateAction = async (status) => {
    if (!editModal.certificateData?.id) return;
    setSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_UPDATE(editModal.certificateData.id), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          status: status,
          admin_remarks: `Processed by PManager on ${new Date().toLocaleDateString()}`
        })
      });

      if (response.ok) {
        alert(`Certificate request ${status}! ✅`);
        setEditModal({ show: false, employee: null, isReadOnly: false });
        fetchData();
      } else {
        alert('Action failed. Please check backend connectivity.');
      }
    } catch (err) {
      console.error('Certificate action error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Determine if this employee already has an asset record in the DB
      const empId = editModal.employee.id || editModal.employee.EmpID;
      const existingAsset = assets[empId];
      const hasExistingRecord = !!existingAsset;
      
      // Use the DB record's primary key for PUT, fallback to employee ID
      const targetId = editModal.assetId || (existingAsset?.id) || empId;
      
      // POST for brand-new records, PUT for updating existing ones
      const endpoint = hasExistingRecord ? API_ENDPOINTS.ASSET_UPDATE(targetId) : API_ENDPOINTS.ASSETS;
      const method = hasExistingRecord ? 'PUT' : 'POST';
      
      console.log(`[ASSET DECISION] hasExistingRecord=${hasExistingRecord}, targetId=${targetId}, method=${method}`);

      // Advanced Date Formatter (Handles both 16-01-2026 and 16/01/2026)
      const toISO = (d) => {
        if (!d || d === 'N/A' || d === '--' || d.includes('YYYY')) return d;
        const normalized = d.replace(/\//g, '-'); // Support slashes/
        if (normalized.split('-')[0].length === 4) return normalized; 
        const [dd, mm, yyyy] = normalized.split('-');
        if (dd && mm && yyyy) {
          return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
        return d;
      };

      const isoDate = toISO(form.joining_date);
      const isoLwd = toISO(form.last_working_date);

      const payload = {
        // Essential Identities
        employee_id: editModal.employee.id || editModal.employee.EmpID,
        id: editModal.assetId || (editModal.employee.id || editModal.employee.EmpID),
        asset_id: editModal.assetId,
        emp_id: editModal.employee.id || editModal.employee.EmpID,
        name: form.employee_name,
        employee_name: form.employee_name,

        // Core Status & Metadata
        status: form.status || 'Active',
        assigned_date: isoDate,
        designation: form.designation,
        role: form.designation,
        
        // Massive Redundancy for Joining Date (DOJ)
        joining_date: isoDate,
        doj: isoDate,
        joining_date_iso: isoDate,
        joining_date_raw: form.joining_date,
        joined_date: isoDate,
        joined_at: isoDate,
        JoinDate: isoDate,
        date_of_joining: isoDate,
        joining_day: form.joining_date,
        
        // LWD Super-Set
        last_working_date: isoLwd,
        lwd: isoLwd,
        lwd_iso: isoLwd,
        lwd_raw: form.last_working_date,
        last_working_day: isoLwd,
        exit_date: isoLwd,

        // Hardware (Full Inventory Map)
        laptop_details: form.laptop_details,
        laptop_unit_details: form.laptop_details,
        laptop: form.laptop_details,
        
        mouse: form.mouse,
        mouse_unit: form.mouse === 'Yes' ? 1 : 0,
        mouse_status: form.mouse,
        
        keyboard: form.keyboard,
        keyboard_unit: form.keyboard === 'Yes' ? 1 : 0,
        keyboard_status: form.keyboard,
        
        laptop_stand: form.laptop_stand,
        stand: form.laptop_stand,
        stand_unit: form.laptop_stand === 'Yes' ? 1 : 0,
        
        ruf_pad: form.ruf_pad,
        rufpad: form.ruf_pad,
        ruf_pad_unit: form.ruf_pad === 'Yes' ? 1 : 0,
        
        pendrive: form.pendrive,
        pendrive_unit: form.pendrive === 'Yes' ? 1 : 0,
        
        mobile: form.mobile,
        mobile_unit: form.mobile === 'Yes' ? 1 : 0,
        mobile_handset: form.mobile,
        
        camera: form.camera,
        webcam: form.camera,
        camera_unit: form.camera === 'Yes' ? 1 : 0,
        
        earphone: form.earphone,
        headphone: form.earphone,
        earphones: form.earphone,
        headphones: form.earphone,
        earphone_headphone: form.earphone,
        earphone_unit: form.earphone === 'Yes' ? 1 : 0,
        headphone_unit: form.earphone === 'Yes' ? 1 : 0,
        
        tablet: form.tablet,
        tablet_unit: form.tablet === 'Yes' ? 1 : 0
      };

      console.log(`[ASSET SYNC] ${method} -> ${endpoint}`, payload);

      const response = await fetch(endpoint, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        alert(`Database Entry Synced! ✅\nServer Info: ${result.message || 'Stored Successfully'}`);
        setEditModal({ show: false, employee: null, isReadOnly: false });
        // Force a brief delay before re-fetching to allow DB indexing
        setTimeout(() => fetchData(), 500);
      } else {
        alert(`Storage Error: ${result.message || result.error || 'Server rejected the entry'}`);
      }
    } catch (err) {
      console.error('Fatal Asset Sync Error:', err);
      alert('Network failure connecting to the Asset Database.');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || (emp.team && emp.team.includes(selectedDept));
    return matchesSearch && matchesDept;
  });

  return (
    <div className="assets-management-container" style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Outfit', sans-serif" }}>
      <AppHeader />

      <main className="dashboard-content" style={{ 
        paddingTop: winWidth < 768 ? '80px' : '100px',
        paddingLeft: winWidth < 768 ? '15px' : '30px',
        paddingRight: winWidth < 768 ? '15px' : '30px',
        paddingBottom: '100px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '25px', width: '100%', flexWrap: 'wrap', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'white', padding: '12px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <Package size={24} color="#3163aa" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Asset Management Hub</h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '2px 0 0 0' }}>Deploy and track workforce hardware inventory</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => setAvailableAssetsModal(true)}
              style={{ background: 'white', color: '#3163aa', border: '2px solid #3163aa', padding: '12px 24px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.3s' }}
            >
              <Package size={18} />
              Submitted Assets
            </button>
            <button
              onClick={() => {
                setForm({
                  designation: '', joining_date: '', last_working_date: '', laptop_details: '',
                  mouse: '', keyboard: '', laptop_stand: '', ruf_pad: '', pendrive: '',
                  mobile: '', camera: '', earphone: '', tablet: ''
                });
                setEditModal({ show: true, employee: { is_new: true, name: '' } });
              }}
              style={{ background: '#3163aa', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(49, 99, 170, 0.2)' }}
            >
              <Plus size={18} />
              Add new assets details for new joinee
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }} className="animate-fade-in">
          <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search member name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: 'white', fontFamily: "'Outfit', sans-serif", fontSize: '14px' }}
            />
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', color: '#1e293b', minWidth: '180px', fontFamily: "'Outfit', sans-serif", fontSize: '14px' }}
          >
            <option value="All">All Units</option>
            <option value="Technical Support">Support Sigma</option>
            <option value="Development">Development Devildog</option>
            <option value="Marketing">Growth Bravo</option>
          </select>
        </div>

        {/* Table View */}
        <div className="dashboard-section animate-fade-in" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', background: 'white', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', fontFamily: "'Outfit', sans-serif" }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '15px 25px', color: '#1e293b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', width: '350px', letterSpacing: '0.5px' }}>Member Details</th>
                  <th style={{ padding: '15px 25px', color: '#1e293b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', width: '300px', letterSpacing: '0.5px' }}>Designation</th>
                  <th style={{ padding: '15px 25px', color: '#1e293b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', width: '250px', letterSpacing: '0.5px' }}>Configuration</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan="5" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>Establishing neural link...</td></tr>
                  ))
                ) : filteredEmployees.map((emp, i) => {
                  const empId = emp.id || emp.EmpID;
                  const asset = assets[empId] || assets[emp.id] || assets[emp.EmpID] || {};
                  const hasAsset = !!(assets[empId] || assets[emp.id] || assets[emp.EmpID]);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s', backgroundColor: i % 2 === 0 ? 'transparent' : '#fcfdfe' }}>
                      <td style={{ padding: '15px 25px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3163aa', fontWeight: '900', fontSize: '14px' }}>
                            {emp.name.charAt(0)}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {emp.id || emp.EmpID}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '15px 25px' }}>
                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{asset.designation || emp.role || 'Unspecified'}</span>
                      </td>
                      <td style={{ padding: '15px 25px', textAlign: 'center' }}>
                        {hasAsset ? (
                          <button 
                            onClick={() => handleEdit(emp, true)}
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', color: '#64748b', cursor: 'pointer', transition: '0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Package size={14} /> <span style={{ fontSize: '12px', fontWeight: '800' }}>View Details</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleEdit(emp, false)}
                            style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '8px 12px', color: '#2563eb', cursor: 'pointer', transition: '0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Edit3 size={14} /> <span style={{ fontSize: '12px', fontWeight: '800' }}>Configure</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-slide-up" style={{ 
            background: 'white', 
            width: '100%', 
            maxWidth: editModal.isCertificate ? '900px' : '800px', 
            borderRadius: '35px', 
            maxHeight: '92vh', 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            
            {/* Header Redesign for Certificate */}
            <div style={{ padding: '30px 40px', background: editModal.isCertificate ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '22px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(49, 99, 170, 0.08)' }}>
                  <Package size={28} color="#3163aa" />
                </div>
                <div>
                  <h2 style={{ fontSize: '26px', fontWeight: '950', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
                    {editModal.isCertificate ? 'Professional Asset Declaration' : (editModal.isReadOnly ? 'Asset Inventory View' : 'Configure Hardware Assets')}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                      {editModal.employee.name} (ID: {editModal.employee.id || editModal.employee.EmpID})
                    </span>
                    {editModal.isCertificate && (
                      <>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Request ID: #{editModal.certificateData?.id}</span>
                        {editModal.certificateData?.admin_remarks && (
                          <>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#166534' }}>Admin Remarks:</span>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: '#15803d' }}>{editModal.certificateData.admin_remarks}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setEditModal({ show: false, employee: null })} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}><X size={20} /></button>
            </div>

            <div style={{ padding: '40px', overflowY: 'auto', flex: 1, position: 'relative', background: '#fcfdfe' }}>
              {editModal.isCertificate ? (
                /* Premium Certificate Declaration UI */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {/* Laptop Section */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>LAPTOP DETAILS & SERIAL NUMBER</label>
                    <div style={{ background: '#f0f9ff', border: '1.5px solid #e0f2fe', borderRadius: '24px', padding: '25px', position: 'relative' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1', lineHeight: '1.6' }}>
                        {form.laptop_details || 'No specific details provided for this unit.'}
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#7dd3fc', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        S/N: {form.laptop_details?.match(/S\/N:?\s*([A-Z0-9]+)/i)?.[1] || 'PF5P6L2E'}
                      </div>
                    </div>
                  </div>

                  {/* Peripherals Grid */}
                  <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '30px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                      <div style={{ color: '#22c55e' }}><ShieldCheck size={22} /></div>
                      <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Hardware Peripherals Verified</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                      {[
                        { label: 'Optical Mouse', key: 'mouse', icon: <MousePointer size={18} /> },
                        { label: 'External Keyboard', key: 'keyboard', icon: <Keyboard size={18} /> },
                        { label: 'Laptop Stand', key: 'laptop_stand', icon: <Laptop size={18} /> },
                        { label: 'Company Mobile', key: 'mobile', icon: <Smartphone size={18} /> },
                        { label: 'Earphones', key: 'earphone', icon: <Headphones size={18} /> },
                        { label: 'External Camera', key: 'camera', icon: <Camera size={18} /> },
                        { label: 'Tablet', key: 'tablet', icon: <TabletIcon size={18} /> },
                        { label: 'Pendrive / Storage', key: 'pendrive', icon: <HardDrive size={18} /> },
                        { label: 'Ref Pad / Notebook', key: 'ruf_pad', icon: <ScrollText size={18} /> },
                      ].map((item) => {
                        const isSubmitted = form[item.key] === 'Yes';
                        return (
                          <div key={item.key} style={{ 
                            background: isSubmitted ? '#f0fdf4' : 'white', 
                            border: isSubmitted ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
                            borderRadius: '16px', padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                            transition: '0.2s',
                            boxShadow: isSubmitted ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{ 
                              width: '32px', height: '32px', borderRadius: '50%', 
                              background: isSubmitted ? '#22c55e' : '#f1f5f9', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSubmitted ? 'white' : '#94a3b8'
                            }}>
                              {isSubmitted ? <Check size={18} /> : item.icon}
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: isSubmitted ? '#166534' : '#475569', textAlign: 'center' }}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Original Configuration UI */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr' : '1fr 1fr', gap: '25px' }}>
                    <div style={{ gridColumn: 'span 2', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#3163aa', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1.5px solid #eff6ff', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ScrollText size={14} /> Deployment Base Details
                      </h3>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>EMPLOYEE NAME</label>
                        <input type="text" value={form.employee_name} readOnly style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: '600', fontSize: '14px', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>EMPLOYEE ID</label>
                        <input type="text" value={form.employee_id} readOnly style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: '600', fontSize: '14px', outline: 'none' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>DESIGNATION</label>
                      <input type="text" placeholder="e.g. Lead Software Engineer" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>JOINING DATE</label>
                        <input type="text" placeholder="DD-MM-YYYY" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>LWD</label>
                        <input type="text" placeholder="N/A" value={form.last_working_date} onChange={(e) => setForm({ ...form, last_working_date: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none' }} />
                      </div>
                    </div>

                    <div style={{ gridColumn: 'span 2', margin: '15px 0 10px 0' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#3163aa', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1.5px solid #eff6ff', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Laptop size={14} /> Hardware Inventory
                      </h3>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>
                        <Laptop size={14} /> LAPTOP UNIT DETAILS
                      </label>
                      <textarea placeholder="Model, Serial Number, OS details..." value={form.laptop_details} onChange={(e) => setForm({ ...form, laptop_details: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '14px', minHeight: '80px', resize: 'none', outline: 'none' }} />
                    </div>

                    {[
                      { key: 'mouse', label: 'MOUSE', icon: <MousePointer size={14} /> },
                      { key: 'keyboard', label: 'KEYBOARD', icon: <Keyboard size={14} /> },
                      { key: 'laptop_stand', label: 'LAPTOP STAND', icon: <Laptop size={14} /> },
                      { key: 'ruf_pad', label: 'RUF PAD', icon: <ScrollText size={14} /> },
                      { key: 'pendrive', label: 'PENDRIVE', icon: <HardDrive size={14} /> },
                      { key: 'mobile', label: 'MOBILE UNIT', icon: <Smartphone size={14} /> },
                      { key: 'camera', label: 'CAMERA/WEBCAM', icon: <Camera size={14} /> },
                      { key: 'earphone', label: 'EARPHONE/HEADPHONE', icon: <Headphones size={14} /> },
                      { key: 'tablet', label: 'TABLET UNIT', icon: <TabletIcon size={14} /> }
                    ].map((item) => (
                      <div key={item.key}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', paddingLeft: '4px' }}>{item.icon} {item.label}</label>
                        <select
                          value={form[item.key]}
                          onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                          style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Select Option</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '30px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '20px', background: 'white' }}>
              {editModal.isCertificate ? (
                /* Action Buttons for Certificate (Matches Screenshot with Manager Logic) */
                <>
                  {(['PENDING', 'PENDING AUDIT'].includes(editModal.certificateData?.status?.toUpperCase())) ? (
                    <>
                      <button
                        onClick={() => handleCertificateAction('Rejected')}
                        disabled={saving}
                        style={{ flex: 1, padding: '18px', borderRadius: '20px', border: '2px solid #ef4444', background: 'white', color: '#ef4444', fontSize: '15px', fontWeight: '900', cursor: 'pointer', transition: '0.2s' }}
                      >
                        Reject Submission
                      </button>
                      <button
                        onClick={() => handleCertificateAction('Approved')}
                        disabled={saving}
                        style={{ flex: 2, padding: '18px', borderRadius: '22px', border: 'none', background: '#10b981', color: 'white', fontSize: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.25)', transition: '0.2s' }}
                      >
                        {saving ? 'Processing...' : <><ShieldCheck size={22} /> Approve Declaration</>}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={true}
                      style={{ 
                        flex: 1, padding: '18px', borderRadius: '22px', border: 'none', 
                        background: '#cbd5e1', 
                        color: 'white', fontSize: '16px', fontWeight: '900', 
                        cursor: 'not-allowed', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', 
                        boxShadow: 'none', 
                        transition: '0.2s',
                        opacity: 0.8
                      }}
                    >
                      <Sparkles size={20} /> Declaration Processed
                    </button>
                  )}
                </>
              ) : (
                /* Standard Footer */
                <>
                  <button
                    onClick={() => setEditModal({ show: false, employee: null })}
                    style={{ flex: 1, padding: '16px', borderRadius: '50px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Discard Changes
                  </button>
                  {!editModal.isReadOnly && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{ flex: 2, padding: '16px', borderRadius: '50px', border: 'none', background: '#3163aa', color: 'white', fontSize: '14px', fontWeight: '800', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(49, 99, 170, 0.2)' }}
                    >
                      {saving ? 'Syncing...' : <><Save size={18} /> Submit details</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Assets Modal */}
      {availableAssetsModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="modal-content animate-slide-up" style={{
            background: 'white', borderRadius: '30px', width: '95%', maxWidth: '800px',
            padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column'
          }}>
            <button 
              onClick={() => setAvailableAssetsModal(false)}
              style={{ position: 'absolute', top: '25px', right: '25px', background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#64748b', zIndex: 10 }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '30px', flexShrink: 0 }}>
              <div style={{ background: '#eff6ff', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                <Package size={30} color="#3163aa" />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: '0 0 8px 0' }}>Submitted Assets Directory</h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>List of employees who submitted assets via certificate requests</p>
            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              gap: '20px', 
              overflowX: 'auto',
              padding: '20px 10px',
              scrollSnapType: 'x mandatory',
              minHeight: '300px'
            }}>
              {Object.values(assets).filter(a => a.is_from_certificate).length > 0 ? (
                Object.values(assets).filter(a => a.is_from_certificate).map((asset, i) => {
                  const empName = asset.employee_name || asset.name || 'Unknown';
                  const empId = asset.employee_id || asset.EmpID || asset.id;
                  const status = asset.status || 'PENDING';
                  const isAudit = status.toUpperCase().includes('AUDIT');
                  const badgeColor = isAudit ? '#ef4444' : '#f59e0b';
                  const badgeBg = isAudit ? '#fef2f2' : '#fffbeb';
                  
                  // Construct a dummy employee object for handleEdit
                  const empObj = {
                    id: empId,
                    EmpID: empId,
                    name: empName,
                    role: asset.designation || asset.role
                  };

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        setAvailableAssetsModal(false);
                        handleEdit(empObj, true, asset);
                      }}
                      style={{ 
                        flex: '0 0 220px',
                        background: 'white', 
                        padding: '16px', 
                        borderRadius: '20px', 
                        border: '1px solid #f1f5f9',
                        borderLeft: `5px solid ${badgeColor}`,
                        borderBottom: `2px solid ${badgeColor}20`,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                        scrollSnapAlign: 'start',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 15px 25px rgba(0,0,0,0.06)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
                      }}
                    >
                      {/* Top Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '900', 
                          color: badgeColor, 
                          background: badgeBg, 
                          padding: '3px 8px', 
                          borderRadius: '6px',
                          letterSpacing: '0.5px'
                        }}>
                          {status.toUpperCase()}
                        </span>
                        <div style={{ color: '#cbd5e1' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px', color: '#64748b' }}>
                          <ScrollText size={16} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b', marginBottom: '1px' }}>
                            #{asset.id || (i+1)} Cert
                          </div>
                          <div style={{ fontWeight: '800', fontSize: '12px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {empName}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                            ID: {empId}
                          </div>
                        </div>
                      </div>

                      {/* Footer Purpose */}
                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '8px 10px', 
                        borderRadius: '10px', 
                        fontSize: '10px', 
                        color: '#475569', 
                        fontWeight: '700',
                        textAlign: 'center',
                        border: '1px solid #f1f5f9',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {asset.purpose || asset.reason || 'Asset Declaration'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ flex: 1, padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0', borderRadius: '20px' }}>
                  No asset submissions found in the database.
                </div>
              )}
            </div>

            <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '20px' }}>ℹ️</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', lineHeight: '1.5' }}>
                This directory shows all employees who have already submitted their asset details. Click on any card to view their complete hardware inventory.
              </div>
            </div>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}
