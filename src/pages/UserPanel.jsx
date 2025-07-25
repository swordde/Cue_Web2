import { useState, useEffect, useRef } from "react";
import Loading from "../components/Loading";
import CustomCalendar from "../components/CustomCalendar";
import { useNavigate, Link } from 'react-router-dom';
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import { gameService, slotService, bookingService, realtimeService } from "../firebase/services";
import { userService } from "../firebase/services";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import EditBookingModal from "../components/EditBookingModal";
import { useToast } from '../contexts/ToastContext';
import BookingStatusHistory from '../components/BookingStatusHistory';
import { resolveGameName, createToastHelper, handleUserAuthentication, handleLogout as handleLogoutUtil } from '../utils/commonUtils';
import './UserPanelDark.css';

const SIDEBAR_LINKS = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'bookings', label: 'All Bookings' },
  { key: 'stats', label: 'Statistics' },
  { key: 'rewards', label: 'Rewards' },
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
  const [statusHistoryModal, setStatusHistoryModal] = useState({ show: false, booking: null });
  const { showSuccess, showError, showInfo } = useToast();

  // Real-time listener refs
  const userBookingsUnsub = useRef(null);

  // Helper function to show toasts based on type
  const showToast = createToastHelper({ showSuccess, showError, showInfo });

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Normalize mobile number
        let mobile = user.phoneNumber;
        if (mobile && mobile.startsWith('+91')) {
          mobile = mobile.slice(3);
        }
        // Always fetch latest user data from Firestore
        let userData;
        if (mobile) {
          userData = await userService.getUserByMobile(mobile);
        } else if (user.email) {
          userData = await userService.getUserByEmail(user.email);
        }
        if (userData && userData.isActive === false) {
          await signOut(auth);
          showToast('Your account has been deactivated. Please contact support.', 'error');
          navigate('/login');
          return;
        }
        // Load user data and bookings
        loadUserData(user);
      }
    });
    return () => {
      unsubscribe();
      // Cleanup real-time listeners
      if (userBookingsUnsub.current) {
        try {
          userBookingsUnsub.current();
          userBookingsUnsub.current = null;
        } catch (error) {
          console.error('Error cleaning up user bookings listener:', error);
        }
      }
    };
  }, [navigate]);

  // Also add the check in loadUserData after fetching userData
  const loadUserData = async (user) => {
    setLoading(true);
    try {
      // Normalize mobile number
      let mobile = user.phoneNumber;
      if (mobile && mobile.startsWith('+91')) {
        mobile = mobile.slice(3);
      }
      
      // Clean up any existing listener before setting up new one
      if (userBookingsUnsub.current) {
        try {
          userBookingsUnsub.current();
        } catch (error) {
          console.error('Error cleaning up previous listener:', error);
        }
        userBookingsUnsub.current = null;
      }
      
      // Setup real-time listener for user bookings
      const userId = mobile || user.email;
      userBookingsUnsub.current = realtimeService.onUserBookingsChange(userId, (userBookings) => {
        // Check if component is still mounted and user is still authenticated
        if (!auth.currentUser) {
          return;
        }
        
        console.log('Real-time user bookings updated:', userBookings.length);
        setBookings(userBookings);
        if (userBookings.length > 0) {
          // Show toast for new bookings (avoid showing on initial load)
          const now = Date.now();
          const recentBookings = userBookings.filter(booking => {
            const bookingDate = new Date(booking.createdAt?.seconds ? booking.createdAt.seconds * 1000 : booking.createdAt);
            return (now - bookingDate.getTime()) < 5000; // Less than 5 seconds old
          });
          
          if (recentBookings.length > 0 && !loading) {
            showToast(`${recentBookings.length} booking(s) updated in real-time!`, 'info');
          }
        }
      });
      
      // Load games for editing
      const allGames = await gameService.getAllGames();
      setGames(allGames);
      
      // Get user data from Firestore (including name)
      let userData;
      if (mobile) {
        userData = await userService.getUserByMobile(mobile);
      } else if (user.email) {
        userData = await userService.getUserByEmail(user.email);
      }
      // Block deactivated users
      if (userData && userData.isActive === false) {
        await signOut(auth);
        showToast('Your account has been deactivated. Please contact support.', 'error');
        navigate('/login');
        return;
      }
      // Set user data from Firestore
      setUser({
        mobile: mobile || user.email,
        name: userData?.name || user.displayName || 'User',
        streak: userData?.streak || 0,
        clubCoins: userData?.clubCoins || 0
      });
    } catch (err) {
      setError("Failed to load user data");
      showToast('Failed to load user data', 'error');
      console.error('Failed to load user data:', err);
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
        showToast('Failed to load slots', 'error');
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
    .filter(b => {
      const gameId = typeof b.game === 'object' ? b.game.id : b.game;
      return (
        (!filterGame || gameId === filterGame) &&
        (!filterStatus || b.status === filterStatus) &&
        (!filterDate || b.date === filterDate)
      );
    })
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
        // Real-time listener will update bookings automatically
        showToast('Booking cancelled successfully!', 'success');
      } catch (err) {
        setError('Failed to cancel booking');
        showToast('Failed to cancel booking', 'error');
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

  const handleViewStatusHistory = (booking) => {
    setStatusHistoryModal({ show: true, booking });
  };

  const handleEditSave = async () => {
    try {
      const bookingToUpdate = bookings[editIndex];
      if (bookingToUpdate && bookingToUpdate.id) {
        // Update booking in Firestore
        await bookingService.updateBookingStatus(bookingToUpdate.id, 'Updated');
        
        // Real-time listener will update bookings automatically
        setShowEditModal(false);
        showToast('Booking updated successfully!', 'success');
      }
    } catch (err) {
      setError("Failed to update booking");
      showToast('Failed to update booking', 'error');
    }
  };

  const handleLogout = async () => {
    const clearUserData = () => {
      setUser(null);
      setBookings([]);
    };

    const cleanupFunctions = [
      userBookingsUnsub.current
    ];

    await handleLogoutUtil(navigate, showToast, setLoading, clearUserData, cleanupFunctions);
  };

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <div className="container mt-5 text-center">Loading...</div>;
  }

  return (
    <div className="user-panel-dark">
      <div className="container-fluid p-3">
      <div className="row">
        {/* Sidebar */}
        <nav className="col-md-3 col-lg-2 d-md-block bg-light sidebar p-3 rounded">
          <h4 className="mb-3" style={{ fontSize: '1.3rem' }}>User Panel</h4>
          
          {/* User Info Card - Compact */}
          <div className="card mb-3 shadow-sm border-0" style={{ fontSize: '0.9rem' }}>
            <div className="card-body text-center py-2">
              <div className="fw-bold">{user.name}</div>
              <div className="text-muted small">{user.email}</div>
            </div>
          </div>

          {/* Streak and Club Coins - Compact */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <div className="card p-2 text-center bg-light border-0 shadow-sm">
                <div className="fw-bold text-primary" style={{ fontSize: '1.2rem' }}>{streak}</div>
                <div style={{ fontSize: '0.7rem' }}>Day Streak</div>
              </div>
            </div>
            <div className="col-6">
              <div className="card p-2 text-center bg-light border-0 shadow-sm">
                <div className="fw-bold text-warning" style={{ fontSize: '1.2rem' }}>{clubCoins}</div>
                <div style={{ fontSize: '0.7rem' }}>Club Coins</div>
              </div>
            </div>
          </div>

          {/* Dashboard Button */}
          <Link to="/dashboard" className="btn btn-warning w-100 mb-3 fw-bold" style={{ fontSize: '0.9rem' }}>
            🏠 Go to Dashboard
          </Link>
          
          {/* Navigation Menu */}
          <ul className="nav flex-column">
            {SIDEBAR_LINKS.map(link => (
              <li className="nav-item mb-1" key={link.key}>
                <button
                  className={`nav-link btn btn-link w-100 text-start py-2 ${activeTab === link.key ? 'fw-bold text-primary' : ''}`}
                  onClick={() => setActiveTab(link.key)}
                  style={{ fontSize: '0.85rem' }}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Action Buttons */}
          <div className="mt-3">
            <Link to="/book" className="btn btn-success w-100 mb-2 fw-bold" style={{ fontSize: '0.9rem' }}>
              Book a Game
            </Link>
            <button
              className="btn btn-danger w-100 fw-bold"
              onClick={handleLogout}
              style={{ fontSize: '0.9rem' }}
            >
              🚪 Logout
            </button>
          </div>
        </nav>
        {/* Main Content */}
        <main className="col-md-9 col-lg-10 ms-sm-auto px-4">
          {activeTab === 'calendar' && (
            <div>
              <h5 className="mb-3" style={{ color: '#ffc107', fontSize: '1.5rem' }}>Calendar & Booking History</h5>
              
              {/* Real-time Status Indicator */}
              <div className="mb-3" style={{
                background: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                color: '#4CAF50',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50',
                  animation: 'pulse 2s infinite'
                }}></span>
                <span>🟢 Live booking updates</span>
                <span style={{marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.8}}>
                  {bookings.length} total bookings
                </span>
              </div>
              
              {/* Compact Calendar Legend */}
              <div className="mb-3" style={{ 
                background: 'rgba(30, 30, 30, 0.8)', 
                padding: '10px 15px', 
                borderRadius: '10px', 
                border: '1px solid rgba(255, 193, 7, 0.2)' 
              }}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-1">
                      <div style={{ width: '12px', height: '12px', background: '#4CAF50', borderRadius: '50%' }}></div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem' }}>Future</span>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                      <div style={{ width: '12px', height: '12px', background: '#FF9800', borderRadius: '50%' }}></div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem' }}>Past</span>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                      <div style={{ width: '12px', height: '12px', background: '#ffc107', borderRadius: '4px' }}></div>
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.8rem' }}>Selected</span>
                    </div>
                  </div>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                    💡 Click dates with bookings to view history
                  </span>
                </div>
              </div>

              <div className="d-flex flex-column flex-lg-row gap-3 align-items-start">
                <div style={{ flex: '0 0 auto' }}>
                  <CustomCalendar
                    selectedDate={date}
                    onDateSelect={setDate}
                    bookingsData={bookings}
                  />
                </div>
                <div className="flex-grow-1" style={{ 
                  background: 'rgba(40, 40, 40, 0.8)', 
                  padding: '15px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  minHeight: '300px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h6 className="mt-0" style={{ color: '#ffc107', fontSize: '1.1rem', margin: 0 }}>
                      Bookings for {selectedDate}
                    </h6>
                    {new Date(selectedDate) < new Date().setHours(0, 0, 0, 0) && (
                      <span style={{
                        background: 'rgba(255, 152, 0, 0.2)',
                        color: '#FF9800',
                        padding: '3px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        border: '1px solid rgba(255, 152, 0, 0.4)'
                      }}>
                        Past
                      </span>
                    )}
                  </div>
                  {bookingsForDate.length === 0 ? (
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>No bookings for this day.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {bookingsForDate.map((b, i) => {
                        const isPastBooking = new Date(selectedDate) < new Date().setHours(0, 0, 0, 0);
                        return (
                          <div key={i} style={{
                            background: isPastBooking ? 'rgba(60, 60, 60, 0.6)' : 'rgba(50, 50, 50, 0.8)',
                            border: `1px solid ${isPastBooking ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 193, 7, 0.2)'}`,
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderLeft: `3px solid ${isPastBooking ? '#FF9800' : '#ffc107'}`,
                            opacity: isPastBooking ? 0.8 : 1
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>
                                {resolveGameName(b.game, games)}
                              </span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                                🕒 {b.time} 
                                {b.duration && ` • ${b.duration} mins`}
                                {isPastBooking && ' • Completed'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                background: b.status === 'Cancelled' ? 'rgba(244, 67, 54, 0.2)' : 
                                           b.status === 'Pending' ? 'rgba(255, 193, 7, 0.2)' : 
                                           isPastBooking ? 'rgba(76, 175, 80, 0.2)' :
                                           'rgba(76, 175, 80, 0.2)',
                                color: b.status === 'Cancelled' ? '#f44336' : 
                                      b.status === 'Pending' ? '#ffc107' : 
                                      '#4CAF50',
                                border: `1px solid ${b.status === 'Cancelled' ? 'rgba(244, 67, 54, 0.4)' : 
                                                     b.status === 'Pending' ? 'rgba(255, 193, 7, 0.4)' : 
                                                     'rgba(76, 175, 80, 0.4)'}`
                              }}>
                                {isPastBooking && b.status === 'Confirmed' ? 'Completed' : (b.status || 'Confirmed')}
                              </span>
                              {b.price && (
                                <span style={{ color: '#ffc107', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                  ₹{b.price}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                      <strong>Booking Statistics:</strong><br/>
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
                            <td className="text-capitalize">{resolveGameName(booking.game, games)}</td>
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
                                  className="btn btn-outline-secondary"
                                  onClick={() => handleViewStatusHistory(booking)}
                                  aria-label="View status history"
                                  title="View Status History"
                                >
                                  History
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
                <p><strong>Game:</strong> <span className="text-capitalize">{resolveGameName(detailsBooking.game, games)}</span></p>
                <p><strong>Date:</strong> {detailsBooking.date}</p>
                <p><strong>Time:</strong> {detailsBooking.time}</p>
                <p><strong>Status:</strong> <span className={`badge ${detailsBooking.status === 'Cancelled' ? 'bg-danger' : detailsBooking.status === 'Pending' ? 'bg-warning text-dark' : 'bg-success'}`}>{detailsBooking.status || 'Confirmed'}</span></p>
                {/* Add more info as needed */}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
                <button className="btn btn-info" onClick={() => { setShowDetailsModal(false); handleViewStatusHistory(detailsBooking); }}>Status History</button>
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
                <strong>Rewards System Coming Soon!</strong><br/>
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

      {/* Status History Modal */}
      {statusHistoryModal.show && (
        <BookingStatusHistory
          statusHistory={statusHistoryModal.booking?.statusHistory || []}
          onClose={() => setStatusHistoryModal({ show: false, booking: null })}
        />
      )}
      </div>
    </div>
  );
}