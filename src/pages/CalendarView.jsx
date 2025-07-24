import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import { gameService } from "../firebase/services";
import { resolveGameName } from '../utils/commonUtils';

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [games, setGames] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('bookings') || '[]');
    setBookings(stored);
    // Fetch all games once
    gameService.getAllGames().then(setGames);
  }, []);

  // Format date as yyyy-mm-dd
  const formatDate = d => d.toISOString().split('T')[0];
  const selectedDate = formatDate(date);
  const bookingsForDate = bookings.filter(b => b.date === selectedDate);

  return (
    <div className="container-fluid px-2 px-md-3 mt-3 mt-md-5" style={{
      minHeight: '100vh',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Mobile-friendly header */}
      <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4 flex-wrap">
        <h2 className="mb-0" style={{
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 'bold'
        }}>📅 Calendar View</h2>
      </div>
      
      {/* Mobile-responsive layout */}
      <div className="d-flex flex-column flex-lg-row gap-3 gap-md-4 align-items-start">
        {/* Calendar section */}
        <div className="w-100" style={{
          maxWidth: '100%',
          flex: '0 0 auto'
        }}>
          <div className="d-flex justify-content-center mb-3">
            <Calendar
              onChange={setDate}
              value={date}
              className="w-100"
              style={{
                maxWidth: '400px',
                fontSize: 'clamp(0.8rem, 2.5vw, 1rem)'
              }}
              tileContent={({ date }) => {
                const hasBooking = bookings.some(b => b.date === formatDate(date));
                return hasBooking ? <span className="badge bg-success ms-1" style={{fontSize: '0.6rem'}}>•</span> : null;
              }}
            />
          </div>
        </div>
        
        {/* Bookings section */}
        <div className="flex-grow-1 w-100" style={{
          minWidth: 0
        }}>
          <h5 className="mt-3 mt-lg-0 mb-3" style={{
            fontSize: 'clamp(1.1rem, 3.5vw, 1.3rem)',
            fontWeight: '600'
          }}>
            Bookings for {new Date(selectedDate).toLocaleDateString()}
          </h5>
          {bookingsForDate.length === 0 ? (
            <div className="text-center py-4" style={{
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              border: '1px dashed #ccc'
            }}>
              <p className="text-muted mb-0" style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
              }}>📅 No bookings for this day.</p>
            </div>
          ) : (
            <div className="list-group">
              {bookingsForDate.map((b, i) => (
                <div key={i} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2" style={{
                  borderRadius: '8px',
                  marginBottom: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
                }}>
                  <span className="text-capitalize fw-medium" style={{
                    minWidth: '0',
                    flex: '1'
                  }}>
                    🎮 {resolveGameName(b.game, games)}
                  </span>
                  <span className="badge bg-primary" style={{
                    fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)',
                    padding: '6px 12px'
                  }}>
                    ⏰ {b.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 