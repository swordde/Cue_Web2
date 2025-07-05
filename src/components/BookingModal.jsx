// src/components/BookingModal.jsx
import { useEffect } from "react";

export default function BookingModal({ time, date, game, onClose, onConfirm }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.4)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5 mb-0">Submit Booking Request</h2>
          </div>
          <div className="modal-body flex flex-col items-center">
            {game?.image && (
              <img src={game.image} alt={game.name} className="w-32 h-32 object-cover rounded-xl mb-3 shadow" />
            )}
            <p className="text-lg mb-1">Game: <b>{game?.name}</b></p>
            <p className="mb-1">Date: <b>{date}</b></p>
            <p className="mb-1">Time: <b>{time}</b></p>
            {game?.price && (
              <p className="mb-3 text-success">Price: <b>₹{game.price}</b></p>
            )}
            <div className="alert alert-info text-center">
              <small>This booking will be reviewed by admin before confirmation.</small>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={onConfirm} className="btn btn-primary">Submit Request</button>
          </div>
        </div>
      </div>
    </div>
  );
}
