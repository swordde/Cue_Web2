import React, { useState } from 'react';
import { userService } from '../firebase/services';
import { useToast } from '../contexts/ToastContext';

const AdminPhoneLookupModal = ({ isOpen, onClose, onUserSelected, theme = 'light' }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [fetchedUser, setFetchedUser] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { showSuccess, showError } = useToast();

  // Function to fetch user by phone
  const handlePhoneLookup = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      showError('Please enter a valid 10-digit phone number');
      return;
    }

    setLookupLoading(true);
    setNotFound(false);
    try {
      const existingUser = await userService.getUserByMobile(phoneNumber);
      if (existingUser) {
        setFetchedUser(existingUser);
        showSuccess(`User found: ${existingUser.name || existingUser.username}`);
      } else {
        setFetchedUser(null);
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      showError('Error occurred while searching for user');
      setFetchedUser(null);
      setNotFound(false);
    } finally {
      setLookupLoading(false);
    }
  };

  // Handle user selection
  const handleSelectUser = () => {
    if (fetchedUser && onUserSelected) {
      onUserSelected(fetchedUser);
      handleClose();
    }
  };

  // Close modal and reset state
  const handleClose = () => {
    setPhoneNumber('');
    setFetchedUser(null);
    setNotFound(false);
    setLookupLoading(false);
    onClose();
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePhoneLookup();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}>
          <div className={`modal-header ${theme === 'dark' ? 'border-secondary' : ''}`}>
            <h5 className="modal-title">
              <i className="fas fa-search me-2"></i>
              Phone Number Lookup
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">Phone Number</label>
              <div className="input-group">
                <span className="input-group-text">+91</span>
                <input
                  type="tel"
                  className={`form-control ${theme === 'dark' ? 'bg-dark text-light border-secondary' : ''}`}
                  placeholder="Enter 10-digit phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={handleKeyPress}
                  maxLength={10}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handlePhoneLookup}
                  disabled={lookupLoading || phoneNumber.length < 10}
                >
                  {lookupLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                  ) : (
                    <i className="fas fa-search"></i>
                  )}
                </button>
              </div>
            </div>

            {/* User Found Display */}
            {fetchedUser && (
              <div className="alert alert-success">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="mb-1">
                      <i className="fas fa-user-check me-2"></i>
                      User Found!
                    </h6>
                    <p className="mb-1"><strong>Name:</strong> {fetchedUser.name || fetchedUser.username}</p>
                    <p className="mb-1"><strong>Phone:</strong> {fetchedUser.mobile}</p>
                    <p className="mb-1"><strong>Email:</strong> {fetchedUser.email || 'Not provided'}</p>
                    {fetchedUser.clubCoins !== undefined && (
                      <p className="mb-0"><strong>Coins:</strong> {fetchedUser.clubCoins}</p>
                    )}
                  </div>
                  <div>
                    <button
                      className="btn btn-success"
                      onClick={handleSelectUser}
                    >
                      <i className="fas fa-check me-2"></i>
                      Select User
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* User Not Found */}
            {notFound && (
              <div className="alert alert-warning">
                <h6 className="mb-1">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  User Not Found
                </h6>
                <p className="mb-0">
                  No user found with phone number: <strong>+91{phoneNumber}</strong>
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className={`alert ${theme === 'dark' ? 'alert-dark' : 'alert-light'} mt-3`}>
              <small>
                <i className="fas fa-info-circle me-2"></i>
                Enter a 10-digit phone number to search for existing users in the database.
              </small>
            </div>
          </div>

          <div className={`modal-footer ${theme === 'dark' ? 'border-secondary' : ''}`}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Close
            </button>
            {phoneNumber.length === 10 && !fetchedUser && !lookupLoading && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePhoneLookup}
              >
                <i className="fas fa-search me-2"></i>
                Search Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPhoneLookupModal;
