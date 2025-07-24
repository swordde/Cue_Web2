import React, { createContext, useContext, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  // Function to play beep sound
  const playBeepSound = useCallback(() => {
    try {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Could not play beep sound:', error);
    }
  }, []);

  // Helper function to check if we're on admin page
  const isAdminPage = useCallback(() => {
    return window.location.pathname.includes('/admin') || window.location.hash.includes('/admin');
  }, []);

  // Success toast with beep
  const showSuccess = useCallback((message, withSound = true) => {
    if (withSound) playBeepSound();
    toast.success(message, {
      duration: isAdminPage() ? Infinity : 4000, // Infinite for admin, 4s for others
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
        cursor: 'pointer',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#10B981',
      },
    });
  }, [playBeepSound, isAdminPage]);

  // Error toast with beep
  const showError = useCallback((message, withSound = true) => {
    if (withSound) playBeepSound();
    toast.error(message, {
      duration: isAdminPage() ? Infinity : 5000, // Infinite for admin, 5s for others
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
        cursor: 'pointer',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#EF4444',
      },
    });
  }, [playBeepSound, isAdminPage]);

  // Info toast with beep
  const showInfo = useCallback((message, withSound = true) => {
    if (withSound) playBeepSound();
    toast(message, {
      duration: isAdminPage() ? Infinity : 4000, // Infinite for admin, 4s for others
      position: 'top-right',
      icon: '📋',
      style: {
        background: '#3B82F6',
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
        cursor: 'pointer',
      },
    });
  }, [playBeepSound, isAdminPage]);

  // New booking toast with special styling and beep
  const showNewBooking = useCallback((bookingData, withSound = true) => {
    if (withSound) playBeepSound();
    toast((t) => (
      <div className="d-flex align-items-center">
        <div className="me-3">
          <span style={{ fontSize: '24px' }}>🎮</span>
        </div>
        <div className="flex-grow-1">
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            New Booking! 🎉
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            {bookingData.gameName} - {bookingData.date} at {bookingData.time}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            User: {bookingData.userName || bookingData.userPhone}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', fontStyle: 'italic' }}>
            Click to dismiss
          </div>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            marginLeft: '12px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Dismiss notification"
        >
          ×
        </button>
      </div>
    ), {
      duration: isAdminPage() ? Infinity : 6000, // Infinite for admin, 6s for others
      position: 'top-right',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        minWidth: '320px',
        cursor: 'pointer',
      },
      onClick: (event, toast) => {
        // Dismiss when clicking anywhere on the toast except the dismiss button
        if (!event.target.closest('button')) {
          toast.dismiss();
        }
      },
    });
  }, [playBeepSound, isAdminPage]);

  // Status change toast
  const showStatusChange = useCallback((bookingData, oldStatus, newStatus, withSound = true) => {
    if (withSound) playBeepSound();
    
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'confirmed': return '#10B981';
        case 'cancelled': return '#EF4444';
        case 'pending': return '#F59E0B';
        default: return '#6B7280';
      }
    };

    const getStatusIcon = (status) => {
      switch (status?.toLowerCase()) {
        case 'confirmed': return '✅';
        case 'cancelled': return '❌';
        case 'pending': return '⏳';
        default: return '📝';
      }
    };

    toast((t) => (
      <div className="d-flex align-items-center">
        <div className="me-3">
          <span style={{ fontSize: '20px' }}>{getStatusIcon(newStatus)}</span>
        </div>
        <div className="flex-grow-1">
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            Booking Status Updated
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            {bookingData.gameName} - {bookingData.date} at {bookingData.time}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            {oldStatus} → {newStatus}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', fontStyle: 'italic' }}>
            Click to dismiss
          </div>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            marginLeft: '12px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Dismiss notification"
        >
          ×
        </button>
      </div>
    ), {
      duration: isAdminPage() ? Infinity : 5000, // Infinite for admin, 5s for others
      position: 'top-right',
      style: {
        background: getStatusColor(newStatus),
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '16px',
        borderRadius: '10px',
        boxShadow: `0 6px 20px ${getStatusColor(newStatus)}40`,
        minWidth: '300px',
        cursor: 'pointer',
      },
      onClick: (event, toast) => {
        // Dismiss when clicking anywhere on the toast except the dismiss button
        if (!event.target.closest('button')) {
          toast.dismiss();
        }
      },
    });
  }, [playBeepSound, isAdminPage]);

  const value = {
    showSuccess,
    showError,
    showInfo,
    showNewBooking,
    showStatusChange,
    playBeepSound,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          top: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 4000, // Default to 4 seconds auto-dismiss
          style: {
            background: '#363636',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            cursor: 'pointer',
          },
          // Make all toasts clickable to dismiss
          onClick: (event, toast) => {
            toast.dismiss();
          },
        }}
      />
    </ToastContext.Provider>
  );
};
