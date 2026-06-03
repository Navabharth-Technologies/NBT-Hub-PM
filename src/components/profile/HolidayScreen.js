import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import { Calendar, ArrowLeft } from 'lucide-react';

export default function HolidayScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!user?.token) return;
      try {
        const response = await fetch(API_ENDPOINTS.HOLIDAYS, {
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
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
            if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
              const [d, m, y] = s.split(/[-/]/);
              return new Date(y, m - 1, d);
            }
            if (/^\d{1,2}[-/]\d{1,2}$/.test(s)) {
              const [d, m] = s.split(/[-/]/);
              return new Date(new Date().getFullYear(), m - 1, d);
            }
            return new Date(s);
          };

          const processed = list.map(h => {
            const hDate = parseDate(h.date || h.holiday_date);
            if (isNaN(hDate.getTime())) {
              return { ...h, status: 'Upcoming', month: 'N/A', day: 'N/A', dayName: 'N/A', originalMonth: 12, originalDay: 31 };
            }
            const hMonth = hDate.getMonth();
            const hDay = hDate.getDate();
            const hDayName = hDate.toLocaleDateString('en-US', { weekday: 'long' });
            const hMonthName = hDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

            let status = 'Upcoming';
            if (hMonth < currentMonth || (hMonth === currentMonth && hDay < currentDay)) {
              status = 'Passed';
            }

            return {
              ...h,
              status,
              month: hMonthName,
              day: hDay,
              dayName: hDayName,
              originalMonth: hMonth,
              originalDay: hDay
            };
          });

          const sorted = processed.sort((a, b) => {
            if (a.originalMonth !== b.originalMonth) return a.originalMonth - b.originalMonth;
            return a.originalDay - b.originalDay;
          });

          setHolidays(sorted);
        }
      } catch (err) {
        console.error('Holidays fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f9fa', paddingBottom: '100px' }}>
      <AppHeader />
      
      <main style={{ padding: winWidth < 768 ? '100px 16px 40px' : '120px 40px 40px', width: '100%', margin: '0', boxSizing: 'border-box', position: 'relative' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ 
            position: 'absolute', left: winWidth < 768 ? '16px' : '40px', top: winWidth < 768 ? '90px' : '110px', 
            background: 'white', border: 'none', width: '45px', height: '45px', 
            borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', color: '#1e293b',
            transition: '0.2s transform', zIndex: 10
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '16px', background: 'white', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.05)', border: '1.5px solid #e2e8f0'
          }}>
            <Calendar size={30} color="#3863a8" />
          </div>
          <h1 style={{ fontSize: winWidth < 768 ? '28px' : '38px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>
            Company Holidays
          </h1>
          <p style={{ fontSize: '13px', fontWeight: '800', color: '#3863a8', letterSpacing: '2px', textTransform: 'uppercase' }}>
            NBT HOLIDAY CALENDAR 2026
          </p>
        </div>

        <div style={{ width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: winWidth < 768 ? '1fr' : winWidth < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '25px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '60px', color: '#64748b' }}>Loading holidays...</div>
            ) : holidays.length > 0 ? (
              holidays.map((h, idx) => (
                <div key={idx} style={{ 
                  background: h.status === 'Passed' ? '#f8fafc' : 'white', borderRadius: '24px', padding: '25px', 
                  display: 'flex', alignItems: 'center', gap: '20px', 
                  boxShadow: h.status === 'Upcoming' ? '0 15px 35px -5px rgba(34,197,94,0.15)' : '0 4px 12px rgba(0,0,0,0.03)', border: h.status === 'Upcoming' ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  transition: '0.3s transform', position: 'relative', overflow: 'hidden',
                  opacity: h.status === 'Passed' ? 0.6 : 1
                }}>
                  <div style={{ 
                    width: '70px', height: '85px', borderRadius: '18px', 
                    background: h.status === 'Passed' ? '#94a3b8' : '#3863a8', color: 'white', display: 'flex', 
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>{h.month}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900' }}>{h.day}</div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: h.status === 'Passed' ? '#94a3b8' : '#3863a8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{h.dayName}</div>
                    <h3 style={{ fontSize: '17px', fontWeight: '900', color: h.status === 'Passed' ? '#64748b' : '#1e293b', margin: 0 }}>{h.holiday_name || h.name}</h3>
                  </div>

                  <div style={{ 
                    position: 'absolute', top: '15px', right: '15px', 
                    padding: '4px 12px', borderRadius: '50px', 
                    background: h.status === 'Passed' ? '#f1f5f9' : '#e0f2fe',
                    color: h.status === 'Passed' ? '#94a3b8' : '#3863a8',
                    fontSize: '10px', fontWeight: '900', textTransform: 'uppercase'
                  }}>
                    {h.status}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '60px', background: 'white', borderRadius: '24px', border: '2px dashed #cbd5e1' }}>No holidays found</div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
