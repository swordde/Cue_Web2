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
      
      // Create new reCAPTCHA with options for v2 fallback
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
        'callback': () => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          // Reset the reCAPTCHA
          try {
            window.recaptchaVerifier.clear();
            this.initRecaptcha(containerId);
          } catch (e) {
            console.error('Error resetting reCAPTCHA:', e);
          }
        }
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
      const firebaseUser = result.user;

      // Determine if this is a newly created Firebase Auth user (first time this phone number signs in)
      const isNewFirebaseAuthUser = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime;

      // Always attempt to fetch the Firestore user data using the authenticated mobile.
      // This is now safe because the user is authenticated, and your rules allow reading own data.
      const existingFirestoreUser = await userService.getUserByMobile(mobile);

      console.log('🔍 Processing OTP verification:', {
        mobile,
        isNewFirebaseAuthUser,
        existingFirestoreUser: !!existingFirestoreUser, // Convert to boolean for logging
        providedUsername: usernameFromParam,
        authUid: firebaseUser.uid
      });

      let userDataForFirestore = null;
      let requiresProfileCompletion = false;

      if (existingFirestoreUser) {
        // User exists in Firestore: It's a sign-in.
        // Update last login timestamp.
        console.log('🔄 Updating existing user login time in Firestore.');
        await userService.updateUser(existingFirestoreUser.id, {
          lastLogin: new Date().toISOString()
        });
        userDataForFirestore = existingFirestoreUser;
      } else {
        // User does NOT exist in Firestore: This is a new user for your 'users' collection.
        // We need to collect their name.
        console.log('✨ No Firestore profile found. Requires name for completion.');
        requiresProfileCompletion = true;
        // If username is provided at this step (from a 'signup' path that no longer exists in Login.jsx),
        // we can create the user immediately. Otherwise, Login.jsx will prompt for it.
        if (usernameFromParam) {
          console.log('✅ Name provided, creating new user profile in Firestore.');
          const username = usernameFromParam.trim().replace(/\b\w+/g, word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          );
          userDataForFirestore = {
            mobile,
            name: username,
            totalBookings: 0,
            clubCoins: 0,
            streak: 0,
            lastLogin: new Date().toISOString(),
            isActive: true,
            email: firebaseUser.email || null, // Capture email if available from other auth methods
            uid: firebaseUser.uid // Store Firebase Auth UID for future reference
          };
          await userService.createUser(userDataForFirestore);
          requiresProfileCompletion = false; // Profile created
        }
      }

      // Store user info in localStorage regardless of new/existing status
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('mobile', mobile);
      localStorage.setItem('uid', firebaseUser.uid); // Store UID for consistency

      // Return structured response
      return {
        success: true,
        requiresProfileCompletion,
        userData: userDataForFirestore || { mobile, uid: firebaseUser.uid } // Return basic data if profile not yet created
      };
    } catch (error) {
      console.error('Error verifying OTP and processing login:', error);
      // Re-throw specific Firebase Auth errors for Login.jsx to handle (e.g., 'auth/invalid-verification-code')
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

  // Get current user UID
  getCurrentUserUid() {
    return localStorage.getItem('uid');
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
    const uid = this.getCurrentUserUid();
    if (!mobile && !uid) return null;
    // Prefer fetching by UID if available, fallback to mobile if needed
    let user = null;
    if (uid) {
      user = await userService.getUserByUid(uid); // Assuming you'll add getUserByUid to userService
    }
    if (!user && mobile) {
      user = await userService.getUserByMobile(mobile);
    }
    return user;
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
