// src/pages/BookGame.jsx
import { useState, useEffect } from "react";
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import BookingModal from "../components/BookingModal";
import { Link, useNavigate } from 'react-router-dom';
import { bookingUtils, authUtils } from "../data/databaseUtils";
import adminSettings from "../data/adminSettings.js";

export default function BookGame() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const navigate = useNavigate();

  // Check authentication and load games
  useEffect(() => {
    if (!authUtils.isLoggedIn()) {
      navigate('/login');
      return;
    }
    
    // Load games from admin settings
    const availableGames = adminSettings.getGames().filter(game => game.isActive);
    setGames(availableGames);
    
    // Set first game as default if available
    if (availableGames.length > 0 && !selectedGame) {
      setSelectedGame(availableGames[0].id);
    }
  }, [navigate, selectedGame]);

  // Get slots from admin settings
  const slots = adminSettings.getSlotsForDate(selectedDate)[selectedGame] || [];
  const selectedGameObj = games.find(g => g.id === selectedGame);

  // Show alert for 3 seconds
  const showAlert = (message, type) => {
    setAlert({ message, type });
    setTimeout(() => setAlert({ message: '', type: '' }), 3000);
  };

  const handleBooking = () => {
    try {
      // Use the new database system to create booking
      const booking = bookingUtils.createBooking({
        game: selectedGame,
        date: selectedDate,
        time: selectedTime,
        amount: 0, // Default amount
        notes: ''
      });
      
      showAlert(`Booking request submitted for ${selectedGameObj.name} at ${selectedTime} on ${selectedDate}. Awaiting admin approval.`, 'success');
      setShowModal(false);
    } catch (error) {
      showAlert('Error creating booking. Please try again.', 'danger');
    }
  };

  return (
    <div className="container my-5">
      {alert.message && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" onClick={() => setAlert({ message: '', type: '' })}></button>
        </div>
      )}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/dashboard" className="btn btn-secondary">Go to Dashboard</Link>
      </div>
      <h1 className="h3 fw-bold mb-4 text-center"> Book a Game Slot</h1>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-6 mb-2">
          <label className="fw-semibold me-2">Game:</label>
          <select
            className="form-select d-inline-block w-auto"
            value={selectedGame}
            onChange={e => setSelectedGame(e.target.value)}
          >
            <option value="">Select a game</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-6 mb-2">
          <label className="fw-semibold me-2">Date:</label>
          <input
            type="date"
            className="form-control d-inline-block w-auto"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Prominent Game Card */}
      {selectedGameObj && (
        <div className="card shadow-sm mb-4 p-4 d-flex flex-column align-items-center border-primary border-2">
          {selectedGameObj?.image && (
            <img
              src={selectedGameObj.image}
              alt={selectedGameObj.name}
              className="mb-3 rounded shadow"
              style={{ width: '120px', height: '120px', objectFit: 'cover' }}
            />
          )}
          <h2 className="h4 fw-bold text-primary mb-2">{selectedGameObj?.name}</h2>
          <p className="text-muted mb-2">₹{selectedGameObj?.price || 0}</p>
          {selectedGameObj?.description && (
            <p className="text-center text-muted small">{selectedGameObj.description}</p>
          )}
        </div>
      )}

      {selectedGame ? (
        <SlotGrid slots={slots} onBook={(time) => {
          setSelectedTime(time);
          setShowModal(true);
        }} />
      ) : (
        <div className="text-center text-muted py-5">
          <h5>Please select a game to view available slots</h5>
        </div>
      )}

      {showModal && (
        <BookingModal
          time={selectedTime}
          date={selectedDate}
          game={selectedGameObj}
          onClose={() => setShowModal(false)}
          onConfirm={handleBooking}
        />
      )}
      <div className="d-flex justify-content-center mt-4">
        <Link to="/user" className="btn btn-outline-info">Back to User Panel</Link>
      </div>
    </div>
  );
}
