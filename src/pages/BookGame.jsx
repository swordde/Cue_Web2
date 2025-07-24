// src/pages/BookGame.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import Loading from "../components/Loading";
import { userService } from "../firebase/services";
import GameSelector from "../components/GameSelector";
import SlotGrid from "../components/SlotGrid";
import BookingModal from "../components/BookingModal";
import { Link, useNavigate } from 'react-router-dom';
import { gameService, slotService, bookingService, realtimeService, offlineBookingService } from "../firebase/services";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { signOut } from "firebase/auth";
import { useToast } from '../contexts/ToastContext';
import { createToastHelper } from '../utils/commonUtils';
import styles from './BookGame.module.css';

export default function BookGame() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // All bookings for the selected date and game
  const [offlineBookings, setOfflineBookings] = useState([]); // Offline bookings for occupied games
  const [showBookingView, setShowBookingView] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [summaryMinimized, setSummaryMinimized] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const [userData, setUserData] = useState(null);

  // Helper function to show toasts based on type
  const showToast = createToastHelper({ showSuccess, showError, showInfo });

  // Calendar functionality
  const generateCalendarDays = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isPast = date < today.setHours(0, 0, 0, 0);
      days.push({ date, day, isPast });
    }
    
    return days;
  };

  // Generate time slots from existing slots data
  const generateTimeSlots = () => {
    if (!slots || slots.length === 0) {
      console.log('No slots available');
      return [];
    }
    
    console.log('Generating time slots:', {
      slots: slots,
      allBookings: allBookings,
      offlineBookings: offlineBookings,
      selectedDate: selectedDate?.toISOString().split('T')[0],
      selectedGameId: selectedGame
    });
    
    return slots.map((slot, index) => {
      const slotTime = typeof slot === 'string' ? slot : slot.time;
      
      // Check if this slot is already booked by ANY user (not cancelled)
      const isBookedOnline = allBookings.some(booking => 
        booking.time === slotTime && 
        booking.status !== 'Cancelled'
      );
      
      // Check if this slot is occupied by offline bookings
      const isBookedOffline = checkOfflineBookingConflict(slotTime);
      
      const isBooked = isBookedOnline || isBookedOffline;
      
      console.log(`Slot ${slotTime}: isBooked=${isBooked} (online: ${isBookedOnline}, offline: ${isBookedOffline})`, {
        slotTime,
        matchingOnlineBookings: allBookings.filter(b => b.time === slotTime && b.status !== 'Cancelled'),
        conflictingOfflineBookings: offlineBookings.filter(b => checkTimeOverlap(slotTime, b))
      });
      
      return {
        id: index + 1,
        time24: slotTime,
        time12: slotTime,
        available: !isBooked,
        isBookedOffline: isBookedOffline
      };
    });
  };

  // Check if a time slot conflicts with offline bookings
  const checkOfflineBookingConflict = (slotTime) => {
    if (!selectedDate || !selectedGame || !offlineBookings.length) return false;
    
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    
    // Find the selected game
    const selectedGameObj = games.find(g => g.id === selectedGame);
    if (!selectedGameObj) return false;
    
    // Check for conflicts with offline bookings
    return offlineBookings.some(booking => {
      // Check if booking is for the same date and game/board
      if (booking.date !== selectedDateStr) return false;
      if (booking.board !== selectedGame && booking.board !== selectedGameObj.name) return false;
      if (booking.status === 'CLOSE') return false; // Closed bookings don't occupy the table
      
      // Check time overlap
      return checkTimeOverlap(slotTime, booking);
    });
  };

  // Check if a slot time overlaps with an offline booking time range
  const checkTimeOverlap = (slotTime, offlineBooking) => {
    if (!offlineBooking.startTime || !offlineBooking.endTime) return false;
    
    // Convert times to minutes for easier comparison
    const slotMinutes = timeToMinutes(slotTime);
    const slotEndMinutes = slotMinutes + 30; // Each slot is 30 minutes
    const bookingStartMinutes = timeToMinutes(offlineBooking.startTime);
    const bookingEndMinutes = timeToMinutes(offlineBooking.endTime);
    
    // Check for overlap: slot starts before booking ends AND slot ends after booking starts
    return slotMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes;
  };

  // Convert time string (HH:MM or HH:MM AM/PM) to minutes since midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    
    // Handle 24-hour format (HH:MM)
    if (timeStr.includes(':') && !timeStr.includes('AM') && !timeStr.includes('PM')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }
    
    // Handle 12-hour format (HH:MM AM/PM)
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    if (period === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period === 'AM' && hours === 12) {
      totalMinutes -= 12 * 60;
    }
    
    return totalMinutes;
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlots([]); // Reset slot selection when date changes
  };

  const handleSlotSelect = (slot) => {
    if (!slot.available) return;
    
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.id === slot.id);
      if (isSelected) {
        // Remove slot if already selected
        return prev.filter(s => s.id !== slot.id);
      } else {
        // Add slot to selection
        return [...prev, slot].sort((a, b) => a.id - b.id);
      }
    });
  };

  const calculateTotalPrice = () => {
    const selectedGameObj = games.find(g => g.id === selectedGame);
    if (!selectedGameObj) return 0;
    const pricePerHour = parseInt(selectedGameObj.price?.toString().replace(/[^\d]/g, '') || '0');
    const totalHours = selectedSlots.length * 0.5; // Each slot is 30 minutes
    return pricePerHour * totalHours;
  };

  const handleBookingReview = () => {
    if (selectedDate && selectedSlots.length > 0) {
      setShowBookingPopup(true);
    }
  };

  const confirmFinalBooking = async () => {
    if (!currentUser) {
      showToast('Please login to book a slot.', 'error');
      return;
    }
    if (userData && userData.isActive === false) {
      showToast('Your account is deactivated. Please contact support.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Normalize phone number for user field
      let mobile = currentUser.phoneNumber;
      if (mobile && mobile.startsWith('+91')) {
        mobile = mobile.slice(3);
      }
      const userId = mobile || currentUser.email;
      const selectedGameObj = games.find(g => g.id === selectedGame);

      // Book all selected slots
      for (const slot of selectedSlots) {
        await bookingService.createBooking({
          game: selectedGameObj, // Use the full game object
          gameId: selectedGame, // Use the game ID string
          date: selectedDate.toISOString().split('T')[0],
          time: slot.time12,
          user: userId,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        });
      }

      const timeRange = selectedSlots.length > 1 
        ? `${selectedSlots[0].time12} - ${selectedSlots[selectedSlots.length - 1].time12}` 
        : selectedSlots[0].time12;

      showToast(`Booking confirmed!\nGame: ${games.find(g => g.id === selectedGame)?.name}\nDate: ${selectedDate.toDateString()}\nTime: ${timeRange}\nTotal Price: ₹${calculateTotalPrice()}`, 'success');
      
      setShowBookingPopup(false);
      setShowBookingView(false);
      setSelectedGame('');
      setSelectedDate(null);
      setSelectedSlots([]);
    } catch (err) {
      showToast('Booking failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = () => {
    setShowBookingPopup(false);
  };

  const handleGameSelect = (gameId) => {
    setSelectedGame(gameId);
    setShowBookingView(true);
    setSelectedDate(null);
    setSelectedSlots([]);
  };

  const handleBackToGames = () => {
    setShowBookingView(false);
    setSelectedGame('');
    setSelectedDate(null);
    setSelectedSlots([]);
    // Don't navigate, just go back to game selection view
  };

  const handleTopNavBack = () => {
    if (showBookingView) {
      // If in booking view, go back to games selection
      handleBackToGames();
    } else {
      // If in games selection view, go back to dashboard
      navigate('/dashboard');
    }
  };
  
  // Real-time listeners refs
  const gamesUnsub = useRef(null);
  const slotsUnsub = useRef(null);
  const userBookingsUnsub = useRef(null);
  const allBookingsUnsub = useRef(null);
  const offlineBookingsUnsub = useRef(null);
  const listenersSetup = useRef(false);

  // Setup real-time listeners
  const setupRealTimeListeners = useCallback(() => {
    if (listenersSetup.current) {
      console.log('Listeners already setup, skipping...');
      return;
    }
    
    console.log('Setting up real-time listeners for BookGame...');
    listenersSetup.current = true;
    
    // Real-time games listener
    gamesUnsub.current = gameService.onGamesChange((allGames) => {
      console.log('Games updated:', allGames.length);
      const activeGames = allGames.filter(game => game.isActive);
      setGames(activeGames);
      if (activeGames.length > 0 && !selectedGame) {
        setSelectedGame(activeGames[0].id);
      }
      setLoading(false);
    });
  }, [selectedGame]);

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Normalize phone number
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
        setUserName(userData?.name || "User");
        setUserData(userData);
        if (userData && userData.isActive === false) {
          await signOut(auth);
          showToast('Your account has been deactivated. Please contact support.', 'error');
          navigate('/login');
          return;
        }
        
        // Setup real-time listeners after authentication
        setupRealTimeListeners();
        
        // Setup user bookings listener
        const userId = mobile || user.email;
        userBookingsUnsub.current = realtimeService.onUserBookingsChange(userId, (bookings) => {
          console.log('User bookings updated:', bookings.length);
          console.log('User bookings data:', bookings);
          setUserBookings(bookings);
        });
      }
    });
    return () => {
      unsubscribe();
      // Cleanup real-time listeners
      if (gamesUnsub.current) gamesUnsub.current();
      if (slotsUnsub.current) slotsUnsub.current();
      if (userBookingsUnsub.current) userBookingsUnsub.current();
      if (allBookingsUnsub.current) allBookingsUnsub.current();
      if (offlineBookingsUnsub.current) offlineBookingsUnsub.current();
      listenersSetup.current = false;
    };
    // eslint-disable-next-line
  }, [navigate, setupRealTimeListeners]);



  // Setup slots and bookings listeners when selectedGame or selectedDate changes
  useEffect(() => {
    // Cleanup existing listeners
    if (slotsUnsub.current) {
      slotsUnsub.current();
    }
    if (allBookingsUnsub.current) {
      allBookingsUnsub.current();
    }
    
    if (selectedGame && selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      console.log('Setting up listeners for:', dateString, selectedGame);
      
      // Setup slots listener
      slotsUnsub.current = slotService.onSlotsChange(dateString, selectedGame, (slotList) => {
        console.log('Slots updated:', slotList.length);
        setSlots(slotList);
        setLoading(false);
      });
      
      // Setup all bookings listener for this date and game
      allBookingsUnsub.current = realtimeService.onBookingsByDateAndGameChange(dateString, selectedGame, (bookings) => {
        console.log('All bookings updated for', dateString, selectedGame, ':', bookings.length);
        console.log('Bookings data:', bookings);
        setAllBookings(bookings);
      });

      // Setup real-time offline bookings listener
      offlineBookingsUnsub.current = offlineBookingService.onOfflineBookingsChange((allOfflineBookings) => {
        // Filter for the selected date - we need all games for this date to check conflicts
        const dateOfflineBookings = allOfflineBookings.filter(booking => 
          booking.date === dateString && booking.status !== 'CLOSE'
        );
        console.log('Real-time offline bookings updated for', dateString, ':', dateOfflineBookings.length);
        setOfflineBookings(dateOfflineBookings);
      });
    } else {
      setSlots([]);
      setAllBookings([]);
      setOfflineBookings([]);
    }

    return () => {
      if (slotsUnsub.current) {
        slotsUnsub.current();
      }
      if (allBookingsUnsub.current) {
        allBookingsUnsub.current();
      }
      if (offlineBookingsUnsub.current) {
        offlineBookingsUnsub.current();
      }
    };
  }, [selectedGame, selectedDate]);

  const selectedGameObj = games.find(g => g.id === selectedGame);

  // Handle booking
  const handleBooking = async () => {
    if (!currentUser) {
      setAlert({ message: 'Please login to book a slot.', type: 'danger' });
      return;
    }
    if (userData && userData.isActive === false) {
      setAlert({ message: 'Your account is deactivated. Please contact support.', type: 'danger' });
      return;
    }
    setLoading(true);
    try {
      // Normalize phone number for user field
      let mobile = currentUser.phoneNumber;
      if (mobile && mobile.startsWith('+91')) {
        mobile = mobile.slice(3);
      }
      const userId = mobile || currentUser.email;
      await bookingService.createBooking({
        game: selectedGameObj,
        gameId: selectedGameObj?.id, // Add separate gameId for easier querying
        date: selectedDate,
        time: selectedTime,
        user: userId,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
      setAlert({ message: `Booking successful!\nGame: ${selectedGameObj?.name}\nDate: ${selectedDate}\nTime: ${selectedTime}` , type: 'success' });
      setShowModal(false);
      // No need to manually refresh - real-time listener will update automatically
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
      <div className={styles.bookGamePage}>
        <div className={styles.alert + ' ' + styles.alertDanger}>
          <div className={styles.alertContent}>
            <h4>Error Loading Games</h4>
            <p>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
        {/* Background Effects */}
        <div className={styles.backgroundEffects}>
          <div className={styles.floatingOrb}></div>
          <div className={styles.floatingOrb}></div>
          <div className={styles.floatingOrb}></div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.bookGamePage} style={{minHeight: '100vh', width: '100%', overflowX: 'hidden', padding: '8px'}}>
      {/* Mobile-friendly top navigation bar */}
      <div className={styles.topNavBar} style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '12px 16px',
        borderRadius: '0 0 16px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        border: '1px solid rgba(255, 193, 7, 0.2)'
      }}>
        <button 
          onClick={handleTopNavBack}
          className={styles.backButton} 
          style={{
            fontSize: '0.9rem', 
            padding: '8px 16px',
            minWidth: 'auto',
            whiteSpace: 'nowrap',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '2px solid rgba(255, 193, 7, 0.3)',
            color: '#ffc107',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back
        </button>
        <div style={{
          flex: 1,
          textAlign: 'center',
          minWidth: '120px'
        }}>
          <h1 className={styles.title} style={{
            fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
            margin: 0,
            lineHeight: 1.2
          }}>
            Book Game
          </h1>
        </div>
        <div style={{minWidth: '80px'}}></div> {/* Spacer for balance */}
      </div>

      {/* Real-time Status Indicator */}
      {selectedGame && selectedDate && (
        <div className={styles.realTimeStatus} style={{
          margin: '0 8px 12px 8px',
          padding: '8px 12px',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '8px',
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
          <span>🟢 Live occupancy status</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.8}}>
            {allBookings.length + offlineBookings.filter(b => 
              b.date === selectedDate.toISOString().split('T')[0] && 
              (b.board === selectedGame || b.board === games.find(g => g.id === selectedGame)?.name) &&
              b.status !== 'CLOSE'
            ).length} active bookings
          </span>
        </div>
      )}

      {/* Alert Messages */}
      {alert.message && (
        <div className={`${styles.alert} ${alert.type === 'danger' ? styles.alertDanger : ''}`} style={{
          margin: '0 8px 16px 8px',
          fontSize: '0.9rem',
          borderRadius: '8px'
        }}>
          <div className={styles.alertContent}>
            {alert.message}
          </div>
          <button 
            className={styles.closeButton} 
            onClick={() => setAlert({ message: '', type: '' })}
            style={{fontSize: '1.2rem', minWidth: '32px'}}
          >
            ×
          </button>
        </div>
      )}

      {!showBookingView ? (
        // Games Selection View
        <>
          {/* Games Container */}
          <div className={styles.gamesContainer} style={{
            width: '100%', 
            minWidth: 0, 
            padding: '0 8px',
            maxWidth: '100%'
          }}>
            <div className={styles.gamesGrid} style={{
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', 
              gap: 'clamp(12px, 3vw, 20px)', 
              width: '100%', 
              minWidth: 0,
              padding: '0'
            }}>
              {games.map((game, index) => (
                <div
                  key={game.id}
                  className={`${styles.gameCard} ${selectedGame === game.id ? styles.selected : ''}`}
                  style={{ 
                    '--card-delay': `${index * 0.1}s`, 
                    minWidth: 0, 
                    width: '100%', 
                    maxWidth: '100%', 
                    margin: '0',
                    padding: 'clamp(16px, 4vw, 25px)'
                  }}
                  onClick={() => handleGameSelect(game.id)}
                >
                  <div className={styles.cardGlow}></div>
                  <div className={styles.cardContent}>
                    {game.image && (
                      <img 
                        src={game.image} 
                        alt={game.name + ' image'} 
                        className={styles.gameImage}
                        style={{
                          height: 'clamp(100px, 20vw, 140px)',
                          width: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <h5 className={styles.gameName} style={{
                      fontSize: 'clamp(1.1rem, 3.5vw, 1.3rem)',
                      margin: '8px 0'
                    }}>
                      {game.name}
                    </h5>
                    {game.category && (
                      <span className={styles.gameCategory} style={{
                        fontSize: 'clamp(0.7rem, 2.5vw, 0.8rem)',
                        padding: '3px 8px'
                      }}>
                        {game.category}
                      </span>
                    )}
                    <div className={styles.gamePrice} style={{
                      fontSize: 'clamp(1rem, 3vw, 1.1rem)',
                      margin: '8px 0'
                    }}>
                      ₹{game.price || 0}
                    </div>
                    {game.description && (
                      <div className={styles.gameDescription} style={{
                        fontSize: 'clamp(0.8rem, 2.2vw, 0.85rem)',
                        lineHeight: 1.3
                      }}>
                        {game.description.substring(0, 60)}
                        {game.description.length > 60 ? '...' : ''}
                      </div>
                    )}
                    {/* Game features if available */}
                    {game.features && (
                      <div className={styles.gameFeatures} style={{
                        fontSize: 'clamp(0.7rem, 2vw, 0.8rem)'
                      }}>
                        {game.features.slice(0, 3).map((feature, idx) => (
                          <span key={idx} className={styles.feature}>• {feature}</span>
                        ))}
                      </div>
                    )}
                    <button 
                      className={styles.bookButton} 
                      style={{
                        width: '100%', 
                        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)', 
                        padding: 'clamp(8px, 2.5vw, 12px) 0', 
                        marginTop: '8px'
                      }}
                    >
                      Book Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        // Calendar Booking View
        <div className={styles.bookingView} style={{
          padding: '0 8px',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}>
          {/* Mobile-friendly Booking Header */}
          <div className={styles.header} style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div className={styles.gameInfo} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 193, 7, 0.2)'
            }}>
              {games.find(g => g.id === selectedGame)?.image ? (
                <img 
                  src={games.find(g => g.id === selectedGame)?.image} 
                  alt={games.find(g => g.id === selectedGame)?.name + ' image'} 
                  className={styles.gameIconImage}
                  style={{
                    width: 'clamp(40px, 10vw, 60px)',
                    height: 'clamp(40px, 10vw, 60px)',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
              ) : (
                <div className={styles.gameIcon} style={{
                  fontSize: 'clamp(1.5rem, 6vw, 2rem)'
                }}>🎮</div>
              )}
              <div className={styles.gameDetails}>
                <h1 className={styles.gameName} style={{
                  fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
                  margin: '0 0 4px 0'
                }}>
                  {games.find(g => g.id === selectedGame)?.name}
                </h1>
                <p className={styles.gamePrice} style={{
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                  margin: 0,
                  color: '#4CAF50'
                }}>
                  ₹{games.find(g => g.id === selectedGame)?.price} per hour
                </p>
              </div>
            </div>
          </div>

          {/* Mobile-friendly Step Indicator */}
          <div className={styles.stepIndicator} style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 'clamp(8px, 3vw, 16px)',
            marginBottom: '20px',
            padding: '0 8px',
            flexWrap: 'wrap'
          }}>
            <div className={`${styles.step} ${styles.active}`} style={{
              minWidth: '120px',
              textAlign: 'center'
            }}>
              <span className={styles.stepNumber} style={{
                fontSize: 'clamp(0.8rem, 2.5vw, 1rem)'
              }}>1</span>
              <span className={styles.stepLabel} style={{
                fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'
              }}>Select Date</span>
            </div>
            <div className={`${styles.step} ${selectedDate ? styles.active : ''}`} style={{
              minWidth: '120px',
              textAlign: 'center'
            }}>
              <span className={styles.stepNumber} style={{
                fontSize: 'clamp(0.8rem, 2.5vw, 1rem)'
              }}>2</span>
              <span className={styles.stepLabel} style={{
                fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'
              }}>Select Time</span>
            </div>
            <div className={`${styles.step} ${selectedDate && selectedSlots.length > 0 ? styles.active : ''}`} style={{
              minWidth: '120px',
              textAlign: 'center'
            }}>
              <span className={styles.stepNumber} style={{
                fontSize: 'clamp(0.8rem, 2.5vw, 1rem)'
              }}>3</span>
              <span className={styles.stepLabel} style={{
                fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'
              }}>Confirm</span>
            </div>
          </div>

          {/* Mobile-friendly Booking Container */}
          <div className={styles.bookingContainer} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            width: '100%',
            maxWidth: '100%'
          }}>
            
            {/* Mobile-optimized Calendar Section */}
            <div className={styles.calendarSection} style={{
              width: '100%',
              maxWidth: '100%'
            }}>
              <h2 className={styles.sectionTitle} style={{
                fontSize: 'clamp(1.1rem, 4vw, 1.3rem)',
                textAlign: 'center',
                marginBottom: '12px'
              }}>Select Date</h2>
              <div className={styles.calendarHeader}>
                <h3 className={styles.monthYear} style={{
                  fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
                  textAlign: 'center'
                }}>
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              
              <div className={styles.calendar} style={{
                maxWidth: '100%',
                margin: '0 auto'
              }}>
                <div className={styles.weekDays} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px',
                  marginBottom: '8px'
                }}>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Sun</div>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Mon</div>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Tue</div>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Wed</div>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Thu</div>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Fri</div>
                  <div className={styles.weekDay} style={{fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)', textAlign: 'center', padding: '4px'}}>Sat</div>
                </div>
                
                <div className={styles.calendarDays} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '2px'
                }}>
                  {generateCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`${styles.calendarDay} 
                        ${day && !day.isPast ? styles.available : ''} 
                        ${day && selectedDate && day.date.toDateString() === selectedDate.toDateString() ? styles.selected : ''}
                        ${day && day.isPast ? styles.past : ''}`}
                      onClick={() => day && !day.isPast && handleDateSelect(day.date)}
                      style={{
                        padding: 'clamp(8px, 3vw, 12px)',
                        fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
                        textAlign: 'center',
                        minHeight: 'clamp(32px, 8vw, 48px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: day && !day.isPast ? 'pointer' : 'default'
                      }}
                    >
                      {day ? day.day : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile-optimized Time Slots Section - Only show if date is selected */}
            {selectedDate && (
              <div className={styles.slotsSection} style={{
                width: '100%',
                maxWidth: '100%'
              }}>
                <h2 className={styles.sectionTitle} style={{
                  fontSize: 'clamp(1.1rem, 4vw, 1.3rem)',
                  textAlign: 'center',
                  marginBottom: '8px'
                }}>
                  Select Time Slots for {selectedDate.toDateString()}
                </h2>
                <p className={styles.multiSelectHint} style={{
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                  textAlign: 'center',
                  marginBottom: '16px',
                  color: 'rgba(255, 255, 255, 0.7)'
                }}>
                  💡 You can select multiple 30-minute slots. Tap to add/remove slots.
                </p>
                <div className={styles.slotsGrid} style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: 'clamp(8px, 2vw, 12px)',
                  width: '100%',
                  maxWidth: '100%'
                }}>
                  {generateTimeSlots().map((slot) => (
                    <div
                      key={slot.id}
                      className={`${styles.timeSlot} 
                        ${slot.available ? styles.available : styles.booked}
                        ${slot.isBookedOffline ? styles.offlineBooked : ''}
                        ${selectedSlots.some(s => s.id === slot.id) ? styles.selected : ''}`}
                      onClick={() => handleSlotSelect(slot)}
                      style={{
                        padding: 'clamp(8px, 2.5vw, 12px)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: slot.available ? 'pointer' : 'not-allowed',
                        minHeight: 'clamp(60px, 15vw, 80px)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 'clamp(0.7rem, 2.2vw, 0.9rem)',
                        backgroundColor: slot.isBookedOffline ? 'rgba(255, 152, 0, 0.2)' : 
                                       !slot.available ? 'rgba(220, 53, 69, 0.2)' : 
                                       'rgba(25, 135, 84, 0.2)',
                        borderColor: slot.isBookedOffline ? '#ff9800' : 
                                   !slot.available ? '#dc3545' : 
                                   '#198754',
                        borderWidth: '2px',
                        borderStyle: 'solid'
                      }}
                      title={slot.isBookedOffline ? 'Occupied by Offline Booking' : 
                             !slot.available ? 'Booked Online' : 
                             'Available for Booking'}
                    >
                      <span className={styles.slotTime} style={{
                        fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
                        fontWeight: 'bold'
                      }}>
                        {slot.time12}
                      </span>
                      <span className={styles.slotStatus} style={{
                        fontSize: 'clamp(0.6rem, 2vw, 0.8rem)',
                        marginTop: '2px'
                      }}>
                        {slot.available ? '30 min' : 
                         slot.isBookedOffline ? 'Occupied' : 'Booked'}
                      </span>
                      {slot.isBookedOffline && (
                        <span style={{
                          fontSize: 'clamp(0.5rem, 1.8vw, 0.7rem)',
                          color: '#ff9800',
                          marginTop: '1px',
                          fontWeight: 'bold'
                        }}>
                          (Offline)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile-friendly Instructions when no date selected */}
            {!selectedDate && (
              <div className={styles.instructionsSection} style={{
                textAlign: 'center',
                padding: 'clamp(20px, 6vw, 40px)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '2px dashed rgba(255, 193, 7, 0.3)',
                borderRadius: '16px',
                backdropFilter: 'blur(15px)',
                margin: '0 8px'
              }}>
                <div className={styles.instructionsContent}>
                  <h2 className={styles.instructionsTitle} style={{
                    fontSize: 'clamp(1.2rem, 4.5vw, 1.5rem)',
                    marginBottom: '12px'
                  }}>📅 First, Select a Date</h2>
                  <p className={styles.instructionsText} style={{
                    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                    marginBottom: '20px',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    Choose an available date from the calendar to see time slots
                  </p>
                  <div className={styles.instructionsFeatures} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <div className={styles.instructionItem} style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ⏰ <span>30-minute time slots</span>
                    </div>
                    <div className={styles.instructionItem} style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🔄 <span>Select multiple slots</span>
                    </div>
                    <div className={styles.instructionItem} style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      💰 <span>Pay per slot selected</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile-optimized Booking Summary */}
          {selectedDate && selectedSlots.length > 0 && (
            <div className={`${styles.bookingSummary} ${summaryMinimized ? styles.minimized : ''}`} style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(15px)',
              border: '2px solid rgba(255, 193, 7, 0.3)',
              borderRadius: summaryMinimized ? '0' : '16px 16px 0 0',
              margin: 0,
              zIndex: 1000,
              maxHeight: summaryMinimized ? '60px' : '60vh',
              overflowY: 'auto'
            }}>
              <div className={styles.summaryHeader} style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: summaryMinimized ? 'none' : '1px solid rgba(255, 193, 7, 0.2)'
              }}>
                <h3 className={styles.summaryTitle} style={{
                  fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
                  margin: 0,
                  color: '#ffc107'
                }}>
                  {summaryMinimized ? `₹${calculateTotalPrice()} - ${selectedSlots.length} slots` : 'Booking Summary'}
                </h3>
                <button 
                  className={styles.minimizeButton}
                  onClick={() => setSummaryMinimized(!summaryMinimized)}
                  title={summaryMinimized ? "Expand summary" : "Minimize summary"}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffc107',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {summaryMinimized ? '📋' : '−'}
                </button>
              </div>
              
              {!summaryMinimized && (
                <div className={styles.summaryContent} style={{
                  padding: '16px'
                }}>
                  <div className={styles.summaryDetails} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '16px',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)'
                  }}>
                    <div className={styles.summaryItem} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gridColumn: '1 / -1'
                    }}>
                      <span className={styles.summaryLabel}>Game:</span>
                      <span className={styles.summaryValue}>{games.find(g => g.id === selectedGame)?.name}</span>
                    </div>
                    <div className={styles.summaryItem} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gridColumn: '1 / -1'
                    }}>
                      <span className={styles.summaryLabel}>Date:</span>
                      <span className={styles.summaryValue}>{selectedDate.toLocaleDateString()}</span>
                    </div>
                    <div className={styles.summaryItem} style={{
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span className={styles.summaryLabel}>Slots:</span>
                      <span className={styles.summaryValue}>{selectedSlots.length}</span>
                    </div>
                    <div className={styles.summaryItem} style={{
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span className={styles.summaryLabel}>Duration:</span>
                      <span className={styles.summaryValue}>{selectedSlots.length * 0.5}h</span>
                    </div>
                    <div className={styles.summaryItem} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gridColumn: '1 / -1',
                      fontWeight: 'bold',
                      color: '#4CAF50',
                      borderTop: '1px solid rgba(255, 193, 7, 0.2)',
                      paddingTop: '8px'
                    }}>
                      <span className={styles.summaryLabel}>Total:</span>
                      <span className={styles.summaryValue}>₹{calculateTotalPrice()}</span>
                    </div>
                  </div>
                  
                  {/* Selected slots preview */}
                  <div className={styles.selectedSlotsPreview} style={{
                    marginBottom: '16px'
                  }}>
                    <span className={styles.previewLabel} style={{
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                      display: 'block',
                      marginBottom: '8px'
                    }}>Selected Times:</span>
                    <div className={styles.selectedSlotsList} style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px'
                    }}>
                      {selectedSlots.map((slot, index) => (
                        <span key={slot.id} className={styles.selectedSlotChip} style={{
                          background: 'rgba(255, 193, 7, 0.2)',
                          color: '#ffc107',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: 'clamp(0.7rem, 2vw, 0.8rem)',
                          border: '1px solid rgba(255, 193, 7, 0.3)'
                        }}>
                          {slot.time12}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    className={styles.confirmButton} 
                    onClick={handleBookingReview}
                    style={{
                      width: '100%',
                      padding: 'clamp(12px, 3vw, 16px)',
                      background: 'linear-gradient(135deg, #ffc107 0%, #ffbf00 100%)',
                      color: 'black',
                      border: 'none',
                      borderRadius: '25px',
                      fontSize: 'clamp(1rem, 3vw, 1.1rem)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Review Booking (₹{calculateTotalPrice()})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile-optimized Booking Confirmation Popup */}
      {showBookingPopup && (
        <div className={styles.popupOverlay} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div className={styles.bookingPopup} style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
            borderRadius: '16px',
            border: '2px solid rgba(255, 193, 7, 0.3)',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div className={styles.popupHeader} style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 193, 7, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 className={styles.popupTitle} style={{
                fontSize: 'clamp(1.1rem, 4vw, 1.3rem)',
                margin: 0,
                color: '#ffc107'
              }}>🎯 Confirm Your Booking</h2>
              <button 
                className={styles.closeButton} 
                onClick={cancelBooking}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffc107',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.popupContent} style={{
              padding: '16px'
            }}>
              <div className={styles.gamePreview} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 193, 7, 0.2)'
              }}>
                {games.find(g => g.id === selectedGame)?.image ? (
                  <img 
                    src={games.find(g => g.id === selectedGame)?.image} 
                    alt={games.find(g => g.id === selectedGame)?.name + ' image'} 
                    className={styles.gameIconLarge}
                    style={{
                      width: 'clamp(40px, 12vw, 60px)',
                      height: 'clamp(40px, 12vw, 60px)',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div className={styles.gameIconLarge} style={{
                    fontSize: 'clamp(2rem, 8vw, 3rem)',
                    width: 'clamp(40px, 12vw, 60px)',
                    height: 'clamp(40px, 12vw, 60px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>🎮</div>
                )}
                <div className={styles.gameInfo}>
                  <h3 className={styles.gameNameLarge} style={{
                    fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
                    margin: '0 0 4px 0',
                    color: '#ffc107'
                  }}>
                    {games.find(g => g.id === selectedGame)?.name}
                  </h3>
                  <p className={styles.gamePriceLarge} style={{
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                    margin: 0,
                    color: '#4CAF50'
                  }}>
                    ₹{games.find(g => g.id === selectedGame)?.price} per hour
                  </p>
                </div>
              </div>

              <div className={styles.bookingDetails} style={{
                marginBottom: '16px'
              }}>
                <div className={styles.detailRow} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)'
                }}>
                  <span className={styles.detailLabel}>📅 Date:</span>
                  <span className={styles.detailValue}>{selectedDate?.toLocaleDateString()}</span>
                </div>
                
                <div className={styles.detailRow} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)'
                }}>
                  <span className={styles.detailLabel}>⏱️ Duration:</span>
                  <span className={styles.detailValue}>{selectedSlots.length * 0.5} hours ({selectedSlots.length} slots)</span>
                </div>
              </div>

              <div className={styles.selectedTimesSection} style={{
                marginBottom: '16px'
              }}>
                <h4 className={styles.timesTitle} style={{
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                  marginBottom: '8px',
                  color: '#ffc107'
                }}>🕐 Selected Time Slots:</h4>
                <div className={styles.timeSlotsList} style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  borderRadius: '8px',
                  padding: '8px'
                }}>
                  {selectedSlots.map((slot, index) => (
                    <div key={slot.id} className={styles.timeSlotItem} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 0',
                      fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)'
                    }}>
                      <span className={styles.timeSlotNumber}>{index + 1}.</span>
                      <span className={styles.timeSlotTime}>{slot.time12}</span>
                      <span className={styles.timeSlotDuration}>(30 min)</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.pricingBreakdown} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 193, 7, 0.2)'
              }}>
                <div className={styles.priceRow} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)'
                }}>
                  <span className={styles.priceLabel}>Base price per hour:</span>
                  <span className={styles.priceValue}>₹{games.find(g => g.id === selectedGame)?.price}</span>
                </div>
                <div className={styles.priceRow} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)'
                }}>
                  <span className={styles.priceLabel}>Total slots ({selectedSlots.length} × 30 min):</span>
                  <span className={styles.priceValue}>{selectedSlots.length * 0.5} hours</span>
                </div>
                <div className={styles.totalPriceRow} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 193, 7, 0.3)',
                  paddingTop: '8px',
                  fontSize: 'clamp(0.9rem, 3vw, 1rem)',
                  fontWeight: 'bold',
                  color: '#4CAF50'
                }}>
                  <span className={styles.totalLabel}>Total Amount:</span>
                  <span className={styles.totalValue}>₹{calculateTotalPrice()}</span>
                </div>
              </div>
            </div>

            <div className={styles.popupActions} style={{
              padding: '16px',
              borderTop: '1px solid rgba(255, 193, 7, 0.2)',
              display: 'flex',
              gap: '12px'
            }}>
              <button 
                className={styles.cancelButton} 
                onClick={cancelBooking}
                style={{
                  flex: 1,
                  padding: 'clamp(10px, 3vw, 14px)',
                  background: 'transparent',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '25px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.finalConfirmButton} 
                onClick={confirmFinalBooking}
                style={{
                  flex: 2,
                  padding: 'clamp(10px, 3vw, 14px)',
                  background: 'linear-gradient(135deg, #ffc107 0%, #ffbf00 100%)',
                  color: 'black',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Confirm ₹{calculateTotalPrice()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Effects */}
      <div className={styles.backgroundEffects}>
        <div className={styles.floatingOrb}></div>
        <div className={styles.floatingOrb}></div>
        <div className={styles.floatingOrb}></div>
      </div>
    </div>
  );
}
