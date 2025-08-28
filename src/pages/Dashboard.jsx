// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useToast } from '../contexts/ToastContext';
import { userService } from '../firebase/services';
import { createToastHelper } from '../utils/commonUtils';
import styles from './Dashboard.module.css';

const features = [
  { 
    label: 'Games', 
    icon: '', 
    path: '/book', 
    description: 'PS5, 3, Pool, Snooker, Darts & More',
    features: ['Premium Gaming Setup', 'Latest Game Titles', 'Competitive Tournaments']
  },
  { 
    label: 'Event Management', 
    icon: '', 
    path: '/party', 
    description: 'Birthday Parties, Corporate Events & Celebrations',
    features: ['Custom Event Planning', 'Premium Gift Options', 'Full Service Management']
  },
  { 
    label: 'Food & Hospitality', 
    icon: '', 
    path: '/menu', 
    description: 'Premium Dining, Beverages & Catering Services',
    features: ['Group Bookings', 'Special Packages', 'Custom Menus']
  },
  { 
    label: 'Gifts', 
    icon: '', 
    path: '/gifts', 
    description: 'Gift Cards, Merchandise & Special Vouchers',
    features: ['Digital Gift Cards', 'Custom Amounts', 'Instant Delivery']
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentAd, setCurrentAd] = useState(0);
  const { showSuccess, showError, showInfo } = useToast();

  const ads = [
    {
      text: "Special Offer: 20% OFF on PS5 Gaming Sessions this weekend!",
      button: "Claim Now"
    },
    {
      text: "Pool Tournament: Join our weekly championship - Prize: ₹5000!",
      button: "Register"
    },
    {
      text: "Birthday Special: Book party packages and get 30% OFF!",
      button: "Book Now"
    },
    {
      text: "Darts League: New season starting - Limited spots available!",
      button: "Join League"
    }
  ];

  // Helper function to show toasts based on type
  const showToast = createToastHelper({ showSuccess, showError, showInfo });

  useEffect(() => {
    setIsLoaded(true);
    
    // Auto-slide ads every 5 seconds
    const interval = setInterval(() => {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    }, 5000);

    // Add keyboard event listener for Ctrl+A admin access
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault(); // Prevent default Ctrl+A behavior
        // Check if user has admin privileges
        if (isAdmin) {
          navigate('/admin');
        } else {
          showToast('Access denied. Admin privileges required.', 'error');
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Use Firebase Auth to check login state and admin claim
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setCurrentUser(user);
        // Check for admin custom claim without forcing refresh to prevent infinite loop
        const token = await getIdTokenResult(user, false); // Don't force refresh
        setIsAdmin(!!token.claims.admin);
        // Always fetch latest user data from Firestore
        let mobile = user.phoneNumber;
        if (mobile && mobile.startsWith('+91')) {
          mobile = mobile.slice(3);
        }
        let userData;
        if (mobile) {
          userData = await userService.getUserByMobile(mobile);
        } else if (user.email) {
          userData = await userService.getUserByEmail(user.email);
        }
        if (userData && userData.isActive === false) {
          await signOut(auth);
          showToast('Your account has been deactivated. Please contact support.', 'error');
          navigate('/login');
          return;
        }
        setUserData(userData);
      }
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
      unsubscribe();
    };
  }, [navigate, showToast, ads.length]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleCardClick = (path) => {
    console.log(`Navigating to ${path}`);
    navigate(path);
  };

  const handleAdClick = (direction) => {
    if (direction === 'next') {
      setCurrentAd((prev) => (prev + 1) % ads.length);
    } else {
      setCurrentAd((prev) => (prev - 1 + ads.length) % ads.length);
    }
  };

  // Remove extra closing brace here

  return (
    <div className={styles.dashboard}>
      {/* User Avatar Top Right */}
      {currentUser && (
        <div className={styles.userInfoCard} onClick={() => navigate('/user')} title="Go to User Panel" style={{ cursor: 'pointer' }}>
          <div className={styles.avatarCircle}>
            {userData?.name ? userData.name[0] : (currentUser.displayName ? currentUser.displayName[0] : (currentUser.email ? currentUser.email[0] : 'U'))}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className={`${styles.heroSection} ${isLoaded ? styles.fadeIn : ''}`}>
        <div className={styles.heroBackground}></div>
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Welcome to <span className={styles.highlight} style={{
              fontFamily: '"Abril Fatface", "Anton", "Bebas Neue", "Impact", "Arial Black", cursive',
              letterSpacing: '2px'
            }}>Cue Club Café</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Your ultimate destination for gaming, events, and unforgettable experiences
          </p>
        </div>
        <div className={styles.floatingElements}>
          <div className={styles.floatingBubble}></div>
          <div className={styles.floatingBubble}></div>
          <div className={styles.floatingBubble}></div>
        </div>
      </section>

      {/* Admin Panel Link - Only show for admins */}
      {isAdmin && (
        <div className={styles.adminBanner}>
          <span className={styles.adminText}>🔧 Admin Access Available</span>
          <Link to="/admin" className={styles.adminButton}>
            Go to Admin Panel
          </Link>
        </div>
      )}

      {/* Ads Banner */}
      <section className={styles.adsBanner}>
        <div className={styles.adsContainer}>
          <button 
            className={styles.adsPrevButton}
            onClick={() => handleAdClick('prev')}
          >
            ←
          </button>
          
          <div className={styles.adsSlider}>
            <div className={styles.adsGlow}></div>
            <div className={styles.adsContent}>
              <span className={styles.adsText}>
                {ads[currentAd].text}
              </span>
              <button className={styles.adsButton}>
                {ads[currentAd].button}
              </button>
            </div>
          </div>
          
          <button 
            className={styles.adsNextButton}
            onClick={() => handleAdClick('next')}
          >
            →
          </button>
        </div>
        
        <div className={styles.adsIndicators}>
          {ads.map((_, index) => (
            <button
              key={index}
              className={`${styles.adsIndicator} ${index === currentAd ? styles.active : ''}`}
              onClick={() => setCurrentAd(index)}
            />
          ))}
        </div>
      </section>

      {/* Main Navigation Cards */}
      <section className={styles.navigationSection}>
        <div className={styles.sectionTitle}>
          <h2>Choose Your Experience</h2>
          <p>Select from our premium services</p>
        </div>
        
        <div className={styles.cardsGrid}>
          {features.map((feature, index) => (
            <div 
              key={feature.label}
              className={`${styles.navCard} ${styles[`card${index}`]}`}
              onClick={() => handleCardClick(feature.path)}
            >
              <div className={styles.cardGlow}></div>
              <div className={styles.cardContent}>
                <div className={styles.cardIcon}>{feature.icon}</div>
                <h3 className={styles.cardTitle}>{feature.label}</h3>
                <p className={styles.cardDescription}>
                  {feature.description}
                </p>
                <div className={styles.cardFeatures}>
                  {feature.features.map((feat, i) => (
                    <span key={i}>• {feat}</span>
                  ))}
                </div>
              </div>
              <div className={styles.cardArrow}>→</div>
            </div>
          ))}
        </div>
      </section>

      {/* Background Animation Elements */}
      <div className={styles.backgroundAnimation}>
        <div className={styles.gradientOrb}></div>
        <div className={styles.gradientOrb}></div>
        <div className={styles.gradientOrb}></div>
      </div>
    </div>
  );
}
