import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import DashboardPage from "../pages/DashboardPage";
import CustomersPage from "../pages/CustomersPage";
import SeaCargoPage from "../pages/SeaCargoPage";
import AirCargoPage from "../pages/AirCargoPage";
import ChinaWarehousePage from "../pages/ChinaWarehousePage";
import GhanaWarehousePage from "../pages/GhanaWarehousePage";
import RatesPage from "../pages/RatesPage";

function AppRouter() {
  return (
    <Layout>
      <Routes>
        {/* Default route - redirect to dashboard */}
        <Route
          path="/"
          element={<Navigate to="/dashboard/overview" replace />}
        />

        {/* Dashboard routes */}
        <Route path="/overview" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/cargo-sea" element={<SeaCargoPage />} />
        <Route path="/cargo-air" element={<AirCargoPage />} />
        <Route path="/goods-received-china" element={<ChinaWarehousePage />} />
        <Route path="/goods-received-ghana" element={<GhanaWarehousePage />} />
        <Route path="/rates" element={<RatesPage />} />

        {/* Fallback route */}
        <Route
          path="*"
          element={
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Page Not Found
              </h2>
              <p className="text-gray-600">
                The requested page could not be found.
              </p>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}

export default AppRouter;
