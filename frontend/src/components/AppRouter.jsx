import { useState } from 'react';
import Layout from './Layout';
import DashboardPage from '../pages/DashboardPage';
import CustomersPage from '../pages/CustomersPage';
import SeaCargoPage from '../pages/SeaCargoPage';
import AirCargoPage from '../pages/AirCargoPage';
import ChinaWarehousePage from '../pages/ChinaWarehousePage';
import GhanaWarehousePage from '../pages/GhanaWarehousePage';
import RatesPage from '../pages/RatesPage';

function AppRouter() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'customers':
        return <CustomersPage />;
      case 'cargo-sea':
        return <SeaCargoPage />;
      case 'cargo-air':
        return <AirCargoPage />;
      case 'goods-received-china':
        return <ChinaWarehousePage />;
      case 'goods-received-ghana':
        return <GhanaWarehousePage />;
      case 'rates':
        return <RatesPage />;
      default:
        return (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600">
              The requested page could not be found.
            </p>
          </div>
        );
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default AppRouter;
