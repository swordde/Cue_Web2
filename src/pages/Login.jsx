import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { firebaseAuth } from "../firebase/auth";
import OtpInput from "../components/OtpInput";
import Loading from "../components/Loading";
import { useToast } from '../contexts/ToastContext';
import { userService } from '../firebase/services';
import { createToastHelper } from '../utils/commonUtils';
import styles from "./FoodOrderWelcomePage.module.css";


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
      <div
        className={styles.foodOrderWelcomePage + " min-h-screen flex flex-col md:flex-row items-center justify-center bg-cover bg-center"}
        style={{ backgroundImage: `url(/Rectangle.png)` }}
      >
        <div className={styles.overlay + " w-full h-full flex flex-col md:flex-row items-center justify-center bg-black/70 md:bg-black/60"}>
          <div className={styles.leftSection + " w-full md:w-1/2 flex flex-col items-center justify-center p-4 md:p-12 text-center md:text-left"}>
            <div className={styles.imageWrapper + " mb-2 md:mb-6"}>
              <b className={styles.welcomeTitle + " text-2xl md:text-4xl text-yellow-400 drop-shadow-lg"}>WELCOME TO CUE CLUB CAFE</b>
            </div>
            <div className={styles.description + " text-base md:text-lg max-w-md mx-auto md:mx-0"} style={{ color: '#e0e0e0' }}>
              Discover the best food from over 1,000 restaurants and fast delivery to your doorstep. We make food ordering fast, simple and free - no matter if you order online or cash.
            </div>
          </div>
          <div
            className={styles.rightSection + " w-full md:w-1/2 flex flex-col items-center justify-center p-4 md:p-12 bg-black/80 rounded-t-2xl md:rounded-l-2xl md:rounded-t-none shadow-lg"}
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
            <div className="font-bold text-2xl md:text-3xl text-yellow-400 mb-2 md:mb-4 w-full text-left">Get Started</div>
            <div className="flex justify-center mb-3 w-full gap-0 relative min-h-[48px]">
              <button
                type="button"
                className={
                  `${styles.tabButton} ${tab === 'signin' ? styles.tabButtonActive : ''}`
                }
                onClick={() => { setTab('signin'); setStep(1); setError(''); }}
              >Phone Sign In</button>
              <button
                type="button"
                className={
                  `${styles.tabButton} ${tab === 'signup' ? styles.tabButtonActive : ''}`
                }
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
            <div className="flex flex-col justify-start items-center w-full relative min-h-[370px] transition-all duration-200">
            {!loading && tab === 'signin' && step === 1 && (
              <form onSubmit={handleSendOtp} className={styles.form} style={{ maxWidth: 360, width: '100%', margin: '0 auto', marginTop: 8, minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Error message display */}
                {error && (
                  <div style={{
                    background: 'rgba(255, 0, 0, 0.12)',
                    color: '#ff5252',
                    borderRadius: 8,
                    padding: '10px 16px',
                    marginBottom: 12,
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '1rem',
                    wordBreak: 'break-word',
                    maxWidth: 340,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}>{error}</div>
                )}
                <div style={{ color: '#fff', marginBottom: 14, textAlign: 'center', width: '100%' }}>Enter your phone number to continue</div>
                <label htmlFor="mobile" className={styles.phoneLabel} style={{ color: '#FFC107', marginTop: 4, marginBottom: 4 }}>Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#181818', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #333', marginBottom: 8 }}>
                  <span style={{ background: '#232323', color: '#FFC107', fontWeight: 600, padding: '0 14px', height: 44, display: 'flex', alignItems: 'center', borderRight: '1.5px solid #333', fontSize: 16 }}>+91</span>
                  <input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    className={styles.phoneInput}
                    placeholder="Enter your phone number"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                    required
                    style={{
                      outline: 'none',
                      boxShadow: '0 0 0 2px transparent',
                      transition: 'box-shadow 0.2s',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: 16,
                      height: 44,
                      padding: '0 12px',
                      width: '100%',
                    }}
                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #FFC107'}
                    onBlur={e => e.target.style.boxShadow = '0 0 0 2px transparent'}
                  />
                </div>
                <button
                  type="submit"
                  className={styles.otpButton}
                  style={{
                    fontWeight: 600,
                    fontSize: '1.15rem',
                    marginTop: 39,
                    width: 240,
                    maxWidth: '100%',
                    alignSelf: 'center',
                    minHeight: 48,
                    borderRadius: 8,
                  }}
                >
                  {tab === 'signin' ? 'Get OTP' : 'Send OTP'}
                </button>
              </form>
            )}
            {!loading && tab === 'signin' && step === 2 && (
              <form onSubmit={handleVerifyOtp} className={styles.form} style={{ maxWidth: 360, width: '100%', margin: '0 auto', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className={styles.phoneLabel}>Enter OTP</label>
                <OtpInput length={6} onComplete={setOtp} onOtpChange={setOtp} />
                <button type="submit" className={styles.otpButton}>Verify & Login</button>
                <button type="button" className={styles.otpButton} style={{ background: resendCooldown > 0 ? '#9ca3af' : '#3b82f6', opacity: resendCooldown > 0 ? 0.6 : 1 }} onClick={handleResendOtp} disabled={resendCooldown > 0}>
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </button>
                <button type="button" className={styles.backButton} onClick={() => { setStep(1); setOtp(""); setError(""); }}>Back</button>
              </form>
            )}
            {!loading && tab === 'signup' && step === 1 && (
              <form onSubmit={handleSendOtp} className={styles.form} style={{ maxWidth: 360, width: '100%', margin: '0 auto', marginTop: 8, minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Error message display */}
                {error && (
                  <div style={{
                    background: 'rgba(255, 0, 0, 0.12)',
                    color: '#ff5252',
                    borderRadius: 8,
                    padding: '10px 16px',
                    marginBottom: 12,
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '1rem',
                    wordBreak: 'break-word',
                    maxWidth: 340,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}>{error}</div>
                )}
                <div style={{ color: '#fff', marginBottom: 14, textAlign: 'center', width: '100%' }}>Enter your details to sign up</div>
                <label htmlFor="username" className={styles.phoneLabel} style={{ color: '#FFC107', marginBottom: 4 }}>User Name</label>
                <input
                  id="username"
                  type="text"
                  className={styles.phoneInput}
                  placeholder="Enter your name"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  minLength={2}
                  style={{
                    outline: 'none',
                    boxShadow: '0 0 0 2px transparent',
                    transition: 'box-shadow 0.2s',
                    background: 'transparent',
                    border: '1.5px solid #333',
                    color: '#fff',
                    fontSize: 16,
                    height: 44,
                    padding: '0 12px',
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #FFC107'}
                  onBlur={e => e.target.style.boxShadow = '0 0 0 2px transparent'}
                />
                <label htmlFor="mobile" className={styles.phoneLabel} style={{ marginBottom: 4 }}>Phone Number</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#181818', borderRadius: 8, overflow: 'hidden', border: '1.5px solid #333', marginBottom: 8 }}>
                  <span style={{ background: '#232323', color: '#FFC107', fontWeight: 600, padding: '0 14px', height: 44, display: 'flex', alignItems: 'center', borderRight: '1.5px solid #333', fontSize: 16 }}>+91</span>
                  <input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    className={styles.phoneInput}
                    placeholder="Enter your phone number"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                    required
                    style={{
                      outline: 'none',
                      boxShadow: '0 0 0 2px transparent',
                      transition: 'box-shadow 0.2s',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: 16,
                      height: 44,
                      padding: '0 12px',
                      width: '100%',
                    }}
                    onFocus={e => e.target.style.boxShadow = '0 0 0 2px #FFC107'}
                    onBlur={e => e.target.style.boxShadow = '0 0 0 2px transparent'}
                  />
                </div>
                <button
                  type="submit"
                  className={styles.otpButton}
                  style={{
                    fontWeight: 600,
                    fontSize: '1.15rem',
                    marginTop: 8,
                    width: 240,
                    maxWidth: '100%',
                    alignSelf: 'center',
                    minHeight: 48,
                    borderRadius: 8,
                  }}
                >
                  {tab === 'signin' ? 'Get OTP' : 'Send OTP'}
                </button>
              </form>
            )}
            {!loading && tab === 'signup' && step === 2 && (
              <form onSubmit={handleVerifyOtp} className={styles.form} style={{ maxWidth: 360, width: '100%', margin: '0 auto', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className={styles.phoneLabel}>Enter OTP</label>
                <OtpInput length={6} onComplete={setOtp} onOtpChange={setOtp} />
                <button type="submit" className={styles.otpButton}>Verify & Sign Up</button>
                <button type="button" className={styles.otpButton} style={{ background: resendCooldown > 0 ? '#9ca3af' : '#3b82f6', opacity: resendCooldown > 0 ? 0.6 : 1 }} onClick={handleResendOtp} disabled={resendCooldown > 0}>
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </button>
                <button type="button" className={styles.backButton} onClick={() => { setStep(1); setOtp(""); setError(""); }}>Back</button>
              </form>
            )}
            {!loading && tab === 'email' && (
              <form onSubmit={handleEmailLogin} className={styles.form} style={{ maxWidth: 360, width: '100%', margin: '0 auto', minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label htmlFor="email" className={styles.phoneLabel}>Email</label>
                <input
                  id="email"
                  type="email"
                  className={styles.phoneInput}
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <label htmlFor="password" className={styles.phoneLabel}>Password</label>
                <input
                  id="password"
                  type="password"
                  className={styles.phoneInput}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="submit" className={styles.otpButton}>Login with Email</button>
              </form>
            )}
            <div id="recaptcha-container" style={{ marginTop: 16 }} />
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
