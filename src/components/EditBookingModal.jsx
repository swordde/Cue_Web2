import { useState, useEffect } from "react";

export default function EditBookingModal({ booking, bookings = [], editingBookingIndex, onClose, onSave }) {
  const [game, setGame] = useState(booking.game);
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Filter out times already booked for the same game and date, except the current booking's time
  const bookedTimes = bookings
    .filter((b, i) => i !== editingBookingIndex && b.game === game && b.date === date)
    .map(b => b.time);

  const slots = (mockSlots[date]?.[game] || []).filter(
    t => !bookedTimes.includes(t) || t === booking.time
  );

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.4)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5 mb-0">Edit Booking</h2>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Game:</label>
              <select className="form-select" value={game} onChange={e => setGame(e.target.value)}>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date:</label>
              <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Time:</label>
              <select className="form-select" value={time} onChange={e => setTime(e.target.value)}>
                {slots.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={() => onSave({ game, date, time })} className="btn btn-primary">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
} 