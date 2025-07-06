// src/pages/BookGame.jsx
import { useState, useEffect } from "react";
import Loading from "../components/Loading";
import { userService } from "../firebase/services";
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import BookingModal from "../components/BookingModal";
import { Link, useNavigate } from 'react-router-dom';
import { gameService, slotService, bookingService } from "../firebase/services";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";

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
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const navigate = useNavigate();

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Fetch user name from Firestore
        const userData = await userService.getUserByMobile(user.phoneNumber || user.email);
        setUserName(userData?.name || "User");
        // Fetch user's bookings for double booking prevention
        const bookings = await bookingService.getUserBookings(user.phoneNumber || user.email);
        setUserBookings(bookings);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load games only after authentication
  useEffect(() => {
    if (!currentUser) return;
    async function fetchGames() {
      setLoading(true);
      try {
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
  }, [currentUser]);

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
  }, [selectedDate, selectedGame, selectedGame]);

  const selectedGameObj = games.find(g => g.id === selectedGame);

  // Handle booking
  const handleBooking = async () => {
    if (!currentUser) {
      setAlert({ message: 'Please login to book a slot.', type: 'danger' });
      return;
    }

    setLoading(true);
    try {
      await bookingService.createBooking({
        game: selectedGameObj?.id,
        date: selectedDate,
        time: selectedTime,
        user: currentUser.phoneNumber || currentUser.email,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
      setAlert({ message: `Booking successful!\nGame: ${selectedGameObj?.name}\nDate: ${selectedDate}\nTime: ${selectedTime}` , type: 'success' });
      setShowModal(false);
      // Refresh user bookings to prevent double booking
      const bookings = await bookingService.getUserBookings(currentUser.phoneNumber || currentUser.email);
      setUserBookings(bookings);
    } catch (err) {
      setAlert({ message: 'Booking failed. Please try again.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Loading games..." />;
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
      <h1 className="h4 fw-bold mb-4 text-center">Book a Game Slot</h1>

      {/* Game Cards Horizontal Scroll */}
      <div className="mb-4" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 8 }}>
        <div style={{ display: 'inline-flex', gap: '1rem' }}>
          {games.map(game => (
            <div
              key={game.id}
              className={`card shadow-sm ${selectedGame === game.id ? 'border-primary border-2' : ''}`}
              style={{ minWidth: 220, maxWidth: 240, cursor: 'pointer', display: 'inline-block', verticalAlign: 'top' }}
              onClick={() => setSelectedGame(game.id)}
            >
              {game.image && (
                <img src={game.image} alt={game.name + ' image'} className="card-img-top" style={{ maxHeight: '140px', objectFit: 'cover' }} />
              )}
              <div className="card-body text-center">
                <h5 className="card-title mb-2">{game.name}</h5>
                {game.category && <span className="badge bg-info text-dark mb-2">{game.category}</span>}
                <div className="text-muted small mb-2">₹{game.price || 0}</div>
                {game.description && <div className="text-secondary small">{game.description.substring(0, 60)}{game.description.length > 60 ? '...' : ''}</div>}
              </div>
              {selectedGame === game.id && <div className="card-footer bg-primary text-white text-center">Selected</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <div className="row mb-4 justify-content-center">
        <div className="col-md-4 col-12">
          <label className="fw-semibold me-2">Date:</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      

      {/* Slot Grid for selected game */}
      {selectedGame ? (
        <SlotGrid
          slots={slots}
          onBook={(time) => {
            setSelectedTime(time);
            setShowModal(true);
          }}
          bookedTimes={userBookings.filter(b => b.game === selectedGame && b.date === selectedDate).map(b => b.time)}
        />
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
