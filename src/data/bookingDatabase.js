// Booking Database Management System
// This simulates a real database with localStorage for persistence

// Booking Schema
const BOOKING_SCHEMA = {
  id: 'string',
  user: 'string', // mobile number
  game: 'string',
  date: 'string',
  time: 'string',
  status: 'string', // 'Confirmed', 'Pending', 'Cancelled'
  amount: 'number',
  paymentStatus: 'string', // 'Paid', 'Pending', 'Failed'
  createdAt: 'string',
  updatedAt: 'string',
  notes: 'string',
  adminNotes: 'string'
};

// Initialize booking database
const initializeBookingDatabase = () => {
  if (!localStorage.getItem('bookings')) {
    const defaultBookings = [];
    localStorage.setItem('bookings', JSON.stringify(defaultBookings));
  }
};

// Booking Management Functions
export const bookingDB = {
  // Initialize database
  init: () => {
    initializeBookingDatabase();
  },

  // Get all bookings
  getAllBookings: () => {
    return JSON.parse(localStorage.getItem('bookings') || '[]');
  },

  // Get booking by ID
  getBookingById: (id) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.find(booking => booking.id === id);
  },

  // Get bookings by user
  getBookingsByUser: (mobile) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.filter(booking => booking.user === mobile);
  },

  // Get bookings by status
  getBookingsByStatus: (status) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.filter(booking => booking.status === status);
  },

  // Get bookings by date range
  getBookingsByDateRange: (startDate, endDate) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.filter(booking => 
      booking.date >= startDate && booking.date <= endDate
    );
  },

  // Get bookings by game
  getBookingsByGame: (game) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.filter(booking => booking.game === game);
  },

  // Create new booking
  createBooking: (bookingData) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const newBooking = {
      id: `booking_${Date.now()}`,
      user: bookingData.user,
      game: bookingData.game,
      date: bookingData.date,
      time: bookingData.time,
      status: 'Pending',
      amount: bookingData.amount || 0,
      paymentStatus: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: bookingData.notes || '',
      adminNotes: bookingData.adminNotes || '',
      ...bookingData
    };
    
    bookings.push(newBooking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    return newBooking;
  },

  // Update booking
  updateBooking: (id, updates) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const bookingIndex = bookings.findIndex(booking => booking.id === id);
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex] = { 
        ...bookings[bookingIndex], 
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('bookings', JSON.stringify(bookings));
      return bookings[bookingIndex];
    }
    return null;
  },

  // Update booking status
  updateBookingStatus: (id, status, adminNotes = '') => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const bookingIndex = bookings.findIndex(booking => booking.id === id);
    
    if (bookingIndex !== -1) {
      bookings[bookingIndex] = { 
        ...bookings[bookingIndex], 
        status,
        adminNotes: adminNotes || bookings[bookingIndex].adminNotes,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('bookings', JSON.stringify(bookings));
      return bookings[bookingIndex];
    }
    return null;
  },

  // Delete booking
  deleteBooking: (id) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const filteredBookings = bookings.filter(booking => booking.id !== id);
    localStorage.setItem('bookings', JSON.stringify(filteredBookings));
  },

  // Get booking analytics
  getBookingAnalytics: () => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    
    const analytics = {
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'Confirmed').length,
      pendingBookings: bookings.filter(b => b.status === 'Pending').length,
      cancelledBookings: bookings.filter(b => b.status === 'Cancelled').length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.amount || 0), 0),
      averageBookingValue: bookings.length > 0 ? 
        bookings.reduce((sum, b) => sum + (b.amount || 0), 0) / bookings.length : 0,
      popularGames: {},
      dailyBookings: {},
      monthlyBookings: {}
    };

    // Calculate popular games
    bookings.forEach(booking => {
      analytics.popularGames[booking.game] = (analytics.popularGames[booking.game] || 0) + 1;
    });

    // Calculate daily bookings
    bookings.forEach(booking => {
      analytics.dailyBookings[booking.date] = (analytics.dailyBookings[booking.date] || 0) + 1;
    });

    // Calculate monthly bookings
    bookings.forEach(booking => {
      const month = booking.date.substring(0, 7); // YYYY-MM
      analytics.monthlyBookings[month] = (analytics.monthlyBookings[month] || 0) + 1;
    });

    return analytics;
  },

  // Get user booking analytics
  getUserBookingAnalytics: (mobile) => {
    const userBookings = bookingDB.getBookingsByUser(mobile);
    
    const analytics = {
      totalBookings: userBookings.length,
      confirmedBookings: userBookings.filter(b => b.status === 'Confirmed').length,
      pendingBookings: userBookings.filter(b => b.status === 'Pending').length,
      cancelledBookings: userBookings.filter(b => b.status === 'Cancelled').length,
      totalSpent: userBookings.reduce((sum, b) => sum + (b.amount || 0), 0),
      favoriteGames: {},
      bookingTrends: {}
    };

    // Calculate favorite games
    userBookings.forEach(booking => {
      analytics.favoriteGames[booking.game] = (analytics.favoriteGames[booking.game] || 0) + 1;
    });

    // Calculate booking trends
    userBookings.forEach(booking => {
      analytics.bookingTrends[booking.date] = (analytics.bookingTrends[booking.date] || 0) + 1;
    });

    return analytics;
  },

  // Search bookings
  searchBookings: (query) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.filter(booking => 
      booking.user.includes(query) ||
      booking.game.toLowerCase().includes(query.toLowerCase()) ||
      booking.date.includes(query) ||
      booking.status.toLowerCase().includes(query.toLowerCase())
    );
  },

  // Get upcoming bookings
  getUpcomingBookings: () => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => 
      booking.date >= today && booking.status !== 'Cancelled'
    );
  },

  // Get past bookings
  getPastBookings: () => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => booking.date < today);
  },

  // Get today's bookings
  getTodayBookings: () => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === today);
  },

  // Check slot availability
  checkSlotAvailability: (game, date, time) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const conflictingBookings = bookings.filter(booking => 
      booking.game === game && 
      booking.date === date && 
      booking.time === time &&
      booking.status !== 'Cancelled'
    );
    return conflictingBookings.length === 0;
  },

  // Get available slots for a game and date
  getAvailableSlots: (game, date, allSlots) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const bookedSlots = bookings.filter(booking => 
      booking.game === game && 
      booking.date === date &&
      booking.status !== 'Cancelled'
    ).map(booking => booking.time);
    
    return allSlots.filter(slot => !bookedSlots.includes(slot));
  }
};

// Initialize database when module is imported
bookingDB.init();

export default bookingDB; 