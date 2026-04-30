import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Key, Lock, CheckCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../../config';

export default function UpdatePasswordModal({ isOpen, onClose, userEmail }) {
  const [resetMode, setResetMode] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleUpdate = async () => {
    const { currentPassword, otp, newPassword, confirmPassword } = passwords;

    if (!resetMode && !currentPassword) {
      setError('Please enter your current password');
      return;
    }
    if (resetMode && !otp) {
      setError('Please enter the OTP from the server terminal');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const endpoint = resetMode ? API_ENDPOINTS.PASSWORD_RESET : API_ENDPOINTS.PASSWORD_CHANGE;
      const body = resetMode 
        ? { email: userEmail, otp, newPassword }
        : { email: userEmail, oldPassword: currentPassword, newPassword };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setResetMode(false);
          setPasswords({ currentPassword: '', otp: '', newPassword: '', confirmPassword: '' });
        }, 2000);
      } else {
        setError(data.error || data.message || 'Failed to process request');
      }
    } catch (err) {
      setError('Network error. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              backgroundColor: 'white',
              width: '100%',
              maxWidth: '440px',
              borderRadius: '40px',
              padding: '40px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '30px',
                right: '30px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '14px', color: '#315A9E' }}>
                  <Shield size={24} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0B1E3F', margin: 0 }}>Update Security</h2>
              </div>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', margin: 0 }}>
                {resetMode ? 'Enter the server-generated OTP to reset your access.' : 'Refresh your credentials regularly for better security.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!resetMode ? (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Enter old password"
                      value={passwords.currentPassword}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#0B1E3F', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#315A9E', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }} onClick={() => setResetMode(true)}>FORGOT?</div>
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Security OTP (Terminal)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="otp"
                      placeholder="Enter gold-box OTP"
                      value={passwords.otp}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #fbbf24', background: '#fffbeb', fontSize: '15px', fontWeight: '900', color: '#92400e', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '4px' }}
                    />
                    <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#315A9E', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }} onClick={() => setResetMode(false)}>USE OLD PASS</div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Minimum 6 characters"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#0B1E3F', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat new password"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#0B1E3F', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', margin: '0', textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '12px' }}>
                  {error}
                </p>
              )}

              {success && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#10b981', background: '#ecfdf5', padding: '12px', borderRadius: '15px' }}>
                  <CheckCircle size={18} />
                  <span style={{ fontSize: '14px', fontWeight: '900' }}>Security credentials updated!</span>
                </div>
              )}

              <button
                onClick={handleUpdate}
                disabled={loading || success}
                style={{
                  width: '100%',
                  padding: '18px',
                  borderRadius: '20px',
                  border: 'none',
                  background: success ? '#10b981' : '#315A9E',
                  color: 'white',
                  fontWeight: '900',
                  fontSize: '16px',
                  cursor: (loading || success) ? 'not-allowed' : 'pointer',
                  marginTop: '10px',
                  boxShadow: '0 10px 25px rgba(49, 90, 158, 0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.3s'
                }}
              >
                {loading ? 'Processing SecOps...' : (success ? 'Updated' : (resetMode ? 'Reset with OTP' : 'Update Password'))}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
