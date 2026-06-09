import React, { useState, useEffect, useLayoutEffect, cloneElement, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Building2,
  AlertCircle, CheckCircle2, User, Landmark, RefreshCw,
  MapPin, GraduationCap, History,
  FileCheck, Users, Pencil, Upload, ChevronDown, ChevronLeft, ChevronRight, X, Maximize2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL, API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';

const LOCKED_FIELDS = ['age'];

const SECTIONS = [
  {
    id: 'primary',
    label: 'Primary Profile',
    icon: <User size={20} />,
    color: '#3b82f6',
    fields: [
      { key: 'emp_name', label: 'Employee Name', placeholder: 'Full Name', type: 'text', required: true },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'text', placeholder: 'DD/MM/YYYY', required: true },
      { key: 'age', label: 'Age', type: 'text', placeholder: 'Age' },
      { key: 'blood_group', label: 'Blood Group', type: 'text', required: true },
      { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married'] },
      { key: 'father_husband_name', label: "Father/Husband's Name", type: 'text' },
      { key: 'pan_number', label: 'PAN Number', type: 'text', placeholder: 'Enter valid Pan Number (ABCDE1234F)', required: true },
      { key: 'pancard_photo', label: 'PAN Card Proof', type: 'file', required: true },
      { key: 'aadhar_number', label: 'Aadhar Number', type: 'text', placeholder: 'Enter valid Aadhar Number (1234 5678 9012)', required: true },
      { key: 'adharcard_photo', label: 'Aadhar Card Proof', type: 'file', required: true },
    ]
  },
  {
    id: 'hierarchy',
    label: 'Organizational Hierarchy',
    icon: <Building2 size={20} />,
    color: '#8b5cf6',
    fields: [
      { key: 'designation', label: 'Designation', type: 'text', required: true },
      { key: 'department', label: 'Department', type: 'text', required: true },
      { key: 'supervisor_l1', label: 'Supervisor L1 (Reporting Person)', type: 'text' },
      { key: 'supervisor_l2', label: 'Supervisor L2', type: 'text' },
      { key: 'doj', label: 'Date of Joining', type: 'text', placeholder: 'DD-MM-YYYY', required: true },
      { key: 'ft_pt', label: 'FT/PT', type: 'select', options: ['Full Time', 'Part Time', 'Contract'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Bench', 'Notice Period', 'Terminated'] },
      { key: 'place', label: 'Work Location', type: 'text' },
      { key: 'moved', label: 'Moved (Project/Dept)', type: 'text' },
      { key: 'official_email_id', label: 'Official Email ID', type: 'text', required: true },
    ]
  },
  {
    id: 'contact',
    label: 'Contact & Geography',
    icon: <MapPin size={20} />,
    color: '#10b981',
    fields: [
      { key: 'contact_no', label: 'Contact No', type: 'text', required: true },
      { key: 'emergency_contact_no', label: 'Emergency Contact No', type: 'text', required: true },
      { key: 'personal_email_id', label: 'Personal Email ID', type: 'text', required: true },
      { key: 'present_address', label: 'Present Address', type: 'text', required: true },
      { key: 'permanent_address', label: 'Permanent Address', type: 'text', required: true },
      { key: 'state', label: 'State', type: 'text' },
    ]
  },
  {
    id: 'academic',
    label: 'Academic & Career',
    icon: <GraduationCap size={20} />,
    color: '#f59e0b',
    fields: [
      { key: 'sslc_percentage', label: 'SSLC Percentage', type: 'text', required: true },
      { key: 'sslc_markscard', label: 'SSLC Marks Card', type: 'file', required: true },
      { key: 'puc_percentage', label: 'PUC Percentage', type: 'text', required: true },
      { key: 'puc_markscard', label: 'PUC Marks Card', type: 'file', required: true },
      { key: 'ug_pg_percentage', label: 'Degree Percentage', type: 'text', required: true },
      { key: 'ug_pg_markscard', label: 'Degree Marks Card', type: 'file', required: true },
      { key: 'qualification', label: 'Qualification', type: 'text', required: true },
      { key: 'edu_completion_year', label: 'EDU Completion Year', type: 'text', required: true },
      { key: 'college', label: 'College', type: 'text', required: true },
      { key: 'university', label: 'University', type: 'text', required: true },
      { key: 'previous_organization', label: 'Previous Organization', type: 'text' },
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
      { key: 'separation', label: 'Separation Date', type: 'text', placeholder: 'DD/MM/YYYY' },
      { key: 'lwd', label: 'Last Working Day (LWD)', type: 'text', placeholder: 'DD/MM/YYYY' },
      { key: 'attrition_bucket', label: 'Attrition Bucket', type: 'select', options: ['N/A', 'Resignation', 'Performance', 'Behavioral', 'Medical'] },
      { key: 'reason', label: 'Reason of Separation', type: 'text' },
      { key: 'experience_letter', label: 'Experience Letter', type: 'file' },
      { key: 'previous_company_payslip', label: 'Previous Company 3 Month Payslip', type: 'file' },
    ]
  },
  {
    id: 'finance',
    label: 'Banking & Finance',
    icon: <Landmark size={20} />,
    color: '#315A9E',
    fields: [
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: true },
      { key: 'bank_account_no', label: 'Bank Account No.', type: 'text', required: true },
      { key: 'ifsc_code', label: 'IFSC Code', type: 'text', required: true },
      { key: 'bank_branch', label: 'Bank Branch', type: 'text', required: true },
      { key: 'gross_salary_a', label: 'Gross Salary (A)', type: 'text' },
      { key: 'salary', label: 'Net Salary', type: 'text' },
      { key: 'pt', label: 'Professional Tax (PT)', type: 'text' },
      { key: 'passbook_photo', label: 'Bank Passbook', type: 'file', required: true },
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
  const caretRef = useRef({ target: null, selectionStart: 0, oldValLen: 0 });

  useLayoutEffect(() => {
    const { target, selectionStart, oldValLen } = caretRef.current;
    if (target) {
      try {
        let newPos = selectionStart;
        if (target.value.length !== oldValLen) {
          const diff = target.value.length - oldValLen;
          newPos = Math.max(0, selectionStart + diff);
        }
        target.setSelectionRange(newPos, newPos);
      } catch (err) { }
      caretRef.current = { target: null, selectionStart: 0, oldValLen: 0 };
    }
  });

  const [form, setForm] = useState({
    emp_name: '', gender: '', dob: '', date_of_birth: '', age: '', religion: '', blood_group: '', marital_status: '', nationality: '', father_husband_name: '', pan_number: '', aadhar_number: '', category: '',
    pancard_photo: '', adharcard_photo: '', voter_id: '', voter_id_photo: '', passport_no: '', passport_photo: '',
    designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: '', status: '', place: '', moved: '', official_email: '',
    contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
    sslc_percentage: '', sslc_markscard: '', puc_percentage: '', puc_markscard: '',
    ug_pg_percentage: '', ug_pg_markscard: '',
    qualification: '', edu_completion_year: '', college: '', university: '', previous_organization: '', previous_experience: '', source: '', languages_known: '',
    separation: '', lwd: '', attrition_bucket: '', reason: '',
    experience_letter: '', previous_company_payslip: '',
    bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '', passbook_photo: '',
    bgv_status: '', appointment_letter: '', approved_by_ceo: '', onboarding_doc_completed: '', id_card: '', onboarding_link: '',
    profile_pic: ''
  });
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [docRemoveConfirm, setDocRemoveConfirm] = useState(null); // { fieldKey, fieldLabel, isEditingCtx }
  const [fullscreenUrl, setFullscreenUrl] = useState(null); // fullscreen doc preview
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const isMobile = winWidth < 768;
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('personal_info_active_section') || 'primary';
  });
  const [isEditing, setIsEditing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  useEffect(() => {
    localStorage.setItem('personal_info_active_section', activeSection);
  }, [activeSection]);

  useEffect(() => {
    const currentUserId = user?.employee_id || user?.id || user?.email || user?.EmpID;
    if (currentUserId) {
      setSelectedEmpId(currentUserId);
    }
  }, [user]);



  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const uid = selectedEmpId;
        if (!uid) return;

        const emptyForm = {
          emp_name: '', gender: '', dob: '', date_of_birth: '', age: '', religion: '', blood_group: '', marital_status: '', nationality: '', father_husband_name: '', pan_number: '', aadhar_number: '', category: '',
          pancard_photo: '', adharcard_photo: '', voter_id: '', voter_id_photo: '', passport_no: '', passport_photo: '',
          designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: '', status: '', place: '', moved: '', official_email: '',
          contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
          sslc_percentage: '', sslc_markscard: '', puc_percentage: '', puc_markscard: '',
          ug_pg_percentage: '', ug_pg_markscard: '',
          qualification: '', edu_completion_year: '', college: '', university: '', previous_organization: '', previous_experience: '', source: '', languages_known: '',
          separation: '', lwd: '', attrition_bucket: '', reason: '',
          experience_letter: '', previous_company_payslip: '',
          bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '', passbook_photo: '',
          bgv_status: '', appointment_letter: '', approved_by_ceo: '', onboarding_doc_completed: '', id_card: '', onboarding_link: '',
          profile_pic: ''
        };
        // Load from sessionStorage cache instantly (no blank flash)
        const cacheKey = `profile_cache_pm_${uid}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            setForm(prev => ({ ...prev, ...JSON.parse(cached) }));
          } else {
            setForm(emptyForm);
          }
        } catch (e) {
          setForm(emptyForm);
        }

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
            let normalizedVal = (val === null || val === undefined) ? '' : val;
            const lowerKey = apiKey.toLowerCase();
            let targetKey = Object.keys(emptyForm).find(formKey => formKey.toLowerCase() === lowerKey) || apiKey;

            // Aggressive mapping for backend column variations
            if (lowerKey === 'last_working_day' || lowerKey === 'lastworkingday' || lowerKey === 'last_working_date' || lowerKey === 'lwd') targetKey = 'lwd';
            if (lowerKey.includes('pan_card') || lowerKey === 'pancard') targetKey = 'pancard_photo';
            if (lowerKey.includes('aadhar_card') || lowerKey.includes('adhar_card') || lowerKey === 'adharcard') targetKey = 'adharcard_photo';
            // Map all voter card/id photo columns to voter_id_photo (the key the UI uses)
            if (lowerKey === 'voter_id_photo' || lowerKey === 'voter_card' || lowerKey === 'voter_id_proof' || lowerKey === 'voteridphoto') targetKey = 'voter_id_photo';
            // Map all passport photo columns to passport_photo (the key the UI uses)
            if (lowerKey === 'passport_photo' || lowerKey === 'passport_proof' || lowerKey === 'passportphoto') targetKey = 'passport_photo';
            if (lowerKey.includes('sslc_markscard')) targetKey = 'sslc_markscard';
            if (lowerKey.includes('puc_markscard')) targetKey = 'puc_markscard';
            if (lowerKey.includes('ug_pg_markscard')) targetKey = 'ug_pg_markscard';
            if (lowerKey.includes('passbook_photo') || lowerKey.includes('bank_passbook')) targetKey = 'passbook_photo';
            if (lowerKey.includes('experience_letter')) {
              const isEmpty = val === null || val === undefined || val === '';
              const looksLikePath = typeof val === 'string' && (val.includes('.') || val.includes('/') || val.includes('\\') || val.startsWith('data:'));
              if (isEmpty || lowerKey === 'experience_letter_photo' || lowerKey === 'experience_letter_proof' || lowerKey === 'experienceletterphoto' || looksLikePath) {
                targetKey = 'experience_letter';
              } else {
                return;
              }
            }
            if (lowerKey.includes('previous_company_payslip') || lowerKey.includes('previous_payslip') || lowerKey.includes('payslip')) {
              const isEmpty = val === null || val === undefined || val === '';
              const looksLikePath = typeof val === 'string' && (val.includes('.') || val.includes('/') || val.includes('\\') || val.startsWith('data:'));
              if (isEmpty || lowerKey.includes('photo') || lowerKey.includes('proof') || lowerKey.includes('path') || looksLikePath) {
                targetKey = 'previous_company_payslip';
              } else {
                return;
              }
            }
            if (lowerKey === 'profile_picture' || lowerKey === 'profile_pic') targetKey = 'profile_pic';

            // Format date fields to DD/MM/YYYY or DD-MM-YYYY
            if ((targetKey === 'dob' || targetKey === 'date_of_birth' || targetKey === 'separation' || targetKey === 'doj' || targetKey === 'lwd') && normalizedVal) {
              const dateStr = String(normalizedVal);
              let year = '', month = '', day = '';

              if (dateStr.includes('T')) {
                const datePart = dateStr.split('T')[0];
                const parts = datePart.split('-');
                if (parts.length === 3) {
                  year = parts[0];
                  month = parts[1];
                  day = parts[2];
                }
              } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    year = parts[0];
                    month = parts[1];
                    day = parts[2];
                  } else {
                    year = parts[2];
                    month = parts[1];
                    day = parts[0];
                  }
                }
              } else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  if (parts[0].length === 4) {
                    year = parts[0];
                    month = parts[1];
                    day = parts[2];
                  } else {
                    year = parts[2];
                    month = parts[1];
                    day = parts[0];
                  }
                }
              }

              if (year && month && day) {
                const dd = String(parseInt(day, 10)).padStart(2, '0');
                const mm = String(parseInt(month, 10)).padStart(2, '0');
                const yyyy = String(parseInt(year, 10));
                normalizedVal = (targetKey === 'dob' || targetKey === 'date_of_birth' || targetKey === 'lwd' || targetKey === 'separation') ? `${dd}/${mm}/${yyyy}` : `${dd}-${mm}-${yyyy}`;
              }
            }

            cleanData[targetKey] = normalizedVal;
          });

          // Reconcile dob and date_of_birth prioritizing date_of_birth
          const finalDob = cleanData['date_of_birth'] || cleanData['dob'] || '';
          cleanData['dob'] = finalDob;
          cleanData['date_of_birth'] = finalDob;

          setForm(prev => {
            const updated = { ...prev, ...cleanData };
            const cacheKey = `profile_cache_pm_${uid}`;
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(updated));
            } catch (e) { }
            return updated;
          });
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
        if (key === 'voter_id_photo') docType = 'voter_id_proof';
        if (key === 'passport_photo') docType = 'passport_proof';
        if (key === 'sslc_markscard') docType = 'sslc_markscard';
        if (key === 'puc_markscard') docType = 'puc_markscard';
        if (key === 'ug_pg_markscard') docType = 'ug_pg_markscard';
        if (key === 'passbook_photo') docType = 'bank_passbook';
        if (key === 'experience_letter') docType = 'experience_letter';
        if (key === 'previous_company_payslip') docType = 'previous_payslip';

        formData.append('docType', docType);
        formData.append('type', key);
        formData.append('employee_id', selectedEmpId);
        formData.append('id', selectedEmpId);

        let res = await fetch(API_ENDPOINTS.PROFILE_UPLOAD_DOCUMENT, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user?.token || token}` },
          body: formData
        });

        if (!res.ok) {
          // Fallback to alt endpoint if 500/404
          res = await fetch(API_ENDPOINTS.PROFILE_UPLOAD_DOCUMENT_ALT, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${user?.token || token}` },
            body: formData
          });
        }

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
          setForm(prev => ({ ...prev, [key]: '' })); // Clear local preview on failure
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleChange = (key, value, target) => {
    let sanitizedValue = value;

    if (['dob', 'date_of_birth', 'separation', 'lwd'].includes(key)) {
      const prevValue = form[key] || '';
      const isDeleting = prevValue.length > value.length;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        caretRef.current = {
          target,
          selectionStart: target.selectionStart,
          oldValLen: target.value.length
        };
      }

      // Collapse multiple trailing slashes (e.g. "10//" -> "10/")
      let cleanedValue = value;
      if (value.endsWith('//')) {
        cleanedValue = value.replace(/\/+$/, '/');
      }

      // Split the input value by slashes
      const parts = cleanedValue.split('/');
      // Keep only digits in each part
      let cleanParts = parts.map(p => p.replace(/\D/g, ''));

      // If there are more than 3 parts, truncate
      if (cleanParts.length > 3) {
        cleanParts = cleanParts.slice(0, 3);
      }

      let dayStr = '';
      let monthStr = '';
      let yearStr = '';

      if (cleanParts.length === 1) {
        const p0 = cleanParts[0] || '';
        if (p0.length > 2) {
          yearStr = p0;
        } else {
          dayStr = p0;
        }
      } else if (cleanParts.length === 2) {
        const p0 = cleanParts[0] || '';
        const p1 = cleanParts[1] || '';
        if (p0.length > 2) {
          yearStr = p0;
          monthStr = p1;
        } else if (p1.length > 2) {
          dayStr = p0;
          yearStr = p1;
        } else {
          dayStr = p0;
          monthStr = p1;
        }
      } else if (cleanParts.length === 3) {
        dayStr = cleanParts[0] || '';
        monthStr = cleanParts[1] || '';
        yearStr = cleanParts[2] || '';
      }

      // Restrict day (dd)
      if (dayStr) {
        if (dayStr.length > 2) dayStr = dayStr.slice(0, 2);
        if (dayStr.length === 1 && parseInt(dayStr, 10) > 3) {
          dayStr = '0' + dayStr;
        }
        const ddVal = parseInt(dayStr, 10);
        if (!isNaN(ddVal)) {
          if (ddVal > 31) dayStr = '31';
          else if (ddVal === 0 && dayStr.length === 2) dayStr = '01';
        }
      }

      // Restrict month (mm)
      if (monthStr) {
        if (monthStr.length > 2) monthStr = monthStr.slice(0, 2);
        if (monthStr.length === 1 && parseInt(monthStr, 10) > 1) {
          monthStr = '0' + monthStr;
        }
        const mmVal = parseInt(monthStr, 10);
        if (!isNaN(mmVal)) {
          if (mmVal > 12) monthStr = '12';
          else if (mmVal === 0 && monthStr.length === 2) monthStr = '01';
        }
      }

      // Restrict year (yyyy)
      if (yearStr) {
        if (yearStr.length > 4) yearStr = yearStr.slice(0, 4);
        const yyyyVal = parseInt(yearStr, 10);
        if (!isNaN(yyyyVal) && yearStr.length === 4) {
          if (yyyyVal > 2099) yearStr = '2099';
        }
      }

      // Reconstruct formatted string
      let formatted = '';
      if (!dayStr && !monthStr && !yearStr) {
        formatted = '';
      } else if (parts.length === 1) {
        if (cleanParts[0] && cleanParts[0].length > 2) {
          formatted = `//${yearStr}`;
        } else {
          formatted = dayStr;
          if (dayStr.length === 2 && !isDeleting) {
            formatted += '/';
          }
        }
      } else if (parts.length === 2) {
        const p1 = cleanParts[1] || '';
        const p0 = cleanParts[0] || '';
        if (p0.length > 2) {
          formatted = `${yearStr}/${monthStr}`;
        } else if (p1.length > 2) {
          formatted = `${dayStr}//${yearStr}`;
        } else {
          formatted = `${dayStr}/${monthStr}`;
          if (monthStr.length === 2 && !isDeleting) {
            formatted += '/';
          }
        }
      } else {
        formatted = `${dayStr}/${monthStr}/${yearStr}`;
      }

      sanitizedValue = formatted;

      // Auto-calculate age from DOB if applicable
      if (key === 'dob' || key === 'date_of_birth') {
        const dobClean = sanitizedValue.replace(/\D/g, '');
        if (dobClean.length === 8) {
          const dd = parseInt(dobClean.slice(0, 2), 10);
          const mm = parseInt(dobClean.slice(2, 4), 10);
          const yyyy = parseInt(dobClean.slice(4, 8), 10);
          const birthDate = new Date(yyyy, mm - 1, dd);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
          if (age >= 0 && age < 120) {
            setForm(prev => ({ ...prev, dob: sanitizedValue, date_of_birth: sanitizedValue, age: String(age) }));
            return;
          }
        } else if (sanitizedValue === '' || dobClean.length === 0) {
          setForm(prev => ({ ...prev, dob: sanitizedValue, date_of_birth: sanitizedValue, age: '' }));
          return;
        } else {
          setForm(prev => ({ ...prev, dob: sanitizedValue, date_of_birth: sanitizedValue, age: '' }));
          return;
        }
      }
    }

    if (key === 'doj') {
      const prevValue = form.doj || '';
      const isDeleting = prevValue.length > value.length;

      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        caretRef.current = {
          target,
          selectionStart: target.selectionStart,
          oldValLen: target.value.length
        };
      }

      // Collapse multiple trailing dashes (e.g. "10--" -> "10-")
      let cleanedValue = value;
      if (value.endsWith('--')) {
        cleanedValue = value.replace(/-+$/, '-');
      }

      // Split the input value by dashes
      const parts = cleanedValue.split('-');
      // Keep only digits in each part
      let cleanParts = parts.map(p => p.replace(/\D/g, ''));

      // If there are more than 3 parts, truncate
      if (cleanParts.length > 3) {
        cleanParts = cleanParts.slice(0, 3);
      }

      let dayStr = '';
      let monthStr = '';
      let yearStr = '';

      if (cleanParts.length === 1) {
        const p0 = cleanParts[0] || '';
        if (p0.length > 2) {
          yearStr = p0;
        } else {
          dayStr = p0;
        }
      } else if (cleanParts.length === 2) {
        const p0 = cleanParts[0] || '';
        const p1 = cleanParts[1] || '';
        if (p0.length > 2) {
          yearStr = p0;
          monthStr = p1;
        } else if (p1.length > 2) {
          dayStr = p0;
          yearStr = p1;
        } else {
          dayStr = p0;
          monthStr = p1;
        }
      } else if (cleanParts.length === 3) {
        dayStr = cleanParts[0] || '';
        monthStr = cleanParts[1] || '';
        yearStr = cleanParts[2] || '';
      }

      // Restrict day (dd)
      if (dayStr) {
        if (dayStr.length > 2) dayStr = dayStr.slice(0, 2);
        if (dayStr.length === 1 && parseInt(dayStr, 10) > 3) {
          dayStr = '0' + dayStr;
        }
        const ddVal = parseInt(dayStr, 10);
        if (!isNaN(ddVal)) {
          if (ddVal > 31) dayStr = '31';
          else if (ddVal === 0 && dayStr.length === 2) dayStr = '01';
        }
      }

      // Restrict month (mm)
      if (monthStr) {
        if (monthStr.length > 2) monthStr = monthStr.slice(0, 2);
        if (monthStr.length === 1 && parseInt(monthStr, 10) > 1) {
          monthStr = '0' + monthStr;
        }
        const mmVal = parseInt(monthStr, 10);
        if (!isNaN(mmVal)) {
          if (mmVal > 12) monthStr = '12';
          else if (mmVal === 0 && monthStr.length === 2) monthStr = '01';
        }
      }

      // Restrict year (yyyy)
      if (yearStr) {
        if (yearStr.length > 4) yearStr = yearStr.slice(0, 4);
        const yyyyVal = parseInt(yearStr, 10);
        if (!isNaN(yyyyVal) && yearStr.length === 4) {
          if (yyyyVal > 2099) yearStr = '2099';
        }
      }

      // Reconstruct formatted string
      let formatted = '';
      if (!dayStr && !monthStr && !yearStr) {
        formatted = '';
      } else if (parts.length === 1) {
        if (cleanParts[0] && cleanParts[0].length > 2) {
          formatted = `--${yearStr}`;
        } else {
          formatted = dayStr;
          if (dayStr.length === 2 && !isDeleting) {
            formatted += '-';
          }
        }
      } else if (parts.length === 2) {
        const p1 = cleanParts[1] || '';
        const p0 = cleanParts[0] || '';
        if (p0.length > 2) {
          formatted = `${yearStr}-${monthStr}`;
        } else if (p1.length > 2) {
          formatted = `${dayStr}--${yearStr}`;
        } else {
          formatted = `${dayStr}-${monthStr}`;
          if (monthStr.length === 2 && !isDeleting) {
            formatted += '-';
          }
        }
      } else {
        formatted = `${dayStr}-${monthStr}-${yearStr}`;
      }

      sanitizedValue = formatted;
    }

    if (key === 'personal_email' || key === 'official_email') {
      const atIndex = value.indexOf('@');
      if (atIndex !== -1) {
        const domainPart = value.substring(atIndex + 1);
        const comIndex = domainPart.indexOf('.com');
        if (comIndex !== -1) {
          sanitizedValue = value.substring(0, atIndex + 1 + comIndex + 4);
        }
      }
    }

    // Strict validation logic
    const alphaFields = [
      'emp_name', 'religion', 'nationality', 'father_husband_name', 'designation',
      'department', 'process', 'supervisor_l1', 'supervisor_l2', 'place', 'moved',
      'state', 'qualification', 'college', 'university', 'previous_org', 'source',
      'bank_name', 'bank_branch', 'languages_known', 'blood_group'
    ];

    const numericFields = [
      'age', 'edu_completion_year', 'gross_salary_a', 'salary', 'pt',
      'contact_no', 'emergency_contact_no', 'bank_account_no', 'aadhar_number'
    ];

    const percentageFields = ['sslc_percentage', 'puc_percentage', 'ug_pg_percentage'];

    if (alphaFields.includes(key)) {
      if (key === 'blood_group') {
        sanitizedValue = value.replace(/[^a-zA-Z+\-\s]/g, '').toUpperCase();
        if (sanitizedValue.length > 5) sanitizedValue = sanitizedValue.substring(0, 5);
      } else {
        sanitizedValue = value.replace(/[^a-zA-Z\s.]/g, '');
      }
    } else if (numericFields.includes(key)) {
      sanitizedValue = value.replace(/\D/g, '');
      // Max length constraints
      if ((key === 'contact_no' || key === 'emergency_contact_no')) {
        if (sanitizedValue.length > 0 && !/^[6-9]/.test(sanitizedValue)) {
          sanitizedValue = '';
        }
        if (sanitizedValue.length > 10) {
          sanitizedValue = sanitizedValue.substring(0, 10);
        }
      }
      if (key === 'aadhar_number' && sanitizedValue.length > 12) {
        sanitizedValue = sanitizedValue.substring(0, 12);
      }
      if (key === 'edu_completion_year' && sanitizedValue.length > 4) {
        sanitizedValue = sanitizedValue.substring(0, 4);
      }
      if (key === 'bank_account_no' && sanitizedValue.length > 18) {
        sanitizedValue = sanitizedValue.substring(0, 18);
      }
    } else if (key === 'pan_number') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (sanitizedValue.length > 10) sanitizedValue = sanitizedValue.substring(0, 10);
    } else if (key === 'passport_no') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (sanitizedValue.length > 15) sanitizedValue = sanitizedValue.substring(0, 15);
    } else if (key === 'ifsc_code') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (sanitizedValue.length > 11) sanitizedValue = sanitizedValue.substring(0, 11);
    } else if (key === 'voter_id') {
      sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (sanitizedValue.length > 10) sanitizedValue = sanitizedValue.substring(0, 10);
    } else if (percentageFields.includes(key)) {
      sanitizedValue = value.replace(/[^0-9.]/g, '');
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) sanitizedValue = parts[0] + '.' + parts.slice(1).join('');
      // Limit to 4 digits + 1 decimal point = 5 characters
      if (sanitizedValue.length > 5) {
        sanitizedValue = sanitizedValue.substring(0, 5);
      }
    }

    let updates = { [key]: sanitizedValue };

    // Auto-calculate Age from DOB
    if (key === 'dob' || key === 'date_of_birth') {
      if (sanitizedValue && sanitizedValue.length === 10) {
        // Support both DD-MM-YYYY and DD/MM/YYYY
        const parts = sanitizedValue.includes('-') ? sanitizedValue.split('-') : sanitizedValue.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);

          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900) {
            const birthDate = new Date(year, month, day);
            if (!isNaN(birthDate.getTime())) {
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              if (age >= 0) {
                updates.age = String(age);
              }
            }
          }
        }
      } else {
        // DOB cleared or incomplete — clear age too
        updates.age = '';
      }
      updates.dob = sanitizedValue;
      updates.date_of_birth = sanitizedValue;
    }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async (shouldGoNext = false) => {
    if (!isEditing && shouldGoNext) {
      const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
      const nextSection = SECTIONS[currentIndex + 1];
      if (nextSection) {
        setActiveSection(nextSection.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    // Mandatory Field Validation
    const mandatoryFields = [
      { key: 'emp_name', label: 'Employee Name' },
      { key: 'gender', label: 'Gender' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'blood_group', label: 'Blood Group' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'pan_number', label: 'PAN Number' },
      { key: 'aadhar_number', label: 'Aadhar Number' },
      { key: 'pancard_photo', label: 'PAN Card Proof' },
      { key: 'adharcard_photo', label: 'Aadhar Card Proof' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'doj', label: 'Date of Joining' },
      { key: 'official_email', label: 'Official Email ID' },
      { key: 'contact_no', label: 'Contact No' },
      { key: 'emergency_contact_no', label: 'Emergency Contact No' },
      { key: 'personal_email', label: 'Personal Email ID' },
      { key: 'present_address', label: 'Present Address' },
      { key: 'permanent_address', label: 'Permanent Address' },
      { key: 'sslc_percentage', label: 'SSLC Percentage' },
      { key: 'sslc_markscard', label: 'SSLC Marks Card' },
      { key: 'puc_percentage', label: 'PUC Percentage' },
      { key: 'puc_markscard', label: 'PUC Marks Card' },
      { key: 'ug_pg_percentage', label: 'Degree Percentage' },
      { key: 'ug_pg_markscard', label: 'Degree Marks Card' },
      { key: 'qualification', label: 'Qualification' },
      { key: 'edu_completion_year', label: 'Completion Year' },
      { key: 'college', label: 'College' },
      { key: 'university', label: 'University' },
      { key: 'bank_name', label: 'Bank Name' },
      { key: 'bank_account_no', label: 'Bank Account No.' },
      { key: 'ifsc_code', label: 'IFSC Code' },
      { key: 'bank_branch', label: 'Bank Branch' },
      { key: 'passbook_photo', label: 'Passbook' }
    ];

    const activeSectionFields = SECTIONS.find(s => s.id === activeSection)?.fields.map(f => f.key) || [];

    for (const f of mandatoryFields) {
      if (activeSectionFields.includes(f.key)) {
        if (!form[f.key] || String(form[f.key]).trim() === '') {
          const section = SECTIONS.find(s => s.fields.some(field => field.key === f.key));
          const sectionLabel = section ? ` (${section.label} section)` : '';
          setToast({ type: 'error', msg: `${f.label} is a mandatory field${sectionLabel}` });
          return;
        }
      }
    }

    // Validation before save
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;

    const getSection = (key) => {
      const s = SECTIONS.find(sec => sec.fields.some(field => field.key === key));
      return s ? ` (${s.label} section)` : '';
    };

    const dobFieldKey = activeSectionFields.includes('date_of_birth') ? 'date_of_birth' : 'dob';
    const dobVal = form[dobFieldKey];
    if ((activeSectionFields.includes('dob') || activeSectionFields.includes('date_of_birth')) && dobVal) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dobVal) && !/^\d{2}-\d{2}-\d{4}$/.test(dobVal)) {
        setToast({ type: 'error', msg: `Please enter a complete Date of Birth (DD/MM/YYYY)${getSection(dobFieldKey)}` });
        return;
      }
    }

    if (activeSectionFields.includes('separation') && form.separation) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.separation) && !/^\d{2}-\d{2}-\d{4}$/.test(form.separation)) {
        setToast({ type: 'error', msg: `Please enter a complete Separation Date (DD/MM/YYYY)${getSection('separation')}` });
        return;
      }
    }

    if (activeSectionFields.includes('lwd') && form.lwd) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.lwd)) {
        setToast({ type: 'error', msg: `Please enter a complete Last Working Day (DD/MM/YYYY)${getSection('lwd')}` });
        return;
      }
    }

    if (activeSectionFields.includes('personal_email') && form.personal_email && !emailRegex.test(form.personal_email)) {
      setToast({ type: 'error', msg: `Invalid Personal Email format${getSection('personal_email')}` });
      return;
    }
    if (activeSectionFields.includes('official_email') && form.official_email && !emailRegex.test(form.official_email)) {
      setToast({ type: 'error', msg: `Invalid Official Email format${getSection('official_email')}` });
      return;
    }
    if (activeSectionFields.includes('contact_no') && form.contact_no) {
      if (form.contact_no.length !== 10) {
        setToast({ type: 'error', msg: `Contact No must be 10 digits${getSection('contact_no')}` });
        return;
      }
      if (!/^[6-9]/.test(form.contact_no)) {
        setToast({ type: 'error', msg: `Contact No must start with 6, 7, 8, or 9${getSection('contact_no')}` });
        return;
      }
    }
    if (activeSectionFields.includes('emergency_contact_no') && form.emergency_contact_no) {
      if (form.emergency_contact_no.length !== 10) {
        setToast({ type: 'error', msg: `Emergency Contact No must be 10 digits${getSection('emergency_contact_no')}` });
        return;
      }
      if (!/^[6-9]/.test(form.emergency_contact_no)) {
        setToast({ type: 'error', msg: `Emergency Contact No must start with 6, 7, 8, or 9${getSection('emergency_contact_no')}` });
        return;
      }
    }
    if (activeSectionFields.includes('aadhar_number') && form.aadhar_number) {
      if (!/^[0-9]{12}$/.test(form.aadhar_number)) {
        setToast({ type: 'error', msg: `Please enter a valid 12-digit Aadhar Number${getSection('aadhar_number')}` });
        return;
      }
    }
    if (activeSectionFields.includes('pan_number') && form.pan_number) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number)) {
        setToast({ type: 'error', msg: `Please enter a valid PAN Number (e.g. ABCDE1234F)${getSection('pan_number')}` });
        return;
      }
    }
    if (activeSectionFields.includes('ifsc_code') && form.ifsc_code && form.ifsc_code.length !== 11) {
      setToast({ type: 'error', msg: `IFSC Code must be 11 characters${getSection('ifsc_code')}` });
      return;
    }
    if (activeSectionFields.includes('voter_id') && form.voter_id && form.voter_id.length !== 10) {
      setToast({ type: 'error', msg: `Voter ID must be 10 characters${getSection('voter_id')}` });
      return;
    }

    if (!navigator.onLine) {
      setToast({ type: 'error', msg: 'Submission Failed: No Internet Connection! ❌' });
      return;
    }

    setSaving(true);
    try {
      const uid = selectedEmpId;
      const token = localStorage.getItem('token');

      // Format dates: date_of_birth/dob and separation stay DD/MM/YYYY; doj/lwd convert to YYYY-MM-DD
      const payload = { employee_id: uid, id: uid };
      activeSectionFields.forEach(k => {
        let val = form[k];
        if ((k === 'dob' || k === 'date_of_birth' || k === 'separation') && val && typeof val === 'string') {
          // Keep DOB/separation as DD/MM/YYYY — normalise dashes to slashes if needed
          if (val.includes('-')) {
            const parts = val.split('-');
            if (parts.length === 3 && parts[0].length === 2) {
              val = `${parts[0]}/${parts[1]}/${parts[2]}`; // DD-MM-YYYY → DD/MM/YYYY
            } else if (parts.length === 3 && parts[0].length === 4) {
              val = `${parts[2]}/${parts[1]}/${parts[0]}`; // YYYY-MM-DD → DD/MM/YYYY
            }
          }
          // Already DD/MM/YYYY — leave as-is
        } else if (['doj', 'lwd'].includes(k) && val && typeof val === 'string') {
          // Convert other dates to YYYY-MM-DD for backend
          if (val.includes('-')) {
            const parts = val.split('-');
            if (parts.length === 3 && parts[0].length === 2) {
              val = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY → YYYY-MM-DD
            }
          } else if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3 && parts[0].length === 2) {
              val = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD/MM/YYYY → YYYY-MM-DD
            }
          }
        }
        payload[k] = val;
      });
      if (payload.dob) payload.date_of_birth = payload.dob;
      if (payload.date_of_birth) payload.dob = payload.date_of_birth;
      if (payload.lwd) {
        payload.last_working_day = payload.lwd;
        payload.last_working_date = payload.lwd;
      }

      // Fix key mismatches between SECTIONS field keys and backend column names
      // official_email_id (SECTIONS key) vs official_email (form state key)
      if (!payload.official_email && form.official_email) payload.official_email = form.official_email;
      if (!payload.official_email_id && form.official_email) payload.official_email_id = form.official_email;

      // Send ft_pt with all common backend column name variants
      if (payload.ft_pt) {
        payload.full_time_part_time = payload.ft_pt;
        payload.employment_type = payload.ft_pt;
      } else if (form.ft_pt) {
        payload.ft_pt = form.ft_pt;
        payload.full_time_part_time = form.ft_pt;
        payload.employment_type = form.ft_pt;
      }

      // Send status with all common backend column name variants
      if (payload.status) {
        payload.employee_status = payload.status;
        payload.emp_status = payload.status;
      } else if (form.status) {
        payload.status = form.status;
        payload.employee_status = form.status;
        payload.emp_status = form.status;
      }

      const res = await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setToast({ type: 'success', msg: 'Profile Info updated successfully!' });

        // Save to cache
        const cacheKey = `profile_cache_pm_${uid}`;
        try {
          const cached = sessionStorage.getItem(cacheKey);
          const currentCache = cached ? JSON.parse(cached) : {};
          const updatedCache = { ...currentCache, ...payload };
          updatedCache.dob = form.dob;
          updatedCache.date_of_birth = form.date_of_birth;
          sessionStorage.setItem(cacheKey, JSON.stringify(updatedCache));
        } catch (e) { }

        if (shouldGoNext) {
          const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
          const nextSection = SECTIONS[currentIndex + 1];
          if (nextSection) {
            setActiveSection(nextSection.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setIsEditing(false);
          }
        } else {
          setIsEditing(false);
        }
      }
    } catch {
      setToast({ type: 'error', msg: 'Network error.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handlePrevious = () => {
    const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
    const prevSection = SECTIONS[currentIndex - 1];
    if (prevSection) {
      setActiveSection(prevSection.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentSectionIndex = SECTIONS.findIndex(s => s.id === activeSection);
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
                  backgroundColor: 'white', borderRadius: '28px', padding: '24px',
                  width: isMobile ? '90vw' : '650px',
                  maxHeight: '85vh', position: 'relative',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  border: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, paddingRight: '84px' }}>
                  <h3 style={{ margin: 0, color: '#0B1E3F', fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }}>{previewDoc.label}</h3>
                  {/* Zoom / Fullscreen button */}
                  <button
                    onClick={() => setFullscreenUrl(previewDoc.url)}
                    title="View fullscreen"
                    style={{
                      position: 'absolute', top: '15px', right: '59px', width: '36px', height: '36px',
                      borderRadius: '50%', backgroundColor: '#f1f5f9', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: '#315A9E', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  >
                    <Maximize2 size={17} />
                  </button>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    style={{
                      position: 'absolute', top: '15px', right: '15px', width: '36px', height: '36px',
                      borderRadius: '50%', backgroundColor: '#f1f5f9', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: '#0B1E3F', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', borderRadius: '20px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', width: '100%', boxSizing: 'border-box' }}>
                  {(previewDoc.url.toLowerCase().endsWith('.pdf') || previewDoc.url.includes('application/pdf')) ? (
                    isMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px', textAlign: 'center' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
                        <div style={{ fontWeight: '900', color: '#0B1E3F', fontSize: '18px', marginBottom: '8px' }}>PDF Document</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>PDF previews cannot render directly inside emulated/mobile iframe.</div>
                        <a
                          href={previewDoc.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#315A9E', color: 'white', padding: '12px 24px',
                            borderRadius: '12px', fontWeight: '900', textDecoration: 'none',
                            fontSize: '14px', boxShadow: '0 4px 12px rgba(49, 90, 158, 0.2)'
                          }}
                        >
                          OPEN / DOWNLOAD PDF
                        </a>
                      </div>
                    ) : (
                      <iframe
                        src={previewDoc.url}
                        style={{ width: '100%', height: '55vh', border: 'none', borderRadius: '20px' }}
                        title="Document Preview"
                      />
                    )
                  ) : (previewDoc.url.includes('image/') || previewDoc.url.startsWith('data:image/') || !previewDoc.url.startsWith('data:')) ? (
                    <img
                      src={previewDoc.url}
                      alt="Proof Preview"
                      onClick={() => setFullscreenUrl(previewDoc.url)}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '55vh',
                        display: 'block',
                        borderRadius: '20px',
                        objectFit: 'contain',
                        cursor: 'zoom-in'
                      }}
                      onError={(e) => {
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

                <div style={{ textAlign: 'center', flexShrink: 0, padding: '5px 0' }}>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '13px', color: '#315A9E', fontWeight: '900', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >

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
            <div style={{
              minWidth: isMobile ? '100%' : '240px',
              padding: '12px 20px', borderRadius: '16px', border: '1.5px solid #e2e8f0',
              backgroundColor: '#f8fafc', color: '#0B1E3F', fontSize: '14px', fontWeight: '800',
              display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <User size={16} color="#315A9E" />
              My Profile ({user?.name || 'Self'})
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsEditing(prev => !prev)}
              style={{
                padding: '14px 28px', backgroundColor: isEditing ? '#ef4444' : 'white', color: isEditing ? 'white' : '#0B1E3F',
                border: '3px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', borderRadius: '16px', fontWeight: '900', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {isEditing ? <X size={16} /> : <Pencil size={16} />}
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </motion.button>
          </div>
        </div>

        <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'row', gridTemplateColumns: isMobile ? 'none' : '280px 1fr', gap: isMobile ? '20px' : '24px', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
            <div style={{
              width: '100%',
              margin: '0',
              boxSizing: 'border-box',
              flexShrink: 0,
              position: !isMobile ? 'sticky' : 'static',
              top: !isMobile ? '120px' : 'auto',
              zIndex: 10
            }}>
            {isMobile ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: '20px', backgroundColor: '#0B1E3F',
                color: 'white', marginBottom: '10px', boxShadow: '0 10px 15px -3px rgba(11, 30, 63, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === activeSection);
                    const prevIdx = (idx - 1 + SECTIONS.length) % SECTIONS.length;
                    setActiveSection(SECTIONS[prevIdx].id);
                  }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}
                >
                  <ChevronLeft size={20} />
                </motion.button>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Section {SECTIONS.findIndex(s => s.id === activeSection) + 1} of {SECTIONS.length}</div>
                  <div style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '-0.2px' }}>{SECTIONS.find(s => s.id === activeSection)?.label}</div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === activeSection);
                    const nextIdx = (idx + 1) % SECTIONS.length;
                    setActiveSection(SECTIONS[nextIdx].id);
                  }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}
                >
                  <ChevronRight size={20} />
                </motion.button>
              </div>
            ) : (
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
            )}
          </div>

          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              backgroundColor: 'white',
              borderRadius: '28px',
              padding: isMobile ? '24px' : '40px',
              border: '1.5px solid #e2e8f0',
              maxHeight: !isMobile ? 'calc(100vh - 280px)' : 'none',
              overflowY: !isMobile ? 'auto' : 'visible',
              position: !isMobile ? 'sticky' : 'static',
              top: !isMobile ? '120px' : 'auto'
            }}
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
                    <label style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>
                      {field.key === 'father_husband_name'
                        ? (form.marital_status === 'Married' ? 'Spouse Name' : 'Father Name')
                        : field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    {field.type === 'file' ? (
                      <div
                        style={{
                          border: isMobile ? '2px dashed #cbd5e1' : '3px dashed #cbd5e1', borderRadius: '16px', padding: '20px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          background: '#f8fafc', position: 'relative', transition: 'all 0.3s ease',
                          cursor: isDisabled ? 'not-allowed' : 'pointer', width: '100%', boxSizing: 'border-box'
                        }}
                        onMouseEnter={e => {
                          if (!isDisabled) {
                            e.currentTarget.style.borderColor = '#315A9E';
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(49, 90, 158, 0.1)';
                          }
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
                            {((isEditing) || (!isEditing)) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDocRemoveConfirm({ fieldKey: field.key, fieldLabel: field.label, isEditingCtx: isEditing });
                                }}
                                style={{
                                  border: 'none', background: '#ef444415', color: '#ef4444',
                                  fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                                  padding: '4px 10px', borderRadius: '8px', marginTop: '2px'
                                }}
                              >REMOVE</button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: isDisabled ? 0.5 : 1 }}>
                            <Upload size={24} color="#315A9E" />
                            <div style={{ fontSize: '12px', fontWeight: '900', color: '#0B1E3F' }}>UPLOAD DOCUMENT</div>
                            {!isDisabled && <input type="file" onChange={e => handleFileSelect(field.key, e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />}
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
                        value={form[field.key] || ''}
                        disabled={isDisabled}
                        onChange={e => handleChange(field.key, e.target.value)}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', fontWeight: '900', color: form[field.key] ? '#0B1E3F' : '#94a3b8', border: isMobile ? '2px solid #cbd5e1' : '3px solid #cbd5e1', backgroundColor: isDisabled ? '#f1f5f9' : 'white', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '16px' }}
                      >
                        <option value="" disabled style={{ color: '#94a3b8', fontWeight: '900' }}>Choose {field.label}</option>
                        {field.options.map(o => <option key={o} value={o} style={{ color: '#0B1E3F' }}>{o}</option>)}
                      </select>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={form[field.key]}
                          placeholder={field.placeholder || ''}
                          readOnly={isDisabled}
                          onChange={e => handleChange(field.key, e.target.value, e.target)}
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            borderRadius: '16px',
                            fontWeight: '900',
                            color: '#0B1E3F',
                            WebkitTextFillColor: '#0B1E3F',
                            border: isMobile ? '2px solid #cbd5e1' : '3px solid #cbd5e1',
                            backgroundColor: isDisabled ? '#f1f5f9' : 'white',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            fontSize: '16px',
                            textTransform: (field.key === 'pan_number' || field.key === 'passport_no' || field.key === 'voter_id' || field.key === 'ifsc_code' || field.key === 'blood_group') ? 'uppercase' : 'none'
                          }}
                        />
                        {field.placeholder && (() => {
                          const val = form[field.key] || '';
                          if (field.key === 'pan_number') {
                            if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
                              return null;
                            }
                            const isInvalid = val.length > 0;
                            if (isInvalid) {
                              return (
                                <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '500', marginTop: '-2px', paddingLeft: '4px' }}>
                                  Enter valid format! (ABCDE1234F)
                                </div>
                              );
                            }
                          }
                          if (field.key === 'aadhar_number') {
                            if (/^[0-9]{12}$/.test(val)) {
                              return null;
                            }
                            const isInvalid = val.length > 0;
                            if (isInvalid) {
                              return (
                                <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '500', marginTop: '-2px', paddingLeft: '4px' }}>
                                  Enter valid format! (1234 5678 9012)
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save & Next / Next Button at the bottom of the section */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1.5px solid #f1f5f9'
            }}>
              {currentSectionIndex > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePrevious}
                  type="button"
                  style={{
                    padding: '14px 28px',
                    backgroundColor: 'white',
                    color: '#315A9E',
                    border: '3px solid #cbd5e1',
                    borderRadius: '16px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '15px'
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </motion.button>
              )}
              {currentSectionIndex < SECTIONS.length - 1 ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  style={{
                    padding: '14px 28px',
                    backgroundColor: '#315A9E',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 20px rgba(49, 90, 158, 0.25)',
                    fontSize: '15px'
                  }}
                >
                  {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                  {isEditing ? 'Save & Next' : 'Next'}
                </motion.button>
              ) : (
                isEditing && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    style={{
                      padding: '14px 28px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)',
                      fontSize: '15px'
                    }}
                  >
                    {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                    Save & Finish
                  </motion.button>
                )
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <AppFooter />
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 900 !important;
          color: #94a3b8 !important;
        }
      `}</style>

      {/* Fullscreen Image Overlay */}
      {fullscreenUrl && (
        <div
          onClick={() => setFullscreenUrl(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <button
            onClick={() => setFullscreenUrl(null)}
            style={{
              position: 'fixed', top: '20px', right: '20px', width: '44px', height: '44px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white', zIndex: 99999
            }}
          >
            <X size={22} />
          </button>
          {(fullscreenUrl.toLowerCase().endsWith('.pdf') || fullscreenUrl.includes('application/pdf')) ? (
            <iframe
              src={fullscreenUrl}
              style={{ width: '100vw', height: '100vh', border: 'none' }}
              title="Fullscreen Preview"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={fullscreenUrl}
              alt="Fullscreen"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain', borderRadius: '4px' }}
            />
          )}
        </div>
      )}
      {docRemoveConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '36px 32px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1.5px solid #fee2e2' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>Delete Document?</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 28px 0', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{docRemoveConfirm.fieldLabel}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setDocRemoveConfirm(null)} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={async () => {
                  const { fieldKey, fieldLabel, isEditingCtx } = docRemoveConfirm;
                  setDocRemoveConfirm(null);
                  setForm(prev => ({ ...prev, [fieldKey]: '' }));
                  if (!isEditingCtx) {
                    try {
                      const token = localStorage.getItem('token');
                      let docType = fieldKey;
                      if (fieldKey === 'pancard_photo') docType = 'pan_card';
                      if (fieldKey === 'adharcard_photo') docType = 'aadhar_card';
                      if (fieldKey === 'voter_id_photo') docType = 'voter_id_proof';
                      if (fieldKey === 'passport_photo') docType = 'passport_proof';
                      if (fieldKey === 'sslc_markscard') docType = 'sslc_markscard';
                      if (fieldKey === 'puc_markscard') docType = 'puc_markscard';
                      if (fieldKey === 'ug_pg_markscard') docType = 'ug_pg_markscard';
                      if (fieldKey === 'passbook_photo') docType = 'bank_passbook';
                      if (fieldKey === 'experience_letter') docType = 'experience_letter';
                      if (fieldKey === 'previous_company_payslip') docType = 'previous_payslip';

                      const updatePayload = {
                        employee_id: selectedEmpId,
                        id: selectedEmpId,
                        [fieldKey]: '',
                        [docType]: '',
                        experience_letter_photo: fieldKey === 'experience_letter' ? '' : undefined,
                        previous_payslip_photo: fieldKey === 'previous_company_payslip' ? '' : undefined
                      };
                      Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

                      await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(updatePayload)
                      });
                      setToast({ type: 'success', msg: `${fieldLabel} removed successfully` });
                    } catch (err) {
                      console.error("Failed to remove file:", err);
                    }
                  }
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#ef4444', color: 'white', fontSize: '14px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
