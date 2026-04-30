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
      let finalStage = 'L1';
      
      if (r.includes('PM') || r.includes('CEO') || r.includes('ADMIN') || r.includes('MANAGER')) {
        finalStage = 'L3';
      } else if (r.includes('HR')) {
        finalStage = 'L2';
      } else {
        finalStage = 'L1'; // For Team Leads/Lead Software Engineers
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
        alert(`Leave ${targetStatus === 'APPROVED' ? 'Approved!' : 'Rejected.'}`);
        navigate('/attendance');
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
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [res, resEmp] = await Promise.all([
          fetch(API_ENDPOINTS.LEAVES_GET, { headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` } }),
          fetch(API_ENDPOINTS.EMPLOYEES, { headers: { 'Authorization': `Bearer ${user?.token || localStorage.getItem('token')}` } })
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
          const empId = found.user_id || found.emp_id || found.employee_id;
          const masterEmp = Array.isArray(empData) ? empData.find(e => String(e.id || e.EmpID || e.employee_id) === String(empId)) : null;
          const resolvedRole = (masterEmp?.role || masterEmp?.designation || found.user_role || found.designation || found.role || 'Employee').toUpperCase();
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

          setRequest({
            id: found.id || found.ID || id,
            employeeName: found.employee_name || found.full_name || found.name || found.emp_name || found.userName || 'Employee',
            empCode: found.user_id || found.emp_id || found.employee_id || found.id || '----',
            leaveType: found.leave_type || found.type || 'Casual Leave',
            startDate: found.start_date || found.startDate || '----',
            endDate: found.end_date || found.endDate || '----',
            duration: calculateDuration(found.start_date, found.end_date),
            reason: found.reason || found.remarks || 'No reason provided.',
            appliedOn: (found.created_at || found.date) ? new Date(found.created_at || found.date).toLocaleString('en-GB') : 'N/A',
            status: resolveStatus(allStatusFields),
            requesterRole: resolvedRole,
            approvals: {
              l1: { name: dynamicLeadName, status: resolveStatus(pickStatus(found.rm_status, found.l1_status)), stage: 'L1' },
              l2: { name: found.l2_name || 'Sinchana Hs', status: resolveStatus(pickStatus(found.hr_status, found.l2_status)), stage: 'L2' },
              l3: { name: found.l3_name || 'Anish V N', status: resolveStatus(pickStatus(found.pm_status, found.l3_status, found.manager_status)), stage: 'L3' }
            }
          });
        }
      } catch (err) { console.error("Error fetching detail:", err); } 
      finally { setLoading(false); }
    };
    if (id) fetchDetail();
  }, [id, user]);

  if (loading) return <div style={{textAlign: 'center', padding: '100px'}}>Loading...</div>;
  if (!request) return <div style={{textAlign: 'center', padding: '100px'}}>Request Not Found</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif" }}>
      <AppHeader />
      <main style={{ flex: 1, padding: '100px 20px 60px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: '900px', background: 'white', borderRadius: '32px', padding: '48px', boxShadow: '0 4px 30px rgba(0,0,0,0.06)', border: '1.5px solid #f1f5f9' }}>
          
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900' }}>
                {request.employeeName.charAt(0)}
              </div>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', margin: 0 }}>{request.employeeName}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                   ID: {request.empCode} <span style={{ color: '#cbd5e1', margin: '0 8px' }}>|</span> {request.requesterRole}
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
            {/* Left Card: Leave Info */}
            <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
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
            <div style={{ background: '#f8fafc', padding: '30px', borderRadius: '32px', border: '1px solid #f1f5f9' }}>
               <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '24px' }}>Official Verification</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { role: 'Team Leader Approval', ...request.approvals.l1 },
                    { role: 'HR Approval', ...request.approvals.l2 },
                    { role: 'PM Approval', ...request.approvals.l3 }
                  ].filter(step => {
                    const role = (request.requesterRole || '').toUpperCase();
                    const isLeadOrAbove = role.includes('LEAD') || role.includes('MANAGER') || role.includes('CEO') || role.includes('ADMIN') || role.includes('PRINCIPAL') || role.includes('PM') || role.includes('HR');
                    
                    if (step.stage === 'L1' && isLeadOrAbove) return false;
                    return true;
                  }).map((app, i) => {
                    const requesterRole = (request.requesterRole || '').toUpperCase();
                    const isPMOrHR = requesterRole.includes('PM') || requesterRole.includes('HR');
                    
                    let displayRole = app.role;
                    if (isPMOrHR) {
                      if (app.stage === 'L2') displayRole = 'HR Verification';
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
            <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '32px', color: '#334155', fontSize: '16px', fontWeight: '800', lineHeight: '1.6', border: '1px solid #f1f5f9' }}>
               {request.reason}
            </div>
          </div>

          {/* Feedback Section */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Add Feedback / Comment</h3>
            <textarea 
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your feedback here..."
              style={{ width: '100%', minHeight: '120px', padding: '24px', borderRadius: '24px', border: '1.5px solid #f1f5f9', fontSize: '14px', fontWeight: '700', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.8fr', gap: '20px' }}>
            <button 
              onClick={() => handleStatusUpdate('REJECTED')}
              disabled={isUpdating}
              style={{ padding: '18px', borderRadius: '20px', border: 'none', background: '#fee2e2', color: '#ef4444', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <XCircle size={20} /> Reject Request
            </button>
            <button 
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={isUpdating}
              style={{ padding: '18px', borderRadius: '20px', border: 'none', background: '#0f172a', color: 'white', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.15)' }}
            >
              <CheckCircle size={20} /> Approve Leave
            </button>
          </div>

        </div>
      </main>
      <AppFooter />
    </div>
  );
}
