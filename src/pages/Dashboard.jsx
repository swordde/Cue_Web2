// src/pages/Dashboard.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authUtils } from '../data/databaseUtils';

const features = [
  { label: 'Booking', icon: '📅', path: '/book', color: 'from-blue-400 to-blue-600' },
  { label: 'Purchase', icon: '🛒', path: '/purchase', color: 'from-pink-400 to-pink-600' },
  { label: 'Gifts', icon: '🎁', path: '/gifts', color: 'from-yellow-400 to-yellow-600' },
  { label: 'Party Booking', icon: '🎉', path: '/party', color: 'from-purple-400 to-purple-600' },
  { label: 'Food/Menu', icon: '🍽️', path: '/menu', color: 'from-green-400 to-green-600' },
  { label: 'Home Delivery', icon: '🚚', path: '/delivery', color: 'from-orange-400 to-orange-600' },
  { label: 'User Panel', icon: '👤', path: '/user' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(authUtils.isAdmin());
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
      navigate('/login');
      return;
    }
    
    // Refresh current user data to ensure proper user switching
    const user = authUtils.refreshCurrentUser();
    setCurrentUser(user);
    setIsAdmin(authUtils.isAdmin());
  }, [navigate]);

  const handleLogout = () => {
    authUtils.logoutUser();
    navigate('/login');
  };

  const handleUserSwitch = (mobile) => {
    const user = authUtils.switchUser(mobile);
    if (user) {
      setCurrentUser(user);
      setIsAdmin(authUtils.isAdmin());
      // Force page refresh to update all components
      window.location.reload();
    }
  };

  return (
    <div className="container-fluid min-vh-100 bg-light d-flex flex-column">
      {/* Header */}
      <header className="w-100 bg-primary py-4 px-3 d-flex flex-column align-items-center shadow-lg position-relative rounded-bottom">
        <h1 className="display-4 text-white fw-bold mb-2">Welcome to Club Hub</h1>
        <p className="lead text-white-50 mb-3">All your club services in one place</p>
        {/* Search bar placeholder */}
        <div className="w-100" style={{ maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search services... (coming soon)"
            className="form-control mb-2"
            disabled
          />
        </div>
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn btn-light position-absolute top-0 end-0 m-3 fw-bold shadow-sm"
        >
          Logout
        </button>
      </header>
      
      {/* Admin Panel Link - Only show for admins */}
      {isAdmin && (
        <div className="container mt-3">
          <div className="alert alert-info d-flex justify-content-between align-items-center">
            <span className="fw-bold">🔧 Admin Access Available</span>
            <Link to="/admin" className="btn btn-primary btn-sm">
              Go to Admin Panel
            </Link>
          </div>
        </div>
      )}
      
      {/* User Switcher for Testing */}
      <div className="container mt-2">
        <div className="alert alert-warning">
          <small>
            <strong>🔧 Testing - User Switcher:</strong><br/>
            Current User: {currentUser?.mobile || 'Unknown'} ({currentUser?.name || 'Unknown'})<br/>
            <button 
              onClick={() => handleUserSwitch('0000000000')} 
              className="btn btn-sm btn-outline-primary me-2"
            >
              Switch to Admin
            </button>
            <button 
              onClick={() => handleUserSwitch('1234567890')} 
              className="btn btn-sm btn-outline-secondary"
            >
              Switch to Regular User
            </button>
          </small>
        </div>
      </div>
      
      {/* Feature Cards */}
      <main className="flex-grow-1 d-flex flex-column align-items-center justify-content-center py-4">
        <div className="row w-100 justify-content-center g-4" style={{ maxWidth: 900 }}>
          {features.map(f => (
            <div className="col-12 col-sm-6 col-md-4" key={f.label}>
              <div className="card h-100 shadow-sm text-center border-0 bg-white hover-shadow position-relative">
                <div className="card-body d-flex flex-column align-items-center justify-content-center p-4">
                  <span className="display-3 mb-3">{f.icon}</span>
                  <span className="h5 fw-bold mb-0">{f.label}</span>
                </div>
                <a href={f.path} className="stretched-link"></a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
