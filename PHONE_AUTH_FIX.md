# Phone Authentication Fix Required

## Current Issue
The app is getting "Failed to verify with reCAPTCHA Enterprise" error when trying to send OTP.

## Root Cause
Firebase is trying to use reCAPTCHA Enterprise but it's not properly configured in the Firebase Console.

## Quick Fix Options

### Option 1: Disable reCAPTCHA Enterprise (Recommended)
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `club-booking-app`
3. Go to Authentication → Settings → Advanced
4. Find "reCAPTCHA Enterprise" setting
5. **Disable** reCAPTCHA Enterprise
6. Save changes

### Option 2: Configure reCAPTCHA Enterprise Properly
1. Go to Google Cloud Console: https://console.cloud.google.com
2. Select project: `club-booking-app`
3. Enable reCAPTCHA Enterprise API
4. Create reCAPTCHA Enterprise site key
5. Add the site key to Firebase Console
6. Allowlist your domains (localhost:5174, your-domain.com)

### Option 3: Use Test Phone Numbers (For Development)
1. Go to Firebase Console → Authentication → Settings
2. Scroll to "Phone numbers for testing"
3. Add test phone numbers with verification codes
4. Use these for development instead of real phone numbers

## Current Status
- ✅ UI is working perfectly
- ✅ Email login is working
- ❌ Phone authentication blocked by reCAPTCHA Enterprise
- ✅ All other features working

## Recommended Action
**Option 1 is the easiest** - just disable reCAPTCHA Enterprise in Firebase Console and phone auth should work immediately.
