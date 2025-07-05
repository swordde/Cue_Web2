import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import UserPanel from './pages/UserPanel.jsx'
import MainPage from './pages/MainPage.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BookGame from './pages/BookGame.jsx'
import DeploymentTest from './pages/DeploymentTest.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger">
            <h4>Something went wrong!</h4>
            <p>Please refresh the page or contact support.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize databases
try {
  // Import and initialize databases
  import('./data/databaseUtils.js').then(({ authUtils }) => {
    console.log('Database utils loaded successfully');
  });
  
  import('./data/adminSettings.js').then((adminSettings) => {
    console.log('Admin settings loaded successfully');
    adminSettings.default.init();
  });
} catch (error) {
  console.error('Error initializing databases:', error);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/main" element={<MainPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<BookGame />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/user" element={<UserPanel />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/test" element={<DeploymentTest />} />
          {/* Add more routes here as needed */}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
