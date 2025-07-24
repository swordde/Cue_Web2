import React, { useState } from 'react';

const GameAnalyticsChart = ({ gameAnalytics, theme }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  if (!gameAnalytics || !gameAnalytics.dailyStats || gameAnalytics.dailyStats.length === 0) {
    return <div className="text-center text-muted py-4">No data available for this game</div>;
  }

  const { dailyStats } = gameAnalytics;

  // Calculate dimensions and scales
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? 500 : 600;
  const height = isMobile ? 200 : 250;
  const padding = { 
    top: 20, 
    right: isMobile ? 35 : 45, 
    bottom: isMobile ? 40 : 50, 
    left: isMobile ? 45 : 55 
  };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Data processing
  const maxBookings = Math.max(...dailyStats.map(d => d.totalBookings), 1);
  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);

  // Create points for bookings line
  const bookingPoints = dailyStats.map((day, index) => {
    const x = padding.left + (index * chartWidth) / (dailyStats.length - 1);
    const y = padding.top + chartHeight - (day.totalBookings / maxBookings) * chartHeight;
    return { x, y, value: day.totalBookings, day: day.dayName, date: day.date, ...day };
  });

  // Create points for revenue line (scaled)
  const revenuePoints = dailyStats.map((day, index) => {
    const x = padding.left + (index * chartWidth) / (dailyStats.length - 1);
    const y = padding.top + chartHeight - (day.revenue / maxRevenue) * chartHeight;
    return { x, y, value: day.revenue, day: day.dayName, date: day.date, ...day };
  });

  // Create path strings
  const bookingPath = bookingPoints.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  const revenuePath = revenuePoints.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  // Y-axis labels for bookings
  const bookingYLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = Math.round((maxBookings / 4) * i);
    const y = padding.top + chartHeight - (i / 4) * chartHeight;
    bookingYLabels.push({ value, y });
  }

  // Y-axis labels for revenue (right side)
  const revenueYLabels = [];
  for (let i = 0; i <= 4; i++) {
    const value = Math.round((maxRevenue / 4) * i);
    const y = padding.top + chartHeight - (i / 4) * chartHeight;
    revenueYLabels.push({ value, y });
  }

  return (
    <div className="position-relative">
      <style>{`
        .game-chart-point {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .game-chart-point:hover {
          filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.7));
        }
        .game-chart svg {
          overflow: visible;
        }
        @keyframes drawGameLine {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeInGamePoint {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-100 game-chart">
        {/* Grid lines */}
        <defs>
          <pattern id="gameGrid" width="80" height="20" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 20" fill="none" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gameGrid)" opacity="0.2"/>

        {/* Y-axis grid lines */}
        {bookingYLabels.map((label, index) => (
          <line
            key={index}
            x1={padding.left}
            y1={label.y}
            x2={padding.left + chartWidth}
            y2={label.y}
            stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
            strokeWidth="0.5"
            opacity="0.5"
          />
        ))}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke={theme === 'dark' ? '#6b7280' : '#374151'}
          strokeWidth="2"
        />

        {/* Left Y-axis (Bookings) */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#8b5cf6"
          strokeWidth="2"
        />

        {/* Right Y-axis (Revenue) */}
        <line
          x1={padding.left + chartWidth}
          y1={padding.top}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#f59e0b"
          strokeWidth="2"
        />

        {/* Booking line */}
        <path
          d={bookingPath}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: '500',
            strokeDashoffset: '500',
            animation: 'drawGameLine 1.5s ease-in-out forwards'
          }}
        />

        {/* Revenue line */}
        <path
          d={revenuePath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: '500',
            strokeDashoffset: '500',
            animation: 'drawGameLine 1.5s ease-in-out 0.3s forwards'
          }}
        />

        {/* Booking points */}
        {bookingPoints.map((point, index) => (
          <g key={`booking-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#8b5cf6"
              stroke="white"
              strokeWidth="2"
              style={{
                animation: `fadeInGamePoint 0.5s ease-in-out ${1.8 + index * 0.1}s forwards`,
                opacity: 0
              }}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              className="game-chart-point"
              onMouseEnter={(e) => {
                setHoveredPoint({
                  ...point,
                  type: 'booking'
                });
                setMousePosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{
                animation: `fadeInGamePoint 0.5s ease-in-out ${1.8 + index * 0.1}s forwards`,
                opacity: 0
              }}
            />
          </g>
        ))}

        {/* Revenue points */}
        {revenuePoints.map((point, index) => (
          <g key={`revenue-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#f59e0b"
              stroke="white"
              strokeWidth="2"
              style={{
                animation: `fadeInGamePoint 0.5s ease-in-out ${2.1 + index * 0.1}s forwards`,
                opacity: 0
              }}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="12"
              fill="transparent"
              className="game-chart-point"
              onMouseEnter={(e) => {
                setHoveredPoint({
                  ...point,
                  type: 'revenue'
                });
                setMousePosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{
                animation: `fadeInGamePoint 0.5s ease-in-out ${2.1 + index * 0.1}s forwards`,
                opacity: 0
              }}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {dailyStats.map((day, index) => {
          const x = padding.left + (index * chartWidth) / (dailyStats.length - 1);
          return (
            <g key={`x-label-${index}`}>
              <text
                x={x}
                y={padding.top + chartHeight + 15}
                textAnchor="middle"
                fill={theme === 'dark' ? '#d1d5db' : '#374151'}
                fontSize="10"
                fontWeight="bold"
              >
                {day.dayName}
              </text>
              <text
                x={x}
                y={padding.top + chartHeight + 28}
                textAnchor="middle"
                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize="8"
              >
                {new Date(day.date).getDate()}
              </text>
            </g>
          );
        })}

        {/* Left Y-axis labels (Bookings) */}
        {bookingYLabels.map((label, index) => (
          <text
            key={`y-left-${index}`}
            x={padding.left - 8}
            y={label.y + 3}
            textAnchor="end"
            fill="#8b5cf6"
            fontSize="10"
            fontWeight="500"
          >
            {label.value}
          </text>
        ))}

        {/* Right Y-axis labels (Revenue) */}
        {revenueYLabels.map((label, index) => (
          <text
            key={`y-right-${index}`}
            x={padding.left + chartWidth + 8}
            y={label.y + 3}
            textAnchor="start"
            fill="#f59e0b"
            fontSize="10"
            fontWeight="500"
          >
            ₹{label.value}
          </text>
        ))}

        {/* Chart title */}
        <text
          x={width / 2}
          y={12}
          textAnchor="middle"
          fill={theme === 'dark' ? '#f3f4f6' : '#111827'}
          fontSize="12"
          fontWeight="bold"
        >
          {gameAnalytics.game.name} - Daily Performance
        </text>
      </svg>

      {/* Legend */}
      <div className="d-flex justify-content-center mt-2 gap-3">
        <div className="d-flex align-items-center">
          <div className="me-1" style={{width: '16px', height: '2px', backgroundColor: '#8b5cf6'}}></div>
          <small className={`${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
            Bookings
          </small>
        </div>
        <div className="d-flex align-items-center">
          <div className="me-1" style={{width: '16px', height: '2px', backgroundColor: '#f59e0b'}}></div>
          <small className={`${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
            Revenue
          </small>
        </div>
      </div>

      {/* Custom Tooltip */}
      {hoveredPoint && (
        <div
          className={`position-fixed border-0 shadow-lg rounded p-2 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : 'bg-white text-dark'}`}
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            zIndex: 1000,
            pointerEvents: 'none',
            fontSize: '11px',
            minWidth: '140px'
          }}
        >
          <div className="fw-bold mb-1">{hoveredPoint.day}</div>
          <div className="text-muted small mb-1">{new Date(hoveredPoint.date).toLocaleDateString()}</div>
          {hoveredPoint.type === 'booking' ? (
            <>
              <div className="d-flex justify-content-between">
                <span>Total Bookings:</span>
                <span className="fw-bold" style={{color: '#8b5cf6'}}>{hoveredPoint.value}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="small">Online:</span>
                <span className="small text-info">{hoveredPoint.onlineBookings}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="small">Offline:</span>
                <span className="small text-warning">{hoveredPoint.offlineBookings}</span>
              </div>
              {hoveredPoint.peakTime !== 'N/A' && (
                <div className="d-flex justify-content-between">
                  <span className="small">Peak Time:</span>
                  <span className="small text-success">{hoveredPoint.peakTime}</span>
                </div>
              )}
            </>
          ) : (
            <div className="d-flex justify-content-between">
              <span>Revenue:</span>
              <span className="fw-bold text-success">₹{hoveredPoint.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameAnalyticsChart;
