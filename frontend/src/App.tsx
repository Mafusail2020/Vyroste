import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import CalendarPage from './pages/CalendarPage'
import AddCropPage from './pages/AddCropPage'
import MapPage from './pages/MapPage'
import NurseryRegisterPage from './pages/NurseryRegisterPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth pages — no Layout shell */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected full-screen pages (own layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Marketing + app pages — inside Layout shell */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/crops/add" element={<AddCropPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/nurseries/register" element={<NurseryRegisterPage />} />
            <Route path="/admin" element={<AdminPage />} />
            {/* Slices 8-11 add routes here */}
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
