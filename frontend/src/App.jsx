import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded Page Components
const Login = lazy(() => import('./pages/Login'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const ProfessionalRegister = lazy(() => import('./pages/ProfessionalRegister'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

// Loading Fallback Component
const PageLoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    color: '#4a4e69', 
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    fontSize: '14px',
    fontWeight: '500'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '32px', 
        height: '32px', 
        border: '3px solid #e2e8f0', 
        borderTop: '3px solid #81b29a', 
        borderRadius: '50%', 
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px auto' 
      }} />
      <span>Loading MindTrack module...</span>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Default Route: Redirect / to /login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/pro-register" element={<ProfessionalRegister />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Standard User Route */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Professional Route */}
            <Route 
              path="/pro-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['professional']}>
                  <ProfessionalDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Admin Route */}
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;