import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThreadProvider } from './context/ThreadContext';
import { WifiOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BASE_URL } from './config';
import PMDashboard from './components/profile/PMDashboard';
import TeamManagement from './components/profile/TeamManagement';
import TeamDetail from './components/profile/TeamDetail';
import TaskManagement from './components/profile/TaskManagement';
import PerformanceModule from './components/profile/PerformanceModule';
import CourseModule from './components/profile/CourseModule';
import SuggestionModule from './components/profile/SuggestionModule';
import EngagementModule from './components/profile/EngagementModule';
import EmployeeModule from './components/profile/EmployeeModule';
import NewJoineeModule from './components/profile/NewJoineeModule';
import JoineeCourseModules from './components/profile/JoineeCourseModules';

import AlertScreen from './components/profile/AlertScreen';
import BirthdayScreen from './components/profile/BirthdayScreen';
import HolidayScreen from './components/profile/HolidayScreen';
import TicketManagement from './components/profile/TicketManagement';
import ReportScreen from './components/profile/ReportScreen';
import RaiseTicket from './components/profile/RaiseTicket';

import AttendanceManagement from './components/profile/AttendanceManagement';
import LeaveManagement from './components/profile/LeaveManagement';
import QuizModule from './components/profile/QuizModule';
import EmployeeAttendanceDetail from './components/profile/EmployeeAttendanceDetail';
import AttendanceReportScreen from './components/profile/AttendanceReportScreen';
import LeaveRequestDetail from './components/profile/LeaveRequestDetail';
import AwardsScreen from './components/profile/AwardsScreen';
import ResignationUserScreen from './components/profile/ResignationUserScreen';
import ExperienceLetterUser from './components/profile/ExperienceLetterUser';
import ExperienceLetterManagement from './components/profile/ExperienceLetterManagement';
import PayslipScreen from './components/profile/PayslipScreen';
import SalaryStatements from './components/profile/SalaryStatements';
import PersonalInfo from './components/profile/PersonalInfo';
import AssetsManagement from './components/profile/AssetsManagement';
import MyLeaves from './components/profile/MyLeaves';
import ExitFormalities from './components/profile/ExitFormalities';




import LoginScreen from './components/profile/LoginScreen';

// 🔄 Service Certificate Revocation → Re-activation Check
// If HR deletes a service cert from DB, the resigned employee is re-activated automatically.
function useCertRevocationReactivation(user, setUser) {
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;
    const cleanToken = token.replace(/['"+]+/g, '').trim();

    // Only run for users that appear resigned/deactivated
    const status = String(user?.status || '').toLowerCase().trim();
    const empStatus = String(user?.employment_status || user?.employmentStatus || '').toLowerCase().trim();
    const isInactive =
      ['relieved', 'resigned', 'inactive', 'terminated', 'former'].includes(status) ||
      ['relieved', 'resigned', 'inactive', 'terminated', 'former'].includes(empStatus) ||
      Number(user?.is_active) === 0 ||
      user?.is_active === false;

    if (!isInactive) return;

    (async () => {
      try {
        const certRes = await fetch(`${BASE_URL}/api/service-certificates/my`, {
          headers: { Authorization: `Bearer ${cleanToken}` }
        });
        if (!certRes.ok) return;
        const certData = await certRes.json();
        const certs = Array.isArray(certData) ? certData : (certData.data || certData.requests || []);

        // If NO service certificate record exists (was deleted from DB) → re-activate
        if (certs.length === 0) {
          if (setUser) {
            setUser(prev => ({
              ...prev,
              status: 'active',
              employment_status: 'active',
              is_active: 1,
              isActive: true
            }));
          }
        }
      } catch (e) {
        // Network error — fail gracefully, never lock user out
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.employee_id]);
}

function AppRoutes() {
  const { user, loading, setUser } = useAuth();
  useCertRevocationReactivation(user, setUser);

  if (loading) return null; // Wait for localStorage to be read

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginScreen />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<PMDashboard />} />
      <Route path="/teams" element={<TeamManagement />} />
      <Route path="/teams/:id" element={<TeamDetail />} />
      <Route path="/tasks" element={<TaskManagement />} />
      <Route path="/tickets" element={<TicketManagement />} />
      <Route path="/raise-ticket" element={<RaiseTicket />} />
      <Route path="/performance" element={<PerformanceModule />} />
      <Route path="/profile" element={<Navigate to="/performance" />} />
      <Route path="/courses" element={<CourseModule />} />
      <Route path="/suggestions" element={<SuggestionModule />} />
      <Route path="/engagement" element={<EngagementModule />} />
      <Route path="/employees" element={<EmployeeModule />} />
      <Route path="/new-joinees" element={<NewJoineeModule />} />
      <Route path="/new-joinees/:id/courses" element={<JoineeCourseModules />} />
      <Route path="/alerts" element={<AlertScreen />} />
      <Route path="/reports" element={<ReportScreen />} />

      <Route path="/attendance" element={<AttendanceManagement />} />
      <Route path="/leaves" element={<LeaveManagement />} />
      <Route path="/attendance/detail/:id" element={<EmployeeAttendanceDetail />} />
      <Route path="/attendance/leave/:id" element={<LeaveRequestDetail />} />
      <Route path="/attendance/report" element={<AttendanceReportScreen />} />
      <Route path="/quiz" element={<QuizModule />} />
      <Route path="/awards" element={<AwardsScreen />} />
      <Route path="/resignations" element={<ResignationUserScreen defaultTab="submit" />} />
      <Route path="/resignation-history" element={<ResignationUserScreen defaultTab="history" />} />
      <Route path="/service-certificates" element={<ExperienceLetterUser />} />
      <Route path="/admin/certificates" element={<ExperienceLetterManagement />} />
      <Route path="/payslips" element={<PayslipScreen />} />
      <Route path="/salary-statements" element={<SalaryStatements />} />
      <Route path="/personal-info" element={<PersonalInfo onBack={() => window.history.back()} />} />
      <Route path="/assets" element={<AssetsManagement />} />
      <Route path="/my-leaves" element={<MyLeaves />} />
      <Route path="/birthdays" element={<BirthdayScreen />} />
      <Route path="/holidays" element={<HolidayScreen />} />
      <Route path="/exit-formalities/:id" element={<ExitFormalities />} />

    </Routes>
  );
}

function NetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 App is ONLINE");
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log("❌ App is OFFLINE");
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Polling fallback - every 1 second with verification
    const interval = setInterval(() => {
      const currentStatus = navigator.onLine;
      if (currentStatus !== isOnline) {
        // Double check to prevent flickering
        setTimeout(() => {
          if (navigator.onLine === currentStatus) {
            setIsOnline(currentStatus);
          }
        }, 500);
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return (
    <>
      {!isOnline && (
        <div
          style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: '#ef4444', color: 'white', padding: '12px 24px',
            borderRadius: '16px', zIndex: 2147483647,
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
            border: '2px solid rgba(255,255,255,0.2)',
            animation: 'slideDown 0.4s ease-out, pulse 2s infinite',
            fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px'
          }}
        >
          <WifiOff size={20} />
          NETWORK DISCONNECTED • PLEASE RECONNECT
          <style>{`
            @keyframes slideDown {
              from { transform: translate(-50%, -100px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
            @keyframes pulse {
              0% { transform: translate(-50%, 0) scale(1); }
              50% { transform: translate(-50%, 0) scale(1.02); }
              100% { transform: translate(-50%, 0) scale(1); }
            }
          `}</style>
        </div>
      )}
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          zIndex: 2147483646, cursor: 'not-allowed'
        }} />
      )}
    </>
  );
}

function App() {
  return (
    <>
      <NetworkStatus />
      <AuthProvider>
        <ThreadProvider>
          <AppRoutes />
          <style>{`
            html {
              overflow-y: auto;
              overflow-x: hidden;
            }
            body {
              overflow-y: visible;
              overflow-x: hidden;
              width: 100%;
              position: static;
              margin: 0;
              padding: 0;
              touch-action: pan-y;
              overscroll-behavior-x: none;
            }
            * {
              box-sizing: border-box;
            }
            input[type="date"]::-webkit-calendar-picker-indicator {
              cursor: pointer;
            }
          `}</style>
        </ThreadProvider>
      </AuthProvider>
    </>
  );
}

export default App;
