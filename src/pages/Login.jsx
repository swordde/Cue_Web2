import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "../firebase/auth";
import OtpInput from "../components/OtpInput";
import Loading from "../components/Loading";
import { useToast } from '../contexts/ToastContext';
import { userService } from '../firebase/services';
import { createToastHelper } from '../utils/commonUtils';
import styles from "./Login.module.css";


export default function Login() {
  const [tab, setTab] = useState("signin"); // "signin", "signup", or "email"
  const [step, setStep] = useState(1); // 1: enter mobile/email, 2: enter OTP
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  // Helper function to show toasts based on type
  const showToast = createToastHelper({ showSuccess, showError, showInfo });

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle video completion and navigation to dashboard
  const handleVideoComplete = () => {
    setShowVideo(false);
    navigate("/dashboard");
  };

  // Auto-navigate to dashboard after video plays
  useEffect(() => {
    if (showVideo) {
      const timer = setTimeout(() => {
        handleVideoComplete();
      }, 5000); // Video duration
      return () => clearTimeout(timer);
    }
  }, [showVideo]);

  // Handle send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      showToast("Enter a valid phone number", "error");
      setError("Enter a valid phone number");
      return;
    }
    if (tab === "signup" && (!username || username.trim().length < 2)) {
      showToast("Enter a valid username (at least 2 characters)", "error");
      setError("Enter a valid username (at least 2 characters)");
      return;
    }
    
    // Additional validation for username: no special characters except spaces, hyphens, and apostrophes
    if (tab === "signup" && username.trim()) {
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(username.trim())) {
        showToast("Name should only contain letters, spaces, hyphens, and apostrophes", "error");
        setError("Name should only contain letters, spaces, hyphens, and apostrophes");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      if (tab === "signup") {
        try {
          const existingUser = await userService.getUserByMobile(mobile);
          if (existingUser) {
            showToast("This phone number is already registered. Please use 'Phone Sign In' instead.", "error");
            setError("This phone number is already registered. Please use 'Phone Sign In' instead.");
            setLoading(false);
            return;
          }
        } catch (error) {
          console.log('Could not check for existing user, proceeding with signup:', error);
        }
      }
      // For signin, check if user exists
      if (tab === "signin") {
        try {
          const existingUser = await userService.getUserByMobile(mobile);
          if (!existingUser) {
            showToast("No account found for this phone number. Please use 'Phone Sign Up' to create an account.", "error");
            setError("No account found for this phone number. Please use 'Phone Sign Up' to create an account.");
            setLoading(false);
            return;
          }
        } catch (error) {
          console.log('Could not check for user existence:', error);
        }
      }
      const phoneNumber = mobile.startsWith("+") ? mobile : "+91" + mobile;
      const result = await firebaseAuth.sendOTP(phoneNumber, "recaptcha-container");
      setConfirmationResult(result);
      setStep(2);
      setResendCooldown(30); // Set initial cooldown timer
      showToast(tab === "signup" ? "OTP sent! Verify to create your account." : "OTP sent successfully!", "success");
    } catch (err) {
      console.error('OTP send error:', err);
      if (err.code === 'auth/invalid-app-credential') {
        showToast("Phone authentication not configured. Please enable Phone Authentication in Firebase Console.", "error");
        setError("Phone authentication not configured. Please enable Phone Authentication in Firebase Console.");
      } else if (err.code === 'auth/too-many-requests') {
        showToast("Too many attempts. Please wait 5-10 minutes before trying again.", "error");
        setError("Too many attempts. Please wait 5-10 minutes before trying again.");
      } else {
        showToast("Failed to send OTP. Please try again.", "error");
        setError("Failed to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) {
      showToast(`Please wait ${resendCooldown} seconds before resending`, "warning");
      return;
    }
    setLoading(true);
    try {
      const phoneNumber = mobile.startsWith("+") ? mobile : "+91" + mobile;
      const result = await firebaseAuth.resendOTP(phoneNumber, "recaptcha-container");
      setConfirmationResult(result);
      showToast("New OTP sent successfully!", "success");
      setResendCooldown(30);
    } catch (err) {
      console.error('Resend OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle email login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      showToast("Enter a valid email address", "error");
      return;
    }
    if (!password || password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await firebaseAuth.signInWithEmail(email, password);
      const userData = await userService.getUserByEmail(email);
      if (userData && userData.isActive === false) {
        await firebaseAuth.logout();
        showToast('Your account has been deactivated. Please contact support.', 'error');
        return;
      }
      showToast('Login successful!', 'success');
      setShowVideo(true); // Show video instead of navigating
    } catch (err) {
      showToast("Invalid email or password", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submit
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      showToast("Enter the 6-digit OTP", "error");
      return;
    }
    
    // For signup, ensure username is provided and trimmed
    if (tab === "signup") {
      const trimmedUsername = username.trim();
      if (!trimmedUsername || trimmedUsername.length < 2) {
        showToast("Please enter a valid username (at least 2 characters)", "error");
        return;
      }
      
      // Additional validation for username format
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(trimmedUsername)) {
        showToast("Name should only contain letters, spaces, hyphens, and apostrophes", "error");
        return;
      }
    }
    
    setLoading(true);
    try {
      // Pass the trimmed username for signup, empty string for signin
      const usernameToPass = tab === "signup" ? username.trim() : "";
      console.log('Verifying OTP with username:', usernameToPass, 'for mobile:', mobile);
      
      await firebaseAuth.verifyOTPAndLogin(confirmationResult, otp, mobile, usernameToPass);
      const userData = await userService.getUserByMobile(mobile);
      if (userData && userData.isActive === false) {
        await firebaseAuth.logout();
        showToast('Your account has been deactivated. Please contact support.', 'error');
        return;
      }
      showToast(tab === "signup" ? 'Account created successfully!' : 'Login successful!', 'success');
      setShowVideo(true); // Show video instead of navigating
    } catch (err) {
      console.error('OTP verification error:', err);
      showToast("Invalid OTP. Please check and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes gradientShift {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}
      </style>
      {loading && createPortal(
        <Loading />, 
        document.body
      )}
      <div className={styles.loginPage} style={{ backgroundImage: `url(/Rectangle.png)` }}>
        <div className={styles.overlay}>
          <div className={styles.leftSection}>
            <div className="mb-2 md:mb-6">
              <b className={styles.welcomeTitle}>
                WELCOME TO <span style={{
                  fontFamily: '"Abril Fatface", "Anton", "Bebas Neue", "Impact", "Arial Black", cursive',
                  letterSpacing: '2px'
                }}>CUE CLUB CAFÉ</span>
              </b>
            </div>
            <div className={styles.description}>
              Discover the best food from over 1,000 restaurants and fast delivery to your doorstep. We make food ordering fast, simple and free - no matter if you order online or cash.
            </div>
          </div>
          <div className={styles.rightSection}
            tabIndex={0}
            onKeyDown={e => {
              if (e.ctrlKey && e.code === 'Space') {
                setTab('email');
                setError('');
              }
            }}
          >
            {/* Forms section, Get Started style for signin */}
            {/* Forms section, Get Started style for signin */}
            {/* Get Started heading above the tab buttons */}
            <div className={styles.getStartedTitle}>Get Started</div>
            <div className={styles.tabContainer}>
              <button
                type="button"
                className={`${styles.tabButton} ${tab === 'signin' ? styles.tabButtonActive : ''}`}
                onClick={() => { setTab('signin'); setStep(1); setError(''); }}
              >Phone Sign In</button>
              <button
                type="button"
                className={`${styles.tabButton} ${tab === 'signup' ? styles.tabButtonActive : ''}`}
                onClick={() => { setTab('signup'); setStep(1); setError(''); }}
              >Phone Sign Up</button>
              {/* Secret Email Login button, hidden visually but accessible via keyboard or a small icon */}
              <button
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: 'transparent',
                }}
                tabIndex={-1}
                aria-label="Secret Email Login"
                onClick={() => { setTab('email'); setError(''); }}
              >Email Login</button>
            </div>
            <div className={styles.formContainer}>
            {!loading && tab === 'signin' && step === 1 && (
              <form onSubmit={handleSendOtp} className={styles.form}>
                {/* Error message display */}
                {error && (
                  <div className={styles.errorMessage}>{error}</div>
                )}
                <div className={styles.instructionText}>Enter your phone number to continue</div>
                <div className={styles.inputGroup}>
                  <label htmlFor="mobile" className={styles.inputLabel}>Phone Number</label>
                  <div className={styles.phoneInputContainer}>
                    <span className={styles.countryCode}>+91</span>
                    <input
                      id="mobile"
                      type="tel"
                      maxLength={10}
                      className={styles.input}
                      placeholder="Enter your phone number"
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className={styles.primaryButton}>
                  Get OTP
                </button>
              </form>
            )}
            {!loading && tab === 'signin' && step === 2 && (
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Enter OTP</label>
                  <OtpInput length={6} onComplete={setOtp} onOtpChange={setOtp} />
                </div>
                <button type="submit" className={styles.primaryButton}>Verify & Login</button>
                <button 
                  type="button" 
                  className={styles.secondaryButton} 
                  onClick={handleResendOtp} 
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </button>
                <button 
                  type="button" 
                  className={styles.backButton} 
                  onClick={() => { setStep(1); setOtp(""); setError(""); }}
                >
                  Back
                </button>
              </form>
            )}
            {!loading && tab === 'signup' && step === 1 && (
              <form onSubmit={handleSendOtp} className={styles.form}>
                {/* Error message display */}
                {error && (
                  <div className={styles.errorMessage}>{error}</div>
                )}
                <div className={styles.inputGroup}>
                  <label htmlFor="username" className={styles.inputLabel}>User Name</label>
                  <input
                    id="username"
                    type="text"
                    className={styles.textInput}
                    placeholder="Enter your name"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="mobile" className={styles.inputLabel}>Phone Number</label>
                  <div className={styles.phoneInputContainer}>
                    <span className={styles.countryCode}>+91</span>
                    <input
                      id="mobile"
                      type="tel"
                      maxLength={10}
                      className={styles.input}
                      placeholder="Enter your phone number"
                      value={mobile}
                      onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className={styles.primaryButton}>
                  Send OTP
                </button>
              </form>
            )}
            {!loading && tab === 'signup' && step === 2 && (
              <form onSubmit={handleVerifyOtp} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Enter OTP</label>
                  <OtpInput length={6} onComplete={setOtp} onOtpChange={setOtp} />
                </div>
                <button type="submit" className={styles.primaryButton}>Verify & Sign Up</button>
                <button 
                  type="button" 
                  className={styles.secondaryButton} 
                  onClick={handleResendOtp} 
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </button>
                <button 
                  type="button" 
                  className={styles.backButton} 
                  onClick={() => { setStep(1); setOtp(""); setError(""); }}
                >
                  Back
                </button>
              </form>
            )}
            {!loading && tab === 'email' && (
              <form onSubmit={handleEmailLogin} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email" className={styles.inputLabel}>Email</label>
                  <input
                    id="email"
                    type="email"
                    className={styles.textInput}
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="password" className={styles.inputLabel}>Password</label>
                  <input
                    id="password"
                    type="password"
                    className={styles.textInput}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.primaryButton}>Login with Email</button>
              </form>
            )}
            <div id="recaptcha-container" className={styles.recaptchaContainer} />
            <div className={styles.terms}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Overlay */}
      {showVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#000',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          {/* Animated background as fallback */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(45deg, #1e3c72, #2a5298, #1e3c72, #2a5298)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 4s ease-in-out infinite',
            zIndex: -1
          }} />
          
          <video
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
            muted
            autoPlay
            playsInline
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
            onEnded={handleVideoComplete}
            onError={() => console.log('Video failed to load - using fallback background')}
            onLoadedData={() => console.log('Video loaded successfully')}
          >
            <source src="/assets/video-loading.mp4" type="video/mp4" />
            <source src="/assets/video-loading.webm" type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </>
  );
}
