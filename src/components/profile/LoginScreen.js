import React, { useState } from 'react';
import loginBg from '../../assets/login Bg image.png';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Info, Eye, EyeOff } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  React.useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(56, 99, 168, 0.85)), url("${loginBg}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    },
    card: {
      width: '100%',
      maxWidth: winWidth < 480 ? '100%' : '450px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: winWidth < 480 ? '30px' : '40px',
      padding: winWidth < 480 ? '35px 25px' : '50px 40px',
      boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
      textAlign: 'center'
    },
    logo: {
      width: winWidth < 480 ? '80px' : '100px',
      height: 'auto',
      maxHeight: '100px',
      objectFit: 'contain',
      margin: '0 auto 25px',
      display: 'block'
    },
    title: { fontSize: winWidth < 480 ? '28px' : '36px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', letterSpacing: '-1.5px' },
    subtitle: { fontSize: winWidth < 480 ? '13px' : '15px', color: '#64748b', marginBottom: winWidth < 480 ? '30px' : '45px', fontWeight: '800', letterSpacing: '0.5px' },

    label: { fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'left', display: 'block', marginBottom: '10px' },
    inputGroup: { marginBottom: '20px' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0 15px', borderRadius: '20px', border: '1px solid #f1f5f9' },
    input: { flex: 1, padding: winWidth < 480 ? '12px' : '15px', fontSize: '15px', fontWeight: '700', color: '#1e293b', border: 'none', background: 'transparent', outline: 'none' },

    loginBtn: { width: '100%', padding: winWidth < 480 ? '16px' : '20px', borderRadius: '20px', border: 'none', backgroundColor: '#3863a8', color: 'white', fontSize: '16px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 25px rgba(56,99,168,0.3)', marginTop: winWidth < 480 ? '25px' : '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' },

    infoBox: { marginTop: '30px', padding: '18px', backgroundColor: '#f0f9ff', borderRadius: '20px', border: '1px solid #e0f2fe', textAlign: 'left', display: 'flex', gap: '12px', color: '#3863a8', fontSize: '12px', lineHeight: '1.4' }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert('Please provide credentials');
    setIsLoggingIn(true);
    setMessage('');
    const result = await login(email, password);
    if (!result.success) {
      setMessage(result.error);
      setIsLoggingIn(false);
    } else {
      localStorage.removeItem('hideAlignmentDemo'); // Reset demo preference on fresh login
      setMessage('Establishing Connection... Success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <img src={logo} alt="NBT Logo" style={styles.logo} />
        <h1 style={styles.title}>NBT Hub</h1>
        <p style={styles.subtitle}>smarter solutions for better future</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Official Identity (Email)</label>
          <div style={styles.inputWrapper}>
            <Mail size={18} color="#94a3b8" />
            <input
              style={styles.input}
              placeholder="e.g. sahana@navshub.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Identity Passkey</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} color="#94a3b8" />
            <input
              style={styles.input}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 5px' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <Eye size={18} color="#3863a8" /> : <EyeOff size={18} color="#94a3b8" />}
            </button>
          </div>
        </div>

        <button
          style={{ ...styles.loginBtn, opacity: isLoggingIn ? 0.7 : 1, cursor: isLoggingIn ? 'not-allowed' : 'pointer' }}
          onClick={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? 'Connecting...' : <><LogIn size={20} /> Establish Connection</>}
        </button>

        {message && (
          <p style={{ marginTop: '20px', fontSize: '14px', fontWeight: '900', color: message.includes('Success') ? '#16a34a' : '#ef4444' }}>
            {message}
          </p>
        )}

        <div style={styles.infoBox}>
          <Info size={28} />
          <div>
            <strong>Identity Tip:</strong> Login access is restricted to verified employees only. Roles are identified by authentication tokens.
          </div>
        </div>
      </div>
    </div>
  );
}
