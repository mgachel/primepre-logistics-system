import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cargoService from '../services/cargoService';

const ClientSummaries = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterContainer, setFilterContainer] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const data = await cargoService.getClientSummaries();
      setSummaries(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStats = () => {
    const stats = {
      total: summaries.length,
      pending: summaries.filter(s => s.status === 'pending').length,
      in_transit: summaries.filter(s => s.status === 'in_transit').length,
      delivered: summaries.filter(s => s.status === 'delivered').length,
      partially_delivered: summaries.filter(s => s.status === 'partially_delivered').length,
    };
    return stats;
  };

  const filteredSummaries = summaries.filter(summary => {
    const matchesSearch = summary.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         summary.client_shipping_mark?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         summary.assigned_tracking?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || summary.status === filterStatus;
    const matchesContainer = !filterContainer || summary.container === filterContainer;
    
    return matchesSearch && matchesStatus && matchesContainer;
  });

  const stats = getStatusStats();
  const uniqueContainers = [...new Set(summaries.map(s => s.container))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client summaries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-4xl mr-3">👥</span>
                Client Shipment Summaries
              </h1>
              <p className="mt-2 text-gray-600">Track client shipments by container</p>
            </div>
            <button
              onClick={() => navigate('/cargo/dashboard')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Summaries</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full text-white text-2xl">
                📋
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
                🚛
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterStatus('partially_delivered')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Partial</p>
                <p className="text-3xl font-bold text-blue-600">{stats.partially_delivered}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full text-white text-2xl">
                📦
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
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by client or tracking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_transit">In Transit</option>
                <option value="partially_delivered">Partially Delivered</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Container</label>
              <select
                value={filterContainer}
                onChange={(e) => setFilterContainer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Containers</option>
                {uniqueContainers.map(container => (
                  <option key={container} value={container}>
                    {container}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterContainer('');
                }}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Summaries List */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchSummaries}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Client Summaries ({filteredSummaries.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total CBM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Packages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSummaries.map((summary) => (
                    <tr key={summary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="font-mono text-purple-600">{summary.assigned_tracking}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="font-medium text-gray-900">{summary.client_shipping_mark}</div>
                          <div className="text-gray-500 text-xs">{summary.client_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => navigate(`/cargo/containers/${summary.container}`)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {summary.container}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          summary.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          summary.status === 'partially_delivered' ? 'bg-blue-100 text-blue-800' :
                          summary.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {summary.status === 'partially_delivered' ? 'PARTIAL' : summary.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-mono">{summary.total_cbm?.toFixed(2) || '0.00'} CBM</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {summary.total_quantity || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                          {summary.total_packages || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(summary.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/cargo/items?container=${summary.container}&client=${summary.client}`)}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            View Items
                          </button>
                          <button
                            onClick={() => navigate(`/cargo/containers/${summary.container}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Container
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredSummaries.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-gray-500 text-lg">No client summaries found</p>
                  {(searchTerm || filterStatus || filterContainer) && (
                    <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Container Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Container Distribution</h3>
            <div className="space-y-3">
              {uniqueContainers.slice(0, 5).map(container => {
                const count = summaries.filter(s => s.container === container).length;
                const percentage = summaries.length > 0 ? (count / summaries.length * 100).toFixed(1) : 0;
                
                return (
                  <div key={container} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => navigate(`/cargo/containers/${container}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {container}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/cargo/items')}
                className="w-full bg-purple-50 border border-purple-200 rounded-lg p-4 text-left hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📦</span>
                  <div>
                    <div className="font-semibold text-purple-800">View All Cargo Items</div>
                    <div className="text-sm text-purple-600">Detailed item-level tracking</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/cargo/containers')}
                className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🚛</span>
                  <div>
                    <div className="font-semibold text-blue-800">Container Management</div>
                    <div className="text-sm text-blue-600">Manage all containers</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/cargo/client-summaries?status=delivered')}
                className="w-full bg-green-50 border border-green-200 rounded-lg p-4 text-left hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">✅</span>
                  <div>
                    <div className="font-semibold text-green-800">Delivered Shipments</div>
                    <div className="text-sm text-green-600">View completed deliveries</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSummaries;
