import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import { filterActiveEmployees } from '../../utils/employeeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Trash2, Edit, Save, Plus, Search, Filter, ArrowLeft,
  ChevronRight, Download, FileText, CheckCircle, XCircle,
  Clock, Calendar, User, Info, MoreVertical
} from 'lucide-react';
import './PMDashboard.css';

export default function TaskManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatTaskDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [reviewTask, setReviewTask] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [debugInfo, setDebugInfo] = useState('');
  const [users, setUsers] = useState([]);

  // Fetch Tasks and Users
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.token) return;
      try {
        setLoading(true);

        // Multi-Source Task Fetch + User Lookup Table
        const [rawAssigned, rawManager, rawUsers] = await Promise.all([
          fetch(API_ENDPOINTS.ASSIGNED_TASKS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : []),
          fetch(API_ENDPOINTS.MASTER_TASKS_GET, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : []),
          fetch(API_ENDPOINTS.USERS, { headers: { 'Authorization': `Bearer ${user.token}` } }).then(r => r.ok ? r.json() : [])
        ]);

        const parsedUsers = Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data || []);
        const activeUsers = filterActiveEmployees(parsedUsers);
        setUsers(activeUsers);
        const combinedTasks = [...(Array.isArray(rawAssigned) ? rawAssigned : []), ...(Array.isArray(rawManager) ? rawManager : [])];

        // 1. DEDUPLICATE BY DB ID: Strictly trust the primary 'id' column
        const uniqueTasksMap = new Map();
        combinedTasks.forEach((item, idx) => {
          const tid = item.id || `t-${idx}`; // Locked to DB primary key 'id'
          if (!uniqueTasksMap.has(tid)) {
            uniqueTasksMap.set(tid, item);
          } else {
            // Keep the most informative record by smart merging
            const existing = uniqueTasksMap.get(tid);
            const merged = { ...existing };
            for (const key in item) {
              // If the new item has a valid value and existing is missing it or is just 'Pending', override it
              if (item[key] !== null && item[key] !== undefined && item[key] !== '') {
                // Always take the most explicit status over 'Pending'
                if (merged[key] === 'Pending' || !merged[key]) {
                  merged[key] = item[key];
                } else if (key !== 'verify_status' && key !== 'verify' && key !== 'status') {
                  merged[key] = item[key]; // Overwrite other non-empty fields
                }
              }
            }
            uniqueTasksMap.set(tid, merged);
          }
        });

        // 2. OPTIMIZED RESOLUTION: Pre-index users for O(1) lightning-fast lookup
        const userLookup = {};
        const activeUserNames = new Set(activeUsers.map(u => String(u.name || '').toLowerCase().trim()));
        activeUsers.forEach(u => {
          const uid = String(u.id || u.empId || '').trim();
          if (uid) userLookup[uid] = u.name;
        });

        // 3. MAP & RESOLVE NAMES
        const finalData = Array.from(uniqueTasksMap.values()).map((task, idx) => {
          const normalizeStatus = (val) => {
            const s = String(val || 'Pending').trim().toLowerCase();
            if (['completed', '3', 'finish', 'done'].includes(s)) return 'Completed';
            if (['in progress', '2', 'active', 'true'].includes(s)) return 'In Progress';
            return 'Pending';
          };

          const normalizeVerify = (val) => {
            const s = String(val || 'Pending').trim().toLowerCase();
            if (s.includes('approve') || s === 'verified' || s === '1') return 'Approve';
            if (s.includes('reject') || s === 'rejected' || s === '2') return 'Reject';
            return 'Pending';
          };

          const getBestVerify = (t) => {
            const priorities = [t.verify, t.verify_status, t.verify_code, t.tag];
            for (const val of priorities) {
              const normalized = normalizeVerify(val);
              if (normalized !== 'Pending') return normalized;
            }
            return 'Pending';
          };

          const cleanField = (val) => {
            if (!val) return '';
            const s = String(val).trim();
            if (s.includes(',')) {
              const parts = s.split(',').map(p => p.trim());
              return parts[0] === parts[1] ? parts[0] : s;
            }
            return s;
          };

          // INSTANT NAME RESOLUTION: Use the optimized lookup map
          const targetUserId = String(task.assignee_id || '').trim();
          const resolvedName = userLookup[targetUserId] || task.assignee_name || task.member_name || 'Unassigned';

          const rawReview = cleanField(task.task_review || task.review || '');
          const hasRealReview = rawReview.length > 3 &&
            rawReview.toLowerCase() !== 'null' &&
            rawReview.toLowerCase() !== 'undefined' &&
            rawReview.toLowerCase() !== 'pending' &&
            rawReview.toLowerCase() !== 'none' &&
            rawReview.toLowerCase() !== 'done';

          return {
            ...task,
            id: cleanField(task.id || `t-${idx}`), // Strict display ID lock (e.g. 1, 2)
            display_title: cleanField(task.title || task.task_name || 'Untitled'),
            description: cleanField(task.description || ''),
            type: cleanField(task.type || 'General'),
            status: normalizeStatus(task.status || task.sprint_status),
            progress_percentage: parseInt(task.progress || task.progress_percentage || 0),
            assignee_name: cleanField(resolvedName),
            verify_status: getBestVerify(task),
            has_review: hasRealReview,
            task_review: hasRealReview ? rawReview : '',
            attachment_name: String(task.attachment_name || '').trim(),
            attachment_data: task.attachment_data || ''
          };
        }).filter(t => {
          // Ensure task assignee is an active user (either by matched name or lookup)
          const assignName = String(t.assignee_name || '').toLowerCase().trim();
          return t.display_title !== 'Untitled' && t.display_title.length > 0 && activeUserNames.has(assignName);
        });

        setTasks(finalData);
        setDebugInfo('');
      } catch (err) {
        console.error('Task fetch catastrophic error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user]);

  const filteredTasks = tasks.filter(task => {
    const query = searchTerm.toLowerCase().trim();
    const statusVal = (task.sprint_status || task.status || '').toLowerCase();
    const matchesStatus = statusFilter === 'All Status' || statusVal === statusFilter.toLowerCase();

    if (!query) return matchesStatus;

    const taskIdString = String(task.task_id || task.id || '').toLowerCase();
    const taskNameString = String(task.display_title || '').toLowerCase();
    const assigneeNameString = String(task.assignee_name || '').toLowerCase();

    const matchesSearch = taskIdString.startsWith(query) ||
      taskNameString.startsWith(query) ||
      assigneeNameString.startsWith(query);

    return matchesSearch && matchesStatus;
  });

  const handleDownload = (data, name) => {
    if (!data) return;
    try {
      // Clean up filename (remove comma duplicates if any)
      let fileName = String(name || 'task_asset').split(',')[0].trim();
      if (!fileName.includes('.')) fileName += '.pdf'; // Default extension if missing

      // Extract raw base64 if it has a prefix
      const base64Content = String(data).includes('base64,') ? data.split('base64,')[1] : data;

      const byteCharacters = atob(base64Content.replace(/\s/g, ''));
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not download file. The data might be corrupted.');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return { bg: '#f0fdf4', text: '#166534', border: '#bcf0da' };
      case 'in progress': return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
      case 'pending': return { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
    }
  };

  const handleVerifyChange = async (taskId, newStatus) => {
    if (!navigator.onLine) {
      setError('Submission Failed: Network disconnected ❌');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const targetId = String(taskId);

      // 1. Force immediate UI re-render
      setTasks(prevTasks => prevTasks.map(task => {
        const currentId = String(task.task_id || task.id);
        if (currentId === targetId) {
          return { ...task, verify_status: newStatus };
        }
        return task;
      }));

      const currentTask = tasks.find(t => String(t.task_id || t.id) === targetId) || {};

      // 2. STICKY SYNC: Targeting 'master_tasks' via working Review path
      const statusCode = newStatus === 'Approve' ? 1 : newStatus === 'Reject' ? 2 : 0;
      const payload = {
        id: taskId,
        task_id: taskId,
        verify: newStatus,             // Target column: verify
        verify_status: newStatus,
        verify_code: statusCode,
        tag: newStatus,
        status: currentTask.status,    // Required to prevent backend from nullifying
        task_review: currentTask.task_review || '',
        review: currentTask.task_review || '',
        date: new Date().toISOString()
      };

      // Path A: Working Review Endpoint (Confirmed success on this server)
      const response = await fetch(`${API_ENDPOINTS.ASSIGN_TASK_REVIEW}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify(payload)
      });

      // Path B: Targeted Task Update
      await fetch(`${API_ENDPOINTS.TASK_UPDATES}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify(payload)
      });

      // KEY: Using the confirmed working POST fallback from the Reviews section
      if (!response.ok && (response.status === 405 || response.status === 404)) {
        await fetch(API_ENDPOINTS.ASSIGN_TASK_REVIEW, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
          body: JSON.stringify(payload)
        });
      }

      console.log(`DEBUG: Master Verify Store [${newStatus}] ✅`);

    } catch (err) {
      console.error('Master Save Error (Verify):', err);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    if (!navigator.onLine) {
      setError('Submission Failed: Network disconnected ❌');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const targetId = String(taskId);

      // 1. UI Feedback
      setTasks(prevTasks => prevTasks.map(task => {
        const currentId = String(task.task_id || task.id);
        if (currentId === targetId) {
          return { ...task, status: newStatus };
        }
        return task;
      }));

      // 2. SYNC: Same robust path
      const statusCode = newStatus === 'Completed' ? 'COMPLETED' :
        newStatus === 'In Progress' ? 'IN PROGRESS' : 'PENDING';
      const payload = {
        id: taskId,
        task_id: taskId,
        status: statusCode,
        sprint_status: statusCode,
        verify: statusCode === 'COMPLETED' ? 'Approve' : 'Pending'
      };

      await fetch(`${API_ENDPOINTS.TASK_UPDATES}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify(payload)
      });

      console.log(`DEBUG: Task Status Sync [${newStatus}] ✅`);

    } catch (err) {
      console.error('Master Save Error (Status):', err);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      const today = new Date().toLocaleString();

      const formatTaskDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      // 1. Header & Branding
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Indigo-900
      doc.text('TASK MANAGEMENT HUB', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text('OFFICIAL TASK REPORT', 14, 28);
      doc.text(`Generated on: ${today}`, 14, 34);

      // 2. Prepare Data
      const tableColumn = ["ID", "Work Description", "Assignee", "Progress", "Status", "Verification", "Date"];
      const tableRows = filteredTasks.map(task => [
        task.id || 'N/A',
        task.display_title,
        task.assignee_name,
        `${task.progress_percentage}%`,
        task.status || 'Pending',
        task.verify_status || 'Pending',
        formatTaskDate(task.deadline || task.updated_at)
      ]);

      // 3. Generate Table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: {
          fillColor: [56, 99, 168], // Indigo-ish (Titan Primary)
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 40 },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' },
          6: { cellWidth: 30, halign: 'center' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Light Slate
        }
      });

      // 4. Save
      doc.save(`Task_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      console.log('DEBUG: PDF Report Generated Successfully! 📄');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Please check console for details.');
    }
  };

  const handleExportModalPDF = (empTasks, empName, stats) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`${empName} - Task Performance Report`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Total Tasks: ${stats.total} | Completed: ${stats.completed} | In Progress: ${stats.inProgress} | Pending: ${stats.pending} | Avg Progress: ${stats.avgProgress}%`, 14, 32);

    const tableColumn = ["ID", "Title", "Type", "Status", "Progress", "Verify Status", "Deadline"];
    const tableRows = [];

    empTasks.forEach(task => {
      const taskData = [
        task.id || '-',
        task.display_title || task.task_name || 'N/A',
        task.type || 'TASK',
        task.status || 'Pending',
        `${task.progress_percentage || 0}%`,
        task.verify_status || 'Pending',
        task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'
      ];
      tableRows.push(taskData);
    });

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [56, 99, 168] }
    });

    doc.save(`${empName.replace(/\s+/g, '_')}_Task_Report.pdf`);
    setShowExportMenu(false);
  };

  const handleExportModalExcel = (empTasks, empName) => {
    const exportData = empTasks.map(task => ({
      ID: task.id || '-',
      Title: task.display_title || task.task_name || 'N/A',
      Type: task.type || 'TASK',
      Status: task.status || 'Pending',
      Progress: `${task.progress_percentage || 0}%`,
      'Verify Status': task.verify_status || 'Pending',
      Deadline: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    XLSX.writeFile(workbook, `${empName.replace(/\s+/g, '_')}_Task_Report.xlsx`);
    setShowExportMenu(false);
  };

  const getVerifyStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'approve': return { bg: '#ecfdf5', text: '#059669', border: '#10b981' };
      case 'reject': return { bg: '#fef2f2', text: '#dc2626', border: '#ef4444' };
      case 'pending': return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#cbd5e1' };
    }
  };

  return (
    <div className="pm-dashboard-container" style={{ minHeight: '100vh', backgroundColor: '#eaeff2', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />

      <main style={{ flex: 1, padding: winWidth < 768 ? '100px 16px 40px' : '125px 26px 40px', width: '100%', boxSizing: 'border-box', margin: '0', maxWidth: '100%', marginTop: 0 }}>
        <header style={{ marginBottom: winWidth < 768 ? '24px' : '40px', display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: winWidth < 768 ? 'flex-start' : 'flex-end', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '24px' : '32px', fontWeight: '900', color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-1px' }}>Task Management Hub</h1>
              <p style={{ color: '#64748b', margin: 0, fontSize: '15px', fontWeight: '500' }}>
                Review and verify work progress across all {tasks.length} assigned tasks
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', width: winWidth < 768 ? '100%' : 'auto' }}>
            <button
              className="btn-primary"
              onClick={handleExportPDF}
              style={{ background: 'white', color: '#3863a8', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', width: winWidth < 768 ? '100%' : 'auto' }}
            >
              Export Report
            </button>
          </div>
        </header>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: winWidth < 768 ? 'column' : 'row', gap: '16px', marginBottom: '32px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '15px', border: '2.5px solid #eef2f6', background: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '14px 20px', borderRadius: '15px', border: '2.5px solid #eef2f6', background: 'white', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>

        <section style={{
          background: winWidth < 768 ? 'transparent' : 'white',
          borderRadius: '24px',
          border: winWidth < 768 ? 'none' : '1.5px solid #f1f5f9',
          boxShadow: winWidth < 768 ? 'none' : '0 10px 25px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}>
          {winWidth < 768 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '20px' }}>Loading tasks...</div>
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task, index) => (
                  <div key={task.id || index} style={{ background: 'white', borderRadius: '20px', padding: '20px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#3863a8', backgroundColor: '#f0f4ff', padding: '4px 8px', borderRadius: '6px' }}>#{task.id}</span>
                      </div>
                      <span style={{
                        fontSize: '9px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase',
                        backgroundColor: getStatusColor(task.sprint_status || task.status).bg, color: getStatusColor(task.sprint_status || task.status).text, border: `1px solid ${getStatusColor(task.sprint_status || task.status).border}`
                      }}>
                        {task.sprint_status || task.status || 'Pending'}
                      </span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '16px', marginBottom: '4px' }}>{task.display_title || 'Untitled'}</div>
                      {task.description && <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', opacity: 0.8 }}>{task.description}</div>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '900' }}>
                        {(task.assignee_name || 'U').toString().charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>{task.assignee_name || 'N/A'}</span>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Assignee</span>
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Progress</span>
                        <span style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b' }}>{task.progress_percentage || 0}%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${task.progress_percentage || 0}%`, height: '100%', background: 'linear-gradient(90deg, #3863a8, #60a5fa)', borderRadius: '4px' }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid #f8fafc', paddingTop: '15px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                        📅 {formatTaskDate(task.deadline || task.updated_at)}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {task.has_review ? (
                          <button
                            onClick={() => { setReviewTask(task); setReviewText(task.task_review); }}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#3863a8', fontWeight: '800', fontSize: '11px' }}
                          >
                            Review 📝
                          </button>
                        ) : (
                          <button
                            onClick={() => { setReviewTask(task); setReviewText(''); }}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #3863a8', background: 'white', color: '#3863a8', fontWeight: '800', fontSize: '11px' }}
                          >
                            Review
                          </button>
                        )}
                        <select
                          value={task.verify_status || 'Pending'}
                          onChange={(e) => handleVerifyChange(task.task_id || task.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${getVerifyStyles(task.verify_status).border}`,
                            background: getVerifyStyles(task.verify_status).bg,
                            color: getVerifyStyles(task.verify_status).text,
                            fontSize: '11px',
                            fontWeight: '800',
                            outline: 'none'
                          }}
                        >
                          <option value="Pending">Pend</option>
                          <option value="Reject">Rej</option>
                          <option value="Approve">App</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px' }}>No Tasks Found</div>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' }}>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '5%' }}>ID</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '31%' }}>Task Information</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Assignee</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Progress</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Date</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Review</th>
                    <th style={{ padding: '16px 12px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Verify</th>
                  </tr>
                </thead>
                <tbody className="animate-fade-in">
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Loading tasks...</td></tr>
                  ) : filteredTasks.length > 0 ? (
                    filteredTasks.map((task, index) => (
                      <tr key={task.id || index} style={{ borderBottom: '1.5px solid #f8fafc', transition: 'all 0.2s ease' }}>
                        <td style={{ padding: '16px 12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#3863a8', backgroundColor: '#f0f4ff', padding: '4px 8px', borderRadius: '6px' }}>
                            {String(task.id || 'N/A')}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '14px', marginBottom: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.display_title || 'Untitled'}</div>
                          {task.description && (
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => setSelectedAssignee(task.assignee_name)}
                            title={`Click to view all tasks for ${task.assignee_name}`}
                          >
                            <div style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px', flexShrink: 0, borderRadius: '8px', background: '#3863a8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900' }}>
                              {(task.assignee_name || 'U').toString().charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#3863a8', whiteSpace: 'nowrap', textDecoration: 'underline', textDecorationStyle: 'dotted', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.assignee_name || 'N/A'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase',
                            backgroundColor: getStatusColor(task.sprint_status || task.status).bg, color: getStatusColor(task.sprint_status || task.status).text, border: `1px solid ${getStatusColor(task.sprint_status || task.status).border}`
                          }}>
                            {task.sprint_status || task.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '90px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${task.progress_percentage || 0}%`, height: '100%', background: 'linear-gradient(90deg, #3863a8, #60a5fa)', borderRadius: '3px' }}></div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>{task.progress_percentage || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 12px', color: '#64748b', fontWeight: '600', fontSize: '12px' }}>
                          {formatTaskDate(task.deadline || task.updated_at)}
                        </td>
                        <td style={{ padding: '16px 12px', width: '100px' }}>
                          {task.has_review ? (
                            <span
                              style={{ fontSize: '11px', color: '#3863a8', fontWeight: '700', backgroundColor: '#eef2ff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'middle' }}
                              onClick={() => { setReviewTask(task); setReviewText(task.task_review); }}
                              title={task.task_review}
                            >
                              {task.task_review} 📝
                            </span>
                          ) : (
                            <button
                              onClick={() => { setReviewTask(task); setReviewText(''); }}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#3863a8', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Review
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '16px 12px', width: '100px' }}>
                          <div style={{ position: 'relative', width: 'fit-content' }}>
                            <select
                              value={task.verify_status || 'Pending'}
                              onChange={(e) => handleVerifyChange(task.task_id || task.id, e.target.value)}
                              style={{
                                padding: '6px 24px 6px 8px',
                                borderRadius: '8px',
                                border: `1px solid ${getVerifyStyles(task.verify_status).border}`,
                                background: getVerifyStyles(task.verify_status).bg,
                                color: getVerifyStyles(task.verify_status).text,
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                outline: 'none',
                                appearance: 'none'
                              }}
                            >
                              <option value="Pending">⌛ Pend</option>
                              <option value="Reject">❌ Rej</option>
                              <option value="Approve">✅ App</option>
                            </select>
                            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '8px', opacity: 0.5 }}>▼</div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '100px', backgroundColor: '#fcfcfd' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>📂</div>
                        <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>No Tasks Found</h3>
                        <p style={{ color: '#64748b' }}>Try adjusting your search or filters to find what you're looking for.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <AppFooter />

      {/* Success Popup */}
      {success && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', padding: '40px', borderRadius: '30px',
            maxWidth: '400px', width: '90%', textAlign: 'center',
            border: '3px solid #cbd5e1', boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: '#dcfce7',
              color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', fontSize: '40px'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>Success!</h2>
            <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600', lineHeight: '1.6', marginBottom: '30px' }}>
              {success}
            </p>
            <button
              onClick={() => setSuccess(null)}
              style={{
                width: '100%', padding: '14px', background: '#3863a8', color: 'white',
                border: 'none', borderRadius: '15px', fontWeight: '900', cursor: 'pointer',
                fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#5c85d6'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#3863a8'}
            >
              Great, thanks!
            </button>
          </div>
        </div>
      )}
      {/* ERROR MODAL */}
      {error && (
        <div style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: '#ef4444', color: 'white', padding: '16px 30px', borderRadius: '18px', zIndex: 10000, fontWeight: '900', boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '12px', border: '2px solid rgba(255,255,255,0.2)' }} className="animate-slide-up">
          <XCircle size={20} />
          {error}
        </div>
      )}
      {/* REVIEW MODAL */}
      {reviewTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-zoom-in" style={{ background: 'white', padding: '35px', borderRadius: '30px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
              <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#e0e7ff', color: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📝</div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>Task Review</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>Providing feedback for <strong style={{ color: '#1e293b' }}>{reviewTask.display_title || reviewTask.task_name || 'Untitled Task'}</strong></p>
              </div>
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="e.g. Code quality is excellent. Great job on the UI optimization!"
              style={{
                width: '100%', height: '150px', padding: '18px', border: '1px solid #e2e8f0', borderRadius: '15px', resize: 'none',
                outline: 'none', fontSize: '15px', color: '#1e293b', backgroundColor: '#f8fafc', boxSizing: 'border-box',
                fontFamily: 'inherit', fontWeight: '500', transition: 'all 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.backgroundColor = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
              <button
                onClick={() => { setReviewTask(null); setReviewText(''); }}
                style={{ padding: '12px 24px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}
              >
                Cancel
              </button>
              <button
                disabled={!reviewText.trim()}
                onClick={async () => {
                  if (!navigator.onLine) {
                    setError('Submission Failed: Network disconnected ❌');
                    setReviewTask(null);
                    setTimeout(() => setError(null), 3000);
                    return;
                  }
                  try {
                    const vStatus = reviewTask.verify_status || 'Pending';
                    const statusCode = vStatus === 'Approve' ? 1 : vStatus === 'Reject' ? 2 : 0;

                    const payload = {
                      id: reviewTask.id,
                      task_id: reviewTask.id,
                      task_review: reviewText,
                      review: reviewText,
                      verify: vStatus,
                      verify_status: vStatus,
                      verify_code: statusCode,
                      tag: vStatus,
                      status: reviewTask.status,
                      date: new Date().toISOString()
                    };

                    const response = await fetch(`${API_ENDPOINTS.ASSIGN_TASK_REVIEW}/${reviewTask.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                      body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                      setTasks(tasks.map(t => t.id === reviewTask.id ? { ...t, has_review: true, task_review: reviewText, review: reviewText } : t));
                      setSuccess('Review submitted successfully! 🚀');
                      setReviewTask(null);
                      setReviewText('');
                    } else if (response.status === 405 || response.status === 404) {
                      const postResponse = await fetch(API_ENDPOINTS.ASSIGN_TASK_REVIEW, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                        body: JSON.stringify(payload)
                      });
                      if (postResponse.ok) {
                        setTasks(tasks.map(t => t.id === reviewTask.id ? { ...t, has_review: true, task_review: reviewText, review: reviewText } : t));
                        setSuccess('Review submitted successfully! 🚀');
                        setReviewTask(null);
                        setReviewText('');
                      }
                    }
                  } catch (err) {
                    console.error('Master Save Error (Review):', err);
                  }
                }}
                style={{
                  padding: '12px 24px', background: '#3863a8', border: 'none', color: 'white', borderRadius: '12px', fontWeight: '800',
                  cursor: reviewText.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', opacity: reviewText.trim() ? 1 : 0.6,
                  boxShadow: '0 10px 15px -3px rgba(56, 99, 168, 0.2)'
                }}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL EMPLOYEE TASK REPORT MODAL */}
      {selectedAssignee && (() => {
        const empTasks = tasks.filter(t => t.assignee_name === selectedAssignee);
        const completed = empTasks.filter(t => t.status === 'Completed').length;
        const inProgress = empTasks.filter(t => t.status === 'In Progress').length;
        const pending = empTasks.filter(t => t.status === 'Pending').length;
        const avgProgress = empTasks.length > 0 ? Math.round(empTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) / empTasks.length) : 0;

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setSelectedAssignee(null)}
          >
            <div
              className="animate-zoom-in"
              style={{ background: 'white', width: '100%', maxWidth: '850px', maxHeight: '90vh', borderRadius: '30px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.3)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '30px 35px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', position: 'relative' }}>
                <button onClick={() => setSelectedAssignee(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.15)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: 'white', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                <div style={{ position: 'absolute', top: '15px', right: '55px' }}>
                  <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Export <span style={{ fontSize: '10px' }}>▼</span>
                  </button>
                  {showExportMenu && (
                    <div style={{ position: 'absolute', top: '35px', right: '0', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '170px', border: '1px solid #e2e8f0' }}>
                      <button onClick={() => handleExportModalPDF(empTasks, selectedAssignee, { total: empTasks.length, completed, inProgress, pending, avgProgress })} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', border: 'none', background: 'white', color: '#1e293b', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                        <span style={{ fontSize: '16px' }}>📄</span> Export as PDF
                      </button>
                      <button onClick={() => handleExportModalExcel(empTasks, selectedAssignee)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', border: 'none', background: 'white', color: '#1e293b', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                        <span style={{ fontSize: '16px' }}>📊</span> Export as Excel
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900' }}>
                    {selectedAssignee.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', letterSpacing: '-0.5px' }}>{selectedAssignee}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.7, fontWeight: '500' }}>Individual Task Performance Report • {empTasks.length} Tasks Assigned</p>
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '20px' }}>
                  {[
                    { label: 'Total Tasks', value: empTasks.length, color: '#60a5fa' },
                    { label: 'Completed', value: completed, color: '#34d399' },
                    { label: 'In Progress', value: inProgress, color: '#fbbf24' },
                    { label: 'Pending', value: pending, color: '#f87171' },
                    { label: 'Avg Progress', value: `${avgProgress}%`, color: '#a78bfa' },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '10px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Cards */}
              <div style={{ padding: '25px 35px', overflowY: 'auto', flex: 1 }}>
                {empTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '40px', marginBottom: '15px' }}>📭</div>
                    <p style={{ fontWeight: '700' }}>No tasks found for this employee.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {empTasks.map((task, idx) => {
                      const sc = getStatusColor(task.status);
                      return (
                        <div key={idx} style={{ background: '#f8fafc', borderRadius: '18px', padding: '20px', border: '1px solid #f1f5f9', transition: '0.2s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '900', color: '#3863a8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>#{task.id}</span>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#3b82f6', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>{task.type || 'TASK'}</span>
                              </div>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{task.display_title}</h4>
                              {task.description && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{task.description}</p>}
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '900', padding: '5px 12px', borderRadius: '8px', textTransform: 'uppercase', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, flexShrink: 0 }}>
                              {task.status}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${task.progress_percentage || 0}%`, height: '100%', background: task.progress_percentage >= 100 ? '#10b981' : 'linear-gradient(90deg, #3863a8, #60a5fa)', borderRadius: '4px', transition: '0.5s' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b', minWidth: '40px' }}>{task.progress_percentage || 0}%</span>
                          </div>

                          {/* Meta Row */}
                          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                              📅 {task.deadline || task.updated_at ? new Date(task.deadline || task.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                            </span>
                            {task.has_review && (
                              <span style={{ fontSize: '11px', color: '#3863a8', fontWeight: '700', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                                💬 {task.task_review}
                              </span>
                            )}
                            {task.verify_status && (
                              <span style={{ fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', marginLeft: 'auto', background: getVerifyStyles(task.verify_status).bg, color: getVerifyStyles(task.verify_status).text, border: `1px solid ${getVerifyStyles(task.verify_status).border}` }}>
                                {task.verify_status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .animate-zoom-in { animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
