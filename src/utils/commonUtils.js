// Common utility functions to reduce code duplication

/**
 * Resolves game name from either game object or game ID
 * @param {string|object} game - Game ID string or game object
 * @param {Array} games - Array of game objects to search in
 * @returns {string} - Game name or game ID as fallback
 */
export const resolveGameName = (game, games) => {
  if (typeof game === 'object' && game?.name) {
    return game.name;
  }
  
  const gameId = typeof game === 'object' ? game?.id : game;
  const foundGame = games.find(g => g.id === gameId);
  return foundGame?.name || gameId;
};

/**
 * Creates a toast helper function that wraps the toast context methods
 * @param {object} toastMethods - Object containing showSuccess, showError, showInfo methods
 * @returns {function} - showToast function
 */
export const createToastHelper = ({ showSuccess, showError, showInfo }) => {
  return (message, type = 'info') => {
    switch (type) {
      case 'success':
        showSuccess(message);
        break;
      case 'error':
        showError(message);
        break;
      case 'warning':
        showInfo(message);
        break;
      default:
        showInfo(message);
        break;
    }
  };
};

/**
 * Normalizes phone number by removing +91 prefix
 * @param {string} phoneNumber - Phone number with or without +91 prefix
 * @returns {string} - Normalized phone number without +91
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  return phoneNumber.startsWith('+91') ? phoneNumber.slice(3) : phoneNumber;
};

/**
 * Common authentication check and user data loading logic
 * @param {object} user - Firebase user object
 * @param {function} navigate - React Router navigate function
 * @param {object} userService - User service object
 * @param {function} setCurrentUser - State setter for current user
 * @param {function} showToast - Toast function
 * @returns {object|null} - User data object or null if user is inactive
 */
export const handleUserAuthentication = async (user, navigate, userService, setCurrentUser, showToast) => {
  if (!user) {
    navigate('/login');
    return null;
  }

  setCurrentUser(user);

  // Normalize mobile number
  const mobile = normalizePhoneNumber(user.phoneNumber);

  // Always fetch latest user data from Firestore
  let userData;
  if (mobile) {
    userData = await userService.getUserByMobile(mobile);
  } else if (user.email) {
    userData = await userService.getUserByEmail(user.email);
  }

  // Check if user account is active
  if (userData && userData.isActive === false) {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../firebase/config');
    await signOut(auth);
    showToast('Your account has been deactivated. Please contact support.', 'error');
    navigate('/login');
    return null;
  }

  return { userData, mobile, userId: mobile || user.email };
};

/**
 * Common logout handler with proper cleanup
 * @param {function} navigate - React Router navigate function
 * @param {function} showToast - Toast function
 * @param {function} setLoading - Loading state setter
 * @param {function} clearUserData - Function to clear user-specific state
 * @param {Array} cleanupFunctions - Array of cleanup functions to call
 */
export const handleLogout = async (navigate, showToast, setLoading, clearUserData, cleanupFunctions = []) => {
  try {
    // Show loading state
    setLoading(true);

    // Clean up any listeners or subscriptions
    for (const cleanup of cleanupFunctions) {
      try {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }

    // Small delay to allow cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Sign out from Firebase
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../firebase/config');
    await signOut(auth);

    // Clear local state
    clearUserData();

    // Show success message
    showToast('Logged out successfully', 'success');

    // Navigate to login
    navigate('/login');
  } catch (error) {
    console.error('Logout error:', error);

    // Show error but still try to navigate
    showToast('Logout completed with some issues', 'warning');

    // Clear local state anyway
    clearUserData();

    // Force navigation even if signOut fails
    navigate('/login');
  } finally {
    setLoading(false);
  }
};
