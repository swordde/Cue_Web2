import React, { useEffect, useState, useRef } from "react";

export default function OtpInput({ length = 6, onComplete, onOtpChange }) {
  const [otp, setOtp] = useState(Array(length).fill(""));
  const inputRefs = useRef([]);

  const handleChange = (e, idx) => {
    const value = e.target.value.replace(/\D/, ""); // only digits
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);

    // Call the parent's onOtpChange if provided
    if (onOtpChange) {
      onOtpChange(newOtp.join(""));
    }

    // Auto-focus next input if value entered
    if (value && idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    // If value cleared, focus previous
    if (!value && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (otp[idx]) {
        const newOtp = [...otp];
        newOtp[idx] = '';
        setOtp(newOtp);
        if (onOtpChange) onOtpChange(newOtp.join(""));
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    if (pastedData.length === length) {
      const newOtp = pastedData.split('').slice(0, length);
      setOtp(newOtp);
      if (onOtpChange) {
        onOtpChange(newOtp.join(""));
      }
      // Focus last input
      inputRefs.current[length - 1]?.focus();
    }
  };

  useEffect(() => {
    if (otp.join("").length === length) {
      onComplete(otp.join(""));
    } else {
      onComplete(otp.join("")); // Always call onComplete for partial input too
    }
  }, [otp, length, onComplete]);

  return (
    <div style={{
      display: 'flex',
      gap: 18,
      justifyContent: 'center',
      margin: '24px 0',
      flexWrap: 'wrap',
      width: '100%',
      maxWidth: 420,
      minHeight: 80
    }}>
      {otp.map((digit, idx) => (
        <input
          key={idx}
          ref={el => (inputRefs.current[idx] = el)}
          type="text"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          style={{
            width: 56,
            height: 56,
            background: '#fff',
            color: '#222',
            fontSize: 28,
            fontWeight: 500,
            textAlign: 'center',
            border: digit ? '2px solid #22d47b' : '2px solid #444',
            borderRadius: 12,
            outline: 'none',
            transition: 'border 0.2s',
            boxShadow: digit ? '0 0 0 2px #22d47b' : 'none',
            margin: 0,
            flex: '0 1 56px',
            boxSizing: 'border-box',
          }}
          inputMode="numeric"
          pattern="[0-9]*"
        />
      ))}
    </div>
  );
} 