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
    <div className="container-fluid min-vh-100 px-3" style={{
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: 'white'
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 50%, rgba(255, 193, 7, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 193, 7, 0.06) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(255, 193, 7, 0.04) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }}></div>
      
      {/* Hero Section */}
      <div className="row min-vh-100 align-items-center justify-content-center" style={{position: 'relative', zIndex: 1}}>
        <div className="col-12 col-lg-10 col-xl-8">
          <div className="text-center mb-5">
            <div className="mb-4" style={{
              fontSize: 'clamp(4rem, 12vw, 8rem)',
              lineHeight: '1'
            }}>
              
            </div>
            <h1 className="display-2 fw-bold mb-4" style={{
              fontSize: 'clamp(2.5rem, 8vw, 4rem)',
              lineHeight: '1.1',
              background: 'linear-gradient(135deg, #ffc107 0%, #ffbf00 50%, #fff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none'
            }}>
              Welcome to <span style={{
                color: '#ffc107',
                fontFamily: '"Abril Fatface", "Anton", "Bebas Neue", "Impact", "Arial Black", cursive',
                letterSpacing: '2px',
                textShadow: '0 0 10px rgba(255, 193, 7, 0.3)'
              }}>Cue Club Café</span>
            </h1>
            <p className="lead mb-5" style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
              maxWidth: '700px',
              margin: '0 auto 3rem',
              opacity: '0.9',
              lineHeight: '1.6'
            }}>
              Your ultimate gaming destination! Book premium gaming sessions, compete in tournaments, 
              celebrate special events, and enjoy delicious food & beverages - all in one place.
            </p>
          </div>

          {/* Features Grid */}
          <div className="row g-4 mb-5">
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-center p-4" style={{
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ffc107';
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}></div>
                <h5 className="fw-bold mb-2" style={{color: '#ffc107'}}>Premium Gaming</h5>
                <p className="small mb-0" style={{opacity: '0.8'}}>
                  PS5,Pool,Snooker,Darts & More
                </p>
              </div>
            </div>
            
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-center p-4" style={{
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ffc107';
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}></div>
                <h5 className="fw-bold mb-2" style={{color: '#ffc107'}}>Event Management</h5>
                <p className="small mb-0" style={{opacity: '0.8'}}>
                  Birthday Parties & Corporate Events
                </p>
              </div>
            </div>
            
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-center p-4" style={{
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ffc107';
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}></div>
                <h5 className="fw-bold mb-2" style={{color: '#ffc107'}}>Food & Hospitality</h5>
                <p className="small mb-0" style={{opacity: '0.8'}}>
                  Premium Dining & Beverages
                </p>
              </div>
            </div>
            
            <div className="col-12 col-md-6 col-lg-3">
              <div className="text-center p-4" style={{
                background: 'rgba(30, 30, 30, 0.8)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ffc107';
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}></div>
                <h5 className="fw-bold mb-2" style={{color: '#ffc107'}}>Gifts & Rewards</h5>
                <p className="small mb-0" style={{opacity: '0.8'}}>
                  Gift Cards & Special Vouchers
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center align-items-center" style={{
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <Link 
                to="/dashboard" 
                className="btn btn-lg" 
                style={{
                  fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                  padding: 'clamp(12px, 3vw, 16px) clamp(24px, 6vw, 40px)',
                  borderRadius: '50px',
                  fontWeight: '600',
                  background: 'linear-gradient(45deg, #ffc107, #ffb300)',
                  color: '#000',
                  border: 'none',
                  boxShadow: '0 8px 25px rgba(255, 193, 7, 0.3)',
                  transition: 'all 0.3s ease',
                  minWidth: '200px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 193, 7, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 193, 7, 0.3)';
                }}
              >
                 Go to Dashboard
              </Link>
              
              <Link 
                to="/user" 
                className="btn btn-lg"
                style={{
                  fontSize: 'clamp(0.9rem, 2.8vw, 1.1rem)',
                  padding: 'clamp(10px, 2.5vw, 14px) clamp(24px, 6vw, 40px)',
                  borderRadius: '50px',
                  fontWeight: '500',
                  background: 'rgba(30, 30, 30, 0.8)',
                  color: '#ffc107',
                  border: '2px solid #ffc107',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  minWidth: '200px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ffc107';
                  e.currentTarget.style.color = '#000';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 193, 7, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(30, 30, 30, 0.8)';
                  e.currentTarget.style.color = '#ffc107';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                User Panel
              </Link>
            </div>
            
            {/* App Description */}
            <div className="mt-5 pt-4" style={{
              borderTop: '1px solid rgba(255,255,255,0.2)',
              maxWidth: '600px',
              margin: '3rem auto 0'
            }}>
              <p className="small" style={{
                opacity: '0.7',
                lineHeight: '1.8',
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
              }}>
                <strong>Cue Club Café</strong> is your comprehensive booking platform for gaming sessions, 
                event planning, and dining experiences. Track your bookings, view real-time availability, 
                earn rewards, and enjoy seamless service management - all through our intuitive interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
