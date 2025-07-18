// ...existing code...
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
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

// Helper function to check authentication
const checkAuth = () => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
};

// User Services
export const userService = {
  // Create or update user
  async createUser(userData) {
    try {
      checkAuth();
      const userRef = doc(db, USERS_COLLECTION, userData.mobile);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return userData;
    } catch (error) {
      // If user doesn't exist, create new
      await addDoc(collection(db, USERS_COLLECTION), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return userData;
    }
  },

  // Get user by mobile
  async getUserByMobile(mobile) {
    try {
      checkAuth();
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
      console.error('Error getting user:', error);
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const bookingRef = await addDoc(collection(db, BOOKINGS_COLLECTION), sanitizedData);
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

  // Update booking status
  async updateBookingStatus(bookingId, status, notes = '') {
    try {
      checkAuth();
      const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
      await updateDoc(bookingRef, {
        status,
        notes,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
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
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
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
      } else {
        // Create new slot entry
        await this.addSlotsForDate(date, gameId, slots);
      }
    } catch (error) {
      console.error('Error updating slots:', error);
      throw error;
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

  // Listen to games
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