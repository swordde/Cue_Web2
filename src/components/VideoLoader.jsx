import React, { useState, useRef, useEffect } from 'react';
import './VideoLoader.css';

const VideoLoader = ({ isVisible }) => {
  const [fadeClass, setFadeClass] = useState('fade-in');
  const videoRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      setFadeClass('fade-in');
    } else {
      setFadeClass('fade-out');
    }
  }, [isVisible]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Always try to play the video when component mounts
      const playVideo = async () => {
        try {
          await video.play();
          console.log('Video playing successfully');
        } catch (error) {
          console.log('Video autoplay failed:', error);
          // Fallback to animated background
        }
      };
      playVideo();
    }
  }, []);

  const handleVideoEnd = () => {
    console.log('Video ended');
  };

  const handleVideoError = (error) => {
    console.log('Video failed to load - using fallback background', error);
  };

  const handleVideoLoaded = () => {
    console.log('Video loaded successfully');
  };

  return (
    <div className={`video-loader ${fadeClass} ${!isVisible ? 'hidden' : ''}`}>
      {/* Animated background as fallback */}
      <div className="animated-background"></div>
      
      <video
        ref={videoRef}
        className="loading-video"
        muted
        autoPlay
        playsInline
        onEnded={handleVideoEnd}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
      >
        <source src="/assets/video-loading.mp4" type="video/mp4" />
        <source src="/assets/video-loading.webm" type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoLoader;
