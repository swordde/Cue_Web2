import React from "react";

const FUN_FACTS = [
  "Did you know? Table tennis balls can travel up to 70 mph!",
  "Fun fact: The longest table tennis rally lasted over 8 hours!",
  "Ping pong was once banned in the Soviet Union!",
  "It's called 'ping pong' in the US, 'table tennis' elsewhere!",
  "The fastest serve ever recorded was 116 km/h (72 mph)!"
];

function DollAnimation() {
  return (
    <div className="d-flex justify-content-center align-items-center mb-4" style={{ height: 120 }}>
      <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          <ellipse cx="40" cy="90" rx="28" ry="8" fill="#e0e7ef" />
          <g style={{
            transformOrigin: "40px 70px",
            animation: "bounce 1.5s infinite ease-in-out"
          }}>
            <circle cx="40" cy="50" r="30" fill="#f9c9c0" stroke="#eab1b1" strokeWidth="2" />
            <ellipse cx="40" cy="70" rx="18" ry="12" fill="#fff" />
            <ellipse cx="32" cy="45" rx="4" ry="6" fill="#fff" />
            <ellipse cx="48" cy="45" rx="4" ry="6" fill="#fff" />
            <circle cx="32" cy="47" r="2" fill="#333" />
            <circle cx="48" cy="47" r="2" fill="#333" />
            <ellipse cx="40" cy="60" rx="8" ry="4" fill="#eab1b1" />
            <ellipse cx="40" cy="60" rx="5" ry="2" fill="#fff" />
            <rect x="36" y="75" width="8" height="12" rx="4" fill="#f9c9c0" />
          </g>
        </g>
      </svg>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }
      `}</style>
    </div>
  );
}

export default function Loading() {
  const fact = React.useMemo(() => {
    return FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #e0c3fc 100%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        textAlign: 'center',
      }}
    >
      <DollAnimation />
      <h2 style={{ color: '#1877ff', fontWeight: 700, fontSize: 48, margin: 0, marginBottom: 12 }}>Loading...</h2>
      <p style={{ color: '#444', fontSize: 22, marginBottom: 32, textAlign: 'center', maxWidth: 500 }}>{fact}</p>
      <div
        style={{
          width: 56,
          height: 56,
          border: '6px solid #3b82f6',
          borderTop: '6px solid #e0e7ef',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }}
        aria-label="Loading spinner"
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
