import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThreadProvider } from './context/ThreadContext';
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

import AttendanceManagement from './components/profile/AttendanceManagement';
import LeaveManagement from './components/profile/LeaveManagement';
import QuizModule from './components/profile/QuizModule';
import EmployeeAttendanceDetail from './components/profile/EmployeeAttendanceDetail';
import AttendanceReportScreen from './components/profile/AttendanceReportScreen';
import LeaveRequestDetail from './components/profile/LeaveRequestDetail';
import AwardsScreen from './components/profile/AwardsScreen';
import ResignationUserScreen from './components/profile/ResignationUserScreen';
import ServiceCertificateUserScreen from './components/profile/ServiceCertificateUserScreen';
import PayslipScreen from './components/profile/PayslipScreen';
import PersonalInfo from './components/profile/PersonalInfo';
import AssetsManagement from './components/profile/AssetsManagement';
import MyLeaves from './components/profile/MyLeaves';




import LoginScreen from './components/profile/LoginScreen';

function AppRoutes() {
  const { user, loading } = useAuth();

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
      <Route path="/resignations" element={<ResignationUserScreen />} />
      <Route path="/service-certificates" element={<ServiceCertificateUserScreen />} />
      <Route path="/payslips" element={<PayslipScreen />} />
      <Route path="/personal-info" element={<PersonalInfo onBack={() => window.history.back()} />} />
      <Route path="/assets" element={<AssetsManagement />} />
      <Route path="/my-leaves" element={<MyLeaves />} />
      <Route path="/birthdays" element={<BirthdayScreen />} />
      <Route path="/holidays" element={<HolidayScreen />} />

    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThreadProvider>
        <AppRoutes />
        <style>{`
          html, body {
            overflow-x: hidden;
            width: 100%;
            position: relative;
            margin: 0;
            padding: 0;
            touch-action: pan-y;
            overscroll-behavior-x: none;
          }
          * {
            box-sizing: border-box;
          }
        `}</style>
      </ThreadProvider>
    </AuthProvider>
  );
}

export default App;
