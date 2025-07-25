import { Link } from 'react-router-dom';

export default function MainPage() {
  return (
    <div className="container-fluid py-3 py-md-5 px-3" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div className="text-center mb-5">
        <div className="mb-4" style={{
          fontSize: 'clamp(3rem, 8vw, 5rem)',
          lineHeight: '1'
        }}>
          🎮
        </div>
        <h1 className="mb-4" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 'bold',
          lineHeight: '1.2',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          Welcome to <span style={{
            color: '#ffd700',
            fontFamily: '"Abril Fatface", "Anton", "Bebas Neue", "Impact", "Arial Black", cursive',
            letterSpacing: '2px'
          }}>Cue Club Café</span>
        </h1>
        <p className="lead mb-5" style={{
          fontSize: 'clamp(1.1rem, 3vw, 1.3rem)',
          maxWidth: '800px',
          margin: '0 auto',
          opacity: '0.9',
          lineHeight: '1.6'
        }}>
          Your premier gaming and entertainment destination. Experience the thrill of competitive gaming, 
          celebrate special occasions, and enjoy exceptional hospitality - all under one roof.
        </p>
      </div>
      
      <div className="row justify-content-center g-3 g-md-4" style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="h-100 p-4 text-center" style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}>
            <div className="mb-3" style={{
              fontSize: 'clamp(2.5rem, 6vw, 3.5rem)'
            }}>🏠</div>
            <h5 className="mb-3" style={{
              fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)',
              fontWeight: '600'
            }}>Home Experience</h5>
            <p className="mb-4" style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              opacity: '0.8',
              lineHeight: '1.5'
            }}>
              Discover our premium gaming lounge with state-of-the-art equipment and comfortable ambiance.
            </p>
            <div className="d-flex flex-column gap-2">
              <Link 
                to="/" 
                className="btn btn-light" 
                style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 24px)',
                  borderRadius: '25px',
                  fontWeight: '500',
                  color: '#667eea'
                }}
              >
                🏠 Explore Home
              </Link>
              <Link 
                to="/dashboard" 
                className="btn btn-outline-light btn-sm" 
                style={{
                  fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)',
                  padding: 'clamp(8px, 1.8vw, 10px) clamp(16px, 4vw, 20px)',
                  borderRadius: '20px',
                  borderWidth: '2px'
                }}
              >
                Quick Dashboard Access
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="h-100 p-4 text-center" style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}>
            <div className="mb-3" style={{
              fontSize: 'clamp(2.5rem, 6vw, 3.5rem)'
            }}>🎯</div>
            <h5 className="mb-3" style={{
              fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)',
              fontWeight: '600'
            }}>Game Booking</h5>
            <p className="mb-4" style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              opacity: '0.8',
              lineHeight: '1.5'
            }}>
              Reserve your gaming sessions for Pool, Snooker, PS5, Xbox, Darts and more. Real-time availability.
            </p>
            <Link 
              to="/book" 
              className="btn btn-warning btn-lg w-100" 
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 4vw, 24px)',
                borderRadius: '25px',
                fontWeight: '600',
                color: '#333',
                boxShadow: '0 4px 15px rgba(255,193,7,0.3)'
              }}
            >
              🚀 Book Your Game
            </Link>
          </div>
        </div>
        
        <div className="col-12 col-sm-6 col-lg-4">
          <div className="h-100 p-4 text-center" style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          }}>
            <div className="mb-3" style={{
              fontSize: 'clamp(2.5rem, 6vw, 3.5rem)'
            }}>👤</div>
            <h5 className="mb-3" style={{
              fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)',
              fontWeight: '600'
            }}>User Dashboard</h5>
            <p className="mb-4" style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              opacity: '0.8',
              lineHeight: '1.5'
            }}>
              Track your bookings, view gaming history, manage preferences, and monitor your rewards.
            </p>
            <Link 
              to="/user" 
              className="btn btn-info btn-lg w-100" 
              style={{
                fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                padding: 'clamp(12px, 2.5vw, 16px) clamp(16px, 4vw, 24px)',
                borderRadius: '25px',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(23,162,184,0.3)'
              }}
            >
              📊 My Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="text-center mt-5 pt-4" style={{
        borderTop: '1px solid rgba(255,255,255,0.2)',
        maxWidth: '800px',
        margin: '4rem auto 0'
      }}>
        <h4 className="mb-3" style={{color: '#ffd700'}}>Why Choose Cue Club Café?</h4>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div style={{opacity: '0.9'}}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🏆</div>
              <small><strong>Premium Quality:</strong> Top-tier gaming equipment and comfortable environment</small>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div style={{opacity: '0.9'}}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>⚡</div>
              <small><strong>Real-time Booking:</strong> Instant reservations with live availability updates</small>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div style={{opacity: '0.9'}}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🎉</div>
              <small><strong>Complete Service:</strong> Gaming, events, food & beverages all in one place</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 