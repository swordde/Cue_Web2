import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authUtils } from '../data/databaseUtils';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const adminNumbers = ['0000000000'];

  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (/^\d{10}$/.test(mobile)) {
      setStep(2);
      setError('');
    } else {
      setError('Enter a valid 10-digit mobile number');
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp === '1234') {
      // Use the new database system for login
      const user = authUtils.loginUser(mobile);
      
      // The database system now handles admin status automatically
      // No need to manually set localStorage for admin status
      
      navigate('/dashboard');
    } else {
      setError('Invalid OTP. Try 1234 for demo.');
    }
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card p-4 shadow w-100" style={{ maxWidth: 400 }}>
        <h2 className="h4 fw-bold mb-4 text-center">Login</h2>
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <input
              type="tel"
              placeholder="Mobile Number"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              className="form-control mb-3"
              maxLength={10}
            />
            <button type="submit" className="btn btn-primary w-100 fw-bold">Send OTP</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              placeholder="Enter OTP (1234)"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              className="form-control mb-3"
              maxLength={4}
            />
            <button type="submit" className="btn btn-success w-100 fw-bold">Verify OTP</button>
          </form>
        )}
        {error && <div className="text-danger mt-3 text-center fw-bold">{error}</div>}
      </div>
    </div>
  );
} 