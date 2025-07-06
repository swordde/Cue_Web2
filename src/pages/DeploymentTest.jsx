import { useState } from 'react';

export default function DeploymentTest() {
  const [status, setStatus] = useState('Loading...');
  const [databaseStatus, setDatabaseStatus] = useState('Checking...');

  // Test localStorage
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    setStatus('localStorage working');
  } catch (error) {
    setStatus(`localStorage error: ${error.message}`);
  }

  // You can add more deployment tests here if needed

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-header">
          <h2>Deployment Test</h2>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h5>Basic Functionality</h5>
                  <p className="text-primary">{status}</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-body">
                  <h5>Database Utils</h5>
                  <p className="text-primary">{databaseStatus}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <h5>Environment Info:</h5>
            <ul>
              <li>User Agent: {navigator.userAgent}</li>
              <li>Platform: {navigator.platform}</li>
              <li>Language: {navigator.language}</li>
              <li>Cookies Enabled: {navigator.cookieEnabled ? 'Yes' : 'No'}</li>
              <li>Online: {navigator.onLine ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 