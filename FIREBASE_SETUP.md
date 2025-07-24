# Firebase Phone Authentication Setup

## Quick Fix for "auth/invalid-app-credential" Error

This error means phone authentication is not enabled in your Firebase project.

### Step 1: Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `club-booking-app`
3. Go to **Authentication** → **Sign-in method**
4. Click on **Phone** 
5. Click **Enable**
6. Click **Save**

### Step 2: Add Test Phone Numbers (for development)

1. In the same Phone authentication settings
2. Scroll down to **Phone numbers for testing**
3. Click **Add phone number**
4. Add your test phone number (e.g., +91XXXXXXXXXX)
5. Click **Save**

### Step 3: Add Your Domain

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domain (e.g., `localhost` for development)
3. Click **Save**

### Step 4: Deploy Firestore Rules

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init firestore`
4. Deploy rules: `firebase deploy --only firestore:rules`

### Step 5: Test

1. Refresh your app
2. Try sending OTP again
3. It should work now!

## Demo Mode (For Testing)

If you want to test the app without setting up Firebase phone auth:

1. Click the **"🚀 Demo Login (Skip Firebase)"** button
2. This will bypass Firebase authentication
3. You can test all app features without phone auth setup

## If Still Not Working

The app will show a clear error message if phone authentication is not configured. Follow the steps above and it should work.

## For Production

When deploying to production:
1. Add your production domain to authorized domains
2. Remove test phone numbers
3. Configure reCAPTCHA if needed (optional for basic setup)
4. Update Firestore rules for production security 