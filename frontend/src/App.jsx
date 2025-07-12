import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetCode from './pages/VerifyResetCode';
import ResetPassword from './pages/ResetPassword';
import OverviewDashboard from './pages/OverviewDashboard';
import ChinaWarehouse from './pages/ChinaWarehouse';
import GhanaWarehouse from './pages/GhanaWarehouse';
import ReadyForShipping from './pages/ReadyForShipping';
import FlaggedItems from './pages/FlaggedItems';
import OverdueItems from './pages/OverdueItems';
// Cargo Management Pages
import CargoDashboard from './pages/CargoDashboard';
import ContainerManagement from './pages/ContainerManagement';
import ContainerDetail from './pages/ContainerDetail';
import SeaCargoDashboard from './pages/SeaCargoDashboard';
import AirCargoDashboard from './pages/AirCargoDashboard';
import CargoItemsManagement from './pages/CargoItemsManagement';
import ClientSummaries from './pages/ClientSummaries';
import { useAuth } from './hooks/useAuth';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
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
              <OverviewDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/china" 
          element={
            <ProtectedRoute>
              <ChinaWarehouse />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/ghana" 
          element={
            <ProtectedRoute>
              <GhanaWarehouse />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/ready-shipping" 
          element={
            <ProtectedRoute>
              <ReadyForShipping />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/flagged" 
          element={
            <ProtectedRoute>
              <FlaggedItems />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/overdue" 
          element={
            <ProtectedRoute>
              <OverdueItems />
            </ProtectedRoute>
          } 
        />
        
        {/* Cargo Management Routes */}
        <Route 
          path="/cargo/dashboard" 
          element={
            <ProtectedRoute>
              <CargoDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/containers" 
          element={
            <ProtectedRoute>
              <ContainerManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/containers/:containerId" 
          element={
            <ProtectedRoute>
              <ContainerDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/containers/:containerId/edit" 
          element={
            <ProtectedRoute>
              <ContainerManagement showEditModal={true} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/sea" 
          element={
            <ProtectedRoute>
              <SeaCargoDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/air" 
          element={
            <ProtectedRoute>
              <AirCargoDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/items" 
          element={
            <ProtectedRoute>
              <CargoItemsManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/items/create" 
          element={
            <ProtectedRoute>
              <CargoItemsManagement showCreateModal={true} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cargo/client-summaries" 
          element={
            <ProtectedRoute>
              <ClientSummaries />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
