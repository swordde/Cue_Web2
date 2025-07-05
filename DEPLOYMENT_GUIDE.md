# Deployment Guide

## Quick Deployment Steps

### 1. Build the Application
```bash
npm run build
```

### 2. Deploy the `dist` folder
The built application is in the `dist` folder. Upload this to your hosting provider.

### 3. Configure Server (if needed)

#### For Apache (.htaccess)
Create a `.htaccess` file in your root directory:
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

#### For Nginx
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Troubleshooting

### If the app doesn't load:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for errors in the Console tab
   - Visit `/test` route to run diagnostics

2. **Common Issues:**

   **Issue: White screen**
   - Check if all files are uploaded
   - Verify `index.html` is in the root directory
   - Check server configuration for SPA routing

   **Issue: "Module not found" errors**
   - Ensure all files in `dist/assets/` are uploaded
   - Check file permissions on server

   **Issue: localStorage not working**
   - Check if HTTPS is required
   - Verify browser supports localStorage
   - Check for privacy mode restrictions

3. **Test Routes:**
   - `/` - Home page
   - `/test` - Deployment diagnostics
   - `/login` - Login page
   - `/dashboard` - Dashboard (requires login)
   - `/admin` - Admin panel (requires admin login)
   - `/book` - Booking page (requires login)

### Admin Access
- Use mobile number: `9999999999` for admin access
- Other numbers will be regular users

### Database Reset
If you need to reset all data:
1. Clear browser localStorage
2. Or visit admin panel and click "Reset Settings"

## Environment Variables (if needed)
The app uses localStorage for data persistence. No environment variables are required.

## Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## File Structure After Build
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].css
│   └── index-[hash].js
└── [other static files]
``` 