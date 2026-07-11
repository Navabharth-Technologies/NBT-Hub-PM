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

          const parseDate = (dateStr) => {
            if (!dateStr) return new Date(NaN);
            if (dateStr instanceof Date) return dateStr;
            const s = String(dateStr).trim();
            // Handle ISO YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
            // Handle DD-MM-YYYY or DD/MM/YYYY
            if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
              const [d, m, y] = s.split(/[-/]/);
              return new Date(y, m - 1, d);
            }
            // Handle DD-MM or DD/MM
            if (/^\d{1,2}[-/]\d{1,2}$/.test(s)) {
              const [d, m] = s.split(/[-/]/);
              return new Date(new Date().getFullYear(), m - 1, d);
            }
            return new Date(s);
          };

          const processed = list.map(emp => {
            const rawDob = emp.dob || emp.birthday || emp.date || emp.date_of_birth || emp.birthday_date;
            const dob = parseDate(rawDob);

            let formattedDate = 'N/A';
            if (!isNaN(dob.getTime())) {
              formattedDate = dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: dob.getFullYear() >= 1900 ? 'numeric' : undefined });
            }

            if (isNaN(dob.getTime())) {
              return { ...emp, status: 'Upcoming', formattedDate: 'N/A' };
            }

            const bMonth = dob.getMonth();
            const bDay = dob.getDate();
            const bYear = dob.getFullYear();

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
              formattedDate: dob.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: bYear >= 1900 ? 'numeric' : undefined })
            };
          });

          const sorted = processed.sort((a, b) => {
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
