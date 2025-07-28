// Backup of BookGame.jsx as of July 27, 2025
// This file was created as a backup before further changes.

/* --- BEGIN ORIGINAL FILE CONTENT --- */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast, createToastHelper } from '../contexts/ToastContext';
import { auth } from '../firebase/auth';
import * as gameService from '../firebase/services';
import * as slotService from '../firebase/services';
import * as bookingService from '../firebase/services';
import * as realtimeService from '../firebase/services';
import * as offlineBookingService from '../firebase/services';
import styles from './BookGame.module.css';
import Loading from '../components/Loading';

// ...existing code...

export default function BookGame() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [numPlayers, setNumPlayers] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(1);
  const [coinsReward, setCoinsReward] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [userBookings, setUserBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // All bookings for the selected date and game
  const [offlineBookings, setOfflineBookings] = useState([]); // Offline bookings for occupied games
  const [showBookingView, setShowBookingView] = useState(false);
  const [showBookingPopup, setShowBookingPopup] = useState(false);
  const [summaryMinimized, setSummaryMinimized] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();
  const [userData, setUserData] = useState(null);

  // ...existing code...

  return (
    <div className={styles.bookGamePage} style={{minHeight: '100vh', width: '100%', overflowX: 'hidden', padding: '8px'}}>
      {/* ...existing code... */}
    </div>
  );
}

/* --- END ORIGINAL FILE CONTENT --- */
