import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import { useNavigate, Link } from 'react-router-dom';
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import { games } from "../data/mockGames";
import { mockSlots } from "../data/mockSlots";
import { authUtils, bookingUtils, analyticsUtils } from "../data/databaseUtils";
import userDB from "../data/userDatabase.js";

const SIDEBAR_LINKS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'profile', label: 'Profile' },
];

export default function UserPanel() {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [editIndex, setEditIndex] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Check authentication and load user data
  useEffect(() => {
    if (!authUtils.isLoggedIn()) {
      navigate('/login');
      return;
    }

    const mobile = localStorage.getItem('mobile');
    if (mobile) {
      const currentUser = userDB.getUserByMobile(mobile);
      setUser(currentUser);
      
      // Load user's bookings
      const userBookings = bookingUtils.getUserBookings();
      setBookings(userBookings);
    }
  }, [navigate]);

  // Add another useEffect to refresh data when mobile changes
  useEffect(() => {
    const handleStorageChange = () => {
      const mobile = localStorage.getItem('mobile');
      if (mobile && authUtils.isLoggedIn()) {
        const currentUser = userDB.getUserByMobile(mobile);
        setUser(currentUser);
        
        const userBookings = bookingUtils.getUserBookings();
        setBookings(userBookings);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Format date as yyyy-mm-dd
  const formatDate = d => d.toISOString().split('T')[0];
  const selectedDate = formatDate(date);
  const bookingsForDate = bookings.filter(b => b.date === selectedDate);

  // Calculate streak and club coins from user data
  const streak = user?.streak || 0;
  const clubCoins = user?.clubCoins || 0;

  const handleCancelBooking = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      // Update booking status to cancelled
      const updatedBooking = bookingUtils.updateBookingStatus(bookingId, 'Cancelled');
      if (updatedBooking) {
        const updatedBookings = bookingUtils.getUserBookings();
        setBookings(updatedBookings);
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

  const handleEditSave = () => {
    // Update booking using database
    const bookingToUpdate = bookings[editIndex];
    if (bookingToUpdate && bookingToUpdate.id) {
      const updatedBooking = {
        ...bookingToUpdate,
        game: editGame,
        date: editDate,
        time: editTime
      };
      
      // Update in database
      const success = userDB.updateUser(bookingToUpdate.user, {
        // Update user stats if needed
      });
      
      if (success) {
        const updatedBookings = bookingUtils.getUserBookings();
        setBookings(updatedBookings);
        setShowEditModal(false);
      }
    }
  };

  if (!user) {
    return <div className="container mt-5 text-center">Loading...</div>;
  }

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Sidebar */}
        <nav className="col-md-3 col-lg-2 d-md-block bg-light sidebar p-3 rounded">
          <h4 className="mb-4">User Panel</h4>
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
                onClick={() => {
                  authUtils.logoutUser();
                  navigate('/login');
                }}
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
              {bookings.length === 0 ? (
                <p className="text-muted">No bookings found.</p>
              ) : (
                <>
                  <div className="alert alert-info mb-3">
                    <small>
                      <strong>Booking Status Guide:</strong><br/>
                      🟡 <strong>Pending:</strong> Awaiting admin approval<br/>
                      🟢 <strong>Confirmed:</strong> Approved and confirmed<br/>
                      🔴 <strong>Cancelled:</strong> Cancelled by admin or user
                    </small>
                  </div>
                  <ul className="list-group">
                    {bookings.map((b, i) => (
                      <li key={i} className="list-group-item d-flex justify-content-between align-items-center gap-2 flex-wrap">
                        <span className="text-capitalize">{b.game} - {b.date}</span>
                        <span>{b.time}</span>
                        <span className={`badge ms-2 ${b.status === 'Cancelled' ? 'bg-danger' : b.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}`}>{b.status || 'Pending'}</span>
                        <div className="d-flex gap-2">
                          {b.status !== 'Cancelled' && (
                            <>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => { openEditModal(i); }}>Edit</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancelBooking(b.id)}>Cancel</button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {/* Edit Modal */}
              {showEditModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.4)'}}>
                  <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h2 className="modal-title h5 mb-0">Edit Booking</h2>
                      </div>
                      <div className="modal-body">
                        <label className="mb-2">Game:</label>
                        <GameSelector selected={editGame} onSelect={setEditGame} games={games} />
                        <label className="mb-2">Date:</label>
                        <input
                          type="date"
                          className="form-control mb-3"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                        />
                        <label className="mb-2">Time Slot:</label>
                        <SlotGrid
                          slots={mockSlots[editDate]?.[editGame] || []}
                          onBook={setEditTime}
                          bookings={bookings.filter((_, i) => i !== editIndex)}
                          selectedGame={editGame}
                          selectedDate={editDate}
                        />
                        {editTime && <div className="mt-2">Selected: <b>{editTime}</b></div>}
                      </div>
                      <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEditSave} disabled={!editGame || !editDate || !editTime}>Save</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'profile' && (
            <div>
              <h5 className="mb-3">Profile</h5>
              <div className="card p-3">
                <p className="mb-1"><b>Name:</b> {user.name}</p>
                <p className="mb-1"><b>Mobile:</b> {user.mobile}</p>
                <p className="mb-1"><b>Email:</b> {user.email || 'Not provided'}</p>
                <p className="mb-1"><b>Membership:</b> {user.membershipType}</p>
                <p className="mb-1"><b>Join Date:</b> {new Date(user.joinDate).toLocaleDateString()}</p>
                <p className="mb-0 text-muted">(More profile features coming soon!)</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 