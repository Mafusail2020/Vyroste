import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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
import PricingPage from './pages/PricingPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import NurseryRegisterPage from './pages/NurseryRegisterPage'
import AdminPage from './pages/AdminPage'
import ContactPage from './pages/ContactPage'
import BlogPage from './pages/BlogPage'

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 4000, style: { fontFamily: 'inherit', fontSize: '14px' } }}
      />
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
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/crops/add" element={<AddCropPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/nurseries/register" element={<NurseryRegisterPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
