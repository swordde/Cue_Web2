const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'club-booking-app'
  });
}

const db = admin.firestore();

async function debugCoinSystem() {
  console.log('🔍 DEBUGGING COIN SYSTEM...\n');
  
  try {
    // 1. Check if functions are deployed
    console.log('1. ✅ Firebase Admin initialized successfully');
    
    // 2. Check for recent bookings
    console.log('\n2. 📋 Recent bookings (last 5):');
    const bookingsSnapshot = await db.collection('bookings')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    if (bookingsSnapshot.empty) {
      console.log('   ❌ No bookings found');
      return;
    }
    
    bookingsSnapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`   📄 Booking ${i + 1}:`, {
        id: doc.id,
        status: data.status,
        gameId: data.gameId,
        user: data.user?.substring(0, 8) + '***',
        sessionDuration: data.sessionDuration,
        coinsAwarded: data.coinsAwarded,
        coinsAwardedAt: data.coinsAwardedAt?.toDate?.()
      });
    });
    
    // 3. Check games collection for coins field
    console.log('\n3. 🎮 Games with coin rewards:');
    const gamesSnapshot = await db.collection('games').get();
    gamesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`   🎯 ${data.name || doc.id}: ${data.coins || 0} coins/hour`);
    });
    
    // 4. Check users with coins
    console.log('\n4. 🪙 Users with club coins:');
    const usersSnapshot = await db.collection('users')
      .where('clubCoins', '>', 0)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('   ❌ No users have coins yet');
    } else {
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   👤 ${data.name || 'Unknown'}: ${data.clubCoins} coins`);
      });
    }
    
    // 5. Check for confirmed bookings without coins
    console.log('\n5. ⚠️  Confirmed bookings without coins awarded:');
    const unAwardedSnapshot = await db.collection('bookings')
      .where('status', '==', 'Confirmed')
      .where('coinsAwarded', '==', false)
      .get();
    
    if (unAwardedSnapshot.empty) {
      console.log('   ✅ All confirmed bookings have coins awarded');
    } else {
      console.log(`   ❌ Found ${unAwardedSnapshot.size} confirmed bookings without coins:`);
      unAwardedSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`      📄 ${doc.id}: ${data.user?.substring(0, 8)}***, gameId: ${data.gameId}`);
      });
    }
    
    // 6. Check offline bookings
    console.log('\n6. 🏪 Offline bookings analysis:');
    const offlineSnapshot = await db.collection('offlineBookings')
      .orderBy('date', 'desc')
      .limit(5)
      .get();
      
    if (offlineSnapshot.empty) {
      console.log('   ❌ No offline bookings found');
    } else {
      console.log(`   📋 Recent offline bookings (${offlineSnapshot.size}):`);
      offlineSnapshot.docs.forEach((doc, i) => {
        const data = doc.data();
        console.log(`   📄 Offline ${i + 1}:`, {
          id: doc.id,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          board: data.board,
          settlement: data.settlement,
          duration: data.duration,
          coinsAwarded: data.coinsAwarded
        });
      });
      
      // Check settled but not awarded coins
      const settledUnAwardedSnapshot = await db.collection('offlineBookings')
        .where('settlement', '==', 'SETTLED')
        .where('coinsAwarded', '==', false)
        .get();
        
      if (settledUnAwardedSnapshot.empty) {
        console.log('   ✅ All settled offline bookings have coins awarded');
      } else {
        console.log(`   ❌ Found ${settledUnAwardedSnapshot.size} settled offline bookings without coins`);
      }
    }
    
    // 7. Test trigger conditions
    console.log('\n7. 🔧 Testing trigger conditions...');
    const testBooking = bookingsSnapshot.docs[0];
    if (testBooking) {
      const data = testBooking.data();
      console.log('   Last booking analysis:');
      console.log(`   - Status: "${data.status}" (should be "Confirmed")`);
      console.log(`   - GameId: "${data.gameId}" (should not be empty)`);
      console.log(`   - User: "${data.user?.substring(0, 8)}***" (should not be empty)`);
      console.log(`   - SessionDuration: ${data.sessionDuration} (should be > 0)`);
      console.log(`   - CoinsAwarded: ${data.coinsAwarded} (should be false initially)`);
      
      if (data.gameId) {
        const gameSnap = await db.collection('games').doc(data.gameId).get();
        if (gameSnap.exists) {
          const gameData = gameSnap.data();
          console.log(`   - Game "${gameData.name}" coins: ${gameData.coins}/hour`);
          const expectedCoins = Math.floor((gameData.coins || 0) * (data.sessionDuration || 0.5));
          console.log(`   - Expected coins: ${expectedCoins}`);
        } else {
          console.log(`   ❌ Game document "${data.gameId}" not found!`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugCoinSystem()
  .then(() => {
    console.log('\n🔍 Debug complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug error:', error);
    process.exit(1);
  });
