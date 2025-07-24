import { Link } from 'react-router-dom';

export default function MainPage() {
  return (
    <div className="container-fluid py-3 py-md-5 px-3" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)'
    }}>
      <h1 className="text-center mb-4 mb-md-5" style={{
        fontSize: 'clamp(2rem, 6vw, 3.5rem)',
        fontWeight: 'bold',
        color: '#343a40',
        lineHeight: '1.2'
      }}>
        🎮 Welcome to Club Booking
      </h1>
      
      <div className="row justify-content-center g-3 g-md-4" style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card h-100 shadow-sm border-0" style={{
            borderRadius: '16px',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
              <div className="mb-3" style={{
                fontSize: 'clamp(2rem, 6vw, 3rem)'
              }}>🏠</div>
              <h5 className="card-title mb-3" style={{
                fontSize: 'clamp(1.1rem, 3.5vw, 1.25rem)',
                fontWeight: '600'
              }}>Home</h5>
              <p className="card-text text-center flex-grow-1" style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                color: '#6c757d',
                lineHeight: '1.4'
              }}>
                See the welcome page and learn about the app.
              </p>
              <div className="d-flex flex-column gap-2 w-100 mt-auto">
                <Link 
                  to="/" 
                  className="btn btn-primary" 
                  style={{
                    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                    padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
                    borderRadius: '25px',
                    fontWeight: '500'
                  }}
                >
                  Go to Home
                </Link>
                <Link 
                  to="/dashboard" 
                  className="btn btn-secondary" 
                  style={{
                    fontSize: 'clamp(0.85rem, 2.2vw, 0.9rem)',
                    padding: 'clamp(6px, 1.8vw, 10px) clamp(16px, 4vw, 24px)',
                    borderRadius: '20px'
                  }}
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card h-100 shadow-sm border-0" style={{
            borderRadius: '16px',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
              <div className="mb-3" style={{
                fontSize: 'clamp(2rem, 6vw, 3rem)'
              }}>🎯</div>
              <h5 className="card-title mb-3" style={{
                fontSize: 'clamp(1.1rem, 3.5vw, 1.25rem)',
                fontWeight: '600'
              }}>Book a Slot</h5>
              <p className="card-text text-center flex-grow-1" style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                color: '#6c757d',
                lineHeight: '1.4'
              }}>
                Book a game slot for Pool, Table Tennis, or Foosball.
              </p>
              <Link 
                to="/book" 
                className="btn btn-success mt-auto w-100" 
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  padding: 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 24px)',
                  borderRadius: '25px',
                  fontWeight: '500'
                }}
              >
                🚀 Book Now
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="card h-100 shadow-sm border-0" style={{
            borderRadius: '16px',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <div className="card-body d-flex flex-column align-items-center justify-content-center text-center p-4">
              <div className="mb-3" style={{
                fontSize: 'clamp(2rem, 6vw, 3rem)'
              }}>👤</div>
              <h5 className="card-title mb-3" style={{
                fontSize: 'clamp(1.1rem, 3.5vw, 1.25rem)',
                fontWeight: '600'
              }}>User Panel</h5>
              <p className="card-text text-center flex-grow-1" style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                color: '#6c757d',
                lineHeight: '1.4'
              }}>
                View your bookings and calendar in one place.
              </p>
              <Link 
                to="/user" 
                className="btn btn-info mt-auto w-100" 
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  padding: 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 24px)',
                  borderRadius: '25px',
                  fontWeight: '500'
                }}
              >
                📋 User Panel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 