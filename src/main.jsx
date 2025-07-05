import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import UserPanel from './pages/UserPanel.jsx'
import MainPage from './pages/MainPage.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import BookGame from './pages/BookGame.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/main" element={<MainPage />} />
        <Route path="/" element={<Home />} />
        <Route path="/book" element={<BookGame />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/user" element={<UserPanel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Add more routes here as needed */}
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
