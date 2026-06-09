import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth pages — no Layout shell */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Marketing + app pages — inside Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />

          {/* Protected pages (Slices 3-11 added here) */}
          <Route element={<ProtectedRoute />}>
            {/* placeholder — Slice 3 will add /onboarding, /dashboard */}
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
