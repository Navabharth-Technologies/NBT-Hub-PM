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
  MessageSquare, Trash2, Clock, MapPin, Info, LifeBuoy
} from 'lucide-react';
import UpdatePasswordModal from './UpdatePasswordModal';

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
  const [tempPhone, setTempPhone] = useState('');
  const [tempDob, setTempDob] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });
  const fileInputRef = useRef(null);

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
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Local preview
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('employee_id', user.employee_id || user.id);

      const res = await fetch(API_ENDPOINTS.PROFILE_UPLOAD_IMAGE, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${user.token}` 
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.url || data.filePath || data.path || data.record?.path;
        if (url) {
          // 3. Persist in DB via PROFILE_UPDATE
          await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({ 
              email: user.email,
              employee_id: user.employee_id,
              id: user.id || user.employee_id,
              profile_pic: url,
              profile_picture: url
            })
          });
          
          // 4. Update Global State
          const updatedUser = { profile_pic: url, profile_picture: url };
          updateUserData(updatedUser);
          setProfileImage(url.startsWith('http') || url.startsWith('data:') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`);
          setToast({ show: true, message: 'profile pic updated successfully ✅', type: 'success' });
          setTimeout(() => setToast({ show: false, message: '' }), 3000);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setToast({ show: true, message: 'Upload failed', type: 'error' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    }
  };

  const updateProfileField = async (field, value) => {
    if (!user?.token || !user?.email) return;
    try {
        const nextPhone = field === 'phone_number' ? value : (phone !== 'Add Phone Number' ? phone : (user.phone_number || ''));
        const nextDob = field === 'date_of_birth' ? value : (dob !== 'Add Date of Birth' ? dob : (user.date_of_birth || ''));

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

        const res = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {
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
              setDob(value); 
              setIsEditingDob(false); 
              updateUserData({ date_of_birth: value });
            }
            setToast({ show: true, message: 'Profile updated successfully ✅', type: 'success' });
            setTimeout(() => setToast({ show: false, message: '' }), 3000);
        }
    } catch (err) { 
        console.error('Update profile error:', err);
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
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB');
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
      backgroundColor: '#f8fafc', 
      paddingTop: winWidth < 768 ? '80px' : '100px',
      paddingBottom: '100px',
      fontFamily: "'Outfit', sans-serif"
    },
    banner: {
      height: winWidth < 768 ? '120px' : '180px',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: winWidth < 768 ? '20px' : '32px',
      fontWeight: '900',
      letterSpacing: '-0.5px',
      textAlign: 'center',
      padding: '0 20px'
    },
    profileCard: {
      maxWidth: '100%',
      margin: winWidth < 768 ? '-40px 0 20px' : '-60px 0 30px',
      width: '100%',
      background: 'white',
      borderRadius: winWidth < 768 ? '24px' : '40px',
      padding: winWidth < 768 ? '25px' : '40px',
      boxShadow: '0 4px 30px rgba(0,0,0,0.03)',
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

      {/* Banner */}
      <div style={dashboardStyles.banner}>
        Smarter Solutions for Better Future
      </div>

      <main style={{ padding: '0 10px' }}>
        
        {/* Profile Header Card */}
        <div style={dashboardStyles.profileCard}>
          <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 1024 ? 'center' : 'flex-start', gap: winWidth < 1024 ? '30px' : '0', textAlign: winWidth < 1024 ? 'center' : 'left' }}>
            <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', gap: '24px', alignItems: 'center' }}>
              <div style={dashboardStyles.avatar}>
                {(user?.profile_pic || user?.profile_picture) ? (
                  <img 
                    src={(user.profile_pic || user.profile_picture).startsWith('http') || (user.profile_pic || user.profile_picture).startsWith('data:') ? (user.profile_pic || user.profile_picture) : `${BASE_URL}${(user.profile_pic || user.profile_picture).startsWith('/') ? '' : '/'}${user.profile_pic || user.profile_picture}`} 
                    alt="Me" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: winWidth < 768 ? '18px' : '24px' }} 
                  />
                ) : user?.name?.[0] || 'U'}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: winWidth < 768 ? '32px' : '36px', height: winWidth < 768 ? '32px' : '36px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: winWidth < 768 ? '12px' : '13px', fontWeight: '800' }}>
                    <Calendar size={16} /> 
                    {isEditingDob ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                                type="date"
                                value={tempDob} 
                                onChange={e => setTempDob(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && updateProfileField('date_of_birth', tempDob)}
                                autoFocus
                                style={{ border: '1.5px solid #3b82f6', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', outline: 'none', background: 'white' }}
                            />
                            <div onClick={() => updateProfileField('date_of_birth', tempDob)} style={{ background: '#22c55e', color: 'white', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><Check size={14} /></div>
                            <div onClick={() => setIsEditingDob(false)} style={{ background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><X size={14} /></div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onClick={() => { setTempDob(formatToISODate(dob)); setIsEditingDob(true); }}>
                            <span>{formatDateDisplay(dob)}</span>
                            <Edit3 size={14} color="#94a3b8" />
                        </div>
                    )}
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

        {/* Basic Stats Row */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px', display: 'grid', gridTemplateColumns: winWidth < 1024 ? (winWidth < 600 ? '1fr' : '1fr 1fr') : 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={dashboardStyles.statBox}>
             <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#f0f9ff', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} /></div>
             <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Team</p>
                <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', color: '#0f172a', fontWeight: '900' }}>Navabharatha Team</p>
             </div>
          </div>
          <div style={dashboardStyles.statBox}>
             <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#f0f9ff', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={20} /></div>
             <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</p>
                <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', color: '#0f172a', fontWeight: '900', wordBreak: 'break-all' }}>{user?.email || 'sahana@navabharathtechnologies.com'}</p>
             </div>
          </div>
          <div style={{ ...dashboardStyles.statBox, gridColumn: winWidth < 1024 && winWidth >= 600 ? 'span 2' : 'auto' }}>
             <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#f0f9ff', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={20} /></div>
             <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Joining</p>
                <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', color: '#0f172a', fontWeight: '900' }}>16 January 2026</p>
             </div>
          </div>
        </div>

        {/* Services Section */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px' }}>
          <h3 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#0f172a', marginBottom: '24px' }}>Services & Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : '1fr 1fr', gap: '24px' }}>
             {[
               { title: 'Manage Leave', sub: 'Request or track off-time', color: '#fee2e2', text: '#b91c1c', icon: <Calendar color="#ef4444" size={20} />, path: '/attendance' },
               { title: 'Attendance Logs', sub: 'Review check-in history', color: '#dcfce7', text: '#15803d', icon: <Clock color="#22c55e" size={20} />, path: '/attendance' },
               { title: 'Security Settings', sub: 'Update security passkey', color: '#dbeafe', text: '#1e40af', icon: <Shield color="#3b82f6" size={20} />, onClick: () => setShowSecurityModal(true) },
               { title: 'Support & Maintenance', sub: 'Raise technical ticket', color: '#ffedd5', text: '#9a3412', icon: <LifeBuoy color="#f97316" size={20} />, path: '/tickets' }
             ].map((svc, i) => (
                <div key={i} onClick={svc.onClick || (() => navigate(svc.path))} style={{ ...dashboardStyles.serviceCard, background: svc.color }}>
                   <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {svc.icon}
                      </div>
                      <div>
                         <p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: svc.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{svc.title}</p>
                         <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>{svc.sub}</p>
                      </div>
                   </div>
                   <ChevronRight size={winWidth < 768 ? 16 : 20} color={svc.text} />
                </div>
             ))}
          </div>
        </div>

        {/* Documents Section */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px' }}>
          <h3 style={{ fontSize: winWidth < 768 ? '18px' : '22px', fontWeight: '950', color: '#0f172a', marginBottom: '24px' }}>HR Documents</h3>
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 1024 ? (winWidth < 600 ? '1fr' : '1fr 1fr') : 'repeat(3, 1fr)', gap: '24px' }}>
             <div 
               style={{ ...dashboardStyles.docCard, cursor: 'pointer' }}
               onClick={() => navigate('/payslips')}
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
                      <p style={{ margin: 0, fontSize: winWidth < 768 ? '14px' : '16px', fontWeight: '900', color: '#0f172a' }}>View Resignation Requests</p>
                   </div>
                </div>
                <ChevronRight size={winWidth < 768 ? 16 : 24} color="#94a3b8" />
             </div>
          </div>
        </div>

        {/* About Section */}
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto 40px', background: 'white', borderRadius: winWidth < 768 ? '24px' : '32px', padding: winWidth < 768 ? '25px' : '40px', border: '1px solid #f1f5f9' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: winWidth < 768 ? '20px' : '40px' }}>
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
           <div style={{ textAlign: isEditingAbout ? 'left' : 'center', padding: isEditingAbout ? '0' : (winWidth < 768 ? '20px 0' : '40px 0') }}>
             {isEditingAbout ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <textarea 
                   value={tempAbout}
                   onChange={e => setTempAbout(e.target.value)}
                   placeholder="Tell us about yourself..."
                   style={{ width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px', border: '1.5px solid #3b82f6', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
                   autoFocus
                 />
                 <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                   <button onClick={() => setIsEditingAbout(false)} style={{ padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                   <button onClick={updateAboutMe} disabled={saving} style={{ padding: '8px 24px', borderRadius: '10px', border: 'none', background: '#1e40af', color: 'white', fontWeight: '700', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                 </div>
               </div>
             ) : (
               <>
                 {aboutMe === 'Write a short introduction about yourself' ? (
                   <>
                     <div style={{ width: '50px', height: '50px', background: '#f8fafc', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Edit3 size={24} color="#cbd5e1" /></div>
                     <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '700' }}>{aboutMe}</p>
                   </>
                 ) : (
                   <p style={{ margin: 0, fontSize: '15px', color: '#475569', fontWeight: '500', lineHeight: '1.6', textAlign: 'left' }}>{aboutMe}</p>
                 )}
               </>
             )}
           </div>
        </div>

        {/* Logout */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '60px' }}>
           <button 
             onClick={handleLogout}
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
        <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: 'white', padding: '12px 24px', borderRadius: '16px', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 9999 }}>
          <div style={{ background: '#22c55e', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={12} color="white" strokeWidth={4} />
          </div>
          {toast.message}
        </div>
      )}
    </div>
  );
}
