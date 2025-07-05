import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authUtils } from "../data/databaseUtils";
import bookingDB from "../data/bookingDatabase.js";
import { gameService, slotService } from "../firebase/services";

export default function AdminPanel() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings');
  const navigate = useNavigate();
  const [filterGame, setFilterGame] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // Admin settings state
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedGame, setSelectedGame] = useState("");
  const [slots, setSlots] = useState([]);
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newGame, setNewGame] = useState({ name: "", price: 0, category: "", isActive: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authUtils.isAdmin()) {
      navigate('/dashboard');
      return;
    }
    
    loadData();
  }, [navigate]);

  const loadData = () => {
    const allBookings = bookingDB.getAllBookings();
    setBookings(allBookings);
    loadGames();
    loadSlots();
  };

  const handleDelete = (bookingId) => {
    bookingDB.deleteBooking(bookingId);
    loadData();
  };

  const handleStatusChange = (bookingId, newStatus) => {
    bookingDB.updateBookingStatus(bookingId, newStatus);
    loadData();
  };

  // Filter bookings
  const filteredBookings = bookings.filter(b =>
    (filterGame === '' || b.game === filterGame) &&
    (filterDate === '' || b.date === filterDate)
  );

  // Load games from Firestore
  const loadGames = async () => {
    setLoading(true);
    try {
      const allGames = await gameService.getAllGames();
      setGames(allGames);
    } catch (err) {
      setError("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  // Load slots for selected game and date from Firestore
  const loadSlots = async () => {
    if (!selectedGame || !selectedDate) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const slotList = await slotService.getSlotsForDate(selectedDate, selectedGame);
      setSlots(slotList);
    } catch (err) {
      setError("Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  // Add new slot to Firestore
  const handleAddSlot = async () => {
    if (!selectedGame || !selectedDate || !newSlotTime) return;
    setLoading(true);
    try {
      const updatedSlots = [...slots, newSlotTime];
      await slotService.updateSlotsForDate(selectedDate, selectedGame, updatedSlots);
      setSlots(updatedSlots);
      setNewSlotTime("");
    } catch (err) {
      setError("Failed to add slot");
    } finally {
      setLoading(false);
    }
  };

  // Remove slot from Firestore
  const handleDeleteSlot = async (slotTime) => {
    if (!selectedGame || !selectedDate) return;
    setLoading(true);
    try {
      const updatedSlots = slots.filter((s) => s !== slotTime);
      await slotService.updateSlotsForDate(selectedDate, selectedGame, updatedSlots);
      setSlots(updatedSlots);
    } catch (err) {
      setError("Failed to delete slot");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async () => {
    if (!newGame.name) return;
    setLoading(true);
    try {
      await gameService.addGame(newGame);
      const allGames = await gameService.getAllGames();
      setGames(allGames);
      setNewGame({ name: "", price: 0, category: "", isActive: true });
    } catch (err) {
      setError("Failed to add game");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId) => {
    setLoading(true);
    try {
      await gameService.deleteGame(gameId);
      setGames(games.filter(g => g.id !== gameId));
    } catch (err) {
      setError("Failed to delete game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Admin Panel</h2>
        <div>
          <button 
            onClick={() => {
              localStorage.removeItem('adminSettings');
              adminSettings.init();
              loadData();
              alert('Admin settings reset!');
            }} 
            className="btn btn-warning me-2"
          >
            Reset Settings
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📋 Bookings
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            ⏰ Slot Management
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            🎮 Game Management
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
        </li>
      </ul>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div>
          <div className="row mb-3">
            <div className="col-md-4 mb-2">
              <label className="fw-semibold me-2">Game:</label>
              <select
                className="form-select"
                value={filterGame}
                onChange={e => setFilterGame(e.target.value)}
              >
                <option value="">All Games</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 mb-2">
              <label className="fw-semibold me-2">Date:</label>
              <input
                type="date"
                className="form-control"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
          </div>
          
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>#</th>
                <th>Game</th>
                <th>Date</th>
                <th>Time</th>
                <th>User</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No bookings found.</td></tr>
              ) : (
                filteredBookings.map((b, i) => (
                  <tr key={b.id || i}>
                    <td>{i + 1}</td>
                    <td className="text-capitalize">{b.game}</td>
                    <td>{b.date}</td>
                    <td>{b.time}</td>
                    <td>{b.user || 'Unknown'}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={b.status || 'Pending'}
                        onChange={e => handleStatusChange(b.id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleDelete(b.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Slot Management Tab */}
      {activeTab === 'slots' && (
        <div>
          <div className="row mb-4">
            <div className="col-md-3">
              <label className="fw-semibold">Date:</label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="fw-semibold">Game:</label>
              <select
                className="form-select"
                value={selectedGame}
                onChange={e => setSelectedGame(e.target.value)}
              >
                <option value="">Select Game</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="fw-semibold">Time Slot:</label>
              <select
                className="form-select"
                value={newSlotTime}
                onChange={e => setNewSlotTime(e.target.value)}
              >
                <option value="">Select Time</option>
                {slots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="fw-semibold">&nbsp;</label>
              <button 
                className="btn btn-primary d-block w-100"
                onClick={handleAddSlot}
                disabled={!selectedDate || !selectedGame || !newSlotTime}
              >
                Add Slot
              </button>
            </div>
          </div>

          {selectedDate && selectedGame && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Slots for {selectedDate} - {games.find(g => g.id === selectedGame)?.name}</h5>
              </div>
              <div className="card-body">
                {slots.length === 0 ? (
                  <p className="text-muted">No slots configured for this date and game.</p>
                ) : (
                  <div className="row">
                    {slots.map((time, index) => (
                      <div key={index} className="col-md-2 mb-2">
                        <div className="card">
                          <div className="card-body text-center">
                            <span className="fw-bold">{time}</span>
                            <button 
                              className="btn btn-danger btn-sm d-block w-100 mt-2"
                              onClick={() => handleDeleteSlot(time)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Game Management Tab */}
      {activeTab === 'games' && (
        <div>
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Add New Game</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="fw-semibold">Game Name:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newGame.name}
                    onChange={e => setNewGame({...newGame, name: e.target.value})}
                    placeholder="Enter game name"
                  />
                </div>
                <div className="col-md-3">
                  <label className="fw-semibold">Price:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newGame.price}
                    onChange={e => setNewGame({...newGame, price: parseInt(e.target.value) || 0})}
                    placeholder="Price"
                  />
                </div>
                <div className="col-md-2">
                  <label className="fw-semibold">Category:</label>
                  <select
                    className="form-select"
                    value={newGame.category}
                    onChange={e => setNewGame({...newGame, category: e.target.value})}
                  >
                    <option value="Indoor">Indoor</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="fw-semibold">&nbsp;</label>
                  <button 
                    className="btn btn-success d-block w-100"
                    onClick={handleAddGame}
                    disabled={!newGame.name}
                  >
                    Add Game
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {games.map(game => (
              <div key={game.id} className="col-md-4 mb-3">
                <div className="card">
                  {game.image && (
                    <img src={game.image} alt={game.name} className="card-img-top" style={{height: '200px', objectFit: 'cover'}} />
                  )}
                  <div className="card-body">
                    <h5 className="card-title">{game.name}</h5>
                    <p className="card-text">
                      <strong>Price:</strong> ₹{game.price}<br/>
                      <strong>Category:</strong> {game.category}<br/>
                      <strong>Status:</strong> {game.isActive ? 'Active' : 'Inactive'}
                    </p>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteGame(game.id)}
                    >
                      Delete Game
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <div className="row">
            <div className="col-md-3 mb-3">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="text-primary">{bookings.length}</h3>
                  <p className="mb-0">Total Bookings</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="text-warning">{bookings.filter(b => b.status === 'Pending').length}</h3>
                  <p className="mb-0">Pending Bookings</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="text-success">{bookings.filter(b => b.status === 'Confirmed').length}</h3>
                  <p className="mb-0">Confirmed Bookings</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="text-danger">{bookings.filter(b => b.status === 'Cancelled').length}</h3>
                  <p className="mb-0">Cancelled Bookings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 