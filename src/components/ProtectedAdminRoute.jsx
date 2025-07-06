
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import Loading from './Loading';

export default function ProtectedAdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
      } else {
        const token = await getIdTokenResult(user, true);
        setIsAdmin(!!token.claims.admin);
      }
    });
    return () => unsubscribe();
  }, []);

  if (isAdmin === null) {
    return <Loading message="Checking admin access..." />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
} 