import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    async function testConnection() {
      try {
        // Test Firestore
        const testCollection = collection(db, 'test');
        await getDocs(testCollection);
        
        // Test Auth
        await auth.signOut(); // Test if auth is initialized
        
        setStatus('Firebase connection successful! ✅');
      } catch (error) {
        console.error('Firebase test failed:', error);
        setStatus(`Firebase connection failed: ${error.message} ❌`);
      }
    }

    testConnection();
  }, []);

  return (
    <div style={{ 
      padding: '20px',
      margin: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px'
    }}>
      <h3>Firebase Connection Test</h3>
      <p>{status}</p>
    </div>
  );
} 