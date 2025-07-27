import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoLoader from '../components/VideoLoader';
import MainContent from '../components/MainContent';

const IntroScreen = () => {
  const [showVideo, setShowVideo] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if intro was already shown in this session
    const introShown = sessionStorage.getItem('introShown');
    if (introShown) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Video phase: 5 seconds
    const videoTimer = setTimeout(() => {
      setShowVideo(false);
      setShowContent(true);
      
      // Content phase: 3 seconds
      const contentTimer = setTimeout(() => {
        sessionStorage.setItem('introShown', 'true');
        setIntroComplete(true);
        navigate('/dashboard', { replace: true });
      }, 3000);

      return () => clearTimeout(contentTimer);
    }, 5000);

    return () => clearTimeout(videoTimer);
  }, [navigate]);

  // Prevent rendering after navigation
  if (introComplete) {
    return null;
  }

  const handleGetStarted = () => {
    sessionStorage.setItem('introShown', 'true');
    setIntroComplete(true);
    navigate('/dashboard', { replace: true });
  };

  if (showVideo) {
    return <VideoLoader isVisible={true} />;
  }

  if (showContent) {
    return <MainContent onGetStarted={handleGetStarted} />;
  }

  return null;
};

export default IntroScreen;
