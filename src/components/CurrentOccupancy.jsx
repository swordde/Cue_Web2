import { useState, useEffect } from 'react';
import { realtimeService, offlineBookingService, gameService } from '../firebase/services';
import styles from './CurrentOccupancy.module.css';

export default function CurrentOccupancy() {
  const [games, setGames] = useState([]);
  const [onlineBookings, setOnlineBookings] = useState([]);
  const [offlineBookings, setOfflineBookings] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every minute
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);

    // Load games
    gameService.getAllGames().then(setGames);

    // Setup real-time listeners
    const onlineUnsub = realtimeService.onAllBookingsChange((bookings) => {
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings.filter(booking => 
        booking.date === today && 
        booking.status !== 'Cancelled'
      );
      setOnlineBookings(todayBookings);
    });

    const offlineUnsub = offlineBookingService.onOfflineBookingsChange((bookings) => {
      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookings.filter(booking => 
        booking.date === today && 
        booking.status !== 'CLOSE'
      );
      setOfflineBookings(todayBookings);
    });

    return () => {
      clearInterval(timeInterval);
      if (onlineUnsub) onlineUnsub();
      if (offlineUnsub) offlineUnsub();
    };
  }, []);

  const isGameCurrentlyOccupied = (game) => {
    const now = currentTime;
    const currentTimeStr = now.toTimeString().slice(0, 5);
    const today = now.toISOString().split('T')[0];

    // Check online bookings
    const onlineOccupied = onlineBookings.some(booking => {
      if (booking.gameId === game.id || booking.game?.id === game.id) {
        return isTimeCurrentlyActive(booking.time, currentTimeStr);
      }
      return false;
    });

    // Check offline bookings
    const offlineOccupied = offlineBookings.some(booking => {
      if (booking.board === game.id || booking.board === game.name) {
        return isTimeRangeCurrentlyActive(booking.startTime, booking.endTime, currentTimeStr);
      }
      return false;
    });

    return { online: onlineOccupied, offline: offlineOccupied };
  };

  const isTimeCurrentlyActive = (bookingTime, currentTime) => {
    // Assume 1-hour slots for online bookings
    const [bookingHour, bookingMin] = bookingTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    
    const bookingMinutes = bookingHour * 60 + bookingMin;
    const currentMinutes = currentHour * 60 + currentMin;
    
    return (currentMinutes >= bookingMinutes && currentMinutes < bookingMinutes + 60);
  };

  const isTimeRangeCurrentlyActive = (startTime, endTime, currentTime) => {
    if (!startTime || !endTime) return false;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = currentHour * 60 + currentMin;
    
    return (currentMinutes >= startMinutes && currentMinutes < endMinutes);
  };

  return (
    <div className={styles.currentOccupancy}>
      <div className={styles.header}>
        <h6 className={styles.title}>🎯 Current Game Status</h6>
        <span className={styles.time}>
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      <div className={styles.gamesList}>
        {games.map((game) => {
          const occupancy = isGameCurrentlyOccupied(game);
          const isOccupied = occupancy.online || occupancy.offline;
          
          return (
            <div 
              key={game.id} 
              className={`${styles.gameItem} ${isOccupied ? styles.occupied : styles.available}`}
            >
              <div className={styles.gameInfo}>
                <span className={styles.gameName}>{game.name}</span>
                <span className={styles.gameCategory}>{game.category || 'Standard'}</span>
              </div>
              
              <div className={styles.statusIndicator}>
                {isOccupied ? (
                  <div className={styles.occupiedStatus}>
                    <span className={styles.statusDot}></span>
                    <span className={styles.statusText}>
                      {occupancy.online && occupancy.offline ? 'Fully Occupied' : 
                       occupancy.online ? 'Online Booking' : 'Offline Booking'}
                    </span>
                  </div>
                ) : (
                  <div className={styles.availableStatus}>
                    <span className={styles.statusDot}></span>
                    <span className={styles.statusText}>Available</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className={styles.footer}>
        <span className={styles.liveIndicator}>
          <span className={styles.liveDot}></span>
          Live Updates
        </span>
        <span className={styles.summary}>
          {games.filter(game => isGameCurrentlyOccupied(game).online || isGameCurrentlyOccupied(game).offline).length} / {games.length} occupied
        </span>
      </div>
    </div>
  );
}
