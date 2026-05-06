import React, { useState, useEffect, cloneElement, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Building2,
  AlertCircle, CheckCircle2, User, Landmark, RefreshCw,
  MapPin, GraduationCap, History,
  FileCheck, Users, Trash2, Pencil, Upload, ChevronDown
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
      { key: 'pancard_photo', label: 'PAN Card Proof', type: 'file' },
      { key: 'aadhar_number', label: 'Aadhar Number', type: 'text', placeholder: '1234 5678 9012' },
      { key: 'adharcard_photo', label: 'Aadhar Card Proof', type: 'file' },
      { key: 'voter_id', label: 'Voter ID Number', type: 'text' },
      { key: 'voter_id_photo', label: 'Voter ID', type: 'file' },
      { key: 'passport_no', label: 'Passport No', type: 'text' },
      { key: 'passport_photo', label: 'Passport Proof', type: 'file' },
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
      { key: 'experience_letter_photo', label: 'Previous Experience', type: 'file' },
      { key: 'source', label: 'Source', type: 'text' },
      { key: 'languages_known', label: 'Languages Known', type: 'text' },
    ]
  },
  {
    id: 'exit',
    label: 'Experience',
    icon: <History size={20} />,
    color: '#ef4444',
    fields: [
      { key: 'separation', label: 'Separation Date', type: 'text', placeholder: 'DD-MM-YYYY' },
      { key: 'lwd', label: 'Last Working Day (LWD)', type: 'text' },
      { key: 'attrition_bucket', label: 'Attrition Bucket', type: 'select', options: ['N/A', 'Resignation', 'Performance', 'Behavioral', 'Medical'] },
      { key: 'reason', label: 'Reason of Separation', type: 'text' },
      { key: 'experience_letter', label: 'Experience Letter', type: 'file' },
      { key: 'previous_payslip', label: 'Previous Company 3 Month Payslip', type: 'file' },
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    emp_name: '', gender: 'Male', dob: '', age: '', religion: '', blood_group: '', marital_status: 'Single', nationality: 'Indian', father_husband_name: '', pan_number: '', aadhar_number: '', category: 'General',
    pancard_photo: '', adharcard_photo: '', voter_id: '', voter_card: '', passport_no: '', passport: '',
    designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: 'Full Time', status: 'Active', place: '', moved: '', official_email: '',
    contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
    qualification: '', edu_completion_year: '', college: '', university: '', previous_org: '', previous_exp: '', source: '', languages_known: '',
    separation: '', lwd: '', attrition_bucket: 'N/A', reason: '',
    experience_letter: '', previous_payslip: '',
    bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '',
    bgv_status: 'Pending', appointment_letter: 'Not Sent', approved_by_ceo: 'No', onboarding_doc_completed: 'No', id_card: 'Not Issued', onboarding_link: '',
    profile_pic: ''
  });
  const profileInputRef = useRef(null);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
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
          pancard_photo: '', adharcard_photo: '', voter_id: '', voter_card: '', passport_no: '', passport: '',
          designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: 'Full Time', status: 'Active', place: '', moved: '', official_email: '',
          contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
          qualification: '', edu_completion_year: '', college: '', university: '', previous_org: '', previous_exp: '', source: '', languages_known: '',
          separation: '', lwd: '', attrition_bucket: 'N/A', reason: '',
          experience_letter: '', previous_payslip: '',
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

            // Aggressive mapping for backend column variations
            if (lowerKey.includes('pan_card') || lowerKey === 'pancard') targetKey = 'pancard_photo';
            if (lowerKey.includes('aadhar_card') || lowerKey.includes('adhar_card') || lowerKey === 'adharcard') targetKey = 'adharcard_photo';
            if (lowerKey.includes('voter_card') || lowerKey.includes('voter_id')) targetKey = 'voter_card';
            if (lowerKey.includes('passport')) targetKey = 'passport';
            if (lowerKey.includes('experience_letter')) targetKey = 'experience_letter';
            if (lowerKey.includes('previous_payslip') || lowerKey.includes('payslip')) targetKey = 'previous_payslip';
            if (lowerKey === 'profile_picture' || lowerKey === 'profile_pic') targetKey = 'profile_pic';

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

    // Instant local preview for better UX
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);

    try {
      const token = localStorage.getItem('token');
      if (key === 'profile_pic') {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('file', file);
        formData.append('userId', selectedEmpId);

        const res = await fetch(API_ENDPOINTS.MANAGER_UPLOAD_IMAGE, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const url = data.url || data.filePath || data.path || data.record?.path || data.profile_pic || data.profile_picture || data.data?.url || data.data?.path;
          if (url) {
            setForm(prev => ({ ...prev, [key]: url }));
            await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ employee_id: selectedEmpId, id: selectedEmpId, profile_pic: url, profile_picture: url })
            });
            setToast({ type: 'success', msg: `Profile picture updated successfully` });
          }
        }
      } else {
        const formData = new FormData();
        formData.append('fileData', file);
        formData.append('file', file);
        formData.append('image', file);
        formData.append('document', file);
        formData.append('userId', selectedEmpId);
        formData.append('employeeId', selectedEmpId);

        let docType = key;
        if (key === 'pancard_photo') docType = 'pan_card';
        if (key === 'adharcard_photo') docType = 'aadhar_card';
        if (key === 'voter_card') docType = 'voter_id_proof';
        if (key === 'passport') docType = 'passport_proof';
        if (key === 'experience_letter') docType = 'experience_letter';
        if (key === 'previous_payslip') docType = 'previous_payslip';

        formData.append('docType', docType);
        formData.append('type', key);
        formData.append('employee_id', selectedEmpId);

        const res = await fetch(API_ENDPOINTS.PROFILE_UPLOAD_DOCUMENT, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user?.token || token}` },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const url = data.url || data.filePath || data.path || data.record?.path || data.data?.url || data.data?.path || data.fileUrl || data.document_path || data.file;

          if (url) {
            setForm(prev => ({ ...prev, [key]: url }));
            
            const updatePayload = {
              employee_id: selectedEmpId,
              id: selectedEmpId,
              [key]: url,
              [docType]: url,
              experience_letter_photo: key === 'experience_letter' ? url : undefined,
              previous_payslip_photo: key === 'previous_payslip' ? url : undefined
            };
            Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

            await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(updatePayload)
            });
            setToast({ type: 'success', msg: `${key.replace(/_/g, ' ')} updated successfully` });
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          setToast({ type: 'error', msg: errData.message || `Upload failed` });
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fa', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      <AppHeader />

      <div style={{ flex: 1, padding: isMobile ? '100px 16px 40px' : '120px 26px 40px', boxSizing: 'border-box', overflowX: 'hidden', width: '100%', marginTop: 0 }}>
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

        <AnimatePresence>
          {previewDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              style={{
                position: 'fixed', inset: 0, backgroundColor: 'rgba(11, 30, 63, 0.8)',
                backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: isMobile ? '20px' : '40px'
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{
                  backgroundColor: 'white', borderRadius: '28px', padding: '12px',
                  maxWidth: '90%', maxHeight: '90%', position: 'relative',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  border: '4px solid white', overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    position: 'absolute', top: '15px', right: '15px', width: '40px', height: '40px',
                    borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1, color: '#0B1E3F'
                  }}
                >
                  <Trash2 size={20} />
                </button>

                <div style={{ maxHeight: '80vh', overflowY: 'auto', borderRadius: '20px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  {(previewDoc.url.toLowerCase().endsWith('.pdf') || previewDoc.url.includes('application/pdf')) ? (
                    <iframe
                      src={previewDoc.url}
                      style={{ width: isMobile ? '80vw' : '600px', height: '80vh', border: 'none', borderRadius: '20px' }}
                      title="Document Preview"
                    />
                  ) : (previewDoc.url.includes('image/') || previewDoc.url.startsWith('data:image/') || !previewDoc.url.startsWith('data:')) ? (
                    <img
                      src={previewDoc.url}
                      alt="Proof Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        display: 'block',
                        borderRadius: '20px',
                        objectFit: 'contain'
                      }}
                      onError={(e) => {
                        // If image fails, show the fallback download UI
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div style="display: flex; flex-direction: column; align-items: center; padding: 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">📁</div>
                            <div style="font-weight: 700; color: #0B1E3F; margin-bottom: 8px;">Preview Not Available</div>
                            <div style="font-size: 14px; color: #64748b;">This file type cannot be viewed directly.</div>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                      <div style={{ fontWeight: '700', color: '#0B1E3F', marginBottom: '8px' }}>Preview Not Available</div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>This file type cannot be viewed directly.</div>
                    </div>
                  )}
                </div>
                <div style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ fontWeight: '900', color: '#0B1E3F', fontSize: '14px', textTransform: 'uppercase' }}>{previewDoc.label}</div>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '12px', color: '#315A9E', fontWeight: '800', textDecoration: 'none', marginTop: '5px', display: 'inline-block' }}
                  >
                    OPEN IN NEW TAB
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '32px', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => onBack ? onBack() : navigate(-1)}
              style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              <ArrowLeft size={18} color="#64748b" />
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
                border: '3px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', borderRadius: '16px', fontWeight: '900', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {isEditing ? (saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />) : <Pencil size={16} />}
              {isEditing ? (saving ? 'Saving...' : 'Save All') : 'Edit Profile'}
            </motion.button>
          </div>
        </div>

        <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: isMobile ? 'none' : '280px 1fr', gap: isMobile ? '20px' : '24px', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', margin: '0', boxSizing: 'border-box', flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              gap: '10px',
              overflowX: isMobile ? 'auto' : 'visible',
              paddingBottom: isMobile ? '15px' : '0',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: isMobile ? 'x mandatory' : 'none'
            }}>
              {SECTIONS.map(sec => {
                const isActive = activeSection === sec.id;
                return (
                  <motion.button
                    key={sec.id}
                    whileHover={!isMobile ? { x: 4 } : {}}
                    onClick={() => setActiveSection(sec.id)}
                    style={{
                      padding: isMobile ? '10px 18px' : '16px 20px',
                      borderRadius: isMobile ? '12px' : '18px',
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#0B1E3F' : 'white',
                      color: isActive ? 'white' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? '10px' : '14px',
                      fontWeight: '800',
                      fontSize: isMobile ? '12px' : '15px',
                      textAlign: 'left',
                      border: `3px solid ${isActive ? '#0B1E3F' : '#cbd5e1'}`,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      scrollSnapAlign: isMobile ? 'start' : 'none',
                      fontFamily: 'inherit'
                    }}
                  >
                    <div style={{ color: isActive ? 'white' : sec.color }}>{cloneElement(sec.icon, { size: isMobile ? 16 : 20 })}</div>
                    <div>{sec.label}</div>
                  </motion.button>
                );
              })}
            </div>
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



            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '24px' }}>
              {currentSection.fields.map(field => {
                const isDisabled = !isEditing || (LOCKED_FIELDS.includes(field.key) && !isAdmin);
                return (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <label style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{field.label}</label>
                    {field.type === 'file' ? (
                      <div
                        style={{
                          border: isMobile ? '2px dashed #cbd5e1' : '3px dashed #cbd5e1', borderRadius: '16px', padding: '20px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          background: '#f8fafc', position: 'relative', transition: 'all 0.3s ease',
                          cursor: 'pointer', width: '100%', boxSizing: 'border-box'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#315A9E';
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = '0 10px 20px rgba(49, 90, 158, 0.1)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {form[field.key] ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <FileCheck size={24} color="#10b981" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rawUrl = form[field.key];
                                if (!rawUrl) return;

                                let url = rawUrl;
                                // Fix case where backend mistakenly prepends BASE_URL to base64 string
                                if (typeof url === 'string' && url.includes('data:') && url.includes('base64')) {
                                  url = url.substring(url.indexOf('data:'));
                                } else if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('data:')) {
                                  url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
                                }
                                setPreviewDoc({ url, label: field.label });
                              }}
                              style={{
                                border: 'none', background: 'transparent', fontSize: '12px',
                                color: '#315A9E', fontWeight: '900', cursor: 'pointer',
                                padding: '4px 8px', borderRadius: '8px'
                              }}
                            >
                              VIEW PROOF
                            </button>
                            {isEditing && (
                              <button onClick={(e) => { e.stopPropagation(); setForm(prev => ({ ...prev, [field.key]: '' })); }} style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>REMOVE</button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Upload size={24} color="#315A9E" />
                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>UPLOAD DOCUMENT</div>
                            <input type="file" onChange={e => handleFileSelect(field.key, e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                          </div>
                        )}
                        {uploadingFiles[field.key] && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}>
                            <RefreshCw size={24} className="spin" color="#315A9E" />
                          </div>
                        )}
                      </div>
                    ) : field.type === 'select' ? (
                      <select
                        value={form[field.key]}
                        disabled={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', fontWeight: '900', border: isMobile ? '2px solid #cbd5e1' : '3px solid #cbd5e1', backgroundColor: isDisabled ? '#f1f5f9' : 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
                      >
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form[field.key]}
                        readOnly={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', fontWeight: '900', border: isMobile ? '2px solid #cbd5e1' : '3px solid #cbd5e1', backgroundColor: isDisabled ? '#f1f5f9' : 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
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
