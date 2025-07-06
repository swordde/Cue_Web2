import { useState, useEffect } from "react";
import Loading from "../components/Loading";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { userService } from "../firebase/services";
import { useNavigate } from "react-router-dom";
import { gameService, slotService, bookingService, realtimeService } from "../firebase/services";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut, getIdTokenResult } from "firebase/auth";

export default function AdminPanel() {
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [search, setSearch] = useState("");
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
  // Standard hourly time slots from 9:00 AM to 9:00 PM
  const timeSlotOptions = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
    "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"
  ];
  const [newGame, setNewGame] = useState({ name: "", price: 0, category: "", isActive: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, false = not admin, true = admin


  useEffect(() => {
    // Check authentication and admin claim
    let bookingsUnsub = null;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Fetch admin name from Firestore
        const userData = await userService.getUserByMobile(user.phoneNumber || user.email);
        setAdminName(userData?.name || "Admin");
        const token = await getIdTokenResult(user, true);
        if (token.claims.admin) {
          setIsAdmin(true);
          setLoading(true);
          // Real-time bookings listener
          bookingsUnsub = realtimeService.onAllBookingsChange((allBookings) => {
            setBookings(allBookings);
            setLoading(false);
          });
          // Load users, games, slots
          userService.getAllUsers().then((allUsers) => {
            setUsers(allUsers);
            const map = {};
            allUsers.forEach(u => { map[u.mobile] = u; });
            setUserMap(map);
          });
          loadGames();
          loadSlots();
        } else {
          setIsAdmin(false);
          navigate('/dashboard');
        }
      }
    });
    return () => {
      unsubscribe();
      if (bookingsUnsub) bookingsUnsub();
    };
    // eslint-disable-next-line
  }, [navigate]);

  // loadData removed, now handled in useEffect with real-time updates

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Are you sure you want to permanently delete this booking?')) return;
    try {
      await bookingService.deleteBooking(bookingId);
      await loadData(); // Reload data
    } catch (err) {
      setError("Failed to delete booking");
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await bookingService.updateBookingStatus(bookingId, newStatus);
      await loadData(); // Reload data
    } catch (err) {
      setError("Failed to update booking status");
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter(b =>
    (filterGame === '' || b.game === filterGame) &&
    (filterDate === '' || b.date === filterDate) &&
    (
      !search ||
      (userMap[b.user]?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (b.user && b.user.toLowerCase().includes(search.toLowerCase()))
    )
  );

  // Load games from Firestore
  const loadGames = async () => {
    try {
      const allGames = await gameService.getAllGames();
      setGames(allGames);
    } catch (err) {
      setError("Failed to load games");
    }
  };

  // Load slots for selected game and date from Firestore
  const loadSlots = async () => {
    if (!selectedGame || !selectedDate) {
      setSlots([]);
      return;
    }
    try {
      const slotList = await slotService.getSlotsForDate(selectedDate, selectedGame);
      setSlots(slotList);
    } catch (err) {
      setError("Failed to load slots");
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

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };


  if (isAdmin === null) {
    // Still checking admin status
    return <Loading message="Checking admin access..." />;
  }

  if (isAdmin === true && loading) {
    return <Loading message="Loading admin data..." />;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="mb-3">
        <h4 className="fw-bold">Welcome, {adminName}</h4>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Admin Panel</h2>
        <div>
          <button onClick={handleLogout} className="btn btn-danger me-2">
            Logout
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
            <div className="col-md-4 mb-2">
              <label className="fw-semibold me-2">Search User:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or phone"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered table-striped align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Game</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>User Name</th>
                  <th>User Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted">No bookings found.</td></tr>
                ) : (
                  filteredBookings.map((b, i) => {
                    // Find game name by id
                    const gameObj = games.find(g => g.id === b.game || g.name === b.game);
                    const gameName = gameObj ? gameObj.name : b.game;
                    return (
                      <tr key={b.id || i}>
                        <td>{i + 1}</td>
                        <td className="text-capitalize">{gameName}</td>
                        <td>{b.date}</td>
                        <td>{b.time}</td>
                        <td>{userMap[b.user]?.name || 'Unknown'}</td>
                        <td>{b.user || 'Unknown'}</td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={b.status || 'Pending'}
                            onChange={e => {
                              if(window.confirm('Change booking status?')) handleStatusChange(b.id, e.target.value);
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => { if(window.confirm('Are you sure you want to delete this booking?')) handleDelete(b.id); }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
                {timeSlotOptions.map((slot, idx) => (
                  <option key={idx} value={slot}>{slot}</option>
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
            <div className="card-header">Add New Game</div>
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newGame.name}
                    onChange={e => setNewGame({ ...newGame, name: e.target.value })}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newGame.price}
                    onChange={e => setNewGame({ ...newGame, price: Number(e.target.value) })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newGame.category}
                    onChange={e => setNewGame({ ...newGame, category: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Image URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newGame.image || ''}
                    onChange={e => setNewGame({ ...newGame, image: e.target.value })}
                  />
                </div>
                <div className="col-md-1">
                  <button className="btn btn-success w-100" onClick={handleAddGame} disabled={!newGame.name}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            {games.map(game => (
              <div className="col-md-4 mb-3" key={game.id}>
                <div className="card h-100">
                  {game.image && (
                    <img src={game.image} alt={game.name} className="card-img-top" style={{ height: '180px', objectFit: 'cover' }} />
                  )}
                  <div className="card-body">
                    <h5 className="card-title">{game.name}</h5>
                    <p className="card-text mb-1">Price: ₹{game.price}</p>
                    <p className="card-text mb-1">Category: {game.category}</p>
                    <p className="card-text mb-1">Active: {game.isActive ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="card-footer d-flex justify-content-between">
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGame(game.id)}>Delete</button>
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

          {/* Daily Bookings Line Chart - Enhanced UI */}
          <div className="row mb-4 justify-content-center">
            <div className="col-lg-8 col-md-10 col-12">
              <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
                <div className="card-header bg-gradient bg-primary text-white d-flex justify-content-between align-items-center py-3 px-4 border-0">
                  <h5 className="mb-0 fw-bold">📈 Daily Bookings (Last 7 Days)</h5>
                  <span className="badge bg-light text-primary border border-primary fs-6">{bookings.length} total</span>
                </div>
                <div className="card-body bg-light p-4">
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={getDailyBookingData(bookings)} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="6 6" stroke="#d1e3fa" />
                      <XAxis dataKey="date" tick={{ fontSize: 15, fill: '#1a237e' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 15, fill: '#1a237e' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1.5px solid #1976d2', background: '#f4faff', fontSize: 15 }} labelStyle={{ fontWeight: 700, color: '#1976d2' }} />
                      <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={4} dot={{ r: 8, fill: '#fff', stroke: '#1976d2', strokeWidth: 4 }} activeDot={{ r: 12, fill: '#1976d2', stroke: '#fff', strokeWidth: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="text-end mt-3">
                    <span className="badge bg-primary fs-6">Today: {getDailyBookingData(bookings).slice(-1)[0]?.count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>



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
          <div className="row">
            <div className="col-md-3 mb-3">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="text-info">{users.length}</h3>
                  <p className="mb-0">Total Users</p>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card text-center">
                <div className="card-body">
                  <h3 className="text-info">{games.length}</h3>
                  <p className="mb-0">Total Games</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to aggregate bookings per day for the last 7 days
function getDailyBookingData(bookings) {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' }),
      count: 0
    });
  }
  bookings.forEach(function(b) {
    if (!b.date) return;
    // Assume b.date is in 'YYYY-MM-DD' or similar format
    var parts = b.date.split('-');
    if (parts.length < 3) return;
    var formatted = parts[2] + '-' + parts[1];
    var found = days.find(function(d) { return d.date === formatted; });
    if (found) found.count++;
  });
  return days;
}