import { Link } from 'react-router-dom';

export default function MainPage() {
  return (
    <div className="container py-5">
      <h1 className="display-4 text-center mb-5">Welcome to Club Booking</h1>
      <div className="row justify-content-center g-4">
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <h5 className="card-title mb-3">Home</h5>
              <p className="card-text text-center">See the welcome page and learn about the app.</p>
              <Link to="/" className="btn btn-primary mt-auto">Go to Home</Link>
              <Link to="/dashboard" className="btn btn-secondary mt-2">Go to Dashboard</Link>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <h5 className="card-title mb-3">Book a Slot</h5>
              <p className="card-text text-center">Book a game slot for Pool, Table Tennis, or Foosball.</p>
              <Link to="/book" className="btn btn-success mt-auto">Book Now</Link>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column align-items-center justify-content-center">
              <h5 className="card-title mb-3">User Panel</h5>
              <p className="card-text text-center">View your bookings and calendar in one place.</p>
              <Link to="/user" className="btn btn-info mt-auto">User Panel</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 