import { useState } from 'react';
import styles from './QuickStats.module.css';

const QuickStats = ({ stats, onStatClick }) => {
  const [hoveredStat, setHoveredStat] = useState(null);

  const statItems = [
    {
      key: 'total',
      icon: '📊',
      value: stats.totalBookings || 0,
      label: 'Total Bookings',
      description: 'All-time bookings made',
      color: '#ffc107'
    },
    {
      key: 'upcoming',
      icon: '⏰',
      value: stats.upcomingBookings || 0,
      label: 'Upcoming',
      description: 'Confirmed future bookings',
      color: '#4CAF50'
    },
    {
      key: 'completed',
      icon: '✅',
      value: stats.completedBookings || 0,
      label: 'Completed',
      description: 'Successfully completed sessions',
      color: '#2196F3'
    },
    {
      key: 'spent',
      icon: '💰',
      value: `₹${stats.totalSpent || 0}`,
      label: 'Total Spent',
      description: 'Amount spent on bookings',
      color: '#FF9800'
    }
  ];

  const handleStatClick = (statKey) => {
    if (onStatClick) {
      onStatClick(statKey);
    }
  };

  return (
    <div className={styles.quickStats}>
      {statItems.map((stat) => (
        <div
          key={stat.key}
          className={`${styles.statCard} ${hoveredStat === stat.key ? styles.hovered : ''}`}
          onClick={() => handleStatClick(stat.key)}
          onMouseEnter={() => setHoveredStat(stat.key)}
          onMouseLeave={() => setHoveredStat(null)}
          style={{ '--stat-color': stat.color }}
        >
          <div className={styles.statIcon}>{stat.icon}</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statLabel}>{stat.label}</div>
            {hoveredStat === stat.key && (
              <div className={styles.statDescription}>{stat.description}</div>
            )}
          </div>
          <div className={styles.statAccent}></div>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;
