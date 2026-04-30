import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Cake, Gift, Heart, User, RefreshCcw, CheckCircle2 } from 'lucide-react';

const ALL_BIRTHDAYS = [
  { id: 1, name: 'Anish V N', date: 'Mar 25', status: 'Upcoming' },
  { id: 2, name: 'Sarah Jenkins', date: 'Mar 29', status: 'Upcoming' },
  { id: 3, name: 'John Doe', date: 'Apr 02', status: 'Upcoming' },
  { id: 4, name: 'Sahana N V', date: 'Jan 12', status: 'Passed' },
  { id: 5, name: 'Alex Rivera', date: 'Feb 14', status: 'Passed' },
  { id: 6, name: 'Michael Chen', date: 'May 20', status: 'Upcoming' }
];

export default function BirthdayListScreen() {
  const { user } = useAuth();

  const styles = {
    container: { backgroundColor: '#F5F4C9', minHeight: '100vh', padding: '60px 20px' },
    card: { maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', borderRadius: '40px', padding: '50px', boxShadow: '0 25px 60px rgba(56, 99, 168, 0.1)', border: '1px solid #e2e8f0' },
    header: { textAlign: 'center', marginBottom: '50px' },
    title: { fontSize: '32px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '-1.5px' },
    sub: { fontSize: '15px', color: '#3863a8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '10px', opacity: 0.7 },

    syncBadge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '30px', color: '#3863a8', fontSize: '12px', fontWeight: '900', letterSpacing: '1px' },

    list: { display: 'flex', flexDirection: 'column', gap: '20px' },
    item: (status) => ({ display: 'flex', alignItems: 'center', gap: '20px', padding: '25px', borderRadius: '25px', backgroundColor: status === 'Upcoming' ? '#f0f9ff' : '#f8fafc', border: status === 'Upcoming' ? '2px solid #3863a8' : '1px solid #f1f5f9', opacity: status === 'Passed' ? 0.6 : 1 }),
    avatar: (status) => ({ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: status === 'Upcoming' ? '#3863a8' : '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '24px' }),
    name: { fontSize: '20px', fontWeight: '900', color: '#1e293b' },
    date: { fontSize: '14px', fontWeight: '700', color: '#3863a8', marginTop: '4px' },
    statusBadge: (status) => ({ padding: '6px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', marginLeft: 'auto', backgroundColor: status === 'Upcoming' ? '#e0f2fe' : '#f1f5f9', color: status === 'Upcoming' ? '#3863a8' : '#64748b' })
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.syncBadge}><RefreshCcw size={16} /> DATA SYNCED WITH EMPLOYEE PROFILES</div>
          <Cake size={60} color="#3863a8" style={{ marginBottom: '15px' }} />
          <h1 style={styles.title}>Workforce Birthdays</h1>
          <div style={styles.sub}>Automatic Identity Synchronization Active</div>
        </div>

        <div style={styles.list}>
          {/* Dynamic User Profile Birthday Simulation */}
          <div style={{ ...styles.item('Upcoming'), border: '3px solid #3863a8', boxShadow: '0 10px 20px rgba(56, 99, 168, 0.1)' }}>
            <div style={styles.avatar('Upcoming')}>{user?.name ? user.name[0] : 'U'}</div>
            <div>
              <div style={styles.name}>{user?.name} (Your Profile)</div>
              <div style={styles.date}>Today! Mar 25 🔥</div>
            </div>
            <div style={{ ...styles.statusBadge('Upcoming'), backgroundColor: '#3863a8', color: 'white' }}>ITS YOUR DAY!</div>
          </div>

          {ALL_BIRTHDAYS.map(person => (
            <div key={person.id} style={styles.item(person.status)}>
              <div style={styles.avatar(person.status)}>{person.name[0]}</div>
              <div>
                <div style={styles.name}>{person.name}</div>
                <div style={styles.date}>{person.date} {person.status === 'Upcoming' ? '⏳' : '✅'}</div>
              </div>
              <div style={styles.statusBadge(person.status)}>{person.status.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '50px', padding: '30px', backgroundColor: '#eff6ff', borderRadius: '30px', border: '1px solid #dbeafe', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <CheckCircle2 color="#3863a8" size={24} />
          <div style={{ fontWeight: '800', fontSize: '16px', color: '#1e3a8a' }}>Profile-Driven Birthday Bot is Active</div>
        </div>
      </div>
    </div>
  );
}
