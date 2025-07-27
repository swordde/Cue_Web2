import { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from "firebase/auth";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

import { gameService, slotService, bookingService, userService } from "../firebase/services";
import { auth } from "../firebase/config";
import Loading from "../components/Loading";
import EditBookingModal from "../components/EditBookingModal";
import { useToast } from '../contexts/ToastContext';
import styles from './UserPanel.module.css';

// Responsive: show/hide sidebar as top nav on mobile
import { useRef } from 'react';

const NAVIGATION_ITEMS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'bookings', label: 'My Bookings', icon: '🎮' },
  { key: 'history', label: 'History', icon: '📋' },
  { key: 'profile', label: 'Profile', icon: '👤' },
  { key: 'rewards', label: 'Rewards', icon: '🎁' },
];

const UserPanel = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    totalSpent: 0
  });

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBooking, setEditBooking] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGame, setFilterGame] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        await loadUserData(user);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load user data and related information
  const loadUserData = async (authUser) => {
    try {
      setLoading(true);
      
      // Normalize mobile number
      let mobile = authUser.phoneNumber;
      if (mobile && mobile.startsWith('+91')) {
        mobile = mobile.slice(3);
      }

      // Get user data
      let userData;
      if (mobile) {
        userData = await userService.getUserByMobile(mobile);
      } else if (authUser.email) {
        userData = await userService.getUserByEmail(authUser.email);
      }

      if (userData && userData.isActive === false) {
        await signOut(auth);
        showError('Your account has been deactivated. Please contact support.');
        navigate('/login');
        return;
      }

      setUser(userData);

      // Load additional data
      await Promise.all([
        loadBookings(userData),
        loadGames(),
      ]);

    } catch (error) {
      console.error('Error loading user data:', error);
      showError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  // Load user bookings
  const loadBookings = async (userData) => {
    try {
      const userBookings = await bookingService.getBookingsByUser(userData.mobile);
      setBookings(userBookings);
      calculateStats(userBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      showError('Failed to load bookings');
    }
  };

  // Load available games
  const loadGames = async () => {
    try {
      const gamesData = await gameService.getAllGames();
      setGames(gamesData);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  // Calculate user statistics
  const calculateStats = (bookings) => {
    const now = new Date();
    const totalBookings = bookings.length;
    const upcomingBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date + 'T' + booking.time);
      return bookingDate > now && booking.status !== 'cancelled';
    }).length;
    const completedBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date + 'T' + booking.time);
      return bookingDate < now && booking.status === 'confirmed';
    }).length;
    const totalSpent = bookings
      .filter(booking => booking.status === 'confirmed')
      .reduce((total, booking) => total + (booking.amount || 0), 0);

    setStats({
      totalBookings,
      upcomingBookings,
      completedBookings,
      totalSpent
    });
  };

  // Filter and sort bookings
  const getFilteredBookings = () => {
    let filtered = [...bookings];

    if (filterStatus) {
      filtered = filtered.filter(booking => booking.status === filterStatus);
    }

    if (filterGame) {
      filtered = filtered.filter(booking => booking.game === filterGame);
    }

    // Sort by date and time
    filtered.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + a.time);
      const dateB = new Date(b.date + 'T' + b.time);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  // Get bookings for selected date
  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === dateStr);
  };

  // Handle booking edit
  const handleEditBooking = (booking) => {
    setEditBooking(booking);
    setShowEditModal(true);
  };

  // Handle booking update
  const handleBookingUpdate = async (updatedBooking) => {
    try {
      await bookingService.updateBooking(updatedBooking.id, updatedBooking);
      await loadBookings(user);
      setShowEditModal(false);
      setEditBooking(null);
      showSuccess('Booking updated successfully');
    } catch (error) {
      console.error('Error updating booking:', error);
      showError('Failed to update booking');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      showError('Failed to logout');
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'confirmed': return styles.statusConfirmed;
      case 'pending': return styles.statusPending;
      case 'cancelled': return styles.statusCancelled;
      default: return styles.statusPending;
    }
  };

  // Render overview content
  const renderOverview = () => (
    <div>
      <div className={styles.contentHeader}>
        <h1 className={styles.pageTitle}>Welcome back, {user?.name}!</h1>
        <p className={styles.pageSubtitle}>Here's what's happening with your bookings</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <h3 className={styles.statValue}>{stats.totalBookings}</h3>
          <p className={styles.statLabel}>Total Bookings</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏰</div>
          <h3 className={styles.statValue}>{stats.upcomingBookings}</h3>
          <p className={styles.statLabel}>Upcoming</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <h3 className={styles.statValue}>{stats.completedBookings}</h3>
          <p className={styles.statLabel}>Completed</p>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <h3 className={styles.statValue}>₹{stats.totalSpent}</h3>
          <p className={styles.statLabel}>Total Spent</p>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Bookings</h2>
          <button 
            className={styles.actionButton}
            onClick={() => setActiveTab('bookings')}
          >
            View All
          </button>
        </div>
        <div className={styles.bookingsList}>
          {getFilteredBookings().slice(0, 3).map((booking, index) => (
            <div key={index} className={styles.bookingCard}>
              <div className={styles.bookingHeader}>
                <h4 className={styles.bookingGame}>{booking.game}</h4>
                <span className={`${styles.bookingStatus} ${getStatusClass(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <div className={styles.bookingDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date</span>
                  <span className={styles.detailValue}>{formatDate(booking.date)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Time</span>
                  <span className={styles.detailValue}>{formatTime(booking.time)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Duration</span>
                  <span className={styles.detailValue}>{booking.duration || '1 hour'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>₹{booking.amount || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render calendar content
  const renderCalendar = () => (
    <div>
      <div className={styles.contentHeader}>
        <h1 className={styles.pageTitle}>Calendar</h1>
        <p className={styles.pageSubtitle}>View your bookings in calendar format</p>
      </div>

      <div className={styles.calendarContainer}>
        <div className={styles.calendarMain}>
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={({ date }) => {
              const dayBookings = getBookingsForDate(date);
              return dayBookings.length > 0 ? (
                <div style={{
                  background: '#ffc107',
                  borderRadius: '50%',
                  width: '6px',
                  height: '6px',
                  margin: '0 auto',
                  marginTop: '2px'
                }} />
              ) : null;
            }}
          />
        </div>
        <div className={styles.calendarSidebar}>
          <h3 style={{ color: '#ffc107', marginBottom: '20px' }}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <div className={styles.bookingsList}>
            {getBookingsForDate(selectedDate).map((booking, index) => (
              <div key={index} className={styles.bookingCard}>
                <div className={styles.bookingHeader}>
                  <h4 className={styles.bookingGame}>{booking.game}</h4>
                  <span className={`${styles.bookingStatus} ${getStatusClass(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>
                <div className={styles.bookingDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Time</span>
                    <span className={styles.detailValue}>{formatTime(booking.time)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Duration</span>
                    <span className={styles.detailValue}>{booking.duration || '1 hour'}</span>
                  </div>
                </div>
              </div>
            ))}
            {getBookingsForDate(selectedDate).length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <p className={styles.emptyMessage}>No bookings for this date</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render bookings content
  const renderBookings = () => (
    <div>
      <div className={styles.contentHeader}>
        <h1 className={styles.pageTitle}>My Bookings</h1>
        <p className={styles.pageSubtitle}>Manage all your game bookings</p>
      </div>

      <div className={styles.filtersContainer}>
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter by Status</label>
            <select
              className={styles.filterInput}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter by Game</label>
            <select
              className={styles.filterInput}
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
            >
              <option value="">All Games</option>
              {games.map(game => (
                <option key={game.id} value={game.name}>{game.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort Order</label>
            <select
              className={styles.filterInput}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.bookingsList}>
          {getFilteredBookings().map((booking, index) => (
            <div key={index} className={styles.bookingCard}>
              <div className={styles.bookingHeader}>
                <h4 className={styles.bookingGame}>{booking.game}</h4>
                <span className={`${styles.bookingStatus} ${getStatusClass(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              <div className={styles.bookingDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date</span>
                  <span className={styles.detailValue}>{formatDate(booking.date)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Time</span>
                  <span className={styles.detailValue}>{formatTime(booking.time)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Duration</span>
                  <span className={styles.detailValue}>{booking.duration || '1 hour'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValue}>₹{booking.amount || 'N/A'}</span>
                </div>
              </div>
              {booking.status !== 'cancelled' && (
                <div className={styles.bookingActions}>
                  <button
                    className={`${styles.bookingButton} ${styles.editButton}`}
                    onClick={() => handleEditBooking(booking)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
          {getFilteredBookings().length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎮</div>
              <p className={styles.emptyMessage}>No bookings found</p>
              <Link to="/book" className={styles.emptyAction}>
                Book Your First Game
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render profile content
  const renderProfile = () => (
    <div>
      <div className={styles.contentHeader}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={styles.pageSubtitle}>Manage your account information</p>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Account Information</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Full Name</span>
            <span className={styles.detailValue}>{user?.name || 'N/A'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Mobile Number</span>
            <span className={styles.detailValue}>{user?.mobile || 'N/A'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Email</span>
            <span className={styles.detailValue}>{user?.email || currentUser?.email || 'N/A'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Member Since</span>
            <span className={styles.detailValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render rewards content
  const renderRewards = () => (
    <div>
      <div className={styles.contentHeader}>
        <h1 className={styles.pageTitle}>Rewards & Loyalty</h1>
        <p className={styles.pageSubtitle}>Track your points and unlock benefits</p>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎁</div>
          <p className={styles.emptyMessage}>Rewards system coming soon!</p>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem' }}>
            Stay tuned for exciting loyalty rewards and special offers.
          </p>
        </div>
      </div>
    </div>
  );

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'calendar': return renderCalendar();
      case 'bookings': return renderBookings();
      case 'history': return renderBookings(); // Same as bookings for now
      case 'profile': return renderProfile();
      case 'rewards': return renderRewards();
      default: return renderOverview();
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.userPanel} style={{minHeight: '100vh', width: '100vw', overflowX: 'hidden', overflowY: 'auto'}}>
      {/* Header */}
      <header className={styles.header} style={{padding: '8px 0', width: '100vw', minWidth: 0}}>
        <div className={styles.headerContent} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%', minWidth: 0}}>
          <div className={styles.logo} style={{minWidth: 0}}>
            <div className={styles.logoIcon}>🎮</div>
            <span className={styles.logoText}>Cue Club</span>
          </div>
          <div className={styles.headerActions} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0}}>
            <Link to="/dashboard" className={styles.headerButton}>Dashboard</Link>
            <Link to="/book" className={styles.headerButton}>Book Game</Link>
            <Link to="/party" className={styles.headerButton}>Book Event</Link>
            <div className={styles.userInfo} style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', minWidth: 0}}>
              <div className={styles.userAvatar} style={{width: 36, height: 36, fontSize: 20}}>{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className={styles.userDetails}>
                <h6>{user.name}</h6>
                <small>{user.mobile}</small>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile Nav */}
        <nav className={styles.mobileNav} style={{display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto', gap: '2px', width: '100vw', minWidth: 0}}>
          {NAVIGATION_ITEMS.map(item => (
            <button
              key={item.key}
              className={`${styles.mobileNavButton} ${activeTab === item.key ? styles.active : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.mobileNavLabel}>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent} style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', width: '100vw', minWidth: 0}}>
        {/* Sidebar (hidden on mobile) */}
        <nav className={styles.sidebar} style={{minWidth: 0, width: '100%', maxWidth: 280, flex: '0 0 280px', padding: '12px 8px', boxSizing: 'border-box'}}>
          <div className={styles.sidebarSection} style={{minWidth: 0}}>
            <h6 className={styles.sectionTitle}>Navigation</h6>
            <ul className={styles.navList}>
              {NAVIGATION_ITEMS.map(item => (
                <li key={item.key} className={styles.navItem}>
                  <button
                    className={`${styles.navButton} ${activeTab === item.key ? styles.active : ''}`}
                    onClick={() => setActiveTab(item.key)}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.quickActions}>
            <Link to="/book" className={styles.quickActionButton}>🎮 Book a Game</Link>
            <Link to="/party" className={styles.quickActionButton}>🎉 Book Event</Link>
            <button className={`${styles.quickActionButton} ${styles.secondary}`} onClick={handleLogout}>🚪 Logout</button>
          </div>
        </nav>
        {/* Content Area */}
        <main className={styles.contentArea} style={{flex: 1, minWidth: 0, padding: '8px 4px'}}>{renderContent()}</main>
      </div>

      {/* Edit Booking Modal */}
      {showEditModal && editBooking && (
        <EditBookingModal
          show={showEditModal}
          onHide={() => {
            setShowEditModal(false);
            setEditBooking(null);
          }}
          booking={editBooking}
          onUpdate={handleBookingUpdate}
          games={games}
        />
      )}
    </div>
  );
};

export default UserPanel;
