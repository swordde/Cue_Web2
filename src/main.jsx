import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'

// Initialize Firebase first
import './firebase/config'

import Home from './pages/Home.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import UserPanel from './pages/UserPanel.jsx'
import MainPage from './pages/MainPage.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BookGame from './pages/BookGame.jsx'
import EventSelector from './components/EventSelector.jsx'
import BookingForm from './components/BookingForm.jsx'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import 'bootstrap/dist/css/bootstrap.min.css'
import { ToastProvider } from './contexts/ToastContext'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/main" element={<MainPage />} />
            <Route path="/" element={<Home />} />
            <Route path="/book" element={<BookGame />} />
            <Route path="/party" element={<EventSelector />} />
            <Route path="/booking-form" element={<BookingForm />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminPanel /></ProtectedAdminRoute>} />
            <Route path="/user" element={<UserPanel />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
)
