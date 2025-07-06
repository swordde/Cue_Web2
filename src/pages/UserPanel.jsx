import { useState, useEffect } from "react";
import Loading from "../components/Loading";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import { useNavigate, Link } from 'react-router-dom';
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import { gameService, slotService, bookingService } from "../firebase/services";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import EditBookingModal from "../components/EditBookingModal";

const SIDEBAR_LINKS = [
  { key: 'calendar', label: '📅 Calendar' },
  { key: 'bookings', label: '📋 All Bookings' },
  { key: 'stats', label: '📊 Statistics' },
  { key: 'rewards', label: '🎁 Rewards' },
];

export default function UserPanel() {
  const [date, setDate] = useState(new Date());
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const [editIndex, setEditIndex] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGame, setEditGame] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  // Booking Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsBooking, setDetailsBooking] = useState(null);
  // Filters and sorting
  const [filterGame, setFilterGame] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Load user data and bookings
        loadUserData(user);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadUserData = async (user) => {
    setLoading(true);
    try {
      // Load user's bookings
      const userBookings = await bookingService.getUserBookings(user.phoneNumber || user.email);
      setBookings(userBookings);
      
      // Load games for editing
      const allGames = await gameService.getAllGames();
      setGames(allGames);
      
      // Set user data (you can expand this based on your user data structure)
      setUser({
        mobile: user.phoneNumber || user.email,
        name: user.displayName || 'User',
        streak: 0, // You can load this from Firestore
        clubCoins: 0 // You can load this from Firestore
      });
    } catch (err) {
      setError("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // Load slots for selected game and date
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedGame) {
        setSlots([]);
        return;
      }
      setLoading(true);
      try {
        const slotList = await slotService.getSlotsForDate(date.toISOString().split('T')[0], selectedGame);
        setSlots(slotList);
      } catch (err) {
        setError("Failed to load slots");
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, [selectedGame, date]);

  // Format date as yyyy-mm-dd
  const formatDate = d => d.toISOString().split('T')[0];
  const selectedDate = formatDate(date);
  const bookingsForDate = bookings.filter(b => b.date === selectedDate);

  // Filtered and sorted bookings for table
  const filteredBookings = bookings
    .filter(b =>
      (!filterGame || b.game === filterGame) &&
      (!filterStatus || b.status === filterStatus) &&
      (!filterDate || b.date === filterDate)
    )
    .sort((a, b) => {
      if (sortOrder === "desc") {
        return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
      } else {
        return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
      }
    });

  // Calculate streak and club coins from user data
  const streak = user?.streak || 0;
  const clubCoins = user?.clubCoins || 0;

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await bookingService.updateBookingStatus(bookingId, 'Cancelled');
        // Reload bookings
        const userBookings = await bookingService.getUserBookings(currentUser.phoneNumber || currentUser.email);
        setBookings(userBookings);
      } catch (err) {
        setError("Failed to cancel booking");
      }
    }
  };

  const openEditModal = (i) => {
    setEditIndex(i);
    setShowEditModal(true);
    setEditGame(bookings[i].game);
    setEditDate(bookings[i].date);
    setEditTime(bookings[i].time);
  };

  // Booking Details Modal
  const openDetailsModal = (booking) => {
    setDetailsBooking(booking);
    setShowDetailsModal(true);
  };

  // Rebook feature
  const handleRebook = (booking) => {
    setActiveTab('calendar');
    setSelectedGame(booking.game);
    setDate(new Date(booking.date));
    // Optionally, scroll to booking form or show a toast
    setShowDetailsModal(false);
  };

  const handleEditSave = async () => {
    try {
      const bookingToUpdate = bookings[editIndex];
      if (bookingToUpdate && bookingToUpdate.id) {
        // Update booking in Firestore
        await bookingService.updateBookingStatus(bookingToUpdate.id, 'Updated');
        
        // Reload bookings
        const userBookings = await bookingService.getUserBookings(currentUser.phoneNumber || currentUser.email);
        setBookings(userBookings);
        setShowEditModal(false);
      }
    } catch (err) {
      setError("Failed to update booking");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <div className="container mt-5 text-center">Loading...</div>;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Sidebar */}
        <nav className="col-md-3 col-lg-2 d-md-block bg-light sidebar p-3 rounded">
          <h4 className="mb-4">User Panel</h4>
          {/* User Info Card */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-body text-center">
              <div className="mb-2">
                <span className="fw-bold fs-5">{user.name}</span>
              </div>
              <div className="text-muted small mb-1">{user.mobile}</div>
            </div>
          </div>
          <Link to="/dashboard" className="btn btn-secondary w-100 mb-3">Go to Dashboard</Link>
          <ul className="nav flex-column">
            {SIDEBAR_LINKS.map(link => (
              <li className="nav-item mb-2" key={link.key}>
                <button
                  className={`nav-link btn btn-link w-100 text-start ${activeTab === link.key ? 'fw-bold text-primary' : ''}`}
                  onClick={() => setActiveTab(link.key)}
                >
                  {link.label}
                </button>
              </li>
            ))}
            <li className="nav-item mt-3">
              <Link to="/book" className="btn btn-success w-100 fw-bold">Book a Game</Link>
            </li>
            <li className="nav-item mt-4">
              <button
                className="btn btn-danger w-100 fw-bold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
        {/* Main Content */}
        <main className="col-md-9 col-lg-10 ms-sm-auto px-4">
          {/* Streak and Club Coins */}
          <div className="d-flex gap-4 align-items-center mb-4">
            <div className="card p-3 text-center bg-light border-0 shadow-sm">
              <div className="fw-bold text-primary" style={{ fontSize: '1.5rem' }}>{streak}</div>
              <div className="small">Day Streak</div>
            </div>
            <div className="card p-3 text-center bg-light border-0 shadow-sm">
              <div className="fw-bold text-warning" style={{ fontSize: '1.5rem' }}>{clubCoins}</div>
              <div className="small">Club Coins</div>
            </div>
          </div>
          {activeTab === 'calendar' && (
            <div>
              <h5 className="mb-3">Calendar</h5>
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
                  <h6 className="mt-4 mt-md-0">Your Bookings for {selectedDate}</h6>
                  {bookingsForDate.length === 0 ? (
                    <p className="text-muted">No bookings for this day.</p>
                  ) : (
                    <ul className="list-group">
                      {bookingsForDate.map((b, i) => (
                        <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                          <span className="text-capitalize">{b.game}</span>
                          <span>{b.time}</span>
                          <span className={`badge ms-2 ${b.status === 'Cancelled' ? 'bg-danger' : b.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}`}>{b.status || 'Confirmed'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'bookings' && (
            <div>
              <h5 className="mb-3">All Your Bookings</h5>
              {/* Filter & Sort Controls */}
              <div className="row g-2 mb-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label mb-1">Game</label>
                  <select className="form-select" value={filterGame} onChange={e => setFilterGame(e.target.value)}>
                    <option value="">All Games</option>
                    {games.map(g => <option key={g.id || g.name} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label mb-1">Status</label>
                  <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label mb-1">Date</label>
                  <input type="date" className="form-control" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label mb-1">Sort</label>
                  <select className="form-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
              {filteredBookings.length === 0 ? (
                <p className="text-muted">No bookings found.</p>
              ) : (
                <>
                  <div className="alert alert-info mb-3">
                    <small>
                      <strong>📊 Booking Statistics:</strong><br/>
                      Total: {filteredBookings.length} | Confirmed: {filteredBookings.filter(b => b.status === 'Confirmed').length} | 
                      Pending: {filteredBookings.filter(b => b.status === 'Pending').length} | 
                      Cancelled: {filteredBookings.filter(b => b.status === 'Cancelled').length}
                    </small>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Game</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((booking, i) => (
                          <tr key={i}>
                            <td>{booking.date}</td>
                            <td className="text-capitalize">{booking.game}</td>
                            <td>{booking.time}</td>
                            <td>
                              <span className={`badge ${booking.status === 'Cancelled' ? 'bg-danger' : booking.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}`}>
                                {booking.status || 'Confirmed'}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-info"
                                  onClick={() => openDetailsModal(booking)}
                                  aria-label="View details"
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={() => openEditModal(bookings.findIndex(b => b.id === booking.id))}
                                  disabled={booking.status === 'Cancelled'}
                                  aria-label="Edit booking"
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={booking.status === 'Cancelled'}
                                  aria-label="Cancel booking"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
      {/* Booking Details Modal */}
      {showDetailsModal && detailsBooking && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Booking Details</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>Game:</strong> <span className="text-capitalize">{detailsBooking.game}</span></p>
                <p><strong>Date:</strong> {detailsBooking.date}</p>
                <p><strong>Time:</strong> {detailsBooking.time}</p>
                <p><strong>Status:</strong> <span className={`badge ${detailsBooking.status === 'Cancelled' ? 'bg-danger' : detailsBooking.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}`}>{detailsBooking.status || 'Confirmed'}</span></p>
                {/* Add more info as needed */}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
                <button className="btn btn-success" onClick={() => handleRebook(detailsBooking)} disabled={detailsBooking.status === 'Cancelled'}>Rebook</button>
                <button className="btn btn-primary" onClick={() => { setShowDetailsModal(false); openEditModal(bookings.findIndex(b => b.id === detailsBooking.id)); }} disabled={detailsBooking.status === 'Cancelled'}>Edit</button>
                <button className="btn btn-danger" onClick={() => { handleCancelBooking(detailsBooking.id); setShowDetailsModal(false); }} disabled={detailsBooking.status === 'Cancelled'}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
          {activeTab === 'stats' && (
            <div>
              <h5 className="mb-3">Statistics</h5>
              <div className="row">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">Booking Activity</h6>
                      <p className="card-text">
                        Total Bookings: {bookings.length}<br/>
                        This Month: {bookings.filter(b => new Date(b.date).getMonth() === new Date().getMonth()).length}<br/>
                        This Week: {bookings.filter(b => {
                          const bookingDate = new Date(b.date);
                          const now = new Date();
                          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                          return bookingDate >= weekStart;
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">Rewards</h6>
                      <p className="card-text">
                        Current Streak: {streak} days<br/>
                        Club Coins: {clubCoins}<br/>
                        Next Reward: {Math.max(0, 10 - (streak % 10))} more days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'rewards' && (
            <div>
              <h5 className="mb-3">Rewards & Achievements</h5>
              <div className="alert alert-warning">
                <strong>🎁 Rewards System Coming Soon!</strong><br/>
                Earn points, unlock achievements, and get exclusive benefits.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditBookingModal
          booking={bookings[editIndex]}
          games={games}
          editGame={editGame}
          editDate={editDate}
          editTime={editTime}
          onGameChange={setEditGame}
          onDateChange={setEditDate}
          onTimeChange={setEditTime}
          onSave={handleEditSave}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
} 