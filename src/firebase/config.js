// Firebase configuration
// Replace these values with your Firebase project settings

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAsb92IYziEm40mF8BZ4qfp6LfGJFGWIT4",
  authDomain: "club-booking-app.firebaseapp.com",
  projectId: "club-booking-app",
  storageBucket: "club-booking-app.appspot.com",
  messagingSenderId: "34619388004",
  appId: "1:34619388004:web:2bbe190b0ac5b0ec40ef71",
  measurementId: "G-JHD6VW9G4W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    console.log('Project ID:', firebaseConfig.projectId);
    console.log('Auth Domain:', firebaseConfig.authDomain);
    console.log('Auth initialized:', !!auth);
    console.log('Firestore initialized:', !!db);
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

export default app; 