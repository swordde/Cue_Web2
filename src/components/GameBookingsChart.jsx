import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

/**
 * A component that displays game booking analytics using Recharts
 */
const GameBookingsChart = ({ bookings, games }) => {
  // State to track which game is selected for detailed view
  const [selectedGame, setSelectedGame] = useState(null);
  
  // Generate chart data based on bookings
  const chartData = useMemo(() => {
    if (!bookings || !games || games.length === 0) return [];

    // Get only top 5 games by bookings
    const gameBookingCounts = games.map(game => {
      const count = bookings.filter(b => b.game === game.id || b.game === game.name).length;
      return { ...game, count };
    });
    
    const topGames = [...gameBookingCounts]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Create flat zero-line data if no bookings exist
    // This ensures the chart always shows straight lines at zero
    if (bookings.length === 0 || topGames.length === 0) {
      const flatLineData = [];
      const today = new Date();
      
      // Use actual game names if available, otherwise use generic names
      // Limit to maximum 5 games for readability
      const actualGameCount = Math.min(games.length, 5);
      const sampleGameNames = actualGameCount > 0 
        ? games.slice(0, 5).map(game => game.name || `Game ${game.id}`) 
        : ["Game 1", "Game 2", "Game 3"]; // Default if no games at all
      
      for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dataPoint = { date: dateStr, total: 0 };
        sampleGameNames.forEach(game => {
          // Defensive: if game is object, use its name
          let gameName = typeof game === 'string' ? game : (game && typeof game.name === 'string' ? game.name : 'Unknown Game');
          dataPoint[gameName] = 0;
        });
        flatLineData.push(dataPoint);
      }
      return flatLineData;
    }
    
    // Group bookings by date for these top games
    const bookingsByDate = {};
    
    // Add data points for the last 14 days, even if no bookings
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!bookingsByDate[dateStr]) {
        bookingsByDate[dateStr] = { 
          date: dateStr,
          total: 0
        };
        
        // Initialize count for each game
        topGames.forEach(game => {
          bookingsByDate[dateStr][game.name] = 0;
        });
      }
    }
    
    // Add actual booking data
    bookings.forEach(booking => {
      if (!booking.date) return;
      // Defensive: ensure booking.game is string or object with name
      let bookingGameName = '';
      if (typeof booking.game === 'string') {
        bookingGameName = booking.game;
      } else if (booking.game && typeof booking.game === 'object' && typeof booking.game.name === 'string') {
        bookingGameName = booking.game.name;
      }
      // Initialize the date entry if it doesn't exist
      if (!bookingsByDate[booking.date]) {
        bookingsByDate[booking.date] = { 
          date: booking.date,
          total: 0
        };
        // Initialize count for each game
        topGames.forEach(game => {
          bookingsByDate[booking.date][game.name] = 0;
        });
      }
      // Find if this booking is for one of our top games
      const gameMatch = topGames.find(g => g.id === booking.game || g.name === booking.game || g.name === bookingGameName);
      if (gameMatch) {
        bookingsByDate[booking.date][gameMatch.name]++;
        bookingsByDate[booking.date].total++;
      }
    });
    
    // Convert to array and sort by date
    return Object.values(bookingsByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings, games]);
  
  // Colors for the chart lines/bars
  const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  // If no data, show a message
  if (chartData.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <p>No booking data available for the chart</p>
      </div>
    );
  }
  
  // Add a note if we're showing empty data
  const isEmptyDataset = bookings.length === 0;
  
  // Get game names that are in the data
  const gameNames = Object.keys(chartData[0] || {}).filter(key => 
    key !== 'date' && key !== 'total'
  );

  // Get game names that are in the data (these will be either real game names or our sample ones)
  const availableGameNames = Object.keys(chartData[0] || {}).filter(key => 
    key !== 'date' && key !== 'total'
  );
  
  // Use the game names from our data
  const displayGameNames = availableGameNames;
  
  // Show a more specific message based on game availability
  const emptyDataMessage = games.length > 0 
    ? `No booking data - showing ${displayGameNames.length} game${displayGameNames.length !== 1 ? 's' : ''}` 
    : "No booking data - showing baseline";

  return (
    <div className="d-flex flex-column h-100">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          {isEmptyDataset && (
            <span className="badge bg-light text-secondary">{emptyDataMessage}</span>
          )}
        </div>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-primary active">Last 14 Days</button>
        </div>
      </div>
      
      {/* Line Chart */}
      <div style={{ height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => {
                if (!date) return '';
                const d = new Date(date);
                if (isNaN(d.getTime())) return date;
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
            />
            <YAxis />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                boxShadow: '0 0 10px rgba(0,0,0,0.1)' 
              }} 
              itemStyle={{ padding: '2px 0' }}
              formatter={(value, name) => [`${value} bookings`, name]}
              labelFormatter={(date) => {
                if (!date) return 'Unknown Date';
                const d = new Date(date);
                if (isNaN(d.getTime())) return date;
                return `${d.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}`;
              }}
            />
            <Legend />
            {displayGameNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={name}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Game selector buttons */}
      <div className="d-flex flex-wrap justify-content-center my-4 gap-2">
        {displayGameNames.map((name, index) => (
          <button 
            key={name} 
            className={`btn ${selectedGame === name ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setSelectedGame(selectedGame === name ? null : name)}
            style={{ 
              borderColor: colors[index % colors.length],
              color: selectedGame === name ? '#fff' : colors[index % colors.length],
              backgroundColor: selectedGame === name ? colors[index % colors.length] : 'transparent'
            }}
          >
            {name}
          </button>
        ))}
      </div>
      
      {/* Individual game chart */}
      {selectedGame && (
        <div className="mt-3">
          <h5 className="text-center mb-3">
            Bookings for <span style={{ color: colors[displayGameNames.indexOf(selectedGame) % colors.length] }}>{selectedGame}</span>
          </h5>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => {
                    if (!date) return '';
                    const d = new Date(date);
                    if (isNaN(d.getTime())) return date;
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)' 
                  }} 
                  formatter={(value) => [`${value} bookings`, selectedGame]}
                  labelFormatter={(date) => {
                    if (!date) return 'Unknown Date';
                    const d = new Date(date);
                    if (isNaN(d.getTime())) return date;
                    return `${d.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}`;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selectedGame}
                  fill={colors[displayGameNames.indexOf(selectedGame) % colors.length]}
                  stroke={colors[displayGameNames.indexOf(selectedGame) % colors.length]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBookingsChart;
