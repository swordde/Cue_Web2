// Admin Settings Database
// Manages dynamic configurations for the booking system

// Initialize admin settings
const initializeAdminSettings = () => {
  if (!localStorage.getItem('adminSettings')) {
    const defaultSettings = {
      games: [
        { 
          id: "pool", 
          name: "Pool", 
          image: "https://tse3.mm.bing.net/th/id/OIP.HKdA8wBwsa2EFzU_BejpfwHaFj?pid=Api&P=0&h=180",
          category: "Indoor",
          price: 50,
          description: "Professional pool table",
          isActive: true,
          maxDuration: 60,
          rules: "Standard pool rules apply"
        },
        { 
          id: "tt", 
          name: "Table Tennis", 
          image: "https://www.daysoftheyear.com/wp-content/uploads/world-table-tennis-day1.jpg",
          category: "Indoor",
          price: 30,
          description: "Table tennis facility",
          isActive: true,
          maxDuration: 45,
          rules: "Best of 3 games"
        },
        { 
          id: "foosball", 
          name: "Foosball", 
          image: "https://example.com/foosball.jpg",
          category: "Indoor",
          price: 25,
          description: "Foosball table",
          isActive: true,
          maxDuration: 30,
          rules: "First to 5 goals"
        }
      ],
      timeSlots: [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
        "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
      ],
      slotConfigurations: {
        "2025-06-28": {
          pool: ["10:00", "10:30", "11:00", "11:30"],
          tt: ["10:00", "10:30"],
          foosball: ["10:00", "10:30", "11:00"]
        },
        "2025-06-29": {
          pool: ["12:00", "12:30", "13:00"],
          tt: ["12:00", "12:30"],
          foosball: ["12:00", "12:30", "13:00"]
        },
        "2025-06-30": {
          pool: ["14:00", "14:30"],
          tt: ["14:00"],
          foosball: ["14:00", "14:30"]
        }
      },
      membershipTiers: {
        basic: { name: "Basic", discount: 0, price: 0 },
        premium: { name: "Premium", discount: 10, price: 500 },
        vip: { name: "VIP", discount: 20, price: 1000 }
      },
      businessHours: {
        monday: { open: "09:00", close: "22:00", isOpen: true },
        tuesday: { open: "09:00", close: "22:00", isOpen: true },
        wednesday: { open: "09:00", close: "22:00", isOpen: true },
        thursday: { open: "09:00", close: "22:00", isOpen: true },
        friday: { open: "09:00", close: "23:00", isOpen: true },
        saturday: { open: "10:00", close: "23:00", isOpen: true },
        sunday: { open: "10:00", close: "21:00", isOpen: true }
      },
      holidays: [],
      settings: {
        maxAdvanceBooking: 30, // days
        minAdvanceBooking: 1, // hours
        autoConfirmBookings: false,
        requireAdminApproval: true,
        allowCancellation: true,
        cancellationWindow: 24 // hours
      }
    };
    localStorage.setItem('adminSettings', JSON.stringify(defaultSettings));
  }
};

// Admin Settings Management
export const adminSettings = {
  // Initialize settings
  init: () => {
    initializeAdminSettings();
  },

  // Get all settings
  getAllSettings: () => {
    return JSON.parse(localStorage.getItem('adminSettings') || '{}');
  },

  // Update all settings
  updateAllSettings: (newSettings) => {
    const current = adminSettings.getAllSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem('adminSettings', JSON.stringify(updated));
    return updated;
  },

  // Game Management
  getGames: () => {
    const settings = adminSettings.getAllSettings();
    return settings.games || [];
  },

  addGame: (gameData) => {
    const settings = adminSettings.getAllSettings();
    const newGame = {
      id: gameData.id || `game_${Date.now()}`,
      name: gameData.name,
      image: gameData.image || '',
      category: gameData.category || 'Indoor',
      price: gameData.price || 0,
      description: gameData.description || '',
      isActive: true,
      maxDuration: gameData.maxDuration || 60,
      rules: gameData.rules || '',
      ...gameData
    };
    
    settings.games.push(newGame);
    adminSettings.updateAllSettings(settings);
    return newGame;
  },

  updateGame: (gameId, updates) => {
    const settings = adminSettings.getAllSettings();
    const gameIndex = settings.games.findIndex(g => g.id === gameId);
    
    if (gameIndex !== -1) {
      settings.games[gameIndex] = { ...settings.games[gameIndex], ...updates };
      adminSettings.updateAllSettings(settings);
      return settings.games[gameIndex];
    }
    return null;
  },

  deleteGame: (gameId) => {
    const settings = adminSettings.getAllSettings();
    settings.games = settings.games.filter(g => g.id !== gameId);
    adminSettings.updateAllSettings(settings);
  },

  // Slot Management
  getTimeSlots: () => {
    const settings = adminSettings.getAllSettings();
    return settings.timeSlots || [];
  },

  addTimeSlot: (time) => {
    const settings = adminSettings.getAllSettings();
    if (!settings.timeSlots.includes(time)) {
      settings.timeSlots.push(time);
      settings.timeSlots.sort();
      adminSettings.updateAllSettings(settings);
    }
    return settings.timeSlots;
  },

  removeTimeSlot: (time) => {
    const settings = adminSettings.getAllSettings();
    settings.timeSlots = settings.timeSlots.filter(t => t !== time);
    adminSettings.updateAllSettings(settings);
    return settings.timeSlots;
  },

  // Slot Configuration Management
  getSlotConfigurations: () => {
    const settings = adminSettings.getAllSettings();
    return settings.slotConfigurations || {};
  },

  setSlotConfiguration: (date, gameId, slots) => {
    const settings = adminSettings.getAllSettings();
    if (!settings.slotConfigurations[date]) {
      settings.slotConfigurations[date] = {};
    }
    settings.slotConfigurations[date][gameId] = slots;
    adminSettings.updateAllSettings(settings);
    return settings.slotConfigurations;
  },

  getSlotsForDate: (date) => {
    const settings = adminSettings.getAllSettings();
    return settings.slotConfigurations[date] || {};
  },

  // Bulk slot operations
  setBulkSlots: (date, gameId, startTime, endTime, interval = 30) => {
    const slots = [];
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    
    while (start <= end) {
      slots.push(start.toTimeString().slice(0, 5));
      start.setMinutes(start.getMinutes() + interval);
    }
    
    adminSettings.setSlotConfiguration(date, gameId, slots);
    return slots;
  },

  // Business Hours Management
  getBusinessHours: () => {
    const settings = adminSettings.getAllSettings();
    return settings.businessHours || {};
  },

  updateBusinessHours: (day, hours) => {
    const settings = adminSettings.getAllSettings();
    settings.businessHours[day] = hours;
    adminSettings.updateAllSettings(settings);
    return settings.businessHours;
  },

  // Holiday Management
  getHolidays: () => {
    const settings = adminSettings.getAllSettings();
    return settings.holidays || [];
  },

  addHoliday: (holiday) => {
    const settings = adminSettings.getAllSettings();
    settings.holidays.push(holiday);
    adminSettings.updateAllSettings(settings);
    return settings.holidays;
  },

  removeHoliday: (holidayId) => {
    const settings = adminSettings.getAllSettings();
    settings.holidays = settings.holidays.filter(h => h.id !== holidayId);
    adminSettings.updateAllSettings(settings);
    return settings.holidays;
  },

  // Settings Management
  getSettings: () => {
    const settings = adminSettings.getAllSettings();
    return settings.settings || {};
  },

  updateSettings: (newSettings) => {
    const settings = adminSettings.getAllSettings();
    settings.settings = { ...settings.settings, ...newSettings };
    adminSettings.updateAllSettings(settings);
    return settings.settings;
  },

  // Membership Management
  getMembershipTiers: () => {
    const settings = adminSettings.getAllSettings();
    return settings.membershipTiers || {};
  },

  updateMembershipTier: (tier, data) => {
    const settings = adminSettings.getAllSettings();
    settings.membershipTiers[tier] = data;
    adminSettings.updateAllSettings(settings);
    return settings.membershipTiers;
  }
};

// Initialize settings when module is imported
adminSettings.init();

export default adminSettings; 