import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firebaseAuth } from '../firebase/auth';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (firebaseAuth.isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For demo purposes, we'll use a simple OTP verification
      // In production, you'd use Firebase Phone Auth
      if (mobile === '0000000000') {
        // Admin user - skip OTP for demo
        const userData = {
          mobile,
          name: 'Admin User',
          isAdmin: true,
          totalBookings: 0,
          clubCoins: 0,
          streak: 0,
          lastLogin: new Date().toISOString(),
          isActive: true
        };

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('mobile', mobile);
        localStorage.setItem('isAdmin', 'true');
        
        navigate('/dashboard');
      } else {
        // Regular user - show OTP step
        setStep(2);
      }
    } catch (error) {
      setError('Error sending OTP. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp !== '1234') {
      setError('Invalid OTP. Try 1234 for demo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create user data
      const userData = {
        mobile,
        name: `User ${mobile.slice(-4)}`,
        isAdmin: false,
        totalBookings: 0,
        clubCoins: 0,
        streak: 0,
        lastLogin: new Date().toISOString(),
        isActive: true
      };

      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('mobile', mobile);
      localStorage.setItem('isAdmin', 'false');
      
      navigate('/dashboard');
    } catch (error) {
      setError('Error verifying OTP. Please try again.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
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
              disabled={loading}
            />
            <button 
              type="submit" 
              className="btn btn-primary w-100 fw-bold"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
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
              disabled={loading}
            />
            <button 
              type="submit" 
              className="btn btn-success w-100 fw-bold"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}
        
        {error && (
          <div className="text-danger mt-3 text-center fw-bold">
            {error}
          </div>
        )}
        
        <div className="mt-3 text-center">
          <small className="text-muted">
            Demo: Use 1234 as OTP for any number
          </small>
        </div>
      </div>
    </div>
  );
} 