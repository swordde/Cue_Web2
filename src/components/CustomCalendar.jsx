import { useState } from 'react';
import styles from './CustomCalendar.module.css';

const CustomCalendar = ({ selectedDate, onDateSelect, bookingsData = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const today = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isPast = date < today.setHours(0, 0, 0, 0);
      
      // Check if this date has bookings and count them
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = bookingsData.filter(booking => booking.date === dateStr);
      const hasBookings = dayBookings.length > 0;
      const bookingCount = dayBookings.length;
      
      days.push({ 
        date, 
        day, 
        isPast, 
        hasBookings,
        bookingCount,
        bookings: dayBookings,
        dateString: dateStr
      });
    }
    
    return days;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Handle date selection - allow selecting any date with bookings
  const handleDateSelect = (day) => {
    if (day && onDateSelect) {
      // Allow selecting past dates if they have bookings (to view history)
      if (!day.isPast || day.hasBookings) {
        onDateSelect(day.date);
      }
    }
  };

  return (
    <div className={styles.calendarSection}>
      <div className={styles.calendarHeader}>
        <button className={styles.navButton} onClick={goToPreviousMonth}>
          ←
        </button>
        <h3 className={styles.monthYear}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button className={styles.navButton} onClick={goToNextMonth}>
          →
        </button>
      </div>
      
      <div className={styles.calendar}>
        <div className={styles.weekDays}>
          <div className={styles.weekDay}>Sun</div>
          <div className={styles.weekDay}>Mon</div>
          <div className={styles.weekDay}>Tue</div>
          <div className={styles.weekDay}>Wed</div>
          <div className={styles.weekDay}>Thu</div>
          <div className={styles.weekDay}>Fri</div>
          <div className={styles.weekDay}>Sat</div>
        </div>
        
        <div className={styles.calendarDays}>
          {generateCalendarDays().map((day, index) => (
            <div
              key={index}
              className={`${styles.calendarDay} 
                ${day && (!day.isPast || day.hasBookings) ? styles.available : ''} 
                ${day && selectedDate && day.date.toDateString() === selectedDate.toDateString() ? styles.selected : ''}
                ${day && day.isPast && !day.hasBookings ? styles.past : ''}
                ${day && day.isPast && day.hasBookings ? styles.pastWithBookings : ''}
                ${day && day.hasBookings && !day.isPast ? styles.hasBookings : ''}`}
              onClick={() => handleDateSelect(day)}
              title={day && day.hasBookings ? `${day.bookingCount} booking(s) on this date` : ''}
            >
              {day ? (
                <>
                  <span className={styles.dayNumber}>{day.day}</span>
                  {day.hasBookings && (
                    <div className={styles.bookingIndicator}>
                      <span className={styles.bookingCount}>{day.bookingCount}</span>
                    </div>
                  )}
                </>
              ) : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomCalendar;
