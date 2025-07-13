import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cargoService from '../services/cargoService';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const AirCargoDashboard = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAirContainers();
  }, []);

  const fetchAirContainers = async () => {
    try {
      setLoading(true);
      const data = await cargoService.getAirContainers();
      setContainers(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStats = () => {
    const stats = {
      total: containers.length,
      pending: containers.filter(c => c.status === 'pending').length,
      in_transit: containers.filter(c => c.status === 'in_transit').length,
      delivered: containers.filter(c => c.status === 'delivered').length,
      demurrage: containers.filter(c => c.is_demurrage).length,
    };
    return stats;
  };

  const filteredContainers = containers.filter(container => {
    const matchesSearch = container.container_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         container.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || container.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = getStatusStats();

  if (loading) {
    return (
      <DashboardLayout title="Air Cargo Dashboard">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading air cargo...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Air Cargo Dashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-4xl mr-3">✈️</span>
                Air Cargo Dashboard
              </h1>
              <p className="mt-2 text-gray-600">Manage air freight containers and shipments</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/cargo/containers')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                All Containers
              </button>
              <button
                onClick={() => navigate('/cargo/dashboard')}
                className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
              >
                Main Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Air Containers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-sky-500 p-3 rounded-full text-white text-2xl">
                ✈️
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterStatus('pending')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full text-white text-2xl">
                ⏳
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterStatus('in_transit')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.in_transit}</p>
              </div>
              <div className="bg-yellow-500 p-3 rounded-full text-white text-2xl">
                🛫
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterStatus('delivered')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-full text-white text-2xl">
                ✅
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Demurrage</p>
                <p className="text-3xl font-bold text-red-600">{stats.demurrage}</p>
              </div>
              <div className="bg-red-500 p-3 rounded-full text-white text-2xl">
                ⚠️
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Containers</label>
              <input
                type="text"
                placeholder="Search by container ID or route..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="demurrage">Demurrage</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Container List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchAirContainers}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Air Cargo Containers ({filteredContainers.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Load Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ETA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight/CBM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Storage Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContainers.map((container) => (
                    <tr key={container.container_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => navigate(`/cargo/containers/${container.container_id}`)}
                          className="text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          {container.container_id}
                        </button>
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
                        <div className="flex items-center">
                          <span className="mr-2">✈️</span>
                          {container.route}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(container.load_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(container.eta).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-xs">
                          <div>{container.weight ? `${container.weight} kg` : 'N/A'}</div>
                          <div className="text-gray-400">{container.cbm ? `${container.cbm} CBM` : 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="bg-sky-100 text-sky-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {container.total_cargo_items || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {container.is_demurrage ? (
                          <div className="flex items-center text-red-600">
                            <span className="mr-1">⚠️</span>
                            <span className="font-semibold">{container.stay_days} days</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-green-600">
                            <span className="mr-1">📦</span>
                            <span>{container.stay_days} days</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/cargo/containers/${container.container_id}`)}
                            className="text-sky-600 hover:text-sky-800"
                          >
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/cargo/containers/${container.container_id}/items`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Items
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredContainers.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✈️</div>
                  <p className="text-gray-500 text-lg">No air cargo containers found</p>
                  {(searchTerm || filterStatus) && (
                    <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Air Cargo Insights */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/cargo/containers?cargo_type=air&status=in_transit')}
                className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🛫</span>
                  <div>
                    <div className="font-semibold text-yellow-800">Track In-Flight Containers</div>
                    <div className="text-sm text-yellow-600">Monitor containers currently in transit</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/cargo/containers?show_create=true&cargo_type=air')}
                className="w-full bg-sky-50 border border-sky-200 rounded-lg p-4 text-left hover:bg-sky-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">➕</span>
                  <div>
                    <div className="font-semibold text-sky-800">Add Air Container</div>
                    <div className="text-sm text-sky-600">Register new air freight container</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Air Cargo Features */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Air Cargo Features</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <span className="text-blue-600">⚡</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Fast Transit</div>
                  <div className="text-sm text-gray-600">Typically 1-3 days delivery time</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-green-600">📦</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Priority Handling</div>
                  <div className="text-sm text-gray-600">High-value and urgent cargo</div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <span className="text-purple-600">🌡️</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Climate Control</div>
                  <div className="text-sm text-gray-600">Temperature-sensitive shipments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AirCargoDashboard;
