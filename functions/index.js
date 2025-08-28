const functions = require('firebase-functions');
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {
  // already initialized in some environments
}

const db = admin.firestore();

// Helper: Award coins transactionally (safe, idempotent)
async function awardCoinsToUser(userMobile, coinsToAward, bookingRef, type, actor) {
  console.log('🛠️ AWARD COINS HELPER CALLED:', {
    userMobile: userMobile?.substring(0, 8) + '***',
    coinsToAward,
    type,
    actor
  });
  
  if (!userMobile || !coinsToAward || coinsToAward <= 0) {
    console.log('❌ INVALID PARAMETERS:', {
      hasUserMobile: !!userMobile,
      coinsToAward,
      isPositive: coinsToAward > 0
    });
    return false;
  }

  // Find or create a minimal user doc (clubCoins = 0)
  console.log('🔍 LOOKING UP USER BY MOBILE:', userMobile?.substring(0, 8) + '***');
  const userQuery = await db.collection('users').where('mobile', '==', String(userMobile)).limit(1).get();
  let userRef;
  
  if (userQuery.empty) {
    console.log('👤 USER NOT FOUND - CREATING NEW USER');
    userRef = db.collection('users').doc(); // reserve new ID
    await userRef.set({
      mobile: String(userMobile),
      clubCoins: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ NEW USER CREATED:', userRef.id);
  } else {
    userRef = userQuery.docs[0].ref;
    console.log('✅ USER FOUND:', userRef.id);
  }

  // One transaction: increment user, update booking (if provided), write admin log
  console.log('🔄 STARTING TRANSACTION');
  try {
    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      console.log('💾 USER CURRENT STATE:', {
        exists: userSnap.exists,
        currentCoins: userSnap.exists ? userSnap.data().clubCoins : 0
      });
      
      if (!userSnap.exists) {
        console.log('⚠️ USER DISAPPEARED - RECREATING');
        tx.set(userRef, { 
          mobile: String(userMobile), 
          clubCoins: coinsToAward, 
          createdAt: admin.firestore.FieldValue.serverTimestamp(), 
          updatedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
      } else {
        console.log('➕ INCREMENTING USER COINS BY:', coinsToAward);
        tx.update(userRef, {
          clubCoins: admin.firestore.FieldValue.increment(coinsToAward),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      if (bookingRef) {
        console.log('📄 MARKING BOOKING AS COINS AWARDED');
        tx.update(bookingRef, {
          coinsAwarded: true,
          coinsAwardedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      const logRef = db.collection('adminLogs').doc();
      console.log('📝 WRITING ADMIN LOG');
      tx.set(logRef, {
        action: 'award coins',
        targetType: type || 'unknown',
        targetId: bookingRef ? bookingRef.path : null,
        admin: actor || 'system',
        details: { userMobile: String(userMobile), coinsToAward },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    console.log('✅ TRANSACTION COMPLETED SUCCESSFULLY');
    return true;
  } catch (error) {
    console.error('❌ TRANSACTION FAILED:', error);
    return false;
  }
}

// Use same region as Firestore database to reduce latency (asia-south1 per firebase.json)
const regionalFunctions = functions.region('asia-south1');

// Online booking: award coins when status changes to Confirmed
exports.awardCoinsOnBookingConfirm = regionalFunctions.firestore.document('bookings/{bookingId}').onUpdate(async (change, context) => {
  console.log('🎯 BOOKING TRIGGER FIRED for booking:', context.params.bookingId);
  
  const before = change.before.data() || {};
  const after = change.after.data() || {};
  
  console.log('📊 BEFORE:', {
    status: before.status,
    coinsAwarded: before.coinsAwarded,
    gameId: before.gameId,
    user: before.user?.substring(0, 8) + '***'
  });
  
  console.log('📊 AFTER:', {
    status: after.status,
    coinsAwarded: after.coinsAwarded,
    gameId: after.gameId,
    user: after.user?.substring(0, 8) + '***',
    sessionDuration: after.sessionDuration
  });
  
  // Check trigger conditions
  if ((before.status || '').toLowerCase() === 'confirmed') {
    console.log('❌ SKIP: Status was already confirmed');
    return null;
  }
  if ((after.status || '').toLowerCase() !== 'confirmed') {
    console.log('❌ SKIP: Status is not confirmed, it is:', after.status);
    return null;
  }
  if (after.coinsAwarded) {
    console.log('❌ SKIP: Coins already awarded');
    return null;
  }

  const gameId = after.gameId || (after.game && after.game.id);
  const sessionDuration = after.sessionDuration || 0.5;
  const userMobile = after.user;
  
  console.log('🔍 EXTRACTED DATA:', {
    gameId,
    sessionDuration,
    userMobile: userMobile?.substring(0, 8) + '***'
  });
  
  if (!gameId || !userMobile) {
    console.log('❌ MISSING REQUIRED FIELDS:', {
      hasGameId: !!gameId,
      hasUserMobile: !!userMobile
    });
    return null;
  }

  console.log('🎮 LOOKING UP GAME:', gameId);
  const gameSnap = await db.collection('games').doc(String(gameId)).get();
  const baseCoins = gameSnap.exists ? (gameSnap.data().coins || 0) : 0;
  const coinsToAward = Math.floor(baseCoins * sessionDuration);
  
  console.log('💰 COIN CALCULATION:', {
    gameExists: gameSnap.exists,
    baseCoins,
    sessionDuration,
    coinsToAward
  });
  
  if (coinsToAward <= 0) {
    console.log('❌ SKIP: No coins to award');
    return null;
  }

  console.log('🪙 AWARDING COINS:', coinsToAward, 'to user:', userMobile?.substring(0, 8) + '***');
  const result = await awardCoinsToUser(userMobile, coinsToAward, change.after.ref, 'booking', 'system');
  console.log('✅ AWARD RESULT:', result);
  return null;
});

// Offline booking: award coins when settlement changes to SETTLED
exports.awardCoinsOnOfflineSettled = regionalFunctions.firestore.document('offlineBookings/{bookingId}').onUpdate(async (change, context) => {
  console.log('🏪 OFFLINE TRIGGER FIRED for booking:', context.params.bookingId);
  
  const before = change.before.data() || {};
  const after = change.after.data() || {};
  
  console.log('📊 BEFORE:', {
    settlement: before.settlement,
    coinsAwarded: before.coinsAwarded,
    board: before.board,
    customerMobile: before.customerMobile,
    customerName: before.customerName
  });
  
  console.log('📊 AFTER:', {
    settlement: after.settlement,
    coinsAwarded: after.coinsAwarded,
    board: after.board,
    customerMobile: after.customerMobile,
    customerName: after.customerName,
    duration: after.duration
  });
  
  if ((before.settlement || '').toUpperCase() === 'SETTLED') {
    console.log('❌ SKIP: Settlement was already SETTLED');
    return null;
  }
  if ((after.settlement || '').toUpperCase() !== 'SETTLED') {
    console.log('❌ SKIP: Settlement is not SETTLED, it is:', after.settlement);
    return null;
  }
  if (after.coinsAwarded) {
    console.log('❌ SKIP: Coins already awarded');
    return null;
  }

  const boardId = after.board;
  const duration = after.duration || 0.5;
  const userMobile = after.customerMobile || (after.customer && after.customer.mobile);
  
  console.log('🔍 EXTRACTED DATA:', {
    boardId,
    duration,
    userMobile: userMobile?.substring(0, 8) + '***'
  });
  
  if (!boardId || !userMobile) {
    console.log('❌ MISSING REQUIRED FIELDS:', {
      hasBoardId: !!boardId,
      hasUserMobile: !!userMobile,
      customerMobile: after.customerMobile,
      customerObject: after.customer
    });
    return null;
  }

  console.log('🎮 LOOKING UP GAME/BOARD:', boardId);
  const gameSnap = await db.collection('games').doc(String(boardId)).get();
  const baseCoins = gameSnap.exists ? (gameSnap.data().coins || 0) : 0;
  const coinsToAward = Math.floor(baseCoins * duration);
  
  console.log('💰 COIN CALCULATION:', {
    gameExists: gameSnap.exists,
    baseCoins,
    duration,
    coinsToAward
  });
  
  if (coinsToAward <= 0) {
    console.log('❌ SKIP: No coins to award');
    return null;
  }

  console.log('🪙 AWARDING COINS:', coinsToAward, 'to user:', userMobile?.substring(0, 8) + '***');
  const result = await awardCoinsToUser(userMobile, coinsToAward, change.after.ref, 'offlineBooking', 'system');
  console.log('✅ AWARD RESULT:', result);
  return null;
});

// Callable admin function for manual coin adjustment
exports.adminAdjustCoins = regionalFunctions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const { userMobile, coins, reason } = data;
  if (!userMobile || typeof coins !== 'number' || !reason) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing fields');
  }

  await awardCoinsToUser(userMobile, coins, null, 'manual', context.auth.uid);
  return { success: true };
});

// Secure user existence check function
exports.checkUserExists = regionalFunctions.https.onCall(async (data, context) => {
  console.log('🔍 USER LOOKUP REQUEST:', {
    hasAuth: !!context.auth,
    uid: context.auth?.uid?.substring(0, 8) + '***',
    mobile: data?.mobile?.substring(0, 8) + '***'
  });

  // Require authentication
  if (!context.auth) {
    console.log('❌ UNAUTHENTICATED REQUEST');
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to check user existence');
  }

  const { mobile } = data;
  
  // Validate mobile number
  if (!mobile || typeof mobile !== 'string' || mobile.length < 10) {
    console.log('❌ INVALID MOBILE:', mobile);
    throw new functions.https.HttpsError('invalid-argument', 'Valid mobile number required');
  }

  try {
    console.log('🔍 SEARCHING FOR USER BY MOBILE:', mobile?.substring(0, 8) + '***');
    
    // Search for user by mobile number
    const userQuery = await db.collection('users')
      .where('mobile', '==', String(mobile))
      .limit(1)
      .get();

    const exists = !userQuery.empty;
    
    console.log('📊 USER LOOKUP RESULT:', {
      exists,
      docCount: userQuery.docs.length
    });

    if (exists) {
      const userData = userQuery.docs[0].data();
      console.log('✅ USER FOUND:', {
        hasName: !!userData.name,
        hasCoins: typeof userData.clubCoins === 'number',
        totalBookings: userData.totalBookings || 0
      });

      // Return only safe, non-sensitive data
      return {
        exists: true,
        userData: {
          id: userQuery.docs[0].id,
          name: userData.name || 'Unknown User',
          mobile: String(mobile),
          totalBookings: userData.totalBookings || 0,
          // Don't expose sensitive data like clubCoins, email, etc.
          hasCoins: (userData.clubCoins || 0) > 0,
          memberSince: userData.createdAt ? userData.createdAt.toDate().toISOString().split('T')[0] : null
        }
      };
    } else {
      console.log('❌ USER NOT FOUND');
      return {
        exists: false,
        userData: null
      };
    }
  } catch (error) {
    console.error('❌ ERROR CHECKING USER EXISTENCE:', error);
    throw new functions.https.HttpsError('internal', 'Error checking user existence');
  }
});
