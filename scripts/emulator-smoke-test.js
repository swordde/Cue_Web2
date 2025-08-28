/*
Emulator smoke test for coin awarding flows.
Run after starting the emulators:

1) Start emulators in project root:
   firebase emulators:start --only functions,firestore

2) In another terminal, run this script:
   node scripts/emulator-smoke-test.js

It will:
 - create a game with coins
 - create a user (by mobile)
 - create a booking (Pending) and then set it to Confirmed -> expect coins awarded
 - create an offlineBooking (PENDING) then set to SETTLED -> expect coins awarded

This script assumes the Firestore emulator is running on default host/port.
*/

const admin = require('firebase-admin');

// Use a known project id for emulator
const PROJECT_ID = process.env.FIREBASE_PROJECT || 'demo-project';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function run() {
  console.log('Starting emulator smoke test...');

  // Create a game
  const gameRef = db.collection('games').doc('test-game-1');
  await gameRef.set({ name: 'Test Game', coins: 10, price: 100 });
  console.log('Created game test-game-1 with 10 coins/hour');

  // Create a user
  const mobile = '9990001111';
  const userRef = db.collection('users').doc();
  await userRef.set({ mobile, name: 'Smoke Test User', clubCoins: 0 });
  console.log('Created user', mobile);

  // ONLINE booking test
  const bookingRef = db.collection('bookings').doc();
  const bookingData = {
    user: mobile,
    gameId: 'test-game-1',
    status: 'Pending',
    sessionDuration: 1, // 1 hour
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await bookingRef.set(bookingData);
  console.log('Created booking (Pending) ->', bookingRef.id);

  // Give functions a moment if not warm
  await sleep(500);

  // Update status to Confirmed - should trigger award
  await bookingRef.update({ status: 'Confirmed' });
  console.log('Updated booking to Confirmed, waiting for functions to process...');

  // wait for function to run
  await sleep(2000);

  const updatedUser = (await db.collection('users').where('mobile','==',mobile).limit(1).get()).docs[0].data();
  const updatedBookingSnap = await bookingRef.get();

  console.log('Post-confirm check: user.clubCoins=', updatedUser.clubCoins, 'booking.coinsAwarded=', updatedBookingSnap.data().coinsAwarded);

  // OFFLINE booking test
  const offlineRef = db.collection('offlineBookings').doc();
  const offlineData = {
    customerName: 'Smoke Test User',
    customerMobile: mobile,
    board: 'test-game-1',
    duration: 1,
    settlement: 'PENDING',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  await offlineRef.set(offlineData);
  console.log('Created offline booking (PENDING) ->', offlineRef.id);

  await sleep(500);

  // Set to SETTLED
  await offlineRef.update({ settlement: 'SETTLED' });
  console.log('Updated offline booking to SETTLED, waiting for functions...');

  await sleep(2000);

  const finalUserSnap = (await db.collection('users').where('mobile','==',mobile).limit(1).get()).docs[0];
  const finalOfflineSnap = await offlineRef.get();

  console.log('Final check: user.clubCoins=', finalUserSnap.data().clubCoins, 'offline.coinsAwarded=', finalOfflineSnap.data().coinsAwarded);

  console.log('Emulator smoke test complete.');
}

run().catch(err => { console.error('Smoke test failed:', err); process.exit(1); });
