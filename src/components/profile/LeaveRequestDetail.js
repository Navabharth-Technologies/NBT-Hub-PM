import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, User, Briefcase, FileText, CheckCircle2,
  Clock, ShieldCheck, UserCheck, Layers, Info, ArrowRight, XCircle, CheckCircle
} from 'lucide-react';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function LeaveRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [modalState, setModalState] = useState({ show: false, message: '', type: 'APPROVED' });

  const handleModalClose = () => {
    setModalState({ show: false, message: '', type: 'APPROVED' });
    navigate(-1);
  };

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const targetStatus = newStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      let remarks = feedback;

      if (targetStatus === 'REJECTED' && !remarks) {
        remarks = prompt("Reason for rejection (Required):");
        if (!remarks) return alert("Remarks are required for rejection");
      } else if (!remarks) {
        remarks = 'Approved by HR/Manager';
      }

      setIsUpdating(true);
      const userRole = (user?.role || 'PM').toUpperCase();
      const requesterRole = (request?.requesterRole || '').toUpperCase();
      const isLeadRequester = requesterRole.includes('LEAD') || requesterRole.includes('MANAGER') || requesterRole.includes('CEO') || requesterRole.includes('ADMIN');

      const payload = {
        status: targetStatus === 'APPROVED' ? 'Approved' : 'Rejected',
        remarks: remarks,
        role: userRole.includes('HR') ? 'HR' : 'PM',
        userId: user?.id || user?.employee_id || user?.EmpID,
        approve_type: userRole.includes('HR') ? 'HR' : 'PM',
      };

      // Explicit Role-to-Stage Mapping
      const r = userRole.toUpperCase();
      const reqRoleStr = (request?.requesterRole || '').toUpperCase();
      const isHRReqLocal = reqRoleStr === 'HR' || reqRoleStr.includes('HUMAN RESOURCE');

      let finalStage = 'L1';

      if (isHRReqLocal) {
        finalStage = 'L2'; // For HR requests, CEO acts as L2
      } else if (r.includes('PM') || r.includes('CEO') || r.includes('ADMIN') || r.includes('MANAGER')) {
        finalStage = 'L3';
      } else if (r.includes('HR')) {
        finalStage = 'L2';
      } else {
        finalStage = 'L1';
      }

      payload.stage = finalStage;
      if (finalStage === 'L3') payload.pm_status = payload.status;
      else if (finalStage === 'L2') payload.hr_status = payload.status;
      else payload.rm_status = payload.status;

      // Ensure all possible ID fields are present in the payload
      payload.employee_id = user?.employee_id || user?.id;
      payload.userId = user?.id || user?.employee_id;
      payload.EmpID = user?.id || user?.employee_id;

      const response = await fetch(API_ENDPOINTS.UPDATE_LEAVE_STATUS(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // --- Auto Update Leave Ledger Logic ---
        const currentL1 = request?.approvals?.l1?.status === 'APPROVED';
        const currentL2 = request?.approvals?.l2?.status === 'APPROVED';
        const currentL3 = request?.approvals?.l3?.status === 'APPROVED';

        const willBeL1 = finalStage === 'L1' ? (targetStatus === 'APPROVED') : currentL1;
        const willBeL2 = finalStage === 'L2' ? (targetStatus === 'APPROVED') : currentL2;
        const willBeL3 = finalStage === 'L3' ? (targetStatus === 'APPROVED') : currentL3;

        const reqRole = (request?.requesterRole || '').toUpperCase();
        const isHRReq = reqRole === 'HR' || reqRole.includes('HUMAN RESOURCE');
        const isLeadOrAbove = reqRole.includes('LEAD') || reqRole.includes('MANAGER') || reqRole.includes('CEO') || reqRole.includes('ADMIN') || reqRole.includes('PRINCIPAL') || reqRole.includes('PM') || reqRole.includes('HR');

        const requireL1 = !isLeadOrAbove;
        const requireL2 = !isHRReq;
        const requireL3 = !isHRReq; // For HR, only L2 (CEO) is required

        const isFullyApproved = targetStatus === 'APPROVED' && 
          (!requireL1 || willBeL1) && 
          (!requireL2 || willBeL2) && 
          (!requireL3 || willBeL3);

        if (isFullyApproved) {
          try {
            const leaveDate = new Date(request?.startDate);
            const month = isNaN(leaveDate.getTime()) ? 4 : leaveDate.getMonth() + 1;
            const year = isNaN(leaveDate.getTime()) ? 2026 : leaveDate.getFullYear();
            
            const statsRes = await fetch(`${API_ENDPOINTS.ADMIN_LEAVE_STATS}?month=${month}&year=${year}`, {
              headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` }
            });
            
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              const allStats = Array.isArray(statsData) ? statsData : (statsData.stats || statsData.data || []);
              const empStat = allStats.find(s => String(s.employee_id || s.user_id) === String(request?.empCode));
              
              let cl = parseFloat(empStat?.leaves_taken || 0);
              let lop = parseFloat(empStat?.LOP || 0);
              let available = parseFloat(empStat?.leaves_available || 0);
              const duration = parseFloat(request?.duration || 0);

              const leaveTypeUpper = String(request?.leaveType || '').toUpperCase();
              if (leaveTypeUpper.includes('CASUAL')) {
                cl += duration;
                available -= duration;
              } else if (leaveTypeUpper.includes('LOP') || leaveTypeUpper.includes('LOSS')) {
                lop += duration;
              }

              await fetch(API_ENDPOINTS.ADMIN_LEAVE_STATS_UPDATE, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                  employeeId: request?.empCode,
                  leaves_taken: cl,
                  LOP: lop,
                  leaves_available: available,
                  month,
                  year,
                  remarks: 'Auto-updated from fully approved leave request'
                })
              });
            }
          } catch (e) {
            console.error("Auto-update ledger failed", e);
          }
        }
        // --- End Auto Update Logic ---

        setModalState({
          show: true,
          message: `Leave ${targetStatus === 'APPROVED' ? 'Approved!' : 'Rejected.'}`,
          type: targetStatus
        });
      } else {
        const resData = await response.json().catch(() => ({}));
        alert(`Update Failed: ${resData.error || resData.message || 'Server Error'}`);
      }
    } catch (err) {
      console.error("Status Update Error:", err);
      alert("System Connection Failure.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Status precedence: REJECTED > APPROVED > PENDING
  const resolveStatus = (rawStatus) => {
    if (!rawStatus) return 'PENDING';
    const parts = String(rawStatus).toUpperCase().split(',').map(s => s.trim());
    if (parts.some(s => s.includes('REJECT'))) return 'REJECTED';
    if (parts.some(s => s.includes('APPROV'))) return 'APPROVED';
    return 'PENDING';
  };

  const calculateDuration = (start, end) => {
    if (!start || !end || start === '----' || end === '----') return '0';
    try {
      const s = new Date(start);
      const e = new Date(end);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return '0';
      const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return diff;
    } catch { return '0'; }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '----') return '----';
    try {
      // Handle YYYY-MM-DD format directly to avoid timezone issues
      if (typeof dateStr === 'string' && dateStr.includes('-') && dateStr.length === 10) {
        const [y, m, d] = dateStr.split('-');
        if (y && m && d && y.length === 4) return `${d}-${m}-${y}`;
      }

      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch { return dateStr; }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [res, resEmp] = await Promise.all([
          fetch(API_ENDPOINTS.LEAVES_GET, { headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` } }),
          fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` } })
        ]);

        const responseData = await res.json();
        const empData = await resEmp.json().catch(() => []);

        const allLeaves = Array.isArray(responseData) ? responseData : (responseData?.data || responseData?.all || responseData?.leaves || responseData?.requests || []);
        const found = (allLeaves || []).find(l => l && String(l.id || l.ID) === String(id));

        // Helper to pick best status from multiple fields
        const pickStatus = (...fields) => {
          const valid = fields.filter(f => f && String(f).toUpperCase() !== 'PENDING');
          return valid.length > 0 ? valid[0] : (fields[0] || 'PENDING');
        };

        if (found) {
          const cleanId = (val) => String(val || '').replace(/[^0-9]/g, '').trim();
          const targetId = cleanId(found.user_id || found.emp_id || found.employee_id || found.id);
          const masterEmp = Array.isArray(empData) ? empData.find(e => {
            const eid = cleanId(e.id || e.EmpID || e.employee_id || e.userId || e.emp_id);
            if (eid && targetId && eid === targetId) return true;
            
            // Fallback to name matching if IDs don't match exactly
            const eName = String(e.name || e.user_name || '').toLowerCase().trim();
            const fName = String(found.employee_name || found.name || found.full_name || '').toLowerCase().trim();
            return eName && fName && eName === fName;
          }) : null;
          
          // Attempt to fetch fresh profile data for the most accurate photo
          let freshProfile = null;
          try {
            const profileRes = await fetch(`${BASE_URL}/api/employee-profile/${targetId}`, {
              headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` }
            });
            if (profileRes.ok) {
              const pData = await profileRes.json();
              freshProfile = Array.isArray(pData) ? pData[0] : (pData.data || pData);
            }
          } catch (e) {}

          const finalPic = freshProfile?.profile_picture || freshProfile?.profile_pic || freshProfile?.ProfilePic || 
                          masterEmp?.profile_picture || masterEmp?.profile_pic || masterEmp?.ProfilePic || 
                          found.profile_pic || found.profilePic || found.profile_picture;

          const resolvedRole = (freshProfile?.designation || freshProfile?.role || masterEmp?.role || masterEmp?.designation || found.user_role || found.designation || found.role || 'Employee').toUpperCase();
          const isLeadRequester = resolvedRole.includes('LEAD') || resolvedRole.includes('MANAGER') || resolvedRole.includes('CEO') || resolvedRole.includes('ADMIN');

          const empTeam = masterEmp?.team || found.team || '';

          let dynamicLeadName = found.l1_name || found.reportingManagerName || 'Sahana Nv';
          if (empTeam && Array.isArray(empData)) {
            const teamLead = empData.find(e =>
              (e.team === empTeam) &&
              (String(e.role || '').toUpperCase().includes('LEAD') || String(e.role || '').toUpperCase().includes('MANAGER'))
            );
            if (teamLead) {
              dynamicLeadName = teamLead.name || teamLead.full_name || dynamicLeadName;
            }
          }

          // Combine ALL status fields so the main badge reflects any sub-approval
          const allStatusFields = [
            found.status,
            found.rm_status, found.l1_status,
            found.hr_status, found.l2_status,
            found.pm_status, found.l3_status
          ].filter(Boolean).join(',');

          const isHRRequester = resolvedRole === 'HR' || resolvedRole.includes('HUMAN RESOURCE');
          
          // Resolve CEO name dynamically
          const ceoUser = Array.isArray(empData) ? empData.find(e => 
            String(e.role || '').toUpperCase().includes('CEO') || 
            String(e.name || '').toLowerCase().includes('dinesh') ||
            String(e.full_name || '').toLowerCase().includes('dinesh')
          ) : null;
          const ceoName = ceoUser ? (ceoUser.name || ceoUser.full_name) : 'Dinesh';

          // Resolve RM for Project Managers (Dinesh)
          let dynamicPMName = found.l3_name || 'Anish V N';
          const isPMRequester = resolvedRole.includes('PROJECT MANAGER') || resolvedRole === 'PM';
          
          if (isPMRequester || isHRRequester) {
            const rmDinesh = Array.isArray(empData) ? empData.find(e =>
              String(e.name || '').toLowerCase().includes('dinesh') ||
              String(e.full_name || '').toLowerCase().includes('dinesh') ||
              String(e.role || '').toUpperCase().includes('CEO')
            ) : null;
            if (rmDinesh) dynamicPMName = rmDinesh.name || rmDinesh.full_name;
          }

          setRequest({
            id: found.id || found.ID || id,
            employeeName: masterEmp?.name || masterEmp?.full_name || found.employee_name || found.full_name || found.name || found.emp_name || found.userName || 'Employee',
            empCode: found.user_id || found.emp_id || found.employee_id || found.id || '----',
            leaveType: found.leave_type || found.type || 'Casual Leave',
            startDate: found.start_date || found.startDate || '----',
            endDate: found.end_date || found.endDate || '----',
            duration: calculateDuration(found.start_date, found.end_date),
            reason: found.reason || found.remarks || 'No reason provided.',
            appliedOn: (found.created_at || found.date) ? formatDate(found.created_at || found.date) : 'N/A',
            status: resolveStatus(allStatusFields),
            requesterRole: resolvedRole,
            profile_pic: finalPic,
            approvals: {
              l1: { name: dynamicLeadName, status: resolveStatus(pickStatus(found.rm_status, found.l1_status)), stage: 'L1' },
              l2: { name: isHRRequester ? ceoName : (found.l2_name || 'Sinchana Hs'), status: resolveStatus(pickStatus(found.hr_status, found.l2_status)), stage: 'L2' },
              l3: { name: dynamicPMName, status: resolveStatus(pickStatus(found.pm_status, found.l3_status, found.manager_status)), stage: 'L3' }
            }
          });
        }
      } catch (err) { console.error("Error fetching detail:", err); }
      finally { setLoading(false); }
    };
    if (id) fetchDetail();
  }, [id, user]);

  if (loading) return <div style={{ textAlign: 'center', padding: '110px' }}>Loading...</div>;
  if (!request) return <div style={{ textAlign: 'center', padding: '100px' }}>Request Not Found</div>;

  const userRoleStr = (user?.role || 'PM').toUpperCase();
  const rRoleStr = (request?.requesterRole || '').toUpperCase();
  const isHRReq = rRoleStr === 'HR' || rRoleStr.includes('HUMAN RESOURCE');

  let currentUserStage = 'l1';
  if (isHRReq) {
    currentUserStage = 'l2'; // For HR requests, CEO approves at L2 stage
  } else {
    if (userRoleStr.includes('PM') || userRoleStr.includes('PROJECT MANAGER') || userRoleStr.includes('CEO') || userRoleStr.includes('ADMIN') || userRoleStr.includes('MANAGER')) {
      currentUserStage = 'l3';
    } else if (userRoleStr === 'HR' || userRoleStr.includes('HUMAN RESOURCE') || userRoleStr.includes('HR ')) {
      currentUserStage = 'l2';
    }
  }

  const currentUserStatus = request?.approvals?.[currentUserStage]?.status;
  const isCurrentUserApproved = currentUserStatus === 'APPROVED';
  const isCurrentUserRejected = currentUserStatus === 'REJECTED';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      <AppHeader />
      <main style={{ flex: 1, padding: winWidth < 768 ? '100px 15px 250px' : '100px 20px 60px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: '900px', background: 'white', borderRadius: '32px', padding: winWidth < 768 ? '24px' : '48px', boxShadow: '0 4px 30px rgba(0,0,0,0.06)', border: '1.5px solid #f1f5f9' }}>

          <button
            onClick={() => navigate(-1)}
            style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', marginBottom: '24px', width: 'fit-content' }}
          >
            <ArrowLeft size={18} color="#64748b" />
          </button>

          {/* Header Row */}
          <div style={{ display: 'flex', flexDirection: winWidth < 600 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 600 ? 'center' : 'flex-start', marginBottom: '40px', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: winWidth < 480 ? 'column' : 'row', gap: '20px', alignItems: 'center', textAlign: winWidth < 480 ? 'center' : 'left' }}>
              <div style={{ width: winWidth < 768 ? '60px' : '80px', height: winWidth < 768 ? '60px' : '80px', borderRadius: '24px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '950', flexShrink: 0, overflow: 'hidden' }}>
                  {(() => {
                    const cleanId = (val) => String(val || '').replace(/[^0-9]/g, '').trim();
                    const empId = cleanId(request.user_id || request.emp_id || request.employee_id || request.id);
                    const photoUrl = request.profile_pic ? (request.profile_pic.startsWith('http') || request.profile_pic.startsWith('data:') ? request.profile_pic : `${BASE_URL}${request.profile_pic.startsWith('/') ? '' : '/'}${request.profile_pic}`) : `${BASE_URL}/api/users/${empId}/photo`;
                    
                    return (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img 
                          src={photoUrl} 
                          alt={request.employeeName} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px' }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                        <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontSize: '32px', fontWeight: '900', borderRadius: '20px' }}>
                          {request.employeeName ? request.employeeName.charAt(0).toUpperCase() : 'A'}
                        </div>
                      </div>
                    );
                  })()}
              </div>
              <div>
                <h1 style={{ fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '950', color: '#0f172a', margin: 0 }}>{request.employeeName}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                  ID: {request.empCode} <span style={{ color: '#cbd5e1', margin: '0 8px' }}>|</span> {request.requesterRole}
                </p>
              </div>
            </div>
            <div style={{ textAlign: winWidth < 600 ? 'center' : 'right' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '10px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Request Status</p>
              <div style={{
                background: request.status === 'APPROVED' ? '#f0fdf4' : request.status === 'REJECTED' ? '#fef2f2' : '#fffbeb',
                color: request.status === 'APPROVED' ? '#16a34a' : request.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                border: `1px solid ${request.status === 'APPROVED' ? '#bbf7d0' : request.status === 'REJECTED' ? '#fecaca' : '#fef3c7'}`,
                padding: '10px 24px', borderRadius: '14px', fontSize: '12px', fontWeight: '900'
              }}>
                {request.status}
              </div>
            </div>
          </div>

          {/* Details & Verification Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 850 ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            {/* Left Card: Leave Info */}
            <div style={{ background: '#f8fafc', padding: winWidth < 768 ? '20px' : '30px', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '24px' }}>Leave Details</h3>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>{request.leaveType}</p>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Category</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>{request.appliedOn}</p>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Applied On</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>{request.duration}</p>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Total Days</p>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Leave Duration</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>
                  <Calendar size={16} color="#3b82f6" /> {formatDate(request.startDate)} to {formatDate(request.endDate)}
                </div>
              </div>
            </div>

            {/* Right Card: Approval Flow */}
            <div style={{ background: '#f8fafc', padding: winWidth < 768 ? '20px' : '30px', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '24px' }}>Official Verification</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { role: 'Team Leader Approval', ...request.approvals.l1, stage: 'L1' },
                  { role: 'HR Approval', ...request.approvals.l2, stage: 'L2' },
                  { role: 'PM Approval', ...request.approvals.l3, stage: 'L3' }
                ].filter(step => {
                  if (isHRReq) {
                    return step.stage === 'L2'; // Only CEO Approval (at L2) for HR requests
                  }

                  const role = (request.requesterRole || '').toUpperCase();
                  const isLeadOrAbove = role.includes('LEAD') || role.includes('MANAGER') || role.includes('CEO') || role.includes('ADMIN') || role.includes('PRINCIPAL') || role.includes('PM') || role.includes('HR');

                  if (step.stage === 'L1' && isLeadOrAbove) return false;
                  return true;
                }).map((app, i) => {
                  let displayRole = app.role;
                  if (isHRReq) {
                    displayRole = 'CEO Approval';
                  } else if (rRoleStr.includes('PROJECT MANAGER') || rRoleStr === 'PM') {
                    if (app.stage === 'L2') displayRole = 'HR Verification';
                    if (app.stage === 'L3') displayRole = 'RM Approval';
                  } else if (rRoleStr.includes('HR')) {
                    if (app.stage === 'L2') displayRole = 'HR Verification';
                    if (app.stage === 'L3') displayRole = 'CEO Verification';
                  } else if (rRoleStr.includes('LEAD')) {
                    if (app.stage === 'L3') displayRole = 'PM Approval';
                  } else if (rRoleStr.includes('MANAGER')) {
                    if (app.stage === 'L3') displayRole = 'CEO Verification';
                  }

                  const appStatus = resolveStatus(app.status);
                  const appColor = appStatus === 'APPROVED' ? '#16a34a' : appStatus === 'REJECTED' ? '#ef4444' : '#f59e0b';
                  const appBg = appStatus === 'APPROVED' ? '#f0fdf4' : appStatus === 'REJECTED' ? '#fef2f2' : '#fffbeb';
                  const appBorder = appStatus === 'APPROVED' ? '#bbf7d0' : appStatus === 'REJECTED' ? '#fecaca' : '#fef3c7';
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>{displayRole}</p>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>By: {app.name}</p>
                      </div>
                      <div style={{ padding: '6px 16px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', background: appBg, color: appColor, border: `1px solid ${appBorder}` }}>
                        {appStatus}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reason Section */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Reason for Leave</h3>
            <div style={{ background: '#f8fafc', padding: winWidth < 768 ? '24px' : '40px', borderRadius: '32px', color: '#334155', fontSize: '16px', fontWeight: '800', lineHeight: '1.6', border: '1px solid #f1f5f9' }}>
              {request.reason}
            </div>
          </div>

          {/* Feedback Section */}
          {!isHRReq && (
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Add Feedback / Comment</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter your feedback here..."
                style={{ width: '100%', minHeight: '120px', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9', fontSize: '14px', fontWeight: '700', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
              />
            </div>
          )}

          {/* Action Buttons */}
          {(String(user?.employee_id || user?.id || user?.EmpID || '').trim() !== String(request.empCode || '').trim()) && (() => {
            const reqRole = (request?.requesterRole || '').toUpperCase();
            const isHRReqLocal = reqRole === 'HR' || reqRole.includes('HUMAN RESOURCE');
            const currentUserRole = (user?.role || '').toUpperCase();
            const isCEO = currentUserRole.includes('CEO') || currentUserRole.includes('ADMIN') || String(user?.name || user?.full_name || '').toUpperCase().includes('DINESH');
            
            if (isHRReqLocal && !isCEO) return null;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr' : '1.2fr 2.8fr', gap: '20px', marginBottom: winWidth < 768 ? '40px' : '0' }}>
                <button
                  onClick={() => handleStatusUpdate('REJECTED')}
                  disabled={isUpdating || isCurrentUserRejected}
                  style={{ padding: '18px', borderRadius: '20px', border: 'none', background: isCurrentUserRejected ? '#f1f5f9' : '#fee2e2', color: isCurrentUserRejected ? '#94a3b8' : '#ef4444', fontSize: '16px', fontWeight: '900', cursor: isCurrentUserRejected ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  <XCircle size={20} /> {isCurrentUserRejected ? 'Rejected' : 'Reject'}
                </button>
                <button
                  onClick={() => handleStatusUpdate('APPROVED')}
                  disabled={isUpdating || isCurrentUserApproved}
                  style={{ padding: '18px', borderRadius: '20px', border: 'none', background: isCurrentUserApproved ? '#f1f5f9' : '#0f172a', color: isCurrentUserApproved ? '#94a3b8' : 'white', fontSize: '16px', fontWeight: '900', cursor: isCurrentUserApproved ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: isCurrentUserApproved ? 'none' : '0 10px 20px rgba(15, 23, 42, 0.15)' }}
                >
                  <CheckCircle size={20} /> {isCurrentUserApproved ? 'Approved' : 'Approve Leave'}
                </button>
              </div>
            );
          })()}

        </div>
      </main>
      <AppFooter />

      {/* Custom Alert/Confirm Modal */}
      {modalState.show && (
        <>
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalSlideUp {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            animation: 'modalFadeIn 0.2s ease-out'
          }}>
            <div style={{
              background: 'white',
              width: '90%',
              maxWidth: '380px',
              borderRadius: '32px',
              padding: '32px',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
              border: '1.5px solid #f1f5f9',
              textAlign: 'center',
              animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Outfit', sans-serif"
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '22px',
                background: modalState.type === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: `1.5px solid ${modalState.type === 'APPROVED' ? '#bbf7d0' : '#fecaca'}`
              }}>
                {modalState.type === 'APPROVED' ? (
                  <CheckCircle2 size={32} color="#16a34a" />
                ) : (
                  <XCircle size={32} color="#ef4444" />
                )}
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '950',
                color: '#0f172a',
                margin: '0 0 8px 0'
              }}>
                {modalState.message}
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '0 0 24px 0',
                lineHeight: '1.5',
                fontWeight: '700'
              }}>
                {modalState.type === 'APPROVED' 
                  ? 'The leave request has been approved successfully.' 
                  : 'The leave request has been rejected successfully.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={handleModalClose}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: '16px',
                    border: 'none',
                    background: modalState.type === 'APPROVED' ? '#16a34a' : '#ef4444',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    boxShadow: `0 8px 20px ${modalState.type === 'APPROVED' ? 'rgba(22, 163, 74, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  OK
                </button>
                <button
                  onClick={handleModalClose}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: '14px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
