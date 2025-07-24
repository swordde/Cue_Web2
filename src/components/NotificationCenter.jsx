import { useState, useEffect } from 'react';
import styles from './NotificationCenter.module.css';

const NotificationCenter = ({ user, bookings }) => {
  const [notifications, setNotifications] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    generateNotifications();
  }, [bookings, user]);

  const generateNotifications = () => {
    const now = new Date();
    const notifications = [];

    // Check for upcoming bookings (within 24 hours)
    const upcomingBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date + 'T' + booking.time);
      const timeDiff = bookingDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);
      return hoursDiff > 0 && hoursDiff <= 24 && booking.status === 'confirmed';
    });

    upcomingBookings.forEach(booking => {
      const bookingDate = new Date(booking.date + 'T' + booking.time);
      const timeDiff = bookingDate.getTime() - now.getTime();
      const hoursDiff = Math.floor(timeDiff / (1000 * 3600));
      
      notifications.push({
        id: `upcoming-${booking.id}`,
        type: 'reminder',
        icon: '⏰',
        title: 'Upcoming Booking',
        message: `Your ${booking.game} session starts in ${hoursDiff} hours`,
        time: new Date(),
        priority: 'high',
        action: {
          label: 'View Details',
          callback: () => console.log('View booking details')
        }
      });
    });

    // Check for pending bookings
    const pendingBookings = bookings.filter(booking => booking.status === 'pending');
    if (pendingBookings.length > 0) {
      notifications.push({
        id: 'pending-bookings',
        type: 'info',
        icon: '📋',
        title: 'Pending Confirmations',
        message: `You have ${pendingBookings.length} booking${pendingBookings.length > 1 ? 's' : ''} awaiting confirmation`,
        time: new Date(),
        priority: 'medium'
      });
    }

    // Welcome message for new users
    if (bookings.length === 0) {
      notifications.push({
        id: 'welcome',
        type: 'welcome',
        icon: '🎉',
        title: 'Welcome to Cue Club!',
        message: 'Ready to book your first game? Explore our gaming options and reserve your slot.',
        time: new Date(),
        priority: 'low',
        action: {
          label: 'Book Now',
          callback: () => window.location.href = '#/book'
        }
      });
    }

    // Recent activity summary
    const recentBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.createdAt || booking.date);
      const daysDiff = (now.getTime() - bookingDate.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });

    if (recentBookings.length > 0 && bookings.length > 1) {
      notifications.push({
        id: 'weekly-summary',
        type: 'summary',
        icon: '📊',
        title: 'Weekly Activity',
        message: `You've made ${recentBookings.length} booking${recentBookings.length > 1 ? 's' : ''} this week`,
        time: new Date(),
        priority: 'low'
      });
    }

    setNotifications(notifications.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }));
  };

  const getNotificationClass = (type) => {
    switch (type) {
      case 'reminder': return styles.notificationReminder;
      case 'info': return styles.notificationInfo;
      case 'welcome': return styles.notificationWelcome;
      case 'summary': return styles.notificationSummary;
      default: return styles.notificationDefault;
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 3);

  if (notifications.length === 0) {
    return (
      <div className={styles.notificationCenter}>
        <div className={styles.notificationHeader}>
          <h3 className={styles.notificationTitle}>
            <span className={styles.notificationIcon}>🔔</span>
            Notifications
          </h3>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔕</div>
          <p className={styles.emptyMessage}>All caught up!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.notificationCenter}>
      <div className={styles.notificationHeader}>
        <h3 className={styles.notificationTitle}>
          <span className={styles.notificationIcon}>🔔</span>
          Notifications
          {notifications.length > 0 && (
            <span className={styles.notificationCount}>{notifications.length}</span>
          )}
        </h3>
        {notifications.length > 3 && (
          <button
            className={styles.toggleButton}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `View All (${notifications.length})`}
          </button>
        )}
      </div>
      
      <div className={styles.notificationList}>
        {displayedNotifications.map(notification => (
          <div
            key={notification.id}
            className={`${styles.notificationItem} ${getNotificationClass(notification.type)}`}
          >
            <div className={styles.notificationContent}>
              <div className={styles.notificationMeta}>
                <span className={styles.notificationItemIcon}>{notification.icon}</span>
                <span className={styles.notificationTime}>{formatTime(notification.time)}</span>
                <button
                  className={styles.dismissButton}
                  onClick={() => dismissNotification(notification.id)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
              <h4 className={styles.notificationItemTitle}>{notification.title}</h4>
              <p className={styles.notificationMessage}>{notification.message}</p>
              {notification.action && (
                <button
                  className={styles.notificationAction}
                  onClick={notification.action.callback}
                >
                  {notification.action.label}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
