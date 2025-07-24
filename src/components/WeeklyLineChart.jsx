import React, { useState } from 'react';

const WeeklyLineChart = ({ dailyStats, theme }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  if (!dailyStats || dailyStats.length === 0) {
    return <div className="text-center text-muted py-4">No data available</div>;
  }

  // Calculate dimensions and scales
  const isMobile = window.innerWidth < 768;
  const width = isMobile ? 600 : 800;
  const height = isMobile ? 250 : 300;
  const padding = { 
    top: 20, 
    right: isMobile ? 40 : 50, 
    bottom: isMobile ? 50 : 60, 
    left: isMobile ? 50 : 60 
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
    return { x, y, value: day.totalBookings, day: day.dayName, date: day.date };
  });

  // Create points for revenue line (scaled)
  const revenuePoints = dailyStats.map((day, index) => {
    const x = padding.left + (index * chartWidth) / (dailyStats.length - 1);
    const y = padding.top + chartHeight - (day.revenue / maxRevenue) * chartHeight;
    return { x, y, value: day.revenue, day: day.dayName, date: day.date };
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
  for (let i = 0; i <= 5; i++) {
    const value = Math.round((maxBookings / 5) * i);
    const y = padding.top + chartHeight - (i / 5) * chartHeight;
    bookingYLabels.push({ value, y });
  }

  // Y-axis labels for revenue (right side)
  const revenueYLabels = [];
  for (let i = 0; i <= 5; i++) {
    const value = Math.round((maxRevenue / 5) * i);
    const y = padding.top + chartHeight - (i / 5) * chartHeight;
    revenueYLabels.push({ value, y });
  }

  return (
    <div className="position-relative">
      <style>{`
        .chart-point {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .chart-point:hover {
          filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.5));
        }
        svg {
          overflow: visible;
        }
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeInPoint {
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
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-100">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="100" height="20" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 20" fill="none" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3"/>

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
            opacity="0.7"
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
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Right Y-axis (Revenue) */}
        <line
          x1={padding.left + chartWidth}
          y1={padding.top}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#10b981"
          strokeWidth="2"
        />

        {/* Booking line */}
        <path
          d={bookingPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: '1000',
            strokeDashoffset: '1000',
            animation: 'drawLine 2s ease-in-out forwards'
          }}
        />

        {/* Revenue line */}
        <path
          d={revenuePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: '1000',
            strokeDashoffset: '1000',
            animation: 'drawLine 2s ease-in-out 0.5s forwards'
          }}
        />

        {/* Booking points */}
        {bookingPoints.map((point, index) => (
          <g key={`booking-${index}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
              style={{
                animation: `fadeInPoint 0.6s ease-in-out ${2.5 + index * 0.1}s forwards`,
                opacity: 0
              }}
            />
            {/* Tooltip trigger area */}
            <circle
              cx={point.x}
              cy={point.y}
              r="15"
              fill="transparent"
              className="chart-point"
              onMouseEnter={(e) => {
                setHoveredPoint({
                  ...point,
                  type: 'booking',
                  onlineBookings: dailyStats[index].onlineBookings,
                  offlineBookings: dailyStats[index].offlineBookings
                });
                setMousePosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{
                animation: `fadeInPoint 0.6s ease-in-out ${2.5 + index * 0.1}s forwards`,
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
              r="5"
              fill="#10b981"
              stroke="white"
              strokeWidth="2"
              style={{
                animation: `fadeInPoint 0.6s ease-in-out ${3 + index * 0.1}s forwards`,
                opacity: 0
              }}
            />
            {/* Tooltip trigger area */}
            <circle
              cx={point.x}
              cy={point.y}
              r="15"
              fill="transparent"
              className="chart-point"
              onMouseEnter={(e) => {
                setHoveredPoint({
                  ...point,
                  type: 'revenue'
                });
                setMousePosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{
                animation: `fadeInPoint 0.6s ease-in-out ${3 + index * 0.1}s forwards`,
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
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                fill={theme === 'dark' ? '#d1d5db' : '#374151'}
                fontSize="12"
                fontWeight="bold"
              >
                {day.dayName}
              </text>
              <text
                x={x}
                y={padding.top + chartHeight + 35}
                textAnchor="middle"
                fill={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize="10"
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
            x={padding.left - 10}
            y={label.y + 4}
            textAnchor="end"
            fill="#3b82f6"
            fontSize="11"
            fontWeight="500"
          >
            {label.value}
          </text>
        ))}

        {/* Right Y-axis labels (Revenue) */}
        {revenueYLabels.map((label, index) => (
          <text
            key={`y-right-${index}`}
            x={padding.left + chartWidth + 10}
            y={label.y + 4}
            textAnchor="start"
            fill="#10b981"
            fontSize="11"
            fontWeight="500"
          >
            ₹{label.value}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={padding.left - 40}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          fill="#3b82f6"
          fontSize="12"
          fontWeight="bold"
          transform={`rotate(-90 ${padding.left - 40} ${padding.top + chartHeight / 2})`}
        >
          Bookings
        </text>

        <text
          x={padding.left + chartWidth + 40}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          fill="#10b981"
          fontSize="12"
          fontWeight="bold"
          transform={`rotate(90 ${padding.left + chartWidth + 40} ${padding.top + chartHeight / 2})`}
        >
          Revenue (₹)
        </text>

        {/* Chart title */}
        <text
          x={width / 2}
          y={15}
          textAnchor="middle"
          fill={theme === 'dark' ? '#f3f4f6' : '#111827'}
          fontSize="14"
          fontWeight="bold"
        >
          Weekly Booking & Revenue Trends
        </text>
      </svg>

      {/* Legend */}
      <div className="d-flex justify-content-center mt-3 gap-4">
        <div className="d-flex align-items-center">
          <div className="me-2" style={{width: '20px', height: '3px', backgroundColor: '#3b82f6'}}></div>
          <small className={theme === 'dark' ? 'text-light' : 'text-dark'}>
            <strong>Bookings</strong> (Left Axis)
          </small>
        </div>
        <div className="d-flex align-items-center">
          <div className="me-2" style={{width: '20px', height: '3px', backgroundColor: '#10b981'}}></div>
          <small className={theme === 'dark' ? 'text-light' : 'text-dark'}>
            <strong>Revenue</strong> (Right Axis)
          </small>
        </div>
      </div>

      {/* Summary stats below chart */}
      <div className="row mt-3 g-2">
        <div className="col-6 col-md-3">
          <div className={`text-center p-2 rounded ${theme === 'dark' ? 'bg-dark border' : 'bg-light'}`}>
            <div className="fw-bold text-primary">{Math.max(...dailyStats.map(d => d.totalBookings))}</div>
            <small className="text-muted">Peak Bookings</small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className={`text-center p-2 rounded ${theme === 'dark' ? 'bg-dark border' : 'bg-light'}`}>
            <div className="fw-bold text-success">₹{Math.max(...dailyStats.map(d => d.revenue))}</div>
            <small className="text-muted">Peak Revenue</small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className={`text-center p-2 rounded ${theme === 'dark' ? 'bg-dark border' : 'bg-light'}`}>
            <div className="fw-bold text-info">{(dailyStats.reduce((sum, d) => sum + d.totalBookings, 0) / dailyStats.length).toFixed(1)}</div>
            <small className="text-muted">Avg Bookings</small>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className={`text-center p-2 rounded ${theme === 'dark' ? 'bg-dark border' : 'bg-light'}`}>
            <div className="fw-bold text-warning">₹{(dailyStats.reduce((sum, d) => sum + d.revenue, 0) / dailyStats.length).toFixed(0)}</div>
            <small className="text-muted">Avg Revenue</small>
          </div>
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
            fontSize: '12px',
            minWidth: '120px'
          }}
        >
          <div className="fw-bold mb-1">{hoveredPoint.day}</div>
          <div className="text-muted small mb-1">{new Date(hoveredPoint.date).toLocaleDateString()}</div>
          {hoveredPoint.type === 'booking' ? (
            <>
              <div className="d-flex justify-content-between">
                <span>Total Bookings:</span>
                <span className="fw-bold text-primary">{hoveredPoint.value}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="small">Online:</span>
                <span className="small text-info">{hoveredPoint.onlineBookings}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="small">Offline:</span>
                <span className="small text-warning">{hoveredPoint.offlineBookings}</span>
              </div>
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

export default WeeklyLineChart;
