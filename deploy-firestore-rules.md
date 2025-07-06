# Deploy Firestore Security Rules

To fix the 400 Bad Request errors, you need to deploy the Firestore security rules.

## Option 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Option 2: Using Firebase Console

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `club-booking-app`
3. **Go to Firestore**: Click "Firestore Database" in the left sidebar
4. **Go to Rules tab**: Click the "Rules" tab
5. **Replace the rules** with the content from `firestore.rules`
6. **Click "Publish"**

## Option 3: Temporary Open Rules (For Testing)

If you want to test without authentication, you can temporarily use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Warning**: This allows anyone to read/write your data. Only use for testing!

## Verify the Fix

After deploying the rules:
1. **Refresh your app**
2. **Check the console** - the 400 errors should be gone
3. **Test the login** - authentication should work properly

## Common Issues

- **Rules not updating**: Wait a few minutes for propagation
- **Still getting errors**: Check if you're authenticated in the app
- **Permission denied**: Make sure the user is signed in before accessing Firestore 