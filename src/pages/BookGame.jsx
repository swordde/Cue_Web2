// src/pages/BookGame.jsx
import { useState, useEffect } from "react";
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import BookingModal from "../components/BookingModal";
import { Link, useNavigate } from 'react-router-dom';
import { authUtils } from "../data/databaseUtils";
import { gameService, slotService, bookingService } from "../firebase/services";

export default function BookGame() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check authentication and load games
  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      try {
        if (!authUtils.isLoggedIn()) {
          navigate('/login');
          return;
        }
        const allGames = await gameService.getAllGames();
        setGames(allGames.filter(game => game.isActive));
        if (allGames.length > 0 && !selectedGame) {
          setSelectedGame(allGames[0].id);
        }
      } catch (err) {
        setError('Error loading games');
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
    // eslint-disable-next-line
  }, [navigate]);

  // Load slots for selected game and date
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedGame) {
        setSlots([]);
        return;
      }
      setLoading(true);
      try {
        const slotList = await slotService.getSlotsForDate(selectedDate, selectedGame);
        setSlots(slotList);
      } catch (err) {
        setError('Error loading slots');
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, [selectedDate, selectedGame]);

  const selectedGameObj = games.find(g => g.id === selectedGame);

  // Handle booking
  const handleBooking = async (bookingData) => {
    setLoading(true);
    try {
      await bookingService.createBooking({
        ...bookingData,
        game: selectedGameObj?.id,
        date: selectedDate,
        time: selectedTime,
        user: localStorage.getItem('mobile'),
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
      setAlert({ message: 'Booking successful!', type: 'success' });
      setShowModal(false);
    } catch (err) {
      setAlert({ message: 'Booking failed. Please try again.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger">
          <h4>Error Loading Games</h4>
          <p>{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
