import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { Search, Calendar, Cake, ArrowLeft } from 'lucide-react';

export default function BirthdayScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [birthdays, setBirthdays] = useState([]);
  const [filteredBirthdays, setFilteredBirthdays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      if (!user?.token) return;
      try {
        const response = await fetch(API_ENDPOINTS.BIRTHDAYS, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data) ? data : (data.data || []);

          const today = new Date();
          const currentMonth = today.getMonth();
          const currentDay = today.getDate();

          const parseDobAgnostic = (dateStr) => {
            if (!dateStr) return null;
            const s = String(dateStr).trim();
            
            let day, month, year;
            
            const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
            if (dmyMatch) {
              day = parseInt(dmyMatch[1], 10);
              month = parseInt(dmyMatch[2], 10);
              year = parseInt(dmyMatch[3], 10);
            } else {
              const ymdMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (ymdMatch) {
                year = parseInt(ymdMatch[1], 10);
                month = parseInt(ymdMatch[2], 10);
                day = parseInt(ymdMatch[3], 10);
              } else {
                const dmMatch = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
                if (dmMatch) {
                  day = parseInt(dmMatch[1], 10);
                  month = parseInt(dmMatch[2], 10);
                  year = new Date().getFullYear();
                }
              }
            }

            if (!day || !month) {
              const d = new Date(dateStr);
              if (isNaN(d.getTime())) return null;
              if (s.includes('T') || s.includes('-')) {
                day = d.getUTCDate();
                month = d.getUTCMonth() + 1;
                year = d.getUTCFullYear();
              } else {
                day = d.getDate();
                month = d.getMonth() + 1;
                year = d.getFullYear();
              }
            }

            if (day && month) {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              const monthName = monthNames[month - 1];
              const formattedDate = year && year >= 1900 ? `${day} ${monthName} ${year}` : `${day} ${monthName}`;
              return { day, month: month - 1, year, formattedDate };
            }
            return null;
          };

          const processed = list.map(emp => {
            const rawDob = emp.birthday || emp.date_of_birth || emp.dob || emp.dateOfBirth || emp.birthday_date || emp.date;
            const dobInfo = parseDobAgnostic(rawDob);

            if (!dobInfo) {
              return { ...emp, status: 'Upcoming', formattedDate: 'N/A' };
            }

            const { day: bDay, month: bMonth, year: bYear, formattedDate } = dobInfo;

            let status = 'Upcoming';
            if (bMonth < currentMonth || (bMonth === currentMonth && bDay < currentDay)) {
              status = 'Passed';
            } else if (bMonth === currentMonth && bDay === currentDay) {
              status = 'Today';
            }

            return {
              ...emp,
              status,
              month: bMonth,
              day: bDay,
              formattedDate
            };
          });

          // Ensure uniqueness of employee IDs/names to prevent duplicate cards
          const uniqueProcessed = [];
          const seen = new Set();
          for (const emp of processed) {
            const uid = emp.id || emp.employee_id || emp.EmpID || emp.name;
            if (!seen.has(uid)) {
              seen.add(uid);
              uniqueProcessed.push(emp);
            }
          }

          const sorted = uniqueProcessed.sort((a, b) => {
            if (a.month !== b.month) return a.month - b.month;
            return a.day - b.day;
          });

          setBirthdays(sorted);
          setFilteredBirthdays(sorted);
        }
      } catch (err) {
        console.error('Birthdays fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBirthdays();
  }, [user]);

  useEffect(() => {
    const filtered = birthdays.filter(b =>
      (b.name || b.employee_name || '').toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    setFilteredBirthdays(filtered);
  }, [searchTerm, birthdays]);

  const getInitials = (name) => {
    if (!name) return 'N/A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f9fa', paddingBottom: '100px' }}>
      <AppHeader />

      <main style={{ padding: '120px 26px 40px', width: '100%', margin: '0', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', width: '100%' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute', left: '0',
              background: 'white', border: 'none', width: '45px', height: '45px',
              borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', color: '#1e293b',
              transition: '0.2s transform'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '38px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              NBT Birthdays 🎂
            </h1>
            <p style={{ fontSize: '13px', fontWeight: '800', color: '#3863a8', letterSpacing: '2px', textTransform: 'uppercase', margin: '0' }}>

            </p>
          </div>
        </div>

        <div style={{ width: '100%', margin: '0 auto' }}>
          <div style={{ position: 'relative', marginBottom: '35px' }}>
            <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '18px 18px 18px 55px', borderRadius: '20px',
                border: 'none', background: 'white', fontSize: '15px',
                fontWeight: '600', outline: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', fontSize: '16px', fontWeight: '700' }}>Synchronizing Birthdays...</div>
            ) : filteredBirthdays.length > 0 ? (
              filteredBirthdays.map((item, idx) => (
                <div key={idx} style={{
                  background: 'white', borderRadius: '30px', padding: '20px 35px',
                  display: 'flex', alignItems: 'center', gap: '25px',
                  boxShadow: '0 15px 35px -5px rgba(0,0,0,0.05)', border: '1px solid rgba(241, 245, 249, 0.8)',
                  transition: '0.3s transform'
                }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: '#0f172a', color: 'white', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px',
                    flexShrink: 0, boxShadow: '0 8px 15px rgba(15, 23, 42, 0.2)'
                  }}>
                    {getInitials(item.name || item.employee_name)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: '0 0 6px 0' }}>
                      {item.name || item.employee_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px', fontWeight: '700' }}>
                      <Cake size={16} color="#f59e0b" />
                      <span>{item.formattedDate}</span>
                    </div>
                  </div>

                  <div style={{
                    padding: '8px 24px', borderRadius: '50px',
                    background: item.status === 'Passed' ? '#f1f5f9' : item.status === 'Today' ? '#fdf2f8' : '#eff6ff',
                    color: item.status === 'Passed' ? '#94a3b8' : item.status === 'Today' ? '#db2777' : '#2563eb',
                    fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }}>
                    {item.status}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '30px', border: '3px dashed #e2e8f0', color: '#94a3b8', fontWeight: '700' }}>
                No birthday records found for "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
