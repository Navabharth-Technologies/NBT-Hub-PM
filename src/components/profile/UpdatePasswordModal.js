import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Key, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { API_ENDPOINTS } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function UpdatePasswordModal({ isOpen, onClose, userEmail }) {
  const { logout } = useAuth();
  const [resetMode, setResetMode] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [logoutAllDevices, setLogoutAllDevices] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let timer;
    if (resetMode && countdown > 0 && !otpVerified) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resetMode, countdown, otpVerified]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleForgotPassword = async () => {
    if (!userEmail) {
      setError('Please provide an email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfoMsg(null);
    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_REQUEST_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setResetMode(true);
        setCountdown(30);
        setInfoMsg('OTP sent successfully! Please check your email.');
        setError(null);
      } else {
        setError(data.error || data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Network error. Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!passwords.otp) {
      setError('Please enter the OTP');
      return;
    }
    setVerifyingOtp(true);
    setError(null);
    setInfoMsg(null);
    try {
      const endpoint = `${API_ENDPOINTS.LOGIN.replace('/api/login', '')}/api/password/verify-otp`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, otp: passwords.otp })
      });

      const data = await response.json();
      if (response.ok) {
        setOtpVerified(true);
        setInfoMsg('OTP verified successfully!');
        setError(null);
      } else {
        if (response.status === 404) {
          console.warn('verify-otp endpoint not found, falling back to client-side confirmation');
          setOtpVerified(true);
          setError(null);
        } else {
          setError(data.error || data.message || 'Invalid OTP');
        }
      }
    } catch (err) {
      console.warn('Network error or endpoint not found, falling back to client-side confirmation', err);
      setOtpVerified(true);
      setError(null);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleUpdate = async () => {
    const { currentPassword, otp, newPassword, confirmPassword } = passwords;

    if (!resetMode && !currentPassword) {
      setError('Please enter your current password');
      return;
    }
    if (resetMode && !otp) {
      setError('Please enter the OTP sent to your email');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
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
        ? { email: userEmail, otp, newPassword, logoutAllDevices }
        : { email: userEmail, oldPassword: currentPassword, newPassword, logoutAllDevices };

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
          logout();
          window.location.href = './';
        }, 3000);
      } else {
        setError(data.error || data.message || 'Failed to process request');
      }
    } catch (err) {
      setError('Network error. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResetMode(false);
    setOtpVerified(false);
    setVerifyingOtp(false);
    setInfoMsg(null);
    setCountdown(0);
    setError(null);
    setSuccess(false);
    setPasswords({
      currentPassword: '',
      otp: '',
      newPassword: '',
      confirmPassword: ''
    });
    onClose();
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
              onClick={handleClose}
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
                {resetMode ? `An OTP has been sent to ${userEmail}.` : 'Change Your Password'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!resetMode ? (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass.current ? "text" : "password"}
                      name="currentPassword"
                      placeholder="Enter old password"
                      value={passwords.currentPassword}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#0B1E3F', outline: 'none', boxSizing: 'border-box', paddingRight: '100px' }}
                    />
                    <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowPass({ ...showPass, current: !showPass.current })}>
                        {showPass.current ? <Eye size={16} color="#315A9E" /> : <EyeOff size={16} />}
                      </div>
                      <div style={{ color: '#315A9E', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }} onClick={handleForgotPassword}>forgot?</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>Security OTP (Email)</label>
                    <div style={{ color: '#315A9E', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }} onClick={() => { setResetMode(false); setOtpVerified(false); setInfoMsg(null); setCountdown(0); }}>USE OLD PASS</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="otp"
                      placeholder="Enter security OTP"
                      value={passwords.otp}
                      onChange={handleChange}
                      disabled={otpVerified}
                      style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #fbbf24', background: otpVerified ? '#f8fafc' : '#fffbeb', fontSize: '15px', fontWeight: '900', color: otpVerified ? '#64748b' : '#92400e', outline: 'none', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '2px' }}
                    />
                  </div>

                  {!otpVerified && (
                    <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px' }}>
                      {countdown > 0 ? (
                        <span style={{ color: '#94a3b8', fontWeight: '600' }}>
                          Resend OTP in <strong style={{ color: '#475569' }}>{countdown}s</strong>
                        </span>
                      ) : (
                        <span
                          onClick={handleForgotPassword}
                          style={{ color: '#315A9E', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Resend OTP
                        </span>
                      )}
                    </div>
                  )}

                  {!otpVerified && (
                    <button
                      onClick={handleVerifyOtp}
                      disabled={loading || verifyingOtp}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '18px',
                        border: 'none',
                        background: '#fbbf24',
                        color: '#92400e',
                        fontWeight: '900',
                        fontSize: '14px',
                        cursor: (loading || verifyingOtp) ? 'not-allowed' : 'pointer',
                        marginTop: '15px',
                        boxShadow: '0 8px 20px rgba(251, 191, 36, 0.2)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {verifyingOtp ? 'Verifying OTP...' : 'Confirm OTP'}
                    </button>
                  )}
                </div>
              )}

              {(!resetMode || otpVerified) && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.new ? "text" : "password"}
                        name="newPassword"
                        placeholder="Minimum 6 characters"
                        value={passwords.newPassword}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#0B1E3F', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div
                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                        onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                      >
                        {showPass.new ? <Eye size={16} color="#315A9E" /> : <EyeOff size={16} />}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.confirm ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Repeat new password"
                        value={passwords.confirmPassword}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '16px 20px', borderRadius: '18px', border: '1.5px solid #eef2f6', background: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#0B1E3F', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div
                        style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                        onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                      >
                        {showPass.confirm ? <Eye size={16} color="#315A9E" /> : <EyeOff size={16} />}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <input
                      type="checkbox"
                      id="logoutAllDevices"
                      checked={logoutAllDevices}
                      onChange={(e) => setLogoutAllDevices(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#315A9E' }}
                    />
                    <label htmlFor="logoutAllDevices" style={{ fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
                      Logout from all other devices
                    </label>
                  </div>
                </>
              )}

              {infoMsg && (
                <p style={{ color: '#315A9E', fontSize: '13px', fontWeight: '700', margin: '0', textAlign: 'center', background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>
                  {infoMsg}
                </p>
              )}

              {error && (
                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', margin: '0', textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '12px' }}>
                  {error}
                </p>
              )}

              {success && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#10b981', background: '#ecfdf5', padding: '12px', borderRadius: '15px' }}>
                  <CheckCircle size={18} />
                  <span style={{ fontSize: '14px', fontWeight: '900' }}>Your password has been changed. Please relogin.</span>
                </div>
              )}

              {(!resetMode || otpVerified) && (
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
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
