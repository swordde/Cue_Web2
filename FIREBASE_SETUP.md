# Firebase Setup Guide for Club Booking App

## 🚀 Step-by-Step Firebase Setup

### 1. Create Firebase Project

1. **Go to Firebase Console:** https://console.firebase.google.com/
2. **Click "Create a project"**
3. **Enter project name:** `club-booking-app` (or your preferred name)
4. **Enable Google Analytics** (optional)
5. **Click "Create project"**

### 2. Enable Authentication

1. **In Firebase Console, go to Authentication**
2. **Click "Get started"**
3. **Go to "Sign-in method" tab**
4. **Enable "Phone" provider**
5. **Add your phone number for testing** (optional)

### 3. Enable Firestore Database

1. **Go to Firestore Database**
2. **Click "Create database"**
3. **Choose "Start in test mode"** (for development)
4. **Select a location** (choose closest to your users)
5. **Click "Done"**

### 4. Get Firebase Config

1. **Go to Project Settings** (gear icon)
2. **Scroll down to "Your apps"**
3. **Click "Add app" → Web**
4. **Register app with name:** `Club Booking App`
5. **Copy the config object**

### 5. Update Firebase Config

Replace the config in `src/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 6. Set Up Security Rules

In Firestore Database → Rules, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         resource.data.mobile == request.auth.token.phone_number);
    }
    
    // Bookings - users can read/write their own, admins can read all
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource.data.user == request.auth.token.phone_number || 
         request.auth.token.admin == true);
    }
    
    // Games - read for all, write for admins
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Slots - read for all, write for admins
    match /slots/{slotId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

### 7. Enable Phone Authentication (Optional)

For real phone authentication:

1. **In Authentication → Sign-in method**
2. **Enable Phone provider**
3. **Add test phone numbers** (for development)
4. **Update the Login component** to use real Firebase Phone Auth

### 8. Deploy to Firebase Hosting (Optional)

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Firebase:**
   ```bash
   firebase init hosting
   ```

4. **Build and deploy:**
   ```bash
   npm run build
   firebase deploy
   ```

## 🔧 Current Implementation

### What's Working Now:
- ✅ **Firebase services** created
- ✅ **Authentication** (demo mode)
- ✅ **Database structure** ready
- ✅ **Real-time listeners** configured

### What Needs Configuration:
- ⚠️ **Firebase config** (you need to add your project details)
- ⚠️ **Security rules** (need to be set in Firebase console)
- ⚠️ **Phone auth** (optional for production)

## 🎯 Next Steps

1. **Add your Firebase config** to `src/firebase/config.js`
2. **Test the app** locally
3. **Deploy to Firebase Hosting** (optional)
4. **Set up real phone authentication** (optional)

## 📱 Testing

- **Admin login:** Use mobile `0000000000`
- **Regular user:** Use any other mobile number
- **OTP:** Use `1234` for demo

## 🚨 Important Notes

- **Current implementation** uses demo authentication
- **For production**, enable real Firebase Phone Auth
- **Security rules** need to be configured in Firebase console
- **Test thoroughly** before going live

## 🔍 Troubleshooting

### Common Issues:

1. **"Firebase not initialized"**
   - Check your config in `src/firebase/config.js`
   - Make sure all values are correct

2. **"Permission denied"**
   - Check Firestore security rules
   - Make sure authentication is working

3. **"Phone auth not working"**
   - Enable Phone provider in Firebase console
   - Add test phone numbers for development

4. **"Real-time updates not working"**
   - Check network connection
   - Verify Firestore rules allow read access

## 📞 Support

If you need help:
1. Check Firebase console for errors
2. Check browser console for JavaScript errors
3. Verify all configuration steps are complete 