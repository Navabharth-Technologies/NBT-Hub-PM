import React, { useState, useRef, useEffect } from 'react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { useThread } from '../../context/ThreadContext';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import './PMDashboard.css';
import {
  Building2, Mail, User, Phone, Check, X,
  ChevronRight, Calendar, Shield, LogOut,
  History, Users, FileText, Briefcase, Heart, Edit3, Fingerprint, Camera,
  MessageSquare, Trash2, Clock, MapPin, Info, LifeBuoy, RefreshCw
} from 'lucide-react';
import UpdatePasswordModal from './UpdatePasswordModal';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';

export default function PerformanceModule() {
  const { user, logout, updateUserData } = useAuth();
  const { fetchUserThreads, toggleReaction, deleteThread } = useThread();
  const navigate = useNavigate();

  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [phone, setPhone] = useState(user?.phone_number || 'Add Phone Number');
  const [aboutMe, setAboutMe] = useState(user?.about_me || 'Write a short introduction about yourself');
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [tempAbout, setTempAbout] = useState('');
  const [saving, setSaving] = useState(false);
  const [dob, setDob] = useState(user?.date_of_birth || 'Add Date of Birth');
  const [role, setRole] = useState(user?.role || user?.designation || 'Lead Software Engineer');
  const [profileImage, setProfileImage] = useState(user?.profile_picture || null);
  const [reportingManager, setReportingManager] = useState({ name: 'Anish V N', id: '' });
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingDob, setIsEditingDob] = useState(false);
  const [joiningDate, setJoiningDate] = useState(user?.joining_date || '16 January 2026');
  const [dbJoiningDate, setDbJoiningDate] = useState(null);
  const [tempPhone, setTempPhone] = useState('');
  const [tempDob, setTempDob] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Crop States
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropUploading, setCropUploading] = useState(false);

  const fileInputRef = useRef(null);
  const dobInputRef = useRef(null);

  useEffect(() => {
    if (fullscreenImage) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [fullscreenImage]);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    const loadProfile = async () => {
      if (!user?.email || !user?.token) return;
      try {
        const res = await fetch(`${API_ENDPOINTS.PROFILE}/${user.email}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setPhone(data.phone_number || user.phone_number || 'Add Phone Number');
          setAboutMe(data.about_me || user.about_me || 'Write a short introduction about yourself');
          setDob(data.date_of_birth || user.date_of_birth || 'Add Date of Birth');
          setRole(data.role || data.designation || user.role || user.designation || 'Lead Software Engineer');
          setJoiningDate(data.joining_date || data.date_of_joining || user.joining_date || '16 January 2026');
          setReportingManager({
            name: data.reporting_manager || data.reportingManagerName || 'Anish V N',
            id: data.reporting_manager_id || data.reportingManagerId || ''
          });

          // Fetch manager details by ID
          const mid = data.reporting_manager_id || data.reportingManagerId;
          if (mid) {
            try {
              const mRes = await fetch(`${API_ENDPOINTS.PROFILE}/${mid}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
              });
              if (mRes.ok) {
                const mData = await mRes.json();
                setReportingManager({
                  name: mData.name || 'Anish V N',
                  id: mid,
                  profile_pic: mData.profile_pic || mData.profile_picture
                });
              }
            } catch (err) { console.error('Manager lookup error:', err); }
          }
        }
      } catch (err) { console.error('Profile fetch error:', err); }
    };

    const loadManager = async () => {
      if (!user?.token || !user?.email) return;
      try {
        const res = await fetch(`${API_ENDPOINTS.PROFILE_MANAGER}?email=${user.email}`, {
          headers: { 'Authorization': `Bearer ${user?.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReportingManager(prev => ({
            ...prev,
            name: data.name || prev.name || 'Anish V N',
            id: data.id || prev.id,
            profile_pic: data.profile_pic || data.profile_picture || prev.profile_pic
          }));
        }
      } catch (err) { console.error('Manager fetch error:', err); }
    };

    loadProfile();
    loadManager();

    const loadUserRole = async () => {
      if (!user?.token) return;
      try {
        const res = await fetch(`${BASE_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (res.ok) {
          const users = await res.json();
          const currentId = user?.employee_id || user?.id || user?.empId;
          const target = users.find(u => String(u.employee_id || u.id || u.empId) === String(currentId));
          if (target) {
            if (target.joining_date) {
              setDbJoiningDate(target.joining_date);
              try {
                const dateObj = new Date(target.joining_date);
                if (!isNaN(dateObj)) {
                  setJoiningDate(dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
                } else {
                  setJoiningDate(target.joining_date);
                }
              } catch (e) {
                setJoiningDate(target.joining_date);
              }
            }
          }
        }
      } catch (err) {
        console.error('Fetch Role Error:', err);
      }
    };

    loadUserRole();
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };

  // Calculate total tenurity from joining date
  const calcTenure = () => {
    const raw = dbJoiningDate || user?.date_of_joining || user?.joining_date || user?.doj || joiningDate;
    let joinDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      joinDate = new Date(raw);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split('/');
      joinDate = new Date(`${y}-${m}-${d}`);
    } else if (raw && raw !== '16 January 2026') {
      joinDate = new Date(raw);
    } else {
      joinDate = new Date('2026-01-16');
    }
    if (!joinDate || isNaN(joinDate.getTime())) joinDate = new Date('2026-01-16');
    const now = new Date();
    let months = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    let days = now.getDate() - joinDate.getDate();
    if (days < 0) { months -= 1; const prev = new Date(now.getFullYear(), now.getMonth(), 0); days += prev.getDate(); }
    if (months < 0) months = 0;
    if (months === 0 && days < 0) days = 0;
    return { months, days };
  };
  const tenure = calcTenure();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImageSrc(reader.result);
      setShowCropModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = async () => {
    if (!selectedImageSrc || !croppedAreaPixels) return;
    setCropUploading(true);

    try {
      const croppedBlob = await getCroppedImg(selectedImageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error('Failed to crop image');

      // Local preview instantly
      const previewUrl = URL.createObjectURL(croppedBlob);
      setProfileImage(previewUrl);

      const reader = new FileReader();
      reader.readAsDataURL(croppedBlob);
      reader.onloadend = () => {
        updateUserData({ profile_pic: reader.result, profile_picture: reader.result });
      };

      const formData = new FormData();
      formData.append('image', croppedBlob, 'profile_pic.jpg');
      formData.append('file', croppedBlob, 'profile_pic.jpg');

      const empId = parseInt(user.employee_id || user.id || user.userId || user.EmpID || 0);

      formData.append('managerId', empId);
      formData.append('employee_id', empId);
      formData.append('employeeId', empId);
      formData.append('emp_id', empId);
      formData.append('userId', empId);
      formData.append('user_id', empId);
      formData.append('id', user.id || empId);

      const res = await fetch(API_ENDPOINTS.MANAGER_UPLOAD_IMAGE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.url || data.filePath || data.path || data.record?.path || data.profile_pic || data.profile_picture || (data.record && (data.record.profile_pic || data.record.path));

        if (url) {
          await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
              email: user.email,
              employee_id: empId,
              employeeId: empId,
              emp_id: empId,
              userId: empId,
              user_id: empId,
              id: user.id || empId,
              profile_pic: url,
              profile_picture: url,
              image: url
            })
          });

          await fetch(API_ENDPOINTS.EMPLOYEE_PROFILE_UPDATE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
              profile_pic: url,
              profile_picture: url,
              employee_id: empId,
              id: empId
            })
          });

          const updatedUser = {
            ...user,
            profile_pic: url,
            profile_picture: url
          };
          updateUserData(updatedUser);

          const fullUrl = url.startsWith('http') || url.startsWith('data:') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
          setProfileImage(fullUrl);

          setToast({ show: true, message: 'profile pic updated successfully ✅', type: 'success' });
          setTimeout(() => setToast({ show: false, message: '' }), 3000);
        } else {
          setToast({ show: true, message: 'Upload succeeded but URL missing', type: 'error' });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setToast({ show: true, message: errData.message || 'Upload failed', type: 'error' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setToast({ show: true, message: 'Upload failed', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    } finally {
      setCropUploading(false);
      setShowCropModal(false);
      setSelectedImageSrc(null);
    }
  };

  const validateDob = (dobStr) => {
    if (!dobStr) return 'Date of Birth is required';
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dobStr)) {
      return 'Date of Birth must be in DD/MM/YYYY format';
    }
    const [dStr, mStr, yStr] = dobStr.split('/');
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);
    const year = parseInt(yStr, 10);

    if (day < 1 || day > 31) {
      return 'Day must be between 01 and 31';
    }
    if (month < 1 || month > 12) {
      return 'Month must be between 01 and 12';
    }
    if (year > 2090) {
      return 'Year cannot be above 2090';
    }
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return 'Please enter a valid calendar date';
    }
    return null;
  };

  const handleDobChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setTempDob('');
      return;
    }

    // Allow only digits and slashes
    const cleanVal = val.replace(/[^0-9/]/g, '');

    const parts = cleanVal.split('/');
    if (parts.length > 3) return;

    const dayStr = parts[0] || '';
    const monthStr = parts[1] || '';
    const yearStr = parts[2] || '';

    if (dayStr) {
      if (dayStr.length > 2) return;
      const day = parseInt(dayStr, 10);
      if (day > 31) return;
    }

    if (monthStr) {
      if (monthStr.length > 2) return;
      const month = parseInt(monthStr, 10);
      if (month > 12) return;
    }

    if (yearStr) {
      if (yearStr.length > 4) return;
      if (yearStr.length === 4) {
        const year = parseInt(yearStr, 10);
        if (year > 2090) return;
      }
    }

    let formatted = cleanVal;
    if (dayStr.length === 2 && parts.length === 1 && val.length > (tempDob || '').length) {
      formatted = dayStr + '/';
    }
    if (monthStr.length === 2 && parts.length === 2 && val.length > (tempDob || '').length) {
      formatted = dayStr + '/' + monthStr + '/';
    }

    setTempDob(formatted);
  };

  const updateProfileField = async (field, value) => {
    if (!user?.token || !user?.email) return;
    if (field === 'date_of_birth') {
      const error = validateDob(value);
      if (error) {
        setToast({ show: true, message: error, type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
        return;
      }
    }
    try {
      const nextPhone = field === 'phone_number' ? value : (phone !== 'Add Phone Number' ? phone : (user.phone_number || ''));
      let nextDob = field === 'date_of_birth' ? value : (dob !== 'Add Date of Birth' ? dob : (user.date_of_birth || ''));

      // Handle formatting for both input types (date picker YYYY-MM-DD and manual DD-MM-YYYY)
      if (field === 'date_of_birth' && nextDob) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(nextDob)) {
          // It's YYYY-MM-DD from a date picker
          const [y, m, d] = nextDob.split('-');
          nextDob = `${d}/${m}/${y}`;
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(nextDob)) {
          // It's already DD-MM-YYYY, change to DD/MM/YYYY for internal consistency
          nextDob = nextDob.replace(/-/g, '/');
        }
      }

      const payload = {
        email: user.email,
        employee_id: user.employee_id,
        id: user.id || user.employee_id,
        phone_number: nextPhone,
        date_of_birth: nextDob,
        about_me: aboutMe,
        phone: nextPhone,
        dob: nextDob,
        profile_picture: user?.profile_pic || user?.profile_picture || '',
        profile_pic: user?.profile_pic || user?.profile_picture || ''
      };

      const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (field === 'phone_number') {
          setPhone(value);
          setIsEditingPhone(false);
          updateUserData({ phone_number: value });
        }
        if (field === 'date_of_birth') {
          let formattedDob = value;
          if (value.includes('-')) {
            const [y, m, d] = value.split('-');
            formattedDob = `${d}/${m}/${y}`;
          }
          setDob(formattedDob);
          setIsEditingDob(false);
          updateUserData({ date_of_birth: formattedDob });
        }
        setToast({ show: true, message: 'Profile updated successfully ✅', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
      } else {
        const errData = await res.json().catch(() => ({ error: 'Update failed' }));
        setToast({ show: true, message: errData.error || 'Failed to update profile ❌', type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setToast({ show: true, message: 'Server connection failed ❌', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
    }
  };

  const updateAboutMe = async () => {
    if (!user?.token || !user?.email) return;
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.PROFILE_ABOUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          email: user.email,
          about_me: tempAbout,
          employee_id: user.employee_id,
          id: user.id || user.employee_id
        })
      });
      if (res.ok) {
        setAboutMe(tempAbout);
        setIsEditingAbout(false);
        updateUserData({ about_me: tempAbout });
        setToast({ show: true, message: 'About me updated successfully ✅', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
      }
    } catch (err) {
      console.error('About me update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr || dateStr.toLowerCase().includes('add')) return dateStr;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    try {
      const cleanDate = String(dateStr).split('T')[0];
      const d = new Date(cleanDate);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB');
    } catch { return dateStr; }
  };

  const formatDateLong = (dateStr) => {
    if (!dateStr || String(dateStr).toLowerCase().includes('16 january')) return dateStr;
    try {
      // Handle potential ISO strings with time components
      const cleanDate = String(dateStr).split('T')[0];
      const d = new Date(cleanDate);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatToISODate = (dateStr) => {
    if (!dateStr || dateStr.toLowerCase().includes('add')) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const dashboardStyles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#eaeff2',
      paddingTop: winWidth < 768 ? '100px' : '120px',
      paddingBottom: '20px',
      fontFamily: "'Outfit', sans-serif"
    },
    combinedCard: {
      margin: '0 0 30px 0',
      borderRadius: winWidth < 768 ? '24px' : '32px',
      boxShadow: '0 15px 35px rgba(15, 23, 42, 0.12)',
      background: 'white',
      overflow: 'hidden',
      border: '1px solid #f1f5f9'
    },
    banner: {
      height: winWidth < 768 ? '100px' : '130px',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: winWidth < 768 ? '18px' : '26px',
      fontWeight: '900',
      letterSpacing: '-0.5px',
      textAlign: 'center'
    },
    profileCard: {
      maxWidth: '100%',
      width: '100%',
      background: 'white',
      padding: winWidth < 768 ? '25px' : '40px',
      position: 'relative',
      zIndex: 10
    },
    avatar: {
      width: winWidth < 768 ? '100px' : '130px',
      height: winWidth < 768 ? '100px' : '130px',
      borderRadius: winWidth < 768 ? '22px' : '30px',
      background: '#e2e8f0',
      border: winWidth < 768 ? '4px solid white' : '6px solid white',
      boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: winWidth < 768 ? '36px' : '48px',
      fontWeight: '950',
      color: '#0f172a',
      position: 'relative'
    },
    statBox: {
      background: 'white',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
    },
    serviceCard: {
      borderRadius: '24px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      transition: '0.2s transform'
    },
    docCard: {
      background: 'white',
      borderRadius: '24px',
      padding: '24px',
      border: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
    }
  };

  return (
    <div style={dashboardStyles.container}>
      <AppHeader />

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />

      <main style={{ padding: winWidth < 768 ? '0 16px' : '0 26px', width: '100%', boxSizing: 'border-box' }}>

        {/* Combined Dual-Color Card */}
        <div style={dashboardStyles.combinedCard}>
          {/* Banner Top Half */}
          <div style={dashboardStyles.banner}>
            Smarter Solutions for Better Future
          </div>

          {/* Profile Bottom Half */}
          <div style={dashboardStyles.profileCard}>
            <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'center' : 'flex-start', gap: winWidth < 1024 ? '30px' : '0', textAlign: winWidth < 1024 ? 'center' : 'left' }}>
              <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', gap: '24px', alignItems: 'center' }}>
                <div
                  style={{ ...dashboardStyles.avatar, cursor: 'pointer' }}
                  onClick={() => {
                    const pic = user?.profile_pic || user?.profile_picture;
                    if (pic) {
                      const fullUrl = pic.startsWith('http') || pic.startsWith('data:') ? pic : `${BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
                      setFullscreenImage(fullUrl);
                    }
                  }}
                >
                  {(user?.profile_pic || user?.profile_picture) ? (
                    <img
                      src={(user.profile_pic || user.profile_picture).startsWith('http') || (user.profile_pic || user.profile_picture).startsWith('data:') ? (user.profile_pic || user.profile_picture) : `${BASE_URL}${(user.profile_pic || user.profile_picture).startsWith('/') ? '' : '/'}${user.profile_pic || user.profile_picture}`}
                      alt="Me"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: winWidth < 768 ? '18px' : '24px' }}
                    />
                  ) : user?.name?.[0] || 'U'}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: winWidth < 768 ? '32px' : '36px', height: winWidth < 768 ? '32px' : '36px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                  >
                    <Camera size={winWidth < 768 ? 16 : 18} color="#0f172a" />
                  </button>
                </div>
                <div>
                  <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: winWidth < 768 ? '22px' : '28px', fontWeight: '950', color: '#0f172a', margin: 0 }}>{user?.name || 'Sahana Nv'}</h1>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Fingerprint size={12} /> ID: {user?.employee_id || '202516'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', alignItems: winWidth < 768 ? 'center' : 'flex-start', gap: winWidth < 768 ? '12px' : '40px', marginTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontSize: winWidth < 768 ? '12px' : '13px', fontWeight: '950', textTransform: 'uppercase' }}>
                      <Briefcase size={16} /> {role}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: winWidth < 768 ? '12px' : '13px', fontWeight: '800' }}>
                      <Phone size={16} />
                      {isEditingPhone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            value={tempPhone}
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 10) setTempPhone(val);
                            }}
                            onKeyDown={e => e.key === 'Enter' && tempPhone.length === 10 && updateProfileField('phone_number', tempPhone)}
                            autoFocus
                            style={{ border: '1.5px solid #3b82f6', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', outline: 'none', background: 'white', width: '140px' }}
                            placeholder="10-digit Phone"
                          />
                          <div onClick={() => tempPhone.length === 10 && updateProfileField('phone_number', tempPhone)} style={{ background: tempPhone.length === 10 ? '#22c55e' : '#e2e8f0', color: 'white', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><Check size={14} /></div>
                          <div onClick={() => setIsEditingPhone(false)} style={{ background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><X size={14} /></div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => { setTempPhone(phone === 'Add Phone Number' ? '' : phone); setIsEditingPhone(true); }}>
                          <span>{phone}</span>
                          <Edit3 size={14} color="#94a3b8" />
                        </div>
                      )}
                    </div>
                    {/* DOB Display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: winWidth < 768 ? '12px' : '13px', fontWeight: '800' }}>
                      <Calendar size={16} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{formatDateDisplay(dob)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 20px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1e40af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', overflow: 'hidden' }}>
                  {reportingManager.profile_pic ? (
                    <img
                      src={reportingManager.profile_pic.startsWith('http') || reportingManager.profile_pic.startsWith('data:') ? reportingManager.profile_pic : `${BASE_URL}${reportingManager.profile_pic.startsWith('/') ? '' : '/'}${reportingManager.profile_pic}`}
                      alt="Manager"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : reportingManager.name?.[0]}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reporting Manager</p>
                  <p style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: '900' }}>{reportingManager.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Stats Row */}
        <div style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto 40px',
          display: 'grid',
          gridTemplateColumns: winWidth < 600 ? '1fr' : '1fr 1fr',
          gap: '24px'
        }}>
          <div style={dashboardStyles.statBox}>
            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#f0f9ff', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={20} /></div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</p>
              <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', color: '#0f172a', fontWeight: '900', wordBreak: 'break-all' }}>{user?.email || 'sahana@navabharathtechnologies.com'}</p>
            </div>
          </div>
          <div style={dashboardStyles.statBox}>
            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#f0f9ff', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={20} /></div>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Joining</p>
              <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', color: '#0f172a', fontWeight: '900' }}>{formatDateLong(joiningDate)}</p>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px' }}>
          <h3 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#0f172a', marginBottom: '24px' }}>Services &amp; Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr' : winWidth < 900 ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '24px' }}>

            {/* Card 1 – Security Settings */}
            <div onClick={() => setShowSecurityModal(true)} style={{ ...dashboardStyles.serviceCard, background: '#dbeafe' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield color="#3b82f6" size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Security Settings</p>
                  <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>Update Security Passkey</p>
                </div>
              </div>
              <ChevronRight size={winWidth < 768 ? 16 : 20} color="#1e40af" />
            </div>

            {/* Card 2 – Support & Maintenance */}
            <div onClick={() => navigate('/tickets')} style={{ ...dashboardStyles.serviceCard, background: '#ffedd5' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LifeBuoy color="#f97316" size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support &amp; Maintenance</p>
                  <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>View Tickets</p>
                </div>
              </div>
              <ChevronRight size={winWidth < 768 ? 16 : 20} color="#9a3412" />
            </div>

            {/* Card 3 – Total Tenurity */}
            <div style={{ ...dashboardStyles.serviceCard, background: '#dcfce7', cursor: 'default' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw color="#16a34a" size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Tenurity</p>
                  <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>
                    {tenure.months}M {tenure.days}D Experience
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Documents Section */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px' }}>
          <h3 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#0f172a', marginBottom: '24px' }}>HR Documents</h3>
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? (winWidth < 600 ? '1fr' : '1fr 1fr') : 'repeat(3, 1fr)', gap: '24px' }}>
            <div
              style={{ ...dashboardStyles.docCard, cursor: 'pointer' }}
              onClick={() => navigate('/salary-statements')}
            >
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText color="#22c55e" size={26} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Pay Slip</p>
                  <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>Download salary statement</p>
                </div>
              </div>
              <ChevronRight size={winWidth < 768 ? 16 : 24} color="#94a3b8" />
            </div>

            <div
              style={{ ...dashboardStyles.docCard, background: '#0f172a', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/service-certificates')}
            >
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Fingerprint color="white" size={26} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Experience Letter</p>
                  <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: 'white' }}>Apply for service certificate</p>
                </div>
              </div>
              <ChevronRight size={winWidth < 768 ? 16 : 24} color="white" />
            </div>

            <div
              style={{ ...dashboardStyles.docCard, gridColumn: winWidth < 1024 && winWidth >= 600 ? 'span 2' : 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/resignations')}
            >
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogOut color="#ef4444" size={26} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resignation Letter</p>
                  <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>Apply for Resignation</p>
                </div>
              </div>
              <ChevronRight size={winWidth < 768 ? 16 : 24} color="#94a3b8" />
            </div>
          </div>
        </div>

        {/* About Section */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px', background: 'white', borderRadius: winWidth < 768 ? '24px' : '32px', padding: winWidth < 768 ? '20px' : '25px', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: winWidth < 768 ? '15px' : '20px' }}>
            <h3 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#0f172a', margin: 0 }}>About Me</h3>
            {!isEditingAbout && (
              <div
                onClick={() => { setTempAbout(aboutMe === 'Write a short introduction about yourself' ? '' : aboutMe); setIsEditingAbout(true); }}
                style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Edit3 size={18} color="#0f172a" />
              </div>
            )}
          </div>
          <div style={{ textAlign: isEditingAbout ? 'left' : 'center', padding: isEditingAbout ? '0' : (winWidth < 768 ? '10px 0' : '15px 0') }}>
            {isEditingAbout ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  value={tempAbout}
                  onChange={e => setTempAbout(e.target.value)}
                  placeholder="Tell us about yourself..."
                  style={{ width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px', border: '1.5px solid #3b82f6', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                  autoFocus
                  onFocus={(e) => {
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  }}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setIsEditingAbout(false)} style={{ padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={updateAboutMe} disabled={saving} style={{ padding: '8px 24px', borderRadius: '10px', border: 'none', background: '#1e40af', color: 'white', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            ) : (
              <>
                {aboutMe === 'Write a short introduction about yourself' ? (
                  null
                ) : (
                  <p style={{ margin: 0, fontSize: '15px', color: '#475569', fontWeight: '500', lineHeight: '1.6', textAlign: 'left' }}>{aboutMe}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Logout */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '5px' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{ background: 'white', color: '#ef4444', border: '2px solid #ef4444', borderRadius: '16px', padding: winWidth < 768 ? '10px 40px' : '12px 60px', fontSize: winWidth < 768 ? '13px' : '15px', fontWeight: '950', cursor: 'pointer', width: winWidth < 480 ? '100%' : 'auto' }}
          >
            Logout Securely
          </button>
        </div>

      </main>

      <UpdatePasswordModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        userEmail={user?.email}
      />

      <AppFooter />

      {/* Toast Notification */}
      {toast.show && (
        <div style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '12px 24px', borderRadius: '16px', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 9999, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ background: toast.type === 'success' ? '#22c55e' : '#ef4444', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {toast.type === 'success' ? <Check size={12} color="white" strokeWidth={4} /> : <X size={12} color="white" strokeWidth={4} />}
          </div>
          {toast.message}
        </div>
      )}
      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => setFullscreenImage(null)}>
          <button onClick={() => setFullscreenImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10001 }}>
            <X size={20} color="#0f172a" />
          </button>
          <img src={fullscreenImage} alt="Profile Fullscreen" style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showCropModal && selectedImageSrc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '90%', maxWidth: '500px', height: '400px', background: '#333', borderRadius: '16px', overflow: 'hidden' }}>
            <Cropper
              image={selectedImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
            <button
              onClick={() => { setShowCropModal(false); setSelectedImageSrc(null); }}
              disabled={cropUploading}
              style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid white', background: 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCropConfirm}
              disabled={cropUploading}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#3863a8', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {cropUploading ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
              {cropUploading ? 'Uploading...' : 'Apply & Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            transform: 'scale(1)',
            animation: 'modalIn 0.3s ease-out'
          }}>
            <div style={{
              width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: '#ef4444'
            }}>
              <LogOut size={32} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Confirm Logout</h2>
            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600', marginBottom: '32px' }}>
              Are you sure you want to logout from NBT Hub?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0',
                  background: 'white', color: '#64748b', fontWeight: '800', cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1, padding: '14px', borderRadius: '16px', border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: '800', cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
                  transition: '0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Log Out
              </button>
            </div>
          </div>
          <style>{`
            @keyframes modalIn {
              from { opacity: 0; transform: scale(0.9) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
