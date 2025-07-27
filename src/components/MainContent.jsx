import React from 'react';
import './MainContent.css';

const MainContent = ({ onGetStarted }) => {
  return (
    <div className="main-content">
      <div className="content-container">
        <h1 className="welcome-title">Welcome to Cue Club Café!</h1>
        <p className="welcome-text">
          Your premium gaming destination is ready. Experience the finest billiards, pool, and snooker tables with real-time booking and exceptional service.
        </p>
        <button className="cta-button" onClick={onGetStarted}>
          Start Playing
        </button>
      </div>
    </div>
  );
};

export default MainContent;
