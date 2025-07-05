import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

export default function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('bookings') || '[]');
    setBookings(stored);
  }, []);

  // Format date as yyyy-mm-dd
  const formatDate = d => d.toISOString().split('T')[0];
  const selectedDate = formatDate(date);
  const bookingsForDate = bookings.filter(b => b.date === selectedDate);

  return (
    <div className="container mt-5">
      <h2 className="mb-4">Calendar View</h2>
      <div className="d-flex flex-column flex-md-row gap-4 align-items-start">
        <Calendar
          onChange={setDate}
          value={date}
          tileContent={({ date }) => {
            const hasBooking = bookings.some(b => b.date === formatDate(date));
            return hasBooking ? <span className="badge bg-success ms-1">•</span> : null;
          }}
        />
        <div className="flex-grow-1">
          <h5 className="mt-4 mt-md-0">Bookings for {selectedDate}</h5>
          {bookingsForDate.length === 0 ? (
            <p className="text-muted">No bookings for this day.</p>
          ) : (
            <ul className="list-group">
              {bookingsForDate.map((b, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                  <span className="text-capitalize">{b.game}</span>
                  <span>{b.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 