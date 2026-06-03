import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS, BASE_URL } from '../../config';
import {
  Package, Search, Filter, Edit3, Save, X, Plus, ChevronRight,
  Laptop, MousePointer, Keyboard, Smartphone,
  Camera, Headphones, Tablet as TabletIcon, HardDrive, ScrollText, Calendar,
  ShieldCheck, Sparkles, Check, ArrowLeft
} from 'lucide-react';

export default function AssetsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState({});
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [editModal, setEditModal] = useState({ show: false, employee: null, isReadOnly: false });
  const [availableAssetsModal, setAvailableAssetsModal] = useState(false);
  const [availableStockModal, setAvailableStockModal] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategory, setStockCategory] = useState(null);
  const [stockSummary, setStockSummary] = useState({
    all: 0,
    laptops: 0,
    keyboards: 0,
    mice: 0,
    mobiles: 0,
    accessories: 0,
    others: 0
  });
  const [saving, setSaving] = useState(false);
  const [usersMap, setUsersMap] = useState({});
  const [winWidth, setWinWidth] = useState(window.innerWidth);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [customAlert, setCustomAlert] = useState({ show: false, message: '', type: 'success' });
  const [isAddAll, setIsAddAll] = useState(false);
  const stockRef = React.useRef(null);

  // Asset Form State
  const [form, setForm] = useState({
    employee_name: '',
    employee_id: '',
    designation: '',
    joining_date: '',
    last_working_date: '',
    laptop_details: '',
    laptop_count: '',
    mouse: '',
    keyboard: '',
    laptop_stand: '',
    ruf_pad: '',
    pendrive: '',
    mobile: '',
    camera: '',
    earphone: '',
    tablet: ''
  });

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!form.laptop_details) {
      setModelInfo(null);
      return;
    }

    const handler = setTimeout(async () => {
      const modelName = form.laptop_details.split('\n')[0].split(',')[0].trim();
      if (!modelName || modelName.length < 3) {
        setModelInfo(null);
        return;
      }

      setLoadingCheck(true);
      try {
        const response = await fetch(`${API_ENDPOINTS.ASSETS_STOCK}?filter=laptops`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await response.json();

        if (response.ok) {
          const list = Array.isArray(data) ? data : (data.recordset || data.data || []);
          const matchCount = list.filter(item => {
            const details = item.laptop_details || item.laptop_unit_details || item.laptop || '';
            return details.toLowerCase().includes(modelName.toLowerCase());
          }).length;

          setModelInfo({
            name: modelName,
            count: matchCount,
            exists: matchCount > 0
          });
        }
      } catch (err) {
        console.error('Error checking laptop count:', err);
      } finally {
        setLoadingCheck(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [form.laptop_details, user?.token]);

  const fetchData = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const assetMap = {};
      const headers = { 'Authorization': `Bearer ${user.token}` };

      // 1. Fetch Employees
      try {
        const empRes = await fetch(API_ENDPOINTS.EMPLOYEES, { headers });
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(Array.isArray(empData) ? empData : (empData.recordset || empData.data || []));
        }
      } catch (e) { console.error('Emp fetch failed:', e); }

      // 1b. Fetch Users and build id → {employee_id, name} lookup map
      try {
        const usersRes = await fetch(API_ENDPOINTS.USERS, { headers });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          const usersList = Array.isArray(usersData) ? usersData : (usersData.recordset || usersData.data || usersData.users || []);
          const map = {};
          usersList.forEach(u => {
            const dbId = u.id || u.user_id || u.userid;
            if (dbId !== undefined && dbId !== null) {
              map[String(dbId)] = {
                employee_id: u.employee_id || u.emp_id || u.empid || u.EmpID || String(dbId),
                name: u.employee_name || u.name || u.full_name || u.username || ''
              };
            }
          });
          setUsersMap(map);
        }
      } catch (e) { console.error('Users fetch failed:', e); }

      // 2. Fetch Assets
      try {
        const assetRes = await fetch(API_ENDPOINTS.ASSETS || `${API_ENDPOINTS.EMPLOYEES}/assets`, { headers });
        if (assetRes.ok) {
          const assetData = await assetRes.json();
          const list = Array.isArray(assetData) ? assetData : (assetData.recordset || assetData.data || []);
          list.forEach(a => {
            const id = a.employee_id || a.EmpID || a.employeeId || a.id;
            if (id) assetMap[id] = a;
          });
        }
      } catch (e) { console.error('Asset fetch failed:', e); }

      // 3. Fetch Service Certificates (Try Primary and Alt endpoints)
      const fetchCerts = async (url) => {
        if (!url) return [];
        try {
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : (data.recordset || data.data || data.value || []);
          }
        } catch (e) { console.error(`Fetch failed for ${url}:`, e); }
        return [];
      };

      try {
        const [certs1, certs2] = await Promise.all([
          fetchCerts(API_ENDPOINTS.SERVICE_CERTIFICATES_GET),
          fetchCerts(API_ENDPOINTS.SERVICE_CERTIFICATES_ALT)
        ]);

        const combinedCerts = [...certs1, ...certs2];
        console.log('Combined Certificate Data:', combinedCerts);

        combinedCerts.forEach(c => {
          const id = c.employee_id || c.EmpID || c.employeeId || c.user_id || c.id;
          if (!id) return;

          // Helper to convert 1/0 or boolean to Yes/No
          const mapBinary = (val) => (val === 1 || val === '1' || val === true || val === 'true' || val === 'Yes') ? 'Yes' : 'No';

          // Merge into assetMap (avoid overwriting if already exists and is from a newer request)
          assetMap[id] = {
            ...(assetMap[id] || {}),
            ...c,
            employee_name: c.employee_name || c.name || assetMap[id]?.employee_name || 'Certificate Employee',
            employee_id: id,
            laptop_details: c.laptop_details || c.laptop_unit_details || assetMap[id]?.laptop_details,
            mouse: mapBinary(c.mouse),
            keyboard: mapBinary(c.keyboard),
            laptop_stand: mapBinary(c.laptop_stand),
            ruf_pad: mapBinary(c.ref_pad),
            pendrive: mapBinary(c.pendrive),
            mobile: mapBinary(c.company_mobile),
            camera: mapBinary(c.external_camera),
            earphone: mapBinary(c.earphone_headphone),
            tablet: mapBinary(c.tablet),
            is_from_certificate: true
          };
        });
      } catch (e) { console.error('Cert merge error:', e); }

      // 4. Fetch Stock Inventory
      try {
        const stockRes = await fetch(API_ENDPOINTS.ASSETS_STOCK || `${BASE_URL}/api/assets-stock`, { headers });
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          const list = Array.isArray(stockData) ? stockData : (stockData.recordset || stockData.data || []);
          if (list.length > 0) {
            const mappedList = list.map((originalItem, idx) => {
              // Convert all keys of originalItem to lowercase for robust mapping
              const item = {};
              Object.keys(originalItem).forEach(k => {
                if (originalItem[k] !== null && originalItem[k] !== undefined) {
                  item[k.toLowerCase()] = originalItem[k];
                }
              });

              const id = item.id || item.stock_id || item.stockid || item.item_id || item.itemid || `STK-${String(idx + 1).padStart(3, '0')}`;

              // Resolve name from laptop details or fallbacks
              let name = 'Hardware Package';
              if (item.laptop_details) {
                if (item.laptop_details.includes('Serial No')) {
                  name = item.laptop_details.split('Serial No')[0].replace(/[,;:]\s*$/, '').trim();
                } else if (item.laptop_details.includes('S/N')) {
                  name = item.laptop_details.split('S/N')[0].replace(/[,;:]\s*$/, '').trim();
                } else {
                  name = item.laptop_details;
                }
              } else if (item.name || item.item_name || item.itemname) {
                name = item.name || item.item_name || item.itemname;
              }

              // Resolve specs by listing all verified peripherals
              const peripherals = [];
              if (item.mouse === 'Yes' || item.mouse === 1 || item.mouse === '1' || item.mouse === true) peripherals.push('Mouse');
              if (item.keyboard === 'Yes' || item.keyboard === 1 || item.keyboard === '1' || item.keyboard === true) peripherals.push('Keyboard');
              if (item.laptop_stand === 'Yes' || item.laptop_stand === 1 || item.laptop_stand === '1' || item.laptop_stand === true) peripherals.push('Stand');
              if (item.ruf_pad === 'Yes' || item.ruf_pad === 1 || item.ruf_pad === '1' || item.ruf_pad === true || item.ref_pad === 'Yes' || item.ref_pad === 1) peripherals.push('Ruf Pad');
              if (item.pendrive === 'Yes' || item.pendrive === 1 || item.pendrive === '1' || item.pendrive === true) peripherals.push('Pendrive');
              if (item.mobile === 'Yes' || item.mobile === 1 || item.mobile === '1' || item.mobile === true || item.company_mobile === 'Yes') peripherals.push('Mobile');
              if (item.camera === 'Yes' || item.camera === 1 || item.camera === '1' || item.camera === true || item.external_camera === 'Yes') peripherals.push('Camera');
              if (item.earphone_headphone === 'Yes' || item.earphone_headphone === 1 || item.earphone === 'Yes' || item.earphone === 1) peripherals.push('Earphone');
              if (item.tablet === 'Yes' || item.tablet === 1 || item.tablet === '1' || item.tablet === true) peripherals.push('Tablet');

              let specs = item.laptop_details || 'No specs provided';
              if (peripherals.length > 0) {
                specs += ' | Includes: ' + peripherals.join(', ');
              }

              const category = item.category || (item.laptop_details ? 'Laptops' : 'Others');

              // Handle qty (default to 1 since each row is a returned item pack)
              let qty = 1;
              const qtyKey = ['qty', 'quantity', 'stock_qty', 'stockqty', 'units', 'unit'].find(k => item[k] !== undefined);
              if (qtyKey !== undefined) {
                qty = Number(item[qtyKey]);
              }
              if (isNaN(qty) || qty <= 0) qty = 1;

              const status = item.status || (qty <= 2 ? 'Low Stock' : 'In Stock');

              return {
                id: String(id),
                name: String(name),
                category: String(category),
                qty: qty,
                specs: String(specs),
                status: String(status),
                employee_id: item.employee_id || item.emp_id || item.empid || item.employeeid || item.submitted_by || '',
                employee_name: item.returned_by_name || item.employee_name || item.emp_name || item.name || '',
                raw: item
              };
            });
            setStockList(mappedList);

            try {
              const summaryRes = await fetch(API_ENDPOINTS.ASSETS_STOCK_SUMMARY || `${BASE_URL}/api/assets-stock/summary`, { headers });
              if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setStockSummary(summaryData);
              }
            } catch (err) {
              console.error('Summary fetch failed:', err);
            }
          }
        }
      } catch (e) {
        console.error('Stock fetch failed:', e);
      }

      console.log('Final Asset Map keys:', Object.keys(assetMap));
      setAssets(assetMap);
    } catch (err) {
      console.error('Fatal fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const toInputDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '--') return '';
    // Handle ISO format like 2025-10-10T00:00:00 or 2025-10-10
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      return dateStr.split('T')[0];
    }
    // Handle DD-MM-YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (y.length === 4) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      if (d.length === 4) return `${d}-${m.padStart(2, '0')}-${y.padStart(2, '0')}`;
    }
    return '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === '--') return dateStr;
    // Handle ISO format like 2025-10-10T00:00:00
    if (dateStr.includes('T')) {
      const dateOnly = dateStr.split('T')[0];
      const [y, m, d] = dateOnly.split('-');
      return `${d}-${m}-${y}`;
    }
    // Handle YYYY-MM-DD
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const [y, m, d] = dateStr.split('-');
      return `${d}-${m}-${y}`;
    }
    return dateStr;
  };

  const handleEdit = (emp, isReadOnlyMode = false, assetOverride = null) => {
    setIsAddAll(false);
    const empId = emp.id || emp.EmpID;
    const currentAsset = assetOverride || assets[empId] || assets[emp.id] || assets[emp.EmpID] || {};

    // Find employee in the full list to get the latest Role/Position
    const fullEmp = employees.find(e => {
      const eId = String(e.id || e.EmpID || '').trim();
      const targetId = String(empId || '').trim();
      return eId === targetId && eId !== '';
    });

    console.log('[POSITION DEBUG]', { empId, fullEmp, asset: currentAsset });

    // Strictly prioritize the 'Role' column from the employees list as requested
    let position = '';
    if (fullEmp) {
      position = fullEmp.Role || fullEmp.role || fullEmp.Position || fullEmp.designation || '';
    }

    // If not found in employee list, only then fall back to asset/emp data
    if (!position) {
      position = currentAsset.designation || currentAsset.role || emp.role || '';
    }

    const toYesNo = (val, status) => {
      if (val === 'Yes' || status === 'Yes' || Number(val) === 1 || val === true || val === 'true') return 'Yes';
      if (val === 'No' || status === 'No' || Number(val) === 0 || val === false || val === 'false') return 'No';
      return '';
    };

    setForm({
      employee_name: emp.name || currentAsset.name || currentAsset.employee_name || fullEmp?.name || '',
      employee_id: emp.id || emp.EmpID || currentAsset.employee_id || currentAsset.employeeId || '',
      designation: position,
      joining_date: toInputDate(currentAsset.joining_date || currentAsset.doj || currentAsset.joining_date_iso || currentAsset.JoinDate || fullEmp?.joining_date || ''),
      last_working_date: toInputDate(currentAsset.last_working_date || currentAsset.lwd || currentAsset.lwd_iso || ''),
      laptop_details: currentAsset.laptop_details || currentAsset.laptop || currentAsset.laptop_unit_details || '',
      laptop_count: currentAsset.laptop_count || currentAsset.laptop_qty || currentAsset.qty || currentAsset.quantity || currentAsset.laptop_unit || '',
      mouse: toYesNo(currentAsset.mouse, currentAsset.mouse_unit || currentAsset.mouse_status),
      keyboard: toYesNo(currentAsset.keyboard, currentAsset.keyboard_unit || currentAsset.keyboard_status),
      laptop_stand: toYesNo(currentAsset.laptop_stand, currentAsset.stand_unit),
      ruf_pad: toYesNo(currentAsset.ruf_pad || currentAsset.ref_pad, currentAsset.ref_pad),
      pendrive: toYesNo(currentAsset.pendrive, currentAsset.pendrive_unit),
      mobile: toYesNo(currentAsset.mobile || currentAsset.company_mobile, currentAsset.company_mobile),
      camera: toYesNo(currentAsset.camera || currentAsset.external_camera, currentAsset.external_camera),
      earphone: toYesNo(currentAsset.earphone || currentAsset.earphone_headphone, currentAsset.earphone_headphone),
      tablet: toYesNo(currentAsset.tablet, currentAsset.tablet_unit)
    });

    setEditModal({
      show: true,
      employee: emp,
      isReadOnly: false, // Allow editing for all by default as requested
      assetId: currentAsset.id || currentAsset.EmpID || currentAsset.employee_id,
      isCertificate: !!currentAsset.is_from_certificate,
      certificateData: currentAsset.is_from_certificate ? currentAsset : null
    });
  };

  const closeEditModal = () => {
    const wasFromSubmitted = editModal.openedFromSubmittedAssets;
    setEditModal({ show: false, employee: null, isReadOnly: false });
    if (wasFromSubmitted) {
      setAvailableAssetsModal(true);
    }
  };

  const handleCertificateAction = async (status) => {
    if (!editModal.certificateData?.id) return;
    setSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.SERVICE_CERTIFICATE_UPDATE(editModal.certificateData.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          status: status,
          admin_remarks: `Processed by PManager on ${new Date().toLocaleDateString()}`
        })
      });

      if (response.ok) {
        setCustomAlert({ show: true, message: `Certificate request ${status}! ✅`, type: 'success' });
        closeEditModal();
        fetchData();
      } else {
        setCustomAlert({ show: true, message: 'Action failed. Please check backend connectivity.', type: 'error' });
      }
    } catch (err) {
      console.error('Certificate action error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Determine if this employee already has an asset record in the DB
      const empId = editModal.employee.id || editModal.employee.EmpID;
      const existingAsset = assets[empId];
      const hasExistingRecord = !!existingAsset;

      // Use the DB record's primary key for PUT, fallback to employee ID
      const targetId = editModal.assetId || (existingAsset?.id) || empId;

      // POST to ASSETS_STOCK if isAddAll is true, else decide between PUT/POST for employee assets
      const endpoint = isAddAll ? API_ENDPOINTS.ASSETS_STOCK : (hasExistingRecord ? API_ENDPOINTS.ASSET_UPDATE(targetId) : API_ENDPOINTS.ASSETS);
      const method = isAddAll ? 'POST' : (hasExistingRecord ? 'PUT' : 'POST');

      console.log(`[ASSET DECISION] isAddAll=${isAddAll}, hasExistingRecord=${hasExistingRecord}, targetId=${targetId}, method=${method}`);

      // Advanced Date Formatter (Handles both 16-01-2026 and 16/01/2026)
      const toISO = (d) => {
        if (!d || d === 'N/A' || d === '--' || d.includes('YYYY')) return d;
        const normalized = d.replace(/\//g, '-'); // Support slashes/
        if (normalized.split('-')[0].length === 4) return normalized;
        const [dd, mm, yyyy] = normalized.split('-');
        if (dd && mm && yyyy) {
          return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
        return d;
      };

      const toUnit = (val) => {
        if (val === 'Yes') return 1;
        if (val === 'No' || val === '') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      const toStatus = (val) => {
        const num = Number(val);
        if (!isNaN(num)) {
          return num > 0 ? 'Yes' : 'No';
        }
        return val || 'No';
      };

      const isoDate = toISO(form.joining_date);
      const isoLwd = toISO(form.last_working_date);

      let payload;
      if (isAddAll) {
        // Redundant payload for assets_stock table
        const categoryVal = form.laptop_details ? 'Laptops' : 'Accessories';
        let nameVal = 'Hardware Package';
        if (form.laptop_details) {
          nameVal = form.laptop_details.split('Serial No')[0].split('S/N')[0].replace(/[,;:]\s*$/, '').trim();
        }

        payload = {
          laptop_details: form.laptop_details,
          laptop_unit_details: form.laptop_details,
          laptop: form.laptop_details,

          name: nameVal,
          item_name: nameVal,
          itemname: nameVal,

          category: categoryVal,
          status: 'In Stock',
          qty: toUnit(form.laptop_count),
          quantity: toUnit(form.laptop_count),
          units: toUnit(form.laptop_count),
          unit: toUnit(form.laptop_count),
          stock_qty: toUnit(form.laptop_count),

          laptop_count: toStatus(form.laptop_count),
          laptop_qty: toUnit(form.laptop_count),
          laptop_unit: toUnit(form.laptop_count),

          mouse: toStatus(form.mouse),
          mouse_unit: toUnit(form.mouse),
          mouse_status: toStatus(form.mouse),

          keyboard: toStatus(form.keyboard),
          keyboard_unit: toUnit(form.keyboard),
          keyboard_status: toStatus(form.keyboard),

          laptop_stand: toStatus(form.laptop_stand),
          stand: toStatus(form.laptop_stand),
          stand_unit: toUnit(form.laptop_stand),

          ruf_pad: toStatus(form.ruf_pad),
          rufpad: toStatus(form.ruf_pad),
          ruf_pad_unit: toUnit(form.ruf_pad),
          ref_pad: toStatus(form.ruf_pad),

          pendrive: toStatus(form.pendrive),
          pendrive_unit: toUnit(form.pendrive),

          mobile: toStatus(form.mobile),
          mobile_unit: toUnit(form.mobile),
          mobile_handset: toStatus(form.mobile),
          company_mobile: toStatus(form.mobile),

          camera: toStatus(form.camera),
          webcam: toStatus(form.camera),
          camera_unit: toUnit(form.camera),
          external_camera: toStatus(form.camera),

          earphone: toStatus(form.earphone),
          headphone: toStatus(form.earphone),
          earphones: toStatus(form.earphone),
          headphones: toStatus(form.earphone),
          earphone_headphone: toStatus(form.earphone),
          earphone_unit: toUnit(form.earphone),
          headphone_unit: toUnit(form.earphone),

          tablet: toStatus(form.tablet),
          tablet_unit: toUnit(form.tablet)
        };
      } else {
        payload = {
          // Essential Identities
          employee_id: form.employee_id,
          id: editModal.assetId || form.employee_id,
          asset_id: editModal.assetId,
          emp_id: form.employee_id,
          name: form.employee_name,
          employee_name: form.employee_name,

          // Core Status & Metadata
          status: form.status || 'Active',
          assigned_date: isoDate,
          designation: form.designation,
          role: form.designation,

          // Massive Redundancy for Joining Date (DOJ)
          joining_date: isoDate,
          doj: isoDate,
          joining_date_iso: isoDate,
          joining_date_raw: form.joining_date,
          joined_date: isoDate,
          joined_at: isoDate,
          JoinDate: isoDate,
          date_of_joining: isoDate,
          joining_day: form.joining_date,

          // LWD Super-Set
          last_working_date: isoLwd,
          lwd: isoLwd,
          lwd_iso: isoLwd,
          lwd_raw: form.last_working_date,
          last_working_day: isoLwd,
          exit_date: isoLwd,

          // Hardware (Full Inventory Map)
          laptop_details: form.laptop_details,
          laptop_unit_details: form.laptop_details,
          laptop: form.laptop_details,
          laptop_count: toStatus(form.laptop_count),
          laptop_qty: toUnit(form.laptop_count),
          laptop_unit: toUnit(form.laptop_count),

          mouse: toStatus(form.mouse),
          mouse_unit: toUnit(form.mouse),
          mouse_status: toStatus(form.mouse),

          keyboard: toStatus(form.keyboard),
          keyboard_unit: toUnit(form.keyboard),
          keyboard_status: toStatus(form.keyboard),

          laptop_stand: toStatus(form.laptop_stand),
          stand: toStatus(form.laptop_stand),
          stand_unit: toUnit(form.laptop_stand),

          ruf_pad: toStatus(form.ruf_pad),
          rufpad: toStatus(form.ruf_pad),
          ruf_pad_unit: toUnit(form.ruf_pad),

          pendrive: toStatus(form.pendrive),
          pendrive_unit: toUnit(form.pendrive),

          mobile: toStatus(form.mobile),
          mobile_unit: toUnit(form.mobile),
          mobile_handset: toStatus(form.mobile),

          camera: toStatus(form.camera),
          webcam: toStatus(form.camera),
          camera_unit: toUnit(form.camera),

          earphone: toStatus(form.earphone),
          headphone: toStatus(form.earphone),
          earphones: toStatus(form.earphone),
          headphones: toStatus(form.earphone),
          earphone_headphone: toStatus(form.earphone),
          earphone_unit: toUnit(form.earphone),
          headphone_unit: toUnit(form.earphone),

          tablet: toStatus(form.tablet),
          tablet_unit: toUnit(form.tablet)
        };
      }

      console.log(`[ASSET SYNC] ${method} -> ${endpoint}`, payload);

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setToastMessage(`Updated Successfully! ✅`);
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        closeEditModal();
        // Force a brief delay before re-fetching to allow DB indexing
        setTimeout(() => fetchData(), 500);
      } else {
        setToastMessage(`Storage Error: ${result.message || result.error || 'Server rejected the entry'}`);
        setToastType('error');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error('Fatal Asset Sync Error:', err);
      setCustomAlert({ show: true, message: 'Network failure connecting to the Asset Database.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = React.useMemo(() => {
    // Combine employees and asset-only records
    const allIds = new Set([
      ...employees.map(e => String(e.id || e.EmpID)),
      ...Object.keys(assets)
    ]);

    const combined = Array.from(allIds).map(id => {
      const emp = employees.find(e => String(e.id || e.EmpID) === id);
      const asset = assets[id];
      if (emp) return { ...emp };
      return {
        id: id,
        EmpID: id,
        name: asset.employee_name || asset.name || 'New Member',
        role: asset.designation || 'Assigned Asset',
        is_virtual: true
      };
    });

    return combined.filter(emp => {
      const matchesSearch = (emp.name || '').toLowerCase().startsWith(searchTerm.toLowerCase()) ||
        (String(emp.id || '')).includes(searchTerm);
      const matchesDept = selectedDept === 'All' || (emp.team && emp.team.includes(selectedDept));
      return matchesSearch && matchesDept;
    });
  }, [employees, assets, searchTerm, selectedDept]);

  // Helper: check if a DB column value counts as 'Yes'
  const isYes = (val) => val === 'Yes' || val === 1 || val === '1' || val === true;

  // Compute component counts directly from stockList using exact DB column names and all common alternate keys
  const componentCounts = {
    laptops: stockList.filter(i => !!i.raw?.laptop_details).length,
    mouse: stockList.filter(i => isYes(i.raw?.mouse) || isYes(i.raw?.mouse_unit) || isYes(i.raw?.mouse_status)).length,
    keyboard: stockList.filter(i => isYes(i.raw?.keyboard) || isYes(i.raw?.keyboard_unit) || isYes(i.raw?.keyboard_status)).length,
    laptop_stand: stockList.filter(i => isYes(i.raw?.laptop_stand) || isYes(i.raw?.stand) || isYes(i.raw?.stand_unit)).length,
    ruf_pad: stockList.filter(i => isYes(i.raw?.ruf_pad) || isYes(i.raw?.rufpad) || isYes(i.raw?.ruf_pad_unit) || isYes(i.raw?.ref_pad)).length,
    pendrive: stockList.filter(i => isYes(i.raw?.pendrive) || isYes(i.raw?.pendrive_unit)).length,
    mobile: stockList.filter(i => isYes(i.raw?.mobile) || isYes(i.raw?.mobile_unit) || isYes(i.raw?.company_mobile) || isYes(i.raw?.mobile_handset)).length,
    camera: stockList.filter(i => isYes(i.raw?.camera) || isYes(i.raw?.camera_unit) || isYes(i.raw?.webcam) || isYes(i.raw?.external_camera)).length,
    earphone_headphone: stockList.filter(i => isYes(i.raw?.earphone_headphone) || isYes(i.raw?.earphone) || isYes(i.raw?.headphone) || isYes(i.raw?.earphones) || isYes(i.raw?.headphones) || isYes(i.raw?.earphone_unit) || isYes(i.raw?.headphone_unit)).length,
    tablet: stockList.filter(i => isYes(i.raw?.tablet) || isYes(i.raw?.tablet_unit)).length,
  };

  const categories = [
    { key: 'laptops', name: 'Laptops', count: stockList.filter(i => !!i.raw?.laptop_details).length, icon: <Laptop size={24} />, desc: 'Workstations and developer notebooks', bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca', isClickable: true },
  ];

  return (
    <div className="assets-management-container" style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Outfit', sans-serif" }}>
      <AppHeader />

      <main className="dashboard-content" style={{
        paddingTop: winWidth < 768 ? '100px' : '120px',
        paddingLeft: winWidth < 768 ? '15px' : '26px',
        paddingRight: winWidth < 768 ? '15px' : '26px',
        paddingBottom: '100px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', flexDirection: winWidth < 1024 ? 'column' : 'row', alignItems: winWidth < 1024 ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '25px', width: '100%', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={18} color="#64748b" />
            </button>
            <div style={{ background: 'white', padding: '12px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <Package size={24} color="#3163aa" />
            </div>
            <div>
              <h1 style={{ fontSize: winWidth < 768 ? '20px' : '24px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Asset Management Hub</h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>Deploy and track workforce hardware inventory</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', width: winWidth < 768 ? '100%' : 'auto', flexDirection: winWidth < 480 ? 'column' : 'row', alignItems: 'center' }}>
            <button
              onClick={() => {
                setForm({
                  employee_name: '', employee_id: '',
                  designation: '', joining_date: '', last_working_date: '', laptop_details: '',
                  laptop_count: '1',
                  mouse: '1', keyboard: '1', laptop_stand: '1', ruf_pad: '1', pendrive: '1',
                  mobile: '1', camera: '1', earphone: '1', tablet: '1'
                });
                setIsAddAll(true);
                setEditModal({ show: true, employee: { is_new: true, name: '' } });
              }}
              style={{ flex: 1, background: 'white', color: '#3163aa', border: '2px solid #3163aa', padding: '12px 20px', borderRadius: '14px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f0f4fa'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              <Plus size={16} />
              Add All Assets
            </button>
            <button
              onClick={() => setAvailableAssetsModal(true)}
              style={{ flex: 1, background: 'white', color: '#0ea5e9', border: '2px solid #0ea5e9', padding: '12px 20px', borderRadius: '14px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.3s' }}
            >

              <Package size={16} />
              Submitted Assets
            </button>
            <button
              onClick={() => {
                setForm({
                  employee_name: '', employee_id: '',
                  designation: '', joining_date: '', last_working_date: '', laptop_details: '',
                  laptop_count: '',
                  mouse: '', keyboard: '', laptop_stand: '', ruf_pad: '', pendrive: '',
                  mobile: '', camera: '', earphone: '', tablet: ''
                });
                setIsAddAll(false);
                setEditModal({ show: true, employee: { is_new: true, name: '' } });
              }}
              style={{ flex: 1, background: '#3163aa', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '14px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(49, 99, 170, 0.2)' }}
            >
              <Plus size={16} />
              Add New Assets(Employee)
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: winWidth < 1024 ? 'column' : 'row',
          gap: '24px',
          alignItems: winWidth < 1024 ? 'stretch' : 'stretch',
          width: '100%'
        }}>
          {/* Left Side: Stock Inventory / Available Assets */}
          <div ref={stockRef} style={{ flex: winWidth < 1024 ? '1' : '1', width: '100%', background: 'white', borderRadius: '24px', padding: '24px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
            {stockCategory === null ? (
              <>
                {/* Stock Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '10px', color: '#15803d' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Available Stock Inventory</h2>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>Deployable hardware assets currently in storage</p>
                  </div>
                </div>

                {/* Categories cards stacked or row depending on layout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {categories.map((cat) => {
                    return (
                      <div
                        key={cat.key}
                        onClick={() => setStockCategory(cat.key)}
                        style={{
                          background: 'white',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = cat.color;
                          e.currentTarget.style.boxShadow = `0 8px 16px -6px ${cat.color}20`;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            background: cat.bg,
                            color: cat.color,
                            padding: '10px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {cat.icon}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: 0 }}>{cat.name}</h3>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0', lineHeight: '1.3' }}>{cat.desc}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{cat.count}</span>
                          <ChevronRight size={16} color={cat.color} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick component counts */}
                <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '25px', marginBottom: '12px' }}>
                  Component Stock (Counts Only)
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px'
                }}>
                  {[
                    { key: 'mouse', label: 'Mouse', icon: <MousePointer size={18} />, bg: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)', color: '#0f766e' },
                    { key: 'keyboard', label: 'Keyboard', icon: <Keyboard size={18} />, bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', color: '#6b21a8' },
                    { key: 'laptop_stand', label: 'Laptop Stand', icon: <HardDrive size={18} />, bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca' },
                    { key: 'ruf_pad', label: 'Ruf Pad', icon: <Package size={18} />, bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#b45309' },
                    { key: 'pendrive', label: 'Pendrive', icon: <HardDrive size={18} />, bg: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)', color: '#be123c' },
                    { key: 'mobile', label: 'Mobile', icon: <Smartphone size={18} />, bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0369a1' },
                    { key: 'camera', label: 'Camera', icon: <Camera size={18} />, bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', color: '#15803d' },
                    { key: 'earphone_headphone', label: 'Earphone / Headphone', icon: <Headphones size={18} />, bg: 'linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 100%)', color: '#7e22ce' },
                    { key: 'tablet', label: 'Tablet', icon: <TabletIcon size={18} />, bg: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', color: '#c2410c' },
                    { key: 'laptops', label: 'Total Laptops', icon: <Laptop size={18} />, bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', color: '#4338ca' }
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        minHeight: '64px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <div style={{
                          background: item.bg,
                          color: item.color,
                          padding: '8px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {item.icon}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '900',
                        color: '#0f172a',
                        paddingLeft: '4px',
                        flexShrink: 0
                      }}>
                        {componentCounts[item.key] ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Back to Categories */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <button
                    onClick={() => {
                      setStockCategory(null);
                      setStockSearch('');
                    }}
                    style={{ background: 'white', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ArrowLeft size={14} color="#0ea5e9" />
                  </button>
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b', margin: 0 }}>
                      {stockCategory.charAt(0).toUpperCase() + stockCategory.slice(1)} Stock
                    </h2>
                  </div>
                </div>

                {/* Stock Search */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder={`Search in ${stockCategory}...`}
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '12px', fontFamily: "'Outfit', sans-serif" }}
                    />
                  </div>
                </div>

                {/* Stock list grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                  {stockList.filter(item => {
                    const matchesSearch = item.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
                      item.specs.toLowerCase().includes(stockSearch.toLowerCase()) ||
                      item.id.toLowerCase().includes(stockSearch.toLowerCase());

                    if (!matchesSearch) return false;
                    if (stockCategory === 'all') return true;

                    const isLaptop = item.category === 'Laptops' || !!item.raw?.laptop_details;
                    const isKeyboard = item.raw?.keyboard === 'Yes' || item.raw?.keyboard === 1 || item.raw?.keyboard === '1' || item.raw?.keyboard === true;
                    const isMouse = item.raw?.mouse === 'Yes' || item.raw?.mouse === 1 || item.raw?.mouse === '1' || item.raw?.mouse === true;
                    const isMobile = item.raw?.mobile === 'Yes' || item.raw?.mobile === 1 || item.raw?.mobile === '1' || item.raw?.mobile === true || item.raw?.company_mobile === 'Yes' || item.raw?.company_mobile === 1 || item.raw?.company_mobile === true;
                    const isAccessory = item.raw?.laptop_stand === 'Yes' || item.raw?.laptop_stand === 1 || item.raw?.laptop_stand === true || item.raw?.ruf_pad === 'Yes' || item.raw?.ruf_pad === 1 || item.raw?.ruf_pad === true || item.raw?.ref_pad === 'Yes' || item.raw?.ref_pad === 1 || item.raw?.pendrive === 'Yes' || item.raw?.pendrive === 1 || item.raw?.pendrive === true || item.raw?.camera === 'Yes' || item.raw?.camera === 1 || item.raw?.camera === true || item.raw?.external_camera === 'Yes' || item.raw?.earphone_headphone === 'Yes' || item.raw?.earphone_headphone === 1 || item.raw?.earphone === 'Yes' || item.raw?.earphone === 1 || item.raw?.tablet === 'Yes' || item.raw?.tablet === 1 || item.raw?.tablet === true || item.category === 'Accessories';

                    if (stockCategory === 'laptops') return isLaptop;
                    if (stockCategory === 'keyboard') return isKeyboard;
                    if (stockCategory === 'mice') return isMouse;
                    if (stockCategory === 'mobiles') return isMobile;
                    if (stockCategory === 'accessories') return isAccessory;
                    if (stockCategory === 'others') return !isLaptop && !isKeyboard && !isMouse && !isMobile && !isAccessory;

                    return true;
                  }).map((item, idx) => {
                    const isLow = item.status === 'Low Stock';
                    const badgeColor = isLow ? '#f59e0b' : '#10b981';
                    const badgeBg = isLow ? '#fffbeb' : '#f0fdf4';

                    let itemIcon = <Package size={16} />;
                    const catLower = item.category ? item.category.toLowerCase() : '';
                    const isLaptopItem = catLower.includes('laptop') || !!item.raw?.laptop_details;
                    if (isLaptopItem) itemIcon = <Laptop size={16} />;
                    else if (catLower.includes('keyboard')) itemIcon = <Keyboard size={16} />;
                    else if (catLower.includes('mouse') || catLower.includes('mice')) itemIcon = <MousePointer size={16} />;
                    else if (catLower.includes('mobile')) itemIcon = <Smartphone size={16} />;
                    else if (catLower.includes('accessory') || catLower.includes('accessories')) itemIcon = <HardDrive size={16} />;
                    else if (catLower.includes('earphone') || catLower.includes('headphone')) itemIcon = <Headphones size={16} />;
                    else if (catLower.includes('camera') || catLower.includes('webcam')) itemIcon = <Camera size={16} />;
                    else if (catLower.includes('tablet')) itemIcon = <TabletIcon size={16} />;

                    let modelName = item.name;
                    let serialNo = '';
                    let specsText = item.specs;

                    if (item.raw?.laptop_details) {
                      const rawSpecs = item.raw.laptop_details;
                      if (rawSpecs.includes('Serial No')) {
                        const parts = rawSpecs.split('Serial No');
                        modelName = parts[0].replace(/[,;:]\s*$/, '').trim();
                        serialNo = parts[1].replace(/^[:\s]+/, '').trim();
                      } else if (rawSpecs.includes('S/N')) {
                        const parts = rawSpecs.split('S/N');
                        modelName = parts[0].replace(/[,;:]\s*$/, '').trim();
                        serialNo = parts[1].replace(/^[:\s]+/, '').trim();
                      }
                    }

                    const peripheralsList = [];
                    const raw = item.raw || {};
                    if (raw.mouse === 'Yes' || raw.mouse === 1 || raw.mouse === true) peripheralsList.push('Mouse');
                    if (raw.keyboard === 'Yes' || raw.keyboard === 1 || raw.keyboard === true) peripheralsList.push('Keyboard');
                    if (raw.laptop_stand === 'Yes' || raw.laptop_stand === 1 || raw.laptop_stand === true) peripheralsList.push('Stand');
                    if (raw.ruf_pad === 'Yes' || raw.ruf_pad === 1 || raw.ruf_pad === true || raw.ref_pad === 'Yes' || raw.ref_pad === 1) peripheralsList.push('Ruf Pad');
                    if (raw.pendrive === 'Yes' || raw.pendrive === 1 || raw.pendrive === true) peripheralsList.push('Pendrive');
                    if (raw.mobile === 'Yes' || raw.mobile === 1 || raw.mobile === true || raw.company_mobile === 'Yes') peripheralsList.push('Mobile');
                    if (raw.camera === 'Yes' || raw.camera === 1 || raw.camera === true || raw.external_camera === 'Yes') peripheralsList.push('Camera');
                    if (raw.earphone_headphone === 'Yes' || raw.earphone_headphone === 1 || raw.earphone === 'Yes' || raw.earphone === 1) peripheralsList.push('Earphone');
                    if (raw.tablet === 'Yes' || raw.tablet === 1 || raw.tablet === true) peripheralsList.push('Tablet');

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'white',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', fontFamily: 'monospace' }}>{item.id}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: badgeColor, background: badgeBg, padding: '2px 6px', borderRadius: '6px' }}>
                                {item.qty} Qty
                              </span>
                              <span style={{ fontSize: '9px', fontWeight: '900', color: '#4338ca', background: '#e0e7ff', padding: '2px 6px', borderRadius: '6px' }}>
                                In Stock
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ background: '#e0e7ff', padding: '6px', borderRadius: '10px', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {itemIcon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', lineHeight: '1.3' }}>
                                {modelName}
                              </div>

                              {serialNo && (
                                <div style={{ fontSize: '9px', fontFamily: 'monospace', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', color: '#475569', display: 'inline-block', marginTop: '4px', border: '1px solid #e2e8f0' }}>
                                  S/N: {serialNo}
                                </div>
                              )}

                              {isLaptopItem && (
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
                                  {specsText}
                                </div>
                              )}
                            </div>
                          </div>

                          {peripheralsList.length > 0 && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {peripheralsList.map((p) => (
                                  <span key={p} style={{ fontSize: '8px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                                    + {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setForm({
                              employee_name: '',
                              employee_id: '',
                              designation: '',
                              joining_date: '',
                              last_working_date: '',
                              laptop_details: item.raw?.laptop_details || '',
                              laptop_count: String(item.qty || item.raw?.qty || item.raw?.quantity || ''),
                              mouse: item.raw?.mouse || 'No',
                              keyboard: item.raw?.keyboard || 'No',
                              laptop_stand: item.raw?.laptop_stand || 'No',
                              ruf_pad: item.raw?.ruf_pad || item.raw?.ref_pad || 'No',
                              pendrive: item.raw?.pendrive || 'No',
                              mobile: item.raw?.mobile || item.raw?.company_mobile || 'No',
                              camera: item.raw?.camera || item.raw?.external_camera || 'No',
                              earphone: item.raw?.earphone_headphone || item.raw?.earphone || 'No',
                              tablet: item.raw?.tablet || 'No'
                            });
                            setIsAddAll(false);
                            setEditModal({ show: true, employee: { is_new: true, name: '' } });
                          }}
                          style={{
                            width: '100%', padding: '8px 0', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)', color: 'white', fontSize: '11px', fontWeight: '900',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                          }}
                        >
                          <Plus size={12} /> Assign Hardware
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right Side: Member Details Roster */}
          <div style={{ flex: winWidth < 1024 ? '1' : '1.3', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Roster List / Cards / Table */}
            {winWidth < 1024 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '490px', overflowY: 'auto', paddingRight: '4px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '24px' }}>Loading...</div>
                ) : filteredEmployees.map((emp, i) => {
                  const empId = emp.id || emp.EmpID;
                  const asset = assets[empId] || assets[emp.id] || assets[emp.EmpID] || {};
                  const hasAsset = !!(assets[empId] || assets[emp.id] || assets[emp.EmpID]);
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: '24px', padding: '26px', border: '1.5px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3163aa', fontWeight: '900', fontSize: '16px', overflow: 'hidden' }}>
                          {(() => {
                            const empId = emp.id || emp.EmpID;
                            const pic = emp.profile_picture || emp.profile_pic || emp.photo;
                            const photoUrl = pic ? (pic.startsWith('http') || pic.startsWith('data:') ? pic : `${BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`) : `${BASE_URL}/api/users/${empId}/photo`;
                            return (
                              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                <img
                                  src={photoUrl}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                                <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#3163aa' }}>
                                  {emp.name.charAt(0)}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '900', fontSize: '15px', color: '#1e293b' }}>{emp.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>ID: {emp.id || emp.EmpID}</div>
                        </div>
                        <div style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: '900', background: hasAsset ? '#f0fdf4' : '#eff6ff', color: hasAsset ? '#16a34a' : '#2563eb', border: `1px solid ${hasAsset ? '#bbf7d0' : '#dbeafe'}` }}>
                          {hasAsset ? 'CONFIGURED' : 'PENDING'}
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Designation</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>{asset.designation || emp.role || 'Unspecified'}</div>
                      </div>

                      <button
                        onClick={() => handleEdit(emp, hasAsset)}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '14px', border: 'none',
                          background: hasAsset ? '#f1f5f9' : '#3163aa',
                          color: hasAsset ? '#475569' : 'white',
                          fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        {hasAsset ? <Package size={16} /> : <Edit3 size={16} />}
                        {hasAsset ? 'View Asset Details' : 'Configure Hardware'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-section animate-fade-in" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', background: 'white', width: '100%', margin: '0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowX: 'auto', maxHeight: '670px', overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed', fontFamily: "'Outfit', sans-serif" }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, padding: '15px 20px', color: '#1e293b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', width: '40%', letterSpacing: '0.5px' }}>Member Details</th>
                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, padding: '15px 20px', color: '#1e293b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', width: '35%', letterSpacing: '0.5px' }}>Designation</th>
                        <th style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1, padding: '15px 20px', color: '#1e293b', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', width: '25%', letterSpacing: '0.5px' }}>Configuration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array(5).fill(0).map((_, i) => (
                          <tr key={i}><td colSpan="3" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>Establishing neural link...</td></tr>
                        ))
                      ) : filteredEmployees.map((emp, i) => {
                        const empId = emp.id || emp.EmpID;
                        const asset = assets[empId] || assets[emp.id] || assets[emp.EmpID] || {};
                        const hasAsset = !!(assets[empId] || assets[emp.id] || assets[emp.EmpID]);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s', backgroundColor: i % 2 === 0 ? 'transparent' : '#fcfdfe' }}>
                            <td style={{ padding: '15px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3163aa', fontWeight: '900', fontSize: '14px', overflow: 'hidden' }}>
                                  {(() => {
                                    const empId = emp.id || emp.EmpID;
                                    const pic = emp.profile_picture || emp.profile_pic || emp.photo;
                                    const photoUrl = pic ? (pic.startsWith('http') || pic.startsWith('data:') ? pic : `${BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`) : `${BASE_URL}/api/users/${empId}/photo`;
                                    return (
                                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                        <img
                                          src={photoUrl}
                                          alt=""
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                        />
                                        <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#3163aa' }}>
                                          {emp.name.charAt(0)}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {emp.id || emp.EmpID}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '15px 20px' }}>
                              <span style={{ fontSize: '13px', color: '#334155', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{asset.designation || emp.role || 'Unspecified'}</span>
                            </td>
                            <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                              {hasAsset ? (
                                <button
                                  onClick={() => handleEdit(emp, true)}
                                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', color: '#64748b', cursor: 'pointer', transition: '0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <Package size={14} /> <span style={{ fontSize: '12px', fontWeight: '800' }}>View Details</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleEdit(emp, false)}
                                  style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '8px 12px', color: '#2563eb', cursor: 'pointer', transition: '0.2s', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                  <Edit3 size={14} /> <span style={{ fontSize: '12px', fontWeight: '800' }}>Configure</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-slide-up" style={{
            background: 'white',
            width: '100%',
            maxWidth: editModal.isCertificate ? '900px' : '800px',
            borderRadius: '35px',
            maxHeight: '92vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '3px solid #cbd5e1'
          }}>

            {/* Header Redesign for Certificate */}
            <div style={{ padding: winWidth < 768 ? '20px' : '30px 40px', background: editModal.isCertificate ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: winWidth < 768 ? '12px' : '20px' }}>
                <div style={{ width: winWidth < 768 ? '45px' : '60px', height: winWidth < 768 ? '45px' : '60px', borderRadius: '18px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(49, 99, 170, 0.08)', overflow: 'hidden' }}>
                  {(() => {
                    const emp = editModal.employee;
                    const empId = emp.id || emp.EmpID;
                    const pic = emp.profile_picture || emp.profile_pic || emp.photo;
                    const photoUrl = pic ? (pic.startsWith('http') || pic.startsWith('data:') ? pic : `${BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`) : `${BASE_URL}/api/users/${empId}/photo`;
                    return (
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img
                          src={photoUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                        <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#3163aa' }}>
                          <Package size={winWidth < 768 ? 22 : 28} color="#3163aa" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <h2 style={{ fontSize: winWidth < 768 ? '18px' : '26px', fontWeight: '950', color: '#000000', margin: 0, letterSpacing: '-0.5px' }}>
                    {editModal.isCertificate ? 'Asset Declaration' : (editModal.isReadOnly ? 'Asset View' : (isAddAll ? 'Add All Assets' : 'Configure Hardware'))}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                      {editModal.employee.name}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={closeEditModal} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '40px', overflowY: 'auto', flex: 1, position: 'relative', background: '#fcfdfe' }}>
              {editModal.isCertificate ? (
                /* Premium Certificate Declaration UI */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {/* Laptop Section */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>LAPTOP DETAILS & SERIAL NUMBER</label>
                    <div style={{ background: '#f0f9ff', border: '1.5px solid #e0f2fe', borderRadius: '24px', padding: '25px', position: 'relative' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1', lineHeight: '1.6' }}>
                        {form.laptop_details || 'No specific details provided for this unit.'}
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#7dd3fc', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        S/N: {form.laptop_details?.match(/S\/N:?\s*([A-Z0-9]+)/i)?.[1] || 'PF5P6L2E'}
                      </div>
                    </div>
                  </div>

                  {/* Peripherals Grid */}
                  <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '30px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                      <div style={{ color: '#22c55e' }}><ShieldCheck size={22} /></div>
                      <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>Hardware Peripherals Verified</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: winWidth < 480 ? 'repeat(2, 1fr)' : (winWidth < 768 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)'), gap: '12px' }}>
                      {[
                        { label: 'Optical Mouse', key: 'mouse', icon: <MousePointer size={18} /> },
                        { label: 'External Keyboard', key: 'keyboard', icon: <Keyboard size={18} /> },
                        { label: 'Laptop Stand', key: 'laptop_stand', icon: <Laptop size={18} /> },
                        { label: 'Company Mobile', key: 'mobile', icon: <Smartphone size={18} /> },
                        { label: 'Earphones', key: 'earphone', icon: <Headphones size={18} /> },
                        { label: 'External Camera', key: 'camera', icon: <Camera size={18} /> },
                        { label: 'Tablet', key: 'tablet', icon: <TabletIcon size={18} /> },
                        { label: 'Pendrive / Storage', key: 'pendrive', icon: <HardDrive size={18} /> },
                        { label: 'Ref Pad / Notebook', key: 'ruf_pad', icon: <ScrollText size={18} /> },
                      ].map((item) => {
                        const isSubmitted = form[item.key] === 'Yes';
                        return (
                          <div key={item.key} style={{
                            background: isSubmitted ? '#f0fdf4' : 'white',
                            border: isSubmitted ? '1.5px solid #bbf7d0' : '1.5px solid #e2e8f0',
                            borderRadius: '16px', padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                            transition: '0.2s',
                            boxShadow: isSubmitted ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                          }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: isSubmitted ? '#22c55e' : '#f1f5f9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSubmitted ? 'white' : '#94a3b8'
                            }}>
                              {isSubmitted ? <Check size={16} /> : item.icon}
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: isSubmitted ? '#166534' : '#475569', textAlign: 'center' }}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Original Configuration UI */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: winWidth < 600 ? '1fr' : '1fr 1fr', gap: '25px' }}>
                    {!isAddAll && (
                      <>
                        <div style={{ gridColumn: 'span 2', marginBottom: '10px' }}>
                          <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#3163aa', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1.5px solid #eff6ff', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ScrollText size={14} /> Deployment Base Details
                          </h3>
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>EMPLOYEE NAME</label>
                            <input
                              type="text"
                              placeholder="Enter Name"
                              value={form.employee_name}
                              onChange={(e) => setForm({ ...form, employee_name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                              style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.0px solid #1d2846ff', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>EMPLOYEE ID</label>
                            <input
                              type="text"
                              placeholder="Enter ID"
                              value={form.employee_id}
                              onChange={(e) => setForm({ ...form, employee_id: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                              style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none' }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>DESIGNATION</label>
                          <input type="text" placeholder="e.g. Lead Software Engineer" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>JOINING DATE</label>
                            <input type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none', fontFamily: "'Outfit', sans-serif" }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>LWD</label>
                            <input type="date" value={form.last_working_date} onChange={(e) => setForm({ ...form, last_working_date: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none', fontFamily: "'Outfit', sans-serif" }} />
                          </div>
                        </div>
                      </>
                    )}

                    <div style={{ gridColumn: 'span 2', margin: '15px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #eff6ff', paddingBottom: '10px' }}>
                      <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#3163aa', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Laptop size={14} /> Hardware Inventory
                      </h3>
                      {!editModal.isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddAll) {
                              const allOne = ['laptop_count', 'mouse', 'keyboard', 'laptop_stand', 'ruf_pad', 'pendrive', 'mobile', 'camera', 'earphone', 'tablet'].every(k => Number(form[k]) === 1);
                              const newVal = allOne ? '0' : '1';
                              setForm(prev => ({
                                ...prev,
                                laptop_count: newVal,
                                mouse: newVal,
                                keyboard: newVal,
                                laptop_stand: newVal,
                                ruf_pad: newVal,
                                pendrive: newVal,
                                mobile: newVal,
                                camera: newVal,
                                earphone: newVal,
                                tablet: newVal
                              }));
                            } else {
                              const allYes = ['laptop_count', 'mouse', 'keyboard', 'laptop_stand', 'ruf_pad', 'pendrive', 'mobile', 'camera', 'earphone', 'tablet'].every(k => form[k] === 'Yes');
                              const newVal = allYes ? '' : 'Yes';
                              setForm(prev => ({
                                ...prev,
                                laptop_count: newVal,
                                mouse: newVal,
                                keyboard: newVal,
                                laptop_stand: newVal,
                                ruf_pad: newVal,
                                pendrive: newVal,
                                mobile: newVal,
                                camera: newVal,
                                earphone: newVal,
                                tablet: newVal
                              }));
                            }
                          }}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #dbeafe',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isAddAll ? (
                            ['laptop_count', 'mouse', 'keyboard', 'laptop_stand', 'ruf_pad', 'pendrive', 'mobile', 'camera', 'earphone', 'tablet'].every(k => Number(form[k]) === 1) ? 'Deselect All' : 'Select All'
                          ) : (
                            ['laptop_count', 'mouse', 'keyboard', 'laptop_stand', 'ruf_pad', 'pendrive', 'mobile', 'camera', 'earphone', 'tablet'].every(k => form[k] === 'Yes') ? 'Deselect All' : 'Select All'
                          )}
                        </button>
                      )}
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>
                        <Laptop size={14} /> LAPTOP UNIT DETAILS
                      </label>
                      <textarea placeholder="Model, Serial Number, OS details..." value={form.laptop_details} onChange={(e) => setForm({ ...form, laptop_details: e.target.value })} style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', minHeight: '80px', resize: 'none', outline: 'none' }} />

                      {/* Real-Time Database Indicator */}
                      {loadingCheck && <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 4px', fontWeight: '750' }}>🔍 Checking existing catalog...</p>}
                      {!loadingCheck && modelInfo && (
                        <div style={{
                          marginTop: '8px',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          lineHeight: '1.4',
                          background: modelInfo.exists ? '#f0fdf4' : '#eff6ff',
                          border: `1.5px solid ${modelInfo.exists ? '#bbf7d0' : '#bfdbfe'}`,
                          color: modelInfo.exists ? '#15803d' : '#1d4ed8',
                          fontWeight: '600'
                        }}>
                          {modelInfo.exists ? (
                            <span>💡 Count Found: We have <strong>{modelInfo.count}</strong> existing entries for <em>"{modelInfo.name}"</em> in stock. This will be added to it.</span>
                          ) : (
                            <span>✨ Fresh model entry: <em>"{modelInfo.name}"</em> doesn't exist in stock. Adding fresh!</span>
                          )}
                        </div>
                      )}
                    </div>

                    {[
                      { key: 'laptop_count', label: 'LAPTOP COUNT', icon: <Laptop size={14} /> },
                      { key: 'mouse', label: 'MOUSE', icon: <MousePointer size={14} /> },
                      { key: 'keyboard', label: 'KEYBOARD', icon: <Keyboard size={14} /> },
                      { key: 'laptop_stand', label: 'LAPTOP STAND', icon: <Laptop size={14} /> },
                      { key: 'ruf_pad', label: 'RUF PAD', icon: <ScrollText size={14} /> },
                      { key: 'pendrive', label: 'PENDRIVE', icon: <HardDrive size={14} /> },
                      { key: 'mobile', label: 'MOBILE UNIT', icon: <Smartphone size={14} /> },
                      { key: 'camera', label: 'CAMERA/WEBCAM', icon: <Camera size={14} /> },
                      { key: 'earphone', label: 'EARPHONE/HEADPHONE', icon: <Headphones size={14} /> },
                      { key: 'tablet', label: 'TABLET UNIT', icon: <TabletIcon size={14} /> }
                    ].map((item) => (
                      <div key={item.key}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#000000', marginBottom: '8px', paddingLeft: '4px' }}>{item.icon} {item.label}</label>
                        {isAddAll ? (
                          <input
                            type="number"
                            min="0"
                            placeholder="Enter quantity"
                            value={form[item.key]}
                            onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                            style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                          />
                        ) : (
                          <select
                            value={form[item.key]}
                            onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                            style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid #1e3a8a', background: '#f8fafc', fontWeight: '600', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="">Select Option</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '30px 40px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '20px', background: 'white' }}>
              {editModal.isCertificate ? (
                /* Action Buttons for Certificate (Matches Screenshot with Manager Logic) */
                <>
                  {(['PENDING', 'PENDING AUDIT'].includes(editModal.certificateData?.status?.toUpperCase())) ? (
                    <>
                      <button
                        onClick={() => handleCertificateAction('Rejected')}
                        disabled={saving}
                        style={{ flex: 1, padding: '18px', borderRadius: '20px', border: '2px solid #ef4444', background: 'white', color: '#ef4444', fontSize: '15px', fontWeight: '900', cursor: 'pointer', transition: '0.2s' }}
                      >
                        Reject Submission
                      </button>
                      <button
                        onClick={() => handleCertificateAction('Approved')}
                        disabled={saving}
                        style={{ flex: 2, padding: '18px', borderRadius: '22px', border: 'none', background: '#10b981', color: 'white', fontSize: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.25)', transition: '0.2s' }}
                      >
                        {saving ? 'Processing...' : <><ShieldCheck size={22} /> Approve Declaration</>}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={true}
                      style={{
                        flex: 1, padding: '18px', borderRadius: '22px', border: 'none',
                        background: '#cbd5e1',
                        color: 'white', fontSize: '16px', fontWeight: '900',
                        cursor: 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        boxShadow: 'none',
                        transition: '0.2s',
                        opacity: 0.8
                      }}
                    >
                      <Sparkles size={20} /> Declaration Processed
                    </button>
                  )}
                </>
              ) : (
                /* Standard Footer */
                <>
                  <button
                    onClick={closeEditModal}
                    style={{ flex: 1, padding: '16px', borderRadius: '50px', border: '1.5px solid #1e3a8a', background: 'white', color: '#64748b', fontSize: '14px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ flex: 2, padding: '16px', borderRadius: '50px', border: 'none', background: '#3163aa', color: 'white', fontSize: '14px', fontWeight: '800', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(49, 99, 170, 0.2)' }}
                  >
                    {saving ? 'Syncing...' : <><Save size={18} /> {assets[editModal.employee?.id || editModal.employee?.EmpID] ? 'Save Changes' : 'Submit details'}</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Assets Modal */}
      {/* Available Assets Modal */}
      {availableAssetsModal && (
        <div className="submitted-assets-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#f1f5f9',
          zIndex: 10000, display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <AppHeader />
          <div className="submitted-assets-content animate-slide-up" style={{
            background: 'transparent', borderRadius: '0px', width: '100%', maxWidth: '100%',
            paddingTop: winWidth < 768 ? '90px' : '110px',
            paddingLeft: winWidth < 768 ? '15px' : '26px',
            paddingRight: winWidth < 768 ? '15px' : '26px',
            paddingBottom: '100px',
            position: 'relative',
            height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column',
            boxSizing: 'border-box',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setAvailableAssetsModal(false)}
              style={{
                position: 'absolute',
                top: winWidth < 768 ? '85px' : '105px',
                right: winWidth < 768 ? '15px' : '26px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '50%',
                padding: '8px',
                cursor: 'pointer',
                color: '#64748b',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '30px', flexShrink: 0 }}>
              <div style={{ background: '#eff6ff', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                <Package size={30} color="#3163aa" />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: '0 0 8px 0' }}>Submitted Assets Directory</h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>List of employees who submitted assets via certificate requests</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: winWidth < 600 ? '1fr' : (winWidth < 1024 ? '1fr 1fr' : 'repeat(5, 1fr)'),
              gap: '20px',
              padding: '20px 10px',
              width: '100%',
              maxWidth: '1600px',
              margin: '0 auto',
              boxSizing: 'border-box',
              flex: 1,
              alignItems: 'start'
            }}>
              {Object.values(assets).filter(a => a.is_from_certificate).length > 0 ? (
                Object.values(assets).filter(a => a.is_from_certificate).map((asset, i) => {
                  const empName = asset.employee_name || asset.name || 'Unknown';
                  const empId = asset.employee_id || asset.EmpID || asset.id;
                  const status = asset.status || 'PENDING';
                  const isAudit = status.toUpperCase().includes('AUDIT');
                  const badgeColor = isAudit ? '#ef4444' : '#f59e0b';
                  const badgeBg = isAudit ? '#fef2f2' : '#fffbeb';

                  // Construct a dummy employee object for handleEdit
                  const empObj = {
                    id: empId,
                    EmpID: empId,
                    name: empName,
                    role: asset.designation || asset.role
                  };

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setAvailableAssetsModal(false);
                        handleEdit(empObj, true, asset);
                        setEditModal(prev => ({ ...prev, openedFromSubmittedAssets: true }));
                      }}
                      style={{
                        width: '100%',
                        background: 'white',
                        padding: '20px',
                        borderRadius: '20px',
                        border: '1px solid #f1f5f9',
                        borderLeft: `5px solid ${badgeColor}`,
                        borderBottom: `2px solid ${badgeColor}20`,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 15px 25px rgba(0,0,0,0.06)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
                      }}
                    >
                      {/* Top Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '900',
                          color: badgeColor,
                          background: badgeBg,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          letterSpacing: '0.5px'
                        }}>
                          {status.toUpperCase()}
                        </span>
                        <div style={{ color: '#cbd5e1' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px', color: '#64748b' }}>
                          <ScrollText size={16} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', color: '#1e293b', marginBottom: '1px' }}>
                            #{asset.id || (i + 1)} Cert
                          </div>
                          <div style={{ fontWeight: '800', fontSize: '12px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {empName}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>
                            ID: {empId}
                          </div>
                        </div>
                      </div>

                      {/* Footer Purpose */}
                      <div style={{
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        color: '#475569',
                        fontWeight: '700',
                        textAlign: 'center',
                        border: '1px solid #f1f5f9',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {asset.purpose || asset.reason || 'Asset Declaration'}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ flex: 1, padding: '40px', textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0', borderRadius: '20px' }}>
                  No asset submissions found in the database.
                </div>
              )}
            </div>

          </div>
          <AppFooter />
        </div>
      )}

      {customAlert.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
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
            fontFamily: "'Outfit', sans-serif"
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '22px',
              background: customAlert.type === 'error' ? '#fef2f2' : '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: `1.5px solid ${customAlert.type === 'error' ? '#fecaca' : '#bbf7d0'}`
            }}>
              {customAlert.type === 'error' ? (
                <X size={32} color="#ef4444" />
              ) : (
                <ShieldCheck size={32} color="#10b981" />
              )}
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '950',
              color: '#1e293b',
              margin: '0 0 24px 0',
              lineHeight: '1.4'
            }}>
              {customAlert.message}
            </h2>
            <button
              onClick={() => setCustomAlert({ show: false, message: '', type: 'success' })}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: '16px',
                border: 'none',
                background: customAlert.type === 'error' ? '#ef4444' : '#3163aa',
                color: 'white',
                fontSize: '14px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: `0 8px 20px ${customAlert.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(49, 99, 170, 0.2)'}`,
                transition: 'all 0.2s'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {showToast && (
        <div style={{
          position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)',
          background: toastType === 'error' ? '#ef4444' : '#312e81',
          color: 'white', padding: '16px 32px', borderRadius: '16px', fontWeight: '800', zIndex: 20000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', minWidth: '300px', textAlign: 'center'
        }}>
          {toastMessage}
        </div>
      )}
      <AppFooter />
    </div>
  );
}
