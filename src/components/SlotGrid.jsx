// src/components/SlotGrid.jsx
import { useEffect, useState } from 'react';

export default function SlotGrid({ slots, onBook, bookedTimes = [], onCancel }) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
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
            <div key={i} className="col-12 col-sm-6 mb-3">
              <div className={`card shadow-sm h-100 d-flex flex-column align-items-center justify-content-center ${isBooked ? 'opacity-75' : ''}`} style={{ minHeight: '100px', minWidth: '120px', maxWidth: '320px' }}>
                <div className="card-body d-flex flex-column align-items-center justify-content-center p-3">
                  <span className="fw-semibold mb-1" style={{ fontSize: '1rem' }}>{time}</span>
                  <div className="dropdown mt-2">
                    <button
                      className="btn btn-outline-primary btn-sm dropdown-toggle"
                      type="button"
                      id={`dropdownMenuButton${i}`}
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      onClick={() => setDropdownOpen(dropdownOpen === i ? null : i)}
                    >
                      Actions
                    </button>
                    <ul className={`dropdown-menu${dropdownOpen === i ? ' show' : ''}`} aria-labelledby={`dropdownMenuButton${i}`} style={{ minWidth: 120 }}>
                      {!isBooked && (
                        <li><button className="dropdown-item" onClick={() => { setDropdownOpen(null); onBook(time); }}>Book</button></li>
                      )}
                      {isBooked && onCancel && (
                        <li><button className="dropdown-item text-danger" onClick={() => { setDropdownOpen(null); onCancel(time); }}>Cancel</button></li>
                      )}
                    </ul>
                  </div>
                  {isBooked ? (
                    <span className="badge bg-danger mt-2">Booked</span>
                  ) : (
                    <span className="badge bg-success mt-2">Available</span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      {showSeeMore && slots.length > 0 && (
        <div className="col-12 col-sm-6 mb-3">
          <div className="card shadow-sm h-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100px', minWidth: '120px', maxWidth: '320px' }}>
            <div className="card-body d-flex flex-column align-items-center justify-content-center p-3">
              <div className="d-flex flex-wrap gap-1 mb-2">
                <span className="rounded-circle bg-secondary d-inline-block" style={{ width: 28, height: 28 }}></span>
                <span className="rounded-circle bg-dark d-inline-block" style={{ width: 28, height: 28 }}></span>
                <span className="rounded-circle bg-info d-inline-block" style={{ width: 28, height: 28 }}></span>
                <span className="rounded-circle bg-warning d-inline-block" style={{ width: 28, height: 28 }}></span>
              </div>
              <button className="btn btn-link small text-primary fw-semibold text-decoration-underline p-0">See more &gt;</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
