// ...existing code...
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier 
} from 'firebase/auth';
import { db, auth } from './config';

// Collections
const USERS_COLLECTION = 'users';
const BOOKINGS_COLLECTION = 'bookings';
const GAMES_COLLECTION = 'games';
const SLOTS_COLLECTION = 'slots';
const ADMIN_LOGS_COLLECTION = 'adminLogs';
const OFFLINE_BOOKINGS_COLLECTION = 'offlineBookings';

// Helper function to check authentication - now optional
const checkAuth = (required = true) => {
  if (required && !auth.currentUser) {
    throw new Error('User not authenticated');
  }
  return !!auth.currentUser;
};

// User Services
export const userService = {
  // Create user
  async createUser(userData) {
    try {
      checkAuth();
      const userRef = await addDoc(collection(db, USERS_COLLECTION), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: userRef.id, ...userData };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Get user by mobile
  async getUserByMobile(mobile) {
    try {
      // Don't require auth for this function as it's used during signup
      const userQuery = query(
        collection(db, USERS_COLLECTION),
        where('mobile', '==', mobile)
      );
      const snapshot = await getDocs(userQuery);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by mobile:', error);
      return null;
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      // Don't require auth for this function as it's used during login
      const userQuery = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', email)
      );
      const snapshot = await getDocs(userQuery);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  // Update user stats
  async updateUserStats(mobile, updates) {
    try {
      checkAuth();
      const userQuery = query(
        collection(db, USERS_COLLECTION),
        where('mobile', '==', mobile)
      );
      const snapshot = await getDocs(userQuery);
      if (!snapshot.empty) {
        const userRef = doc(db, USERS_COLLECTION, snapshot.docs[0].id);
        await updateDoc(userRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  },

  // Get all users
  async getAllUsers() {
    try {
      checkAuth();
      const snapshot = await getDocs(collection(db, USERS_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  },

  // Real-time users listener
  onUsersChange(callback) {
    try {
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping real-time listener');
        callback([]);
        return () => {};
      }
      
      return onSnapshot(collection(db, USERS_COLLECTION), 
        (snapshot) => {
          const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(users);
        },
        (error) => {
          console.error('Error listening to users:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up users listener:', error);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }
};

// Booking Services
export const bookingService = {
  // Permanently delete a booking
  async deleteBooking(bookingId) {
    try {
      checkAuth();
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      await deleteDoc(bookingRef);
      await logAdminAction({
        action: 'delete booking',
        targetType: 'booking',
        targetId: bookingId
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },
  // Create booking
  async createBooking(bookingData) {
    try {
      checkAuth();
      
      // Sanitize booking data to remove any non-serializable objects
      const sanitizedData = {
        game: bookingData.game,
        date: bookingData.date,
        time: bookingData.time,
        user: bookingData.user,
        status: bookingData.status,
        notes: bookingData.notes || '',
        price: bookingData.price || 0,
        statusHistory: [{
          status: bookingData.status,
          timestamp: new Date().toISOString(),
          notes: bookingData.notes || '',
          changedBy: auth.currentUser?.phoneNumber || auth.currentUser?.email || 'system'
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const bookingRef = await addDoc(collection(db, BOOKINGS_COLLECTION), sanitizedData);
      await logAdminAction({
        action: 'create booking',
        targetType: 'booking',
        targetId: bookingRef.id,
        details: sanitizedData
      });
      return { id: bookingRef.id, ...sanitizedData };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  // Get user's bookings
  async getUserBookings(userMobile) {
    try {
      checkAuth();
      const bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('user', '==', userMobile)
      );
      const snapshot = await getDocs(bookingQuery);
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory instead of using orderBy to avoid index requirement
      return bookings.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order
      });
    } catch (error) {
      console.error('Error getting user bookings:', error);
      return [];
    }
  },

  // Get all bookings
  async getAllBookings() {
    try {
      checkAuth();
      const snapshot = await getDocs(collection(db, BOOKINGS_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all bookings:', error);
      return [];
    }
  },

  // Get booking by ID
  async getBookingById(bookingId) {
    try {
      checkAuth();
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (bookingDoc.exists()) {
        return { id: bookingDoc.id, ...bookingDoc.data() };
      } else {
        console.error('Booking not found');
        return null;
      }
    } catch (error) {
      console.error('Error getting booking by ID:', error);
      return null;
    }
  },

  // Update booking status
  async updateBookingStatus(bookingId, status, notes = '') {
    try {
      checkAuth();
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      
      // Get current booking to add to history
      const bookingDoc = await getDoc(bookingRef);
      const currentBooking = bookingDoc.data();
      
      // Create new status history entry
      const newHistoryEntry = {
        status,
        timestamp: new Date().toISOString(),
        notes,
        changedBy: auth.currentUser?.phoneNumber || auth.currentUser?.email || 'system'
      };
      
      // Add to existing history or create new array
      const statusHistory = currentBooking?.statusHistory || [];
      statusHistory.push(newHistoryEntry);
      
      await updateDoc(bookingRef, {
        status,
        notes,
        statusHistory,
        updatedAt: serverTimestamp()
      });
      await logAdminAction({
        action: 'update booking status',
        targetType: 'booking',
        targetId: bookingId,
        details: { status, notes }
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },

  // Update booking (all fields)
  async updateBooking(bookingId, updates) {
    try {
      checkAuth();
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      await updateDoc(bookingRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      await logAdminAction({
        action: 'update booking',
        targetType: 'booking',
        targetId: bookingId,
        details: updates
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  },

  // Get bookings by date and game
  async getBookingsByDateAndGame(date, game) {
    try {
      checkAuth();
      const bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('date', '==', date),
        where('game', '==', game)
      );
      const snapshot = await getDocs(bookingQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting bookings by date and game:', error);
      return [];
    }
  }
};

// Game Services
export const gameService = {
  // Add game
  async addGame(gameData) {
    try {
      checkAuth();
      const gameRef = await addDoc(collection(db, GAMES_COLLECTION), {
        ...gameData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await logAdminAction({
        action: 'create game',
        targetType: 'game',
        targetId: gameRef.id,
        details: gameData
      });
      return { id: gameRef.id, ...gameData };
    } catch (error) {
      console.error('Error adding game:', error);
      throw error;
    }
  },

  // Get all games
  async getAllGames() {
    try {
      checkAuth();
      const snapshot = await getDocs(collection(db, GAMES_COLLECTION));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all games:', error);
      return [];
    }
  },

  // Update game
  async updateGame(gameId, updates) {
    try {
      checkAuth();
      const gameRef = doc(db, GAMES_COLLECTION, gameId);
      await updateDoc(gameRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      await logAdminAction({
        action: 'update game',
        targetType: 'game',
        targetId: gameId,
        details: updates
      });
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  },

  // Delete game
  async deleteGame(gameId) {
    try {
      checkAuth();
      const gameRef = doc(db, GAMES_COLLECTION, gameId);
      await deleteDoc(gameRef);
      await logAdminAction({
        action: 'delete game',
        targetType: 'game',
        targetId: gameId
      });
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  },

  // Real-time games listener
  onGamesChange(callback) {
    try {
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping real-time listener');
        callback([]);
        return () => {};
      }
      
      return onSnapshot(collection(db, GAMES_COLLECTION), 
        (snapshot) => {
          const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(games);
        },
        (error) => {
          console.error('Error listening to games:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up games listener:', error);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }
};

// Slot Services
export const slotService = {
  // Add slots for a date
  async addSlotsForDate(date, gameId, slots) {
    try {
      checkAuth();
      const slotData = {
        date,
        gameId,
        slots,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const slotRef = await addDoc(collection(db, SLOTS_COLLECTION), slotData);
      await logAdminAction({
        action: 'create slot',
        targetType: 'slot',
        targetId: slotRef.id,
        details: slotData
      });
      return { id: slotRef.id, ...slotData };
    } catch (error) {
      console.error('Error adding slots:', error);
      throw error;
    }
  },

  // Get slots for a date and game
  async getSlotsForDate(date, gameId) {
    try {
      checkAuth();
      const slotQuery = query(
        collection(db, SLOTS_COLLECTION),
        where('date', '==', date),
        where('gameId', '==', gameId)
      );
      const snapshot = await getDocs(slotQuery);
      if (!snapshot.empty) {
        return snapshot.docs[0].data().slots || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting slots:', error);
      return [];
    }
  },

  // Update slots for a date
  async updateSlotsForDate(date, gameId, slots) {
    try {
      checkAuth();
      const slotQuery = query(
        collection(db, SLOTS_COLLECTION),
        where('date', '==', date),
        where('gameId', '==', gameId)
      );
      const snapshot = await getDocs(slotQuery);
      if (!snapshot.empty) {
        const slotRef = doc(db, SLOTS_COLLECTION, snapshot.docs[0].id);
        await updateDoc(slotRef, {
          slots,
          updatedAt: serverTimestamp()
        });
        await logAdminAction({
          action: 'update slot',
          targetType: 'slot',
          targetId: slotRef.id,
          details: { slots }
        });
      } else {
        // Create new slot entry and get the new slot's info
        const newSlot = await this.addSlotsForDate(date, gameId, slots);
        await logAdminAction({
          action: 'create slot',
          targetType: 'slot',
          targetId: newSlot.id,
          details: { date, gameId, slots }
        });
      }
    } catch (error) {
      console.error('Error updating slots:', error);
      throw error;
    }
  },

  // Real-time slots listener
  onSlotsChange(date, gameId, callback) {
    try {
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping real-time listener');
        callback([]);
        return () => {};
      }
      
      if (!date || !gameId) {
        callback([]);
        return () => {};
      }
      
      const slotQuery = query(
        collection(db, SLOTS_COLLECTION),
        where('date', '==', date),
        where('gameId', '==', gameId)
      );
      
      return onSnapshot(slotQuery, 
        (snapshot) => {
          if (!snapshot.empty) {
            const slots = snapshot.docs[0].data().slots || [];
            callback(slots);
          } else {
            callback([]);
          }
        },
        (error) => {
          console.error('Error listening to slots:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up slots listener:', error);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }
};

// Real-time listeners
export const realtimeService = {
  // Listen to user bookings
  onUserBookingsChange(userMobile, callback) {
    try {
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping real-time listener');
        callback([]);
        return () => {};
      }
      
      const bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('user', '==', userMobile)
      );
      return onSnapshot(bookingQuery, 
        (snapshot) => {
          const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort in memory to avoid index requirement
          const sortedBookings = bookings.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return dateB - dateA; // Descending order
          });
          callback(sortedBookings);
        },
        (error) => {
          console.error('Error listening to user bookings:', error);
          // Return empty array on error
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up user bookings listener:', error);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Listen to all bookings (admin)
  onAllBookingsChange(callback) {
    try {
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping real-time listener');
        callback([]);
        return () => {};
      }
      
      const bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(bookingQuery, 
        (snapshot) => {
          const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(bookings);
        },
        (error) => {
          console.error('Error listening to all bookings:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up all bookings listener:', error);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Listen to bookings for a specific date and game
  onBookingsByDateAndGameChange(date, gameId, callback) {
    try {
      if (!auth.currentUser) {
        console.warn('User not authenticated, skipping real-time listener');
        callback([]);
        return () => {};
      }
      
      if (!date || !gameId) {
        console.log('Missing date or gameId:', { date, gameId });
        callback([]);
        return () => {};
      }
      
      console.log('Setting up bookings listener for:', { date, gameId });
      
      // Query for bookings by date first, then filter by game in code
      // This handles both old bookings (with game object) and new bookings (with gameId)
      const bookingQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('date', '==', date)
      );
      
      return onSnapshot(bookingQuery, 
        (snapshot) => {
          const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('Raw bookings for date', date, ':', allBookings);
          
          // Filter bookings for this specific game
          const gameBookings = allBookings.filter(booking => {
            // Handle new format with gameId
            if (booking.gameId === gameId) return true;
            // Handle old format with game object
            if (booking.game?.id === gameId) return true;
            // Handle even older format where game might be just the ID
            if (booking.game === gameId) return true;
            return false;
          });
          
          console.log('Filtered bookings for game', gameId, ':', gameBookings);
          callback(gameBookings);
        },
        (error) => {
          console.error('Error listening to bookings by date and game:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up bookings by date and game listener:', error);
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
  }
}; 

// Offline Bookings Services
export const offlineBookingService = {
  // Add offline booking
  async addOfflineBooking(bookingData) {
    try {
      checkAuth();
      const bookingRef = await addDoc(collection(db, OFFLINE_BOOKINGS_COLLECTION), {
        ...bookingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth.currentUser?.phoneNumber || auth.currentUser?.email || 'unknown',
        type: 'offline'
      });
      
      // Log admin action
      await logAdminAction({
        action: 'add offline booking',
        targetType: 'offlineBooking',
        targetId: bookingRef.id,
        details: {
          customerName: bookingData.customerName,
          board: bookingData.board,
          date: bookingData.date,
          amount: bookingData.amount
        }
      });
      
      return { id: bookingRef.id, ...bookingData };
    } catch (error) {
      console.error('Error adding offline booking:', error);
      throw error;
    }
  },

  // Get all offline bookings
  async getAllOfflineBookings() {
    try {
      checkAuth();
      const bookingsQuery = query(
        collection(db, OFFLINE_BOOKINGS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(bookingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));
    } catch (error) {
      console.error('Error getting offline bookings:', error);
      throw error;
    }
  },

  // Get offline bookings by date range
  async getOfflineBookingsByDateRange(startDate, endDate) {
    try {
      checkAuth();
      const bookingsQuery = query(
        collection(db, OFFLINE_BOOKINGS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(bookingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));
    } catch (error) {
      console.error('Error getting offline bookings by date range:', error);
      throw error;
    }
  },

  // Update offline booking
  async updateOfflineBooking(bookingId, updates) {
    try {
      checkAuth();
      const bookingRef = doc(db, OFFLINE_BOOKINGS_COLLECTION, bookingId);
      await updateDoc(bookingRef, {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.phoneNumber || auth.currentUser?.email || 'unknown'
      });

      // Log admin action
      await logAdminAction({
        action: 'update offline booking',
        targetType: 'offlineBooking',
        targetId: bookingId,
        details: updates
      });

      return true;
    } catch (error) {
      console.error('Error updating offline booking:', error);
      throw error;
    }
  },

    // Delete offline booking
  async deleteOfflineBooking(bookingId) {
    try {
      console.log('🔥 Firebase: deleteOfflineBooking called with ID:', bookingId);
      checkAuth();
      
      const bookingRef = doc(db, OFFLINE_BOOKINGS_COLLECTION, bookingId);
      console.log('🔥 Firebase: Created document reference');
      
      // Get booking data before deletion for logging
      const bookingDoc = await getDoc(bookingRef);
      console.log('🔥 Firebase: Document exists:', bookingDoc.exists());
      
      if (!bookingDoc.exists()) {
        console.warn('🔥 Firebase: Document does not exist, returning success');
        return true; // Already deleted, consider successful
      }
      
      const bookingData = bookingDoc.data();
      console.log('🔥 Firebase: Got booking data for customer:', bookingData?.customerName);
      
      console.log('🔥 Firebase: Deleting document...');
      await deleteDoc(bookingRef);
      console.log('🔥 Firebase: Document deleted successfully');

      // Verify deletion by checking if document still exists
      const verifyDoc = await getDoc(bookingRef);
      if (verifyDoc.exists()) {
        console.error('🔥 Firebase: ERROR - Document still exists after deletion!');
        throw new Error('Failed to delete document from Firebase');
      } else {
        console.log('🔥 Firebase: Deletion verified - document no longer exists');
      }

      // Log admin action
      await logAdminAction({
        action: 'delete offline booking',
        targetType: 'offlineBooking',
        targetId: bookingId,
        details: {
          customerName: bookingData?.customerName || 'Unknown',
          board: bookingData?.board || 'Unknown',
          date: bookingData?.date || 'Unknown',
          amount: bookingData?.amount || 0
        }
      });
      console.log('🔥 Firebase: Admin action logged');

      return true;
    } catch (error) {
      console.error('🔥 Firebase: Error deleting offline booking:', error);
      throw error;
    }
  },

  // Real-time listener for offline bookings
  onOfflineBookingsChange(callback) {
    try {
      console.log('🔥 Firebase: Setting up real-time listener...');
      if (!checkAuth(false)) {
        console.log('🔥 Firebase: No auth, returning empty');
        callback([]);
        return () => {};
      }

      const bookingsQuery = query(
        collection(db, OFFLINE_BOOKINGS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      console.log('🔥 Firebase: Creating onSnapshot listener...');
      return onSnapshot(bookingsQuery,
        (snapshot) => {
          console.log('🔥 Firebase: Snapshot received with', snapshot.docs.length, 'documents');
          const bookings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
          }));
          
          // Debug: Log mithun bookings specifically
          const mithunBookings = bookings.filter(b => b.customerName?.toLowerCase().includes('mithun'));
          if (mithunBookings.length > 0) {
            console.log('🔍 Firebase: Found', mithunBookings.length, 'mithun bookings in Firebase:');
            mithunBookings.forEach(b => {
              console.log(`  - ID: ${b.id}, Name: ${b.customerName}, Date: ${b.date}, Time: ${b.startTime}, Board: ${b.board}`);
            });
          }
          
          // Remove duplicates at Firebase level based on unique key
          const seenKeys = new Set();
          const uniqueBookings = bookings.filter(booking => {
            const uniqueKey = `${booking.customerName}-${booking.date}-${booking.startTime}-${booking.board}`;
            if (seenKeys.has(uniqueKey)) {
              console.warn('🔥 Firebase: Filtering out duplicate booking:', booking.id, 'Key:', uniqueKey);
              return false;
            }
            seenKeys.add(uniqueKey);
            return true;
          });
          
          if (uniqueBookings.length !== bookings.length) {
            console.warn(`🔥 Firebase: Filtered ${bookings.length - uniqueBookings.length} duplicates at source`);
          }
          
          console.log('🔥 Firebase: Calling callback with', uniqueBookings.length, 'unique bookings');
          callback(uniqueBookings);
        },
        (error) => {
          console.error('🔥 Firebase: Error listening to offline bookings:', error);
          callback([]);
        }
      );
    } catch (error) {
      console.error('🔥 Firebase: Error setting up offline bookings listener:', error);
      callback([]);
      return () => {};
    }
  },

  // Get unique customer names for suggestions
  async getCustomerSuggestions() {
    try {
      checkAuth();
      const bookingsQuery = query(collection(db, OFFLINE_BOOKINGS_COLLECTION));
      const snapshot = await getDocs(bookingsQuery);
      const customerNames = new Set();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.customerName && data.customerName.trim()) {
          customerNames.add(data.customerName.trim());
        }
      });
      
      return Array.from(customerNames).sort();
    } catch (error) {
      console.error('Error getting customer suggestions:', error);
      return [];
    }
  }
};

// Analytics Services
export const analyticsService = {
  // Get weekly booking analytics
  async getWeeklyBookingAnalytics(startDate, endDate) {
    try {
      checkAuth();
      
      // Get online bookings for the week
      const onlineBookingsQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const onlineSnapshot = await getDocs(onlineBookingsQuery);
      const onlineBookings = onlineSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'online',
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      // Get offline bookings for the week
      const offlineBookingsQuery = query(
        collection(db, OFFLINE_BOOKINGS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const offlineSnapshot = await getDocs(offlineBookingsQuery);
      const offlineBookings = offlineSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'offline',
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      // Get all games for reference
      const gamesSnapshot = await getDocs(collection(db, GAMES_COLLECTION));
      const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Generate analytics
      const analytics = this.processWeeklyAnalytics(onlineBookings, offlineBookings, games, startDate, endDate);
      
      return analytics;
    } catch (error) {
      console.error('Error getting weekly booking analytics:', error);
      throw error;
    }
  },

  // Process weekly analytics data
  processWeeklyAnalytics(onlineBookings, offlineBookings, games, startDate, endDate) {
    const allBookings = [...onlineBookings, ...offlineBookings];
    
    // Create date range array
    const dateRange = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Daily breakdown
    const dailyStats = dateRange.map(date => {
      const dayBookings = allBookings.filter(b => b.date === date);
      const onlineCount = dayBookings.filter(b => b.type === 'online').length;
      const offlineCount = dayBookings.filter(b => b.type === 'offline').length;
      const totalRevenue = dayBookings.reduce((sum, booking) => {
        if (booking.type === 'offline') {
          return sum + ((booking.amount || 0) - (booking.discount || 0));
        } else {
          return sum + (booking.price || 0);
        }
      }, 0);

      return {
        date,
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        onlineBookings: onlineCount,
        offlineBookings: offlineCount,
        totalBookings: onlineCount + offlineCount,
        revenue: totalRevenue,
        bookings: dayBookings
      };
    });

    // Game-wise statistics
    const gameStats = games.map(game => {
      const gameBookings = allBookings.filter(booking => {
        // Handle different game reference formats
        return booking.game === game.id || 
               booking.game === game.name || 
               booking.board === game.id ||
               booking.board === game.name ||
               (booking.game && typeof booking.game === 'object' && booking.game.id === game.id);
      });

      const onlineCount = gameBookings.filter(b => b.type === 'online').length;
      const offlineCount = gameBookings.filter(b => b.type === 'offline').length;
      const revenue = gameBookings.reduce((sum, booking) => {
        if (booking.type === 'offline') {
          return sum + ((booking.amount || 0) - (booking.discount || 0));
        } else {
          return sum + (booking.price || 0);
        }
      }, 0);

      return {
        gameId: game.id,
        gameName: game.name,
        category: game.category || 'Uncategorized',
        onlineBookings: onlineCount,
        offlineBookings: offlineCount,
        totalBookings: onlineCount + offlineCount,
        revenue,
        utilizationRate: Math.round((onlineCount + offlineCount) / dateRange.length * 100) / 100 // avg bookings per day
      };
    }).filter(stat => stat.totalBookings > 0); // Only include games with bookings

    // Weekly summary
    const totalOnlineBookings = onlineBookings.length;
    const totalOfflineBookings = offlineBookings.length;
    const totalBookings = totalOnlineBookings + totalOfflineBookings;
    const totalRevenue = allBookings.reduce((sum, booking) => {
      if (booking.type === 'offline') {
        return sum + ((booking.amount || 0) - (booking.discount || 0));
      } else {
        return sum + (booking.price || 0);
      }
    }, 0);

    // Status breakdown (for online bookings)
    const statusStats = {
      confirmed: onlineBookings.filter(b => b.status === 'Confirmed').length,
      pending: onlineBookings.filter(b => b.status === 'Pending').length,
      cancelled: onlineBookings.filter(b => b.status === 'Cancelled').length
    };

    // Settlement breakdown (for offline bookings)
    const settlementStats = {
      settled: offlineBookings.filter(b => b.settlement === 'SETTLED').length,
      partial: offlineBookings.filter(b => b.settlement === 'PARTIAL').length,
      pending: offlineBookings.filter(b => b.settlement === 'PENDING').length
    };

    // Peak days and times analysis
    const peakDay = dailyStats.reduce((peak, day) => 
      day.totalBookings > peak.totalBookings ? day : peak, dailyStats[0] || { totalBookings: 0 });

    // Customer analysis (from offline bookings)
    const customerFrequency = {};
    offlineBookings.forEach(booking => {
      if (booking.customerName) {
        customerFrequency[booking.customerName] = (customerFrequency[booking.customerName] || 0) + 1;
      }
    });
    
    const topCustomers = Object.entries(customerFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, bookings: count }));

    return {
      period: {
        startDate,
        endDate,
        days: dateRange.length
      },
      summary: {
        totalBookings,
        totalOnlineBookings,
        totalOfflineBookings,
        totalRevenue,
        averageRevenuePerDay: Math.round(totalRevenue / dateRange.length * 100) / 100,
        averageBookingsPerDay: Math.round(totalBookings / dateRange.length * 100) / 100
      },
      dailyStats,
      gameStats: gameStats.sort((a, b) => b.totalBookings - a.totalBookings),
      statusStats,
      settlementStats,
      peakDay,
      topCustomers,
      rawData: {
        onlineBookings,
        offlineBookings,
        allBookings
      }
    };
  },

  // Get date range for a specific week
  getWeekDateRange(weekOffset = 0) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1 + (weekOffset * 7));
    
    // Calculate end of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0],
      weekLabel: `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  },

  // Get analytics for a specific game
  async getGameAnalytics(gameId, startDate, endDate) {
    try {
      checkAuth();
      
      // Get online bookings for this game
      const onlineBookingsQuery = query(
        collection(db, BOOKINGS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const onlineSnapshot = await getDocs(onlineBookingsQuery);
      const allOnlineBookings = onlineSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'online',
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      // Filter for this specific game
      const onlineBookings = allOnlineBookings.filter(booking => {
        return booking.game === gameId || 
               booking.game === gameId || 
               (booking.game && typeof booking.game === 'object' && booking.game.id === gameId);
      });

      // Get offline bookings for this game
      const offlineBookingsQuery = query(
        collection(db, OFFLINE_BOOKINGS_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const offlineSnapshot = await getDocs(offlineBookingsQuery);
      const allOfflineBookings = offlineSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'offline',
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
      }));

      // Filter for this specific game
      const offlineBookings = allOfflineBookings.filter(booking => {
        return booking.board === gameId || booking.board === gameId;
      });

      // Get game details
      const gameDoc = await getDocs(query(
        collection(db, GAMES_COLLECTION),
        where('__name__', '==', gameId)
      ));
      const gameData = gameDoc.docs[0]?.data() || {};

      // Process the analytics
      const analytics = this.processSingleGameAnalytics(
        onlineBookings, 
        offlineBookings, 
        { id: gameId, ...gameData }, 
        startDate, 
        endDate
      );
      
      return analytics;
    } catch (error) {
      console.error('Error getting game analytics:', error);
      throw error;
    }
  },

  // Process analytics for a single game
  processSingleGameAnalytics(onlineBookings, offlineBookings, game, startDate, endDate) {
    const allBookings = [...onlineBookings, ...offlineBookings];
    
    // Create date range array
    const dateRange = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate <= endDateObj) {
      dateRange.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Daily breakdown for this game
    const dailyStats = dateRange.map(date => {
      const dayBookings = allBookings.filter(b => b.date === date);
      const onlineCount = dayBookings.filter(b => b.type === 'online').length;
      const offlineCount = dayBookings.filter(b => b.type === 'offline').length;
      const totalRevenue = dayBookings.reduce((sum, booking) => {
        if (booking.type === 'offline') {
          return sum + ((booking.amount || 0) - (booking.discount || 0));
        } else {
          return sum + (booking.price || game.price || 0);
        }
      }, 0);

      // Time slot analysis
      const timeSlots = {};
      dayBookings.forEach(booking => {
        const time = booking.time || booking.startTime || 'Unknown';
        timeSlots[time] = (timeSlots[time] || 0) + 1;
      });

      const peakTime = Object.entries(timeSlots).reduce((peak, [time, count]) => 
        count > peak.count ? { time, count } : peak, { time: 'N/A', count: 0 });

      return {
        date,
        dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        onlineBookings: onlineCount,
        offlineBookings: offlineCount,
        totalBookings: onlineCount + offlineCount,
        revenue: totalRevenue,
        peakTime: peakTime.time,
        peakTimeBookings: peakTime.count,
        timeSlots,
        bookings: dayBookings
      };
    });

    // Status analysis for online bookings
    const statusStats = {
      confirmed: onlineBookings.filter(b => b.status === 'Confirmed').length,
      pending: onlineBookings.filter(b => b.status === 'Pending').length,
      cancelled: onlineBookings.filter(b => b.status === 'Cancelled').length
    };

    // Settlement analysis for offline bookings
    const settlementStats = {
      settled: offlineBookings.filter(b => b.settlement === 'SETTLED').length,
      partial: offlineBookings.filter(b => b.settlement === 'PARTIAL').length,
      pending: offlineBookings.filter(b => b.settlement === 'PENDING').length
    };

    // Time slot popularity
    const allTimeSlots = {};
    allBookings.forEach(booking => {
      const time = booking.time || booking.startTime || 'Unknown';
      allTimeSlots[time] = (allTimeSlots[time] || 0) + 1;
    });

    const popularTimeSlots = Object.entries(allTimeSlots)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([time, count]) => ({ time, bookings: count }));

    // Customer frequency (from offline bookings)
    const customerFrequency = {};
    offlineBookings.forEach(booking => {
      if (booking.customerName) {
        customerFrequency[booking.customerName] = (customerFrequency[booking.customerName] || 0) + 1;
      }
    });
    
    const frequentCustomers = Object.entries(customerFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, bookings: count }));

    // Performance metrics
    const totalBookings = allBookings.length;
    const totalRevenue = allBookings.reduce((sum, booking) => {
      if (booking.type === 'offline') {
        return sum + ((booking.amount || 0) - (booking.discount || 0));
      } else {
        return sum + (booking.price || game.price || 0);
      }
    }, 0);

    const averageBookingsPerDay = totalBookings / dateRange.length;
    const averageRevenuePerDay = totalRevenue / dateRange.length;
    const utilizationRate = Math.round((totalBookings / (dateRange.length * 24)) * 100 * 100) / 100; // Assuming 24 possible slots per day

    // Peak day analysis
    const peakDay = dailyStats.reduce((peak, day) => 
      day.totalBookings > peak.totalBookings ? day : peak, 
      dailyStats[0] || { totalBookings: 0 });

    return {
      game: {
        id: game.id,
        name: game.name,
        category: game.category || 'Uncategorized',
        price: game.price || 0
      },
      period: {
        startDate,
        endDate,
        days: dateRange.length
      },
      summary: {
        totalBookings,
        onlineBookings: onlineBookings.length,
        offlineBookings: offlineBookings.length,
        totalRevenue,
        averageBookingsPerDay: Math.round(averageBookingsPerDay * 100) / 100,
        averageRevenuePerDay: Math.round(averageRevenuePerDay * 100) / 100,
        utilizationRate
      },
      dailyStats,
      statusStats,
      settlementStats,
      popularTimeSlots,
      frequentCustomers,
      peakDay,
      rawData: {
        onlineBookings,
        offlineBookings,
        allBookings
      }
    };
  }
};

export async function logAdminAction({ action, targetType, targetId, details }) {
  try {
    checkAuth();
    const admin = auth.currentUser?.phoneNumber || auth.currentUser?.email || 'unknown';
    const logEntry = {
      action, // e.g., 'delete booking', 'update game', etc.
      targetType, // e.g., 'booking', 'game', 'user'
      targetId, // id of the affected object
      admin, // phone or email
      details: details || null,
      timestamp: serverTimestamp(),
    };
    await addDoc(collection(db, ADMIN_LOGS_COLLECTION), logEntry);
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
} 