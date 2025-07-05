import { auth } from './config';
import { userService } from './services';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  signOut 
} from 'firebase/auth';

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
        const userData = {
          mobile,
          name: `User ${mobile.slice(-4)}`,
          isAdmin: mobile === '0000000000', // Admin number
          totalBookings: 0,
          clubCoins: 0,
          streak: 0,
          lastLogin: new Date().toISOString(),
          isActive: true
        };

        await userService.createUser(userData);

        // Store user info in localStorage for app state
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('mobile', mobile);
        localStorage.setItem('isAdmin', userData.isAdmin ? 'true' : 'false');

        return userData;
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

  // Check if user is admin
  isAdmin() {
    return localStorage.getItem('isAdmin') === 'true';
  },

  // Get current user from Firestore
  async getCurrentUser() {
    const mobile = this.getCurrentUserMobile();
    if (!mobile) return null;
    return await userService.getUserByMobile(mobile);
  }
}; 