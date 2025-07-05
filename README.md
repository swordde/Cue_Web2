# Club Booking Web App

A dynamic club booking system built with React, Bootstrap, and localStorage for data persistence.

## 🚀 Live Demo

Visit the live application: [Club Booking App](https://yourusername.github.io/cueweb2/)

## ✨ Features

### 🎮 Dynamic Game Management
- Add/Edit/Delete games through admin panel
- Set game prices, images, and descriptions
- Active/Inactive game status

### ⏰ Dynamic Slot Management
- Configure time slots for specific dates and games
- Bulk slot operations
- Real-time slot availability

### 👥 User Management
- Mobile number authentication
- User profiles and booking history
- Admin and regular user roles

### 📊 Admin Panel
- Comprehensive booking management
- Game and slot configuration
- Analytics dashboard
- User management

### 📱 Booking System
- Real-time slot booking
- Booking status tracking
- Admin approval workflow

## 🛠️ Technology Stack

- **Frontend:** React 18, Bootstrap 5
- **Build Tool:** Vite
- **Routing:** React Router (HashRouter for GitHub Pages)
- **Storage:** localStorage
- **Deployment:** GitHub Pages

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/cueweb2.git
cd cueweb2
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:5173
```

### GitHub Pages Deployment

The app is configured for automatic deployment to GitHub Pages.

1. **Push to main branch**
```bash
git add .
git commit -m "Update app"
git push origin main
```

2. **Configure GitHub Pages**
   - Go to repository Settings → Pages
   - Set source to "GitHub Actions"
   - Your app will be deployed automatically

3. **Access your app**
   - URL: `https://yourusername.github.io/cueweb2/`

## 🔧 Configuration

### Admin Access
- **Admin Mobile:** `9999999999`
- **Regular Users:** Any other mobile number

### Database Reset
- Clear browser localStorage, or
- Visit admin panel and click "Reset Settings"

## 📱 Test Routes

- `#/` - Home page
- `#/test` - Deployment diagnostics
- `#/login` - Login page
- `#/dashboard` - Dashboard (requires login)
- `#/admin` - Admin panel (requires admin login)
- `#/book` - Booking page (requires login)

## 🎯 Key Features

### Admin Panel
- **Game Management:** Add/Edit/Delete games with images and pricing
- **Slot Management:** Configure time slots for specific dates
- **Booking Management:** View, filter, and update booking statuses
- **Analytics:** View booking statistics and user data

### Booking System
- **Dynamic Games:** Games added in admin panel appear instantly
- **Dynamic Slots:** Time slots configured by admin are available for booking
- **Real-time Updates:** Changes reflect immediately across the app
- **User-friendly:** Intuitive interface with loading states and error handling

### User Experience
- **Mobile-first Design:** Responsive Bootstrap interface
- **Error Handling:** Comprehensive error boundaries and user feedback
- **Loading States:** Smooth loading indicators
- **Diagnostic Tools:** Built-in testing and debugging features

## 🔍 Troubleshooting

### Common Issues

**404 Errors on GitHub Pages**
- ✅ Fixed: Using HashRouter for client-side routing
- ✅ Added GitHub Pages routing scripts

**Assets Not Loading**
- ✅ Fixed: Proper base path configuration
- ✅ Assets correctly referenced for GitHub Pages

**localStorage Issues**
- ✅ Added error handling for localStorage operations
- ✅ Fallback mechanisms for data persistence

### Debug Tools

1. **Visit `#/test`** for deployment diagnostics
2. **Check browser console** for detailed error messages
3. **Use admin panel** to reset settings if needed

## 📄 License

MIT License - feel free to use this project for your own club booking system!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Visit the diagnostic page (`#/test`)
3. Open an issue on GitHub

---

**Built with ❤️ using React, Bootstrap, and modern web technologies**
