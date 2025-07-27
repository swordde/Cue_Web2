import React, { useState, useCallback } from 'react';
import { userService } from '../firebase/services';
import { useToast } from '../contexts/ToastContext';

const PhoneLookup = ({ 
  value, 
  onChange, 
  placeholder = "Enter phone number",
  className = "",
  style = {},
  disabled = false,
  showToasts = true,
  onUserFound = null,
  onUserNotFound = null,
  maxLength = 10,
  required = false,
  variant = 'default' // 'default', 'admin'
}) => {
  const [lookupLoading, setLookupLoading] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);
  const [isUserFound, setIsUserFound] = useState(false);
  const { showSuccess, showInfo } = useToast();

  // Debounced phone lookup function
  const fetchUserByPhone = useCallback(async (phoneNumber) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setFetchedUser(null);
      setIsUserFound(false);
      if (onUserNotFound) onUserNotFound(null);
      return;
    }

    setLookupLoading(true);
    try {
      const existingUser = await userService.getUserByMobile(phoneNumber);
      if (existingUser) {
        setFetchedUser(existingUser);
        setIsUserFound(true);
        if (onUserFound) onUserFound(existingUser);
        if (showToasts) {
          showSuccess(`User found: ${existingUser.name || existingUser.username}`);
        }
      } else {
        setFetchedUser(null);
        setIsUserFound(false);
        if (onUserNotFound) onUserNotFound(phoneNumber);
        if (showToasts) {
          showInfo('New user - please proceed with registration');
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setFetchedUser(null);
      setIsUserFound(false);
      if (onUserNotFound) onUserNotFound(null);
    } finally {
      setLookupLoading(false);
    }
  }, [onUserFound, onUserNotFound, showToasts, showSuccess, showInfo]);

  // Handle phone number change
  const handlePhoneChange = (inputValue) => {
    const cleanValue = inputValue.replace(/\D/g, "");
    onChange(cleanValue);
    
    // Auto-fetch user when phone number is complete (10 digits)
    if (cleanValue.length === 10) {
      fetchUserByPhone(cleanValue);
    } else {
      setFetchedUser(null);
      setIsUserFound(false);
      if (onUserNotFound) onUserNotFound(null);
    }
  };

  // Render user status message
  const renderUserStatus = () => {
    if (variant === 'admin') {
      if (fetchedUser) {
        return (
          <div className="alert alert-warning mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
            ⚠️ User <strong>{fetchedUser.name || fetchedUser.username}</strong> already exists with this number!
            <br />
            <small>Email: {fetchedUser.email || 'Not provided'}</small>
            {fetchedUser.clubCoins !== undefined && (
              <><br /><small>Coins: {fetchedUser.clubCoins}</small></>
            )}
          </div>
        );
      }
      if (value.length === 10 && !isUserFound && !lookupLoading) {
        return (
          <div className="alert alert-success mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
            ✅ Phone number available for registration!
          </div>
        );
      }
    } else {
      // Default styling for login/signup pages
      if (fetchedUser) {
        return (
          <div className="user-found-message">
            ✅ Welcome back, <strong>{fetchedUser.name || fetchedUser.username}</strong>!
          </div>
        );
      }
      if (value.length === 10 && !isUserFound && !lookupLoading) {
        return (
          <div className="user-not-found-message">
            ⚠️ Phone number not registered. Please use the Sign Up tab to register.
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          type="tel"
          maxLength={maxLength}
          className={className}
          style={style}
          placeholder={placeholder}
          value={value}
          onChange={e => handlePhoneChange(e.target.value)}
          disabled={disabled}
          required={required}
        />
        {lookupLoading && (
          <div style={{ 
            position: 'absolute', 
            right: variant === 'admin' ? '10px' : '8px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: '#FFC107',
            fontSize: '0.9rem',
            animation: 'pulse 1s infinite'
          }}>
            🔍
          </div>
        )}
      </div>
      {renderUserStatus()}
    </div>
  );
};

export default PhoneLookup;
