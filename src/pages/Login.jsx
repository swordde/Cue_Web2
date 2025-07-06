
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "../firebase/auth";
import OtpInput from "../components/OtpInput";
import Loading from "../components/Loading";

export default function Login() {
  const [tab, setTab] = useState("phone"); // "phone" or "email"
  const [step, setStep] = useState(1); // 1: enter mobile/email, 2: enter OTP
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Handle mobile submit
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      // Firebase expects +91 for India, adjust as needed
      const phoneNumber = mobile.startsWith("+") ? mobile : "+91" + mobile;
      const result = await firebaseAuth.sendOTP(phoneNumber, "recaptcha-container");
      setConfirmationResult(result);
      setStep(2);
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle email login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await firebaseAuth.signInWithEmail(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submit
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      // Attach username to DOM for firebaseAuth.verifyOTPAndLogin (if needed)
      setTimeout(() => {
        const input = document.getElementById("username");
        if (input) input.value = username;
      }, 0);
      // Pass username to the verifyOTPAndLogin function if it supports it
      await firebaseAuth.verifyOTPAndLogin(confirmationResult, otp, mobile, username);
      navigate("/dashboard");
    } catch (err) {
      setError("OTP verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && createPortal(
        <Loading />,
        document.body
      )}
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <span role="img" aria-label="table tennis" style={{ fontSize: 32 }}>🏓</span>
          </div>
          <h2 style={{ fontWeight: 700, fontSize: 28, margin: 0, color: '#222' }}>Welcome Back</h2>
          <div style={{ color: '#666', fontSize: 15, marginTop: 4, textAlign: 'center' }}>Enter your phone number to continue</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <button
            style={{
              padding: '10px 28px',
              border: 'none',
              borderRadius: '8px 0 0 8px',
              fontWeight: 600,
              background: tab === 'phone' ? '#2563eb' : '#f3f4f6',
              color: tab === 'phone' ? '#fff' : '#2563eb',
              cursor: 'pointer',
              outline: 'none',
              fontSize: 16,
              borderRight: '1px solid #d1d5db',
              transition: 'background 0.2s'
            }}
            onClick={() => { setTab('phone'); setError(''); }}
          >Phone</button>
          <button
            style={{
              padding: '10px 28px',
              border: 'none',
              borderRadius: '0 8px 8px 0',
              fontWeight: 600,
              background: tab === 'email' ? '#2563eb' : '#f3f4f6',
              color: tab === 'email' ? '#fff' : '#2563eb',
              cursor: 'pointer',
              outline: 'none',
              fontSize: 16,
              borderLeft: '1px solid #d1d5db',
              transition: 'background 0.2s'
            }}
            onClick={() => { setTab('email'); setError(''); }}
          >Email</button>
        </div>
        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 0', borderRadius: 8, marginBottom: 16, textAlign: 'center', fontSize: 14 }}>{error}</div>
        )}
        {/* Only show forms if not loading */}
        {!loading && tab === 'phone' && step === 1 && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="username" style={{ display: 'block', color: '#222', fontWeight: 500, marginBottom: 6 }}>User Name</label>
              <input
                id="username"
                type="text"
                style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#f9fafb', fontSize: 16, padding: '12px', outline: 'none' }}
                placeholder="Enter your name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="mobile" style={{ display: 'block', color: '#222', fontWeight: 500, marginBottom: 6 }}>Phone Number</label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#f9fafb' }}>
                <span style={{ padding: '0 12px', color: '#222', fontWeight: 600, fontSize: 16 }}>+91</span>
                <input
                  id="mobile"
                  type="tel"
                  maxLength={10}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, padding: '12px 0' }}
                  placeholder="Enter your phone number"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: '12px 0', background: '#3b82f6', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, fontSize: 16, marginTop: 8, cursor: 'pointer' }}
            >
              Send OTP
            </button>
          </form>
        )}
        {!loading && tab === 'phone' && step === 2 && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', color: '#222', fontWeight: 500, marginBottom: 6 }}>Enter OTP</label>
              <OtpInput length={6} onComplete={setOtp} onOtpChange={setOtp} />
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: '12px 0', background: '#10b981', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, fontSize: 16, marginTop: 8, cursor: 'pointer' }}
            >
              Verify & Login
            </button>
            <button
              type="button"
              style={{ width: '100%', padding: '12px 0', background: '#f3f4f6', color: '#222', fontWeight: 700, border: 'none', borderRadius: 8, fontSize: 16, marginTop: 8, cursor: 'pointer' }}
              onClick={() => { setStep(1); setOtp(""); setError(""); }}
            >
              Back
            </button>
          </form>
        )}
        {!loading && tab === 'email' && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="email" style={{ display: 'block', color: '#222', fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input
                id="email"
                type="email"
                style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#f9fafb', fontSize: 16, padding: '12px', outline: 'none' }}
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label htmlFor="password" style={{ display: 'block', color: '#222', fontWeight: 500, marginBottom: 6 }}>Password</label>
              <input
                id="password"
                type="password"
                style={{ width: '100%', border: '1.5px solid #d1d5db', borderRadius: 8, background: '#f9fafb', fontSize: 16, padding: '12px', outline: 'none' }}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: '12px 0', background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, fontSize: 16, marginTop: 8, cursor: 'pointer' }}
            >
              Login with Email
            </button>
          </form>
        )}
        <div id="recaptcha-container" style={{ marginTop: 16 }} />
        </div>
      </div>
    </>
  );
}
