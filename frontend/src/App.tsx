import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/authStore";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Signup from "./pages/Signup";
import SimplifiedSignup from "./pages/SimplifiedSignup";
import ShippingMarkSelection from "./pages/ShippingMarkSelection";
import SignupStep2 from "./pages/SignupStep2";
import SignupStep3 from "./pages/SignupStep3";
import SignupStep4 from "./pages/SignupStep4";
import SignupVerify from "./pages/SignupVerify";
import VerifyAccount from "./pages/VerifyAccount";
import ForgotPassword from "./pages/ForgotPassword";
import ContactAdminForReset from "./pages/ContactAdminForReset";
import CustomerDashboard from "./pages/CustomerDashboard";
import Clients from "./pages/Clients";
import SeaCargo from "./pages/SeaCargo";
import AirCargo from "./pages/AirCargo";
import ChinaWarehouse from "./pages/ChinaWarehouse";
import GhanaWarehouse from "./pages/GhanaWarehouse";
import GoodsReceivedChinaSea from "./pages/GoodsReceivedChinaSea";
import GoodsReceivedChinaAir from "./pages/GoodsReceivedChinaAir";
import GoodsReceivedGhanaSea from "./pages/GoodsReceivedGhanaSea";
import GoodsReceivedGhanaAir from "./pages/GoodsReceivedGhanaAir";
import Claims from "./pages/Claims";
import CustomerShipments from "./pages/CustomerShipments";
import CustomerClaims from "./pages/CustomerClaims";
import CustomerNotes from "./pages/CustomerNotes";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerAddresses from "./pages/CustomerAddresses";
import CustomerRates from "./pages/CustomerRates";
import Notes from "./pages/Notes";
import Admins from "./pages/Admins";
import Settings from "./pages/Settings";
import ShippingRates from "./pages/ShippingRates";
import ProfileSettings from "./pages/ProfileSettings";
import Notifications from "./pages/Notifications";
import Support from "./pages/Support";
import ContainerDetailsPage from "./pages/ContainerDetailsPage";
import GoodsReceivedContainerDetailsPage from "./pages/GoodsReceivedContainerDetailsPage";
import DailyUpdatesAdmin from "./pages/DailyUpdatesAdmin";
import AirContainersPage from "./pages/AirContainersPage";
import SeaContainersPage from "./pages/SeaContainersPage";
import AirGoodsReceivedPage from "./pages/AirGoodsReceivedPage";
import SeaGoodsReceivedPage from "./pages/SeaGoodsReceivedPage";
import CustomerWarehouseSea from "./pages/CustomerWarehouse";
import CustomerWarehouseAir from "./pages/CustomerWarehouseAir";
import CustomerContainerDetailsPage from "./pages/CustomerContainerDetailsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Auth initialization component
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AuthInitializer>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            {/* Admin login (served on admin.primemade.org) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            {/* New simplified signup */}
            <Route path="/signup" element={<SimplifiedSignup />} />
            <Route path="/signup/select-shipping-mark" element={<ShippingMarkSelection />} />
            {/* Legacy multi-step signup routes (keep for backward compatibility) */}
            <Route path="/signup/legacy" element={<Signup />} />
            <Route path="/signup/shipping-mark" element={<SignupStep2 />} />
            <Route path="/signup/contact" element={<SignupStep3 />} />
            <Route path="/signup/password" element={<SignupStep4 />} />
            <Route path="/signup/verify" element={<SignupVerify />} />
            {/* New account verification via shipping mark */}
            <Route path="/verify-account" element={<VerifyAccount />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/contact-admin-for-reset" element={<ContactAdminForReset />} />
            {/* Dashboard - Role-based */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    }
                    customerComponent={
                      <AppLayout>
                        <CustomerDashboard />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />

            {/* Dashboard alias - redirect /dashboard to / */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Admin-only routes */}
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <Clients />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cargos/sea"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <SeaCargo />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cargos/air"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <AirCargo />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods/china"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <ChinaWarehouse />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods/china/sea"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <GoodsReceivedChinaSea />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods/china/air"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <GoodsReceivedChinaAir />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods/ghana"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <GhanaWarehouse />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods/ghana/sea"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <GoodsReceivedGhanaSea />
                      </AppLayout>
                    }
                    customerComponent={
                      <AppLayout>
                        <GoodsReceivedGhanaSea />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods/ghana/air"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <GoodsReceivedGhanaAir />
                      </AppLayout>
                    }
                    customerComponent={
                      <AppLayout>
                        <GoodsReceivedGhanaAir />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cargos/claims"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <Claims />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rates"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <ShippingRates />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-admins"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <Admins />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <Notes />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />

            {/* Daily Updates - Role-based routing */}
            <Route
              path="/daily-updates"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/admin/daily-updates" replace />}
                    customerComponent={<Navigate to="/daily-updates/air-goods" replace />}
                  />
                </ProtectedRoute>
              }
            />
            
            {/* Customer Shipments - Air Containers */}
            <Route
              path="/shipments/air-containers"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <AirContainersPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            
            {/* Customer Shipments - Sea Containers */}
            <Route
              path="/shipments/sea-containers"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <SeaContainersPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            
            {/* Customer Daily Updates - Air Goods Received */}
            <Route
              path="/daily-updates/air-goods"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/admin/daily-updates" replace />}
                    customerComponent={
                      <AppLayout>
                        <AirGoodsReceivedPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            
            {/* Customer Daily Updates - Sea Goods Received */}
            <Route
              path="/daily-updates/sea-goods"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/admin/daily-updates" replace />}
                    customerComponent={
                      <AppLayout>
                        <SeaGoodsReceivedPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            
            {/* Admin Daily Updates */}
            <Route
              path="/admin/daily-updates"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <DailyUpdatesAdmin />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/daily-updates/air" replace />}
                  />
                </ProtectedRoute>
              }
            />

            {/* Customer-only routes */}
            <Route
              path="/customer/warehouse/sea"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerWarehouseSea />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/warehouse/air"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerWarehouseAir />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/warehouse/sea/container/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerContainerDetailsPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/warehouse/air/container/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerContainerDetailsPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            
            {/* Customer Cargo Routes - Shared with admin pages */}
            <Route
              path="/customer/cargo/sea"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <SeaCargo />  
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/cargo/air"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <AirCargo />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/cargo/sea/container/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <ContainerDetailsPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/cargo/air/container/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <ContainerDetailsPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/my-shipments"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerShipments />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-claims"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerClaims />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-notes"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerNotes />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-profile"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerProfile />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-addresses"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerAddresses />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-rates"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={
                      <AppLayout>
                        <CustomerRates />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />

            {/* Shared routes */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProfileSettings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Notifications />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/support"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Support />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/containers/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <ContainerDetailsPage />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ghana-container/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <ContainerDetailsPage />
                      </AppLayout>
                    }
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goods-received/:containerId"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={
                      <AppLayout>
                        <GoodsReceivedContainerDetailsPage />
                      </AppLayout>
                    }
                    customerComponent={
                      <AppLayout>
                        <GoodsReceivedContainerDetailsPage />
                      </AppLayout>
                    }
                  />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </AuthInitializer>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
