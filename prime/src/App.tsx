import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import Dashboard from "./pages/Dashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import Clients from "./pages/Clients";
import SeaCargo from "./pages/SeaCargo";
import AirCargo from "./pages/AirCargo";
import ChinaWarehouse from "./pages/ChinaWarehouse";
import GhanaWarehouse from "./pages/GhanaWarehouse";
import Claims from "./pages/Claims";
import CustomerShipments from "./pages/CustomerShipments";
import CustomerClaims from "./pages/CustomerClaims";
import Admins from "./pages/Admins";
import Settings from "./pages/Settings";
import ShippingRates from "./pages/ShippingRates";
import ProfileSettings from "./pages/ProfileSettings";
import Notifications from "./pages/Notifications";
import Support from "./pages/Support";
import ContainerDetails from "./pages/ContainerDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Dashboard - Role-based */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<AppLayout><Dashboard /></AppLayout>}
                    customerComponent={<AppLayout><CustomerDashboard /></AppLayout>}
                  />
                </ProtectedRoute>
              }
            />

            {/* Admin-only routes */}
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<AppLayout><Clients /></AppLayout>}
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
                    adminComponent={<AppLayout><SeaCargo /></AppLayout>}
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
                    adminComponent={<AppLayout><AirCargo /></AppLayout>}
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
                    adminComponent={<AppLayout><ChinaWarehouse /></AppLayout>}
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
                    adminComponent={<AppLayout><GhanaWarehouse /></AppLayout>}
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cargos/claims"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<AppLayout><Claims /></AppLayout>}
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
                    adminComponent={<AppLayout><ShippingRates /></AppLayout>}
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
                    adminComponent={<AppLayout><Admins /></AppLayout>}
                    customerComponent={<Navigate to="/" replace />}
                  />
                </ProtectedRoute>
              }
            />

            {/* Customer-only routes */}
            <Route
              path="/my-shipments"
              element={
                <ProtectedRoute>
                  <RoleBasedRoute
                    adminComponent={<Navigate to="/" replace />}
                    customerComponent={<AppLayout><CustomerShipments /></AppLayout>}
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
                    customerComponent={<AppLayout><CustomerClaims /></AppLayout>}
                  />
                </ProtectedRoute>
              }
            />

            {/* Shared routes */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout><Settings /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout><ProfileSettings /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <AppLayout><Notifications /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/support"
              element={
                <ProtectedRoute>
                  <AppLayout><Support /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/:id"
              element={
                <ProtectedRoute>
                  <AppLayout><ContainerDetails /></AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;