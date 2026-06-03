import React, { useState, useEffect, cloneElement, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Building2,
  AlertCircle, CheckCircle2, User, Landmark, RefreshCw,
  MapPin, GraduationCap, History,
  FileCheck, Users, Pencil, Upload, ChevronDown, ChevronLeft, ChevronRight, X
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
      { key: 'dob', label: 'Date of Birth', type: 'text', placeholder: 'DD/MM/YYYY', required: true },
      { key: 'age', label: 'Age', type: 'text', placeholder: 'Age' },
      { key: 'religion', label: 'Religion', type: 'text' },
      { key: 'blood_group', label: 'Blood Group', type: 'text', required: true },
      { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. Indian', required: true },
      { key: 'father_husband_name', label: "Father/Husband's Name", type: 'text' },
      { key: 'category', label: 'Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Other'] },
      { key: 'pan_number', label: 'PAN Number', type: 'text', placeholder: 'Enter valid Pan Number (ABCDE1234F)', required: true },
      { key: 'pancard_photo', label: 'PAN Card Proof', type: 'file', required: true },
      { key: 'aadhar_number', label: 'Aadhar Number', type: 'text', placeholder: 'Enter valid Aadhar Number (1234 5678 9012)', required: true },
      { key: 'adharcard_photo', label: 'Aadhar Card Proof', type: 'file', required: true },
      { key: 'voter_id', label: 'Voter ID Number', type: 'text' },
      { key: 'voter_id_photo', label: 'Voter ID', type: 'file' },
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
      { key: 'process', label: 'Process', type: 'text' },
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
      { key: 'previous_org', label: 'Previous Organization', type: 'text' },
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
  const [form, setForm] = useState({
    emp_name: '', gender: '', dob: '', age: '', religion: '', blood_group: '', marital_status: '', nationality: '', father_husband_name: '', pan_number: '', aadhar_number: '', category: '',
    pancard_photo: '', adharcard_photo: '', voter_id: '', voter_id_photo: '', passport_no: '', passport_photo: '',
    designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: '', status: '', place: '', moved: '', official_email: '',
    contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
    sslc_percentage: '', sslc_markscard: '', puc_percentage: '', puc_markscard: '',
    ug_pg_percentage: '', ug_pg_markscard: '',
    qualification: '', edu_completion_year: '', college: '', university: '', previous_org: '', previous_exp: '', source: '', languages_known: '',
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
          emp_name: '', gender: '', dob: '', age: '', religion: '', blood_group: '', marital_status: '', nationality: '', father_husband_name: '', pan_number: '', aadhar_number: '', category: '',
          pancard_photo: '', adharcard_photo: '', voter_id: '', voter_id_photo: '', passport_no: '', passport_photo: '',
          designation: '', department: '', process: '', supervisor_l1: '', supervisor_l2: '', doj: '', ft_pt: '', status: '', place: '', moved: '', official_email: '',
          contact_no: '', emergency_contact_no: '', personal_email: '', present_address: '', permanent_address: '', state: '',
          sslc_percentage: '', sslc_markscard: '', puc_percentage: '', puc_markscard: '',
          ug_pg_percentage: '', ug_pg_markscard: '',
          qualification: '', edu_completion_year: '', college: '', university: '', previous_org: '', previous_exp: '', source: '', languages_known: '',
          separation: '', lwd: '', attrition_bucket: '', reason: '',
          experience_letter: '', previous_company_payslip: '',
          bank_name: '', bank_account_no: '', ifsc_code: '', bank_branch: '', gross_salary_a: '', salary: '', pt: '', passbook_photo: '',
          bgv_status: '', appointment_letter: '', approved_by_ceo: '', onboarding_doc_completed: '', id_card: '', onboarding_link: '',
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
            let normalizedVal = (val === null || val === undefined) ? '' : val;
            const lowerKey = apiKey.toLowerCase();
            let targetKey = Object.keys(emptyForm).find(formKey => formKey.toLowerCase() === lowerKey) || apiKey;

            // Aggressive mapping for backend column variations
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

            // Format date fields to DD-MM-YYYY
            if ((targetKey === 'dob' || targetKey === 'separation' || targetKey === 'doj') && normalizedVal) {
              const dateStr = String(normalizedVal);
              let d;
              if (dateStr.includes('T')) {
                d = new Date(dateStr);
              } else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  // Check if it's YYYY/MM/DD or DD/MM/YYYY
                  if (parts[0].length === 4) {
                    d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                  } else {
                    d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                  }
                }
              } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                  // Check if it's YYYY-MM-DD or DD-MM-YYYY
                  if (parts[0].length === 4) {
                    d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                  } else {
                    d = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                  }
                }
              }

              if (d && !isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                normalizedVal = targetKey === 'dob' ? `${day}/${month}/${year}` : `${day}-${month}-${year}`;
              }
            }

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

  const handleChange = (key, value) => {
    let sanitizedValue = value;

    if (key === 'dob') {
      const prevValue = form.dob || '';
      const isDeleting = prevValue.length > value.length;
      let clean = value.replace(/\D/g, '');

      if (isDeleting && prevValue.endsWith('/') && !value.endsWith('/')) {
        if (clean.length > 0) {
          clean = clean.slice(0, -1);
        }
      }

      // Max 8 digits
      if (clean.length > 8) {
        clean = clean.slice(0, 8);
      }

      // Restrict day (dd)
      if (clean.length >= 1) {
        const d1 = parseInt(clean.charAt(0), 10);
        if (d1 > 3) {
          clean = '0' + clean;
        }
      }
      if (clean.length >= 2) {
        let dd = clean.slice(0, 2);
        const ddVal = parseInt(dd, 10);
        if (ddVal > 31) {
          dd = '31';
        } else if (ddVal === 0) {
          dd = '01';
        }
        clean = dd + clean.slice(2);
      }

      // Restrict month (mm)
      if (clean.length >= 3) {
        const m1 = parseInt(clean.charAt(2), 10);
        if (m1 > 1) {
          clean = clean.slice(0, 2) + '0' + clean.slice(2);
        }
      }
      if (clean.length >= 4) {
        let mm = clean.slice(2, 4);
        const mmVal = parseInt(mm, 10);
        if (mmVal > 12) {
          mm = '12';
        } else if (mmVal === 0) {
          mm = '01';
        }
        clean = clean.slice(0, 2) + mm + clean.slice(4);
      }

      // Restrict year (yyyy)
      if (clean.length >= 8) {
        let yyyy = clean.slice(4, 8);
        const yyyyVal = parseInt(yyyy, 10);
        if (yyyyVal > 2090) {
          yyyy = '2090';
        }
        clean = clean.slice(0, 4) + yyyy;
      }

      // Reconstruct with slashes
      let formatted = '';
      if (clean.length > 4) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4);
      } else if (clean.length > 2) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2);
      } else {
        formatted = clean;
      }

      sanitizedValue = formatted;
    }

    if (key === 'separation') {
      const prevValue = form.separation || '';
      const isDeleting = prevValue.length > value.length;
      let clean = value.replace(/\D/g, '');

      if (isDeleting && prevValue.endsWith('/') && !value.endsWith('/')) {
        if (clean.length > 0) {
          clean = clean.slice(0, -1);
        }
      }

      // Max 8 digits
      if (clean.length > 8) {
        clean = clean.slice(0, 8);
      }

      // Restrict day (dd)
      if (clean.length >= 1) {
        const d1 = parseInt(clean.charAt(0), 10);
        if (d1 > 3) {
          clean = '0' + clean;
        }
      }
      if (clean.length >= 2) {
        let dd = clean.slice(0, 2);
        const ddVal = parseInt(dd, 10);
        if (ddVal > 31) {
          dd = '31';
        } else if (ddVal === 0) {
          dd = '01';
        }
        clean = dd + clean.slice(2);
      }

      // Restrict month (mm)
      if (clean.length >= 3) {
        const m1 = parseInt(clean.charAt(2), 10);
        if (m1 > 1) {
          clean = clean.slice(0, 2) + '0' + clean.slice(2);
        }
      }
      if (clean.length >= 4) {
        let mm = clean.slice(2, 4);
        const mmVal = parseInt(mm, 10);
        if (mmVal > 12) {
          mm = '12';
        } else if (mmVal === 0) {
          mm = '01';
        }
        clean = clean.slice(0, 2) + mm + clean.slice(4);
      }

      // Restrict year (yyyy) max 4 digits, ≤ 2090
      if (clean.length >= 8) {
        let yyyy = clean.slice(4, 8);
        const yyyyVal = parseInt(yyyy, 10);
        if (yyyyVal > 2090) {
          yyyy = '2090';
        }
        clean = clean.slice(0, 4) + yyyy;
      }

      // Reconstruct with slashes dd/mm/yyyy
      let formatted = '';
      if (clean.length > 4) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4);
      } else if (clean.length > 2) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2);
      } else {
        formatted = clean;
      }

      sanitizedValue = formatted;
    }

    if (key === 'doj') {
      const prevValue = form.doj || '';
      const isDeleting = prevValue.length > value.length;
      let clean = value.replace(/\D/g, '');

      if (isDeleting && prevValue.endsWith('/') && !value.endsWith('/')) {
        if (clean.length > 0) {
          clean = clean.slice(0, -1);
        }
      }

      // Max 8 digits
      if (clean.length > 8) {
        clean = clean.slice(0, 8);
      }

      // Restrict day (dd)
      if (clean.length >= 1) {
        const d1 = parseInt(clean.charAt(0), 10);
        if (d1 > 3) {
          clean = '0' + clean;
        }
      }
      if (clean.length >= 2) {
        let dd = clean.slice(0, 2);
        const ddVal = parseInt(dd, 10);
        if (ddVal > 31) {
          dd = '31';
        } else if (ddVal === 0) {
          dd = '01';
        }
        clean = dd + clean.slice(2);
      }

      // Restrict month (mm)
      if (clean.length >= 3) {
        const m1 = parseInt(clean.charAt(2), 10);
        if (m1 > 1) {
          clean = clean.slice(0, 2) + '0' + clean.slice(2);
        }
      }
      if (clean.length >= 4) {
        let mm = clean.slice(2, 4);
        const mmVal = parseInt(mm, 10);
        if (mmVal > 12) {
          mm = '12';
        } else if (mmVal === 0) {
          mm = '01';
        }
        clean = clean.slice(0, 2) + mm + clean.slice(4);
      }

      // Restrict year (yyyy) max 4 digits, ≤ 2090
      if (clean.length >= 8) {
        let yyyy = clean.slice(4, 8);
        const yyyyVal = parseInt(yyyy, 10);
        if (yyyyVal > 2090) {
          yyyy = '2090';
        }
        clean = clean.slice(0, 4) + yyyy;
      }

      // Reconstruct with slashes dd/mm/yyyy
      let formatted = '';
      if (clean.length > 4) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4);
      } else if (clean.length > 2) {
        formatted = clean.slice(0, 2) + '/' + clean.slice(2);
      } else {
        formatted = clean;
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
    if (key === 'dob') {
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

    if (activeSectionFields.includes('dob') && form.dob) {
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dob) && !/^\d{2}-\d{2}-\d{4}$/.test(form.dob)) {
        setToast({ type: 'error', msg: `Please enter a complete Date of Birth (DD/MM/YYYY)${getSection('dob')}` });
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

      // Format dates to YYYY-MM-DD and only include fields from the active section
      const payload = { employee_id: uid, id: uid };
      activeSectionFields.forEach(k => {
        let val = form[k];
        if (['doj', 'separation'].includes(k) && val && val.includes('-')) {
          const parts = val.split('-');
          if (parts.length === 3 && parts[0].length === 2) {
            val = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        payload[k] = val;
      });

      const res = await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setToast({ type: 'success', msg: 'Profile Info updated successfully!' });
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, paddingRight: '40px' }}>
                  <h3 style={{ margin: 0, color: '#0B1E3F', fontWeight: '900', fontSize: '18px', textTransform: 'uppercase' }}>{previewDoc.label}</h3>
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
                      style={{
                        maxWidth: '100%',
                        maxHeight: '55vh',
                        display: 'block',
                        borderRadius: '20px',
                        objectFit: 'contain'
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
                    OPEN DOCUMENT IN NEW TAB ↗
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
          <div style={{ width: '100%', margin: '0', boxSizing: 'border-box', flexShrink: 0 }}>
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
                    <label style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
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
                          placeholder=""
                          readOnly={isDisabled}
                          onChange={e => handleChange(field.key, e.target.value)}
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
                            return (
                              <div style={{ fontSize: '13px', color: isInvalid ? '#ef4444' : '#64748b', fontWeight: '500', marginTop: '-2px', paddingLeft: '4px' }}>
                                {isInvalid ? 'Enter valid format! (ABCDE1234F)' : field.placeholder}
                              </div>
                            );
                          }
                          if (field.key === 'aadhar_number') {
                            if (/^[0-9]{12}$/.test(val)) {
                              return null;
                            }
                            const isInvalid = val.length > 0;
                            return (
                              <div style={{ fontSize: '13px', color: isInvalid ? '#ef4444' : '#64748b', fontWeight: '500', marginTop: '-2px', paddingLeft: '4px' }}>
                                {isInvalid ? 'Enter valid format! (1234 5678 9012)' : field.placeholder}
                              </div>
                            );
                          }
                          return (
                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '-2px', paddingLeft: '4px' }}>
                              {field.placeholder}
                            </div>
                          );
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
      `}</style>
    </div>
  );
}
