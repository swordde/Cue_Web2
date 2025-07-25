import { useState, useEffect, useRef } from "react";
import "../AppDarkMode.css";
import Loading from "../components/Loading";
import BookingStatusHistory from "../components/BookingStatusHistory";
import GameBookingsChart from "../components/GameBookingsChart";
import WeeklyLineChart from "../components/WeeklyLineChart";
import GameAnalyticsChart from "../components/GameAnalyticsChart";
import CurrentOccupancy from "../components/CurrentOccupancy";

import { userService } from "../firebase/services";
import { useNavigate } from "react-router-dom";
import { gameService, slotService, bookingService, realtimeService, offlineBookingService, analyticsService, logAdminAction } from "../firebase/services";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut, getIdTokenResult } from "firebase/auth";
import { useToast } from "../contexts/ToastContext";
import toast from 'react-hot-toast';




export default function AdminPanel() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    // Try to load from localStorage, fallback to 'light'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminTheme') || 'light';
    }
    return 'light';
  });
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminTheme', next);
      }
      return next;
    });
  };
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState('bookings');
  // Add User state
  const [newUser, setNewUser] = useState({ name: '', mobile: '', email: '' });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');
  // Add user handler
  const handleAddUser = async () => {
    setAddUserError('');
    setAddUserSuccess('');
    if (!newUser.name || !newUser.mobile) {
      setAddUserError('Name and mobile are required.');
      return;
    }
    setAddUserLoading(true);
    try {
      // Check if user already exists by mobile
      const existingUser = await userService.getUserByMobile(newUser.mobile);
      if (existingUser) {
        setAddUserError('A user with this mobile number already exists.');
        setAddUserLoading(false);
        return;
      }
      await userService.createUser({
        name: newUser.name,
        mobile: newUser.mobile,
        email: newUser.email || '',
        createdAt: new Date(),
      });
      setAddUserSuccess('User added successfully!');
      setNewUser({ name: '', mobile: '', email: '' });
      // Optionally reload users
      userService.getAllUsers().then((allUsers) => {
        setUsers(allUsers);
        const map = {};
        allUsers.forEach(u => { map[u.mobile] = u; });
        setUserMap(map);
      });
    } catch (err) {
      console.error('Add user error:', err);
      setAddUserError('Failed to add user: ' + (err && err.message ? err.message : JSON.stringify(err)));
    } finally {
      setAddUserLoading(false);
    }
  };
  const navigate = useNavigate();
  const [filterGame, setFilterGame] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // Toast notifications
  const { showNewBooking, showStatusChange, showSuccess, showError } = useToast();
  const previousBookingsRef = useRef([]);
  const isInitialLoadRef = useRef(true);

  // Function to dismiss all notifications
  const dismissAllNotifications = () => {
    toast.dismiss();
  };
  
  // Admin settings state
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedGames, setSelectedGames] = useState([]); // Changed to array for multiple games
  const [slots, setSlots] = useState([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]); // Changed to array for multiple times
  // Standard 30-minute time slots from 9:00 AM to 12:00 AM
  const timeSlotOptions = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", 
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", 
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM", "12:00 AM"
  ];
  const [newGame, setNewGame] = useState({ name: "", price: 0, category: "", isActive: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, false = not admin, true = admin
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [selectedBookingHistory, setSelectedBookingHistory] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);

  // Offline Bookings state
  const [offlineBookings, setOfflineBookings] = useState([]);
  const [newOfflineBooking, setNewOfflineBooking] = useState({
    slNo: 1,
    customerName: '',
    board: '',
    status: 'OPEN',
    amount: 0,
    discount: 0,
    cashAmount: 0,
    gpayAmount: 0,
    settlement: 'SETTLED',
    date: new Date().toISOString().split('T')[0], // Auto-set today's date
    startTime: '',
    endTime: '',
    duration: 1,
    notes: ''
  });
  const [offlineBookingLoading, setOfflineBookingLoading] = useState(false);
  const [isEditingOfflineBooking, setIsEditingOfflineBooking] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  
  // Card-based booking system state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  
  // Smart features state
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [autoCalculateEnabled, setAutoCalculateEnabled] = useState(true);
  
  // Enhanced smart features
  const [smartRecommendations, setSmartRecommendations] = useState([]);
  const [customerHistory, setCustomerHistory] = useState({});
  const [popularTimeSlots, setPopularTimeSlots] = useState([]);
  const [smartPricingEnabled, setSmartPricingEnabled] = useState(true);
  const [quickBookingMode, setQuickBookingMode] = useState(false);
  const [autoEndTimeEnabled, setAutoEndTimeEnabled] = useState(true);
  const [conflictDetection, setConflictDetection] = useState(true);

  // Weekly Analytics state
  const [weeklyAnalytics, setWeeklyAnalytics] = useState(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = current week, -1 = last week, 1 = next week
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedWeekRange, setSelectedWeekRange] = useState(() => analyticsService.getWeekDateRange(0));

  // Smart Serial Number and Date-based Backup state
  const [dateBasedBookings, setDateBasedBookings] = useState({});
  const [selectedViewDate, setSelectedViewDate] = useState('all');
  const [availableDates, setAvailableDates] = useState([]);
  const [smartSerialNumber, setSmartSerialNumber] = useState(1);

  // Individual Game Analytics state
  const [selectedGameAnalytics, setSelectedGameAnalytics] = useState(null);
  const [gameAnalyticsLoading, setGameAnalyticsLoading] = useState(false);
  const [showGameAnalytics, setShowGameAnalytics] = useState(false);

  // Dynamic board rates from games
  const getBoardRate = (gameId) => {
    if (!gameId) return 0;
    
    // Find the game by ID or name
    const game = games.find(g => g.id === gameId || g.name === gameId);
    return game ? game.price : 0;
  };

  // Get all available games/boards with their rates
  const getAvailableBoards = () => {
    // Filter only active games that can be used as boards/tables
    return games
      .filter(game => game.isActive !== false) // Include games that are active or don't have isActive property
      .map(game => ({
        id: game.id,
        name: game.name,
        rate: game.price,
        category: game.category
      }));
  };

  // Smart Analytics Functions
  const analyzeCustomerBehavior = (customerName) => {
    if (!customerName) return null;
    
    const customerBookings = offlineBookings.filter(b => 
      b.customerName.toLowerCase() === customerName.toLowerCase()
    );
    
    if (customerBookings.length === 0) return null;
    
    // Analyze patterns
    const gamePreferences = {};
    const timePreferences = {};
    const durationTotals = [];
    let totalSpent = 0;
    
    customerBookings.forEach(booking => {
      // Game preferences
      const game = games.find(g => g.id === booking.board)?.name || booking.board;
      gamePreferences[game] = (gamePreferences[game] || 0) + 1;
      
      // Time preferences
      if (booking.startTime) {
        const hour = parseInt(booking.startTime.split(':')[0]);
        const timeSlot = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
        timePreferences[timeSlot] = (timePreferences[timeSlot] || 0) + 1;
      }
      
      // Duration and spending
      durationTotals.push(booking.duration || 1);
      totalSpent += (booking.amount || 0) - (booking.discount || 0);
    });
    
    return {
      totalBookings: customerBookings.length,
      favoriteGame: Object.keys(gamePreferences).length > 0 ? 
        Object.keys(gamePreferences).reduce((a, b) => 
          gamePreferences[a] > gamePreferences[b] ? a : b, Object.keys(gamePreferences)[0]
        ) : 'No preference',
      preferredTimeSlot: Object.keys(timePreferences).length > 0 ? 
        Object.keys(timePreferences).reduce((a, b) => 
          timePreferences[a] > timePreferences[b] ? a : b, Object.keys(timePreferences)[0]
        ) : 'No preference',
      averageDuration: durationTotals.length > 0 ? 
        (durationTotals.reduce((sum, d) => sum + d, 0) / durationTotals.length).toFixed(1) : 1,
      totalSpent: totalSpent,
      averageSpending: customerBookings.length > 0 ? (totalSpent / customerBookings.length).toFixed(2) : 0,
      lastVisit: customerBookings[customerBookings.length - 1]?.date
    };
  };

  // Generate smart recommendations based on time, customer history, and usage patterns
  const generateSmartRecommendations = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const recommendations = [];
    
    // Time-based recommendations
    if (currentHour >= 10 && currentHour <= 12) {
      recommendations.push({
        type: 'time',
        title: 'Morning Special',
        description: 'Consider offering morning discounts for regular customers',
        icon: '🌅',
        priority: 'medium'
      });
    }
    
    if (currentHour >= 18 && currentHour <= 22) {
      recommendations.push({
        type: 'time',
        title: 'Peak Evening Hours',
        description: 'High demand period - ensure all tables are optimally utilized',
        icon: '🌆',
        priority: 'high'
      });
    }
    
    // Weekend recommendations
    if (currentDay === 0 || currentDay === 6) {
      recommendations.push({
        type: 'weekend',
        title: 'Weekend Special',
        description: 'Consider extended hours or special packages for weekends',
        icon: '',
        priority: 'medium'
      });
    }
    
    // Game popularity analysis
    const gameUsage = {};
    offlineBookings.forEach(booking => {
      const game = games.find(g => g.id === booking.board)?.name || booking.board;
      if (game) {
        gameUsage[game] = (gameUsage[game] || 0) + 1;
      }
    });
    
    // Only proceed if we have game usage data
    const gameKeys = Object.keys(gameUsage);
    if (gameKeys.length > 0 && offlineBookings.length > 0) {
      const leastUsedGame = gameKeys.reduce((a, b) => 
        gameUsage[a] < gameUsage[b] ? a : b
      );
      
      if (leastUsedGame && gameUsage[leastUsedGame] < offlineBookings.length * 0.1) {
        recommendations.push({
          type: 'promotion',
          title: 'Boost Underused Game',
          description: `${leastUsedGame} needs promotion - consider special rates`,
          icon: '📈',
          priority: 'low'
        });
      }
    }
    
    return recommendations;
  };

  // Detect booking conflicts
  const detectTimeConflicts = (board, date, startTime, endTime, excludeBookingId = null) => {
    if (!board || !date || !startTime || !endTime) return [];
    
    const conflicts = offlineBookings.filter(booking => {
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      if (booking.board !== board || booking.date !== date) return false;
      if (!booking.startTime || !booking.endTime) return false;
      
      const bookingStart = new Date(`2000-01-01T${booking.startTime}`);
      const bookingEnd = new Date(`2000-01-01T${booking.endTime}`);
      const newStart = new Date(`2000-01-01T${startTime}`);
      const newEnd = new Date(`2000-01-01T${endTime}`);
      
      // Check for overlap
      return (newStart < bookingEnd && newEnd > bookingStart);
    });
    
    return conflicts;
  };

  // Smart pricing suggestions based on demand and time
  const getSuggestedPrice = (gameId, duration, timeSlot) => {
    const baseRate = getBoardRate(gameId);
    let multiplier = 1;
    
    // Time-based pricing
    const hour = timeSlot ? parseInt(timeSlot.split(':')[0]) : new Date().getHours();
    if (hour >= 18 && hour <= 22) multiplier += 0.1; // Peak hours
    if (hour >= 10 && hour <= 12) multiplier -= 0.05; // Off-peak discount
    
    // Duration-based pricing
    if (duration >= 3) multiplier -= 0.05; // Long session discount
    if (duration >= 5) multiplier -= 0.1; // Extended session discount
    
    return Math.round(baseRate * duration * multiplier);
  };

  // Smart Serial Number Generation
  const generateSmartSerialNumber = (selectedDate) => {
    const dateBookings = offlineBookings.filter(b => b.date === selectedDate);
    const existingSerials = dateBookings.map(b => b.slNo || 0).filter(s => s > 0);
    
    if (existingSerials.length === 0) {
      return 1; // First booking of the day
    }
    
    // Find the next available serial number
    const maxSerial = Math.max(...existingSerials);
    for (let i = 1; i <= maxSerial + 1; i++) {
      if (!existingSerials.includes(i)) {
        return i;
      }
    }
    
    return maxSerial + 1;
  };

  // Date-based Booking Management
  const organizeDateBasedBookings = (bookings) => {
    const organized = {};
    const today = new Date();
    const dates = [];
    
    // Generate last 14 days including today
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
      organized[dateStr] = [];
    }
    
    // Organize bookings by date
    bookings.forEach(booking => {
      const bookingDate = booking.date;
      if (organized[bookingDate]) {
        organized[bookingDate].push(booking);
      }
    });
    
    // Sort bookings within each date by serial number
    Object.keys(organized).forEach(date => {
      organized[date].sort((a, b) => (a.slNo || 0) - (b.slNo || 0));
    });
    
    return { organized, dates };
  };

  // Get bookings for selected date with statistics
  const getDateBasedStatistics = (dateBookings) => {
    if (!dateBookings || dateBookings.length === 0) {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        totalDiscount: 0,
        netRevenue: 0,
        averageBookingValue: 0,
        cashPayments: 0,
        gpayPayments: 0,
        settledBookings: 0,
        pendingBookings: 0
      };
    }
    
    const totalRevenue = dateBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalDiscount = dateBookings.reduce((sum, b) => sum + (b.discount || 0), 0);
    const netRevenue = totalRevenue - totalDiscount;
    const cashPayments = dateBookings.reduce((sum, b) => sum + (b.cashAmount || 0), 0);
    const gpayPayments = dateBookings.reduce((sum, b) => sum + (b.gpayAmount || 0), 0);
    const settledBookings = dateBookings.filter(b => b.settlement === 'SETTLED').length;
    const pendingBookings = dateBookings.filter(b => b.settlement === 'PENDING').length;
    
    return {
      totalBookings: dateBookings.length,
      totalRevenue,
      totalDiscount,
      netRevenue,
      averageBookingValue: dateBookings.length > 0 ? (netRevenue / dateBookings.length).toFixed(2) : 0,
      cashPayments,
      gpayPayments,
      settledBookings,
      pendingBookings
    };
  };


  useEffect(() => {
    // Check authentication and admin claim
    let bookingsUnsub = null;
    let offlineBookingsUnsub = null;
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
            // Check for new bookings
            if (!isInitialLoadRef.current && previousBookingsRef.current.length > 0) {
              const newBookings = allBookings.filter(booking => 
                !previousBookingsRef.current.some(prev => prev.id === booking.id)
              );
              
              // Show toast for each new booking
              newBookings.forEach(booking => {
                const gameObj = games.find(g => g.id === booking.game || g.name === booking.game);
                let gameName = gameObj ? gameObj.name : booking.game;
                if (gameName && typeof gameName === 'object') gameName = gameName.name || '[Unknown Game]';
                if (typeof gameName !== 'string' && typeof gameName !== 'number') gameName = '[Unknown Game]';

                let userName = userMap[booking.user]?.name;
                if (userName && typeof userName === 'object') userName = userName.name || 'Unknown';
                if (typeof userName !== 'string' && typeof userName !== 'number') userName = 'Unknown';

                const safeDate = (typeof booking.date === 'string' || typeof booking.date === 'number') ? booking.date : '';
                const safeTime = (typeof booking.time === 'string' || typeof booking.time === 'number') ? booking.time : '';
                const safeUserPhone = (typeof booking.user === 'string' || typeof booking.user === 'number') ? booking.user : 'Unknown';

                showNewBooking({
                  gameName: String(gameName),
                  date: String(safeDate),
                  time: String(safeTime),
                  userName: String(userName),
                  userPhone: String(safeUserPhone)
                });
              });
            }
            
            // Update previous bookings reference
            previousBookingsRef.current = [...allBookings];
            setBookings(allBookings);
            setLoading(false);
            
            // Set initial load flag to false after first load
            if (isInitialLoadRef.current) {
              isInitialLoadRef.current = false;
            }
          });

          // Real-time offline bookings listener
          offlineBookingsUnsub = offlineBookingService.onOfflineBookingsChange((offlineBookings) => {
            console.log('Offline bookings received:', offlineBookings.length, offlineBookings.map(b => ({id: b.id, customerName: b.customerName, slNo: b.slNo})));
            
            // Check for duplicate serial numbers
            const slNos = offlineBookings.map(b => b.slNo).filter(sNo => sNo);
            const duplicateSlNos = slNos.filter((sNo, index) => slNos.indexOf(sNo) !== index);
            if (duplicateSlNos.length > 0) {
              console.warn('Duplicate serial numbers found:', duplicateSlNos);
            }
            
            // Remove any potential duplicates based on ID (safety measure)
            const uniqueBookings = offlineBookings.filter((booking, index, self) => 
              index === self.findIndex(b => b.id === booking.id)
            );
            
            if (uniqueBookings.length !== offlineBookings.length) {
              console.warn(`Removed ${offlineBookings.length - uniqueBookings.length} duplicate bookings`);
            }
            
            setOfflineBookings(uniqueBookings);
            
            // Organize bookings by date and generate available dates
            const { organized, dates } = organizeDateBasedBookings(uniqueBookings);
            setDateBasedBookings(organized);
            setAvailableDates(dates);
            
            // Generate smart serial number for current selected date
            const currentDate = newOfflineBooking.date || new Date().toISOString().split('T')[0];
            const smartSerial = generateSmartSerialNumber(currentDate);
            setSmartSerialNumber(smartSerial);
            
            // Extract unique customer names for suggestions
            const uniqueCustomers = [...new Set(uniqueBookings.map(b => b.customerName).filter(name => name))];
            setCustomerSuggestions(uniqueCustomers);
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
          loadAdminLogs();
        } else {
          setIsAdmin(false);
          navigate('/dashboard');
        }
      }
    });
    return () => {
      unsubscribe();
      if (bookingsUnsub) bookingsUnsub();
      if (offlineBookingsUnsub) offlineBookingsUnsub();
    };
    // eslint-disable-next-line
  }, [navigate]);

  // Load slots when date or selected games change
  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line
  }, [selectedDate, selectedGames]);

  // loadData removed, now handled in useEffect with real-time updates

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Are you sure you want to permanently delete this booking?')) return;
    try {
      await bookingService.deleteBooking(bookingId);
      showSuccess("Booking deleted successfully!");
      // Real-time listener will update the UI automatically
    } catch (err) {
      showError("Failed to delete booking");
      setError("Failed to delete booking");
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      // Get current booking data for toast
      const currentBooking = bookings.find(b => b.id === bookingId);
      const oldStatus = currentBooking?.status || 'Pending';
      
      await bookingService.updateBookingStatus(bookingId, newStatus);
      
      // Show status change toast with beep
      if (currentBooking) {
        const gameObj = games.find(g => g.id === currentBooking.game || g.name === currentBooking.game);
        let gameName = gameObj ? gameObj.name : currentBooking.game;
        if (gameName && typeof gameName === 'object') gameName = gameName.name || '[Unknown Game]';
        if (typeof gameName !== 'string' && typeof gameName !== 'number') gameName = '[Unknown Game]';

        let userName = userMap[currentBooking.user]?.name;
        if (userName && typeof userName === 'object') userName = userName.name || 'Unknown';
        if (typeof userName !== 'string' && typeof userName !== 'number') userName = 'Unknown';

        const safeDate = (typeof currentBooking.date === 'string' || typeof currentBooking.date === 'number') ? currentBooking.date : '';
        const safeTime = (typeof currentBooking.time === 'string' || typeof currentBooking.time === 'number') ? currentBooking.time : '';
        const safeUserPhone = (typeof currentBooking.user === 'string' || typeof currentBooking.user === 'number') ? currentBooking.user : 'Unknown';

        showStatusChange({
          gameName: String(gameName),
          date: String(safeDate),
          time: String(safeTime),
          userName: String(userName),
          userPhone: String(safeUserPhone)
        }, String(oldStatus), String(newStatus));
      } else {
        showSuccess(`Booking status updated to ${newStatus} successfully!`);
      }
      
      // Real-time listener will update the UI automatically
    } catch (err) {
      showError("Failed to update booking status");
      setError("Failed to update booking status");
    }
  };

  const handleViewStatusHistory = async (booking) => {
    try {
      // Get the latest booking data with status history
      const bookingData = await bookingService.getBookingById(booking.id);
      setSelectedBookingHistory(bookingData?.statusHistory || []);
      setShowStatusHistory(true);
    } catch (err) {
      showError("Failed to load status history");
      setError("Failed to load status history");
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

  // Export filtered bookings to CSV
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) return;
    const headers = [
      'Game', 'Date', 'Time', 'User Name', 'User Phone', 'Status'
    ];
    const rows = filteredBookings.map(b => {
      const gameObj = games.find(g => g.id === b.game || g.name === b.game);
      const gameName = gameObj ? gameObj.name : b.game;
      return [
        '"' + (gameName || '') + '"',
        '"' + (b.date || '') + '"',
        '"' + (b.time || '') + '"',
        '"' + (userMap[b.user]?.name || 'Unknown') + '"',
        '"' + (b.user || 'Unknown') + '"',
        '"' + (b.status || 'Pending') + '"'
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load games from Firestore
  const loadGames = async () => {
    try {
      const allGames = await gameService.getAllGames();
      setGames(allGames);
    } catch (err) {
      setError("Failed to load games");
    }
  };

  // Load admin logs from Firestore (only major admin actions)
  const loadAdminLogs = async () => {
    try {
      const logsQuery = query(
        collection(db, 'adminLogs'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(logsQuery);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }))
      // Filter only major admin actions (exclude user booking actions)
      .filter(log => 
        log.action && (
          log.action.includes('add game') ||
          log.action.includes('delete game') ||
          log.action.includes('update game') ||
          log.action.includes('add slot') ||
          log.action.includes('delete slot') ||
          log.action.includes('update slot') ||
          log.targetType === 'game' ||
          log.targetType === 'slot'
        )
      );
      setAdminLogs(logs);
    } catch (err) {
      console.error("Failed to load admin logs:", err);
    }
  };

  // Load slots for selected games and date from Firestore
  const loadSlots = async () => {
    if (!selectedGames.length || !selectedDate) {
      setSlots([]);
      return;
    }
    try {
      // Implementation for fetching slots for the selected games and date
      const slotsData = [];
      for (const gameId of selectedGames) {
        const gameSlots = await slotService.getSlotsForDate(selectedDate, gameId);
        slotsData.push(...gameSlots);
      }
      setSlots(slotsData);
    } catch (err) {
      setError("Failed to load slots");
      showError("Failed to load slots");
    } finally {
      setLoading(false);
    }
  };

  // Add missing handleAddSlot function
  const handleAddSlot = async () => {
    if (!selectedDate || !selectedGames.length || !selectedTimeSlots.length) return;
    setLoading(true);
    try {
      for (const gameId of selectedGames) {
        await slotService.addSlotsForDate(selectedDate, gameId, selectedTimeSlots);
      }
      showSuccess(`Added ${selectedTimeSlots.length} slot(s) to ${selectedGames.length} game(s)!`);
      await loadSlots();
      setSelectedTimeSlots([]);
    } catch (err) {
      setError("Failed to add slots");
      showError("Failed to add slots");
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
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    setLoading(true);
    try {
      await gameService.deleteGame(gameId);
      setGames(games.filter(g => g.id !== gameId));
      showSuccess("Game deleted successfully!");
    } catch (err) {
      setError("Failed to delete game");
      showError("Failed to delete game");
    } finally {
      setLoading(false);
    }
  };

  // Toggle game active status
  const handleToggleGameStatus = async (gameId, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = !currentStatus;
      await gameService.updateGame(gameId, { isActive: newStatus });
      setGames(games.map(g => g.id === gameId ? { ...g, isActive: newStatus } : g));
      showSuccess(`Game ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (err) {
      setError("Failed to update game status");
      showError("Failed to update game status");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // Offline Bookings Functions
  const loadOfflineBookings = async () => {
    try {
      const bookings = await offlineBookingService.getAllOfflineBookings();
      setOfflineBookings(bookings);
      
      // Extract unique customer names for suggestions
      const uniqueCustomers = [...new Set(bookings.map(b => b.customerName).filter(name => name))];
      setCustomerSuggestions(uniqueCustomers);
    } catch (err) {
      console.error('Failed to load offline bookings:', err);
      showError('Failed to load offline bookings from server');
    }
  };

  // Smart customer name suggestions with behavior analysis
  const handleCustomerNameChange = (value) => {
    setNewOfflineBooking({...newOfflineBooking, customerName: value});
    
    if (value.length > 0) {
      const filtered = customerSuggestions.filter(name => 
        name.toLowerCase().includes(value.toLowerCase())
      );
      setShowCustomerSuggestions(filtered.length > 0 && value !== filtered[0]);
      
      // Analyze customer behavior and provide smart suggestions
      if (value.length >= 3) {
        const exactMatch = customerSuggestions.find(name => 
          name.toLowerCase() === value.toLowerCase()
        );
        
        if (exactMatch) {
          const analysis = analyzeCustomerBehavior(exactMatch);
          setCustomerHistory(prev => ({...prev, [exactMatch]: analysis}));
          
          // Auto-suggest favorite game if customer history exists
          if (analysis && analysis.favoriteGame && autoCalculateEnabled) {
            const favoriteGame = games.find(g => g.name === analysis.favoriteGame);
            if (favoriteGame && !newOfflineBooking.board) {
              // Auto-suggest but don't auto-fill to avoid overriding user choice
              setSmartRecommendations([{
                type: 'customer',
                title: 'Customer Preference',
                description: `${exactMatch} usually plays ${analysis.favoriteGame}`,
                action: () => handleBoardChange(favoriteGame.id),
                icon: '🎯',
                priority: 'high'
              }]);
            }
            
            // Suggest optimal duration based on history
            if (analysis.averageDuration && analysis.averageDuration > 1) {
              setSmartRecommendations(prev => [...prev, {
                type: 'duration',
                title: 'Suggested Duration',
                description: `${exactMatch} typically plays for ${analysis.averageDuration} hours`,
                action: () => handleDurationChange(parseFloat(analysis.averageDuration)),
                icon: '⏱️',
                priority: 'medium'
              }]);
            }
          }
        }
      }
    } else {
      setShowCustomerSuggestions(false);
      setSmartRecommendations([]);
      setCustomerHistory({});
    }
  };

  // Smart board selection with auto-rate calculation and conflict detection
  const handleBoardChange = (gameId) => {
    const updates = { board: gameId };
    
    if (autoCalculateEnabled && gameId) {
      const rate = getBoardRate(gameId);
      if (rate > 0) {
        // Apply smart pricing if enabled
        const suggestedPrice = smartPricingEnabled ? 
          getSuggestedPrice(gameId, newOfflineBooking.duration, newOfflineBooking.startTime) :
          rate * newOfflineBooking.duration;
        updates.amount = suggestedPrice;
      }
    }
    
    // Check for conflicts if we have time data
    if (conflictDetection && newOfflineBooking.date && newOfflineBooking.startTime && newOfflineBooking.endTime) {
      const conflicts = detectTimeConflicts(
        gameId, 
        newOfflineBooking.date, 
        newOfflineBooking.startTime, 
        newOfflineBooking.endTime,
        editingBookingId
      );
      
      if (conflicts.length > 0) {
        showError(`⚠️ Time conflict detected! ${conflicts.length} booking(s) overlap with this time slot.`);
        setSmartRecommendations([{
          type: 'conflict',
          title: 'Booking Conflict',
          description: `${conflicts.length} existing booking(s) conflict with selected time`,
          icon: '⚠️',
          priority: 'high',
          conflicts: conflicts
        }]);
      } else {
        // Clear conflict warnings
        setSmartRecommendations(prev => prev.filter(r => r.type !== 'conflict'));
      }
    }
    
    // Update settlement status with the new amount
    const finalUpdates = updateSettlementStatus(newOfflineBooking, updates);
    setNewOfflineBooking({...newOfflineBooking, ...finalUpdates});
  };

  // Smart duration calculation with conflict detection and auto-amount update
  const handleTimeChange = (field, value) => {
    const updates = { [field]: value };
    
    // Auto-calculate duration if both start and end times are set
    if (field === 'startTime' || field === 'endTime') {
      const startTime = field === 'startTime' ? value : newOfflineBooking.startTime;
      const endTime = field === 'endTime' ? value : newOfflineBooking.endTime;
      
      if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        if (end > start) {
          const diffMs = end - start;
          const diffHours = diffMs / (1000 * 60 * 60);
          updates.duration = Math.round(diffHours * 2) / 2; // Round to nearest 0.5 hour
          
          // Auto-update amount with smart pricing if enabled
          if (autoCalculateEnabled && newOfflineBooking.board) {
            const rate = getBoardRate(newOfflineBooking.board);
            if (rate > 0) {
              updates.amount = smartPricingEnabled ? 
                getSuggestedPrice(newOfflineBooking.board, updates.duration, startTime) :
                rate * updates.duration;
            }
          }
          
          // Check for conflicts with new time range
          if (conflictDetection && newOfflineBooking.board && newOfflineBooking.date) {
            const conflicts = detectTimeConflicts(
              newOfflineBooking.board,
              newOfflineBooking.date,
              startTime,
              endTime,
              editingBookingId
            );
            
            if (conflicts.length > 0) {
              showError(`⚠️ Time conflict detected! ${conflicts.length} booking(s) overlap with this time slot.`);
              setSmartRecommendations([{
                type: 'conflict',
                title: 'Time Conflict Detected',
                description: `${conflicts.length} existing booking(s) conflict with selected time range`,
                icon: '⚠️',
                priority: 'high',
                conflicts: conflicts
              }]);
            } else {
              // Clear conflict warnings
              setSmartRecommendations(prev => prev.filter(r => r.type !== 'conflict'));
            }
          }
        } else if (end <= start) {
          showError('End time must be after start time');
        }
      }
      
      // Auto-suggest end time based on common durations
      if (field === 'startTime' && value && !newOfflineBooking.endTime && autoEndTimeEnabled) {
        const start = new Date(`2000-01-01T${value}`);
        // Default to 2 hours if no customer history
        const defaultDuration = customerHistory[newOfflineBooking.customerName]?.averageDuration || 2;
        start.setMinutes(start.getMinutes() + (defaultDuration * 60));
        updates.endTime = start.toTimeString().slice(0, 5);
        updates.duration = defaultDuration;
        
        if (autoCalculateEnabled && newOfflineBooking.board) {
          const rate = getBoardRate(newOfflineBooking.board);
          if (rate > 0) {
            updates.amount = smartPricingEnabled ? 
              getSuggestedPrice(newOfflineBooking.board, defaultDuration, value) :
              rate * defaultDuration;
          }
        }
      }
    }
    
    // Update settlement status with the new amount
    const finalUpdates = updateSettlementStatus(newOfflineBooking, updates);
    setNewOfflineBooking({...newOfflineBooking, ...finalUpdates});
  };

  // Smart duration change with auto-amount update and time calculation
  const handleDurationChange = (duration) => {
    const updates = { duration: parseFloat(duration) || 1 };
    
    // Auto-calculate end time if start time is set
    if (newOfflineBooking.startTime) {
      const start = new Date(`2000-01-01T${newOfflineBooking.startTime}`);
      start.setMinutes(start.getMinutes() + (duration * 60));
      updates.endTime = start.toTimeString().slice(0, 5);
      
      // Check for conflicts with new end time
      if (conflictDetection && newOfflineBooking.board && newOfflineBooking.date) {
        const conflicts = detectTimeConflicts(
          newOfflineBooking.board,
          newOfflineBooking.date,
          newOfflineBooking.startTime,
          updates.endTime,
          editingBookingId
        );
        
        if (conflicts.length > 0) {
          showError(`⚠️ Duration creates time conflict! ${conflicts.length} booking(s) overlap.`);
          setSmartRecommendations([{
            type: 'conflict',
            title: 'Duration Conflict',
            description: `Extending to ${duration} hours creates conflict with existing bookings`,
            icon: '⚠️',
            priority: 'high',
            conflicts: conflicts
          }]);
        } else {
          setSmartRecommendations(prev => prev.filter(r => r.type !== 'conflict'));
        }
      }
    }
    
    // Auto-update amount with smart pricing if enabled
    if (autoCalculateEnabled && newOfflineBooking.board) {
      const rate = getBoardRate(newOfflineBooking.board);
      if (rate > 0) {
        updates.amount = smartPricingEnabled ? 
          getSuggestedPrice(newOfflineBooking.board, duration, newOfflineBooking.startTime) :
          rate * duration;
      }
    }
    
    // Provide duration-based recommendations
    if (duration >= 4) {
      setSmartRecommendations(prev => [...prev.filter(r => r.type !== 'duration'), {
        type: 'duration',
        title: 'Long Session Discount',
        description: `Consider offering discount for ${duration}+ hour sessions`,
        icon: '💰',
        priority: 'medium'
      }]);
    }
    
    // Update settlement status with the new amount
    const finalUpdates = updateSettlementStatus(newOfflineBooking, updates);
    setNewOfflineBooking({...newOfflineBooking, ...finalUpdates});
  };

  // Smart payment auto-settlement detection
  const updateSettlementStatus = (currentBooking, additionalUpdates = {}) => {
    const updatedBooking = { ...currentBooking, ...additionalUpdates };
    const netAmount = (updatedBooking.amount || 0) - (updatedBooking.discount || 0);
    const totalPaid = (updatedBooking.cashAmount || 0) + (updatedBooking.gpayAmount || 0);
    
    let settlement = 'PENDING';
    if (netAmount === 0) {
      settlement = 'SETTLED'; // Free game or fully discounted
    } else if (totalPaid >= netAmount) {
      settlement = 'SETTLED';
    } else if (totalPaid > 0 && totalPaid < netAmount) {
      settlement = 'PARTIAL';
    }
    
    return { ...additionalUpdates, settlement };
  };

  const handlePaymentChange = (field, value) => {
    const updates = { [field]: parseFloat(value) || 0 };
    const finalUpdates = updateSettlementStatus(newOfflineBooking, updates);
    setNewOfflineBooking({...newOfflineBooking, ...finalUpdates});
  };

  // Smart amount change with auto-settlement update
  const handleAmountChange = (value) => {
    const updates = { amount: parseFloat(value) || 0 };
    const finalUpdates = updateSettlementStatus(newOfflineBooking, updates);
    setNewOfflineBooking({...newOfflineBooking, ...finalUpdates});
  };

  // Smart discount change with auto-settlement update
  const handleDiscountChange = (value) => {
    const updates = { discount: parseFloat(value) || 0 };
    const finalUpdates = updateSettlementStatus(newOfflineBooking, updates);
    setNewOfflineBooking({...newOfflineBooking, ...finalUpdates});
  };

  // Enhanced card-based booking system handlers
  const handleGameSelect = (game) => {
    setSelectedGame(game);
    
    // Smart amount calculation with pricing intelligence
    const smartAmount = smartPricingEnabled ? 
      getSuggestedPrice(game.id, newOfflineBooking.duration || 1, newOfflineBooking.startTime) :
      (game.price || 0) * (newOfflineBooking.duration || 1);
    
    setNewOfflineBooking({
      ...newOfflineBooking,
      gameId: game.id,
      board: game.id,
      amount: autoCalculateEnabled ? smartAmount : newOfflineBooking.amount
    });
    
    // Generate game-specific recommendations
    const gameRecommendations = [{
      type: 'game',
      title: `${game.name} Selected`,
      description: `Rate: ₹${game.price}/hr • Category: ${game.category || 'Standard'}`,
      icon: '🎯',
      priority: 'info'
    }];
    
    // Add pricing recommendation if smart pricing suggests different rate
    if (smartPricingEnabled && smartAmount !== (game.price || 0) * (newOfflineBooking.duration || 1)) {
      gameRecommendations.push({
        type: 'pricing',
        title: 'Smart Pricing Applied',
        description: `Suggested price: ₹${smartAmount} (based on time and duration)`,
        icon: '💡',
        priority: 'medium'
      });
    }
    
    setSmartRecommendations(gameRecommendations);
    setShowBookingModal(true);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setSelectedGame(null);
    setSmartRecommendations([]);
    setCustomerHistory({});
    setIsEditingOfflineBooking(false);
    setEditingBookingId(null);
    
    // Reset form values to prevent NaN issues
    const currentDate = new Date().toISOString().split('T')[0];
    const smartSerial = generateSmartSerialNumber(currentDate);
    setSmartSerialNumber(smartSerial);
    
    setNewOfflineBooking({
      slNo: smartSerial,
      customerName: '',
      board: '',
      status: 'OPEN',
      amount: 0,
      discount: 0,
      cashAmount: 0,
      gpayAmount: 0,
      settlement: 'SETTLED',
      date: currentDate,
      startTime: '',
      endTime: '',
      duration: 1,
      notes: ''
    });
  };

  const handleAddOfflineBooking = async () => {
    if (!newOfflineBooking.customerName || !newOfflineBooking.board || !newOfflineBooking.date || !newOfflineBooking.startTime) {
      showError('Please fill in all required fields (Name, Board, Date, Start Time)');
      return;
    }

    // Prevent double submission
    if (offlineBookingLoading) {
      console.log('Already processing, ignoring duplicate request');
      return;
    }

    setOfflineBookingLoading(true);
    try {
      if (isEditingOfflineBooking && editingBookingId) {
        console.log('Updating booking:', editingBookingId);
        // Update existing booking
        const bookingUpdates = { ...newOfflineBooking };
        delete bookingUpdates.id; // Remove ID from updates object
        delete bookingUpdates.createdAt; // Don't update creation timestamp
        
        await offlineBookingService.updateOfflineBooking(editingBookingId, bookingUpdates);
        showSuccess('Booking updated successfully!');
      } else {
        console.log('Creating new booking for:', newOfflineBooking.customerName);
        // Create new booking
        const booking = {
          ...newOfflineBooking,
          slNo: newOfflineBooking.slNo || (offlineBookings.length + 1),
          createdBy: adminName,
          type: 'offline'
        };

        const savedBooking = await offlineBookingService.addOfflineBooking(booking);
        console.log('New booking created with ID:', savedBooking.id);
        showSuccess('Booking entry saved to server successfully!');
      }

      // Reset form and edit state
      resetOfflineBookingForm();
      
    } catch (err) {
      showError(isEditingOfflineBooking ? 'Failed to update booking' : 'Failed to save booking entry to server');
      console.error('Offline booking operation error:', err);
    } finally {
      setOfflineBookingLoading(false);
    }
  };

  // Alias for the modal form submission
  const handleOfflineBookingSubmit = handleAddOfflineBooking;

  // Quick booking mode for rapid entry
  const handleQuickBooking = async (gameId, customerName, duration = 2) => {
    if (!customerName || !gameId) return;
    
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const now = new Date();
    const startTime = now.toTimeString().slice(0, 5);
    const endTime = new Date(now.getTime() + (duration * 60 * 60 * 1000)).toTimeString().slice(0, 5);
    
    const quickBooking = {
      slNo: offlineBookings.length + 1,
      customerName: customerName,
      board: gameId,
      status: 'OPEN',
      amount: smartPricingEnabled ? getSuggestedPrice(gameId, duration, startTime) : game.price * duration,
      discount: 0,
      cashAmount: 0,
      gpayAmount: 0,
      settlement: 'PENDING',
      date: new Date().toISOString().split('T')[0],
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      notes: 'Quick booking',
      createdBy: adminName,
      type: 'offline'
    };
    
    try {
      await offlineBookingService.addOfflineBooking(quickBooking);
      showSuccess(`⚡ Quick booking created for ${customerName}!`);
    } catch (err) {
      showError('Failed to create quick booking');
    }
  };

  // Toggle smart features
  const toggleSmartFeature = (feature) => {
    switch (feature) {
      case 'autoCalculate':
        setAutoCalculateEnabled(!autoCalculateEnabled);
        break;
      case 'smartPricing':
        setSmartPricingEnabled(!smartPricingEnabled);
        break;
      case 'quickMode':
        setQuickBookingMode(!quickBookingMode);
        break;
      case 'autoEndTime':
        setAutoEndTimeEnabled(!autoEndTimeEnabled);
        break;
      case 'conflictDetection':
        setConflictDetection(!conflictDetection);
        break;
      default:
        break;
    }
  };

  const cleanupDuplicateBookings = async () => {
    if (!window.confirm('This will remove duplicate bookings based on customer name, date, and time. Continue?')) return;
    
    try {
      const allBookings = await offlineBookingService.getAllOfflineBookings();
      const duplicateGroups = {};
      
      // Group bookings by a unique key
      allBookings.forEach(booking => {
        const key = `${booking.customerName}-${booking.date}-${booking.startTime}-${booking.board}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(booking);
      });
      
      // Find groups with more than one booking
      const duplicatesToDelete = [];
      Object.values(duplicateGroups).forEach(group => {
        if (group.length > 1) {
          // Keep the first one (oldest), delete the rest
          group.slice(1).forEach(booking => {
            duplicatesToDelete.push(booking.id);
          });
        }
      });
      
      if (duplicatesToDelete.length === 0) {
        showSuccess('No duplicates found!');
        return;
      }
      
      console.log('Deleting duplicate booking IDs:', duplicatesToDelete);
      
      // Delete duplicates
      for (const bookingId of duplicatesToDelete) {
        await offlineBookingService.deleteOfflineBooking(bookingId);
      }
      
      showSuccess(`Removed ${duplicatesToDelete.length} duplicate bookings!`);
    } catch (err) {
      console.error('Error cleaning duplicates:', err);
      showError('Failed to clean up duplicates');
    }
  };

  const resetOfflineBookingForm = () => {
    setNewOfflineBooking({
      slNo: offlineBookings.length + (isEditingOfflineBooking ? 1 : 2),
      customerName: '',
      board: '',
      status: 'OPEN',
      amount: 0,
      discount: 0,
      cashAmount: 0,
      gpayAmount: 0,
      settlement: 'SETTLED',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      duration: 1,
      notes: ''
    });
    setIsEditingOfflineBooking(false);
    setEditingBookingId(null);
  };

  const handleDeleteOfflineBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this offline booking?')) return;
    
    console.log('Attempting to delete booking with ID:', bookingId);
    
    try {
      await offlineBookingService.deleteOfflineBooking(bookingId);
      showSuccess('Offline booking deleted from server successfully!');
      console.log('Delete successful for ID:', bookingId);
    } catch (err) {
      showError('Failed to delete offline booking from server');
      console.error('Delete offline booking error:', err);
    }
  };

  const handleUpdateOfflineBooking = async (bookingId, updates) => {
    try {
      await offlineBookingService.updateOfflineBooking(bookingId, updates);
      
      // Update local state
      setOfflineBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, ...updates } : b
      ));
      
      showSuccess('Offline booking updated on server successfully!');
    } catch (err) {
      showError('Failed to update offline booking on server');
      console.error('Update offline booking error:', err);
    }
  };

  // Weekly Analytics Functions
  const loadWeeklyAnalytics = async (weekOffset = 0) => {
    setAnalyticsLoading(true);
    try {
      const weekRange = analyticsService.getWeekDateRange(weekOffset);
      setSelectedWeekRange(weekRange);
      
      const analytics = await analyticsService.getWeeklyBookingAnalytics(
        weekRange.startDate, 
        weekRange.endDate
      );
      
      setWeeklyAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load weekly analytics:', error);
      showError('Failed to load weekly analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const changeWeek = (direction) => {
    const newOffset = selectedWeekOffset + direction;
    setSelectedWeekOffset(newOffset);
    loadWeeklyAnalytics(newOffset);
  };

  const goToCurrentWeek = () => {
    setSelectedWeekOffset(0);
    loadWeeklyAnalytics(0);
  };

  // Load weekly analytics when analytics tab is selected
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'analytics' && !weeklyAnalytics) {
      loadWeeklyAnalytics(selectedWeekOffset);
    }
  };

  // Individual Game Analytics Functions
  const loadGameAnalytics = async (gameId) => {
    setGameAnalyticsLoading(true);
    try {
      const weekRange = analyticsService.getWeekDateRange(selectedWeekOffset);
      const gameAnalytics = await analyticsService.getGameAnalytics(
        gameId,
        weekRange.startDate,
        weekRange.endDate
      );
      
      setSelectedGameAnalytics(gameAnalytics);
      setShowGameAnalytics(true);
    } catch (error) {
      console.error('Failed to load game analytics:', error);
      showError('Failed to load game analytics');
    } finally {
      setGameAnalyticsLoading(false);
    }
  };

  const closeGameAnalytics = () => {
    setShowGameAnalytics(false);
    setSelectedGameAnalytics(null);
  };


  if (isAdmin === null) {
    // Still checking admin status
    return <Loading message="Checking admin access..." />;
  }

  if (isAdmin === true && loading) {
    return <Loading message="Loading admin data..." />;
  }

  return (
    <div className={`container-fluid px-2 px-md-3 ${theme === 'dark' ? 'admin-dark bg-dark text-light' : 'admin-light bg-light text-dark'} min-vh-100`} style={{overflowX: 'hidden', overflowY: 'auto', maxHeight: '100vh'}}>
      <div className="mb-3 mt-2 text-center text-md-start px-1 px-md-0">
        <h4 className="fw-bold text-lg md:text-2xl" style={{fontSize: '1.2rem', fontWeight: 600}}>{`Welcome, ${adminName}`}</h4>
      </div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-2" style={{flexWrap: 'wrap'}}>
        <h2 className="mb-0 text-xl md:text-3xl" style={{fontSize: '1.5rem', fontWeight: 700}}>Admin Panel</h2>
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-center">
          <button
            onClick={toggleTheme}
            className={`btn ${theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark'} btn-sm me-2`}
            title="Switch light/dark mode"
            style={{ minWidth: 40 }}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <button 
            onClick={dismissAllNotifications} 
            className={`btn ${theme === 'dark' ? 'btn-outline-light' : 'btn-outline-info'} btn-sm me-2`}
            title="Clear all notifications"
          >
            🔔 Clear Notifications
          </button>
          <button onClick={handleLogout} className="btn btn-danger me-2">
            Logout
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
      <ul className="nav nav-tabs mb-4 flex-nowrap overflow-auto" style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'thin', msOverflowStyle: 'auto' }}>
        <li className="nav-item" style={{minWidth: 120}}>
          <button 
            className={`nav-link ${activeTab === 'adduser' ? 'active' : ''}`}
            onClick={() => setActiveTab('adduser')}
          >
            Add User
          </button>
        </li>
        <li className="nav-item" style={{minWidth: 120}}>
          <button 
            className={`nav-link ${activeTab === 'userlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('userlist')}
          >
            User List
          </button>
        </li>
        <li className="nav-item" style={{minWidth: 120}}>
          <button 
            className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Online Bookings
          </button>
        </li>
        <li className="nav-item" style={{minWidth: 140}}>
          <button 
            className={`nav-link ${activeTab === 'offline-bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('offline-bookings')}
          >
            Offline Bookings
          </button>
        </li>
        <li className="nav-item" style={{minWidth: 120}}>
          <button 
            className={`nav-link ${activeTab === 'slots' ? 'active' : ''}`}
            onClick={() => setActiveTab('slots')}
          >
            Slot Management
          </button>
        </li>
        <li className="nav-item" style={{minWidth: 120}}>
          <button 
            className={`nav-link ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            Game Management
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabChange('analytics')}
          >
            Analytics
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            Games & Slots Log
          </button>
        </li>
      </ul>
      {/* User List Tab */}
      {activeTab === 'userlist' && (
        <div className={`card mb-4 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''} w-100 overflow-auto`} style={{ minWidth: 0 }}>
          <div className={`card-header d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
            <h5 className="mb-0">🗂️ All Users</h5>
            <span className="text-muted small">Total: {users.length}</span>
          </div>
          <div className={`card-body p-0 ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
            <div 
              className="table-responsive" 
              style={{ 
                minWidth: 0, 
                maxHeight: '75vh', 
                overflowY: 'auto',
                scrollBehavior: 'smooth',
                scrollbarWidth: 'thin',
                scrollbarColor: theme === 'dark' ? '#6c757d #495057' : '#dee2e6 #f8f9fa'
              }}
              onScroll={(e) => {
                // Add scroll shadow effect for better UX
                const target = e.target;
                const scrollTop = target.scrollTop;
                const maxScroll = target.scrollHeight - target.clientHeight;
                
                if (scrollTop > 10) {
                  target.style.borderTop = '2px solid rgba(0,123,255,0.2)';
                } else {
                  target.style.borderTop = 'none';
                }
                
                if (scrollTop < maxScroll - 10) {
                  target.style.borderBottom = '2px solid rgba(0,123,255,0.2)';
                } else {
                  target.style.borderBottom = 'none';
                }
              }}
            >
              <table className={`table table-bordered table-striped align-middle mb-0 ${theme === 'dark' ? 'table-dark' : ''}`} style={{
                position: 'relative'
              }}> 
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Coins</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-muted">No users found.</td></tr>
                  ) : (
                    users.map((u, i) => (
                      <tr key={u.id || u.mobile || i}>
                        <td>{i + 1}</td>
                        <td>{u.name || '-'}</td>
                        <td>{u.mobile || '-'}</td>
                        <td>{u.email || '-'}</td>
                        <td>{typeof u.coins === 'number' ? u.coins : 0}</td>
                        <td>
                          <span className={`badge ${u.isActive === false ? 'bg-secondary' : 'bg-success'}`}>
                            {u.isActive === false ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${u.isActive === false ? 'btn-success' : 'btn-warning'}`}
                            onClick={async () => {
                              try {
                                const newStatus = !(u.isActive !== false);
                                console.log(`Updating user ${u.mobile} status from ${u.isActive} to ${newStatus}`);
                                
                                await userService.updateUser(u.id || u.mobile, { isActive: newStatus });
                                
                                // Log admin action
                                await logAdminAction({
                                  action: newStatus ? 'activate user' : 'deactivate user',
                                  targetType: 'user',
                                  targetId: u.id || u.mobile,
                                  details: {
                                    userName: u.name || 'Unknown',
                                    mobile: u.mobile,
                                    previousStatus: u.isActive !== false,
                                    newStatus: newStatus
                                  }
                                });
                                
                                // Update users state after change
                                const updatedUsers = users.map(user =>
                                  (user.id || user.mobile) === (u.id || u.mobile)
                                    ? { ...user, isActive: newStatus }
                                    : user
                                );
                                setUsers(updatedUsers);
                                
                                // Show success message
                                const action = newStatus ? 'activated' : 'deactivated';
                                showSuccess(`User ${u.name || u.mobile} ${action} successfully!`);
                                
                              } catch (err) {
                                console.error('Error updating user status:', err);
                                showError(`Failed to update user status: ${err.message}`);
                              }
                            }}
                          >
                            {u.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add User Form - always below nav, only visible if tab is selected */}
      {activeTab === 'adduser' && (
        <div className="w-100 d-flex align-items-start justify-content-center" style={{ background: theme === 'dark' ? '#23272f' : 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)', padding: '16px 0 0 0' }}>
          <div className={`card shadow-lg border-0 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''} w-100`} style={{ maxWidth: 400, borderRadius: 16, marginTop: 0, minWidth: 0 }}>
            <div className={`card-body p-3 ${theme === 'dark' ? 'bg-dark text-light' : ''}`} style={{ paddingTop: 16, paddingBottom: 16 }}>
              <h4 className="fw-bold text-center mb-2" style={{ letterSpacing: 0.5, marginBottom: 8 }}>Add New User</h4>
              {addUserError && <div className="alert alert-danger py-2 text-center mb-2" style={{ marginBottom: 12 }}>{addUserError}</div>}
              {addUserSuccess && <div className="alert alert-success py-2 text-center mb-2" style={{ marginBottom: 12 }}>{addUserSuccess}</div>}
              <div className="mb-2">
                <label className="form-label fw-semibold">Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  disabled={addUserLoading}
                  placeholder="Enter full name"
                  autoFocus
                  style={{ borderRadius: 8 }}
                />
              </div>
              <div className="mb-2">
                <label className="form-label fw-semibold">Mobile <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={newUser.mobile}
                  onChange={e => setNewUser({ ...newUser, mobile: e.target.value })}
                  disabled={addUserLoading}
                  placeholder="Enter mobile number"
                  style={{ borderRadius: 8 }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control form-control-lg"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  disabled={addUserLoading}
                  placeholder="Enter email (optional)"
                  style={{ borderRadius: 8 }}
                />
              </div>
              <button
                className="btn btn-primary w-100 py-2 fw-bold"
                onClick={handleAddUser}
                disabled={addUserLoading || !newUser.name || !newUser.mobile}
                style={{ borderRadius: 8, fontSize: 18, letterSpacing: 0.5 }}
              >
                {addUserLoading ? (
                  <span><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Adding...</span>
                ) : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="w-100">
          {/* Current Occupancy Status */}
          <div className="row mb-3">
            <div className="col-md-4">
              <CurrentOccupancy />
            </div>
            <div className="col-md-8">
              {/* Filters row moved inside */}
            </div>
          </div>
          
          <div className="row mb-3 flex-wrap">
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
            <div className="col-md-4 mb-2 d-flex align-items-end justify-content-between gap-2">
              <div className="w-100">
                <label className="fw-semibold me-2">Search User:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or phone"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className={`btn ${theme === 'dark' ? 'btn-outline-success' : 'btn-outline-success'} ms-2`} onClick={handleExportCSV} disabled={filteredBookings.length === 0} title="Export filtered bookings to CSV">
                Export CSV
              </button>
            </div>
          </div>
          <div 
            className="table-responsive" 
            style={{ 
              minWidth: 0, 
              maxHeight: '75vh', 
              overflowY: 'auto',
              scrollBehavior: 'smooth',
              scrollbarWidth: 'thin',
              scrollbarColor: theme === 'dark' ? '#6c757d #495057' : '#dee2e6 #f8f9fa',
              WebkitScrollbar: {
                width: '8px'
              }
            }}
            onScroll={(e) => {
              // Add scroll shadow effect for better UX
              const target = e.target;
              const scrollTop = target.scrollTop;
              const maxScroll = target.scrollHeight - target.clientHeight;
              
              if (scrollTop > 10) {
                target.style.borderTop = '2px solid rgba(0,123,255,0.2)';
              } else {
                target.style.borderTop = 'none';
              }
              
              if (scrollTop < maxScroll - 10) {
                target.style.borderBottom = '2px solid rgba(0,123,255,0.2)';
              } else {
                target.style.borderBottom = 'none';
              }
            }}
          >
            <table className={`table table-bordered table-striped align-middle ${theme === 'dark' ? 'table-dark' : ''}`} style={{
              position: 'relative'
            }}>
              <thead style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <tr>
                  <th>#</th>
                  <th>Game</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>User Name</th>
                  <th>User Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr><td colSpan="8" className="text-center text-muted">No bookings found.</td></tr>
                ) : (
                  filteredBookings.map((b, i) => {
                    // Defensive rendering for all fields
                    const gameObj = games.find(g => g.id === b.game || g.name === b.game);
                    let gameName = '[Unknown Game]';
                    if (gameObj && typeof gameObj.name === 'string') {
                      gameName = gameObj.name;
                    } else if (typeof b.game === 'string') {
                      gameName = b.game;
                    } else if (b.game && typeof b.game === 'object' && typeof b.game.name === 'string') {
                      gameName = b.game.name;
                    }
                    if (typeof gameName !== 'string' && typeof gameName !== 'number') {
                      gameName = '[Unknown Game]';
                    }

                    let userName = userMap[b.user]?.name;
                    if (userName && typeof userName === 'object') {
                      userName = userName.name || 'Unknown';
                    }
                    if (typeof userName !== 'string' && typeof userName !== 'number') {
                      userName = 'Unknown';
                    }

                    const safeDate = (typeof b.date === 'string' || typeof b.date === 'number') ? b.date : '';
                    const safeTime = (typeof b.time === 'string' || typeof b.time === 'number') ? b.time : '';
                    const safeUser = (typeof b.user === 'string' || typeof b.user === 'number') ? b.user : 'Unknown';
                    const safeStatus = (typeof b.status === 'string') ? b.status : 'Pending';

                    return (
                      <tr key={b.id || i}>
                        <td>{i + 1}</td>
                        <td className="text-capitalize">{gameName}</td>
                        <td>{safeDate}</td>
                        <td>{safeTime}</td>
                        <td>{userName}</td>
                        <td>{safeUser}</td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={safeStatus}
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
                          <div className="d-flex gap-1">
                            <button 
                              className="btn btn-info btn-sm" 
                              onClick={() => handleViewStatusHistory(b)}
                              title="View Status History"
                            >
                              History
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => { if(window.confirm('Are you sure you want to delete this booking?')) handleDelete(b.id); }}
                            >
                              Delete
                            </button>
                          </div>
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

      {/* Offline Bookings Tab */}
      {activeTab === 'offline-bookings' && (
        <div className="w-100">
          {/* CUE CLUB CAFÉ Header */}
          <div className={`card mb-4 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`} style={{background: theme === 'dark' ? 'linear-gradient(135deg, #2c3e50, #34495e)' : 'linear-gradient(135deg, #2c5530, #1a3d1f)'}}>
            <div className={`card-body text-center ${theme === 'dark' ? 'text-light' : 'text-white'}`}>
              <h2 className="mb-0 fw-bold" style={{letterSpacing: '2px', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)'}}>CUE CLUB CAFÉ</h2>
              <p className="mb-0 opacity-75">Complete Booking Management System</p>
            </div>
          </div>

          {/* Smart Analytics & Controls Dashboard */}
          <section className="mb-4">
            <div className={`card shadow-lg border-0 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light'}`}>
              <div className={`card-header ${theme === 'dark' ? 'bg-secondary' : 'bg-primary'} text-white`}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-brain me-2"></i>
                    <h5 className="mb-0">Smart Booking Intelligence</h5>
                  </div>
                  <small>AI-Powered Booking Assistant</small>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* Smart Features Toggles */}
                  <div className="col-md-6">
                    <h6 className="mb-3">
                      <i className="fas fa-toggle-on text-primary me-2"></i>Smart Features
                    </h6>
                    <div className="row">
                      <div className="col-6">
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="globalAutoCalculate"
                            checked={autoCalculateEnabled}
                            onChange={() => toggleSmartFeature('autoCalculate')}
                          />
                          <label className="form-check-label small" htmlFor="globalAutoCalculate">
                            Auto Calculate
                          </label>
                        </div>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="globalSmartPricing"
                            checked={smartPricingEnabled}
                            onChange={() => toggleSmartFeature('smartPricing')}
                          />
                          <label className="form-check-label small" htmlFor="globalSmartPricing">
                            Smart Pricing
                          </label>
                        </div>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="globalQuickMode"
                            checked={quickBookingMode}
                            onChange={() => toggleSmartFeature('quickMode')}
                          />
                          <label className="form-check-label small" htmlFor="globalQuickMode">
                            Quick Mode
                          </label>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="globalAutoEndTime"
                            checked={autoEndTimeEnabled}
                            onChange={() => toggleSmartFeature('autoEndTime')}
                          />
                          <label className="form-check-label small" htmlFor="globalAutoEndTime">
                            Auto End Time
                          </label>
                        </div>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="globalConflictDetection"
                            checked={conflictDetection}
                            onChange={() => toggleSmartFeature('conflictDetection')}
                          />
                          <label className="form-check-label small" htmlFor="globalConflictDetection">
                            Conflict Detection
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Smart Recommendations */}
                  <div className="col-md-6">
                    <h6 className="mb-3">
                      <i className="fas fa-lightbulb text-warning me-2"></i>Live Recommendations
                    </h6>
                    <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                      {(() => {
                        const liveRecommendations = generateSmartRecommendations();
                        return liveRecommendations.length > 0 ? (
                          liveRecommendations.map((rec, index) => (
                            <div 
                              key={index}
                              className={`p-2 mb-2 rounded border ${
                                rec.priority === 'high' ? 'border-danger bg-danger bg-opacity-10' :
                                rec.priority === 'medium' ? 'border-warning bg-warning bg-opacity-10' :
                                'border-info bg-info bg-opacity-10'
                              }`}
                            >
                              <div className="d-flex align-items-center">
                                <span className="me-2">{rec.icon}</span>
                                <div>
                                  <div className="small fw-bold">{rec.title}</div>
                                  <div className="small text-muted">{rec.description}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted py-3">
                            <i className="fas fa-check-circle"></i>
                            <div className="small">All systems optimal</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="row mt-3 pt-3 border-top">
                  <div className="col-md-3 text-center">
                    <div className="h4 text-primary mb-0">{offlineBookings.length}</div>
                    <small className="text-muted">Total Bookings</small>
                  </div>
                  <div className="col-md-3 text-center">
                    <div className="h4 text-success mb-0">
                      {offlineBookings.filter(b => b.status === 'OPEN').length}
                    </div>
                    <small className="text-muted">Active Sessions</small>
                  </div>
                  <div className="col-md-3 text-center">
                    <div className="h4 text-warning mb-0">
                      {offlineBookings.filter(b => b.settlement === 'PENDING').length}
                    </div>
                    <small className="text-muted">Pending Payments</small>
                  </div>
                  <div className="col-md-3 text-center">
                    <div className="h4 text-info mb-0">
                      ₹{offlineBookings.reduce((sum, b) => sum + ((b.amount || 0) - (b.discount || 0)), 0).toFixed(0)}
                    </div>
                    <small className="text-muted">Total Revenue</small>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Game Selection Cards Section */}
          <section className="mb-4">
            <div className={`card shadow-lg border-0 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-gradient-light'}`}>
              <div className={`card-header border-0 ${theme === 'dark' ? 'bg-gradient-dark' : 'bg-gradient-primary'}`} style={{background: theme === 'dark' ? 'linear-gradient(135deg, #2c3e50, #34495e)' : 'linear-gradient(135deg, #667eea, #764ba2)'}}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div className="icon-circle me-3" style={{width: '45px', height: '45px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      <i className="fas fa-gamepad text-white" style={{fontSize: '20px'}}></i>
                    </div>
                    <div>
                      <h5 className="mb-0 text-white fw-bold">Select Game/Board</h5>
                      <small className="text-white-50">Choose a game to create new booking • <i className="fas fa-cloud me-1"></i>Saved to Firebase</small>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    {games.length === 0 && (
                      <span className="badge bg-warning text-dark small">⚠️ No games loaded</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={`card-body p-4 ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                {games.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-gamepad text-muted" style={{fontSize: '3rem'}}></i>
                    <h6 className="mt-3 text-muted">No games available</h6>
                    <p className="text-muted">Please add games in the Games Management section</p>
                  </div>
                ) : (
                  <div className="row g-4">
                    {games.filter(game => game.isActive !== false).map(game => (
                      <div key={game.id} className="col-lg-3 col-md-4 col-sm-6">
                        <div 
                          className={`card h-100 border-0 shadow-sm ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light'}`}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            transform: 'translateY(0)',
                            border: theme === 'dark' ? '1px solid #ffd600' : '1px solid #e0e0e0'
                          }}
                          onClick={() => handleGameSelect(game)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = theme === 'dark' 
                              ? '0 8px 25px rgba(255, 214, 0, 0.2)' 
                              : '0 8px 25px rgba(0,0,0,0.15)';
                            if (theme === 'dark') {
                              e.currentTarget.style.borderColor = '#ffe066';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = theme === 'dark'
                              ? '0 2px 8px rgba(255, 214, 0, 0.1)'
                              : '0 2px 8px rgba(0,0,0,0.1)';
                            if (theme === 'dark') {
                              e.currentTarget.style.borderColor = '#ffd600';
                            }
                          }}
                        >
                          <div className="card-body text-center p-4">
                            <div className="mb-3">
                              <div 
                                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                  color: 'white'
                                }}
                              >
                                <i className="fas fa-gamepad" style={{fontSize: '24px'}}></i>
                              </div>
                            </div>
                            <h6 className="card-title fw-bold mb-2" style={{fontSize: '1rem'}}>{game.name}</h6>
                            <div className="d-flex align-items-center justify-content-center mb-2">
                              <i className="fas fa-rupee-sign text-success me-1" style={{fontSize: '12px'}}></i>
                              <span className="fw-bold text-success">{game.price}/hr</span>
                            </div>
                            {game.category && (
                              <span className="badge bg-primary bg-opacity-10 text-primary small">
                                {game.category}
                              </span>
                            )}
                          </div>
                          <div className="card-footer border-0 bg-transparent text-center pb-3">
                            <button className="btn btn-primary btn-sm px-4">
                              <i className="fas fa-plus me-2"></i>Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Comprehensive Bookings List - CUE CLUB CAFÉ Style */}
          <section className="mb-4">
            <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
              <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`} style={{background: 'linear-gradient(135deg, #2c5530, #1a3d1f)', color: 'white'}}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-0">📋 CUE CLUB CAFÉ - Booking Records ({(() => {
                      const filteredBookings = selectedViewDate === 'all' ? offlineBookings : 
                        offlineBookings.filter(b => b.date === selectedViewDate);
                      return filteredBookings.length;
                    })()})</h5>
                    <small className="text-white-50"><i className="fas fa-cloud me-1"></i>Live Firebase Database • 14-Day Smart Backup</small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <select 
                      className="form-select form-select-sm text-dark"
                      value={selectedViewDate}
                      onChange={(e) => setSelectedViewDate(e.target.value)}
                      style={{minWidth: '150px'}}
                    >
                      <option value="all">All Dates</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric'
                          })} {date === new Date().toISOString().split('T')[0] ? '(Today)' : ''}
                        </option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-warning btn-sm me-2"
                      onClick={cleanupDuplicateBookings}
                      title="Remove duplicate bookings"
                    >
                      🧹 Clean
                    </button>
                    <button 
                      className="btn btn-outline-light btn-sm me-2"
                      onClick={loadOfflineBookings}
                    >
                      🔄 Refresh
                    </button>
                    <button 
                      className="btn btn-outline-light btn-sm"
                      onClick={() => {
                        const bookingsToExport = selectedViewDate === 'all' ? offlineBookings : 
                          offlineBookings.filter(b => b.date === selectedViewDate);
                        const csvContent = "data:text/csv;charset=utf-8," 
                          + "Sl,Name,Board,Status,Amount,Discount,Net,Cash,GPay,Settlement,Date,Start Time,End Time,Duration,Notes\n"
                          + bookingsToExport.map(b => 
                              `${b.slNo},${b.customerName},${b.board},${b.status},${b.amount},${b.discount},${(b.amount||0)-(b.discount||0)},${b.cashAmount},${b.gpayAmount},${b.settlement},${b.date},${b.startTime},${b.endTime||''},${b.duration},${b.notes||''}`
                            ).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `cue-club-bookings-${selectedViewDate === 'all' ? 'all' : selectedViewDate}.csv`);
                        link.click();
                      }}
                    >
                      📊 Export CSV
                    </button>
                  </div>
                </div>
                
                {/* Statistics Row - Only show when specific date is selected */}
                {selectedViewDate !== 'all' && (() => {
                  const dateBookings = offlineBookings.filter(b => b.date === selectedViewDate);
                  const stats = getDateBasedStatistics(dateBookings);
                  return (
                    <div className="row mt-3 g-2">
                      <div className="col-6 col-md-3">
                        <div className="card text-center bg-primary bg-opacity-75 text-white border-0">
                          <div className="card-body p-2">
                            <h6 className="card-title mb-1 small">Total</h6>
                            <h5 className="mb-0">{stats.totalBookings}</h5>
                          </div>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="card text-center bg-success bg-opacity-75 text-white border-0">
                          <div className="card-body p-2">
                            <h6 className="card-title mb-1 small">Revenue</h6>
                            <h5 className="mb-0">₹{stats.netRevenue}</h5>
                          </div>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="card text-center bg-info bg-opacity-75 text-white border-0">
                          <div className="card-body p-2">
                            <h6 className="card-title mb-1 small">Settled</h6>
                            <h5 className="mb-0">{stats.settledBookings}/{stats.totalBookings}</h5>
                          </div>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="card text-center bg-warning bg-opacity-75 text-dark border-0">
                          <div className="card-body p-2">
                            <h6 className="card-title mb-1 small">Avg Value</h6>
                            <h5 className="mb-0">₹{stats.averageBookingValue}</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            <div className={`card-body p-0 ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
              <div 
                className="table-responsive" 
                style={{ 
                  maxHeight: '75vh', 
                  overflowY: 'auto',
                  scrollBehavior: 'smooth',
                  scrollbarWidth: 'thin',
                  scrollbarColor: theme === 'dark' ? '#6c757d #495057' : '#dee2e6 #f8f9fa',
                  WebkitScrollbar: {
                    width: '8px'
                  }
                }}
                onScroll={(e) => {
                  // Add scroll shadow effect for better UX
                  const target = e.target;
                  const scrollTop = target.scrollTop;
                  const maxScroll = target.scrollHeight - target.clientHeight;
                  
                  if (scrollTop > 10) {
                    target.style.borderTop = '2px solid rgba(0,123,255,0.2)';
                  } else {
                    target.style.borderTop = 'none';
                  }
                  
                  if (scrollTop < maxScroll - 10) {
                    target.style.borderBottom = '2px solid rgba(0,123,255,0.2)';
                  } else {
                    target.style.borderBottom = 'none';
                  }
                }}
              >
                <table className={`table table-bordered table-striped align-middle mb-0 ${theme === 'dark' ? 'table-dark' : ''}`} style={{
                  position: 'relative'
                }}>
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      <th>#</th>
                      <th>Customer Name</th>
                      <th>Board</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Discount</th>
                      <th>Net</th>
                      <th>Cash</th>
                      <th>GPay</th>
                      <th>Settlement</th>
                      <th>Date</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                      <th>Duration</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredBookings = selectedViewDate === 'all' ? offlineBookings : 
                        offlineBookings.filter(b => b.date === selectedViewDate);
                      
                      if (filteredBookings.length === 0) {
                        return (
                          <tr>
                            <td colSpan="15" className="text-center text-muted">
                              {selectedViewDate === 'all' ? 'No offline bookings found.' : 
                               `No bookings found for ${new Date(selectedViewDate).toLocaleDateString('en-IN')}`}
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredBookings.map((booking, index) => {
                        const netAmount = (booking.amount || 0) - (booking.discount || 0);
                        const totalPaid = (booking.cashAmount || 0) + (booking.gpayAmount || 0);
                        const isFullyPaid = totalPaid >= netAmount;
                        
                        return (
                          <tr key={booking.id}>
                            <td>{booking.slNo || index + 1}</td>
                            <td className="text-capitalize">{booking.customerName}</td>
                            <td>
                              <span className={`badge ${
                                booking.board?.toLowerCase().includes('pool') ? 'bg-primary' :
                                booking.board?.toLowerCase().includes('snooker') ? 'bg-success' :
                                booking.board?.toLowerCase().includes('carrom') ? 'bg-info' : 'bg-secondary'
                              }`}>
                                {games.find(g => g.id === booking.board)?.name || booking.board}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                booking.status === 'OPEN' ? 'bg-success' :
                                booking.status === 'CLOSE' ? 'bg-secondary' : 'bg-warning'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="text-end">₹{booking.amount || 0}</td>
                            <td className="text-end text-danger">₹{booking.discount || 0}</td>
                            <td className="text-end fw-bold">₹{netAmount}</td>
                            <td className="text-end text-success">₹{booking.cashAmount || 0}</td>
                            <td className="text-end text-info">₹{booking.gpayAmount || 0}</td>
                            <td>
                              <span className={`badge ${
                                booking.settlement === 'SETTLED' ? 'bg-success' :
                                booking.settlement === 'PENDING' ? 'bg-warning' : 'bg-danger'
                              }`}>
                                {booking.settlement}
                              </span>
                            </td>
                            <td>{new Date(booking.date).toLocaleDateString('en-IN')}</td>
                            <td>{booking.startTime}</td>
                            <td>{booking.endTime || '-'}</td>
                            <td className="text-center">{booking.duration}h</td>
                            <td>
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-info btn-sm"
                                  onClick={() => {
                                    // Edit functionality - prepare form and open modal
                                    const gameForBooking = games.find(g => g.id === booking.board);
                                    setSelectedGame(gameForBooking);
                                    setNewOfflineBooking(booking);
                                    setIsEditingOfflineBooking(true);
                                    setEditingBookingId(booking.id);
                                    setShowBookingModal(true);
                                  }}
                                  title="Edit booking"
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => { if(window.confirm('Are you sure you want to delete this booking?')) handleDeleteOfflineBooking(booking.id); }}
                                  title="Delete booking"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const filteredBookings = selectedViewDate === 'all' ? offlineBookings : 
                  offlineBookings.filter(b => b.date === selectedViewDate);
                
                if (filteredBookings.length > 0) {
                  return (
                    <div className={`card-footer ${theme === 'dark' ? 'bg-secondary text-light' : ''}`} style={{background: theme === 'dark' ? 'linear-gradient(135deg, #495057, #6c757d)' : 'linear-gradient(135deg, #f8f9fa, #e9ecef)'}}>
                      <div className="row text-center">
                        <div className="col-md-3">
                          <strong>Total Bookings:</strong><br />
                          <span className="text-primary fs-5">{filteredBookings.length}</span>
                          {selectedViewDate !== 'all' && (
                            <div className="small text-muted">for {new Date(selectedViewDate).toLocaleDateString('en-IN')}</div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <strong>Game Revenue:</strong><br />
                          <span className="text-success fs-5">₹{filteredBookings.reduce((sum, b) => sum + ((b.amount || 0) - (b.discount || 0)), 0)}</span>
                        </div>
                        <div className="col-md-3">
                          <strong>Cash Total:</strong><br />
                          <span className="text-warning fs-5">₹{filteredBookings.reduce((sum, b) => sum + (b.cashAmount || 0), 0)}</span>
                        </div>
                        <div className="col-md-3">
                          <strong>GPay Total:</strong><br />
                          <span className="text-primary fs-5">₹{filteredBookings.reduce((sum, b) => sum + (b.gpayAmount || 0), 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </section>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className={`modal-content ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
              <div className={`modal-header ${theme === 'dark' ? 'bg-secondary' : 'bg-primary'} text-white`}>
                <h5 className="modal-title">
                  <i className="fas fa-gamepad me-2"></i>
                  {isEditingOfflineBooking ? 'Edit Booking' : 'Create Booking'} - {selectedGame?.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={handleCloseBookingModal}></button>
              </div>
              <div className="modal-body">
                {/* Edit Mode Indicator */}
                {isEditingOfflineBooking && (
                  <div className="alert alert-info mb-3">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-edit text-info me-2"></i>
                      <div>
                        <strong>Edit Mode</strong>
                        <div className="small">You are editing booking #{editingBookingId?.slice(-6)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Smart Recommendations Panel */}
                {smartRecommendations.length > 0 && (
                  <div className={`alert ${theme === 'dark' ? 'alert-dark border-secondary' : 'alert-light'} mb-3`}>
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-brain text-primary me-2"></i>
                      <h6 className="mb-0">Smart Suggestions</h6>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {smartRecommendations.map((rec, index) => (
                        <div 
                          key={index}
                          className={`p-2 rounded border ${
                            rec.priority === 'high' ? 'border-danger bg-danger bg-opacity-10' :
                            rec.priority === 'medium' ? 'border-warning bg-warning bg-opacity-10' :
                            'border-info bg-info bg-opacity-10'
                          }`}
                          style={{fontSize: '0.85rem'}}
                        >
                          <div className="d-flex align-items-center">
                            <span className="me-2">{rec.icon}</span>
                            <div className="flex-grow-1">
                              <strong>{rec.title}</strong>
                              <div className="small text-muted">{rec.description}</div>
                            </div>
                            {rec.action && (
                              <button 
                                className="btn btn-sm btn-outline-primary ms-2"
                                onClick={rec.action}
                              >
                                Apply
                              </button>
                            )}
                          </div>
                          {rec.conflicts && rec.conflicts.length > 0 && (
                            <div className="mt-2 small">
                              <strong>Conflicts:</strong>
                              {rec.conflicts.map((conflict, i) => (
                                <div key={i} className="text-danger">
                                  • {conflict.customerName} ({conflict.startTime}-{conflict.endTime})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer History Panel */}
                {newOfflineBooking.customerName && customerHistory[newOfflineBooking.customerName] && (
                  <div className={`alert ${theme === 'dark' ? 'alert-dark border-secondary' : 'alert-info'} mb-3`}>
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-user-clock text-info me-2"></i>
                      <h6 className="mb-0">Customer History - {newOfflineBooking.customerName}</h6>
                    </div>
                    <div className="row small">
                      {(() => {
                        const history = customerHistory[newOfflineBooking.customerName];
                        return (
                          <>
                            <div className="col-md-6">
                              <div><strong>Total Bookings:</strong> {history.totalBookings}</div>
                              <div><strong>Favorite Game:</strong> {history.favoriteGame}</div>
                              <div><strong>Preferred Time:</strong> {history.preferredTimeSlot}</div>
                            </div>
                            <div className="col-md-6">
                              <div><strong>Avg Duration:</strong> {history.averageDuration}h</div>
                              <div><strong>Total Spent:</strong> ₹{history.totalSpent}</div>
                              <div><strong>Last Visit:</strong> {history.lastVisit}</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Smart Controls Panel */}
                <div className={`card mb-3 ${theme === 'dark' ? 'bg-secondary border-secondary' : 'bg-light'}`}>
                  <div className="card-body p-3">
                    <h6 className="card-title mb-3">
                      <i className="fas fa-cogs me-2"></i>Smart Features
                    </h6>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="autoCalculate"
                            checked={autoCalculateEnabled}
                            onChange={() => toggleSmartFeature('autoCalculate')}
                          />
                          <label className="form-check-label small" htmlFor="autoCalculate">
                            Auto Calculate Amount
                          </label>
                        </div>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="smartPricing"
                            checked={smartPricingEnabled}
                            onChange={() => toggleSmartFeature('smartPricing')}
                          />
                          <label className="form-check-label small" htmlFor="smartPricing">
                            Smart Pricing
                          </label>
                        </div>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="autoEndTime"
                            checked={autoEndTimeEnabled}
                            onChange={() => toggleSmartFeature('autoEndTime')}
                          />
                          <label className="form-check-label small" htmlFor="autoEndTime">
                            Auto End Time
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="conflictDetection"
                            checked={conflictDetection}
                            onChange={() => toggleSmartFeature('conflictDetection')}
                          />
                          <label className="form-check-label small" htmlFor="conflictDetection">
                            Conflict Detection
                          </label>
                        </div>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="quickMode"
                            checked={quickBookingMode}
                            onChange={() => toggleSmartFeature('quickMode')}
                          />
                          <label className="form-check-label small" htmlFor="quickMode">
                            Quick Booking Mode
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleOfflineBookingSubmit(); }}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Customer Name</label>
                      <div className="position-relative">
                        <input 
                          type="text" 
                          className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                          value={newOfflineBooking.customerName} 
                          onChange={e => handleCustomerNameChange(e.target.value)}
                          required 
                          autoComplete="off"
                        />
                        {showCustomerSuggestions && (
                          <div className={`position-absolute w-100 ${theme === 'dark' ? 'bg-dark border-secondary' : 'bg-white border'} border-top-0 rounded-bottom shadow-sm`} style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto'}}>
                            {customerSuggestions
                              .filter(name => name.toLowerCase().includes(newOfflineBooking.customerName.toLowerCase()))
                              .slice(0, 5)
                              .map((name, index) => (
                              <div 
                                key={index}
                                className={`p-2 cursor-pointer ${theme === 'dark' ? 'hover:bg-secondary' : 'hover:bg-light'}`}
                                style={{cursor: 'pointer'}}
                                onClick={() => {
                                  handleCustomerNameChange(name);
                                  setShowCustomerSuggestions(false);
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = theme === 'dark' ? '#6c757d' : '#f8f9fa'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-user me-2 text-muted"></i>
                                  <span>{name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Date</label>
                      <input 
                        type="date" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={newOfflineBooking.date} 
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setNewOfflineBooking({...newOfflineBooking, date: newDate});
                          // Auto-generate smart serial number for the selected date
                          const smartSerial = generateSmartSerialNumber(newDate);
                          setSmartSerialNumber(smartSerial);
                          setNewOfflineBooking(prev => ({...prev, date: newDate, slNo: smartSerial}));
                        }} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Smart Serial #</label>
                      <div className="input-group">
                        <input 
                          type="number"
                          className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                          value={isNaN(newOfflineBooking.slNo) ? smartSerialNumber : newOfflineBooking.slNo}
                          onChange={(e) => setNewOfflineBooking({...newOfflineBooking, slNo: parseInt(e.target.value) || 1})}
                          min="1"
                          required
                        />
                        <button
                          type="button"
                          className={`btn ${theme === 'dark' ? 'btn-outline-light' : 'btn-outline-secondary'} btn-sm`}
                          onClick={() => {
                            const smartSerial = generateSmartSerialNumber(newOfflineBooking.date);
                            setSmartSerialNumber(smartSerial);
                            setNewOfflineBooking(prev => ({...prev, slNo: smartSerial}));
                          }}
                          title="Auto-generate next available serial number"
                        >
                          🔄
                        </button>
                      </div>
                      <small className={`form-text ${theme === 'dark' ? 'text-light' : 'text-muted'}`}>
                        Auto-generated for {new Date(newOfflineBooking.date).toLocaleDateString('en-IN')}
                      </small>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Game</label>
                      <input 
                        type="text"
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={selectedGame?.name || ''} 
                        readOnly
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Start Time</label>
                      <input 
                        type="time" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={newOfflineBooking.startTime} 
                        onChange={e => handleTimeChange('startTime', e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Duration (hours)</label>
                      <input 
                        type="number" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={isNaN(newOfflineBooking.duration) ? 1 : newOfflineBooking.duration}
                        min="0.5"
                        step="0.5"
                        onChange={e => handleDurationChange(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  {/* Auto-calculated End Time Display */}
                  {newOfflineBooking.startTime && newOfflineBooking.duration && (
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label">End Time (Auto-calculated)</label>
                        <input 
                          type="time" 
                          className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                          value={(() => {
                            if (!newOfflineBooking.startTime || !newOfflineBooking.duration) return '';
                            const start = new Date(`2000-01-01T${newOfflineBooking.startTime}`);
                            start.setMinutes(start.getMinutes() + (newOfflineBooking.duration * 60));
                            return start.toTimeString().slice(0, 5);
                          })()}
                          onChange={e => handleTimeChange('endTime', e.target.value)}
                        />
                      </div>
                      <div className="col-md-8 mb-3 d-flex align-items-end">
                        <div className={`p-2 rounded ${theme === 'dark' ? 'bg-secondary' : 'bg-light'} w-100`}>
                          <small className="text-muted">
                            <i className="fas fa-info-circle me-1"></i>
                            Duration: {newOfflineBooking.duration}h • 
                            {smartPricingEnabled ? ' Smart Pricing Applied' : ' Standard Pricing'} • 
                            Net Amount: ₹{((newOfflineBooking.amount || 0) - (newOfflineBooking.discount || 0)).toFixed(2)}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Amount (₹)</label>
                      <input 
                        type="number" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={isNaN(newOfflineBooking.amount) ? '' : newOfflineBooking.amount} 
                        onChange={e => handleAmountChange(e.target.value)}
                        required 
                      />
                      {smartPricingEnabled && selectedGame && (
                        <small className="text-muted">
                          Base rate: ₹{selectedGame.price}/hr
                        </small>
                      )}
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Discount (₹)</label>
                      <input 
                        type="number" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={isNaN(newOfflineBooking.discount) ? '' : newOfflineBooking.discount} 
                        onChange={e => handleDiscountChange(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">Cash Amount (₹)</label>
                      <input 
                        type="number" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={isNaN(newOfflineBooking.cashAmount) ? '' : newOfflineBooking.cashAmount} 
                        onChange={e => handlePaymentChange('cashAmount', e.target.value)}
                      />
                    </div>
                    <div className="col-md-3 mb-3">
                      <label className="form-label">GPay Amount (₹)</label>
                      <input 
                        type="number" 
                        className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                        value={isNaN(newOfflineBooking.gpayAmount) ? '' : newOfflineBooking.gpayAmount} 
                        onChange={e => handlePaymentChange('gpayAmount', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className={`alert ${
                    newOfflineBooking.settlement === 'SETTLED' ? 'alert-success' :
                    newOfflineBooking.settlement === 'PARTIAL' ? 'alert-warning' : 'alert-info'
                  } mb-3`}>
                    <div className="row small">
                      <div className="col-md-3">
                        <strong>Total Amount:</strong> ₹{newOfflineBooking.amount || 0}
                      </div>
                      <div className="col-md-3">
                        <strong>Discount:</strong> ₹{newOfflineBooking.discount || 0}
                      </div>
                      <div className="col-md-3">
                        <strong>Net Amount:</strong> ₹{((newOfflineBooking.amount || 0) - (newOfflineBooking.discount || 0)).toFixed(2)}
                      </div>
                      <div className="col-md-3">
                        <strong>Total Paid:</strong> ₹{((newOfflineBooking.cashAmount || 0) + (newOfflineBooking.gpayAmount || 0)).toFixed(2)}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`badge ${
                        newOfflineBooking.settlement === 'SETTLED' ? 'bg-success' :
                        newOfflineBooking.settlement === 'PARTIAL' ? 'bg-warning' : 'bg-secondary'
                      }`}>
                        {newOfflineBooking.settlement} 
                        {newOfflineBooking.settlement === 'PARTIAL' && 
                          ` (Balance: ₹${(((newOfflineBooking.amount || 0) - (newOfflineBooking.discount || 0)) - ((newOfflineBooking.cashAmount || 0) + (newOfflineBooking.gpayAmount || 0))).toFixed(2)})`
                        }
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes (Optional)</label>
                    <textarea 
                      className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                      rows="3"
                      value={newOfflineBooking.notes} 
                      onChange={e => setNewOfflineBooking({...newOfflineBooking, notes: e.target.value})} 
                    />
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={handleCloseBookingModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>
                      {isEditingOfflineBooking ? 'Update Booking' : 'Create Booking'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slot Management Tab */}
      {activeTab === 'slots' && (
        <div className="w-100">
          {/* Date Selection */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                  <h6 className="mb-0">📅 Select Date</h6>
                </div>
                <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                  <input
                    type="date"
                    className="form-control form-control-lg"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                <div className={`card-header d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                  <h6 className="mb-0">🎮 Select Games</h6>
                  <div>
                    <button 
                      className="btn btn-outline-primary btn-sm me-2"
                      onClick={() => setSelectedGames(games.map(g => g.id))}
                    >
                      Select All
                    </button>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSelectedGames([])}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}> 
                  <div className="row g-2">
                    {games.map(game => (
                      <div key={game.id} className="col-lg-2 col-md-3 col-sm-4 col-6">
                        <div 
                          className={`card h-100 cursor-pointer border-2 ${
                            selectedGames.includes(game.id) ? 'border-primary bg-primary bg-opacity-10' : 'border-light'
                          }`}
                          onClick={() => {
                            if (selectedGames.includes(game.id)) {
                              setSelectedGames(selectedGames.filter(id => id !== game.id));
                            } else {
                              setSelectedGames([...selectedGames, game.id]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="card-body text-center p-2">
                            <div className="mb-2">
                              {selectedGames.includes(game.id) ? '✅' : '⚪'}
                            </div>
                            <div className="fw-bold small">{game.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>₹{game.price}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <small className="text-muted">
                      Selected: <span className="fw-bold text-primary">{selectedGames.length}</span> out of {games.length} games
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Slots Selection */}
          {selectedDate && selectedGames.length > 0 && (
            <div className={`card mb-4 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
              <div className={`card-header d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                <h6 className="mb-0">⏰ Select Time Slots (30-minute intervals)</h6>
                <div>
                  <button 
                    className="btn btn-outline-info btn-sm me-2"
                    onClick={() => setSelectedTimeSlots(timeSlotOptions.slice(0, 16))}
                  >
                    📅 Morning (9AM-4:30PM)
                  </button>
                  <button 
                    className="btn btn-outline-warning btn-sm me-2"
                    onClick={() => setSelectedTimeSlots(timeSlotOptions.slice(16))}
                  >
                    🌙 Evening (5PM-12AM)
                  </button>
                  <button 
                    className="btn btn-outline-secondary btn-sm me-2"
                    onClick={() => setSelectedTimeSlots(timeSlotOptions)}
                  >
                    Select All
                  </button>
                  <button 
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setSelectedTimeSlots([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}> 
                <div className="row g-2">
                  {timeSlotOptions.map((slot, idx) => (
                    <div key={idx} className="col-lg-2 col-md-3 col-sm-4 col-6">
                      <div 
                        className={`card h-100 cursor-pointer border-2 ${
                          selectedTimeSlots.includes(slot) ? 'border-success bg-success bg-opacity-10' : 'border-light'
                        }`}
                        onClick={() => {
                          if (selectedTimeSlots.includes(slot)) {
                            setSelectedTimeSlots(selectedTimeSlots.filter(s => s !== slot));
                          } else {
                            setSelectedTimeSlots([...selectedTimeSlots, slot]);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="card-body text-center p-2">
                          <div className="mb-1">
                            {selectedTimeSlots.includes(slot) ? '✅' : '⚪'}
                          </div>
                          <div className="fw-bold small">{slot}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Selected: <span className="fw-bold text-success">{selectedTimeSlots.length}</span> time slots
                  </small>
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={handleAddSlot}
                    disabled={!selectedDate || !selectedGames.length || !selectedTimeSlots.length}
                  >
                    ➕ Add {selectedTimeSlots.length} Slot(s) to {selectedGames.length} Game(s)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Slots Display */}
          {selectedDate && selectedGames.length > 0 && (
            <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
              <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                <h6 className="mb-0">📋 Existing Slots for {selectedDate}</h6>
              </div>
              <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}> 
                {slots.length === 0 ? (
                  <p className="text-muted text-center">No slots configured for selected date and games.</p>
                ) : (
                  <div className="row g-2">
                    {slots.map((slot, index) => (
                      <div key={`${slot.gameId}-${slot.time}-${index}`} className="col-lg-2 col-md-3 col-sm-4 col-6">
                        <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-dark text-light border-secondary' : 'bg-light'}`}> 
                          <div className="card-body text-center p-2">
                            <div className="fw-bold text-primary small">{slot.time}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{slot.gameName}</div>
                            <button 
                              className="btn btn-danger btn-sm d-block w-100 mt-2"
                              onClick={() => handleDeleteSlot(slot.time, slot.gameId)}
                              style={{ fontSize: '0.7rem' }}
                            >
                              🗑️ Remove
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
          <div className={`card mb-4 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
            <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>Add New Game</div>
            <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}> 
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
          <div className="row flex-wrap">
            {games.map(game => (
              <div className="col-md-4 mb-3" key={game.id}>
                <div className={`card h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                  {game.image && (
                    <img src={game.image} alt={game.name} className="card-img-top" style={{ height: '180px', objectFit: 'cover' }} />
                  )}
                  <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}> 
                    <h5 className="card-title">{game.name}</h5>
                    <p className="card-text mb-1">Price: ₹{game.price}</p>
                    <p className="card-text mb-1">Category: {game.category}</p>
                    <p className="card-text mb-1">
                      Status: 
                      <span className={`badge ms-2 ${game.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {game.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div className={`card-footer d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}> 
                    <div className="btn-group" role="group">
                      <button 
                        className={`btn btn-sm ${game.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleGameStatus(game.id, game.isActive)}
                        title={game.isActive ? 'Deactivate game' : 'Activate game'}
                      >
                        {game.isActive ? '🚫 Deactivate' : '✅ Activate'}
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleDeleteGame(game.id)}
                        title="Delete game permanently"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="w-100">
          {/* Week Navigation Header */}
          <div className={`card mb-4 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
            <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`} style={{background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white'}}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0 text-white fw-bold"><i className="fas fa-chart-line me-2"></i>Weekly Analytics Dashboard</h5>
                  <small className="text-white-50">Complete booking analysis with insights</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button 
                    className="btn btn-outline-light btn-sm" 
                    onClick={() => changeWeek(-1)}
                    disabled={analyticsLoading}
                    title="Previous Week"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <div className="text-center px-3">
                    <div className="fw-bold text-white">{selectedWeekRange.weekLabel}</div>
                    <small className="text-white-50">
                      {selectedWeekOffset === 0 ? 'Current Week' : 
                       selectedWeekOffset === -1 ? 'Last Week' : 
                       selectedWeekOffset === 1 ? 'Next Week' : 
                       `${Math.abs(selectedWeekOffset)} weeks ${selectedWeekOffset < 0 ? 'ago' : 'ahead'}`}
                    </small>
                  </div>
                  <button 
                    className="btn btn-outline-light btn-sm" 
                    onClick={() => changeWeek(1)}
                    disabled={analyticsLoading}
                    title="Next Week"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  {selectedWeekOffset !== 0 && (
                    <button 
                      className="btn btn-light btn-sm ms-2" 
                      onClick={goToCurrentWeek}
                      disabled={analyticsLoading}
                    >
                      <i className="fas fa-home me-1"></i>Current
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary me-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5 className="text-muted">Loading Weekly Analytics...</h5>
            </div>
          ) : weeklyAnalytics ? (
            <>
              {/* Summary Cards */}
              <div className="row mb-4">
                <div className="col-lg-3 col-md-6 mb-3">
                  <div className={`card border-0 shadow-sm h-100 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`} style={{background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'}}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <h3 className="mb-1 fw-bold">{weeklyAnalytics.summary.totalBookings}</h3>
                          <p className="mb-0 opacity-75">Total Bookings</p>
                          <small className="opacity-50">
                            {weeklyAnalytics.summary.averageBookingsPerDay.toFixed(1)} per day avg
                          </small>
                        </div>
                        <div className="ms-3">
                          <i className="fas fa-calendar-check fa-2x opacity-75"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                  <div className={`card border-0 shadow-sm h-100 ${theme === 'dark' ? 'bg-dark text-light' : ''}`} style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <h3 className="mb-1 fw-bold">₹{weeklyAnalytics.summary.totalRevenue.toLocaleString()}</h3>
                          <p className="mb-0 opacity-75">Total Revenue</p>
                          <small className="opacity-50">
                            ₹{weeklyAnalytics.summary.averageRevenuePerDay.toLocaleString()} per day avg
                          </small>
                        </div>
                        <div className="ms-3">
                          <i className="fas fa-rupee-sign fa-2x opacity-75"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                  <div className={`card border-0 shadow-sm h-100 ${theme === 'dark' ? 'bg-dark text-light' : ''}`} style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <h3 className="mb-1 fw-bold">{weeklyAnalytics.summary.totalOnlineBookings}</h3>
                          <p className="mb-0 opacity-75">Online Bookings</p>
                          <small className="opacity-50">
                            {weeklyAnalytics.summary.totalBookings > 0 ? 
                              Math.round((weeklyAnalytics.summary.totalOnlineBookings / weeklyAnalytics.summary.totalBookings) * 100) : 0}% of total
                          </small>
                        </div>
                        <div className="ms-3">
                          <i className="fas fa-globe fa-2x opacity-75"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6 mb-3">
                  <div className={`card border-0 shadow-sm h-100 ${theme === 'dark' ? 'bg-dark text-light' : ''}`} style={{background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}}>
                    <div className="card-body text-white p-4">
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <h3 className="mb-1 fw-bold">{weeklyAnalytics.summary.totalOfflineBookings}</h3>
                          <p className="mb-0 opacity-75">Offline Bookings</p>
                          <small className="opacity-50">
                            {weeklyAnalytics.summary.totalBookings > 0 ? 
                              Math.round((weeklyAnalytics.summary.totalOfflineBookings / weeklyAnalytics.summary.totalBookings) * 100) : 0}% of total
                          </small>
                        </div>
                        <div className="ms-3">
                          <i className="fas fa-store fa-2x opacity-75"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Trends Line Chart */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                      <h6 className="mb-0"><i className="fas fa-chart-line me-2"></i>Weekly Trends</h6>
                    </div>
                    <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                      <WeeklyLineChart dailyStats={weeklyAnalytics.dailyStats} theme={theme} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Breakdown Chart */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                      <h6 className="mb-0"><i className="fas fa-chart-bar me-2"></i>Daily Breakdown</h6>
                    </div>
                    <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                      <div className="row g-2">
                        {weeklyAnalytics.dailyStats.map((day, index) => (
                          <div key={day.date} className="col-lg-1 col-md-2 col-sm-3 col-4">
                            <div className={`card text-center h-100 ${day.totalBookings === weeklyAnalytics.peakDay.totalBookings ? 'border-warning bg-warning bg-opacity-10' : ''} ${theme === 'dark' ? 'bg-dark text-light border-secondary' : 'border-light'}`}>
                              <div className="card-body p-2">
                                <div className="fw-bold text-primary">{day.dayName}</div>
                                <div className="small text-muted">{new Date(day.date).getDate()}</div>
                                <div className="mt-1">
                                  <div className="fw-bold">{day.totalBookings}</div>
                                  <small className="text-success">₹{day.revenue}</small>
                                </div>
                                <div className="mt-1">
                                  <small className="text-primary">{day.onlineBookings} online</small><br/>
                                  <small className="text-warning">{day.offlineBookings} offline</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-center">
                        <small className="text-muted">
                          <i className="fas fa-crown text-warning me-1"></i>
                          Peak day: <strong>{weeklyAnalytics.peakDay.dayName}</strong> with {weeklyAnalytics.peakDay.totalBookings} bookings
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Performance & Status/Settlement Stats */}
              <div className="row mb-4">
                {/* Game Performance */}
                <div className="col-lg-8 mb-3">
                  <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                      <h6 className="mb-0"><i className="fas fa-gamepad me-2"></i>Game Performance</h6>
                    </div>
                    <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                      <div className="table-responsive">
                        <table className={`table table-sm table-hover ${theme === 'dark' ? 'table-dark' : ''}`}>
                          <thead>
                            <tr>
                              <th>Game</th>
                              <th>Online</th>
                              <th>Offline</th>
                              <th>Total</th>
                              <th>Revenue</th>
                              <th>Avg/Day</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyAnalytics.gameStats.map((game, index) => (
                              <tr key={game.gameId} className={`${theme === 'dark' ? 'table-dark' : ''}`}>
                                <td>
                                  <span className="fw-semibold">{game.gameName}</span>
                                  {game.category && <br/>}
                                  {game.category && <small className="text-muted">{game.category}</small>}
                                </td>
                                <td><span className="badge bg-primary">{game.onlineBookings}</span></td>
                                <td><span className="badge bg-warning">{game.offlineBookings}</span></td>
                                <td><span className="badge bg-success">{game.totalBookings}</span></td>
                                <td className="text-success fw-semibold">₹{game.revenue.toLocaleString()}</td>
                                <td>{game.utilizationRate}</td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => loadGameAnalytics(game.gameId)}
                                    disabled={gameAnalyticsLoading}
                                    title="View detailed analytics for this game"
                                  >
                                    <i className="fas fa-chart-line me-1"></i>
                                    {gameAnalyticsLoading ? 'Loading...' : 'Details'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Settlement Stats */}
                <div className="col-lg-4 mb-3">
                  <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                    <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                      <h6 className="mb-0"><i className="fas fa-chart-pie me-2"></i>Status Overview</h6>
                    </div>
                    <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                      {/* Online Booking Status */}
                      <div className="mb-3">
                        <small className="text-muted fw-semibold">ONLINE BOOKINGS</small>
                        <div className="mt-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small">Confirmed</span>
                            <span className="badge bg-success">{weeklyAnalytics.statusStats.confirmed}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small">Pending</span>
                            <span className="badge bg-warning">{weeklyAnalytics.statusStats.pending}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="small">Cancelled</span>
                            <span className="badge bg-danger">{weeklyAnalytics.statusStats.cancelled}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Offline Booking Settlement */}
                      <div>
                        <small className="text-muted fw-semibold">OFFLINE SETTLEMENTS</small>
                        <div className="mt-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small">Settled</span>
                            <span className="badge bg-success">{weeklyAnalytics.settlementStats.settled}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small">Partial</span>
                            <span className="badge bg-warning">{weeklyAnalytics.settlementStats.partial}</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="small">Pending</span>
                            <span className="badge bg-danger">{weeklyAnalytics.settlementStats.pending}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Customers */}
              {weeklyAnalytics.topCustomers.length > 0 && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                      <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                        <h6 className="mb-0"><i className="fas fa-users me-2"></i>Top Customers (Offline Bookings)</h6>
                      </div>
                      <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}>
                        <div className="row g-3">
                          {weeklyAnalytics.topCustomers.map((customer, index) => (
                            <div key={customer.name} className="col-lg-2 col-md-3 col-sm-4 col-6">
                              <div className={`card text-center h-100 ${theme === 'dark' ? 'bg-secondary border-secondary' : 'bg-light border-light'}`}>
                                <div className="card-body p-3">
                                  <div className="position-relative">
                                    <i className="fas fa-user-circle fa-2x text-primary mb-2"></i>
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success">
                                      #{index + 1}
                                    </span>
                                  </div>
                                  <h6 className="mb-1 text-truncate" title={customer.name}>{customer.name}</h6>
                                  <small className="text-muted">{customer.bookings} bookings</small>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Click "Load Analytics" to view weekly data</h5>
              <button className="btn btn-primary mt-2" onClick={() => loadWeeklyAnalytics(selectedWeekOffset)}>
                <i className="fas fa-refresh me-2"></i>Load Analytics
              </button>
            </div>
          )}
        </div>
      )}

      {/* Individual Game Analytics Modal */}
      {showGameAnalytics && selectedGameAnalytics && (
        <div className="modal-backdrop-custom" style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className={`modal-content-custom ${theme === 'dark' ? 'bg-dark text-light' : 'bg-white'}`} style={{
            maxWidth: '90vw',
            width: '1000px',
            maxHeight: '90vh',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div className={`px-4 py-3 border-bottom ${theme === 'dark' ? 'border-secondary bg-secondary' : 'bg-light border-light'}`}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-gamepad me-2 text-primary"></i>
                  {selectedGameAnalytics?.game?.name || 'Game Analytics'}
                </h5>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={closeGameAnalytics}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4" style={{ maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
              {gameAnalyticsLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3 text-muted">Loading game analytics...</p>
                </div>
              ) : (
                <div className="row">
                  {/* Summary Cards */}
                  <div className="col-12 mb-4">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <div className={`card h-100 ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-primary text-white'}`}>
                          <div className="card-body text-center">
                            <i className="fas fa-calendar-check fa-2x mb-2"></i>
                            <h3 className="mb-1">{selectedGameAnalytics?.summary?.totalBookings || 0}</h3>
                            <small>Total Bookings</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className={`card h-100 ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-success text-white'}`}>
                          <div className="card-body text-center">
                            <i className="fas fa-rupee-sign fa-2x mb-2"></i>
                            <h3 className="mb-1">₹{(selectedGameAnalytics?.summary?.totalRevenue || 0).toLocaleString()}</h3>
                            <small>Total Revenue</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className={`card h-100 ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-info text-white'}`}>
                          <div className="card-body text-center">
                            <i className="fas fa-chart-line fa-2x mb-2"></i>
                            <h3 className="mb-1">₹{(selectedGameAnalytics?.summary?.averageRevenuePerDay || 0).toFixed(0)}</h3>
                            <small>Avg Daily Revenue</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className={`card h-100 ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-warning text-white'}`}>
                          <div className="card-body text-center">
                            <i className="fas fa-users fa-2x mb-2"></i>
                            <h3 className="mb-1">{selectedGameAnalytics?.frequentCustomers?.length || 0}</h3>
                            <small>Frequent Customers</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="col-12">
                    <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                      <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                        <h6 className="mb-0">
                          <i className="fas fa-chart-area me-2"></i>
                          Booking Trends (Last 30 Days)
                        </h6>
                      </div>
                      <div className="card-body">
                        <GameAnalyticsChart 
                          gameAnalytics={selectedGameAnalytics} 
                          theme={theme}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="col-12 mt-4">
                    <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                      <div className={`card-header ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                        <h6 className="mb-0">
                          <i className="fas fa-info-circle me-2"></i>
                          Additional Statistics
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="mb-3">
                              <strong>Peak Booking Day:</strong>
                              <br />
                              <span className="text-muted">
                                {selectedGameAnalytics?.peakDay?.dayName 
                                  ? `${selectedGameAnalytics.peakDay.dayName} (${selectedGameAnalytics.peakDay.totalBookings} bookings)`
                                  : 'No data available'}
                              </span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <strong>Most Popular Time:</strong>
                              <br />
                              <span className="text-muted">
                                {selectedGameAnalytics?.popularTimeSlots?.[0]?.time 
                                  ? `${selectedGameAnalytics.popularTimeSlots[0].time} (${selectedGameAnalytics.popularTimeSlots[0].bookings} bookings)`
                                  : 'No data available'}
                              </span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <strong>Utilization Rate:</strong>
                              <br />
                              <span className="text-muted">
                                {selectedGameAnalytics?.summary?.utilizationRate 
                                  ? `${selectedGameAnalytics.summary.utilizationRate.toFixed(2)}%`
                                  : '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Activities Tab */}
      {activeTab === 'activities' && (
        <div className="w-100">
          <div className="row mb-4 flex-wrap">
            <div className="col-12">
              <div className={`card ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
                <div className={`card-header d-flex justify-content-between align-items-center ${theme === 'dark' ? 'bg-secondary text-light' : ''}`}>
                  <h5 className="mb-0">🎮 Major Admin Activities (Games & Slots)</h5>
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={loadAdminLogs}
                  >
                    🔄 Refresh
                  </button>
                </div>
                <div className={`card-body ${theme === 'dark' ? 'bg-dark text-light' : ''}`}> 
                  {adminLogs.length === 0 ? (
                    <p className="text-muted text-center">No major admin activities recorded yet. This shows games added/deleted and slot management.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className={`table table-sm table-hover ${theme === 'dark' ? 'table-dark' : ''}`}> 
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Target</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminLogs.map((log, index) => (
                            <tr key={log.id || index}>
                              <td className="text-nowrap">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </td>
                              <td className="text-truncate" style={{maxWidth: '120px'}} title={log.admin}>
                                {log.admin || 'Unknown'}
                              </td>
                              <td>
                                <span className="badge bg-info">{log.action}</span>
                              </td>
                              <td>
                                <span className="badge bg-secondary">{log.targetType}</span>
                                <small className="text-muted ms-1">({log.targetId})</small>
                              </td>
                              <td className="text-truncate" style={{maxWidth: '200px'}}>
                                {log.details ? JSON.stringify(log.details) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Booking Status History Modal */}
      {showStatusHistory && (
        <BookingStatusHistory
          statusHistory={selectedBookingHistory}
          onClose={() => {
            setShowStatusHistory(false);
            setSelectedBookingHistory([]);
          }}
        />
      )}
    </div>
  );
}