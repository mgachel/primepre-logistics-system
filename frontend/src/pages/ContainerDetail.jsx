import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cargoService from '../services/cargoService';

const ContainerDetail = () => {
  const { containerId } = useParams();
  const navigate = useNavigate();
  const [container, setContainer] = useState(null);
  const [cargoItems, setCargoItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (containerId) {
      // Define and call fetch function within useEffect
      const loadContainerData = async () => {
        try {
          setLoading(true);
          const [containerData, itemsData] = await Promise.all([
            cargoService.getContainer(containerId),
            cargoService.getCargoItems({ container: containerId })
          ]);
          
          setContainer(containerData);
          setCargoItems(itemsData.results || itemsData);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      loadContainerData();
    } else {
      setError('No container ID provided');
      setLoading(false);
    }
  }, [containerId, navigate]);

  const fetchContainerData = async () => {
    try {
      setLoading(true);
      const [containerData, itemsData] = await Promise.all([
        cargoService.getContainer(containerId),
        cargoService.getCargoItems({ container: containerId })
      ]);
      
      setContainer(containerData);
      setCargoItems(itemsData.results || itemsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      delivered: 'bg-green-100 text-green-800',
      in_transit: 'bg-yellow-100 text-yellow-800',
      demurrage: 'bg-red-100 text-red-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    return (
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
        type === 'sea' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'
      }`}>
        {type === 'sea' ? '🚢 Sea Cargo' : '✈️ Air Cargo'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading container details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Error loading container</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchContainerData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-4"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/cargo/containers')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Back to Containers
          </button>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg mb-4">Container not found</div>
          <button
            onClick={() => navigate('/cargo/containers')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Containers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/cargo/containers')}
                className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
              >
                ← Back to Containers
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Container {container.container_id}</h1>
              <p className="mt-2 text-gray-600">Detailed container information and cargo items</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate(`/cargo/items?container=${container.container_id}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Items
              </button>
              <button
                onClick={() => navigate(`/cargo/containers/${container.container_id}/edit`)}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Edit Container
              </button>
            </div>
          </div>
        </div>

        {/* Container Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Basic Info */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Container Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Container ID</label>
                <div className="text-lg font-semibold text-gray-900">{container.container_id}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cargo Type</label>
                {getTypeBadge(container.cargo_type)}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                {getStatusBadge(container.status)}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                <div className="text-gray-900">{container.route}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Load Date</label>
                <div className="text-gray-900">{new Date(container.load_date).toLocaleDateString()}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ETA</label>
                <div className="text-gray-900">{new Date(container.eta).toLocaleDateString()}</div>
              </div>
              
              {container.unloading_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unloading Date</label>
                  <div className="text-gray-900">{new Date(container.unloading_date).toLocaleDateString()}</div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
                <div className="text-gray-900">{container.weight ? `${container.weight} kg` : 'N/A'}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CBM</label>
                <div className="text-gray-900">{container.cbm ? `${container.cbm} m³` : 'N/A'}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rates</label>
                <div className="text-gray-900">{container.rates ? `$${parseFloat(container.rates).toLocaleString()}` : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Status & Timing */}
          <div className="space-y-6">
            {/* Status Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-semibold text-gray-900">{container.total_cargo_items || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Clients</span>
                  <span className="font-semibold text-gray-900">{container.total_clients || 0}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stay Days</span>
                  <span className="font-semibold text-gray-900">{container.stay_days}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Delay Days</span>
                  <span className="font-semibold text-gray-900">{container.delay_days}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Demurrage</span>
                  <span className={`font-semibold ${container.is_demurrage ? 'text-red-600' : 'text-green-600'}`}>
                    {container.is_demurrage ? '⚠️ Yes' : '✅ No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Timing Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Created</div>
                    <div className="text-xs text-gray-500">{new Date(container.created_at).toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Load Date</div>
                    <div className="text-xs text-gray-500">{new Date(container.load_date).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${new Date(container.eta) > new Date() ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">ETA</div>
                    <div className="text-xs text-gray-500">{new Date(container.eta).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Last Updated</div>
                    <div className="text-xs text-gray-500">{new Date(container.updated_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cargo Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Cargo Items ({cargoItems.length})
              </h2>
              <button
                onClick={() => navigate(`/cargo/items?container=${container.container_id}`)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Items →
              </button>
            </div>
          </div>
          
          {cargoItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CBM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cargoItems.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="font-mono">{item.tracking_id}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">{item.item_description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="font-medium">{item.client_shipping_mark}</div>
                          <div className="text-gray-400 text-xs">{item.client_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          item.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'delayed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.cbm ? `${item.cbm} m³` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_value ? `$${parseFloat(item.total_value).toLocaleString()}` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {cargoItems.length > 10 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
                  <button
                    onClick={() => navigate(`/cargo/items?container=${container.container_id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all {cargoItems.length} items →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No cargo items found in this container</p>
              <button
                onClick={() => navigate(`/cargo/items/create?container=${container.container_id}`)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Cargo Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerDetail;
