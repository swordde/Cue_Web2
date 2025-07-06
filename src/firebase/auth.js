import { auth } from './config';
import { userService } from './services';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
  // Sign up with email and password

// Initialize reCAPTCHA
let recaptchaVerifier = null;

export const firebaseAuth = {
  // Initialize reCAPTCHA
  initRecaptcha(containerId) {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
        'callback': (response) => {
          console.log('reCAPTCHA solved');
        }
      });
    }
    recaptchaVerifier = window.recaptchaVerifier;
  },

  // Send OTP
  async sendOTP(phoneNumber, containerId) {
    try {
      this.initRecaptcha(containerId);
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      return confirmationResult;
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  },

  // Verify OTP and login
  async verifyOTPAndLogin(confirmationResult, otp, mobile) {
    try {
      const result = await confirmationResult.confirm(otp);
      if (result.user) {
        // Create or update user in Firestore
        // Accept username from login if provided (optional, fallback to default)
        let username = '';
        if (typeof window !== 'undefined') {
          const usernameInput = document.getElementById('username');
          if (usernameInput && usernameInput.value) {
            username = usernameInput.value.trim();
          }
        }
        const userData = {
          mobile,
          name: username || `User ${mobile.slice(-4)}`,
          // isAdmin is now only set via Firestore, not by mobile number
          totalBookings: 0,
          clubCoins: 0,
          streak: 0,
          lastLogin: new Date().toISOString(),
          isActive: true
        };

        await userService.createUser(userData);

        // Store user info in localStorage for app state (no isAdmin)
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('mobile', mobile);

        // Always fetch latest user data from Firestore for admin status
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