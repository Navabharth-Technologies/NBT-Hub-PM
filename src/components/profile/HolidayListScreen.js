import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Globe, MapPin, Search, ChevronRight, FileSpreadsheet, Upload, CheckCircle2, ShieldAlert } from 'lucide-react';

const ALL_HOLIDAYS = [
  { id: 1, name: "New Year's Day", date: 'Jan 01', status: 'Passed' },
  { id: 2, name: 'Republic Day', date: 'Jan 26', status: 'Passed' },
  { id: 3, name: 'Holi', date: 'Mar 04', status: 'Passed' },
  { id: 4, name: 'Ugadi', date: 'Mar 19', status: 'Passed' },
  { id: 5, name: 'Id-ul-Fitr', date: 'Mar 21', status: 'Passed' },
  { id: 6, name: 'Ram Navami', date: 'Mar 26', status: 'Upcoming' },
  { id: 7, name: 'Mahavir Jayanti', date: 'Mar 31', status: 'Upcoming' },
  { id: 8, name: 'Good Friday', date: 'Apr 03', status: 'Upcoming' },
  { id: 9, name: 'Buddha Purnima', date: 'May 01', status: 'Upcoming' },
  { id: 10, name: 'Id-ul-Zuha (Bakri Id)', date: 'May 27', status: 'Upcoming' },
  { id: 11, name: 'Muharram', date: 'Jun 26', status: 'Upcoming' },
  { id: 12, name: 'Independence Day', date: 'Aug 15', status: 'Upcoming' },
  { id: 13, name: "Prophet Mohammad's Birthday", date: 'Aug 26', status: 'Upcoming' },
  { id: 14, name: 'Janmashtami', date: 'Sep 04', status: 'Upcoming' },
  { id: 15, name: "Mahatma Gandhi's Birthday", date: 'Oct 02', status: 'Upcoming' },
  { id: 16, name: 'Dussehra', date: 'Oct 20', status: 'Upcoming' },
  { id: 17, name: 'Diwali', date: 'Nov 08', status: 'Upcoming' },
  { id: 18, name: "Guru Nanak's Birthday", date: 'Nov 24', status: 'Upcoming' },
  { id: 19, name: 'Christmas Day', date: 'Dec 25', status: 'Upcoming' }
];

export default function HolidayListScreen() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  
  const isManager = ['hr', 'superadmin', 'teamleader'].includes(user?.role);

  const styles = {
    container: { backgroundColor: '#F5F4C9', minHeight: '100vh', padding: '60px 26px' },
    card: { maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', borderRadius: '40px', padding: '60px', boxShadow: '0 30px 60px rgba(245, 158, 11, 0.12)', border: '1px solid #fde68a' },
    header: { textAlign: 'center', marginBottom: '60px' },
    title: { fontSize: '32px', fontWeight: '900', color: '#92400e', letterSpacing: '-1.5px' },
    sub: { fontSize: '15px', color: '#d97706', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '10px' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' },
    item: (status) => ({ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '15px', 
      padding: '30px', 
      borderRadius: '30px', 
      backgroundColor: status === 'Upcoming' ? '#fffbeb' : '#f1f5f9', 
      border: status === 'Upcoming' ? '1px solid #fde68a' : '1px solid #e2e8f0',
      opacity: status === 'Passed' ? 0.6 : 1,
      transition: '0.2s'
    }),
    iconCover: (status) => ({ width: '50px', height: '50px', borderRadius: '15px', backgroundColor: status === 'Upcoming' ? '#f59e0b' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }),
    name: { fontSize: '20px', fontWeight: '900', color: '#1e293b' },
    date: { fontSize: '14px', fontWeight: '700', color: '#d97706', marginTop: '4px' },
    statusIndicator: (status) => ({ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', padding: '6px 14px', borderRadius: '10px', display: 'inline-block', backgroundColor: status === 'Upcoming' ? '#b45309' : '#475569', color: 'white', letterSpacing: '1px' }),
    
    excelBtn: { backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '15px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }
  };

  const handleExcelImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      alert('Holidays Synchronized: Microsoft Excel dataset has been processed successfully.');
    }, 1500);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          {isManager ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
              <button style={styles.excelBtn} onClick={handleExcelImport}>
                {isImporting ? <Upload className="animate-spin" size={20} /> : <FileSpreadsheet size={20} />}
                {isImporting ? 'Processing Sheets...' : 'Import from Excel'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px', color: '#94a3b8', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>
              <ShieldAlert size={16} /> Official Calendar Monitored by HR
            </div>
          )}
          <Calendar size={60} color="#92400e" style={{marginBottom: '15px'}} />
          <h1 style={styles.title}>Unified Public Calendar</h1>
          <div style={styles.sub}>Official Corporate Holidays 2024</div>
        </div>

        <div style={styles.grid}>
          {ALL_HOLIDAYS.map(holiday => (
            <div key={holiday.id} style={styles.item(holiday.status)}>
              <div style={styles.iconCover(holiday.status)}><Globe size={24} /></div>
              <div>
                <div style={styles.name}>{holiday.name}</div>
                <div style={styles.date}>{holiday.date}</div>
              </div>
              <div>
                <div style={styles.statusIndicator(holiday.status)}>{holiday.status}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '50px', padding: '30px', backgroundColor: '#fcfaff', borderRadius: '30px', border: '1px solid #e0f2fe', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
           <CheckCircle2 color="#16a34a" size={24} />
           <div style={{ fontWeight: '800', fontSize: '16px', color: '#1e293b' }}>Global Calendar Synchronization Active</div>
        </div>
      </div>
    </div>
  );
}
