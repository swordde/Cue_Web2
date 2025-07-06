const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// TODO: Replace this with the UID of the user you want to make admin
const uid = 'jZY47svIuhf9wGNAer2iWhRMly82';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log('Custom claim set for admin!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  }); 