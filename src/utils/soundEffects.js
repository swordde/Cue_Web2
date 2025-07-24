// src/utils/soundEffects.js

let audioContext = null;

// Initialize audio context
const getAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.error('Failed to create audio context:', error);
    }
  }
  return audioContext;
};

// Play notification beep sound
export const playNotificationBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      console.log('No audio context available');
      return;
    }

    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create oscillator for beep
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
    
    console.log('Notification beep played');
  } catch (error) {
    console.error('Error playing notification beep:', error);
  }
};

// Enable audio (call this on user interaction)
export const enableAudio = () => {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    console.log('Audio enabled successfully');
  } catch (error) {
    console.error('Error enabling audio:', error);
  }
}; 