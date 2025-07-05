// Database Utilities
// Helper functions to integrate user and booking databases with the app

import userDB from './userDatabase.js';
import bookingDB from './bookingDatabase.js';

// Authentication utilities
export const authUtils = {
  // Login user
  loginUser: (mobile) => {
    let user = userDB.getUserByMobile(mobile);
    
    if (!user) {
      // Create new user if doesn't exist
      user = userDB.createUser({ mobile });
    } else {
      // Update last login
      userDB.updateUserStats(mobile, { lastLogin: new Date().toISOString() });
    }
    
    // Set login state
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('mobile', mobile);
    localStorage.setItem('isAdmin', user.isAdmin ? 'true' : 'false');
    
    return user;
  },

  // Logout user
  logoutUser: () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('mobile');
    localStorage.removeItem('isAdmin');
  },

  // Get current user
  getCurrentUser: () => {
    const mobile = localStorage.getItem('mobile');
    if (!mobile) return null;
    return userDB.getUserByMobile(mobile);
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return localStorage.getItem('isLoggedIn') === 'true';
  },

  // Check if user is admin
  isAdmin: () => {
    return localStorage.getItem('isAdmin') === 'true';
  },

  // Refresh current user data
  refreshCurrentUser: () => {
    const mobile = localStorage.getItem('mobile');
    if (!mobile) return null;
    
    const user = userDB.getUserByMobile(mobile);
    if (user) {
      // Update localStorage admin status based on current user
      localStorage.setItem('isAdmin', user.isAdmin ? 'true' : 'false');
    }
    return user;
  },

  // Switch user (for testing purposes)
  switchUser: (mobile) => {
    const user = userDB.getUserByMobile(mobile);
    if (user) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('mobile', mobile);
      localStorage.setItem('isAdmin', user.isAdmin ? 'true' : 'false');
      return user;
    }
    return null;
  }
};

// Booking utilities
export const bookingUtils = {
  // Create booking with user integration
  createBooking: (bookingData) => {
    const mobile = localStorage.getItem('mobile');
    if (!mobile) throw new Error('User not logged in');

    // Always use the current logged-in user's mobile number
    const booking = bookingDB.createBooking({
      ...bookingData,
      user: mobile // Force use current user's mobile
    });

    // Update user stats for the current user
    const user = userDB.getUserByMobile(mobile);
    if (user) {
      userDB.updateUserStats(mobile, {
        totalBookings: user.totalBookings + 1,
        clubCoins: user.clubCoins + 10
      });
    }

    return booking;
  },

  // Get user's bookings
  getUserBookings: () => {
    const mobile = localStorage.getItem('mobile');
    if (!mobile) return [];
    return bookingDB.getBookingsByUser(mobile);
  },

  // Update booking status (admin only)
  updateBookingStatus: (bookingId, status, notes = '') => {
    const mobile = localStorage.getItem('mobile');
    if (!mobile) throw new Error('User not logged in');

    // Get the booking to check ownership
    const booking = bookingDB.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Allow users to cancel their own bookings, or admins to update any booking
    if (booking.user === mobile || authUtils.isAdmin()) {
      return bookingDB.updateBookingStatus(bookingId, status, notes);
    } else {
      throw new Error('Not authorized to update this booking');
    }
  }
};

// Analytics utilities
export const analyticsUtils = {
  // Get overall analytics
  getOverallAnalytics: () => {
    return {
      users: userDB.getAllUsers().length,
      activeUsers: userDB.getActiveUsers().length,
      bookings: bookingDB.getBookingAnalytics(),
      membershipBreakdown: {
        basic: userDB.getUsersByMembership('basic').length,
        premium: userDB.getUsersByMembership('premium').length,
        vip: userDB.getUsersByMembership('vip').length
      }
    };
  },

  // Get user analytics
  getUserAnalytics: () => {
    const mobile = localStorage.getItem('mobile');
    if (!mobile) return null;
    
    return {
      user: userDB.getUserAnalytics(mobile),
      bookings: bookingDB.getUserBookingAnalytics(mobile)
    };
  },

  // Get admin dashboard data
  getAdminDashboardData: () => {
    const users = userDB.getAllUsers();
    const bookings = bookingDB.getAllBookings();
    const analytics = bookingDB.getBookingAnalytics();

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      totalBookings: bookings.length,
      todayBookings: bookingDB.getTodayBookings().length,
      upcomingBookings: bookingDB.getUpcomingBookings().length,
      revenue: analytics.totalRevenue,
      popularGames: analytics.popularGames,
      recentBookings: bookings.slice(-5).reverse(), // Last 5 bookings
      recentUsers: users.slice(-5).reverse() // Last 5 users
    };
  }
};

// Data migration utilities
export const migrationUtils = {
  // Migrate existing localStorage data to new database structure
  migrateExistingData: () => {
    // Migrate existing bookings
    const existingBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    if (existingBookings.length > 0) {
      existingBookings.forEach(booking => {
        if (!booking.id) {
          // Add missing fields to existing bookings
          const updatedBooking = {
            ...booking,
            id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: booking.amount || 0,
            paymentStatus: 'Paid',
            createdAt: booking.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: booking.notes || '',
            adminNotes: booking.adminNotes || ''
          };
          
          // Remove old booking and add new one
          const allBookings = bookingDB.getAllBookings();
          const filteredBookings = allBookings.filter(b => 
            !(b.user === booking.user && b.game === booking.game && b.date === booking.date && b.time === booking.time)
          );
          filteredBookings.push(updatedBooking);
          localStorage.setItem('bookings', JSON.stringify(filteredBookings));
        }
      });
    }

    // Ensure admin user exists
    userDB.ensureAdminUser();
  }
};

// Initialize and migrate data
migrationUtils.migrateExistingData();

export default {
  authUtils,
  bookingUtils,
  analyticsUtils,
  migrationUtils
}; 