import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { WorkerProvider } from './hooks/useWorker'
import { NotificationProvider } from './hooks/useNotifications'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WhoIsWorkingPage from './pages/WhoIsWorkingPage'
import DashboardPage from './pages/DashboardPage'
import PanelPage from './pages/PanelPage'
import HiveFormPage from './pages/HiveFormPage'
import QRScanPage from './pages/QRScanPage'
import WorkersPage from './pages/WorkersPage'
import AIAdvisorPage from './pages/AIAdvisorPage'
import HarvestPage from './pages/HarvestPage'
import ReportsPage from './pages/ReportsPage'
import ApiariesPage from './pages/ApiariesPage'
import FeedingPage from './pages/FeedingPage'
import TreatmentPage from './pages/TreatmentPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  return user ? children : <Navigate to="/giris" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <WorkerProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Toaster position="top-right" toastOptions={{
              style: { background: '#2e2e2e', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.1)' },
              success: { iconTheme: { primary: '#f5c518', secondary: '#1a1200' } }
            }} />
            <Routes>
              <Route path="/giris" element={<LoginPage />} />
              <Route path="/kayit" element={<RegisterPage />} />
              <Route path="/kim-calisiyor" element={<PrivateRoute><WhoIsWorkingPage /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/panel" element={<PrivateRoute><PanelPage /></PrivateRoute>} />
              <Route path="/kovan/:id" element={<PrivateRoute><HiveFormPage /></PrivateRoute>} />
              <Route path="/tara" element={<PrivateRoute><QRScanPage /></PrivateRoute>} />
              <Route path="/hasat" element={<PrivateRoute><HarvestPage /></PrivateRoute>} />
            <Route path="/raporlar" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
            <Route path="/arliklar" element={<PrivateRoute><ApiariesPage /></PrivateRoute>} />
            <Route path="/besleme" element={<PrivateRoute><FeedingPage /></PrivateRoute>} />
            <Route path="/tedavi" element={<PrivateRoute><TreatmentPage /></PrivateRoute>} />
            <Route path="/ai" element={<PrivateRoute><AIAdvisorPage /></PrivateRoute>} />
            <Route path="/calisanlar" element={<PrivateRoute><WorkersPage /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/kim-calisiyor" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </WorkerProvider>
    </AuthProvider>
  )
}
