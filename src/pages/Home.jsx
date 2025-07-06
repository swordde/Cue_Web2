// src/pages/Home.jsx
import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center min-vh-100">
      <h1 className="display-3 text-primary fw-bold mb-3">Club Booking</h1>
      <p className="lead mb-4">Book slots, track leaderboards, and earn rewards.</p>
  
      <Link to="/user" className="btn btn-outline-info btn-sm mt-2">
        User Panel
      </Link>
      <Link to="/dashboard" className="btn btn-primary btn-sm mt-3">
        Go to Dashboard
      </Link>
    </div>
  );
}
