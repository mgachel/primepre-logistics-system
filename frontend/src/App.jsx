import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/Signup';
import VerificationPage from './pages/VerificationPage';
import Login from './pages/Login';
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
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes - will redirect to login if not authenticated */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div className="p-8">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p>Welcome to Primepre Logistics!</p>
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
