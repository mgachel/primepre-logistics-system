import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cargoService from '../services/cargoService';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const CargoDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await cargoService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Cargo Dashboard">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cargo dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Cargo Dashboard">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">Error loading dashboard</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      title: 'Total Containers',
      value: dashboardData?.total_containers || 0,
      icon: '📦',
      color: 'bg-blue-500',
      onClick: () => navigate('/cargo/containers')
    },
    {
      title: 'In Transit',
      value: dashboardData?.containers_in_transit || 0,
      icon: '🚢',
      color: 'bg-yellow-500',
      onClick: () => navigate('/cargo/containers?status=in_transit')
    },
    {
      title: 'Demurrage',
      value: dashboardData?.demurrage_containers || 0,
      icon: '⚠️',
      color: 'bg-red-500',
      onClick: () => navigate('/cargo/containers?status=demurrage')
    },
    {
      title: 'Delivered',
      value: dashboardData?.delivered_containers || 0,
      icon: '✅',
      color: 'bg-green-500',
      onClick: () => navigate('/cargo/containers?status=delivered')
    },
    {
      title: 'Pending',
      value: dashboardData?.pending_containers || 0,
      icon: '⏳',
      color: 'bg-orange-500',
      onClick: () => navigate('/cargo/containers?status=pending')
    },
    {
      title: 'Total Cargo Items',
      value: dashboardData?.total_cargo_items || 0,
      icon: '📋',
      color: 'bg-purple-500',
      onClick: () => navigate('/cargo/items')
    }
  ];

  return (
    <DashboardLayout title="Cargo Dashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cargo Management Dashboard</h1>
          <p className="mt-2 text-gray-600">Overview of all cargo containers and items</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              onClick={stat.onClick}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full text-white text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/cargo/containers')}
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="font-semibold">Manage Containers</div>
          </button>
          <button
            onClick={() => navigate('/cargo/sea')}
            className="bg-teal-600 text-white p-4 rounded-lg hover:bg-teal-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">🚢</div>
            <div className="font-semibold">Sea Cargo</div>
          </button>
          <button
            onClick={() => navigate('/cargo/air')}
            className="bg-sky-600 text-white p-4 rounded-lg hover:bg-sky-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">✈️</div>
            <div className="font-semibold">Air Cargo</div>
          </button>
          <button
            onClick={() => navigate('/cargo/client-summaries')}
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="font-semibold">Client Summaries</div>
          </button>
        </div>

        {/* Recent Containers */}
        {dashboardData?.recent_containers && dashboardData.recent_containers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Containers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.recent_containers.map((container) => (
                    <tr
                      key={container.container_id}
                      onClick={() => navigate(`/cargo/containers/${container.container_id}`)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {container.container_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          container.cargo_type === 'sea' 
                            ? 'bg-teal-100 text-teal-800' 
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {container.cargo_type === 'sea' ? '🚢 Sea' : '✈️ Air'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          container.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          container.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          container.status === 'demurrage' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {container.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.route}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(container.eta).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.total_cargo_items}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CargoDashboard;
