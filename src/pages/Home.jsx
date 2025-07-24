// src/pages/Home.jsx
import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container-fluid d-flex flex-column justify-content-center align-items-center min-vh-100 px-3" style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
      textAlign: 'center'
    }}>
      <div className="text-center" style={{
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 className="display-3 text-primary fw-bold mb-3" style={{
          fontSize: 'clamp(2rem, 8vw, 3.5rem)',
          lineHeight: '1.2',
          marginBottom: 'clamp(1rem, 4vw, 2rem)'
        }}>
          🎮 Club Booking
        </h1>
        <p className="lead mb-4" style={{
          fontSize: 'clamp(1rem, 3.5vw, 1.25rem)',
          marginBottom: 'clamp(1.5rem, 5vw, 2.5rem)',
          color: '#6c757d'
        }}>
          Book slots, track leaderboards, and earn rewards.
        </p>
        
        <div className="d-flex flex-column gap-3 align-items-center" style={{
          width: '100%',
          maxWidth: '300px',
          margin: '0 auto'
        }}>
          <Link 
            to="/dashboard" 
            className="btn btn-primary btn-lg w-100" 
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.1rem)',
              padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
              borderRadius: '25px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            🚀 Go to Dashboard
          </Link>
          
          <Link 
            to="/user" 
            className="btn btn-outline-info btn-lg w-100"
            style={{
              fontSize: 'clamp(0.9rem, 2.8vw, 1rem)',
              padding: 'clamp(10px, 2.5vw, 14px) clamp(20px, 5vw, 32px)',
              borderRadius: '25px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            👤 User Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
