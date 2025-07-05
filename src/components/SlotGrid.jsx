// src/components/SlotGrid.jsx
import { useEffect, useState } from 'react';
import bookingDB from '../data/bookingDatabase.js';

export default function SlotGrid({ slots, onBook, selectedGame, selectedDate }) {
  const [bookedTimes, setBookedTimes] = useState([]);

  // Get booked times for the selected date and game
  useEffect(() => {
    const bookings = bookingDB.getAllBookings();
    const bookedForDate = bookings.filter(b => 
      b.date === selectedDate && 
      b.game === selectedGame && 
      b.status !== 'Cancelled'
    );
    setBookedTimes(bookedForDate.map(b => b.time));
  }, [selectedDate, selectedGame]);

  // Determine if we need a 'See more' card
  const maxCards = 4;
  const showSeeMore = slots.length > maxCards;
  const displaySlots = showSeeMore ? slots.slice(0, maxCards - 1) : slots;

  return (
    <div className="row mb-4">
      {slots.length === 0 ? (
        <div className="col-12 text-center py-4">
          <div className="text-muted">
            <h5>No slots available for this date</h5>
            <p className="small">Please check back later or contact admin to add slots.</p>
          </div>
        </div>
      ) : (
                displaySlots.map((time, i) => {
          const isBooked = bookedTimes.includes(time);
          return (
            <div key={i} className="col-6 mb-3">
              <div className={`card shadow-sm h-100 d-flex flex-column align-items-center justify-content-center ${isBooked ? 'opacity-50' : ''}`} style={{ minHeight: '100px', minWidth: '120px', maxWidth: '180px' }}>
                <div className="card-body d-flex flex-column align-items-center justify-content-center p-3">
                  <span className="fw-semibold mb-1" style={{ fontSize: '1rem' }}>{time}</span>
                  {isBooked ? (
                    <span className="badge bg-danger mb-2">Booked</span>
                  ) : (
                    <span className="badge bg-success mb-2">Available</span>
                  )}
                  {!isBooked && (
                    <button
                      onClick={() => onBook(time)}
                      className="btn btn-outline-primary btn-sm mt-1"
                    >
                      Book
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      {showSeeMore && slots.length > 0 && (
        <div className="col-6 mb-3">
          <div className="card shadow-sm h-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100px', minWidth: '120px', maxWidth: '180px' }}>
            <div className="card-body d-flex flex-column align-items-center justify-content-center p-3">
              <div className="d-flex flex-wrap gap-1 mb-2">
                <span className="rounded-circle bg-secondary d-inline-block" style={{ width: 28, height: 28 }}></span>
                <span className="rounded-circle bg-dark d-inline-block" style={{ width: 28, height: 28 }}></span>
                <span className="rounded-circle bg-info d-inline-block" style={{ width: 28, height: 28 }}></span>
                <span className="rounded-circle bg-warning d-inline-block" style={{ width: 28, height: 28 }}></span>
              </div>
              <a href="#" className="small text-primary fw-semibold text-decoration-underline">See more &gt;</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
