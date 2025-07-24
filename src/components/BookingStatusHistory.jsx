import React from 'react';

export default function BookingStatusHistory({ statusHistory = [], onClose }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    // Handle Firestore timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    
    // Handle regular date
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    
    // Handle string or number
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'text-warning';
      case 'confirmed':
        return 'text-success';
      case 'cancelled':
        return 'text-danger';
      case 'completed':
        return 'text-info';
      default:
        return 'text-secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'cancelled':
        return '❌';
      case 'completed':
        return '🏁';
      default:
        return '📝';
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{background: 'rgba(0,0,0,0.4)'}}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Booking Status History</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {statusHistory.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted">No status history available</p>
              </div>
            ) : (
              <div className="timeline">
                {statusHistory.map((entry, index) => (
                  <div key={index} className="timeline-item d-flex mb-3">
                    <div className="timeline-marker me-3">
                      <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center" 
                           style={{width: '40px', height: '40px'}}>
                        <span className="text-white fs-5">{getStatusIcon(entry.status)}</span>
                      </div>
                    </div>
                    <div className="timeline-content flex-grow-1">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className={`card-title mb-0 ${getStatusColor(entry.status)}`}>
                              {entry.status}
                            </h6>
                            <small className="text-muted">
                              {formatTimestamp(entry.timestamp)}
                            </small>
                          </div>
                          {entry.notes && (
                            <p className="card-text mb-2">{entry.notes}</p>
                          )}
                          <small className="text-muted">
                            Changed by: {entry.changedBy || 'System'}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 