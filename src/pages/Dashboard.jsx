// src/pages/Dashboard.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../firebase/config';

const features = [
  { label: 'Booking', icon: '📅', path: '/book', color: 'bg-gradient-primary' },
  { label: 'Purchase', icon: '🛒', path: '/purchase', color: 'bg-gradient-pink' },
  { label: 'Gifts', icon: '🎁', path: '/gifts', color: 'bg-gradient-yellow' },
  { label: 'Party Booking', icon: '🎉', path: '/party', color: 'bg-gradient-purple' },
  { label: 'Food/Menu', icon: '🍽️', path: '/menu', color: 'bg-gradient-green' },
  { label: 'Home Delivery', icon: '🚚', path: '/delivery', color: 'bg-gradient-orange' },
  { label: 'User Panel', icon: '👤', path: '/user', color: 'bg-gradient-blue' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Use Firebase Auth to check login state and admin claim
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Check for admin custom claim
        const token = await getIdTokenResult(user, true); // force refresh
        console.log('User claims:', token.claims); // Debug: print claims
        setIsAdmin(!!token.claims.admin);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="dashboard-bg min-vh-100 d-flex flex-column">
      {/* Hero Header */}
      <header className="dashboard-hero position-relative text-white py-5 px-3 mb-4">
        <div className="container position-relative z-2">
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-between">
            <div>
              <h1 className="display-3 fw-bold mb-2 animate__animated animate__fadeInDown">Welcome to <span className="text-gradient">Club Hub</span></h1>
              <p className="lead mb-0 animate__animated animate__fadeInUp animate__delay-1s">All your club services in one beautiful place.</p>
            </div>
            {/* User Info Card */}
            {currentUser && (
              <div className="card shadow border-0 dashboard-user-card ms-md-4 mt-4 mt-md-0 animate__animated animate__fadeInRight">
                <div className="card-body d-flex align-items-center gap-3">
                  <div className="avatar-circle bg-gradient-blue text-white fw-bold fs-3">
                    {currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'U')}
                  </div>
                  <div>
                    <div className="fw-bold">{currentUser.displayName || 'User'}</div>
                    <div className="small text-muted">{currentUser.email || currentUser.phoneNumber}</div>
                  </div>
                  <button className="btn btn-outline-light btn-sm ms-2" onClick={handleLogout}>Logout</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="dashboard-hero-bg position-absolute top-0 start-0 w-100 h-100 z-1"></div>
      </header>

      {/* Admin Panel Link - Only show for admins */}
      {isAdmin && (
        <div className="container mb-3 animate__animated animate__fadeIn">
          <div className="alert alert-info d-flex justify-content-between align-items-center shadow">
            <span className="fw-bold">🔧 Admin Access Available</span>
            <Link to="/admin" className="btn btn-primary btn-sm">
              Go to Admin Panel
            </Link>
          </div>
        </div>
      )}

      {/* Feature Cards Grid */}
      <main className="flex-grow-1 d-flex flex-column align-items-center justify-content-center py-4">
        <div className="container">
          <div className="row g-4 justify-content-center">
            {features.map((f, i) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={f.label}>
                <Link to={f.path} className="text-decoration-none">
                  <div className={`dashboard-feature-card card h-100 shadow-lg border-0 text-center p-4 ${f.color} animate__animated animate__fadeInUp animate__delay-${i+1}s`}
                    style={{ minHeight: 220 }}>
                    <div className="display-1 mb-3 feature-icon">{f.icon}</div>
                    <div className="h4 fw-bold mb-0 text-white">{f.label}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Custom Styles */}
      <style>{`
        .dashboard-bg {
          background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
        }
        .dashboard-hero {
          background: none;
          overflow: hidden;
        }
        .dashboard-hero-bg {
          background: linear-gradient(120deg, #6366f1 0%, #a5b4fc 100%);
          opacity: 0.85;
          z-index: 1;
        }
        .text-gradient {
          background: linear-gradient(90deg, #6366f1, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dashboard-user-card {
          min-width: 260px;
          background: linear-gradient(90deg, #6366f1 0%, #818cf8 100%);
          color: #fff;
        }
        .avatar-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: #6366f1;
        }
        .dashboard-feature-card {
          transition: transform 0.2s, box-shadow 0.2s;
          border-radius: 1.5rem;
          background: linear-gradient(120deg, #6366f1 0%, #818cf8 100%);
          color: #fff;
        }
        .dashboard-feature-card:hover {
          transform: translateY(-8px) scale(1.04);
          box-shadow: 0 8px 32px rgba(99,102,241,0.15);
          background: linear-gradient(120deg, #818cf8 0%, #6366f1 100%);
        }
        .bg-gradient-primary { background: linear-gradient(120deg, #6366f1 0%, #818cf8 100%) !important; }
        .bg-gradient-pink { background: linear-gradient(120deg, #ec4899 0%, #f472b6 100%) !important; }
        .bg-gradient-yellow { background: linear-gradient(120deg, #f59e42 0%, #fbbf24 100%) !important; }
        .bg-gradient-purple { background: linear-gradient(120deg, #a21caf 0%, #c084fc 100%) !important; }
        .bg-gradient-green { background: linear-gradient(120deg, #22c55e 0%, #4ade80 100%) !important; }
        .bg-gradient-orange { background: linear-gradient(120deg, #f97316 0%, #fdba74 100%) !important; }
        .bg-gradient-blue { background: linear-gradient(120deg, #2563eb 0%, #60a5fa 100%) !important; }
        .feature-icon { filter: drop-shadow(0 2px 8px rgba(0,0,0,0.08)); }
        @media (max-width: 767px) {
          .dashboard-hero .display-3 { font-size: 2.2rem; }
          .dashboard-feature-card { min-height: 160px; }
        }
      `}</style>
    </div>
  );
}
