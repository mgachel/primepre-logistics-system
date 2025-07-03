import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetCode from './pages/VerifyResetCode';
import ResetPassword from './pages/ResetPassword';
import authService from './services/authService';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Protected routes - will redirect to login if not authenticated */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div className="p-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="mb-4">
                  {authService.getCurrentUser() && (
                    <div className="mt-4">
                      <p className="text-lg"><strong>Welcome,</strong> {authService.getCurrentUser().first_name} {authService.getCurrentUser().last_name}</p>
                      {authService.getCurrentUser().shipping_mark && (
                        <p className="text-md mt-2"><strong>Shipping Mark:</strong> {authService.getCurrentUser().shipping_mark}</p>
                      )}
                      <p className="text-md mt-1"><strong>User Type:</strong> {authService.getCurrentUser().user_type}</p>
                      <p className="text-md"><strong>Role:</strong> {authService.getCurrentUser().user_role}</p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    authService.logout();
                    window.location.href = '/login';
                  }}
                  className="bg-blue-600 text-white px-4 py-2 mt-4 rounded"
                >
                  Logout
                </button>
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* 404 route */}
        <Route path="*" element={<div className="p-8 text-center">Page not found</div>} />
      </Routes>
    </Router>
  )
}

export default App
