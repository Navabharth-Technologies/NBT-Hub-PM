import React, { useState, useEffect, cloneElement, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Save, CreditCard, Building2, FileText,
  Shield, AlertCircle, CheckCircle2, User, Hash, Landmark, RefreshCw,
  Briefcase, MapPin, Mail, Phone, GraduationCap, History, DollarSign,
  FileCheck, Users, Calendar, Heart, Globe, Trash2, Pencil, Upload, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

const LOCKED_FIELDS = ['gross_salary_a', 'salary', 'pt', 'bgv_status', 'approved_by_ceo'];

const SECTIONS = [
  {
    id: 'primary',
    label: 'Primary Profile',
    icon: <User size={20} />,
    color: '#3b82f6',
    fields: [
      { key: 'emp_name', label: 'Employee Name', placeholder: 'Full Name', type: 'text' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { key: 'dob', label: 'Date of Birth', type: 'text', placeholder: 'DD-MM-YYYY' },
      { key: 'age', label: 'Age', type: 'text', placeholder: 'Years' },
      { key: 'religion', label: 'Religion', type: 'text' },
      { key: 'blood_group', label: 'Blood Group', type: 'text' },
      { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. Indian' },
      { key: 'father_husband_name', label: "Father/Husband's Name", type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Other'] },
      { key: 'pan_number', label: 'PAN Number', type: 'text', placeholder: 'ABCDE1234F' },
      { key: 'pan_proof', label: 'PAN Card Proof', type: 'file' },
      { key: 'aadhar_number', label: 'Aadhar Number', type: 'text', placeholder: '1234 5678 9012' },
      { key: 'aadhar_proof', label: 'Aadhar Card Proof', type: 'file' },
      { key: 'voter_id', label: 'Voter ID Number', type: 'text' },
      { key: 'voter_proof', label: 'Voter ID Proof', type: 'file' },
      { key: 'passport_no', label: 'Passport No', type: 'text' },
      { key: 'passport_proof', label: 'Passport Proof', type: 'file' },
    ]
  },
  {
    id: 'hierarchy',
    label: 'Organizational Hierarchy',
    icon: <Building2 size={20} />,
    color: '#8b5cf6',
    fields: [
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'process', label: 'Process', type: 'text' },
      { key: 'supervisor_l1', label: 'Supervisor L1 (Reporting Person)', type: 'text' },
      { key: 'supervisor_l2', label: 'Supervisor L2', type: 'text' },
      { key: 'doj', label: 'Date of Joining', type: 'text', placeholder: 'DD-MM-YYYY' },
      { key: 'ft_pt', label: 'FT/PT', type: 'select', options: ['Full Time', 'Part Time', 'Contract'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Bench', 'Notice Period', 'Terminated'] },
      { key: 'place', label: 'Work Location', type: 'text' },
      { key: 'moved', label: 'Moved (Project/Dept)', type: 'text' },
      { key: 'official_email', label: 'Official Email ID', type: 'text' },
    ]
  },
  {
    id: 'contact',
    label: 'Contact & Geography',
    icon: <MapPin size={20} />,
    color: '#10b981',
    fields: [
      { key: 'contact_no', label: 'Contact No', type: 'text' },
      { key: 'emergency_contact_no', label: 'Emergency Contact No', type: 'text' },
      { key: 'personal_email', label: 'Personal Email ID', type: 'text' },
      { key: 'present_address', label: 'Present Address', type: 'text' },
      { key: 'permanent_address', label: 'Permanent Address', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
    ]
  },
  {
    id: 'academic',
    label: 'Academic & Career',
    icon: <GraduationCap size={20} />,
    color: '#f59e0b',
    fields: [
      { key: 'qualification', label: 'Qualification', type: 'text' },
      { key: 'edu_completion_year', label: 'EDU Completion Year', type: 'text' },
      { key: 'college', label: 'College', type: 'text' },
      { key: 'university', label: 'University', type: 'text' },
      { key: 'previous_org', label: 'Previous Organization', type: 'text' },
      { key: 'previous_exp', label: 'Previous Experience', type: 'text' },
      { key: 'source', label: 'Source', type: 'text' },
      { key: 'languages_known', label: 'Languages Known', type: 'text' },
    ]
  },
  {
    id: 'exit',
    label: 'Exit & Retention',
    icon: <History size={20} />,
    color: '#ef4444',
    fields: [
      { key: 'separation', label: 'Separation Date', type: 'text', placeholder: 'DD-MM-YYYY' },
      { key: 'lwd', label: 'Last Working Day (LWD)', type: 'text' },
      { key: 'attrition_bucket', label: 'Attrition Bucket', type: 'select', options: ['N/A', 'Resignation', 'Performance', 'Behavioral', 'Medical'] },
      { key: 'reason', label: 'Reason of Separation', type: 'text' },
    ]
  },
  {
    id: 'finance',
    label: 'Banking & Finance',
    icon: <Landmark size={20} />,
    color: '#315A9E',
    fields: [
      { key: 'bank_name', label: 'Bank Name', type: 'text' },
      { key: 'bank_account_no', label: 'Bank Account No.', type: 'text' },
      { key: 'ifsc_code', label: 'IFSC Code', type: 'text' },
      { key: 'bank_branch', label: 'Bank Branch', type: 'text' },
      { key: 'gross_salary_a', label: 'Gross Salary (A)', type: 'text' },
      { key: 'salary', label: 'Net Salary', type: 'text' },
      { key: 'pt', label: 'Professional Tax (PT)', type: 'text' },
    ]
  },
  {
    id: 'compliance',
    label: 'Compliance & Docs',
    icon: <FileCheck size={20} />,
    color: '#0ea5e9',
    fields: [
      { key: 'bgv_status', label: 'BGV Status', type: 'select', options: ['Pending', 'Completed', 'Failed'] },
      { key: 'appointment_letter', label: 'Appointment Letter', type: 'select', options: ['Not Sent', 'Sent', 'Signed'] },
      { key: 'approved_by_ceo', label: 'Approved By CEO', type: 'select', options: ['No', 'Yes'] },
      { key: 'onboarding_doc_completed', label: 'Onboarding Doc Completed', type: 'select', options: ['No', 'Yes'] },
      { key: 'id_card', label: 'ID Card Status', type: 'select', options: ['Not Issued', 'Issued'] },
      { key: 'onboarding_link', label: 'Onboarding Link', type: 'text' },
    ]
  }
];

export default function PersonalInfo({ onBack }) {
  const { user, updateUserData } = useAuth();
  const [form, setForm] = useState({
    emp_name: '', gender: 'Male', dob: '', age: '', religion: '', blood_group: '', marital_status: 'Single', nationality: 'Indian', father_husband_name: '', pan_number: '', aadhar_number: '', category: 'General',
    pan_proof: '', aadhar_proof: '', voter_id: '', voter_proof: '', passport_no: '', passport_proof: '',
    designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: 'Full Time', status: 'Active', place: '', moved: '', official_email: '',
    contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
    qualification: '', edu_completion_year: '', college: '', university: '', previous_org: '', previous_exp: '', source: '', languages_known: '',
    separation: '', lwd: '', attrition_bucket: 'N/A', reason: '',
    bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '',
    bgv_status: 'Pending', appointment_letter: 'Not Sent', approved_by_ceo: 'No', onboarding_doc_completed: 'No', id_card: 'Not Issued', onboarding_link: '',
    profile_pic: ''
  });
  const profileInputRef = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const isTablet = winWidth < 1024;
  const [activeSection, setActiveSection] = useState('primary');
  const [isEditing, setIsEditing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  useEffect(() => {
    const savedId = localStorage.getItem('last_selected_emp_id');
    const currentUserId = user?.employee_id || user?.id || user?.email || user?.EmpID;
    
    if (savedId && employees.some(e => String(e.employee_id || e.id) === String(savedId))) {
      setSelectedEmpId(savedId);
    } else if (currentUserId) {
      setSelectedEmpId(currentUserId);
    }
  }, [user, employees]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${BASE_URL}/api/employees`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      }
    };
    fetchEmployees();
  }, [user]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const uid = selectedEmpId;
        if (!uid) return;

        const emptyForm = {
          emp_name: '', gender: 'Male', dob: '', age: '', religion: '', blood_group: '', marital_status: 'Single', nationality: 'Indian', father_husband_name: '', pan_number: '', aadhar_number: '', category: 'General',
          pan_proof: '', aadhar_proof: '', voter_id: '', voter_proof: '', passport_no: '', passport_proof: '',
          designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: 'Full Time', status: 'Active', place: '', moved: '', official_email: '',
          contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
          qualification: '', edu_completion_year: '', college: '', university: '', previous_org: '', previous_exp: '', source: '', languages_known: '',
          separation: '', lwd: '', attrition_bucket: 'N/A', reason: '',
          bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '',
          bgv_status: 'Pending', appointment_letter: 'Not Sent', approved_by_ceo: 'No', onboarding_doc_completed: 'No', id_card: 'Not Issued', onboarding_link: '',
          profile_pic: ''
        };
        setForm(emptyForm);

        const token = localStorage.getItem('token');
        const res = await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_GET(uid), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          let response = await res.json();
          let data = response.data || response.profile || response.record || response;
          if (Array.isArray(data)) data = data[0];
          
          if (!data || typeof data !== 'object') return;

          const cleanData = {};
          Object.keys(data).forEach(apiKey => {
            const val = data[apiKey];
            const normalizedVal = (val === null || val === undefined) ? '' : val;
            const lowerKey = apiKey.toLowerCase();
            let targetKey = Object.keys(emptyForm).find(formKey => formKey.toLowerCase() === lowerKey) || apiKey;
            
            // Iron-Clad mapping for profile picture column variations
            if (lowerKey === 'profile_picture') targetKey = 'profile_pic';
            
            cleanData[targetKey] = normalizedVal;
          });

          setForm(prev => ({ ...prev, ...cleanData }));
        }
      } catch (err) {
        console.error("Failed to sync profile info:", err);
      }
    };
    loadDocs();
  }, [selectedEmpId]);

  const handleFileSelect = async (key, file) => {
    if (!file) return;
    setIsEditing(true);
    setUploadingFiles(prev => ({ ...prev, [key]: true }));
    try {
      const token = localStorage.getItem('token');
      if (key === 'profile_pic') {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('employee_id', selectedEmpId);

        const res = await fetch(API_ENDPOINTS.PROFILE_UPLOAD_IMAGE, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}` 
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const url = data.url || data.filePath || data.path || data.record?.path;
          if (url) {
            setForm(prev => ({ ...prev, [key]: url }));
            
            // Persist the URL via PROFILE_UPDATE ONLY if updating SELF
            const currentUserId = String(user?.employee_id || user?.id || user?.EmpID);
            const isSelf = String(selectedEmpId) === currentUserId;

            if (isSelf) {
              await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                  profile_pic: url, 
                  profile_picture: url,
                  email: user?.email 
                })
              });
              updateUserData({ profile_pic: url, profile_picture: url });
            }

            // ALWAYS persist to the Target Profile Record (Metadata Table)
            await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                profile_pic: url, 
                profile_picture: url,
                employee_id: selectedEmpId,
                id: selectedEmpId 
              })
            });

            setToast({ type: 'success', msg: `PROFILE PIC Attached!` });
          }
        }
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('employee_id', selectedEmpId);
        formData.append('type', key);
        const res = await fetch(API_ENDPOINTS.PROFILE_UPLOAD_DOCUMENT, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          const url = data.url || data.filePath || data.path || data.record?.path;
          if (url) {
            setForm(prev => ({ ...prev, [key]: url }));

            // Persist the document URL to the DB immediately
            await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ 
                [key]: url, 
                employee_id: selectedEmpId, 
                id: selectedEmpId 
              })
            });

            setToast({ type: 'success', msg: `${key.replace('_', ' ').toUpperCase()} Attached!` });
          }
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleChange = (key, value) => {
    let updates = { [key]: value };
    if (key === 'dob' && value && value.length === 10) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const birthDate = new Date(year, month, day);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
          if (age >= 0) updates.age = String(age);
        }
      }
    }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = selectedEmpId;
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...form, employee_id: uid, id: uid })
      });
      if (res.ok) {
        setToast({ type: 'success', msg: 'Profile Info updated successfully!' });
        setIsEditing(false);
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const userRole = user?.role?.toLowerCase() || 'employee';
  const isAdmin = ['admin', 'manager', 'lead', 'teamleader', 'ceo', 'hr'].includes(userRole);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fa', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      
      <div style={{ flex: 1, padding: isMobile ? '15px' : '40px', boxSizing: 'border-box', overflowX: 'hidden', width: '100%', marginTop: isMobile ? '80px' : '70px' }}>
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              style={{
                position: 'fixed', top: isMobile ? '20px' : '110px', left: '50%', transform: 'translateX(-50%)',
                zIndex: 9999, backgroundColor: toast.type === 'success' ? '#0B1E3F' : '#ef4444',
                color: 'white', padding: '14px 28px', borderRadius: '16px',
                display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}
            >
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '32px', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={onBack} style={{ padding: '12px', borderRadius: '14px', backgroundColor: 'white', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}>
              <ChevronLeft size={22} color="#0B1E3F" />
            </button>
            <div>
              <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Profile Info</h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '2px 0 0 0', fontWeight: '600' }}>Employee metadata record</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ position: 'relative', minWidth: isMobile ? '100%' : '240px' }}>
              <Users size={16} color="#64748b" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedEmpId(newId);
                  localStorage.setItem('last_selected_emp_id', newId);
                  setIsEditing(false);
                }}
                style={{
                  width: '100%', padding: '12px 16px 12px 40px', borderRadius: '16px', border: '1.5px solid #e2e8f0',
                  backgroundColor: 'white', color: '#0B1E3F', fontSize: '14px', fontWeight: '800', outline: 'none', appearance: 'none'
                }}
              >
                <option value={user?.employee_id || user?.id || user?.email || user?.EmpID}>
                  My Profile ({user?.name || 'Self'})
                </option>
                {employees.filter(emp => (emp.employee_id || emp.id) !== (user?.employee_id || user?.id)).map(emp => (
                  <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                    {emp.name || emp.emp_name} ({emp.employee_id || emp.id})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={saving}
              style={{
                padding: '14px 28px', backgroundColor: isEditing ? '#315A9E' : 'white', color: isEditing ? 'white' : '#0B1E3F',
                border: isEditing ? 'none' : '1.5px solid #0B1E3F', borderRadius: '16px', fontWeight: '900', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {isEditing ? (saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />) : <Pencil size={16} />}
              {isEditing ? (saving ? 'Saving...' : 'Save All') : 'Edit Profile'}
            </motion.button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '10px', overflowX: 'auto', paddingBottom: isMobile ? '10px' : '0' }}>
            {SECTIONS.map(sec => (
              <motion.button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                style={{
                  padding: '16px 20px', borderRadius: '18px', border: `1.5px solid ${activeSection === sec.id ? '#0B1E3F' : '#e2e8f0'}`,
                  backgroundColor: activeSection === sec.id ? '#0B1E3F' : 'white', color: activeSection === sec.id ? 'white' : '#475569',
                  display: 'flex', alignItems: 'center', gap: '14px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                <div style={{ color: activeSection === sec.id ? 'white' : sec.color }}>{cloneElement(sec.icon, { size: 20 })}</div>
                {sec.label}
              </motion.button>
            ))}
          </div>

          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ backgroundColor: 'white', borderRadius: '28px', padding: isMobile ? '24px' : '40px', border: '1.5px solid #e2e8f0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
              <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: `${currentSection.color}15`, color: currentSection.color }}>
                {currentSection.icon}
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>{currentSection.label}</h2>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: '4px 0 0 0', fontWeight: '600' }}>Official employee metadata records</p>
              </div>
            </div>

            {activeSection === 'primary' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '35px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #f8fafc', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {form.profile_pic ? (
                      <img src={form.profile_pic.startsWith('http') || form.profile_pic.startsWith('data:') ? form.profile_pic : `${BASE_URL}${form.profile_pic.startsWith('/') ? '' : '/'}${form.profile_pic}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={60} color="#cbd5e1" />
                    )}
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => profileInputRef.current?.click()}
                      style={{ 
                        position: 'absolute', bottom: '5px', right: '5px', background: '#315A9E', 
                        width: '36px', height: '36px', borderRadius: '50%', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
                        border: '3px solid white', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' 
                      }}
                    >
                      <Upload size={18} color="white" />
                      <input 
                        ref={profileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileSelect('profile_pic', e.target.files[0])} 
                        style={{ display: 'none' }} 
                      />
                    </button>
                  )}
                </div>
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0B1E3F' }}>{form.emp_name || 'Set Name'}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{selectedEmpId}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
              {currentSection.fields.map(field => {
                const isDisabled = !isEditing || (LOCKED_FIELDS.includes(field.key) && !isAdmin);
                return (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{field.label}</label>
                    {field.type === 'file' ? (
                      <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', position: 'relative' }}>
                        {form[field.key] ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <FileCheck size={24} color="#10b981" />
                            <a href={`${BASE_URL}${form[field.key].startsWith('/') ? '' : '/'}${form[field.key]}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#315A9E', fontWeight: '900', textDecoration: 'none' }}>VIEW PROOF</a>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Upload size={24} color="#315A9E" />
                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>UPLOAD</div>
                            <input type="file" onChange={e => handleFileSelect(field.key, e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                          </div>
                        )}
                      </div>
                    ) : field.type === 'select' ? (
                      <select
                        value={form[field.key]}
                        disabled={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', fontWeight: '700', border: '2px solid #e2e8f0', backgroundColor: isDisabled ? '#f1f5f9' : 'white' }}
                      >
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form[field.key]}
                        readOnly={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', fontWeight: '700', border: '2px solid #e2e8f0', backgroundColor: isDisabled ? '#f1f5f9' : 'white' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
      <AppFooter />
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
