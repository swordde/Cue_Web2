import { auth } from './config';
import { userService } from './services';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';

// Initialize reCAPTCHA
let recaptchaVerifier = null;

// reCAPTCHA site key - you need to get this from Firebase Console
// Go to Firebase Console → Authentication → Settings → Advanced → reCAPTCHA
const RECAPTCHA_SITE_KEY = '6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Replace with your actual site key

export const firebaseAuth = {
  // Initialize reCAPTCHA
  async initRecaptcha(containerId) {
    try {
      // Clear any existing reCAPTCHA first
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('reCAPTCHA clear error:', e);
        }
        delete window.recaptchaVerifier;
      }
      
      // Also clear the global recaptchaVerifier
      recaptchaVerifier = null;
      
      // Wait for container to be available
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`reCAPTCHA container '${containerId}' not found`);
      }
      
      // Check if there's already a reCAPTCHA in the container
      const existingRecaptcha = container.querySelector('.grecaptcha-badge');
      if (existingRecaptcha) {
        // Remove existing reCAPTCHA elements
        const recaptchaElements = container.querySelectorAll('[id^="recaptcha"]');
        recaptchaElements.forEach(el => el.remove());
      }
      
      // Create new reCAPTCHA without site key (uses Firebase default)
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible'
      });
      
      recaptchaVerifier = window.recaptchaVerifier;
      
      // Render the reCAPTCHA
      await recaptchaVerifier.render();
      return recaptchaVerifier;
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      throw error;
    }
  },

  // Send OTP
  async sendOTP(phoneNumber, containerId) {
    try {
      // Initialize and render reCAPTCHA
      await this.initRecaptcha(containerId);
      
      // Ensure phone number is in correct format
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        formattedPhone = `+91${phoneNumber}`;
      }
      
      // Wait a moment for reCAPTCHA to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send OTP
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      return confirmationResult;
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      // Clear reCAPTCHA on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('reCAPTCHA clear error:', e);
        }
        delete window.recaptchaVerifier;
      }
      recaptchaVerifier = null;
      
      // Provide specific error message
      if (error.code === 'auth/invalid-app-credential') {
        const customError = new Error('Phone authentication not configured. Please enable Phone Authentication in Firebase Console.');
        customError.code = error.code;
        throw customError;
      }
      
      throw error;
    }
  },

  // Reset reCAPTCHA and send new OTP (for retry)
  async resendOTP(phoneNumber, containerId) {
    try {
      // Completely clear existing reCAPTCHA
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('reCAPTCHA clear error:', e);
        }
        delete window.recaptchaVerifier;
      }
      recaptchaVerifier = null;
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create completely new reCAPTCHA and send OTP
      await this.initRecaptcha(containerId);
      
      // Ensure phone number is in correct format
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        formattedPhone = `+91${phoneNumber}`;
      }
      
      // Wait a moment for reCAPTCHA to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      return confirmationResult;
    } catch (error) {
      console.error('Error resending OTP:', error);
      
      // Clear reCAPTCHA on error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.log('reCAPTCHA clear error:', e);
        }
        delete window.recaptchaVerifier;
      }
      recaptchaVerifier = null;
      
      throw error;
    }
  },

  // Verify OTP and login
  async verifyOTPAndLogin(confirmationResult, otp, mobile, usernameFromParam) {
    try {
      const result = await confirmationResult.confirm(otp);
      if (result.user) {
        // Use the username from the parameter, fallback to DOM, then fallback to default
        let username = usernameFromParam;
        if (!username && typeof window !== 'undefined') {
          const usernameInput = document.getElementById('username');
          if (usernameInput && usernameInput.value) {
            username = usernameInput.value.trim();
          }
        }
        
        // Check if user already exists
        const existingUser = await userService.getUserByMobile(mobile);
        
        const userData = {
          mobile,
          // For existing users, preserve their data. For new users, use provided username
          name: existingUser ? existingUser.name : (username || `User ${mobile.slice(-4)}`),
          totalBookings: existingUser?.totalBookings || 0,
          clubCoins: existingUser?.clubCoins || 0,
          streak: existingUser?.streak || 0,
          lastLogin: new Date().toISOString(),
          isActive: existingUser ? existingUser.isActive : true
        };
        
        // Only create user if they don't already exist
        if (!existingUser) {
          await userService.createUser(userData);
        }
        
        // Store user info in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('mobile', mobile);
        
        // Always fetch latest user data from Firestore
        const latestUser = await userService.getUserByMobile(mobile);
        return latestUser || userData;
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('mobile');
      localStorage.removeItem('isAdmin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  },

  // Check if user is logged in
  isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
  },

  // Get current user mobile
  getCurrentUserMobile() {
    return localStorage.getItem('mobile');
  },

  // Check if user is admin (fetches from Firestore)
  async isAdmin() {
    const mobile = this.getCurrentUserMobile();
    if (!mobile) return false;
    const user = await userService.getUserByMobile(mobile);
    return user && user.isAdmin === true;
  },

  // Get current user from Firestore
  async getCurrentUser() {
    const mobile = this.getCurrentUserMobile();
    if (!mobile) return null;
    return await userService.getUserByMobile(mobile);
  },

  // Sign in with email and password
  async signInWithEmail(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Always fetch user data from Firestore by email
    let userData = null;
    try {
      userData = await userService.getUserByEmail ? await userService.getUserByEmail(email) : null;
    } catch (e) {
      // fallback: no userService.getUserByEmail
    }
    // Return the latest user data (including isAdmin)
    return {
      ...userCredential.user,
      ...userData
    };
  }
};
