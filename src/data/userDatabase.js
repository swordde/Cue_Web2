// User Database Management System
// This simulates a real database with localStorage for persistence

// User Schema
const USER_SCHEMA = {
  id: 'string',
  mobile: 'string',
  name: 'string',
  email: 'string',
  membershipType: 'string', // 'basic', 'premium', 'vip'
  joinDate: 'string',
  lastLogin: 'string',
  totalBookings: 'number',
  totalSpent: 'number',
  clubCoins: 'number',
  streak: 'number',
  isActive: 'boolean',
  isAdmin: 'boolean',
  preferences: 'object',
  profile: 'object'
};

// Initialize database
const initializeDatabase = () => {
  if (!localStorage.getItem('users')) {
    const defaultUsers = [
      {
        id: 'admin001',
        mobile: '0000000000',
        name: 'Admin User',
        email: 'admin@club.com',
        membershipType: 'admin',
        joinDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        totalBookings: 0,
        totalSpent: 0,
        clubCoins: 0,
        streak: 0,
        isActive: true,
        isAdmin: true,
        preferences: {
          favoriteGames: [],
          notifications: true,
          emailUpdates: true
        },
        profile: {
          avatar: null,
          bio: 'Club Administrator',
          address: '',
          emergencyContact: ''
        }
      }
    ];
    localStorage.setItem('users', JSON.stringify(defaultUsers));
  }
};

// User Management Functions
export const userDB = {
  // Initialize database
  init: () => {
    initializeDatabase();
  },

  // Get all users
  getAllUsers: () => {
    return JSON.parse(localStorage.getItem('users') || '[]');
  },

  // Get user by mobile number
  getUserByMobile: (mobile) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(user => user.mobile === mobile);
  },

  // Get user by ID
  getUserById: (id) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(user => user.id === id);
  },

  // Create new user
  createUser: (userData) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if this is an admin number
    const adminNumbers = ['0000000000'];
    const isAdmin = adminNumbers.includes(userData.mobile);
    
    const newUser = {
      id: `user_${Date.now()}`,
      mobile: userData.mobile,
      name: userData.name || (isAdmin ? 'Admin User' : 'Guest User'),
      email: userData.email || '',
      membershipType: isAdmin ? 'admin' : 'basic',
      joinDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      totalBookings: 0,
      totalSpent: 0,
      clubCoins: 0,
      streak: 0,
      isActive: true,
      isAdmin: isAdmin,
      preferences: {
        favoriteGames: [],
        notifications: true,
        emailUpdates: true
      },
      profile: {
        avatar: null,
        bio: isAdmin ? 'Club Administrator' : '',
        address: '',
        emergencyContact: ''
      },
      ...userData
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  },

  // Update user
  updateUser: (mobile, updates) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(user => user.mobile === mobile);
    
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...updates };
      localStorage.setItem('users', JSON.stringify(users));
      return users[userIndex];
    }
    return null;
  },

  // Delete user
  deleteUser: (mobile) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filteredUsers = users.filter(user => user.mobile !== mobile);
    localStorage.setItem('users', JSON.stringify(filteredUsers));
  },

  // Update user stats
  updateUserStats: (mobile, stats) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(user => user.mobile === mobile);
    
    if (userIndex !== -1) {
      users[userIndex] = { 
        ...users[userIndex], 
        ...stats,
        lastLogin: new Date().toISOString()
      };
      localStorage.setItem('users', JSON.stringify(users));
      return users[userIndex];
    }
    return null;
  },

  // Get user bookings
  getUserBookings: (mobile) => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    return bookings.filter(booking => booking.user === mobile);
  },

  // Update user preferences
  updateUserPreferences: (mobile, preferences) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(user => user.mobile === mobile);
    
    if (userIndex !== -1) {
      users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences };
      localStorage.setItem('users', JSON.stringify(users));
      return users[userIndex];
    }
    return null;
  },

  // Update user profile
  updateUserProfile: (mobile, profile) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(user => user.mobile === mobile);
    
    if (userIndex !== -1) {
      users[userIndex].profile = { ...users[userIndex].profile, ...profile };
      localStorage.setItem('users', JSON.stringify(users));
      return users[userIndex];
    }
    return null;
  },

  // Get user analytics
  getUserAnalytics: (mobile) => {
    const user = userDB.getUserByMobile(mobile);
    const bookings = userDB.getUserBookings(mobile);
    
    if (!user) return null;

    const analytics = {
      totalBookings: bookings.length,
      totalSpent: user.totalSpent,
      clubCoins: user.clubCoins,
      streak: user.streak,
      membershipType: user.membershipType,
      joinDate: user.joinDate,
      favoriteGames: user.preferences.favoriteGames,
      bookingHistory: bookings.map(b => ({
        game: b.game,
        date: b.date,
        time: b.time,
        status: b.status
      }))
    };

    return analytics;
  },

  // Search users
  searchUsers: (query) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.mobile.includes(query) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );
  },

  // Get active users
  getActiveUsers: () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.filter(user => user.isActive);
  },

  // Get users by membership type
  getUsersByMembership: (membershipType) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.filter(user => user.membershipType === membershipType);
  },

  // Ensure admin user exists
  ensureAdminUser: () => {
    const adminUser = userDB.getUserByMobile('0000000000');
    if (!adminUser) {
      userDB.createUser({ 
        mobile: '0000000000',
        name: 'Admin User',
        email: 'admin@club.com'
      });
    }
  }
};

// Initialize database when module is imported
userDB.init();

export default userDB; 