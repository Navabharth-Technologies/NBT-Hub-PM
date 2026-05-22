import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import './PMDashboard.css';

export default function NewJoineeModule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinees, setJoinees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email_id: '',
    role: '',
    joining_date: '',
    employee_id: '',
    reporting_manager: '',
    phone_number: '',
    duration: '',
    is_intern: false
  });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [toastType, setToastType] = useState('success');
  const [leads, setLeads] = useState([]);
  const [deleteConfirmJoinee, setDeleteConfirmJoinee] = useState(null);

  const [viewBlocked, setViewBlocked] = useState(false);
  const [unblocking, setUnblocking] = useState(false);

  // Probation/Internship completion tracking
  const [completedJoinees, setCompletedJoinees] = useState([]);
  const [currentCompletedIndex, setCurrentCompletedIndex] = useState(0);
  const [dismissedCompletions, setDismissedCompletions] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dismissedCompletions_pm') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (window.location.hash === '#blocked') {
      setViewBlocked(true);
    }
    fetchJoinees();
    fetchReminders();
  }, [user]);

  const fetchJoinees = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);

      // Fetch Joinees
      let joineeData = [];
      try {
        const joineeRes = await fetch(API_ENDPOINTS.NEW_JOINEES, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (joineeRes.ok) {
          joineeData = await joineeRes.json();
        } else {
          console.error('Joinee API error:', joineeRes.status);
        }
      } catch (err) {
        console.error('Joinee fetch failed:', err);
      }

      // Fetch Interns
      let internData = [];
      try {
        const internRes = await fetch(API_ENDPOINTS.INTERNS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (internRes.ok) {
          internData = await internRes.json();
        } else {
          console.warn('Intern API responded with status:', internRes.status);
        }
      } catch (err) {
        console.error('Intern fetch failed:', err);
      }

      // Normalize intern data
      const normalizedInterns = (Array.isArray(internData) ? internData : internData.data || []).map(i => {
        const email = i.email_id || i.emailId || i.email || '';
        const storedId = email ? localStorage.getItem('joinee_empid_' + email.toLowerCase().trim()) : '';
        return {
          ...i,
          role: i.role || 'Intern',
          is_intern: true,
          employee_id: storedId || i.employee_id || i.intern_id || i.employeeId || i.internId || i.emp_id || i.EmpID || ''
        };
      });

      const normalizedJoinees = (Array.isArray(joineeData) ? joineeData : []).map(j => {
        const email = j.email_id || j.emailId || j.email || '';
        const storedId = email ? localStorage.getItem('joinee_empid_' + email.toLowerCase().trim()) : '';
        return {
          ...j,
          employee_id: storedId || j.employee_id || j.employeeId || j.intern_id || j.internId || j.emp_id || j.EmpID || ''
        };
      });

      const allJoinees = [...normalizedJoinees, ...normalizedInterns];
      setJoinees(allJoinees);
    } catch (err) {
      console.error('Global fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch onboarding reminders from server API
  const fetchReminders = async () => {
    if (!user?.token) return;
    try {
      const res = await fetch(API_ENDPOINTS.ONBOARDING_REMINDERS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const reminders = Array.isArray(data) ? data : (data.reminders || data.data || []);
        setCompletedJoinees(reminders);
        setCurrentCompletedIndex(0);
      }
    } catch (err) {
      console.error('Reminders fetch error:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.EMPLOYEES, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const teamLeads = (data || []).filter(emp =>
          emp.role?.toUpperCase().includes('LEAD') ||
          emp.role?.toUpperCase().includes('MANAGER')
        );
        setLeads(teamLeads);
      }
    } catch (err) {
      console.error('Leads fetch error:', err);
    }
  };

  useEffect(() => {
    if (user?.token) fetchLeads();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // VALIDATION: Prevent invalid characters based on field type
    let filteredValue = value;

    if (name === 'name' || name === 'role') {
      // Only allow letters and spaces
      filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (name === 'phone_number') {
      // Only allow numbers and cap at 10 digits
      filteredValue = value.replace(/\D/g, '');
      if (filteredValue.length > 10) {
        filteredValue = filteredValue.slice(0, 10);
      }
    } else if (name === 'employee_id') {
      // Alphanumeric only
      filteredValue = value.replace(/[^a-zA-Z0-9]/g, '');
    } else if (name === 'duration') {
      // Only digits
      let digits = value.replace(/\D/g, '');
      if (digits !== '') {
        const val = parseInt(digits, 10);
        if (formData.is_intern) {
          if (val > 12) digits = '12';
        } else {
          if (val > 365) digits = '365';
        }
      }
      filteredValue = digits;
    } else if (name === 'email_id') {
      const atIndex = value.indexOf('@');
      if (atIndex !== -1) {
        const domainPart = value.substring(atIndex + 1);
        const comIndex = domainPart.indexOf('.com');
        if (comIndex !== -1) {
          filteredValue = value.substring(0, atIndex + 1 + comIndex + 4);
        }
      }
    }

    setFormData(prev => ({ ...prev, [name]: filteredValue }));
  };

  const handleEdit = (joinee) => {
    // Prioritize the database primary key (id or _id) over the business ID
    const dbId = joinee.id || joinee._id || joinee.id_intern || joinee.employee_id;
    setEditingId(dbId);
    console.log('Editing candidate with DB ID:', dbId, 'Full object:', joinee);

    // Try to find the matching manager from our leads list to ensure the dropdown selects correctly
    const existingManager = leads.find(l => {
      const leadId = String(l.id || l.employee_id || '');
      const dbIdMatch = String(joinee.Reporting_manager_id || joinee.reporting_manager_id || '');
      const leadName = (l.name || '').toLowerCase().trim();
      const dbName = (joinee.Reporting_manager || joinee.reporting_manager || joinee.manager || '').toLowerCase().trim();

      return (leadId !== '' && leadId === dbIdMatch) || (leadName !== '' && leadName === dbName);
    });

    const email = joinee.email_id || joinee.emailId || joinee.email || '';
    const storedId = email ? localStorage.getItem('joinee_empid_' + email.toLowerCase().trim()) : '';
    const empId = storedId || joinee.employee_id || joinee.employeeId || joinee.intern_id || joinee.internId || joinee.emp_id || joinee.EmpID || joinee.id || '';

    setFormData({
      name: joinee.name || '',
      email_id: joinee.email_id || joinee.emailId || joinee.email || '',
      role: joinee.role || joinee.Designation || '',
      joining_date: joinee.joining_date || joinee.joiningDate ? new Date(joinee.joining_date || joinee.joiningDate).toISOString().split('T')[0] : '',
      employee_id: empId,
      reporting_manager: existingManager ? (existingManager.employee_id || existingManager.name) : (joinee.Reporting_manager_id || joinee.reporting_manager_id || joinee.Reporting_manager || joinee.reporting_manager || joinee.manager || ''),
      phone_number: joinee.phone_number || joinee.phone || joinee.contact_no || '',
      duration: joinee.duration || joinee.duration || '',
      is_intern: !!joinee.is_intern
    });
    setShowAddModal(true);
  };

  const handleAddJoinee = async (e) => {
    e.preventDefault();

    // FINAL VALIDATION BEFORE SUBMISSION
    if (!formData.name || formData.name.length < 3) {
      setToastMessage('Please enter a valid full name (min 3 characters)');
      setToastType('error');
      setShowSuccessToast(true);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/;
    if (!emailRegex.test(formData.email_id)) {
      setToastMessage('Please enter a valid email address ending with .com (e.g. abc@gmail.com)');
      setToastType('error');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }

    if (formData.phone_number.length !== 10) {
      setToastMessage('Phone number must be exactly 10 digits');
      setToastType('error');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      return;
    }

    if (!formData.joining_date) {
      setToastMessage('Joining date is required');
      setToastType('error');
      setShowSuccessToast(true);
      return;
    }

    if (!user?.token) return;
    setSaving(true);

    const isIntern = formData.is_intern;
    const generatedEmpId = formData.employee_id || (isIntern ? ('INT-' + Math.floor(1000 + Math.random() * 9000)) : ('NBT-' + Math.floor(1000 + Math.random() * 9000)));
    const originalJoinee = editingId ? joinees.find(j => (j.id || j._id || j.id_intern) === editingId) : null;

    const endpoint = editingId
      ? (isIntern ? API_ENDPOINTS.INTERN_UPDATE(editingId) : API_ENDPOINTS.NEW_JOINEE_UPDATE(editingId))
      : (isIntern ? API_ENDPOINTS.INTERNS : API_ENDPOINTS.NEW_JOINEES);
    const method = editingId ? 'PUT' : 'POST';

    // For Interns, we need the manager ID and specific field names from the DB schema
    const selectedLead = leads.find(l =>
      String(l.employee_id || l.id) === String(formData.reporting_manager) ||
      (l.name || '').toLowerCase().trim() === (formData.reporting_manager || '').toLowerCase().trim()
    );

    const payload = isIntern ? {
      name: formData.name,
      email: formData.email_id,
      email_id: formData.email_id,
      emailId: formData.email_id,
      password: 'Intern@' + (generatedEmpId || '123'),
      role: formData.role,
      joining_date: formData.joining_date,
      joiningDate: formData.joining_date,
      intern_id: generatedEmpId,
      internId: generatedEmpId,
      employee_id: generatedEmpId,
      employeeId: generatedEmpId,
      emp_id: generatedEmpId,
      EmpID: generatedEmpId,
      reporting_manager_id: selectedLead?.id || selectedLead?.employee_id || originalJoinee?.Reporting_manager_id || originalJoinee?.reporting_manager_id,
      reporting_manager: selectedLead?.name || formData.reporting_manager,
      stipend: 0,
      duration: formData.duration || 6,
      status: 'Active',
      phone_number: formData.phone_number,
      personal_email: formData.email_id
    } : {
      name: formData.name,
      role: formData.role,
      emailId: formData.email_id,
      joiningDate: formData.joining_date,
      courseCompletion: 0,
      email_id: formData.email_id,
      employee_id: generatedEmpId,
      employeeId: generatedEmpId,
      emp_id: generatedEmpId,
      EmpID: generatedEmpId,
      intern_id: generatedEmpId,
      internId: generatedEmpId,
      status: 'Active',
      phone_number: formData.phone_number,
      duration: formData.duration,
      color: ['#312e81', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)]
    };

    console.log('API Request:', { method, endpoint, payload });

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const emailKey = (formData.email_id || '').toLowerCase().trim();
        if (emailKey && generatedEmpId) {
          localStorage.setItem('joinee_empid_' + emailKey, generatedEmpId);
        }
        setToastMessage(editingId ? 'Information updated successfully! 🎉' : (isIntern ? 'Intern added successfully! 🎉' : 'New Joinee Successfully Enrolled! 🎉'));
        setToastType('success');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        setShowAddModal(false);
        setEditingId(null);
        setFormData({ name: '', email_id: '', role: '', joining_date: '', employee_id: '', reporting_manager: '', phone_number: '', duration: '', is_intern: false });
        fetchJoinees();
      } else {
        const errData = await response.json().catch(() => ({}));
        setToastMessage(errData.message || `Failed to ${editingId ? 'update' : 'add'} ${isIntern ? 'intern' : 'joinee'}. Status: ${response.status}`);
        setToastType('error');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setToastMessage('Server connection error. Please check your network.');
      setToastType('error');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (joinee) => {
    if (!user?.token) return;
    try {
      const isIntern = !!joinee.is_intern;
      const endpoint = isIntern
        ? `${API_ENDPOINTS.INTERNS}/${joinee.id || joinee._id}`
        : `${API_ENDPOINTS.NEW_JOINEES}/${joinee.id || joinee._id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.ok) {
        setToastMessage(`${isIntern ? 'Intern' : 'Joinee'} removed successfully!`);
        setToastType('success');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        fetchJoinees();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleUnblock = async (joinee) => {
    if (!user?.token) return;
    setUnblocking(true);
    try {
      const dbId = joinee.id || joinee.employee_id || joinee._id;
      const payload = {
        is_blocked: 0,
        isBlocked: false,
        status: 'Active'
      };

      // Try 1: Standard Unblock
      let response = await fetch(API_ENDPOINTS.NEW_JOINEE_UNBLOCK(dbId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Try 2: Admin Unblock
      if (response.status === 403 || response.status === 404) {
        response = await fetch(API_ENDPOINTS.NEW_JOINEE_UNBLOCK_ADMIN(dbId), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      // Try 3: Direct Profile Update (Most likely to work for standard fields)
      if (!response.ok) {
        response = await fetch(API_ENDPOINTS.NEW_JOINEE_UPDATE(dbId), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        await fetchJoinees(); // Refresh data first
        setToastMessage("Unblocked successfully");
        setToastType('success');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        setToastMessage(err.message || "Failed to unblock employee.");
        setToastType('error');
        setShowSuccessToast(true);
      }
    } catch (err) {
      console.error('Unblock error:', err);
    } finally {
      setUnblocking(false);
    }
  };

  const handleUnblockAll = async () => {
    if (!user?.token || !window.confirm('Are you sure you want to unblock ALL employees? This will restore access for everyone who was blocked for pending courses.')) return;
    setUnblocking(true);
    try {
      let response = await fetch(API_ENDPOINTS.UNBLOCK_ALL_JOINEES_ALT, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_blocked: 0 })
      });

      if (response.status === 403 || !response.ok) {
        // Try the admin one if the standard one fails
        response = await fetch(API_ENDPOINTS.UNBLOCK_ALL_JOINEES, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_blocked: 0 })
        });
      }
      if (response.ok) {
        setToastMessage("Unblocked successfully");
        setToastType('success');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        fetchJoinees();
      } else {
        const err = await response.json().catch(() => ({}));
        setToastMessage(err.message || 'Failed to unblock all.');
        setToastType('error');
        setShowSuccessToast(true);
      }
    } catch (err) {
      console.error('Bulk unblock error:', err);
    } finally {
      setUnblocking(false);
    }
  };

  const filteredJoinees = joinees.filter(j => {
    const matchesSearch = j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.role.toLowerCase().includes(searchTerm.toLowerCase());
    const isBlocked = Number(j.is_blocked) === 1;
    if (viewBlocked) return matchesSearch && isBlocked;
    return matchesSearch && !isBlocked;
  });

  return (
    <div className="pm-dashboard-container">
      <AppHeader />

      <main className="dashboard-content" style={{ flex: 1, paddingTop: isMobile ? '100px' : '120px', paddingLeft: isMobile ? '16px' : '26px', paddingRight: isMobile ? '16px' : '26px', paddingBottom: '120px', width: '100%', boxSizing: 'border-box', margin: '0' }}>
        <header className="section-header" style={{ marginBottom: isMobile ? '20px' : '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '3px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: 0 }}>New Joinee Onboarding</h1>
              <p style={{ color: '#64748b', margin: '2px 0 0 0' }}>Monitor and welcome our newest team members</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', border: '1px solid #e2e8f0' }}>
              <button onClick={() => setViewBlocked(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !viewBlocked ? 'white' : 'transparent', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>Active Hires</button>
              <button onClick={() => setViewBlocked(true)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: viewBlocked ? '#ef4444' : 'transparent', color: viewBlocked ? 'white' : '#64748b', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}>Blocked</button>
            </div>
            {viewBlocked && joinees.some(j => Number(j.is_blocked) === 1) && (
              <button
                onClick={handleUnblockAll}
                disabled={unblocking}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '14px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🔓 {unblocking ? 'UNBLOCKING...' : 'Unblock All'}
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button className="btn-primary" onClick={() => setShowAddDropdown(!showAddDropdown)}>+ Add member</button>
              {showAddDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: 'white', borderRadius: '14px', boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                  padding: '8px', zIndex: 1000, minWidth: '200px', border: '1px solid #e2e8f0',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <button
                    onClick={() => { setShowAddModal(true); setEditingId(null); setShowAddDropdown(false); setFormData({ name: '', email_id: '', role: '', joining_date: '', employee_id: '', reporting_manager: '', phone_number: '', duration: '', is_intern: false }); }}
                    style={{
                      width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none',
                      background: 'transparent', cursor: 'pointer', borderRadius: '10px',
                      fontWeight: '700', color: '#1e293b', fontSize: '14px', transition: '0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    👤 Add new employee
                  </button>
                  <button
                    onClick={() => { setShowAddModal(true); setEditingId(null); setShowAddDropdown(false); setFormData({ name: '', email_id: '', role: 'Intern', joining_date: '', employee_id: '', reporting_manager: '', phone_number: '', duration: '', is_intern: true }); }}
                    style={{
                      width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none',
                      background: 'transparent', cursor: 'pointer', borderRadius: '10px',
                      fontWeight: '700', color: '#1e293b', fontSize: '14px', transition: '0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🎓 Add new Intern
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px' }}>
          <div style={{ flex: '1', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '14px' }}>🔍</span>
            <input type="text" placeholder="Search hires..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', outline: 'none' }} />
          </div>
        </div>

        <div className="responsive-card-grid">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>Fetching latest hire signals...</div>
          ) : filteredJoinees.length > 0 ? (
            filteredJoinees.map((joinee, i) => (
              <div key={i} className="team-card" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #eef2f6', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: `${joinee.color || '#3863a8'}15`, color: joinee.color || '#3863a8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900' }}>{joinee.name.charAt(0)}</div>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '800' }}>{joinee.name}</h3>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{joinee.role}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(joinee); }}
                      style={{ padding: '8px', borderRadius: '10px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmJoinee(joinee); }}
                      style={{ padding: '8px', borderRadius: '10px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '13px', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', minWidth: '110px' }}>Joining Date</span>
                    <span style={{ fontWeight: '700', color: '#1e293b' }}>
                      {joinee.joining_date || joinee.joiningDate ? new Date(joinee.joining_date || joinee.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  {(joinee.reporting_manager || joinee.reporting_manager_id || joinee.manager) && (
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', minWidth: '110px' }}>Manager</span>
                      <span style={{ fontWeight: '700', color: '#0369a1' }}>{joinee.reporting_manager || joinee.reporting_manager_id || joinee.manager}</span>
                    </div>
                  )}
                  {(joinee.phone_number || joinee.phone) && (
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', minWidth: '110px' }}>Phone</span>
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>{joinee.phone_number || joinee.phone}</span>
                    </div>
                  )}
                  {joinee.duration && (
                    <div style={{ display: 'flex', gap: '10px', fontSize: '13px', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8', minWidth: '110px' }}>Duration</span>
                      <span style={{ fontWeight: '700', color: '#f59e0b' }}>{joinee.duration} {joinee.is_intern ? 'Months' : 'Days'}</span>
                    </div>
                  )}
                </div>
                {Number(joinee.is_blocked) === 1 && (
                  <button onClick={(e) => { e.stopPropagation(); handleUnblock(joinee); }} style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>🔓 Unblock Employee</button>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', width: '100%' }}>No candidates found.</div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
            background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                background: 'white', padding: isMobile ? '20px 16px' : '24px 40px', borderRadius: '32px',
                width: '90%', maxWidth: '520px', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.3)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '18px',
                  background: '#f8fafc', border: '1.5px solid #eef2f6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.03)'
                }}>
                  <Sparkles size={24} color="#f59e0b" fill="#f59e0b" />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: '0 0 4px 0', textAlign: 'center', letterSpacing: '-0.5px' }}>
                  {editingId ? 'Edit information' : (formData.is_intern ? 'Enroll new Intern' : 'Enroll new employee')}
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: '700', textAlign: 'center' }}>{editingId ? 'Update candidate details' : 'Add candidate details to start onboarding'}</p>
              </div>

              <form onSubmit={handleAddJoinee} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px 20px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>Full Name</label>
                  <input
                    type="text" name="name" value={formData.name} onChange={handleInputChange}
                    placeholder="e.g. Aditi Sharma" required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', transition: 'all 0.2s', color: '#0B1E3F' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>Email Address</label>
                  <input
                    type="email" name="email_id" value={formData.email_id} onChange={handleInputChange}
                    placeholder="e.g. aditi@example.com" required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', color: '#0B1E3F' }}
                  />
                </div>



                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>Phone Number</label>
                  <input
                    type="tel" name="phone_number" value={formData.phone_number} onChange={handleInputChange}
                    placeholder="e.g. +91 9876543210" required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', color: '#0B1E3F' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>Designation</label>
                  <input
                    type="text" name="role" value={formData.role} onChange={handleInputChange}
                    placeholder={formData.is_intern ? 'Intern' : 'e.g. Software Engineer'} required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', color: '#0B1E3F' }}
                  />
                </div>

                {formData.is_intern && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>Reporting Manager</label>
                    <select
                      name="reporting_manager"
                      value={formData.reporting_manager}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', color: '#0B1E3F', cursor: 'pointer' }}
                    >
                      <option value="">Select Manager...</option>
                      {leads.map((lead, i) => (
                        <option key={i} value={lead.employee_id || lead.name}>{lead.name} ({lead.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>Joining Date</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date" name="joining_date" value={formData.joining_date} onChange={handleInputChange}
                      required
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', color: '#0B1E3F' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>{formData.is_intern ? 'Duration (Months)' : 'Duration (Days)'}</label>
                  <input
                    type="text" name="duration" value={formData.duration} onChange={handleInputChange}
                    placeholder={formData.is_intern ? 'e.g. 6' : 'e.g. 10'} required
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 18px', borderRadius: '14px', border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', fontSize: '13px', outline: 'none', color: '#0B1E3F' }}
                  />
                </div>

                <div style={{ gridColumn: isMobile ? 'span 1' : 'span 2', display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingId(null); }}
                    style={{ flex: 1, padding: '12px', background: 'white', color: '#64748b', border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ flex: 1.6, padding: '12px', background: '#315A9E', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 12px 30px -5px rgba(49, 90, 158, 0.45)', transition: 'all 0.2s' }}
                  >
                    {saving ? 'Updating...' : (editingId ? 'Save Changes' : 'Confirm Enrollment')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmJoinee && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
            background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                background: 'white', padding: isMobile ? '24px 20px' : '36px 40px', borderRadius: '28px',
                width: '90%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                textAlign: 'center', position: 'relative'
              }}
            >
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: '#fee2e2', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', fontSize: '28px'
              }}>
                ⚠️
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                Confirm Deletion
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6', fontWeight: '600' }}>
                Are you sure you want to delete <span style={{ fontWeight: '900', color: '#ef4444' }}>{deleteConfirmJoinee.name}</span>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteConfirmJoinee(null)}
                  style={{
                    flex: 1, padding: '12px 20px', background: 'white', color: '#64748b',
                    border: '2px solid #e2e8f0', borderRadius: '14px', fontWeight: '900', fontSize: '14px',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const joinee = deleteConfirmJoinee;
                    setDeleteConfirmJoinee(null);
                    await executeDelete(joinee);
                  }}
                  style={{
                    flex: 1.2, padding: '12px 20px', background: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px',
                    cursor: 'pointer', boxShadow: '0 6px 16px rgba(239, 68, 68, 0.35)',
                    transition: 'all 0.2s'
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Probation/Internship Completion Modal */}
      {(() => {
        const visibleCompleted = completedJoinees.filter(j => {
          const jId = j.id || j._id || j.employee_id || j.intern_id;
          return !dismissedCompletions.includes(jId);
        });
        const currentJoinee = visibleCompleted[0];
        if (!currentJoinee) return null;
        const isIntern = !!currentJoinee.is_intern;
        const jId = currentJoinee.id || currentJoinee._id || currentJoinee.employee_id || currentJoinee.intern_id;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500
          }}>
            <div style={{
              background: 'white', borderRadius: '28px', padding: isMobile ? '28px 20px' : '36px 40px',
              maxWidth: '440px', width: '90%', textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)', animation: 'fadeInScale 0.3s ease'
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: isIntern ? '#fef3c7' : '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', fontSize: '28px'
              }}>
                {isIntern ? '🎓' : '🏆'}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                {isIntern ? 'Internship Completed!' : 'Probation Completed!'}
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px', lineHeight: '1.6', fontWeight: '600' }}>
                <span style={{ fontWeight: '900', color: '#0f172a' }}>{currentJoinee.name}</span>'s {isIntern ? 'internship' : 'probation'} period has been completed.
                Would you like to allow them to continue employment in this company?
              </p>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    const updated = [...dismissedCompletions, jId];
                    setDismissedCompletions(updated);
                    try { sessionStorage.setItem('dismissedCompletions_pm', JSON.stringify(updated)); } catch {}
                  }}
                  style={{
                    flex: 1, padding: '12px 20px', background: '#fee2e2', color: '#dc2626',
                    border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  No
                </button>
                <button
                  onClick={async () => {
                    try {
                      const promoteRes = await fetch(API_ENDPOINTS.ONBOARDING_PROMOTE, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${user.token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          id: currentJoinee.id || currentJoinee._id,
                          employee_id: currentJoinee.employee_id || currentJoinee.intern_id,
                          name: currentJoinee.name,
                          email: currentJoinee.email_id || currentJoinee.emailId || currentJoinee.email,
                          role: currentJoinee.role,
                          is_intern: !!currentJoinee.is_intern,
                          type: currentJoinee.is_intern ? 'intern' : 'new_joinee'
                        })
                      });
                      if (promoteRes.ok) {
                        setToastMessage(`${currentJoinee.name} has been promoted to full employee! 🎉`);
                        setToastType('success');
                      } else {
                        setToastMessage(`${currentJoinee.name} confirmed for continued employment! 🎉`);
                        setToastType('success');
                      }
                    } catch (err) {
                      console.error('Promote error:', err);
                      setToastMessage(`${currentJoinee.name} confirmed for continued employment! 🎉`);
                      setToastType('success');
                    }
                    // Dismiss this notification
                    const updated = [...dismissedCompletions, jId];
                    setDismissedCompletions(updated);
                    try { sessionStorage.setItem('dismissedCompletions_pm', JSON.stringify(updated)); } catch {}
                    setShowSuccessToast(true);
                    setTimeout(() => setShowSuccessToast(false), 3000);
                    // Refresh data
                    fetchJoinees();
                    fetchReminders();
                  }}
                  style={{
                    flex: 1, padding: '12px 20px', background: '#22c55e', color: 'white',
                    border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px',
                    cursor: 'pointer', boxShadow: '0 6px 16px rgba(34, 197, 94, 0.35)',
                    transition: 'all 0.2s'
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showSuccessToast && (
        <div style={{
          position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
          background: toastType === 'error' ? '#ef4444' : '#312e81',
          color: 'white', padding: '16px 32px', borderRadius: '16px', fontWeight: '800', zIndex: 3000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', minWidth: '300px', textAlign: 'center'
        }}>
          {toastMessage}
        </div>
      )}

      <AppFooter />
    </div>
  );
}
